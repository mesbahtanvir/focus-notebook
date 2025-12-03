package clients

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
)

func TestNewPlaidClient_ValidConfig(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "sandbox",
		Products:    []string{"transactions", "auth"},
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client)
	assert.NotNil(t, client.client)
	assert.Equal(t, "test_client_id", client.clientID)
	assert.Equal(t, "test_secret", client.secret)
}

func TestNewPlaidClient_EmptyClientID(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "",
		Secret:      "test_secret",
		Environment: "sandbox",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "required")
}

func TestNewPlaidClient_EmptySecret(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "",
		Environment: "sandbox",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "required")
}

func TestNewPlaidClient_InvalidEnvironment(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "invalid_env",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	assert.Nil(t, client)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid")
}

func TestNewPlaidClient_SandboxEnvironment(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "sandbox",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestNewPlaidClient_DevelopmentEnvironment(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "development",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestNewPlaidClient_ProductionEnvironment(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "production",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client)
}

func TestNewPlaidClient_WithProducts(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "sandbox",
		Products:    []string{"transactions", "auth", "balance"},
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client.products)
	assert.Greater(t, len(client.products), 0)
}

func TestNewPlaidClient_WithCountryCodes(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:     "test_client_id",
		Secret:       "test_secret",
		Environment:  "sandbox",
		CountryCodes: []string{"US", "GB", "CA"},
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client.countryCodes)
}

func TestNewPlaidClient_WithWebhookURL(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "sandbox",
		WebhookURL:  "https://example.com/webhook",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.Equal(t, "https://example.com/webhook", client.webhookURL)
}

func TestNewPlaidClient_LoggerStored(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "sandbox",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.Equal(t, logger, client.logger)
}

func TestNewPlaidClient_MultipleInstances(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "sandbox",
	}
	logger := zap.NewNop()

	client1, err1 := NewPlaidClient(cfg, logger)
	client2, err2 := NewPlaidClient(cfg, logger)

	require.NoError(t, err1)
	require.NoError(t, err2)
	assert.NotNil(t, client1)
	assert.NotNil(t, client2)
}

func TestNewPlaidClient_ConfigStored(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "my_test_id",
		Secret:      "my_test_secret",
		Environment: "development",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.Equal(t, "my_test_id", client.clientID)
	assert.Equal(t, "my_test_secret", client.secret)
}

func TestNewPlaidClient_FieldInitialization(t *testing.T) {
	cfg := &config.PlaidConfig{
		ClientID:    "test_client_id",
		Secret:      "test_secret",
		Environment: "sandbox",
	}
	logger := zap.NewNop()

	client, err := NewPlaidClient(cfg, logger)

	require.NoError(t, err)
	assert.NotNil(t, client.client)
	assert.NotNil(t, client.environment)
	assert.NotEmpty(t, client.clientID)
	assert.NotEmpty(t, client.secret)
}
