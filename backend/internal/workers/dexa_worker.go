package workers

import (
	"context"
	"fmt"
	"io"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
)

const (
	DexaProcessingStatusCollection = "dexaScanProcessingStatus"
	DexaScansCollection            = "dexaScans"
)

// DexaWorker processes uploaded DEXA scan files using AI vision
type DexaWorker struct {
	*BaseWorker
	repo          *repository.FirestoreRepository
	storageClient *storage.Client
	openaiClient  *clients.OpenAIClient
	bucketName    string
}

// NewDexaWorker creates a new DEXA scan processing worker
func NewDexaWorker(
	repo *repository.FirestoreRepository,
	storageClient *storage.Client,
	openaiClient *clients.OpenAIClient,
	bucketName string,
	interval time.Duration,
	batchSize int,
	logger *zap.Logger,
) *DexaWorker {
	return &DexaWorker{
		BaseWorker:    NewBaseWorker("dexa-worker", interval, batchSize, logger),
		repo:          repo,
		storageClient: storageClient,
		openaiClient:  openaiClient,
		bucketName:    bucketName,
	}
}

// Start begins the DEXA worker's processing loop
func (w *DexaWorker) Start(ctx context.Context) error {
	if w.openaiClient == nil {
		w.Logger().Warn("OpenAI client not available, DEXA worker disabled")
		return nil
	}
	if w.storageClient == nil {
		w.Logger().Warn("Storage client not available, DEXA worker disabled")
		return nil
	}

	go w.RunLoop(ctx, w.processDexaJobs)
	return nil
}

// DexaJob represents a pending DEXA processing job
type DexaJob struct {
	UserID      string
	FileName    string
	StoragePath string
	ContentType string
	DocPath     string
}

// processDexaJobs finds and processes pending DEXA scan jobs
func (w *DexaWorker) processDexaJobs(ctx context.Context) (int, error) {
	pendingJobs, err := w.findPendingJobs(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to find pending jobs: %w", err)
	}

	if len(pendingJobs) == 0 {
		return 0, nil
	}

	processed := 0
	for _, job := range pendingJobs {
		select {
		case <-ctx.Done():
			return processed, ctx.Err()
		default:
			if err := w.processJob(ctx, job); err != nil {
				w.Logger().Error("Failed to process DEXA job",
					zap.String("userId", job.UserID),
					zap.String("fileName", job.FileName),
					zap.Error(err),
				)
				if updateErr := w.updateJobStatus(ctx, job, JobStatusFailed, err.Error()); updateErr != nil {
					w.Logger().Error("Failed to update job status", zap.Error(updateErr))
				}
				continue
			}
			processed++
		}
	}

	return processed, nil
}

// findPendingJobs queries Firestore for pending DEXA processing jobs
func (w *DexaWorker) findPendingJobs(ctx context.Context) ([]DexaJob, error) {
	var jobs []DexaJob
	client := w.repo.Client()

	// Get all users
	usersIter := client.Collection("users").Documents(ctx)
	defer usersIter.Stop()

	for {
		userDoc, err := usersIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			w.Logger().Warn("Error iterating users", zap.Error(err))
			continue
		}

		userID := userDoc.Ref.ID

		// Check for pending DEXA processing status
		statusIter := client.Collection(fmt.Sprintf("users/%s/%s", userID, DexaProcessingStatusCollection)).
			Where("status", "==", "pending").
			Limit(w.BatchSize()).
			Documents(ctx)

		for {
			statusDoc, err := statusIter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				w.Logger().Warn("Error iterating DEXA status", zap.Error(err))
				continue
			}

			data := statusDoc.Data()
			fileName, _ := data["fileName"].(string)
			storagePath, _ := data["storagePath"].(string)
			contentType, _ := data["contentType"].(string)

			if fileName == "" || storagePath == "" {
				continue
			}

			jobs = append(jobs, DexaJob{
				UserID:      userID,
				FileName:    fileName,
				StoragePath: storagePath,
				ContentType: contentType,
				DocPath:     statusDoc.Ref.Path,
			})

			if len(jobs) >= w.BatchSize() {
				statusIter.Stop()
				return jobs, nil
			}
		}
		statusIter.Stop()
	}

	return jobs, nil
}

// processJob processes a single DEXA scan job
func (w *DexaWorker) processJob(ctx context.Context, job DexaJob) error {
	w.Logger().Info("Processing DEXA scan job",
		zap.String("userId", job.UserID),
		zap.String("fileName", job.FileName),
	)

	// Update status to processing
	if err := w.updateJobStatus(ctx, job, JobStatusProcessing, ""); err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	// Download file from storage
	fileContent, err := w.downloadFile(ctx, job.StoragePath)
	if err != nil {
		return fmt.Errorf("failed to download file: %w", err)
	}

	// Parse DEXA scan using AI vision
	scanData, err := w.parseDexaScan(ctx, fileContent, job.ContentType)
	if err != nil {
		return fmt.Errorf("failed to parse DEXA scan: %w", err)
	}

	// Save scan data to Firestore
	scanID, err := w.saveScanData(ctx, job.UserID, job.FileName, job.StoragePath, scanData)
	if err != nil {
		return fmt.Errorf("failed to save scan data: %w", err)
	}

	// Update status to completed
	client := w.repo.Client()
	statusPath := fmt.Sprintf("users/%s/%s/%s", job.UserID, DexaProcessingStatusCollection, job.FileName)
	_, err = client.Doc(statusPath).Set(ctx, map[string]interface{}{
		"status":    "completed",
		"scanId":    scanID,
		"updatedAt": time.Now().UTC().Format(time.RFC3339),
	}, firestore.MergeAll)

	if err != nil {
		return fmt.Errorf("failed to update completion status: %w", err)
	}

	w.Logger().Info("DEXA scan job completed",
		zap.String("userId", job.UserID),
		zap.String("fileName", job.FileName),
		zap.String("scanId", scanID),
	)

	return nil
}

// downloadFile downloads a file from Cloud Storage
func (w *DexaWorker) downloadFile(ctx context.Context, objectPath string) ([]byte, error) {
	bucket := w.storageClient.Bucket(w.bucketName)
	obj := bucket.Object(objectPath)

	reader, err := obj.NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create reader: %w", err)
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return data, nil
}

// DexaScanData represents parsed DEXA scan data
type DexaScanData struct {
	ScanDate           string             `json:"scanDate"`
	Weight             float64            `json:"weight,omitempty"`
	WeightUnit         string             `json:"weightUnit,omitempty"`
	BodyFatPercentage  float64            `json:"bodyFatPercentage,omitempty"`
	LeanMass           float64            `json:"leanMass,omitempty"`
	FatMass            float64            `json:"fatMass,omitempty"`
	BoneMineralDensity float64            `json:"boneMineralDensity,omitempty"`
	VisceralFat        float64            `json:"visceralFat,omitempty"`
	Summary            string             `json:"summary,omitempty"`
	Insights           []string           `json:"insights,omitempty"`
	Recommendations    []string           `json:"recommendations,omitempty"`
	Regions            map[string]Region  `json:"regions,omitempty"`
	HealthMarkers      map[string]string  `json:"healthMarkers,omitempty"`
	Metadata           map[string]string  `json:"metadata,omitempty"`
}

// Region represents body region data
type Region struct {
	Lean float64 `json:"lean"`
	Fat  float64 `json:"fat"`
}

// parseDexaScan uses OpenAI vision to parse the DEXA scan
func (w *DexaWorker) parseDexaScan(ctx context.Context, fileContent []byte, contentType string) (*DexaScanData, error) {
	// Create prompt for DEXA scan parsing
	systemPrompt := `You are an expert at analyzing DEXA (Dual-Energy X-ray Absorptiometry) scan results.
Extract the following information from the scan if available:
- Scan date
- Body weight and unit
- Body fat percentage
- Lean mass (in lbs or kg)
- Fat mass (in lbs or kg)
- Bone mineral density (BMD)
- Visceral fat level
- Regional data (trunk, arms, legs)
- Health markers and ratings
- Any notable insights or recommendations

Return the data as a JSON object with the following structure:
{
  "scanDate": "YYYY-MM-DD",
  "weight": 0.0,
  "weightUnit": "lbs" or "kg",
  "bodyFatPercentage": 0.0,
  "leanMass": 0.0,
  "fatMass": 0.0,
  "boneMineralDensity": 0.0,
  "visceralFat": 0.0,
  "summary": "Brief summary of the scan results",
  "insights": ["insight1", "insight2"],
  "recommendations": ["recommendation1"],
  "regions": {
    "trunk": {"lean": 0.0, "fat": 0.0},
    "arms": {"lean": 0.0, "fat": 0.0},
    "legs": {"lean": 0.0, "fat": 0.0}
  },
  "healthMarkers": {
    "bmiCategory": "normal/overweight/etc",
    "visceralFatRating": "low/moderate/high",
    "boneDensityStatus": "normal/osteopenia/etc"
  },
  "metadata": {
    "scanLocation": "facility name if visible",
    "notes": "any additional notes"
  }
}

Only include fields that you can extract from the scan. Use null for unknown values.`

	userPrompt := "Please analyze this DEXA scan and extract the relevant data."

	// Use OpenAI vision to analyze the image/PDF
	result, err := w.openaiClient.AnalyzeImage(ctx, systemPrompt, userPrompt, fileContent, contentType)
	if err != nil {
		return nil, fmt.Errorf("OpenAI analysis failed: %w", err)
	}

	// Parse the JSON response
	var scanData DexaScanData
	if err := result.ParseJSON(&scanData); err != nil {
		// If parsing fails, try to extract basic data
		w.Logger().Warn("Failed to parse DEXA scan JSON response",
			zap.Error(err),
			zap.String("response", result.Content),
		)

		// Return minimal data with AI summary
		return &DexaScanData{
			ScanDate: time.Now().Format("2006-01-02"),
			Summary:  result.Content,
		}, nil
	}

	return &scanData, nil
}

// saveScanData saves the parsed DEXA scan data to Firestore
func (w *DexaWorker) saveScanData(ctx context.Context, userID, fileName, storagePath string, scanData *DexaScanData) (string, error) {
	client := w.repo.Client()

	// Generate scan ID from filename (without extension)
	scanID := fileName
	if idx := len(fileName) - len(".pdf"); idx > 0 && fileName[idx:] == ".pdf" {
		scanID = fileName[:idx]
	}

	docPath := fmt.Sprintf("users/%s/%s/%s", userID, DexaScansCollection, scanID)

	// Normalize weight to lbs if in kg
	weight := scanData.Weight
	if weight > 0 && scanData.WeightUnit == "kg" {
		weight = weight * 2.20462
	}

	data := map[string]interface{}{
		"id":                 scanID,
		"fileName":           fileName,
		"storagePath":        storagePath,
		"scanDate":           scanData.ScanDate,
		"weight":             weight,
		"bodyFatPercentage":  scanData.BodyFatPercentage,
		"leanMass":           scanData.LeanMass,
		"fatMass":            scanData.FatMass,
		"boneMineralDensity": scanData.BoneMineralDensity,
		"visceralFat":        scanData.VisceralFat,
		"aiSummary":          scanData.Summary,
		"aiInsights":         scanData.Insights,
		"recommendations":    scanData.Recommendations,
		"regions":            scanData.Regions,
		"healthMarkers":      scanData.HealthMarkers,
		"metadata":           scanData.Metadata,
		"createdAt":          time.Now().UTC().Format(time.RFC3339),
		"updatedAt":          time.Now().UTC().Format(time.RFC3339),
	}

	_, err := client.Doc(docPath).Set(ctx, data)
	if err != nil {
		return "", fmt.Errorf("failed to save scan data: %w", err)
	}

	return scanID, nil
}

// updateJobStatus updates the job status in Firestore
func (w *DexaWorker) updateJobStatus(ctx context.Context, job DexaJob, status JobStatus, errorMsg string) error {
	client := w.repo.Client()
	statusPath := fmt.Sprintf("users/%s/%s/%s", job.UserID, DexaProcessingStatusCollection, job.FileName)

	updates := map[string]interface{}{
		"status":    string(status),
		"updatedAt": time.Now().UTC().Format(time.RFC3339),
	}
	if errorMsg != "" {
		updates["error"] = errorMsg
	}

	_, err := client.Doc(statusPath).Set(ctx, updates, firestore.MergeAll)
	return err
}
