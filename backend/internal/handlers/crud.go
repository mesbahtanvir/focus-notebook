package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
)

// CollectionConfig defines configuration for a CRUD collection
type CollectionConfig struct {
	// Name is the Firestore collection name (e.g., "tasks", "thoughts")
	Name string
	// UserScoped indicates if the collection is under users/{uid}/
	UserScoped bool
	// AllowedFields defines which fields can be updated (nil means all fields allowed)
	AllowedFields []string
	// RequiredFields defines fields required on create
	RequiredFields []string
	// DefaultOrderBy is the default field to order by
	DefaultOrderBy string
	// DefaultOrderDir is the default order direction (asc/desc)
	DefaultOrderDir firestore.Direction
}

// CRUDHandler provides generic CRUD operations for Firestore collections
type CRUDHandler struct {
	repo    *repository.FirestoreRepository
	configs map[string]CollectionConfig
	logger  *zap.Logger
}

// NewCRUDHandler creates a new CRUD handler with the given collection configurations
func NewCRUDHandler(repo *repository.FirestoreRepository, logger *zap.Logger) *CRUDHandler {
	handler := &CRUDHandler{
		repo:    repo,
		configs: make(map[string]CollectionConfig),
		logger:  logger,
	}

	// Register default collection configurations
	handler.RegisterCollection(CollectionConfig{
		Name:            "tasks",
		UserScoped:      true,
		RequiredFields:  []string{"title"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "thoughts",
		UserScoped:      true,
		RequiredFields:  []string{"text"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "focusSessions",
		UserScoped:      true,
		DefaultOrderBy:  "startTime",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "moods",
		UserScoped:      true,
		RequiredFields:  []string{"value"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "goals",
		UserScoped:      true,
		RequiredFields:  []string{"title"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "projects",
		UserScoped:      true,
		RequiredFields:  []string{"title"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "trips",
		UserScoped:      true,
		RequiredFields:  []string{"destination"},
		DefaultOrderBy:  "startDate",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "places",
		UserScoped:      true,
		RequiredFields:  []string{"name"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "friends",
		UserScoped:      true,
		RequiredFields:  []string{"name"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "relationships",
		UserScoped:      true,
		RequiredFields:  []string{"name"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "admiredPeople",
		UserScoped:      true,
		RequiredFields:  []string{"name"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "portfolios",
		UserScoped:      true,
		RequiredFields:  []string{"name"},
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "photoLibrary",
		UserScoped:      true,
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "packingLists",
		UserScoped:      true,
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "dexaScans",
		UserScoped:      true,
		DefaultOrderBy:  "scanDate",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "llmLogs",
		UserScoped:      true,
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "tokenUsage",
		UserScoped:      true,
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "toolUsage",
		UserScoped:      true,
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "bankAccounts",
		UserScoped:      true,
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "transactions",
		UserScoped:      true,
		DefaultOrderBy:  "date",
		DefaultOrderDir: firestore.Desc,
	})

	handler.RegisterCollection(CollectionConfig{
		Name:            "subscriptions",
		UserScoped:      true,
		DefaultOrderBy:  "createdAt",
		DefaultOrderDir: firestore.Desc,
	})

	return handler
}

// RegisterCollection adds a collection configuration
func (h *CRUDHandler) RegisterCollection(config CollectionConfig) {
	h.configs[config.Name] = config
}

// GetCollectionConfigs returns all registered collection configurations
func (h *CRUDHandler) GetCollectionConfigs() map[string]CollectionConfig {
	return h.configs
}

// getCollectionPath returns the full collection path for a given collection name and user ID
func (h *CRUDHandler) getCollectionPath(collection, uid string) string {
	config, exists := h.configs[collection]
	if !exists || !config.UserScoped {
		return collection
	}
	return fmt.Sprintf("users/%s/%s", uid, collection)
}

// getDocumentPath returns the full document path
func (h *CRUDHandler) getDocumentPath(collection, uid, docID string) string {
	return fmt.Sprintf("%s/%s", h.getCollectionPath(collection, uid), docID)
}

// Create handles POST /api/{collection}
// Creates a new document in the collection
func (h *CRUDHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	collection := vars["collection"]

	// Validate collection exists
	config, exists := h.configs[collection]
	if !exists {
		utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
		return
	}

	// Parse request body
	var data map[string]interface{}
	if err := utils.ParseJSON(r, &data); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	for _, field := range config.RequiredFields {
		if _, ok := data[field]; !ok {
			utils.RespondError(w, fmt.Sprintf("Missing required field: %s", field), http.StatusBadRequest)
			return
		}
	}

	// Generate document ID if not provided
	docID, ok := data["id"].(string)
	if !ok || docID == "" {
		docID = fmt.Sprintf("%d", nowMillis())
		data["id"] = docID
	}

	// Build document path
	docPath := h.getDocumentPath(collection, uid, docID)

	h.logger.Debug("Creating document",
		zap.String("collection", collection),
		zap.String("uid", uid),
		zap.String("docId", docID),
	)

	// Create document
	if err := h.repo.CreateDocument(ctx, docPath, data); err != nil {
		h.logger.Error("Failed to create document",
			zap.Error(err),
			zap.String("path", docPath),
		)
		utils.RespondError(w, "Failed to create document", http.StatusInternalServerError)
		return
	}

	// Fetch the created document to return
	doc, err := h.repo.Get(ctx, docPath)
	if err != nil {
		// Document was created but we couldn't fetch it - return the input data
		data["id"] = docID
		utils.RespondSuccess(w, data, "Document created")
		return
	}

	utils.RespondSuccess(w, doc, "Document created")
}

// List handles GET /api/{collection}
// Returns all documents in the collection with optional pagination and filtering
func (h *CRUDHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	collection := vars["collection"]

	// Validate collection exists
	config, exists := h.configs[collection]
	if !exists {
		utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
		return
	}

	// Parse query parameters
	limitStr := r.URL.Query().Get("limit")
	orderBy := r.URL.Query().Get("orderBy")
	orderDir := r.URL.Query().Get("orderDir")

	// Default limit
	limit := 100
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 500 {
			limit = parsed
		}
	}

	// Build collection path
	collectionPath := h.getCollectionPath(collection, uid)

	h.logger.Debug("Listing documents",
		zap.String("collection", collection),
		zap.String("uid", uid),
		zap.Int("limit", limit),
	)

	// Build query options
	var opts []repository.QueryOption

	// Add ordering
	if orderBy == "" && config.DefaultOrderBy != "" {
		orderBy = config.DefaultOrderBy
	}
	if orderBy != "" {
		dir := config.DefaultOrderDir
		if orderDir == "asc" {
			dir = firestore.Asc
		} else if orderDir == "desc" {
			dir = firestore.Desc
		}
		opts = append(opts, repository.OrderBy(orderBy, dir))
	}

	// Add limit
	opts = append(opts, repository.Limit(limit))

	// Query documents
	docs, err := h.repo.QueryCollection(ctx, collectionPath, opts...)
	if err != nil {
		h.logger.Error("Failed to list documents",
			zap.Error(err),
			zap.String("collection", collectionPath),
		)
		utils.RespondError(w, "Failed to list documents", http.StatusInternalServerError)
		return
	}

	// Convert to slice of maps
	result := make([]map[string]interface{}, len(docs))
	for i, doc := range docs {
		data := doc.Data()
		data["id"] = doc.Ref.ID
		result[i] = data
	}

	utils.RespondSuccess(w, result, fmt.Sprintf("Found %d documents", len(result)))
}

// Get handles GET /api/{collection}/{id}
// Returns a single document by ID
func (h *CRUDHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	collection := vars["collection"]
	docID := vars["id"]

	// Validate collection exists
	if _, exists := h.configs[collection]; !exists {
		utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
		return
	}

	// Build document path
	docPath := h.getDocumentPath(collection, uid, docID)

	h.logger.Debug("Getting document",
		zap.String("collection", collection),
		zap.String("uid", uid),
		zap.String("docId", docID),
	)

	// Get document
	doc, err := h.repo.Get(ctx, docPath)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "NotFound") {
			utils.RespondError(w, "Document not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to get document",
			zap.Error(err),
			zap.String("path", docPath),
		)
		utils.RespondError(w, "Failed to get document", http.StatusInternalServerError)
		return
	}

	doc["id"] = docID
	utils.RespondSuccess(w, doc, "Document retrieved")
}

// Update handles PUT /api/{collection}/{id}
// Updates an existing document
func (h *CRUDHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	collection := vars["collection"]
	docID := vars["id"]

	// Validate collection exists
	config, exists := h.configs[collection]
	if !exists {
		utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
		return
	}

	// Parse request body
	var updates map[string]interface{}
	if err := utils.ParseJSON(r, &updates); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	// Filter allowed fields if configured
	if len(config.AllowedFields) > 0 {
		filtered := make(map[string]interface{})
		for _, field := range config.AllowedFields {
			if val, ok := updates[field]; ok {
				filtered[field] = val
			}
		}
		updates = filtered
	}

	// Remove fields that shouldn't be updated directly
	delete(updates, "id")
	delete(updates, "createdAt")
	delete(updates, "updatedAt")
	delete(updates, "updatedBy")
	delete(updates, "version")

	if len(updates) == 0 {
		utils.RespondError(w, "No valid fields to update", http.StatusBadRequest)
		return
	}

	// Build document path
	docPath := h.getDocumentPath(collection, uid, docID)

	h.logger.Debug("Updating document",
		zap.String("collection", collection),
		zap.String("uid", uid),
		zap.String("docId", docID),
	)

	// Update document
	if err := h.repo.UpdateDocument(ctx, docPath, updates); err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "NotFound") {
			utils.RespondError(w, "Document not found", http.StatusNotFound)
			return
		}
		h.logger.Error("Failed to update document",
			zap.Error(err),
			zap.String("path", docPath),
		)
		utils.RespondError(w, "Failed to update document", http.StatusInternalServerError)
		return
	}

	// Fetch the updated document to return
	doc, err := h.repo.Get(ctx, docPath)
	if err != nil {
		// Document was updated but we couldn't fetch it
		utils.RespondSuccess(w, map[string]interface{}{"id": docID}, "Document updated")
		return
	}

	doc["id"] = docID
	utils.RespondSuccess(w, doc, "Document updated")
}

// Delete handles DELETE /api/{collection}/{id}
// Deletes a document
func (h *CRUDHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	collection := vars["collection"]
	docID := vars["id"]

	// Validate collection exists
	if _, exists := h.configs[collection]; !exists {
		utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
		return
	}

	// Build document path
	docPath := h.getDocumentPath(collection, uid, docID)

	h.logger.Debug("Deleting document",
		zap.String("collection", collection),
		zap.String("uid", uid),
		zap.String("docId", docID),
	)

	// Delete document
	if err := h.repo.DeleteDocument(ctx, docPath); err != nil {
		h.logger.Error("Failed to delete document",
			zap.Error(err),
			zap.String("path", docPath),
		)
		utils.RespondError(w, "Failed to delete document", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{"id": docID, "deleted": true}, "Document deleted")
}

// BatchCreate handles POST /api/{collection}/batch
// Creates multiple documents at once
func (h *CRUDHandler) BatchCreate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	collection := vars["collection"]

	// Validate collection exists
	config, exists := h.configs[collection]
	if !exists {
		utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
		return
	}

	// Parse request body
	var items []map[string]interface{}
	if err := utils.ParseJSON(r, &items); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	if len(items) == 0 {
		utils.RespondError(w, "No items provided", http.StatusBadRequest)
		return
	}

	if len(items) > 500 {
		utils.RespondError(w, "Maximum batch size is 500 items", http.StatusBadRequest)
		return
	}

	h.logger.Debug("Batch creating documents",
		zap.String("collection", collection),
		zap.String("uid", uid),
		zap.Int("count", len(items)),
	)

	// Create documents
	created := make([]map[string]interface{}, 0, len(items))
	errors := make([]string, 0)

	for i, data := range items {
		// Validate required fields
		valid := true
		for _, field := range config.RequiredFields {
			if _, ok := data[field]; !ok {
				errors = append(errors, fmt.Sprintf("Item %d: missing required field %s", i, field))
				valid = false
				break
			}
		}
		if !valid {
			continue
		}

		// Generate document ID if not provided
		docID, ok := data["id"].(string)
		if !ok || docID == "" {
			docID = fmt.Sprintf("%d-%d", nowMillis(), i)
			data["id"] = docID
		}

		docPath := h.getDocumentPath(collection, uid, docID)

		if err := h.repo.CreateDocument(ctx, docPath, data); err != nil {
			errors = append(errors, fmt.Sprintf("Item %d: %v", i, err))
			continue
		}

		created = append(created, data)
	}

	result := map[string]interface{}{
		"created": created,
		"count":   len(created),
	}
	if len(errors) > 0 {
		result["errors"] = errors
	}

	utils.RespondSuccess(w, result, fmt.Sprintf("Created %d of %d documents", len(created), len(items)))
}

// BatchDelete handles DELETE /api/{collection}/batch
// Deletes multiple documents at once
func (h *CRUDHandler) BatchDelete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	collection := vars["collection"]

	// Validate collection exists
	if _, exists := h.configs[collection]; !exists {
		utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
		return
	}

	// Parse request body
	var request struct {
		IDs []string `json:"ids"`
	}
	if err := utils.ParseJSON(r, &request); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	if len(request.IDs) == 0 {
		utils.RespondError(w, "No IDs provided", http.StatusBadRequest)
		return
	}

	if len(request.IDs) > 500 {
		utils.RespondError(w, "Maximum batch size is 500 items", http.StatusBadRequest)
		return
	}

	h.logger.Debug("Batch deleting documents",
		zap.String("collection", collection),
		zap.String("uid", uid),
		zap.Int("count", len(request.IDs)),
	)

	// Delete documents
	deleted := make([]string, 0, len(request.IDs))
	errors := make([]string, 0)

	for _, docID := range request.IDs {
		docPath := h.getDocumentPath(collection, uid, docID)

		if err := h.repo.DeleteDocument(ctx, docPath); err != nil {
			errors = append(errors, fmt.Sprintf("%s: %v", docID, err))
			continue
		}

		deleted = append(deleted, docID)
	}

	result := map[string]interface{}{
		"deleted": deleted,
		"count":   len(deleted),
	}
	if len(errors) > 0 {
		result["errors"] = errors
	}

	utils.RespondSuccess(w, result, fmt.Sprintf("Deleted %d of %d documents", len(deleted), len(request.IDs)))
}

// GetCollections returns the list of registered collections
// GET /api/collections
func (h *CRUDHandler) GetCollections(w http.ResponseWriter, r *http.Request) {
	collections := make([]map[string]interface{}, 0, len(h.configs))
	for name, config := range h.configs {
		collections = append(collections, map[string]interface{}{
			"name":           name,
			"userScoped":     config.UserScoped,
			"requiredFields": config.RequiredFields,
		})
	}

	utils.RespondSuccess(w, collections, fmt.Sprintf("Found %d collections", len(collections)))
}

// nowMillis returns current time in milliseconds
// Can be overridden in tests via timeNowFunc
func nowMillis() int64 {
	return timeNowFunc().UnixMilli()
}

// timeNowFunc returns current time - variable for testing
var timeNowFunc = time.Now
