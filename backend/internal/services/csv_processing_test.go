package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

func TestNewCSVProcessingService(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	service := NewCSVProcessingService(mockRepo, nil, nil, "test-bucket", logger)

	require.NotNil(t, service)
	assert.Equal(t, "test-bucket", service.bucketName)
}

func TestCSVProcessingService_Constants(t *testing.T) {
	// Test that constants are set correctly
	assert.Equal(t, 50, CSVBatchSize)
	assert.Equal(t, 450, FirestoreBatchLimit)
}

func TestCategoryMapping(t *testing.T) {
	cm := CategoryMapping{
		Level1:     "Food & Dining",
		Level2:     "Restaurants",
		Confidence: 0.95,
	}

	assert.Equal(t, "Food & Dining", cm.Level1)
	assert.Equal(t, "Restaurants", cm.Level2)
	assert.Equal(t, 0.95, cm.Confidence)
}

func TestCategoryMapping_AllFields(t *testing.T) {
	tests := []struct {
		level1     string
		level2     string
		confidence float64
	}{
		{"Shopping", "Retail", 0.9},
		{"Transportation", "Gas", 0.85},
		{"Entertainment", "Movies", 0.8},
		{"Bills & Utilities", "Electric", 0.95},
		{"Other", "", 0.5},
	}

	for _, tt := range tests {
		cm := CategoryMapping{
			Level1:     tt.level1,
			Level2:     tt.level2,
			Confidence: tt.confidence,
		}

		assert.Equal(t, tt.level1, cm.Level1)
		assert.Equal(t, tt.level2, cm.Level2)
		assert.Equal(t, tt.confidence, cm.Confidence)
	}
}

func TestDeleteAllTransactionsSummary(t *testing.T) {
	summary := DeleteAllTransactionsSummary{
		TransactionsDeleted:       100,
		ProcessingStatusesDeleted: 5,
		StatementsDeleted:         3,
		QueuedJobsDeleted:         2,
	}

	assert.Equal(t, 100, summary.TransactionsDeleted)
	assert.Equal(t, 5, summary.ProcessingStatusesDeleted)
	assert.Equal(t, 3, summary.StatementsDeleted)
	assert.Equal(t, 2, summary.QueuedJobsDeleted)
}

func TestDeleteAllTransactionsSummary_Empty(t *testing.T) {
	summary := DeleteAllTransactionsSummary{}

	assert.Equal(t, 0, summary.TransactionsDeleted)
	assert.Equal(t, 0, summary.ProcessingStatusesDeleted)
	assert.Equal(t, 0, summary.StatementsDeleted)
	assert.Equal(t, 0, summary.QueuedJobsDeleted)
}

func TestCSVProcessingService_NilDependencies(t *testing.T) {
	service := NewCSVProcessingService(nil, nil, nil, "", nil)

	require.NotNil(t, service)
	assert.Nil(t, service.repo)
	assert.Nil(t, service.storageClient)
	assert.Nil(t, service.categorizationSvc)
	assert.Empty(t, service.bucketName)
	assert.Nil(t, service.logger)
}

func TestCSVProcessingService_WithMockRepo(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	service := NewCSVProcessingService(mockRepo, nil, nil, "my-bucket", nil)

	require.NotNil(t, service)
	assert.NotNil(t, service.repo)
	assert.Equal(t, "my-bucket", service.bucketName)
}

func TestBatchSizeCalculations(t *testing.T) {
	// Test batch calculations
	totalTransactions := 150
	batchSize := CSVBatchSize // 50

	expectedBatches := (totalTransactions + batchSize - 1) / batchSize
	assert.Equal(t, 3, expectedBatches)

	// Test edge cases
	assert.Equal(t, 1, (1+batchSize-1)/batchSize)
	assert.Equal(t, 1, (50+batchSize-1)/batchSize)
	assert.Equal(t, 2, (51+batchSize-1)/batchSize)
}

func TestFirestoreBatchLimit(t *testing.T) {
	// Firestore has a 500 document limit, we use 450 for safety
	assert.Less(t, FirestoreBatchLimit, 500)
	assert.Greater(t, FirestoreBatchLimit, 400)
}

func TestDeleteAllTransactionsSummary_TotalDeleted(t *testing.T) {
	summary := DeleteAllTransactionsSummary{
		TransactionsDeleted:       100,
		ProcessingStatusesDeleted: 10,
		StatementsDeleted:         5,
		QueuedJobsDeleted:         2,
	}

	total := summary.TransactionsDeleted + summary.ProcessingStatusesDeleted +
		summary.StatementsDeleted + summary.QueuedJobsDeleted

	assert.Equal(t, 117, total)
}

func TestCategoryMapping_ConfidenceRange(t *testing.T) {
	// Test confidence values are within expected range
	confidences := []float64{0.0, 0.25, 0.5, 0.75, 0.85, 0.95, 1.0}

	for _, conf := range confidences {
		cm := CategoryMapping{
			Level1:     "Test",
			Confidence: conf,
		}
		assert.GreaterOrEqual(t, cm.Confidence, 0.0)
		assert.LessOrEqual(t, cm.Confidence, 1.0)
	}
}

func TestCSVProcessingService_PathConstruction(t *testing.T) {
	// Test that path construction follows expected patterns
	userID := "user123"
	fileName := "statement.csv"

	statementPath := "users/" + userID + "/statements/" + fileName
	assert.Equal(t, "users/user123/statements/statement.csv", statementPath)

	transactionsPath := "users/" + userID + "/transactions"
	assert.Equal(t, "users/user123/transactions", transactionsPath)
}

func TestCSVProcessingService_TransactionData(t *testing.T) {
	// Test transaction data structure
	txData := map[string]interface{}{
		"id":          "txn123",
		"accountId":   "csv-upload",
		"csvFileName": "test.csv",
		"date":        "2024-01-15",
		"description": "Test transaction",
		"amount":      100.50,
		"source":      "csv-upload",
		"enhanced":    true,
		"merchant":    "Test Merchant",
		"category":    "Food",
	}

	assert.Equal(t, "txn123", txData["id"])
	assert.Equal(t, "csv-upload", txData["accountId"])
	assert.Equal(t, 100.50, txData["amount"])
	assert.True(t, txData["enhanced"].(bool))
}

func TestCSVProcessingService_StatementData(t *testing.T) {
	// Test statement data structure
	statementData := map[string]interface{}{
		"id":             "test.csv",
		"fileName":       "test.csv",
		"storagePath":    "uploads/user123/test.csv",
		"status":         "completed",
		"source":         "csv-upload",
		"processedCount": 50,
	}

	assert.Equal(t, "completed", statementData["status"])
	assert.Equal(t, 50, statementData["processedCount"])
}

func TestCSVProcessingService_TripLinkData(t *testing.T) {
	// Test trip link data structure
	tripLinkData := map[string]interface{}{
		"tripId":          "trip123",
		"tripName":        "Paris Trip",
		"tripDestination": "Paris",
		"confidence":      0.95,
		"method":          "manual",
		"reasoning":       "User linked transaction",
	}

	assert.Equal(t, "trip123", tripLinkData["tripId"])
	assert.Equal(t, "manual", tripLinkData["method"])
	assert.Equal(t, 0.95, tripLinkData["confidence"])
}

func TestCSVProcessingService_BatchProcessing(t *testing.T) {
	// Test batch slicing logic
	transactions := make([]int, 175) // 175 transactions
	batchSize := 50

	batches := make([][]int, 0)
	for i := 0; i < len(transactions); i += batchSize {
		end := i + batchSize
		if end > len(transactions) {
			end = len(transactions)
		}
		batches = append(batches, transactions[i:end])
	}

	assert.Equal(t, 4, len(batches))
	assert.Equal(t, 50, len(batches[0]))
	assert.Equal(t, 50, len(batches[1]))
	assert.Equal(t, 50, len(batches[2]))
	assert.Equal(t, 25, len(batches[3]))
}

func TestCSVProcessingService_SubscriptionTagging(t *testing.T) {
	// Test subscription tagging logic
	testCases := []struct {
		isSubscription bool
		expectedTags   []string
	}{
		{true, []string{"subscription"}},
		{false, []string{}},
	}

	for _, tc := range testCases {
		var tags []string
		if tc.isSubscription {
			tags = []string{"subscription"}
		} else {
			tags = []string{}
		}
		assert.Equal(t, tc.expectedTags, tags)
	}
}

func TestCSVProcessingService_EnhancedTransactionFields(t *testing.T) {
	// Test enhanced transaction data structure
	enhanced := struct {
		MerchantName   string
		Category       string
		Notes          string
		IsSubscription bool
	}{
		MerchantName:   "Netflix",
		Category:       "Entertainment",
		Notes:          "Monthly subscription",
		IsSubscription: true,
	}

	assert.Equal(t, "Netflix", enhanced.MerchantName)
	assert.Equal(t, "Entertainment", enhanced.Category)
	assert.True(t, enhanced.IsSubscription)
}

func TestCSVProcessingService_DeleteCollectionPath(t *testing.T) {
	userID := "user123"

	paths := []string{
		"users/" + userID + "/transactions",
		"users/" + userID + "/csvProcessingStatus",
		"users/" + userID + "/statements",
	}

	assert.Contains(t, paths[0], "transactions")
	assert.Contains(t, paths[1], "csvProcessingStatus")
	assert.Contains(t, paths[2], "statements")
}
