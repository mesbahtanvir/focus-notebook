package services

import (
	"context"
	"fmt"
	"io"
	"time"

	"cloud.google.com/go/storage"
	"github.com/google/uuid"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/models"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
	"go.uber.org/zap"
)

const (
	CSVBatchSize        = 50  // Process 50 transactions at a time
	FirestoreBatchLimit = 450 // Firestore batch limit is 500, use 450 for safety
)

// CSVProcessingService handles CSV file processing
type CSVProcessingService struct {
	repo                 repository.Repository
	storageClient        *storage.Client
	categorizationSvc    *TransactionCategorizationService
	logger               *zap.Logger
	bucketName           string
}

// NewCSVProcessingService creates a new CSV processing service
func NewCSVProcessingService(
	repo repository.Repository,
	storageClient *storage.Client,
	categorizationSvc *TransactionCategorizationService,
	bucketName string,
	logger *zap.Logger,
) *CSVProcessingService {
	return &CSVProcessingService{
		repo:              repo,
		storageClient:     storageClient,
		categorizationSvc: categorizationSvc,
		bucketName:        bucketName,
		logger:            logger,
	}
}

// ProcessCSVFile processes an uploaded CSV file
func (s *CSVProcessingService) ProcessCSVFile(
	ctx context.Context,
	userID string,
	fileName string,
	storagePath string,
) (int, error) {
	s.logger.Info("Processing CSV file",
		zap.String("uid", userID),
		zap.String("fileName", fileName),
		zap.String("storagePath", storagePath),
	)

	// Download CSV from storage
	csvContent, err := s.downloadFile(ctx, storagePath)
	if err != nil {
		return 0, fmt.Errorf("failed to download CSV: %w", err)
	}

	// Parse CSV
	transactions, err := utils.ParseCSV(csvContent)
	if err != nil {
		return 0, fmt.Errorf("failed to parse CSV: %w", err)
	}

	s.logger.Info("Parsed CSV",
		zap.Int("transactionCount", len(transactions)),
	)

	if len(transactions) == 0 {
		return 0, fmt.Errorf("no valid transactions found in CSV")
	}

	// Process in batches
	totalProcessed := 0
	for i := 0; i < len(transactions); i += CSVBatchSize {
		end := i + CSVBatchSize
		if end > len(transactions) {
			end = len(transactions)
		}

		batch := transactions[i:end]

		// Enhance with AI
		enhanced, err := s.categorizationSvc.EnhanceTransactions(ctx, batch)
		if err != nil {
			s.logger.Error("Failed to enhance batch",
				zap.Int("batchStart", i),
				zap.Int("batchSize", len(batch)),
				zap.Error(err),
			)
			continue // Continue with next batch even if this one fails
		}

		// Save to Firestore
		saved, err := s.saveTransactions(ctx, userID, fileName, batch, enhanced.Transactions)
		if err != nil {
			s.logger.Error("Failed to save batch",
				zap.Int("batchStart", i),
				zap.Int("batchSize", len(batch)),
				zap.Error(err),
			)
			continue
		}

		totalProcessed += saved
		s.logger.Info("Processed batch",
			zap.Int("batchStart", i),
			zap.Int("saved", saved),
			zap.Int("totalProcessed", totalProcessed),
		)
	}

	// Update statement record
	if err := s.updateStatement(ctx, userID, fileName, storagePath, "completed", totalProcessed, ""); err != nil {
		s.logger.Warn("Failed to update statement",
			zap.Error(err),
		)
	}

	s.logger.Info("CSV processing completed",
		zap.String("uid", userID),
		zap.String("fileName", fileName),
		zap.Int("totalProcessed", totalProcessed),
	)

	return totalProcessed, nil
}

// DeleteCSVStatement deletes a CSV statement and its transactions
func (s *CSVProcessingService) DeleteCSVStatement(
	ctx context.Context,
	userID string,
	fileName string,
) error {
	s.logger.Info("Deleting CSV statement",
		zap.String("uid", userID),
		zap.String("fileName", fileName),
	)

	// TODO: Delete associated transactions
	// For now, just delete the statement record

	// Delete statement record
	path := fmt.Sprintf("users/%s/statements/%s", userID, fileName)
	if err := s.repo.Delete(ctx, path); err != nil {
		return fmt.Errorf("failed to delete statement: %w", err)
	}

	return nil
}

// downloadFile downloads a file from Cloud Storage
func (s *CSVProcessingService) downloadFile(ctx context.Context, objectPath string) (string, error) {
	bucket := s.storageClient.Bucket(s.bucketName)
	obj := bucket.Object(objectPath)

	reader, err := obj.NewReader(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to create reader: %w", err)
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	return string(data), nil
}

// saveTransactions saves transactions to Firestore in batches
func (s *CSVProcessingService) saveTransactions(
	ctx context.Context,
	userID string,
	fileName string,
	rawTransactions []models.CSVTransaction,
	enhancedTransactions []models.EnhancedTransaction,
) (int, error) {
	if len(rawTransactions) != len(enhancedTransactions) {
		s.logger.Warn("Mismatch between raw and enhanced transaction counts",
			zap.Int("raw", len(rawTransactions)),
			zap.Int("enhanced", len(enhancedTransactions)),
		)
	}

	count := 0
	batchData := make([]map[string]interface{}, 0, FirestoreBatchLimit)
	batchPaths := make([]string, 0, FirestoreBatchLimit)

	for i := 0; i < len(rawTransactions); i++ {
		raw := rawTransactions[i]

		// Get enhanced data if available
		var enhanced *models.EnhancedTransaction
		if i < len(enhancedTransactions) {
			enhanced = &enhancedTransactions[i]
		}

		transactionID := uuid.New().String()
		path := fmt.Sprintf("users/%s/transactions/%s", userID, transactionID)

		// Build transaction data
		txData := map[string]interface{}{
			"id":          transactionID,
			"accountId":   "csv-upload",
			"csvFileName": fileName,
			"date":        raw.Date,
			"description": raw.Description,
			"amount":      raw.Amount,
			"source":      "csv-upload",
			"enhanced":    enhanced != nil,
			"createdAt":   time.Now().UTC().Format(time.RFC3339),
		}

		// Add enhanced fields if available
		if enhanced != nil {
			txData["merchant"] = enhanced.MerchantName
			txData["category"] = enhanced.Category
			txData["notes"] = enhanced.Notes
			if enhanced.IsSubscription {
				txData["tags"] = []string{"subscription"}
			} else {
				txData["tags"] = []string{}
			}
		}

		batchData = append(batchData, txData)
		batchPaths = append(batchPaths, path)
		count++

		// Commit batch when reaching limit
		if len(batchData) >= FirestoreBatchLimit {
			if err := s.writeBatch(ctx, batchPaths, batchData); err != nil {
				return count - len(batchData), err
			}
			batchData = batchData[:0]
			batchPaths = batchPaths[:0]
		}
	}

	// Commit remaining transactions
	if len(batchData) > 0 {
		if err := s.writeBatch(ctx, batchPaths, batchData); err != nil {
			return count - len(batchData), err
		}
	}

	return count, nil
}

// writeBatch writes a batch of documents to Firestore
func (s *CSVProcessingService) writeBatch(ctx context.Context, paths []string, data []map[string]interface{}) error {
	for i, path := range paths {
		if err := s.repo.Create(ctx, path, data[i]); err != nil {
			return fmt.Errorf("failed to write transaction %d: %w", i, err)
		}
	}
	return nil
}

// updateStatement updates or creates a statement record
func (s *CSVProcessingService) updateStatement(
	ctx context.Context,
	userID string,
	fileName string,
	storagePath string,
	status string,
	processedCount int,
	errorMsg string,
) error {
	path := fmt.Sprintf("users/%s/statements/%s", userID, fileName)

	data := map[string]interface{}{
		"id":             fileName,
		"fileName":       fileName,
		"storagePath":    storagePath,
		"status":         status,
		"source":         "csv-upload",
		"processedCount": processedCount,
		"uploadedAt":     time.Now().UTC().Format(time.RFC3339),
		"updatedAt":      time.Now().UTC().Format(time.RFC3339),
	}

	if errorMsg != "" {
		data["error"] = errorMsg
	}

	return s.repo.Create(ctx, path, data)
}
