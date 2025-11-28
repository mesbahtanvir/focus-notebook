package services

import (
	"context"
	"math"
	"testing"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/repository/mocks"
)

func TestInvestmentCalculationService_GenerateProjection(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewInvestmentCalculationService(mockRepo, logger)

	ctx := context.Background()

	tests := []struct {
		name    string
		req     ProjectionRequest
		wantErr bool
		checks  func(t *testing.T, resp *ProjectionResponse)
	}{
		{
			name: "simple projection without contributions",
			req: ProjectionRequest{
				InitialAmount: 10000,
				AnnualReturn:  7.0,
				Months:        12,
				Contributions: []Contribution{},
			},
			wantErr: false,
			checks: func(t *testing.T, resp *ProjectionResponse) {
				if len(resp.Points) != 13 { // 0 to 12 months
					t.Errorf("Expected 13 points, got %d", len(resp.Points))
				}

				// Check initial point
				if resp.Points[0].TotalValue != 10000 {
					t.Errorf("Expected initial value 10000, got %f", resp.Points[0].TotalValue)
				}

				// Final value should be greater than initial (positive return)
				if resp.FinalYear.TotalValue <= 10000 {
					t.Errorf("Expected final value > 10000, got %f", resp.FinalYear.TotalValue)
				}

				// Growth should be positive
				if resp.Summary.TotalGrowth <= 0 {
					t.Errorf("Expected positive growth, got %f", resp.Summary.TotalGrowth)
				}
			},
		},
		{
			name: "projection with monthly contributions",
			req: ProjectionRequest{
				InitialAmount: 10000,
				AnnualReturn:  7.0,
				Months:        12,
				Contributions: []Contribution{
					{Amount: 500, Frequency: "monthly"},
				},
			},
			wantErr: false,
			checks: func(t *testing.T, resp *ProjectionResponse) {
				// Total contributed should be initial + (500 * 12)
				expectedContributed := 10000.0 + 500*12
				if math.Abs(resp.Summary.TotalContributed-expectedContributed) > 0.01 {
					t.Errorf("Expected total contributed %f, got %f", expectedContributed, resp.Summary.TotalContributed)
				}

				// Final value should be significantly higher with contributions
				if resp.FinalYear.TotalValue <= 16000 {
					t.Errorf("Expected final value > 16000 with contributions, got %f", resp.FinalYear.TotalValue)
				}
			},
		},
		{
			name: "invalid months",
			req: ProjectionRequest{
				InitialAmount: 10000,
				AnnualReturn:  7.0,
				Months:        400, // > 360 max
				Contributions: []Contribution{},
			},
			wantErr: true,
		},
		{
			name: "invalid return rate",
			req: ProjectionRequest{
				InitialAmount: 10000,
				AnnualReturn:  150.0, // > 100 max
				Months:        12,
				Contributions: []Contribution{},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := service.GenerateProjection(ctx, tt.req)

			if (err != nil) != tt.wantErr {
				t.Errorf("GenerateProjection() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if err == nil && tt.checks != nil {
				tt.checks(t, resp)
			}
		})
	}
}

func TestInvestmentCalculationService_FrequencyToMonthlyMultiplier(t *testing.T) {
	service := &InvestmentCalculationService{}

	tests := []struct {
		frequency string
		want      float64
	}{
		{"monthly", 1.0},
		{"quarterly", 1.0 / 3.0},
		{"yearly", 1.0 / 12.0},
		{"annual", 1.0 / 12.0},
		{"biweekly", 26.0 / 12.0},
		{"weekly", 52.0 / 12.0},
		{"unknown", 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.frequency, func(t *testing.T) {
			got := service.frequencyToMonthlyMultiplier(tt.frequency)
			if math.Abs(got-tt.want) > 0.001 {
				t.Errorf("frequencyToMonthlyMultiplier(%s) = %f, want %f", tt.frequency, got, tt.want)
			}
		})
	}
}

func TestInvestmentCalculationService_CalculatePortfolioMetrics(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewInvestmentCalculationService(mockRepo, logger)

	uid := "test-user-123"
	portfolioID := "portfolio-1"
	ctx := context.Background()

	// Add test portfolio
	mockRepo.AddDocument("portfolios", portfolioID, map[string]interface{}{
		"id":           portfolioID,
		"uid":          uid,
		"name":         "Test Portfolio",
		"baseCurrency": "USD",
	})

	// Add test investments
	mockRepo.AddDocument("investments", "inv1", map[string]interface{}{
		"id":            "inv1",
		"uid":           uid,
		"portfolioId":   portfolioID,
		"ticker":        "AAPL",
		"currentValue":  15000.0,
		"initialAmount": 10000.0,
		"currency":      "USD",
	})

	mockRepo.AddDocument("investments", "inv2", map[string]interface{}{
		"id":            "inv2",
		"uid":           uid,
		"portfolioId":   portfolioID,
		"ticker":        "GOOGL",
		"currentValue":  8000.0,
		"initialAmount": 10000.0,
		"currency":      "USD",
	})

	metrics, err := service.CalculatePortfolioMetrics(ctx, uid, portfolioID)

	if err != nil {
		t.Fatalf("CalculatePortfolioMetrics() error = %v", err)
	}

	// Verify totals
	expectedTotalValue := 23000.0
	if math.Abs(metrics.TotalValue-expectedTotalValue) > 0.01 {
		t.Errorf("Expected total value %f, got %f", expectedTotalValue, metrics.TotalValue)
	}

	expectedTotalInvested := 20000.0
	if math.Abs(metrics.TotalInvested-expectedTotalInvested) > 0.01 {
		t.Errorf("Expected total invested %f, got %f", expectedTotalInvested, metrics.TotalInvested)
	}

	expectedGain := 3000.0
	if math.Abs(metrics.TotalGain-expectedGain) > 0.01 {
		t.Errorf("Expected total gain %f, got %f", expectedGain, metrics.TotalGain)
	}

	expectedROI := 15.0 // 3000/20000 * 100
	if math.Abs(metrics.ROI-expectedROI) > 0.01 {
		t.Errorf("Expected ROI %f%%, got %f%%", expectedROI, metrics.ROI)
	}

	// Verify investment count
	if metrics.InvestmentCount != 2 {
		t.Errorf("Expected 2 investments, got %d", metrics.InvestmentCount)
	}

	// Verify by-investment metrics
	if len(metrics.ByInvestment) != 2 {
		t.Errorf("Expected 2 investment metrics, got %d", len(metrics.ByInvestment))
	}
}

func TestInvestmentCalculationService_CalculateDashboardSummary(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewInvestmentCalculationService(mockRepo, logger)

	uid := "test-user-123"
	ctx := context.Background()

	// Add test portfolios
	mockRepo.AddDocument("portfolios", "p1", map[string]interface{}{
		"id":   "p1",
		"uid":  uid,
		"name": "Portfolio 1",
	})

	mockRepo.AddDocument("portfolios", "p2", map[string]interface{}{
		"id":   "p2",
		"uid":  uid,
		"name": "Portfolio 2",
	})

	// Add test investments
	mockRepo.AddDocument("investments", "i1", map[string]interface{}{
		"id":            "i1",
		"uid":           uid,
		"portfolioId":   "p1",
		"ticker":        "AAPL",
		"currentValue":  15000.0,
		"initialAmount": 10000.0,
		"currency":      "USD",
	})

	mockRepo.AddDocument("investments", "i2", map[string]interface{}{
		"id":            "i2",
		"uid":           uid,
		"portfolioId":   "p1",
		"ticker":        "GOOGL",
		"currentValue":  8000.0,
		"initialAmount": 10000.0,
		"currency":      "USD",
	})

	mockRepo.AddDocument("investments", "i3", map[string]interface{}{
		"id":            "i3",
		"uid":           uid,
		"portfolioId":   "p2",
		"ticker":        "MSFT",
		"currentValue":  25000.0,
		"initialAmount": 20000.0,
		"currency":      "USD",
	})

	summary, err := service.CalculateDashboardSummary(ctx, uid, "USD")

	if err != nil {
		t.Fatalf("CalculateDashboardSummary() error = %v", err)
	}

	// Verify portfolio count
	if summary.PortfolioCount != 2 {
		t.Errorf("Expected 2 portfolios, got %d", summary.PortfolioCount)
	}

	// Verify investment count
	if summary.InvestmentCount != 3 {
		t.Errorf("Expected 3 investments, got %d", summary.InvestmentCount)
	}

	// Verify total value
	expectedTotalValue := 48000.0
	if math.Abs(summary.TotalValue-expectedTotalValue) > 0.01 {
		t.Errorf("Expected total value %f, got %f", expectedTotalValue, summary.TotalValue)
	}

	// Verify total invested
	expectedTotalInvested := 40000.0
	if math.Abs(summary.TotalInvested-expectedTotalInvested) > 0.01 {
		t.Errorf("Expected total invested %f, got %f", expectedTotalInvested, summary.TotalInvested)
	}

	// Verify overall ROI
	expectedROI := 20.0 // 8000/40000 * 100
	if math.Abs(summary.OverallROI-expectedROI) > 0.01 {
		t.Errorf("Expected overall ROI %f%%, got %f%%", expectedROI, summary.OverallROI)
	}

	// Verify top performers
	if len(summary.TopPerformers) == 0 {
		t.Error("Expected some top performers")
	}
}
