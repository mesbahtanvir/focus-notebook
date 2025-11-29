package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"go.uber.org/zap"
)

// InvestmentPredictionService handles AI-powered investment predictions
type InvestmentPredictionService struct {
	openaiClient *clients.OpenAIClient
	logger       *zap.Logger
}

// NewInvestmentPredictionService creates a new investment prediction service
func NewInvestmentPredictionService(
	openaiClient *clients.OpenAIClient,
	logger *zap.Logger,
) *InvestmentPredictionService {
	return &InvestmentPredictionService{
		openaiClient: openaiClient,
		logger:       logger,
	}
}

// HistoricalDataPoint represents a historical price data point
type HistoricalDataPoint struct {
	Date  string  `json:"date"`
	Price float64 `json:"price"`
}

// PredictionDataPoint represents a predicted price point
type PredictionDataPoint struct {
	Date           string  `json:"date"`
	PredictedPrice float64 `json:"predictedPrice"`
	Confidence     string  `json:"confidence"` // low, medium, high
}

// InvestmentPrediction represents the AI's investment prediction
type InvestmentPrediction struct {
	Predictions      []PredictionDataPoint `json:"predictions"`
	Trend            string                `json:"trend"` // bullish, bearish, neutral
	Summary          string                `json:"summary"`
	Reasoning        string                `json:"reasoning"`
	RiskFactors      []string              `json:"riskFactors"`
	TargetPrice30Days float64              `json:"targetPrice30Days"`
	SupportLevel     float64               `json:"supportLevel"`
	ResistanceLevel  float64               `json:"resistanceLevel"`
}

// PredictInvestment generates AI-powered investment predictions
func (s *InvestmentPredictionService) PredictInvestment(
	ctx context.Context,
	symbol string,
	historicalData []HistoricalDataPoint,
	model string,
) (*InvestmentPrediction, error) {
	// Validate input
	if len(historicalData) < 30 {
		return nil, fmt.Errorf("need at least 30 days of historical data for predictions")
	}

	s.logger.Info("Generating investment prediction",
		zap.String("symbol", symbol),
		zap.Int("dataPoints", len(historicalData)),
		zap.String("model", model),
	)

	// Calculate statistics
	dataLength := len(historicalData)
	firstPrice := historicalData[0].Price
	lastPrice := historicalData[dataLength-1].Price
	priceChange := lastPrice - firstPrice
	priceChangePercent := (priceChange / firstPrice) * 100

	// Calculate moving averages
	avg7 := calculateAverage(historicalData[max(0, dataLength-7):])
	avg30 := calculateAverage(historicalData[max(0, dataLength-30):])

	// Sample data to reduce token usage (every 3rd day)
	sampledData := make([]HistoricalDataPoint, 0, dataLength/3)
	for i := 0; i < dataLength; i += 3 {
		sampledData = append(sampledData, historicalData[i])
	}

	// Format price data for AI
	priceDataString := ""
	for _, d := range sampledData {
		priceDataString += fmt.Sprintf("%s: $%.2f\n", d.Date, d.Price)
	}

	// Build prompt
	prompt := fmt.Sprintf(`You are a financial analyst assistant. Analyze the following stock price data and provide a prediction.

Stock Symbol: %s
Data Period: %d days
Start Price: $%.2f
Current Price: $%.2f
Total Change: %.2f%%
7-Day Average: $%.2f
30-Day Average: $%.2f

Historical Prices (sampled):
%s

Based on this data, provide a 30-day forward prediction. Consider:
1. Recent price trends and momentum
2. Moving average crossovers
3. Price volatility
4. Historical patterns

IMPORTANT DISCLAIMERS:
- This is NOT financial advice
- Past performance does not guarantee future results
- Stock markets are unpredictable
- Use for informational purposes only

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "predictions": [
    {
      "date": "YYYY-MM-DD",
      "predictedPrice": 123.45,
      "confidence": "low|medium|high"
    }
  ],
  "trend": "bullish|bearish|neutral",
  "summary": "Brief analysis summary",
  "reasoning": "Key factors influencing the prediction",
  "riskFactors": ["List of risk factors to consider"],
  "targetPrice30Days": 123.45,
  "supportLevel": 120.00,
  "resistanceLevel": 130.00
}

Generate predictions for the next 30 days (every 3 days for efficiency).`,
		symbol,
		dataLength,
		firstPrice,
		lastPrice,
		priceChangePercent,
		avg7,
		avg30,
		priceDataString,
	)

	// Default to gpt-4o-mini if no model specified
	if model == "" {
		model = "gpt-4o-mini"
	}

	// Call OpenAI
	response, err := s.openaiClient.ChatCompletion(ctx, clients.ChatCompletionRequest{
		Model: model,
		Messages: []clients.ChatMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0.3, // Lower temperature for more consistent predictions
		MaxTokens:   2000,
		ResponseFormat: &clients.ResponseFormat{
			Type: "json_object",
		},
	})

	if err != nil {
		return nil, fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	// Parse JSON response
	var prediction InvestmentPrediction
	if err := json.Unmarshal([]byte(response.Choices[0].Message.Content), &prediction); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return &prediction, nil
}

// calculateAverage calculates the average price from historical data
func calculateAverage(data []HistoricalDataPoint) float64 {
	if len(data) == 0 {
		return 0
	}

	sum := 0.0
	for _, d := range data {
		sum += d.Price
	}
	return sum / float64(len(data))
}

// max returns the maximum of two integers
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
