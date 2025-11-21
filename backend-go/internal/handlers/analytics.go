package handlers

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
)

// AnalyticsHandler handles analytics requests
type AnalyticsHandler struct {
	dashboardSvc *services.DashboardAnalyticsService
	logger       *zap.Logger
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(dashboardSvc *services.DashboardAnalyticsService, logger *zap.Logger) *AnalyticsHandler {
	return &AnalyticsHandler{
		dashboardSvc: dashboardSvc,
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
