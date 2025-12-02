package clients

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
)

func TestNewAnthropicClient_ValidConfig(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "test_api_key",
		DefaultModel: "claude-3-opus-20240229",
		MaxTokens:    1024,
		Timeout:      30 * time.Second,
	}
	logger := zap.NewNop()

	client, err := NewAnthropicClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client)
	assert.NotNil(t, client.client)
	assert.NotNil(t, client.config)
	assert.NotNil(t, client.logger)
	assert.NotNil(t, client.rateLimiter)
}

func TestNewAnthropicClient_EmptyAPIKey(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "",
		DefaultModel: "claude-3-opus-20240229",
		MaxTokens:    1024,
		Timeout:      30 * time.Second,
	}
	logger := zap.NewNop()

	client, err := NewAnthropicClient(cfg, logger)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "API key is required")
}

func TestNewAnthropicClient_ConfigStored(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "my_test_key",
		DefaultModel: "claude-3-sonnet-20240229",
		MaxTokens:    2048,
		Timeout:      45 * time.Second,
	}
	logger := zap.NewNop()

	client, err := NewAnthropicClient(cfg, logger)

	require.NoError(t, err)
	assert.Equal(t, cfg, client.config)
	assert.Equal(t, "claude-3-sonnet-20240229", client.config.DefaultModel)
	assert.Equal(t, 2048, client.config.MaxTokens)
}

func TestNewAnthropicClient_LoggerStored(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "test_key",
		DefaultModel: "claude-3-opus-20240229",
	}
	logger := zap.NewNop()

	client, err := NewAnthropicClient(cfg, logger)

	require.NoError(t, err)
	assert.Equal(t, logger, client.logger)
}

func TestNewAnthropicClient_RateLimiterCreated(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "test_key",
		DefaultModel: "claude-3-opus-20240229",
	}
	logger := zap.NewNop()

	client, err := NewAnthropicClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client.rateLimiter)
}

func TestNewAnthropicClient_CustomTimeout(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "test_key",
		DefaultModel: "claude-3-opus-20240229",
		Timeout:      60 * time.Second,
	}
	logger := zap.NewNop()

	_, err := NewAnthropicClient(cfg, logger)

	require.NoError(t, err)
	assert.Equal(t, 60*time.Second, cfg.Timeout)
}

func TestNewAnthropicClient_NilLogger(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "test_key",
		DefaultModel: "claude-3-opus-20240229",
	}

	client, err := NewAnthropicClient(cfg, nil)

	require.NoError(t, err)
	assert.Nil(t, client.logger)
}

func TestNewAnthropicClient_MultipleInstances(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "test_key",
		DefaultModel: "claude-3-opus-20240229",
	}
	logger := zap.NewNop()

	client1, err1 := NewAnthropicClient(cfg, logger)
	client2, err2 := NewAnthropicClient(cfg, logger)

	require.NoError(t, err1)
	require.NoError(t, err2)
	assert.NotNil(t, client1)
	assert.NotNil(t, client2)
	// Different instances but same config
	assert.Equal(t, client1.config, client2.config)
}

func TestAnthropicClient_FieldAssignments(t *testing.T) {
	cfg := &config.AnthropicConfig{
		APIKey:       "test_api_key",
		DefaultModel: "claude-3-opus-20240229",
		MaxTokens:    1024,
		Timeout:      30 * time.Second,
	}
	logger := zap.NewNop()

	client, err := NewAnthropicClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client.client)
	assert.NotNil(t, client.config)
	assert.NotNil(t, client.logger)
	assert.NotNil(t, client.rateLimiter)
}
