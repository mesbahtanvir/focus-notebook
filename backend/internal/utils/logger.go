package utils

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/config"
)

// NewLogger creates a new zap logger based on configuration
func NewLogger(cfg *config.LoggingConfig) (*zap.Logger, error) {
	var zapConfig zap.Config

	if cfg.Development || cfg.Format == "console" {
		zapConfig = zap.NewDevelopmentConfig()
		zapConfig.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	} else {
		zapConfig = zap.NewProductionConfig()
	}

	// Set log level
	var level zapcore.Level
	if err := level.UnmarshalText([]byte(cfg.Level)); err != nil {
		level = zapcore.InfoLevel
	}
	zapConfig.Level = zap.NewAtomicLevelAt(level)

	// Set output paths
	if cfg.Output != "" && cfg.Output != "stdout" {
		zapConfig.OutputPaths = []string{cfg.Output}
	}

	// Enable/disable stacktrace
	if !cfg.EnableStacktrace {
		zapConfig.DisableStacktrace = true
	}

	return zapConfig.Build()
}
