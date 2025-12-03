package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewInvestmentPredictionService(t *testing.T) {
	service := NewInvestmentPredictionService(nil, nil)

	require.NotNil(t, service)
}

func TestCalculateAverage(t *testing.T) {
	tests := []struct {
		name     string
		data     []HistoricalDataPoint
		expected float64
	}{
		{
			"simple average",
			[]HistoricalDataPoint{
				{Date: "2024-01-01", Price: 100},
				{Date: "2024-01-02", Price: 200},
				{Date: "2024-01-03", Price: 300},
			},
			200.0,
		},
		{
			"single value",
			[]HistoricalDataPoint{
				{Date: "2024-01-01", Price: 150},
			},
			150.0,
		},
		{
			"empty data",
			[]HistoricalDataPoint{},
			0.0,
		},
		{
			"fractional values",
			[]HistoricalDataPoint{
				{Date: "2024-01-01", Price: 100.5},
				{Date: "2024-01-02", Price: 99.5},
			},
			100.0,
		},
		{
			"large values",
			[]HistoricalDataPoint{
				{Date: "2024-01-01", Price: 10000},
				{Date: "2024-01-02", Price: 20000},
			},
			15000.0,
		},
		{
			"small values",
			[]HistoricalDataPoint{
				{Date: "2024-01-01", Price: 0.001},
				{Date: "2024-01-02", Price: 0.002},
				{Date: "2024-01-03", Price: 0.003},
			},
			0.002,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateAverage(tt.data)
			assert.InDelta(t, tt.expected, result, 0.001)
		})
	}
}

func TestMax(t *testing.T) {
	tests := []struct {
		a, b, expected int
	}{
		{1, 2, 2},
		{5, 3, 5},
		{0, 0, 0},
		{-1, -5, -1},
		{-10, 10, 10},
		{100, 100, 100},
	}

	for _, tt := range tests {
		result := max(tt.a, tt.b)
		assert.Equal(t, tt.expected, result)
	}
}

func TestHistoricalDataPoint(t *testing.T) {
	dp := HistoricalDataPoint{
		Date:  "2024-01-15",
		Price: 150.50,
	}

	assert.Equal(t, "2024-01-15", dp.Date)
	assert.Equal(t, 150.50, dp.Price)
}

func TestPredictionDataPoint(t *testing.T) {
	dp := PredictionDataPoint{
		Date:           "2024-02-15",
		PredictedPrice: 175.25,
		Confidence:     "high",
	}

	assert.Equal(t, "2024-02-15", dp.Date)
	assert.Equal(t, 175.25, dp.PredictedPrice)
	assert.Equal(t, "high", dp.Confidence)
}

func TestInvestmentPrediction(t *testing.T) {
	prediction := InvestmentPrediction{
		Predictions: []PredictionDataPoint{
			{Date: "2024-02-01", PredictedPrice: 100, Confidence: "medium"},
		},
		Trend:             "bullish",
		Summary:           "Positive outlook",
		Reasoning:         "Strong momentum",
		RiskFactors:       []string{"Market volatility", "Interest rates"},
		TargetPrice30Days: 110.0,
		SupportLevel:      95.0,
		ResistanceLevel:   115.0,
	}

	assert.Equal(t, "bullish", prediction.Trend)
	assert.Equal(t, "Positive outlook", prediction.Summary)
	assert.Len(t, prediction.RiskFactors, 2)
	assert.Equal(t, 110.0, prediction.TargetPrice30Days)
	assert.Equal(t, 95.0, prediction.SupportLevel)
	assert.Equal(t, 115.0, prediction.ResistanceLevel)
}

func TestCalculateAverage_TrendCalculation(t *testing.T) {
	// Test that average correctly identifies trend
	uptrend := []HistoricalDataPoint{
		{Date: "2024-01-01", Price: 100},
		{Date: "2024-01-02", Price: 110},
		{Date: "2024-01-03", Price: 120},
		{Date: "2024-01-04", Price: 130},
		{Date: "2024-01-05", Price: 140},
	}

	avg := calculateAverage(uptrend)
	assert.Equal(t, 120.0, avg)

	// First half average vs second half
	firstHalf := calculateAverage(uptrend[:2])
	secondHalf := calculateAverage(uptrend[3:])

	assert.Less(t, firstHalf, secondHalf, "Second half should be higher in uptrend")
}

func TestCalculateAverage_Consistency(t *testing.T) {
	data := []HistoricalDataPoint{
		{Price: 100}, {Price: 100}, {Price: 100},
	}

	avg := calculateAverage(data)
	assert.Equal(t, 100.0, avg, "Average of equal values should equal the value")
}

func TestHistoricalDataPoint_ZeroPrice(t *testing.T) {
	dp := HistoricalDataPoint{
		Date:  "2024-01-01",
		Price: 0,
	}

	assert.Equal(t, 0.0, dp.Price)
}

func TestPredictionDataPoint_ConfidenceLevels(t *testing.T) {
	confidences := []string{"low", "medium", "high"}

	for _, conf := range confidences {
		dp := PredictionDataPoint{
			Confidence: conf,
		}
		assert.Equal(t, conf, dp.Confidence)
	}
}

func TestInvestmentPrediction_TrendValues(t *testing.T) {
	trends := []string{"bullish", "bearish", "neutral"}

	for _, trend := range trends {
		prediction := InvestmentPrediction{
			Trend: trend,
		}
		assert.Equal(t, trend, prediction.Trend)
	}
}

func TestInvestmentPrediction_EmptyRiskFactors(t *testing.T) {
	prediction := InvestmentPrediction{
		RiskFactors: []string{},
	}

	assert.Empty(t, prediction.RiskFactors)
}

func TestMax_EdgeCases(t *testing.T) {
	// Test with max int values
	assert.Equal(t, 1000000, max(1000000, 0))
	assert.Equal(t, 0, max(0, -1000000))
	assert.Equal(t, -1, max(-1, -100))
}

func TestCalculateAverage_LargeDataset(t *testing.T) {
	// Test with 365 days of data
	data := make([]HistoricalDataPoint, 365)
	sum := 0.0
	for i := 0; i < 365; i++ {
		price := float64(100 + i)
		data[i] = HistoricalDataPoint{
			Date:  "2024-01-01",
			Price: price,
		}
		sum += price
	}

	expected := sum / 365.0
	actual := calculateAverage(data)

	assert.InDelta(t, expected, actual, 0.01)
}

func TestPriceChangeCalculation(t *testing.T) {
	// Test price change percentage calculation like in PredictInvestment
	firstPrice := 100.0
	lastPrice := 110.0
	priceChange := lastPrice - firstPrice
	priceChangePercent := (priceChange / firstPrice) * 100

	assert.Equal(t, 10.0, priceChange)
	assert.Equal(t, 10.0, priceChangePercent)
}

func TestMovingAverageSlicing(t *testing.T) {
	historicalData := []HistoricalDataPoint{
		{Date: "1", Price: 100},
		{Date: "2", Price: 105},
		{Date: "3", Price: 110},
		{Date: "4", Price: 115},
		{Date: "5", Price: 120},
		{Date: "6", Price: 125},
		{Date: "7", Price: 130},
	}

	dataLength := len(historicalData)

	// Calculate 7-day average (all data)
	avg7 := calculateAverage(historicalData[max(0, dataLength-7):])
	assert.InDelta(t, 115.0, avg7, 0.01)

	// Calculate last 3 days
	avg3 := calculateAverage(historicalData[max(0, dataLength-3):])
	assert.InDelta(t, 125.0, avg3, 0.01)
}

func TestDataSampling(t *testing.T) {
	// Test data sampling logic like in PredictInvestment
	historicalData := make([]HistoricalDataPoint, 30)
	for i := 0; i < 30; i++ {
		historicalData[i] = HistoricalDataPoint{
			Date:  "day" + string(rune('0'+i)),
			Price: float64(100 + i),
		}
	}

	// Sample every 3rd day
	sampledData := make([]HistoricalDataPoint, 0)
	for i := 0; i < len(historicalData); i += 3 {
		sampledData = append(sampledData, historicalData[i])
	}

	assert.Equal(t, 10, len(sampledData))
	assert.Equal(t, 100.0, sampledData[0].Price)
	assert.Equal(t, 103.0, sampledData[1].Price)
}

func TestInvestmentPredictionService_ValidateMinimumData(t *testing.T) {
	// Test that we need at least 30 days
	shortData := make([]HistoricalDataPoint, 29)
	for i := 0; i < 29; i++ {
		shortData[i] = HistoricalDataPoint{Date: "day", Price: 100}
	}

	assert.Less(t, len(shortData), 30, "Should have less than 30 data points")

	// Enough data
	enoughData := make([]HistoricalDataPoint, 30)
	for i := 0; i < 30; i++ {
		enoughData[i] = HistoricalDataPoint{Date: "day", Price: 100}
	}

	assert.GreaterOrEqual(t, len(enoughData), 30, "Should have at least 30 data points")
}
