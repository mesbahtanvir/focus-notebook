package workers

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

const (
	CSVProcessingStatusCollection = "csvProcessingStatus"
)

// CSVWorker processes uploaded CSV files
type CSVWorker struct {
	*BaseWorker
	repo             *repository.FirestoreRepository
	csvProcessingSvc *services.CSVProcessingService
}

// NewCSVWorker creates a new CSV processing worker
func NewCSVWorker(
	repo *repository.FirestoreRepository,
	csvProcessingSvc *services.CSVProcessingService,
	interval time.Duration,
	batchSize int,
	logger *zap.Logger,
) *CSVWorker {
	return &CSVWorker{
		BaseWorker:       NewBaseWorker("csv-worker", interval, batchSize, logger),
		repo:             repo,
		csvProcessingSvc: csvProcessingSvc,
	}
}

// Start begins the CSV worker's processing loop
func (w *CSVWorker) Start(ctx context.Context) error {
	if w.csvProcessingSvc == nil {
		w.Logger().Warn("CSV processing service not available, worker disabled")
		return nil
	}

	go w.RunLoop(ctx, w.processCSVJobs)
	return nil
}

// processCSVJobs finds and processes pending CSV jobs
func (w *CSVWorker) processCSVJobs(ctx context.Context) (int, error) {
	// Find all users with pending CSV processing status
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
				w.Logger().Error("Failed to process CSV job",
					zap.String("userId", job.UserID),
					zap.String("fileName", job.FileName),
					zap.Error(err),
				)
				// Update job status to error
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

// CSVJob represents a pending CSV processing job
type CSVJob struct {
	UserID      string
	FileName    string
	StoragePath string
	DocPath     string
}

// findPendingJobs queries Firestore for pending CSV processing jobs
func (w *CSVWorker) findPendingJobs(ctx context.Context) ([]CSVJob, error) {
	// We need to scan all users' csvProcessingStatus collections
	// This is inefficient but necessary without a global queue
	// In production, consider using a global job queue

	var jobs []CSVJob
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

		// Check for pending CSV processing status
		statusIter := client.Collection(fmt.Sprintf("users/%s/%s", userID, CSVProcessingStatusCollection)).
			Where("status", "==", "pending").
			Limit(w.BatchSize()).
			Documents(ctx)

		for {
			statusDoc, err := statusIter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				w.Logger().Warn("Error iterating CSV status", zap.Error(err))
				continue
			}

			data := statusDoc.Data()
			fileName, _ := data["fileName"].(string)
			storagePath, _ := data["storagePath"].(string)

			if fileName == "" || storagePath == "" {
				continue
			}

			jobs = append(jobs, CSVJob{
				UserID:      userID,
				FileName:    fileName,
				StoragePath: storagePath,
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

// processJob processes a single CSV job
func (w *CSVWorker) processJob(ctx context.Context, job CSVJob) error {
	w.Logger().Info("Processing CSV job",
		zap.String("userId", job.UserID),
		zap.String("fileName", job.FileName),
	)

	// Update status to processing
	if err := w.updateJobStatus(ctx, job, JobStatusProcessing, ""); err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	// Add user ID to context for the service
	ctx = context.WithValue(ctx, "uid", job.UserID)

	// Process the CSV file
	processedCount, err := w.csvProcessingSvc.ProcessCSVFile(ctx, job.UserID, job.FileName, job.StoragePath)
	if err != nil {
		return fmt.Errorf("CSV processing failed: %w", err)
	}

	// Update status to completed
	client := w.repo.Client()
	statusPath := fmt.Sprintf("users/%s/%s/%s", job.UserID, CSVProcessingStatusCollection, job.FileName)
	_, err = client.Doc(statusPath).Set(ctx, map[string]interface{}{
		"status":         "completed",
		"processedCount": processedCount,
		"updatedAt":      time.Now().UTC().Format(time.RFC3339),
	}, firestore.MergeAll)

	if err != nil {
		return fmt.Errorf("failed to update completion status: %w", err)
	}

	w.Logger().Info("CSV job completed",
		zap.String("userId", job.UserID),
		zap.String("fileName", job.FileName),
		zap.Int("processedCount", processedCount),
	)

	return nil
}

// updateJobStatus updates the job status in Firestore
func (w *CSVWorker) updateJobStatus(ctx context.Context, job CSVJob, status JobStatus, errorMsg string) error {
	client := w.repo.Client()
	statusPath := fmt.Sprintf("users/%s/%s/%s", job.UserID, CSVProcessingStatusCollection, job.FileName)

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
