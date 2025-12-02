package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewInvestmentHandler(t *testing.T) {
	svc := &services.InvestmentCalculationService{}
	logger := zap.NewNop()

	handler := NewInvestmentHandler(svc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.svc)
	assert.Equal(t, logger, handler.logger)
}

func TestNewInvestmentHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewInvestmentHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.svc)
	assert.Equal(t, logger, handler.logger)
}

func TestNewInvestmentHandler_WithNilLogger(t *testing.T) {
	svc := &services.InvestmentCalculationService{}

	handler := NewInvestmentHandler(svc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.svc)
	assert.Nil(t, handler.logger)
}

func TestNewInvestmentHandler_BothNil(t *testing.T) {
	handler := NewInvestmentHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.svc)
	assert.Nil(t, handler.logger)
}

func TestNewInvestmentHandler_MultipleInstances(t *testing.T) {
	svc := &services.InvestmentCalculationService{}
	logger := zap.NewNop()

	handler1 := NewInvestmentHandler(svc, logger)
	handler2 := NewInvestmentHandler(svc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.svc, handler2.svc)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewInvestmentHandler_FieldAssignment(t *testing.T) {
	svc := &services.InvestmentCalculationService{}
	logger := zap.NewNop()

	handler := NewInvestmentHandler(svc, logger)

	assert.NotNil(t, handler.svc)
	assert.NotNil(t, handler.logger)
	assert.Equal(t, svc, handler.svc)
	assert.Equal(t, logger, handler.logger)
}
