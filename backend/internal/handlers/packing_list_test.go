package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewPackingListHandler(t *testing.T) {
	svc := &services.PackingListService{}
	logger := zap.NewNop()

	handler := NewPackingListHandler(svc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.packingListService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewPackingListHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewPackingListHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.packingListService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewPackingListHandler_WithNilLogger(t *testing.T) {
	svc := &services.PackingListService{}

	handler := NewPackingListHandler(svc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.packingListService)
	assert.Nil(t, handler.logger)
}

func TestNewPackingListHandler_BothNil(t *testing.T) {
	handler := NewPackingListHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.packingListService)
	assert.Nil(t, handler.logger)
}

func TestNewPackingListHandler_MultipleInstances(t *testing.T) {
	svc := &services.PackingListService{}
	logger := zap.NewNop()

	handler1 := NewPackingListHandler(svc, logger)
	handler2 := NewPackingListHandler(svc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.packingListService, handler2.packingListService)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewPackingListHandler_FieldAssignment(t *testing.T) {
	svc := &services.PackingListService{}
	logger := zap.NewNop()

	handler := NewPackingListHandler(svc, logger)

	assert.NotNil(t, handler.packingListService)
	assert.NotNil(t, handler.logger)
	assert.Equal(t, svc, handler.packingListService)
	assert.Equal(t, logger, handler.logger)
}
