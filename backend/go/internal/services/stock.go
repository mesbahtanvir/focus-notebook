package services

import (
	"context"
	"fmt"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/repository"
	"go.uber.org/zap"
)

// StockService handles stock-related operations
type StockService struct {
	repo              repository.Repository
	alphaVantageClient *clients.AlphaVantageClient
	logger            *zap.Logger
}

// NewStockService creates a new stock service
func NewStockService(
	repo repository.Repository,
	alphaVantageClient *clients.AlphaVantageClient,
	logger *zap.Logger,
) *StockService {
	return &StockService{
		repo:              repo,
		alphaVantageClient: alphaVantageClient,
		logger:            logger,
	}
}

// GetStockPrice fetches the current stock price
// First checks Firestore cache (marketData/latestPrices), then falls back to Alpha Vantage
func (s *StockService) GetStockPrice(ctx context.Context, userID, ticker string) (*clients.StockQuote, error) {
	s.logger.Info("Fetching stock price",
		zap.String("uid", userID),
		zap.String("ticker", ticker),
	)

	// Try to get from Firestore cache first
	cachedQuote, err := s.getQuoteFromCache(ctx, ticker)
	if err != nil {
		s.logger.Warn("Failed to get quote from cache, falling back to API",
			zap.String("ticker", ticker),
			zap.Error(err),
		)
	} else if cachedQuote != nil {
		s.logger.Info("Returning cached quote",
			zap.String("ticker", ticker),
			zap.Float64("price", cachedQuote.Price),
		)
		return cachedQuote, nil
	}

	// Fall back to Alpha Vantage API
	if s.alphaVantageClient == nil {
		return nil, fmt.Errorf("Alpha Vantage client not configured")
	}

	quote, err := s.alphaVantageClient.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch quote from Alpha Vantage: %w", err)
	}

	return quote, nil
}

// GetStockHistory fetches historical stock data
func (s *StockService) GetStockHistory(ctx context.Context, userID, ticker string, days int) (*clients.StockHistory, error) {
	s.logger.Info("Fetching stock history",
		zap.String("uid", userID),
		zap.String("ticker", ticker),
		zap.Int("days", days),
	)

	if s.alphaVantageClient == nil {
		return nil, fmt.Errorf("Alpha Vantage client not configured")
	}

	// Fetch from Alpha Vantage
	history, err := s.alphaVantageClient.GetHistoricalData(ctx, ticker, days)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch historical data: %w", err)
	}

	return history, nil
}

// getQuoteFromCache retrieves a cached quote from Firestore
func (s *StockService) getQuoteFromCache(ctx context.Context, ticker string) (*clients.StockQuote, error) {
	// Get the latest prices document
	path := "marketData/latestPrices"
	data, err := s.repo.Get(ctx, path)
	if err != nil {
		return nil, err
	}

	if data == nil {
		return nil, nil
	}

	// Extract tickers map
	tickersData, ok := data["tickers"].(map[string]interface{})
	if !ok {
		return nil, nil
	}

	// Get the specific ticker data
	tickerData, ok := tickersData[ticker].(map[string]interface{})
	if !ok {
		return nil, nil
	}

	// Parse the quote
	quote, err := s.parseTickerData(ticker, tickerData, data)
	if err != nil {
		return nil, err
	}

	return quote, nil
}

// parseTickerData parses ticker data from Firestore
func (s *StockService) parseTickerData(ticker string, tickerData, parentData map[string]interface{}) (*clients.StockQuote, error) {
	// Extract price (required)
	price, ok := tickerData["price"].(float64)
	if !ok {
		priceInt, ok := tickerData["price"].(int64)
		if !ok {
			return nil, fmt.Errorf("invalid or missing price for ticker %s", ticker)
		}
		price = float64(priceInt)
	}

	// Extract change (optional)
	change, _ := tickerData["change"].(float64)
	if change == 0 {
		changeInt, _ := tickerData["change"].(int64)
		change = float64(changeInt)
	}

	// Extract changePercent (optional)
	changePercent, _ := tickerData["changePercent"].(float64)
	if changePercent == 0 {
		changePercentInt, _ := tickerData["changePercent"].(int64)
		changePercent = float64(changePercentInt)
	}

	// Extract timestamp
	timestamp, ok := tickerData["timestamp"].(string)
	if !ok {
		fetchedAt, ok := tickerData["fetchedAt"].(string)
		if !ok {
			refreshedAt, ok := parentData["refreshedAt"].(string)
			if ok {
				timestamp = refreshedAt
			}
		} else {
			timestamp = fetchedAt
		}
	}

	// Extract source
	source, ok := tickerData["source"].(string)
	if !ok {
		source, ok = parentData["source"].(string)
		if !ok {
			source = "Cached Market Data"
		}
	}

	return &clients.StockQuote{
		Symbol:        ticker,
		Price:         price,
		Change:        change,
		ChangePercent: changePercent,
		Timestamp:     timestamp,
		Source:        source,
	}, nil
}
