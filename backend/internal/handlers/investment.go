package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
)

// InvestmentHandler handles investment calculation requests
type InvestmentHandler struct {
	svc    *services.InvestmentCalculationService
	logger *zap.Logger
}

// NewInvestmentHandler creates a new investment handler
func NewInvestmentHandler(svc *services.InvestmentCalculationService, logger *zap.Logger) *InvestmentHandler {
	return &InvestmentHandler{
		svc:    svc,
		logger: logger,
	}
}

// GetPortfolioMetrics returns calculated metrics for a portfolio
// GET /api/portfolio/{portfolioId}/metrics
func (h *InvestmentHandler) GetPortfolioMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Get portfolio ID from URL
	vars := mux.Vars(r)
	portfolioID := vars["portfolioId"]

	if portfolioID == "" {
		utils.RespondError(w, "Portfolio ID is required", http.StatusBadRequest)
		return
	}

	h.logger.Debug("GetPortfolioMetrics request",
		zap.String("uid", uid),
		zap.String("portfolioId", portfolioID),
	)

	// Calculate metrics
	metrics, err := h.svc.CalculatePortfolioMetrics(ctx, uid, portfolioID)
	if err != nil {
		h.logger.Error("Failed to calculate portfolio metrics", zap.Error(err))
		utils.RespondError(w, "Failed to calculate metrics", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, metrics, "Portfolio metrics calculated")
}

// GenerateProjection generates a compound interest projection
// POST /api/portfolio/projection
func (h *InvestmentHandler) GenerateProjection(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Parse request body
	var req services.ProjectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.logger.Debug("GenerateProjection request",
		zap.String("uid", uid),
		zap.Float64("initialAmount", req.InitialAmount),
		zap.Float64("annualReturn", req.AnnualReturn),
		zap.Int("months", req.Months),
		zap.Int("contributionCount", len(req.Contributions)),
	)

	// Generate projection
	projection, err := h.svc.GenerateProjection(ctx, req)
	if err != nil {
		h.logger.Error("Failed to generate projection", zap.Error(err))
		utils.RespondError(w, "Failed to generate projection: "+err.Error(), http.StatusBadRequest)
		return
	}

	utils.RespondSuccess(w, projection, "Projection generated")
}

// GetDashboardSummary returns aggregate summary across all portfolios
// GET /api/portfolio/summary?currency=USD
func (h *InvestmentHandler) GetDashboardSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Get base currency from query params (default to USD)
	baseCurrency := r.URL.Query().Get("currency")
	if baseCurrency == "" {
		baseCurrency = "USD"
	}

	h.logger.Debug("GetDashboardSummary request",
		zap.String("uid", uid),
		zap.String("baseCurrency", baseCurrency),
	)

	// Calculate summary
	summary, err := h.svc.CalculateDashboardSummary(ctx, uid, baseCurrency)
	if err != nil {
		h.logger.Error("Failed to calculate dashboard summary", zap.Error(err))
		utils.RespondError(w, "Failed to calculate summary", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, summary, "Dashboard summary calculated")
}

// GetPortfolioSnapshots returns historical snapshots for a portfolio
// GET /api/portfolio/{portfolioId}/snapshots?startDate=2024-01-01&endDate=2024-12-31
func (h *InvestmentHandler) GetPortfolioSnapshots(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Get portfolio ID from URL
	vars := mux.Vars(r)
	portfolioID := vars["portfolioId"]

	if portfolioID == "" {
		utils.RespondError(w, "Portfolio ID is required", http.StatusBadRequest)
		return
	}

	// Parse date filters
	var startDate, endDate *time.Time
	if startDateStr := r.URL.Query().Get("startDate"); startDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", startDateStr); err == nil {
			startDate = &parsed
		}
	}
	if endDateStr := r.URL.Query().Get("endDate"); endDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", endDateStr); err == nil {
			endDate = &parsed
		}
	}

	h.logger.Debug("GetPortfolioSnapshots request",
		zap.String("uid", uid),
		zap.String("portfolioId", portfolioID),
	)

	// Get snapshots
	snapshots, err := h.svc.GetPortfolioSnapshots(ctx, uid, portfolioID, startDate, endDate)
	if err != nil {
		h.logger.Error("Failed to get portfolio snapshots", zap.Error(err))
		utils.RespondError(w, "Failed to get snapshots", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"snapshots": snapshots,
		"count":     len(snapshots),
	}, "Portfolio snapshots retrieved")
}
