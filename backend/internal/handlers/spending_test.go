package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewSpendingHandler(t *testing.T) {
	csvSvc := &services.CSVProcessingService{}
	logger := zap.NewNop()

	handler := NewSpendingHandler(csvSvc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, csvSvc, handler.csvProcessingService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewSpendingHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewSpendingHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.csvProcessingService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewSpendingHandler_WithNilLogger(t *testing.T) {
	csvSvc := &services.CSVProcessingService{}

	handler := NewSpendingHandler(csvSvc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, csvSvc, handler.csvProcessingService)
	assert.Nil(t, handler.logger)
}

func TestNewSpendingHandler_BothNil(t *testing.T) {
	handler := NewSpendingHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.csvProcessingService)
	assert.Nil(t, handler.logger)
}

func TestNewSpendingHandler_MultipleInstances(t *testing.T) {
	csvSvc := &services.CSVProcessingService{}
	logger := zap.NewNop()

	handler1 := NewSpendingHandler(csvSvc, logger)
	handler2 := NewSpendingHandler(csvSvc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.csvProcessingService, handler2.csvProcessingService)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewSpendingHandler_FieldAssignment(t *testing.T) {
	csvSvc := &services.CSVProcessingService{}
	logger := zap.NewNop()

	handler := NewSpendingHandler(csvSvc, logger)

	assert.NotNil(t, handler.csvProcessingService)
	assert.NotNil(t, handler.logger)
	assert.Equal(t, csvSvc, handler.csvProcessingService)
	assert.Equal(t, logger, handler.logger)
}
