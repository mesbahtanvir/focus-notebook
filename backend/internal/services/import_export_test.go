package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

func TestNewImportExportService(t *testing.T) {
	repo := &mocks.MockRepository{}
	logger := zap.NewNop()

	svc := NewImportExportService(repo, logger)

	require.NotNil(t, svc)
	assert.Equal(t, repo, svc.repo)
	assert.Equal(t, logger, svc.logger)
}

func TestNewImportExportService_WithNilRepo(t *testing.T) {
	logger := zap.NewNop()

	svc := NewImportExportService(nil, logger)

	require.NotNil(t, svc)
	assert.Nil(t, svc.repo)
	assert.Equal(t, logger, svc.logger)
}

func TestNewImportExportService_WithNilLogger(t *testing.T) {
	repo := &mocks.MockRepository{}

	svc := NewImportExportService(repo, nil)

	require.NotNil(t, svc)
	assert.Equal(t, repo, svc.repo)
	assert.Nil(t, svc.logger)
}

func TestNewImportExportService_BothNil(t *testing.T) {
	svc := NewImportExportService(nil, nil)

	require.NotNil(t, svc)
	assert.Nil(t, svc.repo)
	assert.Nil(t, svc.logger)
}
