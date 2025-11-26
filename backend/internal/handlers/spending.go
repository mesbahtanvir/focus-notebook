package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
	"go.uber.org/zap"
)

// SpendingHandler handles spending-related requests
type SpendingHandler struct {
	csvProcessingService *services.CSVProcessingService
	logger               *zap.Logger
}

// NewSpendingHandler creates a new spending handler
func NewSpendingHandler(
	csvProcessingService *services.CSVProcessingService,
	logger *zap.Logger,
) *SpendingHandler {
	return &SpendingHandler{
		csvProcessingService: csvProcessingService,
		logger:               logger,
	}
}

// ProcessCSVRequest represents the request to process a CSV file
type ProcessCSVRequest struct {
	FileName    string `json:"fileName"`
	StoragePath string `json:"storagePath"`
}

// ProcessCSVResponse represents the response from CSV processing
type ProcessCSVResponse struct {
	Success        bool   `json:"success"`
	ProcessedCount int    `json:"processedCount"`
	FileName       string `json:"fileName"`
}

// DeleteCSVRequest represents the request to delete a CSV statement
type DeleteCSVRequest struct {
	FileName string `json:"fileName"`
}

// ProcessCSV handles POST /api/spending/process-csv
func (h *SpendingHandler) ProcessCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req ProcessCSVRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.FileName == "" || req.StoragePath == "" {
		utils.WriteError(w, "fileName and storagePath are required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Processing CSV",
		zap.String("uid", userID),
		zap.String("fileName", req.FileName),
	)

	processedCount, err := h.csvProcessingService.ProcessCSVFile(
		ctx,
		userID,
		req.FileName,
		req.StoragePath,
	)

	if err != nil {
		h.logger.Error("Failed to process CSV",
			zap.String("uid", userID),
			zap.String("fileName", req.FileName),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to process CSV file", http.StatusInternalServerError)
		return
	}

	response := ProcessCSVResponse{
		Success:        true,
		ProcessedCount: processedCount,
		FileName:       req.FileName,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}

// DeleteCSV handles POST /api/spending/delete-csv
func (h *SpendingHandler) DeleteCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req DeleteCSVRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.FileName == "" {
		utils.WriteError(w, "fileName is required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Deleting CSV statement",
		zap.String("uid", userID),
		zap.String("fileName", req.FileName),
	)

	err := h.csvProcessingService.DeleteCSVStatement(ctx, userID, req.FileName)
	if err != nil {
		h.logger.Error("Failed to delete CSV statement",
			zap.String("uid", userID),
			zap.String("fileName", req.FileName),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to delete CSV statement", http.StatusInternalServerError)
		return
	}

	utils.WriteJSON(w, map[string]bool{"success": true}, http.StatusOK)
}

// CategorizeTransactionRequest represents the request to categorize a transaction
type CategorizeTransactionRequest struct {
	TransactionID string   `json:"transactionId"`
	Merchant      string   `json:"merchant"`
	Description   string   `json:"description"`
	PlaidCategory []string `json:"plaidCategory,omitempty"`
}

// CategorizeTransactionResponse represents the categorization result
type CategorizeTransactionResponse struct {
	Success    bool    `json:"success"`
	Level1     string  `json:"level1"`
	Level2     string  `json:"level2,omitempty"`
	Confidence float64 `json:"confidence"`
}

// CategorizeTransaction handles POST /api/spending/categorize
func (h *SpendingHandler) CategorizeTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req CategorizeTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.TransactionID == "" || req.Merchant == "" || req.Description == "" {
		utils.WriteError(w, "transactionId, merchant, and description are required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Categorizing transaction",
		zap.String("uid", userID),
		zap.String("transactionId", req.TransactionID),
	)

	category, err := h.csvProcessingService.CategorizeTransaction(
		ctx,
		userID,
		req.Merchant,
		req.Description,
		req.PlaidCategory,
	)

	if err != nil {
		h.logger.Error("Failed to categorize transaction",
			zap.String("uid", userID),
			zap.String("transactionId", req.TransactionID),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to categorize transaction", http.StatusInternalServerError)
		return
	}

	response := CategorizeTransactionResponse{
		Success:    true,
		Level1:     category.Level1,
		Level2:     category.Level2,
		Confidence: category.Confidence,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}

// LinkTransactionToTripRequest represents the request to link a transaction to a trip
type LinkTransactionToTripRequest struct {
	TransactionID string  `json:"transactionId"`
	TripID        string  `json:"tripId"`
	Confidence    float64 `json:"confidence,omitempty"`
	Reasoning     string  `json:"reasoning,omitempty"`
}

// LinkTransactionToTrip handles POST /api/spending/link-trip
func (h *SpendingHandler) LinkTransactionToTrip(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req LinkTransactionToTripRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.TransactionID == "" || req.TripID == "" {
		utils.WriteError(w, "transactionId and tripId are required", http.StatusBadRequest)
		return
	}

	// Default confidence to 1.0 for manual links
	if req.Confidence == 0 {
		req.Confidence = 1.0
	}

	// Default reasoning for manual links
	if req.Reasoning == "" {
		req.Reasoning = "Linked manually by user"
	}

	h.logger.Info("Linking transaction to trip",
		zap.String("uid", userID),
		zap.String("transactionId", req.TransactionID),
		zap.String("tripId", req.TripID),
	)

	err := h.csvProcessingService.LinkTransactionToTrip(
		ctx,
		userID,
		req.TransactionID,
		req.TripID,
		req.Confidence,
		req.Reasoning,
	)

	if err != nil {
		h.logger.Error("Failed to link transaction to trip",
			zap.String("uid", userID),
			zap.String("transactionId", req.TransactionID),
			zap.String("tripId", req.TripID),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to link transaction to trip", http.StatusInternalServerError)
		return
	}

	utils.WriteJSON(w, map[string]bool{"success": true}, http.StatusOK)
}

// DeleteAllTransactionsResponse represents the response from deleting all transactions
type DeleteAllTransactionsResponse struct {
	Success                    bool `json:"success"`
	TransactionsDeleted        int  `json:"transactionsDeleted"`
	ProcessingStatusesDeleted  int  `json:"processingStatusesDeleted"`
	StatementsDeleted          int  `json:"statementsDeleted"`
	QueuedJobsDeleted          int  `json:"queuedJobsDeleted"`
}

// DeleteAllTransactions handles POST /api/spending/delete-all
func (h *SpendingHandler) DeleteAllTransactions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	h.logger.Info("Deleting all transactions for user", zap.String("uid", userID))

	summary, err := h.csvProcessingService.DeleteAllTransactions(ctx, userID)
	if err != nil {
		h.logger.Error("Failed to delete all transactions",
			zap.String("uid", userID),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to delete all transactions", http.StatusInternalServerError)
		return
	}

	response := DeleteAllTransactionsResponse{
		Success:                   true,
		TransactionsDeleted:       summary.TransactionsDeleted,
		ProcessingStatusesDeleted: summary.ProcessingStatusesDeleted,
		StatementsDeleted:         summary.StatementsDeleted,
		QueuedJobsDeleted:         summary.QueuedJobsDeleted,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}
