package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png" // PNG decoder
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
)

const (
	// Storage paths
	OriginalPrefix = "images/original"
	ThumbPrefix    = "images/thumb"
	StatementsPath = "statements"
	DexaScansPath  = "dexaScans"

	// Limits
	MaxPhotoSize     = 10 * 1024 * 1024   // 10MB
	MaxCSVSize       = 5 * 1024 * 1024    // 5MB
	MaxDexaScanSize  = 20 * 1024 * 1024   // 20MB
	ThumbnailSize    = 360                // 360x360 max
	SignedURLTTLDays = 365 * 5            // 5 years

	// Content types
	ContentTypeJPEG = "image/jpeg"
	ContentTypePNG  = "image/png"
	ContentTypeCSV  = "text/csv"
	ContentTypePDF  = "application/pdf"
)

// StorageHandler handles file upload and download operations
type StorageHandler struct {
	storageClient *storage.Client
	repo          *repository.FirestoreRepository
	bucketName    string
	logger        *zap.Logger
}

// NewStorageHandler creates a new storage handler
func NewStorageHandler(
	storageClient *storage.Client,
	repo *repository.FirestoreRepository,
	bucketName string,
	logger *zap.Logger,
) *StorageHandler {
	return &StorageHandler{
		storageClient: storageClient,
		repo:          repo,
		bucketName:    bucketName,
		logger:        logger,
	}
}

// UploadPhotoResponse represents the response from photo upload
type UploadPhotoResponse struct {
	ID            string `json:"id"`
	OriginalPath  string `json:"originalPath"`
	ThumbnailPath string `json:"thumbnailPath"`
	OriginalURL   string `json:"originalUrl"`
	ThumbnailURL  string `json:"thumbnailUrl"`
	ContentType   string `json:"contentType"`
	Size          int64  `json:"size"`
}

// UploadPhoto handles POST /api/storage/photos
// Accepts multipart form with "file" field
func (h *StorageHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Parse multipart form
	if err := r.ParseMultipartForm(MaxPhotoSize); err != nil {
		h.logger.Warn("Failed to parse multipart form", zap.Error(err))
		utils.RespondError(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		h.logger.Warn("No file in request", zap.Error(err))
		utils.RespondError(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	if contentType != ContentTypeJPEG && contentType != ContentTypePNG && !strings.HasPrefix(contentType, "image/") {
		utils.RespondError(w, "Only JPEG and PNG images are allowed", http.StatusBadRequest)
		return
	}

	// Check file size
	if header.Size > MaxPhotoSize {
		utils.RespondError(w, "File too large (max 10MB)", http.StatusBadRequest)
		return
	}

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		h.logger.Error("Failed to read file", zap.Error(err))
		utils.RespondError(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	// Generate unique ID
	photoID := uuid.New().String()

	// Get file extension
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		if contentType == ContentTypePNG {
			ext = ".png"
		} else {
			ext = ".jpg"
		}
	}

	h.logger.Info("Uploading photo",
		zap.String("uid", uid),
		zap.String("photoId", photoID),
		zap.String("filename", header.Filename),
		zap.Int64("size", header.Size),
	)

	// Upload original to Cloud Storage
	originalPath := fmt.Sprintf("%s/%s/%s%s", OriginalPrefix, uid, photoID, ext)
	bucket := h.storageClient.Bucket(h.bucketName)

	originalObj := bucket.Object(originalPath)
	originalWriter := originalObj.NewWriter(ctx)
	originalWriter.ContentType = contentType
	originalWriter.CacheControl = "public,max-age=31536000,s-maxage=31536000"

	if _, err := originalWriter.Write(fileBytes); err != nil {
		h.logger.Error("Failed to write to storage", zap.Error(err))
		utils.RespondError(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}
	if err := originalWriter.Close(); err != nil {
		h.logger.Error("Failed to close writer", zap.Error(err))
		utils.RespondError(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	// Generate thumbnail
	thumbPath := fmt.Sprintf("%s/%s/%s.jpg", ThumbPrefix, uid, photoID)
	thumbBytes, err := h.generateThumbnail(fileBytes)
	if err != nil {
		h.logger.Warn("Failed to generate thumbnail", zap.Error(err))
		// Continue without thumbnail
	} else {
		// Upload thumbnail
		thumbObj := bucket.Object(thumbPath)
		thumbWriter := thumbObj.NewWriter(ctx)
		thumbWriter.ContentType = ContentTypeJPEG
		thumbWriter.CacheControl = "public,max-age=31536000,s-maxage=31536000"

		if _, err := thumbWriter.Write(thumbBytes); err != nil {
			h.logger.Warn("Failed to upload thumbnail", zap.Error(err))
		} else if err := thumbWriter.Close(); err != nil {
			h.logger.Warn("Failed to close thumbnail writer", zap.Error(err))
		}
	}

	// Generate signed URLs
	originalURL, _ := h.generateSignedURL(ctx, originalPath)
	thumbnailURL := ""
	if thumbBytes != nil {
		thumbnailURL, _ = h.generateSignedURL(ctx, thumbPath)
	}

	// Save metadata to Firestore
	docPath := fmt.Sprintf("users/%s/photoLibrary/%s", uid, photoID)
	photoData := map[string]interface{}{
		"id":            photoID,
		"originalPath":  originalPath,
		"thumbnailPath": thumbPath,
		"originalUrl":   originalURL,
		"thumbnailUrl":  thumbnailURL,
		"contentType":   contentType,
		"size":          header.Size,
		"fileName":      header.Filename,
		"createdAt":     time.Now().UTC().Format(time.RFC3339),
		"updatedAt":     time.Now().UTC().Format(time.RFC3339),
	}

	if err := h.repo.Create(ctx, docPath, photoData); err != nil {
		h.logger.Error("Failed to save photo metadata", zap.Error(err))
		// Photo is uploaded but metadata failed - still return success
	}

	response := UploadPhotoResponse{
		ID:            photoID,
		OriginalPath:  originalPath,
		ThumbnailPath: thumbPath,
		OriginalURL:   originalURL,
		ThumbnailURL:  thumbnailURL,
		ContentType:   contentType,
		Size:          header.Size,
	}

	utils.RespondSuccess(w, response, "Photo uploaded successfully")
}

// generateThumbnail creates a thumbnail from the original image
func (h *StorageHandler) generateThumbnail(original []byte) ([]byte, error) {
	// Decode image
	img, _, err := image.Decode(bytes.NewReader(original))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	// Calculate new dimensions (fit within ThumbnailSize)
	var newWidth, newHeight int
	if origWidth > origHeight {
		if origWidth > ThumbnailSize {
			newWidth = ThumbnailSize
			newHeight = origHeight * ThumbnailSize / origWidth
		} else {
			newWidth = origWidth
			newHeight = origHeight
		}
	} else {
		if origHeight > ThumbnailSize {
			newHeight = ThumbnailSize
			newWidth = origWidth * ThumbnailSize / origHeight
		} else {
			newWidth = origWidth
			newHeight = origHeight
		}
	}

	// Create thumbnail using simple nearest-neighbor scaling
	// For production, consider using a library like "github.com/disintegration/imaging"
	thumbnail := resizeImage(img, newWidth, newHeight)

	// Encode as JPEG
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, thumbnail, &jpeg.Options{Quality: 70}); err != nil {
		return nil, fmt.Errorf("failed to encode thumbnail: %w", err)
	}

	return buf.Bytes(), nil
}

// resizeImage performs simple nearest-neighbor image resizing
func resizeImage(img image.Image, width, height int) image.Image {
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	newImg := image.NewRGBA(image.Rect(0, 0, width, height))

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			srcX := x * origWidth / width
			srcY := y * origHeight / height
			newImg.Set(x, y, img.At(bounds.Min.X+srcX, bounds.Min.Y+srcY))
		}
	}

	return newImg
}

// generateSignedURL creates a signed URL for a storage object
func (h *StorageHandler) generateSignedURL(ctx context.Context, objectPath string) (string, error) {
	bucket := h.storageClient.Bucket(h.bucketName)
	expires := time.Now().Add(time.Duration(SignedURLTTLDays) * 24 * time.Hour)

	url, err := bucket.SignedURL(objectPath, &storage.SignedURLOptions{
		Method:  "GET",
		Expires: expires,
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate signed URL: %w", err)
	}

	return url, nil
}

// UploadCSVResponse represents the response from CSV upload
type UploadCSVResponse struct {
	ID           string `json:"id"`
	FileName     string `json:"fileName"`
	StoragePath  string `json:"storagePath"`
	Status       string `json:"status"`
	Size         int64  `json:"size"`
	ProcessingID string `json:"processingId"`
}

// UploadCSV handles POST /api/storage/csv
// Accepts multipart form with "file" field
func (h *StorageHandler) UploadCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Parse multipart form
	if err := r.ParseMultipartForm(MaxCSVSize); err != nil {
		h.logger.Warn("Failed to parse multipart form", zap.Error(err))
		utils.RespondError(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		h.logger.Warn("No file in request", zap.Error(err))
		utils.RespondError(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file extension
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".csv") {
		utils.RespondError(w, "Only CSV files are allowed", http.StatusBadRequest)
		return
	}

	// Check file size
	if header.Size > MaxCSVSize {
		utils.RespondError(w, "File too large (max 5MB)", http.StatusBadRequest)
		return
	}

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		h.logger.Error("Failed to read file", zap.Error(err))
		utils.RespondError(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	h.logger.Info("Uploading CSV",
		zap.String("uid", uid),
		zap.String("filename", header.Filename),
		zap.Int64("size", header.Size),
	)

	// Upload to Cloud Storage
	storagePath := fmt.Sprintf("users/%s/%s/%s", uid, StatementsPath, header.Filename)
	bucket := h.storageClient.Bucket(h.bucketName)

	obj := bucket.Object(storagePath)
	writer := obj.NewWriter(ctx)
	writer.ContentType = ContentTypeCSV

	if _, err := writer.Write(fileBytes); err != nil {
		h.logger.Error("Failed to write to storage", zap.Error(err))
		utils.RespondError(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}
	if err := writer.Close(); err != nil {
		h.logger.Error("Failed to close writer", zap.Error(err))
		utils.RespondError(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	// Create processing status record
	processingID := uuid.New().String()
	statusPath := fmt.Sprintf("users/%s/csvProcessingStatus/%s", uid, header.Filename)
	statusData := map[string]interface{}{
		"id":          processingID,
		"fileName":    header.Filename,
		"storagePath": storagePath,
		"status":      "pending",
		"size":        header.Size,
		"createdAt":   time.Now().UTC().Format(time.RFC3339),
		"updatedAt":   time.Now().UTC().Format(time.RFC3339),
	}

	if err := h.repo.Create(ctx, statusPath, statusData); err != nil {
		h.logger.Warn("Failed to create processing status", zap.Error(err))
	}

	// Create statement record
	statementPath := fmt.Sprintf("users/%s/statements/%s", uid, header.Filename)
	statementData := map[string]interface{}{
		"id":          header.Filename,
		"fileName":    header.Filename,
		"storagePath": storagePath,
		"status":      "pending",
		"source":      "csv-upload",
		"size":        header.Size,
		"uploadedAt":  time.Now().UTC().Format(time.RFC3339),
		"updatedAt":   time.Now().UTC().Format(time.RFC3339),
	}

	if err := h.repo.Create(ctx, statementPath, statementData); err != nil {
		h.logger.Warn("Failed to create statement record", zap.Error(err))
	}

	response := UploadCSVResponse{
		ID:           header.Filename,
		FileName:     header.Filename,
		StoragePath:  storagePath,
		Status:       "pending",
		Size:         header.Size,
		ProcessingID: processingID,
	}

	utils.RespondSuccess(w, response, "CSV uploaded successfully. Processing will begin shortly.")
}

// UploadDexaScanResponse represents the response from DEXA scan upload
type UploadDexaScanResponse struct {
	ID           string `json:"id"`
	FileName     string `json:"fileName"`
	StoragePath  string `json:"storagePath"`
	Status       string `json:"status"`
	ContentType  string `json:"contentType"`
	Size         int64  `json:"size"`
	ProcessingID string `json:"processingId"`
}

// UploadDexaScan handles POST /api/storage/dexa
// Accepts multipart form with "file" field (PDF or image)
func (h *StorageHandler) UploadDexaScan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Parse multipart form
	if err := r.ParseMultipartForm(MaxDexaScanSize); err != nil {
		h.logger.Warn("Failed to parse multipart form", zap.Error(err))
		utils.RespondError(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		h.logger.Warn("No file in request", zap.Error(err))
		utils.RespondError(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	isValid := contentType == ContentTypePDF ||
		contentType == ContentTypeJPEG ||
		contentType == ContentTypePNG ||
		strings.HasPrefix(contentType, "image/")

	if !isValid {
		utils.RespondError(w, "Only PDF and image files are allowed", http.StatusBadRequest)
		return
	}

	// Check file size
	if header.Size > MaxDexaScanSize {
		utils.RespondError(w, "File too large (max 20MB)", http.StatusBadRequest)
		return
	}

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		h.logger.Error("Failed to read file", zap.Error(err))
		utils.RespondError(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	// Generate unique ID
	scanID := uuid.New().String()

	h.logger.Info("Uploading DEXA scan",
		zap.String("uid", uid),
		zap.String("scanId", scanID),
		zap.String("filename", header.Filename),
		zap.String("contentType", contentType),
		zap.Int64("size", header.Size),
	)

	// Upload to Cloud Storage
	storagePath := fmt.Sprintf("users/%s/%s/%s", uid, DexaScansPath, header.Filename)
	bucket := h.storageClient.Bucket(h.bucketName)

	obj := bucket.Object(storagePath)
	writer := obj.NewWriter(ctx)
	writer.ContentType = contentType

	if _, err := writer.Write(fileBytes); err != nil {
		h.logger.Error("Failed to write to storage", zap.Error(err))
		utils.RespondError(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}
	if err := writer.Close(); err != nil {
		h.logger.Error("Failed to close writer", zap.Error(err))
		utils.RespondError(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	// Create processing status record
	processingID := uuid.New().String()
	statusPath := fmt.Sprintf("users/%s/dexaScanProcessingStatus/%s", uid, header.Filename)
	statusData := map[string]interface{}{
		"id":          processingID,
		"fileName":    header.Filename,
		"storagePath": storagePath,
		"status":      "pending",
		"contentType": contentType,
		"size":        header.Size,
		"createdAt":   time.Now().UTC().Format(time.RFC3339),
		"updatedAt":   time.Now().UTC().Format(time.RFC3339),
	}

	if err := h.repo.Create(ctx, statusPath, statusData); err != nil {
		h.logger.Warn("Failed to create processing status", zap.Error(err))
	}

	response := UploadDexaScanResponse{
		ID:           scanID,
		FileName:     header.Filename,
		StoragePath:  storagePath,
		Status:       "pending",
		ContentType:  contentType,
		Size:         header.Size,
		ProcessingID: processingID,
	}

	utils.RespondSuccess(w, response, "DEXA scan uploaded successfully. Processing will begin shortly.")
}

// GetProcessingStatusResponse represents the processing status response
type GetProcessingStatusResponse struct {
	ID               string `json:"id"`
	FileName         string `json:"fileName"`
	StoragePath      string `json:"storagePath"`
	Status           string `json:"status"`
	ProcessedCount   int    `json:"processedCount,omitempty"`
	ProcessedBatches int    `json:"processedBatches,omitempty"`
	TotalBatches     int    `json:"totalBatches,omitempty"`
	Error            string `json:"error,omitempty"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

// GetCSVProcessingStatus handles GET /api/storage/csv/{fileName}/status
func (h *StorageHandler) GetCSVProcessingStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	fileName := vars["fileName"]

	if fileName == "" {
		utils.RespondError(w, "fileName is required", http.StatusBadRequest)
		return
	}

	statusPath := fmt.Sprintf("users/%s/csvProcessingStatus/%s", uid, fileName)
	data, err := h.repo.Get(ctx, statusPath)
	if err != nil {
		h.logger.Warn("Processing status not found", zap.String("fileName", fileName))
		utils.RespondError(w, "Processing status not found", http.StatusNotFound)
		return
	}

	response := mapToProcessingStatus(data)
	utils.RespondSuccess(w, response, "")
}

// GetDexaProcessingStatus handles GET /api/storage/dexa/{fileName}/status
func (h *StorageHandler) GetDexaProcessingStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	fileName := vars["fileName"]

	if fileName == "" {
		utils.RespondError(w, "fileName is required", http.StatusBadRequest)
		return
	}

	statusPath := fmt.Sprintf("users/%s/dexaScanProcessingStatus/%s", uid, fileName)
	data, err := h.repo.Get(ctx, statusPath)
	if err != nil {
		h.logger.Warn("Processing status not found", zap.String("fileName", fileName))
		utils.RespondError(w, "Processing status not found", http.StatusNotFound)
		return
	}

	response := mapToProcessingStatus(data)
	utils.RespondSuccess(w, response, "")
}

// mapToProcessingStatus converts a map to GetProcessingStatusResponse
func mapToProcessingStatus(data map[string]interface{}) GetProcessingStatusResponse {
	response := GetProcessingStatusResponse{}

	if id, ok := data["id"].(string); ok {
		response.ID = id
	}
	if fileName, ok := data["fileName"].(string); ok {
		response.FileName = fileName
	}
	if storagePath, ok := data["storagePath"].(string); ok {
		response.StoragePath = storagePath
	}
	if status, ok := data["status"].(string); ok {
		response.Status = status
	}
	if processedCount, ok := data["processedCount"].(float64); ok {
		response.ProcessedCount = int(processedCount)
	}
	if processedBatches, ok := data["processedBatches"].(float64); ok {
		response.ProcessedBatches = int(processedBatches)
	}
	if totalBatches, ok := data["totalBatches"].(float64); ok {
		response.TotalBatches = int(totalBatches)
	}
	if errorMsg, ok := data["error"].(string); ok {
		response.Error = errorMsg
	}
	if createdAt, ok := data["createdAt"].(string); ok {
		response.CreatedAt = createdAt
	}
	if updatedAt, ok := data["updatedAt"].(string); ok {
		response.UpdatedAt = updatedAt
	}

	return response
}

// DeleteFileRequest represents a delete file request
type DeleteFileRequest struct {
	Path string `json:"path"`
}

// DeleteFile handles DELETE /api/storage/file
// Deletes a file from Cloud Storage
func (h *StorageHandler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	var req DeleteFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		utils.RespondError(w, "path is required", http.StatusBadRequest)
		return
	}

	// Verify the path belongs to this user
	if !h.userOwnsPath(uid, req.Path) {
		utils.RespondError(w, "Permission denied", http.StatusForbidden)
		return
	}

	h.logger.Info("Deleting file",
		zap.String("uid", uid),
		zap.String("path", req.Path),
	)

	bucket := h.storageClient.Bucket(h.bucketName)
	obj := bucket.Object(req.Path)

	if err := obj.Delete(ctx); err != nil {
		if err == storage.ErrObjectNotExist {
			utils.RespondError(w, "File not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to delete file", zap.Error(err))
		utils.RespondError(w, "Failed to delete file", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]bool{"deleted": true}, "File deleted successfully")
}

// userOwnsPath verifies that a storage path belongs to the user
func (h *StorageHandler) userOwnsPath(uid, path string) bool {
	// Check for images path: images/{type}/{uid}/...
	if strings.HasPrefix(path, "images/") {
		parts := strings.Split(path, "/")
		if len(parts) >= 4 {
			return parts[2] == uid
		}
		return false
	}

	// Check for user-scoped paths: users/{uid}/...
	if strings.HasPrefix(path, "users/") {
		parts := strings.Split(path, "/")
		if len(parts) >= 2 {
			return parts[1] == uid
		}
		return false
	}

	return false
}

// GetSignedURLRequest represents a signed URL request
type GetSignedURLRequest struct {
	Path      string `json:"path"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}

// GetSignedURLResponse represents a signed URL response
type GetSignedURLResponse struct {
	URL       string `json:"url"`
	ExpiresAt string `json:"expiresAt"`
}

// GetSignedURL handles POST /api/storage/signed-url
func (h *StorageHandler) GetSignedURL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	var req GetSignedURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		utils.RespondError(w, "path is required", http.StatusBadRequest)
		return
	}

	// Verify the path belongs to this user
	if !h.userOwnsPath(uid, req.Path) {
		utils.RespondError(w, "Permission denied", http.StatusForbidden)
		return
	}

	h.logger.Info("Generating signed URL",
		zap.String("uid", uid),
		zap.String("path", req.Path),
	)

	// Parse expiry if provided
	var expires time.Time
	if req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err != nil {
			utils.RespondError(w, "Invalid expiresAt format (use RFC3339)", http.StatusBadRequest)
			return
		}
		expires = t
	} else {
		expires = time.Now().Add(time.Duration(SignedURLTTLDays) * 24 * time.Hour)
	}

	url, err := h.generateSignedURL(ctx, req.Path)
	if err != nil {
		h.logger.Error("Failed to generate signed URL", zap.Error(err))
		utils.RespondError(w, "Failed to generate signed URL", http.StatusInternalServerError)
		return
	}

	response := GetSignedURLResponse{
		URL:       url,
		ExpiresAt: expires.Format(time.RFC3339),
	}

	utils.RespondSuccess(w, response, "")
}

// BatchSignedURLRequest represents a batch signed URL request
type BatchSignedURLRequest struct {
	Paths []string `json:"paths"`
}

// BatchSignedURLResponse represents a batch signed URL response
type BatchSignedURLResponse struct {
	URLs map[string]string `json:"urls"`
}

// GetBatchSignedURLs handles POST /api/storage/signed-urls
// Returns signed URLs for multiple paths
func (h *StorageHandler) GetBatchSignedURLs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	var req BatchSignedURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Paths) == 0 {
		utils.RespondError(w, "paths is required", http.StatusBadRequest)
		return
	}

	if len(req.Paths) > 100 {
		utils.RespondError(w, "Maximum 100 paths allowed", http.StatusBadRequest)
		return
	}

	h.logger.Info("Generating batch signed URLs",
		zap.String("uid", uid),
		zap.Int("count", len(req.Paths)),
	)

	urls := make(map[string]string)
	for _, path := range req.Paths {
		// Verify the path belongs to this user
		if !h.userOwnsPath(uid, path) {
			continue // Skip unauthorized paths
		}

		url, err := h.generateSignedURL(ctx, path)
		if err != nil {
			h.logger.Warn("Failed to generate signed URL for path",
				zap.String("path", path),
				zap.Error(err),
			)
			continue
		}
		urls[path] = url
	}

	response := BatchSignedURLResponse{
		URLs: urls,
	}

	utils.RespondSuccess(w, response, "")
}
