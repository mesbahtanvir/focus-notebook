package clients

import (
	"context"
	"fmt"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/config"
)

// AnthropicClient wraps the Anthropic API client
type AnthropicClient struct {
	client      *anthropic.Client
	config      *config.AnthropicConfig
	logger      *zap.Logger
	rateLimiter *RateLimiter
}

// NewAnthropicClient creates a new Anthropic client
func NewAnthropicClient(cfg *config.AnthropicConfig, logger *zap.Logger) (*AnthropicClient, error) {
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("Anthropic API key is required")
	}

	client := anthropic.NewClient(option.WithAPIKey(cfg.APIKey))

	// Create rate limiter
	rateLimiter := NewRateLimiter(
		cfg.RateLimit.RequestsPerMinute,
		100000, // Anthropic doesn't publish token limits, use conservative value
	)

	return &AnthropicClient{
		client:      client,
		config:      cfg,
		logger:      logger,
		rateLimiter: rateLimiter,
	}, nil
}

// ChatCompletion sends a chat completion request to Anthropic
func (c *AnthropicClient) ChatCompletion(ctx context.Context, req ChatCompletionRequest) (*ChatCompletionResponse, error) {
	// Use default model if not specified
	if req.Model == "" {
		req.Model = c.config.DefaultModel
	}

	// Use default settings if not specified
	if req.MaxTokens == 0 {
		req.MaxTokens = c.config.MaxTokens
	}
	if req.Temperature == 0 {
		req.Temperature = 0.7 // Anthropic default
	}

	// Wait for rate limit
	if err := c.rateLimiter.WaitForRequest(ctx); err != nil {
		return nil, fmt.Errorf("rate limit wait failed: %w", err)
	}

	// Convert messages to Anthropic format
	var messages []anthropic.MessageParam
	var systemPrompt string

	for _, msg := range req.Messages {
		if msg.Role == "system" {
			// Anthropic uses a separate system parameter
			systemPrompt = msg.Content
		} else {
			messages = append(messages, anthropic.NewUserMessage(
				anthropic.NewTextBlock(msg.Content),
			))
		}
	}

	// Set timeout
	reqCtx, cancel := context.WithTimeout(ctx, c.config.Timeout)
	defer cancel()

	c.logger.Debug("Sending Anthropic request",
		zap.String("model", req.Model),
		zap.Int("max_tokens", req.MaxTokens),
		zap.Float32("temperature", req.Temperature),
	)

	startTime := time.Now()

	// Build request
	params := anthropic.MessageNewParams{
		Model:     anthropic.F(anthropic.Model(req.Model)),
		MaxTokens: anthropic.F(int64(req.MaxTokens)),
		Messages:  anthropic.F(messages),
	}

	if systemPrompt != "" {
		params.System = anthropic.F([]anthropic.TextBlockParam{
			anthropic.NewTextBlock(systemPrompt),
		})
	}

	// Send request
	message, err := c.client.Messages.New(reqCtx, params)
	if err != nil {
		c.logger.Error("Anthropic request failed",
			zap.Error(err),
			zap.String("model", req.Model),
		)
		return nil, fmt.Errorf("Anthropic request failed: %w", err)
	}

	duration := time.Since(startTime)

	// Extract response
	if len(message.Content) == 0 {
		return nil, fmt.Errorf("no response content returned")
	}

	content := message.Content[0].Text
	tokensUsed := int(message.Usage.InputTokens + message.Usage.OutputTokens)

	// Update token rate limiter
	c.rateLimiter.RecordTokens(tokensUsed)

	c.logger.Info("Anthropic request completed",
		zap.String("model", string(message.Model)),
		zap.Int("tokens_used", tokensUsed),
		zap.Duration("duration", duration),
		zap.String("stop_reason", string(message.StopReason)),
	)

	return &ChatCompletionResponse{
		Content:      content,
		FinishReason: string(message.StopReason),
		TokensUsed:   tokensUsed,
		Model:        string(message.Model),
	}, nil
}
