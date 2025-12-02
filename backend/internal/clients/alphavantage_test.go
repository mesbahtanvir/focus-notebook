package clients

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
)

func TestNewAlphaVantageClient_ValidConfig(t *testing.T) {
	cfg := &config.AlphaVantageConfig{
		APIKey:  "test_api_key",
		Timeout: 30 * time.Second,
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client := NewAlphaVantageClient(cfg, logger)

	assert.NotNil(t, client)
	assert.Equal(t, "test_api_key", client.apiKey)
	assert.NotNil(t, client.client)
}

func TestNewAlphaVantageClient_EmptyAPIKey(t *testing.T) {
	cfg := &config.AlphaVantageConfig{
		APIKey:  "",
		Timeout: 30 * time.Second,
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client := NewAlphaVantageClient(cfg, logger)

	assert.NotNil(t, client)
	assert.Empty(t, client.apiKey)
}

func TestNewAlphaVantageClient_HTTPClientInitialized(t *testing.T) {
	cfg := &config.AlphaVantageConfig{
		APIKey:  "test_key",
		Timeout: 15 * time.Second,
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client := NewAlphaVantageClient(cfg, logger)

	assert.NotNil(t, client.client)
	assert.Equal(t, 15*time.Second, client.client.Timeout)
}

func TestStockQuote_Fields(t *testing.T) {
	quote := &StockQuote{
		Symbol:        "AAPL",
		Price:         150.25,
		Change:        2.5,
		ChangePercent: 1.7,
		Timestamp:     "2025-01-01 15:00:00",
		Source:        AlphaVantageSource,
	}

	assert.Equal(t, "AAPL", quote.Symbol)
	assert.Equal(t, 150.25, quote.Price)
	assert.Equal(t, 2.5, quote.Change)
	assert.Equal(t, 1.7, quote.ChangePercent)
	assert.Equal(t, AlphaVantageSource, quote.Source)
}

func TestStockQuote_ZeroPrice(t *testing.T) {
	quote := &StockQuote{
		Symbol: "INVALID",
		Price:  0.0,
	}

	assert.Equal(t, 0.0, quote.Price)
}

func TestHistoricalDataPoint_Fields(t *testing.T) {
	point := &HistoricalDataPoint{
		Date:   "2025-01-01",
		Price:  150.25,
		Volume: 1000000,
	}

	assert.Equal(t, "2025-01-01", point.Date)
	assert.Equal(t, 150.25, point.Price)
	assert.Equal(t, int64(1000000), point.Volume)
}

func TestHistoricalDataPoint_NoVolume(t *testing.T) {
	point := &HistoricalDataPoint{
		Date:  "2025-01-01",
		Price: 150.25,
	}

	assert.Equal(t, int64(0), point.Volume)
}

func TestStockHistory_Fields(t *testing.T) {
	data := []HistoricalDataPoint{
		{Date: "2025-01-01", Price: 150.0},
		{Date: "2025-01-02", Price: 151.0},
		{Date: "2025-01-03", Price: 152.0},
	}

	history := &StockHistory{
		Symbol: "AAPL",
		Data:   data,
	}

	assert.Equal(t, "AAPL", history.Symbol)
	assert.Equal(t, 3, len(history.Data))
	assert.Equal(t, 150.0, history.Data[0].Price)
}

func TestStockHistory_Empty(t *testing.T) {
	history := &StockHistory{
		Symbol: "EMPTY",
		Data:   []HistoricalDataPoint{},
	}

	assert.Equal(t, "EMPTY", history.Symbol)
	assert.Equal(t, 0, len(history.Data))
}

func TestAlphaVantageBaseURL(t *testing.T) {
	assert.Equal(t, "https://www.alphavantage.co/query", AlphaVantageBaseURL)
}

func TestAlphaVantageSource(t *testing.T) {
	assert.Equal(t, "Alpha Vantage", AlphaVantageSource)
}

func TestNewAlphaVantageClient_LoggerStored(t *testing.T) {
	cfg := &config.AlphaVantageConfig{
		APIKey:  "test_key",
		Timeout: 30 * time.Second,
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client := NewAlphaVantageClient(cfg, logger)

	assert.NotNil(t, client.logger)
	assert.Equal(t, logger, client.logger)
}

func TestNewAlphaVantageClient_APIKeyStored(t *testing.T) {
	cfg := &config.AlphaVantageConfig{
		APIKey:  "my_secret_api_key",
		Timeout: 30 * time.Second,
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client := NewAlphaVantageClient(cfg, logger)

	assert.Equal(t, "my_secret_api_key", client.apiKey)
}

func TestNewAlphaVantageClient_CustomTimeout(t *testing.T) {
	cfg := &config.AlphaVantageConfig{
		APIKey:  "test_key",
		Timeout: 60 * time.Second,
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client := NewAlphaVantageClient(cfg, logger)

	assert.Equal(t, 60*time.Second, client.client.Timeout)
}

func TestStockQuote_NegativeChange(t *testing.T) {
	quote := &StockQuote{
		Symbol:        "STOCK",
		Price:         100.0,
		Change:        -5.0,
		ChangePercent: -4.76,
	}

	assert.Equal(t, -5.0, quote.Change)
	assert.Equal(t, -4.76, quote.ChangePercent)
}

func TestStockHistory_MultipleDataPoints(t *testing.T) {
	data := make([]HistoricalDataPoint, 100)
	for i := 0; i < 100; i++ {
		data[i] = HistoricalDataPoint{
			Date:   "2025-01-01",
			Price:  150.0 + float64(i),
			Volume: int64(1000000 * (i + 1)),
		}
	}

	history := &StockHistory{
		Symbol: "TEST",
		Data:   data,
	}

	assert.Equal(t, 100, len(history.Data))
	assert.Equal(t, 150.0, history.Data[0].Price)
	assert.Equal(t, 249.0, history.Data[99].Price)
}
