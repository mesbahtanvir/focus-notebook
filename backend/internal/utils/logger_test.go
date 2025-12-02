package utils

import (
	"os"
	"testing"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
	"github.com/stretchr/testify/require"
)

func TestNewLogger_DevelopmentMode(t *testing.T) {
	cfg := &config.LoggingConfig{
		Development:     true,
		Level:           "debug",
		Format:          "console",
		EnableStacktrace: true,
	}

	logger, err := NewLogger(cfg)
	require.NoError(t, err)
	require.NotNil(t, logger)
	// Sync may fail in test environment, so we just check it doesn't panic
	_ = logger.Sync()
}

func TestNewLogger_ProductionMode(t *testing.T) {
	cfg := &config.LoggingConfig{
		Development:     false,
		Level:           "info",
		Format:          "json",
		EnableStacktrace: false,
	}

	logger, err := NewLogger(cfg)
	require.NoError(t, err)
	require.NotNil(t, logger)
	_ = logger.Sync()
}

func TestNewLogger_WithInvalidLevel(t *testing.T) {
	cfg := &config.LoggingConfig{
		Development: false,
		Level:       "invalid_level",
		Format:      "json",
	}

	logger, err := NewLogger(cfg)
	require.NoError(t, err)
	require.NotNil(t, logger)
	_ = logger.Sync()
}

func TestNewLogger_ConsoleFormat(t *testing.T) {
	cfg := &config.LoggingConfig{
		Development: false,
		Level:       "info",
		Format:      "console",
	}

	logger, err := NewLogger(cfg)
	require.NoError(t, err)
	require.NotNil(t, logger)
	_ = logger.Sync()
}

func TestNewLogger_WithFileOutput(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "log_test")
	require.NoError(t, err)
	defer os.Remove(tmpFile.Name())

	cfg := &config.LoggingConfig{
		Development: false,
		Level:       "info",
		Output:      tmpFile.Name(),
	}

	logger, err := NewLogger(cfg)
	require.NoError(t, err)
	require.NotNil(t, logger)

	logger.Info("test message")
	_ = logger.Sync()
}

func TestNewLogger_VariousLogLevels(t *testing.T) {
	levels := []string{"debug", "info", "warn", "error"}

	for _, level := range levels {
		t.Run(level, func(t *testing.T) {
			cfg := &config.LoggingConfig{
				Development: true,
				Level:       level,
			}

			logger, err := NewLogger(cfg)
			require.NoError(t, err)
			require.NotNil(t, logger)
			_ = logger.Sync()
		})
	}
}

func TestNewLogger_DisableStacktrace(t *testing.T) {
	cfg := &config.LoggingConfig{
		Development:      true,
		Level:            "debug",
		EnableStacktrace: false,
	}

	logger, err := NewLogger(cfg)
	require.NoError(t, err)
	require.NotNil(t, logger)
	_ = logger.Sync()
}
