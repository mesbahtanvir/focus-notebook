package clients

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
)

func TestNewStripeClient_ValidConfig(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey:     "sk_test_123",
		WebhookSecret: "whsec_test_456",
		ProPriceID:    "price_pro",
		SuccessURL:    "https://example.com/success",
		CancelURL:     "https://example.com/cancel",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)

	assert.NoError(t, err)
	assert.NotNil(t, client)
	assert.Equal(t, "sk_test_123", client.secretKey)
	assert.Equal(t, "whsec_test_456", client.webhookSecret)
	assert.Equal(t, "price_pro", client.proPriceID)
}

func TestNewStripeClient_MissingSecretKey(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey:     "",
		WebhookSecret: "whsec_test_456",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)

	assert.Error(t, err)
	assert.Nil(t, client)
	assert.Contains(t, err.Error(), "Stripe secret key is required")
}

func TestNewStripeClient_MinimalConfig(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey: "sk_test_123",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)

	assert.NoError(t, err)
	assert.NotNil(t, client)
	assert.Empty(t, client.webhookSecret)
	assert.Empty(t, client.proPriceID)
}

func TestStripeClient_GetProPriceID(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey:  "sk_test_123",
		ProPriceID: "price_123",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)

	priceID := client.GetProPriceID()
	assert.Equal(t, "price_123", priceID)
}

func TestStripeClient_GetProPriceID_NotSet(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey: "sk_test_123",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)

	priceID := client.GetProPriceID()
	assert.Empty(t, priceID)
}

func TestStripeClient_ConfiguredURLs(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey:  "sk_test_123",
		SuccessURL: "https://app.example.com/settings",
		CancelURL:  "https://app.example.com/pricing",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)

	assert.Equal(t, "https://app.example.com/settings", client.successURL)
	assert.Equal(t, "https://app.example.com/pricing", client.cancelURL)
}

func TestStripeClient_WebhookSecretStorage(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey:     "sk_test_123",
		WebhookSecret: "whsec_secret_value",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)

	assert.Equal(t, "whsec_secret_value", client.webhookSecret)
}

func TestStripeClient_AllConfigFields(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey:     "sk_live_123",
		WebhookSecret: "whsec_prod_456",
		ProPriceID:    "price_prod_789",
		SuccessURL:    "https://app.prod.com/success",
		CancelURL:     "https://app.prod.com/cancel",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)

	assert.Equal(t, "sk_live_123", client.secretKey)
	assert.Equal(t, "whsec_prod_456", client.webhookSecret)
	assert.Equal(t, "price_prod_789", client.proPriceID)
	assert.Equal(t, "https://app.prod.com/success", client.successURL)
	assert.Equal(t, "https://app.prod.com/cancel", client.cancelURL)
	assert.NotNil(t, client.logger)
}

func TestStripeClient_LoggerStorage(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey: "sk_test_123",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)

	assert.NotNil(t, client.logger)
	assert.Equal(t, logger, client.logger)
}

func TestStripeClient_EmptySecretKey_Error(t *testing.T) {
	cfg := &config.StripeConfig{}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)

	assert.Error(t, err)
	assert.Nil(t, client)
}

func TestStripeClient_SkTestKeyPattern(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey: "sk_test_123456789",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)
	assert.NotNil(t, client)
	assert.Equal(t, "sk_test_123456789", client.secretKey)
}

func TestStripeClient_SkLiveKeyPattern(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey: "sk_live_987654321",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)
	assert.NotNil(t, client)
	assert.Equal(t, "sk_live_987654321", client.secretKey)
}

func TestStripeClient_PriceIDPatterns(t *testing.T) {
	cfg := &config.StripeConfig{
		SecretKey:  "sk_test_123",
		ProPriceID: "price_1234567890abcdef",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewStripeClient(cfg, logger)
	assert.NoError(t, err)

	assert.Equal(t, "price_1234567890abcdef", client.GetProPriceID())
}
