package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"go.uber.org/zap"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/interfaces"
)

// InvestmentCalculationService handles investment calculation operations
type InvestmentCalculationService struct {
	repo   interfaces.Repository
	logger *zap.Logger
}

// NewInvestmentCalculationService creates a new investment calculation service
func NewInvestmentCalculationService(repo interfaces.Repository, logger *zap.Logger) *InvestmentCalculationService {
	return &InvestmentCalculationService{
		repo:   repo,
		logger: logger,
	}
}

// PortfolioMetrics represents calculated metrics for a portfolio
type PortfolioMetrics struct {
	TotalValue      float64            `json:"totalValue"`
	TotalInvested   float64            `json:"totalInvested"`
	TotalGain       float64            `json:"totalGain"`
	ROI             float64            `json:"roi"`
	InvestmentCount int                `json:"investmentCount"`
	Currency        string             `json:"currency"`
	ByInvestment    []InvestmentMetric `json:"byInvestment"`
}

// InvestmentMetric represents metrics for a single investment
type InvestmentMetric struct {
	ID            string  `json:"id"`
	Ticker        string  `json:"ticker,omitempty"`
	CurrentValue  float64 `json:"currentValue"`
	InitialAmount float64 `json:"initialAmount"`
	Gain          float64 `json:"gain"`
	ROI           float64 `json:"roi"`
	Currency      string  `json:"currency"`
}

// ProjectionPoint represents a point in a projection series
type ProjectionPoint struct {
	Month               int     `json:"month"`
	Year                int     `json:"year"`
	TotalValue          float64 `json:"totalValue"`
	PrincipalValue      float64 `json:"principalValue"`
	ContributionsValue  float64 `json:"contributionsValue"`
	GrowthValue         float64 `json:"growthValue"`
	TotalContributions  float64 `json:"totalContributions"`
	MonthlyContribution float64 `json:"monthlyContribution"`
}

// ProjectionRequest represents a request for projection calculation
type ProjectionRequest struct {
	InitialAmount float64        `json:"initialAmount"`
	AnnualReturn  float64        `json:"annualReturn"`
	Months        int            `json:"months"`
	Contributions []Contribution `json:"contributions"`
}

// Contribution represents a recurring contribution
type Contribution struct {
	Amount    float64 `json:"amount"`
	Frequency string  `json:"frequency"` // monthly, quarterly, yearly
}

// ProjectionResponse represents the projection calculation result
type ProjectionResponse struct {
	Points    []ProjectionPoint `json:"points"`
	FinalYear ProjectionPoint   `json:"finalYear"`
	Summary   struct {
		TotalValue          float64 `json:"totalValue"`
		TotalContributed    float64 `json:"totalContributed"`
		TotalGrowth         float64 `json:"totalGrowth"`
		EffectiveAnnualRate float64 `json:"effectiveAnnualRate"`
	} `json:"summary"`
}

// DashboardSummary represents aggregate summary across all portfolios
type DashboardSummary struct {
	TotalValue       float64                    `json:"totalValue"`
	TotalInvested    float64                    `json:"totalInvested"`
	TotalGain        float64                    `json:"totalGain"`
	OverallROI       float64                    `json:"overallROI"`
	PortfolioCount   int                        `json:"portfolioCount"`
	InvestmentCount  int                        `json:"investmentCount"`
	ByCurrency       map[string]CurrencySummary `json:"byCurrency"`
	TopPerformers    []InvestmentPerformance    `json:"topPerformers"`
	BottomPerformers []InvestmentPerformance    `json:"bottomPerformers"`
}

// CurrencySummary represents summary for a specific currency
type CurrencySummary struct {
	TotalValue    float64 `json:"totalValue"`
	TotalInvested float64 `json:"totalInvested"`
	TotalGain     float64 `json:"totalGain"`
	Count         int     `json:"count"`
}

// InvestmentPerformance represents performance data for sorting
type InvestmentPerformance struct {
	ID           string  `json:"id"`
	PortfolioID  string  `json:"portfolioId"`
	Ticker       string  `json:"ticker,omitempty"`
	CurrentValue float64 `json:"currentValue"`
	Gain         float64 `json:"gain"`
	ROI          float64 `json:"roi"`
	Currency     string  `json:"currency"`
}

// CalculatePortfolioMetrics calculates metrics for a specific portfolio
func (s *InvestmentCalculationService) CalculatePortfolioMetrics(
	ctx context.Context,
	uid string,
	portfolioID string,
) (*PortfolioMetrics, error) {
	// Fetch portfolio
	portfolioDoc, err := s.repo.Collection("portfolios").Doc(portfolioID).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("portfolio not found: %w", err)
	}

	portfolio := portfolioDoc.Data()
	if portfolio["uid"] != uid {
		return nil, fmt.Errorf("unauthorized: portfolio does not belong to user")
	}

	// Fetch all investments for this portfolio
	query := s.repo.Collection("investments").
		Where("uid", "==", uid).
		Where("portfolioId", "==", portfolioID)

	iter := query.Documents(ctx)
	defer iter.Stop()

	metrics := &PortfolioMetrics{
		Currency:     s.getStringFromMap(portfolio, "baseCurrency", "USD"),
		ByInvestment: []InvestmentMetric{},
	}

	// Calculate metrics for each investment
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching investment", zap.Error(err))
			continue
		}

		investment := doc.Data()
		invMetric := s.calculateInvestmentMetric(investment)
		metrics.ByInvestment = append(metrics.ByInvestment, invMetric)

		// Aggregate to portfolio level
		metrics.TotalValue += invMetric.CurrentValue
		metrics.TotalInvested += invMetric.InitialAmount
		metrics.InvestmentCount++
	}

	// Calculate derived metrics
	metrics.TotalGain = metrics.TotalValue - metrics.TotalInvested
	if metrics.TotalInvested > 0 {
		metrics.ROI = (metrics.TotalGain / metrics.TotalInvested) * 100
	}

	return metrics, nil
}

// calculateInvestmentMetric calculates metrics for a single investment
func (s *InvestmentCalculationService) calculateInvestmentMetric(investment map[string]interface{}) InvestmentMetric {
	metric := InvestmentMetric{
		ID:            s.getStringFromMap(investment, "id", ""),
		Ticker:        s.getStringFromMap(investment, "ticker", ""),
		CurrentValue:  s.getFloatFromMap(investment, "currentValue", 0),
		InitialAmount: s.getFloatFromMap(investment, "initialAmount", 0),
		Currency:      s.getStringFromMap(investment, "currency", "USD"),
	}

	// Calculate contributions if present
	if contribs, ok := investment["contributions"].([]interface{}); ok {
		for _, c := range contribs {
			if contrib, ok := c.(map[string]interface{}); ok {
				amount := s.getFloatFromMap(contrib, "amount", 0)
				contribType := s.getStringFromMap(contrib, "type", "")
				if contribType == "deposit" {
					metric.InitialAmount += amount
				} else if contribType == "withdrawal" {
					metric.InitialAmount -= amount
				}
			}
		}
	}

	// Calculate gain and ROI
	metric.Gain = metric.CurrentValue - metric.InitialAmount
	if metric.InitialAmount > 0 {
		metric.ROI = (metric.Gain / metric.InitialAmount) * 100
	}

	return metric
}

// GenerateProjection generates a compound interest projection
func (s *InvestmentCalculationService) GenerateProjection(
	ctx context.Context,
	req ProjectionRequest,
) (*ProjectionResponse, error) {
	// Validate inputs
	if req.Months <= 0 || req.Months > 360 {
		return nil, fmt.Errorf("months must be between 1 and 360")
	}
	if req.AnnualReturn < -100 || req.AnnualReturn > 100 {
		return nil, fmt.Errorf("annual return must be between -100 and 100")
	}

	response := &ProjectionResponse{
		Points: make([]ProjectionPoint, 0, req.Months+1),
	}

	// Calculate monthly rate
	monthlyRate := req.AnnualReturn / 100 / 12
	growthFactor := 1 + monthlyRate

	// Initial values
	principalValue := req.InitialAmount
	contributionsValue := 0.0
	totalContributions := 0.0

	// Add initial point (month 0)
	response.Points = append(response.Points, ProjectionPoint{
		Month:               0,
		Year:                0,
		TotalValue:          principalValue,
		PrincipalValue:      principalValue,
		ContributionsValue:  0,
		GrowthValue:         0,
		TotalContributions:  0,
		MonthlyContribution: 0,
	})

	// Calculate each month
	for monthIndex := 1; monthIndex <= req.Months; monthIndex++ {
		// Apply growth to existing values
		if monthlyRate != 0 {
			principalValue *= growthFactor
			contributionsValue *= growthFactor
		}

		// Calculate monthly contribution
		monthlyContribution := 0.0
		for _, contrib := range req.Contributions {
			multiplier := s.frequencyToMonthlyMultiplier(contrib.Frequency)
			monthlyContribution += contrib.Amount * multiplier
		}

		// Add contribution
		contributionsValue += monthlyContribution
		totalContributions += monthlyContribution

		// Calculate total and growth
		totalValue := principalValue + contributionsValue
		growthValue := totalValue - req.InitialAmount - totalContributions

		// Create projection point
		point := ProjectionPoint{
			Month:               monthIndex,
			Year:                monthIndex / 12,
			TotalValue:          totalValue,
			PrincipalValue:      principalValue,
			ContributionsValue:  contributionsValue,
			GrowthValue:         growthValue,
			TotalContributions:  totalContributions,
			MonthlyContribution: monthlyContribution,
		}

		response.Points = append(response.Points, point)
	}

	// Set final year point
	response.FinalYear = response.Points[len(response.Points)-1]

	// Calculate summary
	response.Summary.TotalValue = response.FinalYear.TotalValue
	response.Summary.TotalContributed = req.InitialAmount + totalContributions
	response.Summary.TotalGrowth = response.FinalYear.GrowthValue

	// Calculate effective annual rate
	if req.Months >= 12 && req.InitialAmount > 0 {
		years := float64(req.Months) / 12
		response.Summary.EffectiveAnnualRate = (math.Pow(response.FinalYear.TotalValue/req.InitialAmount, 1/years) - 1) * 100
	}

	return response, nil
}

// frequencyToMonthlyMultiplier converts contribution frequency to monthly multiplier
func (s *InvestmentCalculationService) frequencyToMonthlyMultiplier(frequency string) float64 {
	switch frequency {
	case "monthly":
		return 1.0
	case "quarterly":
		return 1.0 / 3.0
	case "yearly", "annual":
		return 1.0 / 12.0
	case "biweekly":
		return 26.0 / 12.0
	case "weekly":
		return 52.0 / 12.0
	default:
		return 0.0
	}
}

// CalculateDashboardSummary calculates aggregate summary across all portfolios
func (s *InvestmentCalculationService) CalculateDashboardSummary(
	ctx context.Context,
	uid string,
	baseCurrency string,
) (*DashboardSummary, error) {
	summary := &DashboardSummary{
		ByCurrency:       make(map[string]CurrencySummary),
		TopPerformers:    []InvestmentPerformance{},
		BottomPerformers: []InvestmentPerformance{},
	}

	// Fetch all portfolios
	portfoliosQuery := s.repo.Collection("portfolios").Where("uid", "==", uid)
	portfoliosIter := portfoliosQuery.Documents(ctx)
	defer portfoliosIter.Stop()

	portfolioIDs := []string{}
	for {
		doc, err := portfoliosIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching portfolio", zap.Error(err))
			continue
		}

		portfolioIDs = append(portfolioIDs, doc.Data()["id"].(string))
		summary.PortfolioCount++
	}

	// Fetch all investments across all portfolios
	investmentsQuery := s.repo.Collection("investments").Where("uid", "==", uid)
	investmentsIter := investmentsQuery.Documents(ctx)
	defer investmentsIter.Stop()

	allPerformances := []InvestmentPerformance{}

	for {
		doc, err := investmentsIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching investment", zap.Error(err))
			continue
		}

		investment := doc.Data()
		metric := s.calculateInvestmentMetric(investment)

		// Aggregate totals
		summary.TotalValue += metric.CurrentValue
		summary.TotalInvested += metric.InitialAmount
		summary.InvestmentCount++

		// Aggregate by currency
		currency := metric.Currency
		currSummary := summary.ByCurrency[currency]
		currSummary.TotalValue += metric.CurrentValue
		currSummary.TotalInvested += metric.InitialAmount
		currSummary.TotalGain += metric.Gain
		currSummary.Count++
		summary.ByCurrency[currency] = currSummary

		// Track performance for sorting
		allPerformances = append(allPerformances, InvestmentPerformance{
			ID:           metric.ID,
			PortfolioID:  s.getStringFromMap(investment, "portfolioId", ""),
			Ticker:       metric.Ticker,
			CurrentValue: metric.CurrentValue,
			Gain:         metric.Gain,
			ROI:          metric.ROI,
			Currency:     metric.Currency,
		})
	}

	// Calculate overall metrics
	summary.TotalGain = summary.TotalValue - summary.TotalInvested
	if summary.TotalInvested > 0 {
		summary.OverallROI = (summary.TotalGain / summary.TotalInvested) * 100
	}

	// Sort performances and get top/bottom 5
	s.sortPerformancesByROI(allPerformances)

	// Top performers
	topCount := 5
	if len(allPerformances) < topCount {
		topCount = len(allPerformances)
	}
	summary.TopPerformers = allPerformances[:topCount]

	// Bottom performers (reverse order)
	bottomCount := 5
	if len(allPerformances) < bottomCount {
		bottomCount = len(allPerformances)
	}
	startIdx := len(allPerformances) - bottomCount
	if startIdx < 0 {
		startIdx = 0
	}
	summary.BottomPerformers = allPerformances[startIdx:]

	return summary, nil
}

// sortPerformancesByROI sorts performances by ROI descending
func (s *InvestmentCalculationService) sortPerformancesByROI(performances []InvestmentPerformance) {
	// Simple bubble sort (good enough for small lists)
	n := len(performances)
	for i := 0; i < n-1; i++ {
		for j := 0; j < n-i-1; j++ {
			if performances[j].ROI < performances[j+1].ROI {
				performances[j], performances[j+1] = performances[j+1], performances[j]
			}
		}
	}
}

// GetPortfolioSnapshots retrieves historical snapshots for a portfolio
func (s *InvestmentCalculationService) GetPortfolioSnapshots(
	ctx context.Context,
	uid string,
	portfolioID string,
	startDate *time.Time,
	endDate *time.Time,
) ([]map[string]interface{}, error) {
	query := s.repo.Collection("portfolioSnapshots").
		Where("uid", "==", uid).
		Where("portfolioId", "==", portfolioID).
		OrderBy("date", "asc")

	if startDate != nil {
		query = query.Where("date", ">=", startDate.Format("2006-01-02"))
	}
	if endDate != nil {
		query = query.Where("date", "<=", endDate.Format("2006-01-02"))
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	snapshots := []map[string]interface{}{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching snapshot", zap.Error(err))
			continue
		}

		snapshots = append(snapshots, doc.Data())
	}

	return snapshots, nil
}

// Helper methods to extract values from map[string]interface{}
func (s *InvestmentCalculationService) getStringFromMap(m map[string]interface{}, key string, defaultVal string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultVal
}

func (s *InvestmentCalculationService) getFloatFromMap(m map[string]interface{}, key string, defaultVal float64) float64 {
	if val, ok := m[key]; ok {
		switch v := val.(type) {
		case float64:
			return v
		case int64:
			return float64(v)
		case int:
			return float64(v)
		}
	}
	return defaultVal
}
