package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
	"go.uber.org/zap"
)

// StockHandler handles stock-related requests
type StockHandler struct {
	stockService      *services.StockService
	predictionService *services.InvestmentPredictionService
	logger            *zap.Logger
}

// NewStockHandler creates a new stock handler
func NewStockHandler(
	stockService *services.StockService,
	predictionService *services.InvestmentPredictionService,
	logger *zap.Logger,
) *StockHandler {
	return &StockHandler{
		stockService:      stockService,
		predictionService: predictionService,
		logger:            logger,
	}
}

// GetStockPriceRequest represents the request to get a stock price
type GetStockPriceRequest struct {
	Ticker string `json:"ticker"`
}

// GetStockHistoryRequest represents the request to get stock history
type GetStockHistoryRequest struct {
	Ticker string `json:"ticker"`
	Days   int    `json:"days"`
}

// GetStockPrice handles POST /api/stock-price
func (h *StockHandler) GetStockPrice(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req GetStockPriceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Ticker == "" {
		utils.WriteError(w, "Ticker is required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Getting stock price",
		zap.String("uid", userID),
		zap.String("ticker", req.Ticker),
	)

	quote, err := h.stockService.GetStockPrice(ctx, userID, req.Ticker)
	if err != nil {
		h.logger.Error("Failed to get stock price",
			zap.String("uid", userID),
			zap.String("ticker", req.Ticker),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to fetch stock price", http.StatusInternalServerError)
		return
	}

	utils.WriteJSON(w, quote, http.StatusOK)
}

// GetStockHistory handles POST /api/stock-history
func (h *StockHandler) GetStockHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req GetStockHistoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Ticker == "" {
		utils.WriteError(w, "Ticker is required", http.StatusBadRequest)
		return
	}

	// Default to 90 days if not specified
	if req.Days <= 0 {
		req.Days = 90
	}

	// Limit to 5 years (1825 days)
	if req.Days > 1825 {
		req.Days = 1825
	}

	h.logger.Info("Getting stock history",
		zap.String("uid", userID),
		zap.String("ticker", req.Ticker),
		zap.Int("days", req.Days),
	)

	history, err := h.stockService.GetStockHistory(ctx, userID, req.Ticker, req.Days)
	if err != nil {
		h.logger.Error("Failed to get stock history",
			zap.String("uid", userID),
			zap.String("ticker", req.Ticker),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to fetch stock history", http.StatusInternalServerError)
		return
	}

	utils.WriteJSON(w, history, http.StatusOK)
}

// PredictInvestmentRequest represents the request for investment prediction
type PredictInvestmentRequest struct {
	Symbol         string                                   `json:"symbol"`
	HistoricalData []services.HistoricalDataPoint           `json:"historicalData"`
	Model          string                                   `json:"model,omitempty"`
}

// PredictInvestment handles POST /api/predict-investment
func (h *StockHandler) PredictInvestment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req PredictInvestmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.Symbol == "" {
		utils.WriteError(w, "Symbol is required", http.StatusBadRequest)
		return
	}

	if len(req.HistoricalData) < 30 {
		utils.WriteError(w, "Need at least 30 days of historical data for predictions", http.StatusBadRequest)
		return
	}

	// Check if prediction service is available
	if h.predictionService == nil {
		utils.WriteError(w, "Investment prediction service not available", http.StatusServiceUnavailable)
		return
	}

	h.logger.Info("Generating investment prediction",
		zap.String("uid", userID),
		zap.String("symbol", req.Symbol),
		zap.Int("dataPoints", len(req.HistoricalData)),
		zap.String("model", req.Model),
	)

	prediction, err := h.predictionService.PredictInvestment(
		ctx,
		req.Symbol,
		req.HistoricalData,
		req.Model,
	)
	if err != nil {
		h.logger.Error("Failed to generate prediction",
			zap.String("uid", userID),
			zap.String("symbol", req.Symbol),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to generate investment prediction", http.StatusInternalServerError)
		return
	}

	utils.WriteJSON(w, prediction, http.StatusOK)
}
