package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository/mocks"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
)

func TestAnalyticsHandler_GetDashboardAnalytics(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	dashboardSvc := services.NewDashboardAnalyticsService(mockRepo, logger)
	spendingSvc := services.NewSpendingAnalyticsService(mockRepo, logger)
	handler := NewAnalyticsHandler(dashboardSvc, spendingSvc, logger)

	uid := "test-user-123"

	// Add some test data
	mockRepo.AddDocument("tasks", "task1", map[string]interface{}{
		"id":        "task1",
		"uid":       uid,
		"title":     "Test Task",
		"status":    "completed",
		"category":  "work",
	})

	tests := []struct {
		name       string
		period     string
		wantStatus int
	}{
		{
			name:       "valid period - today",
			period:     "today",
			wantStatus: http.StatusOK,
		},
		{
			name:       "valid period - week",
			period:     "week",
			wantStatus: http.StatusOK,
		},
		{
			name:       "valid period - month",
			period:     "month",
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid period",
			period:     "invalid",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "default period (empty)",
			period:     "",
			wantStatus: http.StatusOK, // Defaults to "today"
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			req := httptest.NewRequest("GET", "/api/analytics/dashboard?period="+tt.period, nil)

			// Add user context
			ctx := context.WithValue(req.Context(), "uid", uid)
			req = req.WithContext(ctx)

			// Create response recorder
			w := httptest.NewRecorder()

			// Call handler
			handler.GetDashboardAnalytics(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}

			// For successful requests, verify response structure
			if w.Code == http.StatusOK {
				contentType := w.Header().Get("Content-Type")
				if contentType != "application/json" {
					t.Errorf("Expected Content-Type application/json, got %s", contentType)
				}
			}
		})
	}
}

func TestAnalyticsHandler_GetSpendingAnalytics(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	dashboardSvc := services.NewDashboardAnalyticsService(mockRepo, logger)
	spendingSvc := services.NewSpendingAnalyticsService(mockRepo, logger)
	handler := NewAnalyticsHandler(dashboardSvc, spendingSvc, logger)

	uid := "test-user-123"

	// Add test transaction data
	mockRepo.AddDocument("transactions", "txn1", map[string]interface{}{
		"id":     "txn1",
		"uid":    uid,
		"amount": -50.0,
		"date":   "2024-01-15",
	})

	tests := []struct {
		name       string
		startDate  string
		endDate    string
		wantStatus int
	}{
		{
			name:       "valid date range",
			startDate:  "2024-01-01",
			endDate:    "2024-01-31",
			wantStatus: http.StatusOK,
		},
		{
			name:       "missing start date",
			startDate:  "",
			endDate:    "2024-01-31",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing end date",
			startDate:  "2024-01-01",
			endDate:    "",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "both dates missing",
			startDate:  "",
			endDate:    "",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			url := "/api/analytics/spending"
			if tt.startDate != "" || tt.endDate != "" {
				url += "?startDate=" + tt.startDate + "&endDate=" + tt.endDate
			}
			req := httptest.NewRequest("GET", url, nil)

			// Add user context
			ctx := context.WithValue(req.Context(), "uid", uid)
			req = req.WithContext(ctx)

			// Create response recorder
			w := httptest.NewRecorder()

			// Call handler
			handler.GetSpendingAnalytics(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}
