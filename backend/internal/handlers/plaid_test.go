package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewPlaidHandler(t *testing.T) {
	svc := &services.PlaidService{}
	logger := zap.NewNop()

	handler := NewPlaidHandler(svc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.plaidService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewPlaidHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewPlaidHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.plaidService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewPlaidHandler_WithNilLogger(t *testing.T) {
	svc := &services.PlaidService{}

	handler := NewPlaidHandler(svc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.plaidService)
	assert.Nil(t, handler.logger)
}

func TestNewPlaidHandler_BothNil(t *testing.T) {
	handler := NewPlaidHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.plaidService)
	assert.Nil(t, handler.logger)
}

func TestNewPlaidHandler_MultipleInstances(t *testing.T) {
	svc := &services.PlaidService{}
	logger := zap.NewNop()

	handler1 := NewPlaidHandler(svc, logger)
	handler2 := NewPlaidHandler(svc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.plaidService, handler2.plaidService)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewPlaidHandler_FieldAssignment(t *testing.T) {
	svc := &services.PlaidService{}
	logger := zap.NewNop()

	handler := NewPlaidHandler(svc, logger)

	assert.NotNil(t, handler.plaidService)
	assert.NotNil(t, handler.logger)
	assert.Equal(t, svc, handler.plaidService)
	assert.Equal(t, logger, handler.logger)
}
