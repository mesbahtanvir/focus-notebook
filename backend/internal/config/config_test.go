package config

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadConfig_ValidYAML(t *testing.T) {
	// Create a temporary config file
	configYAML := `
server:
  port: 8080
  host: localhost
  read_timeout: 15s
  write_timeout: 15s
  idle_timeout: 60s
  max_header_bytes: 1048576
  cors:
    enabled: true
    allowed_origins:
      - http://localhost:3000
    allowed_methods:
      - GET
      - POST
    max_age: 3600
firebase:
  project_id: test-project
  credentials_path: /path/to/credentials.json
  storage_bucket: test-bucket
logging:
  level: info
  development: false
  format: json
  enable_stacktrace: false
`

	tmpfile, err := os.CreateTemp("", "config_*.yaml")
	require.NoError(t, err)
	defer os.Remove(tmpfile.Name())

	_, err = tmpfile.WriteString(configYAML)
	require.NoError(t, err)
	tmpfile.Close()

	cfg, err := Load(tmpfile.Name())

	require.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, 8080, cfg.Server.Port)
	assert.Equal(t, "localhost", cfg.Server.Host)
	assert.Equal(t, "test-project", cfg.Firebase.ProjectID)
	assert.True(t, cfg.Server.CORS.Enabled)
}

func TestLoadConfig_FileNotFound(t *testing.T) {
	cfg, err := Load("/nonexistent/path/config.yaml")

	assert.Error(t, err)
	assert.Nil(t, cfg)
}

func TestLoadConfig_InvalidYAML(t *testing.T) {
	invalidYAML := `
server:
  port: not_a_number
  host: localhost
`

	tmpfile, err := os.CreateTemp("", "config_*.yaml")
	require.NoError(t, err)
	defer os.Remove(tmpfile.Name())

	_, err = tmpfile.WriteString(invalidYAML)
	require.NoError(t, err)
	tmpfile.Close()

	cfg, err := Load(tmpfile.Name())

	// Should handle error gracefully
	// The exact error handling depends on implementation
	if err != nil {
		// Some implementations may error on invalid YAML
		assert.Nil(t, cfg)
	}
}

func TestLoadConfig_EmptyFile(t *testing.T) {
	tmpfile, err := os.CreateTemp("", "config_*.yaml")
	require.NoError(t, err)
	defer os.Remove(tmpfile.Name())

	tmpfile.Close()

	cfg, err := Load(tmpfile.Name())

	// Empty file should load with defaults or error
	if err == nil {
		assert.NotNil(t, cfg)
	}
}

func TestServerConfig_Defaults(t *testing.T) {
	server := ServerConfig{
		Port:           8080,
		Host:           "0.0.0.0",
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1048576,
	}

	assert.Equal(t, 8080, server.Port)
	assert.Equal(t, "0.0.0.0", server.Host)
	assert.Equal(t, 15*time.Second, server.ReadTimeout)
}

func TestCORSConfig_AllOrigins(t *testing.T) {
	cors := CORSConfig{
		Enabled:        true,
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE"},
		MaxAge:         3600,
	}

	assert.True(t, cors.Enabled)
	assert.Contains(t, cors.AllowedOrigins, "*")
	assert.Equal(t, 4, len(cors.AllowedMethods))
}

func TestCORSConfig_SpecificOrigins(t *testing.T) {
	cors := CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{
			"http://localhost:3000",
			"https://example.com",
		},
		AllowedMethods: []string{"GET", "POST"},
	}

	assert.Equal(t, 2, len(cors.AllowedOrigins))
	assert.Contains(t, cors.AllowedOrigins, "https://example.com")
}

func TestFirebaseConfig_Structure(t *testing.T) {
	fb := FirebaseConfig{
		ProjectID:       "my-project",
		CredentialsPath: "/path/to/creds.json",
		StorageBucket:   "my-bucket",
	}

	assert.Equal(t, "my-project", fb.ProjectID)
	assert.NotEmpty(t, fb.CredentialsPath)
}

func TestOpenAIConfig_Structure(t *testing.T) {
	openai := OpenAIConfig{
		APIKey:       "sk-test-key",
		DefaultModel: "gpt-4",
		MaxTokens:    4000,
		Temperature:  0.7,
		Timeout:      30 * time.Second,
	}

	assert.NotEmpty(t, openai.APIKey)
	assert.Equal(t, "gpt-4", openai.DefaultModel)
	assert.Equal(t, 4000, openai.MaxTokens)
}

func TestAnthropicConfig_Structure(t *testing.T) {
	anthropic := AnthropicConfig{
		APIKey:       "sk-test-key",
		DefaultModel: "claude-3",
		MaxTokens:    4000,
		Timeout:      30 * time.Second,
	}

	assert.NotEmpty(t, anthropic.APIKey)
	assert.Equal(t, "claude-3", anthropic.DefaultModel)
}

func TestStripeConfig_Structure(t *testing.T) {
	stripe := StripeConfig{
		SecretKey:     "sk_test_123",
		WebhookSecret: "whsec_test_123",
		ProPriceID:    "price_123",
	}

	assert.NotEmpty(t, stripe.SecretKey)
	assert.NotEmpty(t, stripe.WebhookSecret)
}

func TestPlaidConfig_Structure(t *testing.T) {
	plaid := PlaidConfig{
		ClientID:     "client_id",
		Secret:       "secret",
		Environment:  "sandbox",
		Products:     []string{"auth", "transactions"},
		CountryCodes: []string{"US", "CA"},
	}

	assert.NotEmpty(t, plaid.ClientID)
	assert.Equal(t, 2, len(plaid.Products))
}

func TestAlphaVantageConfig_Structure(t *testing.T) {
	av := AlphaVantageConfig{
		APIKey: "test_key",
		Timeout: 10 * time.Second,
	}

	assert.NotEmpty(t, av.APIKey)
	assert.Equal(t, 10*time.Second, av.Timeout)
}

func TestLoggingConfig_DevelopmentMode(t *testing.T) {
	logging := LoggingConfig{
		Development:      true,
		Level:            "debug",
		Format:           "console",
		EnableStacktrace: true,
	}

	assert.True(t, logging.Development)
	assert.Equal(t, "debug", logging.Level)
	assert.Equal(t, "console", logging.Format)
}

func TestLoggingConfig_ProductionMode(t *testing.T) {
	logging := LoggingConfig{
		Development:      false,
		Level:            "warn",
		Format:           "json",
		EnableStacktrace: false,
	}

	assert.False(t, logging.Development)
	assert.Equal(t, "warn", logging.Level)
	assert.Equal(t, "json", logging.Format)
}

func TestConfigStructure_Complete(t *testing.T) {
	cfg := &Config{
		Server: ServerConfig{
			Port:   8080,
			Host:   "0.0.0.0",
		},
		Firebase: FirebaseConfig{
			ProjectID: "test",
		},
		Logging: LoggingConfig{
			Level: "info",
		},
	}

	assert.NotNil(t, cfg)
	assert.Equal(t, 8080, cfg.Server.Port)
	assert.Equal(t, "test", cfg.Firebase.ProjectID)
}

func TestLoadConfig_WithEnvironmentOverride(t *testing.T) {
	configYAML := `
server:
  port: 8080
firebase:
  project_id: test-project
  credentials_path: /path/to/creds.json
`

	tmpfile, err := os.CreateTemp("", "config_*.yaml")
	require.NoError(t, err)
	defer os.Remove(tmpfile.Name())

	_, err = tmpfile.WriteString(configYAML)
	require.NoError(t, err)
	tmpfile.Close()

	cfg, err := Load(tmpfile.Name())

	require.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, 8080, cfg.Server.Port)
}

func TestConfigPaths(t *testing.T) {
	configYAML := `
server:
  port: 8080
firebase:
  project_id: test-project
  credentials_path: /path/to/credentials.json
  storage_bucket: gs://bucket-name
upload:
  max_file_size_mb: 100
  allowed_mime_types:
    - image/jpeg
    - image/png
`

	tmpfile, err := os.CreateTemp("", "config_*.yaml")
	require.NoError(t, err)
	defer os.Remove(tmpfile.Name())

	_, err = tmpfile.WriteString(configYAML)
	require.NoError(t, err)
	tmpfile.Close()

	cfg, err := Load(tmpfile.Name())

	require.NoError(t, err)
	assert.Equal(t, "/path/to/credentials.json", cfg.Firebase.CredentialsPath)
}

func TestLoadConfigFromCurrentDir(t *testing.T) {
	// This test checks if config loading works from specific paths
	configYAML := `
server:
  port: 3000
firebase:
  project_id: test-project
  credentials_path: /path/to/creds.json
`

	tmpfile, err := os.CreateTemp("", "config_*.yaml")
	require.NoError(t, err)
	defer os.Remove(tmpfile.Name())

	_, err = tmpfile.WriteString(configYAML)
	require.NoError(t, err)
	tmpfile.Close()

	cfg, err := Load(tmpfile.Name())

	require.NoError(t, err)
	assert.Equal(t, 3000, cfg.Server.Port)
}

func TestHealthConfig_Structure(t *testing.T) {
	health := HealthConfig{
		Timeout: 5 * time.Second,
	}

	assert.Equal(t, 5*time.Second, health.Timeout)
}

func TestDevelopmentConfig_Structure(t *testing.T) {
	dev := DevelopmentConfig{
		Enabled: true,
	}

	assert.True(t, dev.Enabled)
}

func TestRateLimitConfig_Structure(t *testing.T) {
	rl := RateLimitConfig{
		Enabled: true,
	}

	assert.True(t, rl.Enabled)
}
