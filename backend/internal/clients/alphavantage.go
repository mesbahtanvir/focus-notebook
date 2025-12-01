package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
)

const (
	AlphaVantageBaseURL = "https://www.alphavantage.co/query"
	AlphaVantageSource  = "Alpha Vantage"
)

// AlphaVantageClient handles interactions with Alpha Vantage API
type AlphaVantageClient struct {
	apiKey string
	client *http.Client
	logger *zap.Logger
}

// StockQuote represents a real-time stock quote
type StockQuote struct {
	Symbol        string  `json:"symbol"`
	Price         float64 `json:"price"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"changePercent"`
	Timestamp     string  `json:"timestamp"`
	Source        string  `json:"source"`
}

// HistoricalDataPoint represents a single data point in historical data
type HistoricalDataPoint struct {
	Date   string  `json:"date"`
	Price  float64 `json:"price"`
	Volume int64   `json:"volume,omitempty"`
}

// StockHistory represents historical stock data
type StockHistory struct {
	Symbol string                `json:"symbol"`
	Data   []HistoricalDataPoint `json:"data"`
	Source string                `json:"source"`
}

// AlphaVantageGlobalQuoteResponse is the API response structure
type AlphaVantageGlobalQuoteResponse struct {
	GlobalQuote GlobalQuoteData `json:"Global Quote"`
	Note        string          `json:"Note,omitempty"`
	ErrorMsg    string          `json:"Error Message,omitempty"`
}

// GlobalQuoteData contains the actual quote data
type GlobalQuoteData struct {
	Symbol           string `json:"01. symbol"`
	Price            string `json:"05. price"`
	Change           string `json:"09. change"`
	ChangePercent    string `json:"10. change percent"`
	LatestTradingDay string `json:"07. latest trading day"`
}

// AlphaVantageTimeSeriesResponse is the response for historical data
type AlphaVantageTimeSeriesResponse struct {
	MetaData   TimeSeriesMetaData       `json:"Meta Data"`
	TimeSeries map[string]TimeSeriesDay `json:"Time Series (Daily)"`
	Note       string                   `json:"Note,omitempty"`
	ErrorMsg   string                   `json:"Error Message,omitempty"`
}

// TimeSeriesMetaData contains metadata about the time series
type TimeSeriesMetaData struct {
	Symbol string `json:"2. Symbol"`
}

// TimeSeriesDay represents a single day's data
type TimeSeriesDay struct {
	Open   string `json:"1. open"`
	High   string `json:"2. high"`
	Low    string `json:"3. low"`
	Close  string `json:"4. close"`
	Volume string `json:"5. volume"`
}

// NewAlphaVantageClient creates a new Alpha Vantage API client
func NewAlphaVantageClient(cfg *config.AlphaVantageConfig, logger *zap.Logger) *AlphaVantageClient {
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	return &AlphaVantageClient{
		apiKey: cfg.APIKey,
		client: &http.Client{
			Timeout: timeout,
		},
		logger: logger,
	}
}

// GetQuote fetches a real-time stock quote
func (c *AlphaVantageClient) GetQuote(ctx context.Context, symbol string) (*StockQuote, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))

	params := url.Values{}
	params.Set("function", "GLOBAL_QUOTE")
	params.Set("symbol", symbol)
	params.Set("apikey", c.apiKey)

	requestURL := fmt.Sprintf("%s?%s", AlphaVantageBaseURL, params.Encode())

	c.logger.Info("Requesting Alpha Vantage quote",
		zap.String("symbol", symbol),
		zap.String("endpoint", AlphaVantageBaseURL),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch quote: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result AlphaVantageGlobalQuoteResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Check for API errors
	if result.Note != "" {
		return nil, fmt.Errorf("Alpha Vantage rate limit exceeded")
	}
	if result.ErrorMsg != "" {
		return nil, fmt.Errorf("Alpha Vantage error: %s", result.ErrorMsg)
	}

	// Parse the quote data
	quote, err := c.parseGlobalQuote(symbol, result.GlobalQuote)
	if err != nil {
		return nil, err
	}

	c.logger.Info("Successfully fetched quote",
		zap.String("symbol", symbol),
		zap.Float64("price", quote.Price),
	)

	return quote, nil
}

// GetHistoricalData fetches historical stock data
func (c *AlphaVantageClient) GetHistoricalData(ctx context.Context, symbol string, days int) (*StockHistory, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))

	params := url.Values{}
	params.Set("function", "TIME_SERIES_DAILY")
	params.Set("symbol", symbol)
	params.Set("apikey", c.apiKey)

	// For more than 100 days, use full output
	if days > 100 {
		params.Set("outputsize", "full")
	} else {
		params.Set("outputsize", "compact")
	}

	requestURL := fmt.Sprintf("%s?%s", AlphaVantageBaseURL, params.Encode())

	c.logger.Info("Requesting Alpha Vantage historical data",
		zap.String("symbol", symbol),
		zap.Int("days", days),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch historical data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result AlphaVantageTimeSeriesResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Check for API errors
	if result.Note != "" {
		return nil, fmt.Errorf("Alpha Vantage rate limit exceeded")
	}
	if result.ErrorMsg != "" {
		return nil, fmt.Errorf("Alpha Vantage error: %s", result.ErrorMsg)
	}

	// Parse historical data
	history, err := c.parseTimeSeries(symbol, result.TimeSeries, days)
	if err != nil {
		return nil, err
	}

	c.logger.Info("Successfully fetched historical data",
		zap.String("symbol", symbol),
		zap.Int("dataPoints", len(history.Data)),
	)

	return history, nil
}

// parseGlobalQuote parses the Global Quote response
func (c *AlphaVantageClient) parseGlobalQuote(symbol string, data GlobalQuoteData) (*StockQuote, error) {
	if data.Symbol == "" {
		return nil, fmt.Errorf("no quote found for symbol: %s", symbol)
	}

	price, err := strconv.ParseFloat(data.Price, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid price: %w", err)
	}

	change, err := strconv.ParseFloat(data.Change, 64)
	if err != nil {
		c.logger.Warn("Invalid change value, using 0", zap.Error(err))
		change = 0
	}

	// Parse change percent, removing the % sign
	changePercentStr := strings.TrimSuffix(data.ChangePercent, "%")
	changePercent, err := strconv.ParseFloat(changePercentStr, 64)
	if err != nil {
		c.logger.Warn("Invalid change percent, using 0", zap.Error(err))
		changePercent = 0
	}

	// Parse timestamp
	var timestamp string
	if data.LatestTradingDay != "" {
		// Convert trading day to ISO format
		t, err := time.Parse("2006-01-02", data.LatestTradingDay)
		if err == nil {
			timestamp = t.UTC().Format(time.RFC3339)
		} else {
			timestamp = time.Now().UTC().Format(time.RFC3339)
		}
	} else {
		timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	return &StockQuote{
		Symbol:        symbol,
		Price:         price,
		Change:        change,
		ChangePercent: changePercent,
		Timestamp:     timestamp,
		Source:        AlphaVantageSource,
	}, nil
}

// parseTimeSeries parses the time series data
func (c *AlphaVantageClient) parseTimeSeries(symbol string, timeSeries map[string]TimeSeriesDay, days int) (*StockHistory, error) {
	if len(timeSeries) == 0 {
		return nil, fmt.Errorf("no historical data found for symbol: %s", symbol)
	}

	// Sort dates and take the most recent N days
	dates := make([]string, 0, len(timeSeries))
	for date := range timeSeries {
		dates = append(dates, date)
	}

	// Sort dates in descending order (most recent first)
	sortDatesDescending(dates)

	// Limit to requested number of days
	if len(dates) > days {
		dates = dates[:days]
	}

	// Reverse to get chronological order (oldest first)
	reverseDates(dates)

	// Build data points
	dataPoints := make([]HistoricalDataPoint, 0, len(dates))
	for _, date := range dates {
		day := timeSeries[date]

		closePrice, err := strconv.ParseFloat(day.Close, 64)
		if err != nil {
			c.logger.Warn("Invalid close price for date",
				zap.String("date", date),
				zap.Error(err),
			)
			continue
		}

		volume, err := strconv.ParseInt(day.Volume, 10, 64)
		if err != nil {
			c.logger.Warn("Invalid volume for date",
				zap.String("date", date),
				zap.Error(err),
			)
			volume = 0
		}

		dataPoints = append(dataPoints, HistoricalDataPoint{
			Date:   date,
			Price:  closePrice,
			Volume: volume,
		})
	}

	return &StockHistory{
		Symbol: symbol,
		Data:   dataPoints,
		Source: AlphaVantageSource,
	}, nil
}

// Helper functions for sorting dates

func sortDatesDescending(dates []string) {
	// Simple bubble sort in descending order
	n := len(dates)
	for i := 0; i < n-1; i++ {
		for j := 0; j < n-i-1; j++ {
			if dates[j] < dates[j+1] {
				dates[j], dates[j+1] = dates[j+1], dates[j]
			}
		}
	}
}

func reverseDates(dates []string) {
	for i, j := 0, len(dates)-1; i < j; i, j = i+1, j-1 {
		dates[i], dates[j] = dates[j], dates[i]
	}
}
