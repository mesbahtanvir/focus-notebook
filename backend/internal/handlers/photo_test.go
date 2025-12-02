package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewPhotoHandler(t *testing.T) {
	svc := &services.PhotoService{}
	logger := zap.NewNop()

	handler := NewPhotoHandler(svc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.photoService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewPhotoHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewPhotoHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.photoService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewPhotoHandler_WithNilLogger(t *testing.T) {
	svc := &services.PhotoService{}

	handler := NewPhotoHandler(svc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.photoService)
	assert.Nil(t, handler.logger)
}

func TestNewPhotoHandler_BothNil(t *testing.T) {
	handler := NewPhotoHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.photoService)
	assert.Nil(t, handler.logger)
}

func TestNewPhotoHandler_MultipleInstances(t *testing.T) {
	svc := &services.PhotoService{}
	logger := zap.NewNop()

	handler1 := NewPhotoHandler(svc, logger)
	handler2 := NewPhotoHandler(svc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.photoService, handler2.photoService)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewPhotoHandler_FieldAssignment(t *testing.T) {
	svc := &services.PhotoService{}
	logger := zap.NewNop()

	handler := NewPhotoHandler(svc, logger)

	assert.NotNil(t, handler.photoService)
	assert.NotNil(t, handler.logger)
	assert.Equal(t, svc, handler.photoService)
	assert.Equal(t, logger, handler.logger)
}
