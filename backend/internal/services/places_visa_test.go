package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

func TestNewPlaceInsightsService(t *testing.T) {
	openaiClient := &clients.OpenAIClient{}
	logger := zap.NewNop()

	svc := NewPlaceInsightsService(openaiClient, logger)

	require.NotNil(t, svc)
	assert.Equal(t, openaiClient, svc.openaiClient)
	assert.Equal(t, logger, svc.logger)
}

func TestNewPlaceInsightsService_WithNilClient(t *testing.T) {
	logger := zap.NewNop()

	svc := NewPlaceInsightsService(nil, logger)

	require.NotNil(t, svc)
	assert.Nil(t, svc.openaiClient)
	assert.Equal(t, logger, svc.logger)
}

func TestNewPlaceInsightsService_WithNilLogger(t *testing.T) {
	openaiClient := &clients.OpenAIClient{}

	svc := NewPlaceInsightsService(openaiClient, nil)

	require.NotNil(t, svc)
	assert.Equal(t, openaiClient, svc.openaiClient)
	assert.Nil(t, svc.logger)
}

func TestNewVisaService(t *testing.T) {
	repo := &mocks.MockRepository{}
	logger := zap.NewNop()

	svc := NewVisaService(repo, logger)

	require.NotNil(t, svc)
	assert.Equal(t, repo, svc.repo)
	assert.Equal(t, logger, svc.logger)
}

func TestNewVisaService_WithNilRepo(t *testing.T) {
	logger := zap.NewNop()

	svc := NewVisaService(nil, logger)

	require.NotNil(t, svc)
	assert.Nil(t, svc.repo)
	assert.Equal(t, logger, svc.logger)
}

func TestNewVisaService_WithNilLogger(t *testing.T) {
	repo := &mocks.MockRepository{}

	svc := NewVisaService(repo, nil)

	require.NotNil(t, svc)
	assert.Equal(t, repo, svc.repo)
	assert.Nil(t, svc.logger)
}
