package handlers

import (
	"net/http"
	"strings"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
)

// AnalyticsHandler handles analytics requests
type AnalyticsHandler struct {
	dashboardSvc *services.DashboardAnalyticsService
	spendingSvc  *services.SpendingAnalyticsService
	logger       *zap.Logger
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(dashboardSvc *services.DashboardAnalyticsService, spendingSvc *services.SpendingAnalyticsService, logger *zap.Logger) *AnalyticsHandler {
	return &AnalyticsHandler{
		dashboardSvc: dashboardSvc,
		spendingSvc:  spendingSvc,
		logger:       logger,
	}
}

// GetDashboardAnalytics returns dashboard analytics for a user
// GET /api/analytics/dashboard?period=today|week|month
func (h *AnalyticsHandler) GetDashboardAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Get period from query params (default to today)
	periodStr := r.URL.Query().Get("period")
	if periodStr == "" {
		periodStr = "today"
	}

	// Validate period
	var period services.SummaryPeriod
	switch periodStr {
	case "today":
		period = services.PeriodToday
	case "week":
		period = services.PeriodWeek
	case "month":
		period = services.PeriodMonth
	default:
		utils.RespondError(w, "Invalid period. Must be 'today', 'week', or 'month'", http.StatusBadRequest)
		return
	}

	h.logger.Debug("GetDashboardAnalytics request",
		zap.String("uid", uid),
		zap.String("period", periodStr),
	)

	// Compute analytics
	analytics, err := h.dashboardSvc.ComputeAnalytics(ctx, uid, period)
	if err != nil {
		h.logger.Error("Failed to compute dashboard analytics", zap.Error(err))
		utils.RespondError(w, "Failed to compute analytics", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, analytics, "Dashboard analytics retrieved")
}

// GetSpendingAnalytics returns spending analytics for a user
// GET /api/analytics/spending?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&accountIds=id1,id2
func (h *AnalyticsHandler) GetSpendingAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Get query parameters
	startDate := r.URL.Query().Get("startDate")
	endDate := r.URL.Query().Get("endDate")
	accountIDsStr := r.URL.Query().Get("accountIds")

	// Validate required parameters
	if startDate == "" {
		utils.RespondError(w, "startDate is required (format: YYYY-MM-DD)", http.StatusBadRequest)
		return
	}
	if endDate == "" {
		utils.RespondError(w, "endDate is required (format: YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	// Parse account IDs (optional)
	var accountIDs []string
	if accountIDsStr != "" {
		accountIDs = strings.Split(accountIDsStr, ",")
		// Trim whitespace from each ID
		for i := range accountIDs {
			accountIDs[i] = strings.TrimSpace(accountIDs[i])
		}
	}

	h.logger.Debug("GetSpendingAnalytics request",
		zap.String("uid", uid),
		zap.String("startDate", startDate),
		zap.String("endDate", endDate),
		zap.Int("accountCount", len(accountIDs)),
	)

	// Compute spending analytics
	analytics, err := h.spendingSvc.ComputeSpendingAnalytics(ctx, uid, startDate, endDate, accountIDs)
	if err != nil {
		h.logger.Error("Failed to compute spending analytics", zap.Error(err))
		utils.RespondError(w, "Failed to compute spending analytics", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, analytics, "Spending analytics retrieved")
}
