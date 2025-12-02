package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewThoughtHandler(t *testing.T) {
	thoughtSvc := &services.ThoughtProcessingService{}
	logger := zap.NewNop()

	handler := NewThoughtHandler(thoughtSvc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, thoughtSvc, handler.thoughtProcessingSvc)
	assert.Equal(t, logger, handler.logger)
}

func TestNewThoughtHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewThoughtHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.thoughtProcessingSvc)
	assert.Equal(t, logger, handler.logger)
}

func TestNewThoughtHandler_WithNilLogger(t *testing.T) {
	thoughtSvc := &services.ThoughtProcessingService{}

	handler := NewThoughtHandler(thoughtSvc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, thoughtSvc, handler.thoughtProcessingSvc)
	assert.Nil(t, handler.logger)
}

func TestNewThoughtHandler_BothNil(t *testing.T) {
	handler := NewThoughtHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.thoughtProcessingSvc)
	assert.Nil(t, handler.logger)
}

func TestNewThoughtHandler_MultipleInstances(t *testing.T) {
	thoughtSvc := &services.ThoughtProcessingService{}
	logger := zap.NewNop()

	handler1 := NewThoughtHandler(thoughtSvc, logger)
	handler2 := NewThoughtHandler(thoughtSvc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.thoughtProcessingSvc, handler2.thoughtProcessingSvc)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewThoughtHandler_FieldAssignment(t *testing.T) {
	thoughtSvc := &services.ThoughtProcessingService{}
	logger := zap.NewNop()

	handler := NewThoughtHandler(thoughtSvc, logger)

	assert.NotNil(t, handler.thoughtProcessingSvc)
	assert.NotNil(t, handler.logger)
	assert.Equal(t, thoughtSvc, handler.thoughtProcessingSvc)
	assert.Equal(t, logger, handler.logger)
}
