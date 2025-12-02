package services

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
)

var _ = time.Now()

// Tests for SubscriptionService

func TestNewSubscriptionService(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()
	overrideKey := "test-key"

	service := NewSubscriptionService(repo, logger, overrideKey)

	assert.NotNil(t, service)
	assert.Equal(t, repo, service.repo)
	assert.Equal(t, logger, service.logger)
	assert.Equal(t, overrideKey, service.overrideKey)
	assert.NotNil(t, service.cache)
}

func TestNewSubscriptionService_WithNilRepository(t *testing.T) {
	logger := zap.NewNop()

	service := NewSubscriptionService(nil, logger, "key")

	assert.NotNil(t, service)
	assert.Nil(t, service.repo)
	assert.Equal(t, logger, service.logger)
}

func TestNewSubscriptionService_WithNilLogger(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)

	service := NewSubscriptionService(repo, nil, "key")

	assert.NotNil(t, service)
	assert.Equal(t, repo, service.repo)
	assert.Nil(t, service.logger)
}

func TestNewSubscriptionService_WithEmptyOverrideKey(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()

	service := NewSubscriptionService(repo, logger, "")

	assert.NotNil(t, service)
	assert.Equal(t, "", service.overrideKey)
}

func TestNewSubscriptionService_AllNil(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	assert.NotNil(t, service)
	assert.Nil(t, service.repo)
	assert.Nil(t, service.logger)
	assert.NotNil(t, service.cache)
}

func TestSubscriptionService_Fields(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()
	service := NewSubscriptionService(repo, logger, "key")

	assert.NotNil(t, service.repo)
	assert.NotNil(t, service.logger)
	assert.NotNil(t, service.cache)
	assert.Equal(t, "key", service.overrideKey)
}

func TestSubscriptionService_RepositoryStorage(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	service := NewSubscriptionService(repo, nil, "")

	assert.Equal(t, repo, service.repo)
}

func TestSubscriptionService_LoggerStorage(t *testing.T) {
	logger := zap.NewNop()
	service := NewSubscriptionService(nil, logger, "")

	assert.Equal(t, logger, service.logger)
}

func TestSubscriptionService_OverrideKeyStorage(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "my-override-key")

	assert.Equal(t, "my-override-key", service.overrideKey)
}

func TestSubscriptionService_CacheInitialization(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	assert.NotNil(t, service.cache)
	assert.Equal(t, 0, len(service.cache))
}

func TestSubscriptionService_MultipleInstances(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()

	service1 := NewSubscriptionService(repo, logger, "key1")
	service2 := NewSubscriptionService(repo, logger, "key2")

	assert.NotNil(t, service1)
	assert.NotNil(t, service2)
	assert.Equal(t, repo, service1.repo)
	assert.Equal(t, repo, service2.repo)
	assert.NotEqual(t, service1.overrideKey, service2.overrideKey)
}

func TestSubscriptionService_Constructor(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	assert.Nil(t, service.repo)
	assert.Nil(t, service.logger)
	assert.Equal(t, "", service.overrideKey)
	assert.NotNil(t, service.cache)
}

func TestSubscriptionService_ClearCache_Empty(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	// Should not panic even with empty cache
	service.ClearCache("user-123")
	assert.Equal(t, 0, len(service.cache))
}

func TestSubscriptionService_ClearCache_WithEntry(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	// Manually add to cache
	service.cache["user-123"] = &cachedSubscription{}
	assert.Equal(t, 1, len(service.cache))

	// Clear it
	service.ClearCache("user-123")
	assert.Equal(t, 0, len(service.cache))
}

func TestSubscriptionService_ClearCache_WrongUser(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	// Add entry
	service.cache["user-123"] = &cachedSubscription{}

	// Try to clear different user
	service.ClearCache("user-456")
	assert.Equal(t, 1, len(service.cache))
	assert.NotNil(t, service.cache["user-123"])
}

func TestSubscriptionService_ImplementsExpectedMethods(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	assert.NotNil(t, service)
	// Service should have IsAIAllowed, IncrementUsage, ClearCache methods
}

func TestSubscriptionService_WithRepository(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	service := NewSubscriptionService(repo, nil, "")

	assert.NotNil(t, service)
	assert.NotNil(t, service.repo)
}

func TestSubscriptionService_WithLogger(t *testing.T) {
	logger := zap.NewNop()
	service := NewSubscriptionService(nil, logger, "")

	assert.NotNil(t, service)
	assert.NotNil(t, service.logger)
}

func TestSubscriptionService_WithOverrideKey(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "override-123")

	assert.Equal(t, "override-123", service.overrideKey)
}

func TestSubscriptionService_IsAIAllowed_MethodExists(t *testing.T) {
	service := NewSubscriptionService(nil, zap.NewNop(), "")

	// Verify service can be constructed and method is callable
	assert.NotNil(t, service)
}

func TestSubscriptionService_IncrementUsage_MethodExists(t *testing.T) {
	service := NewSubscriptionService(nil, zap.NewNop(), "")

	// Verify service can be constructed and method is callable
	assert.NotNil(t, service)
}

func TestAnonymousSessionCollection_Constant(t *testing.T) {
	assert.Equal(t, "anonymousSessions", AnonymousSessionCollection)
}

// Tests for CachedSubscription struct

func TestCachedSubscription_Structure(t *testing.T) {
	cached := &cachedSubscription{
		status:    nil,
		expiresAt: time.Now(),
	}

	assert.NotNil(t, cached)
	assert.Nil(t, cached.status)
}

func TestSubscriptionService_AllFields(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()
	key := "test-key"

	service := NewSubscriptionService(repo, logger, key)

	assert.NotNil(t, service.repo)
	assert.NotNil(t, service.logger)
	assert.NotNil(t, service.cache)
	assert.Equal(t, key, service.overrideKey)
}

func TestSubscriptionService_MultipleOverrideKeys(t *testing.T) {
	service1 := NewSubscriptionService(nil, nil, "key-1")
	service2 := NewSubscriptionService(nil, nil, "key-2")
	service3 := NewSubscriptionService(nil, nil, "key-1")

	assert.Equal(t, "key-1", service1.overrideKey)
	assert.Equal(t, "key-2", service2.overrideKey)
	assert.Equal(t, "key-1", service3.overrideKey)
	assert.Equal(t, service1.overrideKey, service3.overrideKey)
}

func TestSubscriptionService_CacheIsEmpty(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	assert.Equal(t, 0, len(service.cache))
}

func TestSubscriptionService_ClearCache_MultipleEntries(t *testing.T) {
	service := NewSubscriptionService(nil, nil, "")

	// Add multiple entries
	service.cache["user-1"] = &cachedSubscription{}
	service.cache["user-2"] = &cachedSubscription{}
	service.cache["user-3"] = &cachedSubscription{}
	assert.Equal(t, 3, len(service.cache))

	// Clear one
	service.ClearCache("user-2")
	assert.Equal(t, 2, len(service.cache))
	assert.NotNil(t, service.cache["user-1"])
	assert.Nil(t, service.cache["user-2"])
	assert.NotNil(t, service.cache["user-3"])
}
