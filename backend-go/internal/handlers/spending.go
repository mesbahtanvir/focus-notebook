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

// TODO: Add more spending endpoints:
// - CategorizeTransaction
// - LinkTransactionToTrip
// - DeleteAllTransactions
