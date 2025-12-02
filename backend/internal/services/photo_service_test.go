package services

import (
	"testing"

	"cloud.google.com/go/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

func TestNewPhotoService(t *testing.T) {
	repo := &mocks.MockRepository{}
	var storageClient *storage.Client
	bucket := "test-bucket"
	logger := zap.NewNop()

	svc := NewPhotoService(repo, storageClient, bucket, logger)

	require.NotNil(t, svc)
	assert.Equal(t, repo, svc.repo)
	assert.Equal(t, storageClient, svc.storageClient)
	assert.Equal(t, bucket, svc.storageBucket)
	assert.Equal(t, logger, svc.logger)
}

func TestNewPhotoService_WithNilRepo(t *testing.T) {
	var storageClient *storage.Client
	bucket := "test-bucket"
	logger := zap.NewNop()

	svc := NewPhotoService(nil, storageClient, bucket, logger)

	require.NotNil(t, svc)
	assert.Nil(t, svc.repo)
	assert.Equal(t, bucket, svc.storageBucket)
}

func TestNewPhotoService_WithEmptyBucket(t *testing.T) {
	repo := &mocks.MockRepository{}
	var storageClient *storage.Client
	logger := zap.NewNop()

	svc := NewPhotoService(repo, storageClient, "", logger)

	require.NotNil(t, svc)
	assert.Equal(t, "", svc.storageBucket)
}
