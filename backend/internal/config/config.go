package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

// Config holds the application configuration
type Config struct {
	Server       ServerConfig       `yaml:"server"`
	Firebase     FirebaseConfig     `yaml:"firebase"`
	OpenAI       OpenAIConfig       `yaml:"openai"`
	Anthropic    AnthropicConfig    `yaml:"anthropic"`
	Stripe       StripeConfig       `yaml:"stripe"`
	Plaid        PlaidConfig        `yaml:"plaid"`
	AlphaVantage AlphaVantageConfig `yaml:"alpha_vantage"`
	Anonymous    AnonymousConfig    `yaml:"anonymous"`
	Logging      LoggingConfig      `yaml:"logging"`
	Metrics      MetricsConfig      `yaml:"metrics"`
	Workers      WorkersConfig      `yaml:"workers"`
	RateLimit    RateLimitConfig    `yaml:"rate_limit"`
	Upload       UploadConfig       `yaml:"upload"`
	Cache        CacheConfig        `yaml:"cache"`
	Retry        RetryConfig        `yaml:"retry"`
	Health       HealthConfig       `yaml:"health"`
	Development  DevelopmentConfig  `yaml:"development"`
}

type ServerConfig struct {
	Port           int           `yaml:"port"`
	Host           string        `yaml:"host"`
	ReadTimeout    time.Duration `yaml:"read_timeout"`
	WriteTimeout   time.Duration `yaml:"write_timeout"`
	IdleTimeout    time.Duration `yaml:"idle_timeout"`
	MaxHeaderBytes int           `yaml:"max_header_bytes"`
	CORS           CORSConfig    `yaml:"cors"`
}

type CORSConfig struct {
	Enabled          bool     `yaml:"enabled"`
	AllowedOrigins   []string `yaml:"allowed_origins"`
	AllowedMethods   []string `yaml:"allowed_methods"`
	AllowedHeaders   []string `yaml:"allowed_headers"`
	ExposeHeaders    []string `yaml:"expose_headers"`
	AllowCredentials bool     `yaml:"allow_credentials"`
	MaxAge           int      `yaml:"max_age"`
}

type FirebaseConfig struct {
	ProjectID       string `yaml:"project_id"`
	CredentialsPath string `yaml:"credentials_path"`
	StorageBucket   string `yaml:"storage_bucket"`
	DatabaseID      string `yaml:"database_id"`
}

type OpenAIConfig struct {
	APIKey       string        `yaml:"api_key"`
	DefaultModel string        `yaml:"default_model"`
	MaxTokens    int           `yaml:"max_tokens"`
	Temperature  float32       `yaml:"temperature"`
	Timeout      time.Duration `yaml:"timeout"`
	RateLimit    struct {
		RequestsPerMinute int `yaml:"requests_per_minute"`
		TokensPerMinute   int `yaml:"tokens_per_minute"`
	} `yaml:"rate_limit"`
}

type AnthropicConfig struct {
	APIKey       string        `yaml:"api_key"`
	DefaultModel string        `yaml:"default_model"`
	MaxTokens    int           `yaml:"max_tokens"`
	Timeout      time.Duration `yaml:"timeout"`
	RateLimit    struct {
		RequestsPerMinute int `yaml:"requests_per_minute"`
	} `yaml:"rate_limit"`
}

type StripeConfig struct {
	SecretKey     string `yaml:"secret_key"`
	WebhookSecret string `yaml:"webhook_secret"`
	APIVersion    string `yaml:"api_version"`
	ProPriceID    string `yaml:"pro_price_id"`
	SuccessURL    string `yaml:"success_url"`
	CancelURL     string `yaml:"cancel_url"`
}

type PlaidConfig struct {
	ClientID     string   `yaml:"client_id"`
	Secret       string   `yaml:"secret"`
	Environment  string   `yaml:"environment"`
	Products     []string `yaml:"products"`
	CountryCodes []string `yaml:"country_codes"`
	WebhookURL   string   `yaml:"webhook_url"`
}

type AlphaVantageConfig struct {
	APIKey    string        `yaml:"api_key"`
	Timeout   time.Duration `yaml:"timeout"`
	RateLimit struct {
		RequestsPerMinute int `yaml:"requests_per_minute"`
	} `yaml:"rate_limit"`
}

type AnonymousConfig struct {
	SessionDuration time.Duration `yaml:"session_duration"`
	AIOverrideKey   string        `yaml:"ai_override_key"`
	CleanupInterval time.Duration `yaml:"cleanup_interval"`
}

type LoggingConfig struct {
	Level            string `yaml:"level"`
	Format           string `yaml:"format"`
	Output           string `yaml:"output"`
	EnableStacktrace bool   `yaml:"enable_stacktrace"`
	Development      bool   `yaml:"development"`
}

type MetricsConfig struct {
	Enabled bool   `yaml:"enabled"`
	Path    string `yaml:"path"`
	Port    int    `yaml:"port"`
}

type WorkersConfig struct {
	Enabled           bool             `yaml:"enabled"`
	ThoughtQueue      WorkerConfig     `yaml:"thought_queue"`
	AnonymousCleanup  WorkerConfig     `yaml:"anonymous_cleanup"`
	StockPrices       WorkerConfig     `yaml:"stock_prices"`
	PortfolioSnapshot CronWorkerConfig `yaml:"portfolio_snapshot"`
	VisaDataUpdate    CronWorkerConfig `yaml:"visa_data_update"`
}

type WorkerConfig struct {
	Enabled    bool          `yaml:"enabled"`
	Interval   time.Duration `yaml:"interval"`
	BatchSize  int           `yaml:"batch_size"`
	MaxRetries int           `yaml:"max_retries"`
}

type CronWorkerConfig struct {
	Enabled bool   `yaml:"enabled"`
	Cron    string `yaml:"cron"`
}

type RateLimitConfig struct {
	Enabled           bool `yaml:"enabled"`
	RequestsPerMinute int  `yaml:"requests_per_minute"`
	Burst             int  `yaml:"burst"`
	PerUser           struct {
		FreeTier int `yaml:"free_tier"`
		ProTier  int `yaml:"pro_tier"`
	} `yaml:"per_user"`
}

type UploadConfig struct {
	MaxFileSize  int64               `yaml:"max_file_size"`
	AllowedTypes map[string][]string `yaml:"allowed_types"`
}

type CacheConfig struct {
	Enabled      bool          `yaml:"enabled"`
	TTL          time.Duration `yaml:"ttl"`
	MaxEntries   int           `yaml:"max_entries"`
	Subscription struct {
		TTL        time.Duration `yaml:"ttl"`
		MaxEntries int           `yaml:"max_entries"`
	} `yaml:"subscription"`
}

type RetryConfig struct {
	MaxAttempts    int           `yaml:"max_attempts"`
	InitialBackoff time.Duration `yaml:"initial_backoff"`
	MaxBackoff     time.Duration `yaml:"max_backoff"`
	Multiplier     float64       `yaml:"multiplier"`
	RetryableCodes []int         `yaml:"retryable_codes"`
}

type HealthConfig struct {
	Enabled bool          `yaml:"enabled"`
	Path    string        `yaml:"path"`
	Timeout time.Duration `yaml:"timeout"`
	Checks  struct {
		Firebase bool `yaml:"firebase"`
		OpenAI   bool `yaml:"openai"`
		Stripe   bool `yaml:"stripe"`
		Plaid    bool `yaml:"plaid"`
	} `yaml:"checks"`
}

type DevelopmentConfig struct {
	Enabled     bool `yaml:"enabled"`
	DebugRoutes bool `yaml:"debug_routes"`
	PrettyLogs  bool `yaml:"pretty_logs"`
	DisableAuth bool `yaml:"disable_auth"`
}

// Load reads and parses the configuration file
func Load(path string) (*Config, error) {
	// Read file
	// #nosec G304 -- path comes from command-line arg, not user input
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Expand environment variables
	expanded := os.ExpandEnv(string(data))

	// Parse YAML
	var cfg Config
	if err := yaml.Unmarshal([]byte(expanded), &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	// Validate
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	return &cfg, nil
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	// Firebase validation
	if c.Firebase.ProjectID == "" {
		return fmt.Errorf("firebase.project_id is required")
	}
	if c.Firebase.CredentialsPath == "" {
		return fmt.Errorf("firebase.credentials_path is required")
	}

	// Server validation
	if c.Server.Port <= 0 || c.Server.Port > 65535 {
		return fmt.Errorf("server.port must be between 1 and 65535")
	}

	// OpenAI validation (optional)
	if c.OpenAI.APIKey != "" && c.OpenAI.DefaultModel == "" {
		return fmt.Errorf("openai.default_model is required when api_key is set")
	}

	return nil
}

// GetServerAddr returns the full server address
func (c *Config) GetServerAddr() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}

// GetMetricsAddr returns the metrics server address
func (c *Config) GetMetricsAddr() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Metrics.Port)
}
