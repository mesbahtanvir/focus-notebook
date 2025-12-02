package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewStockHandler(t *testing.T) {
	stockSvc := &services.StockService{}
	predictionSvc := &services.InvestmentPredictionService{}
	logger := zap.NewNop()

	handler := NewStockHandler(stockSvc, predictionSvc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, stockSvc, handler.stockService)
	assert.Equal(t, predictionSvc, handler.predictionService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewStockHandler_WithNilServices(t *testing.T) {
	logger := zap.NewNop()

	handler := NewStockHandler(nil, nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.stockService)
	assert.Nil(t, handler.predictionService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewStockHandler_WithNilLogger(t *testing.T) {
	stockSvc := &services.StockService{}
	predictionSvc := &services.InvestmentPredictionService{}

	handler := NewStockHandler(stockSvc, predictionSvc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, stockSvc, handler.stockService)
	assert.Equal(t, predictionSvc, handler.predictionService)
	assert.Nil(t, handler.logger)
}

func TestNewStockHandler_BothNil(t *testing.T) {
	handler := NewStockHandler(nil, nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.stockService)
	assert.Nil(t, handler.predictionService)
	assert.Nil(t, handler.logger)
}

func TestNewStockHandler_MultipleInstances(t *testing.T) {
	stockSvc := &services.StockService{}
	predictionSvc := &services.InvestmentPredictionService{}
	logger := zap.NewNop()

	handler1 := NewStockHandler(stockSvc, predictionSvc, logger)
	handler2 := NewStockHandler(stockSvc, predictionSvc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.stockService, handler2.stockService)
	assert.Equal(t, handler1.predictionService, handler2.predictionService)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewStockHandler_FieldAssignment(t *testing.T) {
	stockSvc := &services.StockService{}
	predictionSvc := &services.InvestmentPredictionService{}
	logger := zap.NewNop()

	handler := NewStockHandler(stockSvc, predictionSvc, logger)

	assert.NotNil(t, handler.stockService)
	assert.NotNil(t, handler.predictionService)
	assert.NotNil(t, handler.logger)
}
