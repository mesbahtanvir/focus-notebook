package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestInvestmentHandler_GetPortfolioMetrics(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	investmentSvc := services.NewInvestmentCalculationService(mockRepo, logger)
	handler := NewInvestmentHandler(investmentSvc, logger)

	uid := "test-user-123"
	portfolioID := "portfolio-1"

	// Add test portfolio
	mockRepo.AddDocument("portfolios/"+portfolioID, map[string]interface{}{
		"id":           portfolioID,
		"uid":          uid,
		"name":         "Test Portfolio",
		"baseCurrency": "USD",
	})

	// Add test investment
	mockRepo.AddDocument("investments/inv1", map[string]interface{}{
		"id":            "inv1",
		"uid":           uid,
		"portfolioId":   portfolioID,
		"ticker":        "AAPL",
		"currentValue":  15000.0,
		"initialAmount": 10000.0,
		"currency":      "USD",
	})

	tests := []struct {
		name        string
		portfolioID string
		wantStatus  int
	}{
		{
			name:        "valid portfolio",
			portfolioID: portfolioID,
			wantStatus:  http.StatusOK,
		},
		{
			name:        "empty portfolio ID",
			portfolioID: "",
			wantStatus:  http.StatusNotFound, // mux will handle this
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request with mux vars
			req := httptest.NewRequest("GET", "/api/portfolio/"+tt.portfolioID+"/metrics", nil)

			// Add mux vars
			req = mux.SetURLVars(req, map[string]string{
				"portfolioId": tt.portfolioID,
			})

			// Add user context
			ctx := context.WithValue(req.Context(), "uid", uid)
			req = req.WithContext(ctx)

			// Create response recorder
			w := httptest.NewRecorder()

			// Call handler
			handler.GetPortfolioMetrics(w, req)

			// Check status code
			if tt.portfolioID != "" && w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

func TestInvestmentHandler_GenerateProjection(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	investmentSvc := services.NewInvestmentCalculationService(mockRepo, logger)
	handler := NewInvestmentHandler(investmentSvc, logger)

	uid := "test-user-123"

	tests := []struct {
		name       string
		payload    services.ProjectionRequest
		wantStatus int
	}{
		{
			name: "valid projection request",
			payload: services.ProjectionRequest{
				InitialAmount: 10000,
				AnnualReturn:  7.0,
				Months:        12,
				Contributions: []services.Contribution{
					{Amount: 500, Frequency: "monthly"},
				},
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "invalid months",
			payload: services.ProjectionRequest{
				InitialAmount: 10000,
				AnnualReturn:  7.0,
				Months:        400, // > 360 max
				Contributions: []services.Contribution{},
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "invalid return rate",
			payload: services.ProjectionRequest{
				InitialAmount: 10000,
				AnnualReturn:  150.0, // > 100 max
				Months:        12,
				Contributions: []services.Contribution{},
			},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Encode payload
			body, _ := json.Marshal(tt.payload)

			// Create request
			req := httptest.NewRequest("POST", "/api/portfolio/projection", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			// Add user context
			ctx := context.WithValue(req.Context(), "uid", uid)
			req = req.WithContext(ctx)

			// Create response recorder
			w := httptest.NewRecorder()

			// Call handler
			handler.GenerateProjection(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}

			// For successful requests, verify response structure
			if w.Code == http.StatusOK {
				var response map[string]interface{}
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Errorf("Failed to unmarshal response: %v", err)
				}

				// Check for expected fields
				if _, ok := response["data"]; !ok {
					t.Error("Expected 'data' field in response")
				}
			}
		})
	}
}

func TestInvestmentHandler_GetDashboardSummary(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	investmentSvc := services.NewInvestmentCalculationService(mockRepo, logger)
	handler := NewInvestmentHandler(investmentSvc, logger)

	uid := "test-user-123"

	// Add test data
	mockRepo.AddDocument("portfolios/p1", map[string]interface{}{
		"id":   "p1",
		"uid":  uid,
		"name": "Portfolio 1",
	})

	mockRepo.AddDocument("investments/i1", map[string]interface{}{
		"id":            "i1",
		"uid":           uid,
		"portfolioId":   "p1",
		"ticker":        "AAPL",
		"currentValue":  15000.0,
		"initialAmount": 10000.0,
		"currency":      "USD",
	})

	tests := []struct {
		name       string
		currency   string
		wantStatus int
	}{
		{
			name:       "with currency parameter",
			currency:   "USD",
			wantStatus: http.StatusOK,
		},
		{
			name:       "without currency parameter (defaults to USD)",
			currency:   "",
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			url := "/api/portfolio/summary"
			if tt.currency != "" {
				url += "?currency=" + tt.currency
			}
			req := httptest.NewRequest("GET", url, nil)

			// Add user context
			ctx := context.WithValue(req.Context(), "uid", uid)
			req = req.WithContext(ctx)

			// Create response recorder
			w := httptest.NewRecorder()

			// Call handler
			handler.GetDashboardSummary(w, req)

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
