package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewPlaceInsightsHandler(t *testing.T) {
	svc := &services.PlaceInsightsService{}
	logger := zap.NewNop()

	handler := NewPlaceInsightsHandler(svc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.placeInsightsService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewPlaceInsightsHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewPlaceInsightsHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.placeInsightsService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewPlaceInsightsHandler_WithNilLogger(t *testing.T) {
	svc := &services.PlaceInsightsService{}

	handler := NewPlaceInsightsHandler(svc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.placeInsightsService)
	assert.Nil(t, handler.logger)
}

func TestNewPlaceInsightsHandler_BothNil(t *testing.T) {
	handler := NewPlaceInsightsHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.placeInsightsService)
	assert.Nil(t, handler.logger)
}

func TestNewPlaceInsightsHandler_MultipleInstances(t *testing.T) {
	svc := &services.PlaceInsightsService{}
	logger := zap.NewNop()

	handler1 := NewPlaceInsightsHandler(svc, logger)
	handler2 := NewPlaceInsightsHandler(svc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.placeInsightsService, handler2.placeInsightsService)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewVisaHandler(t *testing.T) {
	svc := &services.VisaService{}
	logger := zap.NewNop()

	handler := NewVisaHandler(svc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.visaService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewVisaHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewVisaHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.visaService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewVisaHandler_WithNilLogger(t *testing.T) {
	svc := &services.VisaService{}

	handler := NewVisaHandler(svc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.visaService)
	assert.Nil(t, handler.logger)
}

func TestNewVisaHandler_BothNil(t *testing.T) {
	handler := NewVisaHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.visaService)
	assert.Nil(t, handler.logger)
}

func TestNewVisaHandler_MultipleInstances(t *testing.T) {
	svc := &services.VisaService{}
	logger := zap.NewNop()

	handler1 := NewVisaHandler(svc, logger)
	handler2 := NewVisaHandler(svc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.visaService, handler2.visaService)
	assert.Equal(t, handler1.logger, handler2.logger)
}
