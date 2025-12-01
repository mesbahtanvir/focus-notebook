package clients

import (
	"context"
	"fmt"
	"time"

	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
)

// OpenAIClient wraps the OpenAI API client with retry and rate limiting
type OpenAIClient struct {
	client      *openai.Client
	config      *config.OpenAIConfig
	logger      *zap.Logger
	rateLimiter *RateLimiter
}

// NewOpenAIClient creates a new OpenAI client
func NewOpenAIClient(cfg *config.OpenAIConfig, logger *zap.Logger) (*OpenAIClient, error) {
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("OpenAI API key is required")
	}

	client := openai.NewClient(cfg.APIKey)

	// Create rate limiter
	rateLimiter := NewRateLimiter(
		cfg.RateLimit.RequestsPerMinute,
		cfg.RateLimit.TokensPerMinute,
	)

	return &OpenAIClient{
		client:      client,
		config:      cfg,
		logger:      logger,
		rateLimiter: rateLimiter,
	}, nil
}

// ChatCompletionRequest represents a chat completion request
type ChatCompletionRequest struct {
	Model          string
	Messages       []ChatMessage
	MaxTokens      int
	Temperature    float32
	ResponseFormat *ResponseFormat
}

// ChatMessage represents a single message in the chat
type ChatMessage struct {
	Role    string // system, user, assistant
	Content string
}

// ResponseFormat specifies the response format
type ResponseFormat struct {
	Type string // json_object or text
}

// ChatCompletionResponse represents the response from OpenAI
type ChatCompletionResponse struct {
	Content      string
	FinishReason string
	TokensUsed   int
	Model        string
}

// ChatCompletion sends a chat completion request to OpenAI
func (c *OpenAIClient) ChatCompletion(ctx context.Context, req ChatCompletionRequest) (*ChatCompletionResponse, error) {
	// Use default model if not specified
	if req.Model == "" {
		req.Model = c.config.DefaultModel
	}

	// Use default settings if not specified
	if req.MaxTokens == 0 {
		req.MaxTokens = c.config.MaxTokens
	}
	if req.Temperature == 0 {
		req.Temperature = c.config.Temperature
	}

	// Wait for rate limit
	if err := c.rateLimiter.WaitForRequest(ctx); err != nil {
		return nil, fmt.Errorf("rate limit wait failed: %w", err)
	}

	// Convert messages to OpenAI format
	var messages []openai.ChatCompletionMessage
	for _, msg := range req.Messages {
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Build request
	openaiReq := openai.ChatCompletionRequest{
		Model:       req.Model,
		Messages:    messages,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
	}

	// Set response format if specified
	if req.ResponseFormat != nil && req.ResponseFormat.Type == "json_object" {
		openaiReq.ResponseFormat = &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		}
	}

	// Set timeout
	reqCtx, cancel := context.WithTimeout(ctx, c.config.Timeout)
	defer cancel()

	// Log request
	c.logger.Debug("Sending OpenAI request",
		zap.String("model", req.Model),
		zap.Int("max_tokens", req.MaxTokens),
		zap.Float32("temperature", req.Temperature),
	)

	startTime := time.Now()

	// Send request with retry
	var resp openai.ChatCompletionResponse
	var err error

	err = c.retryWithBackoff(reqCtx, func() error {
		resp, err = c.client.CreateChatCompletion(reqCtx, openaiReq)
		return err
	})

	if err != nil {
		c.logger.Error("OpenAI request failed",
			zap.Error(err),
			zap.String("model", req.Model),
		)
		return nil, fmt.Errorf("OpenAI request failed: %w", err)
	}

	duration := time.Since(startTime)

	// Extract response
	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no response choices returned")
	}

	choice := resp.Choices[0]
	tokensUsed := resp.Usage.TotalTokens

	// Update token rate limiter
	c.rateLimiter.RecordTokens(tokensUsed)

	c.logger.Info("OpenAI request completed",
		zap.String("model", resp.Model),
		zap.Int("tokens_used", tokensUsed),
		zap.Duration("duration", duration),
		zap.String("finish_reason", string(choice.FinishReason)),
	)

	return &ChatCompletionResponse{
		Content:      choice.Message.Content,
		FinishReason: string(choice.FinishReason),
		TokensUsed:   tokensUsed,
		Model:        resp.Model,
	}, nil
}

// retryWithBackoff retries the operation with exponential backoff
func (c *OpenAIClient) retryWithBackoff(ctx context.Context, operation func() error) error {
	maxRetries := 3
	baseDelay := 1 * time.Second
	maxDelay := 30 * time.Second

	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			// Calculate delay with exponential backoff
			delay := time.Duration(1<<uint(attempt-1)) * baseDelay
			if delay > maxDelay {
				delay = maxDelay
			}

			c.logger.Debug("Retrying OpenAI request",
				zap.Int("attempt", attempt+1),
				zap.Duration("delay", delay),
			)

			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return ctx.Err()
			}
		}

		lastErr = operation()
		if lastErr == nil {
			return nil
		}

		// Check if error is retryable
		if !isRetryableError(lastErr) {
			return lastErr
		}
	}

	return fmt.Errorf("max retries exceeded: %w", lastErr)
}

// isRetryableError checks if an error is retryable
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// Check for specific OpenAI errors
	errStr := err.Error()

	// Rate limit errors
	if contains(errStr, "rate_limit_exceeded") || contains(errStr, "429") {
		return true
	}

	// Server errors
	if contains(errStr, "500") || contains(errStr, "502") || contains(errStr, "503") || contains(errStr, "504") {
		return true
	}

	// Timeout errors
	if contains(errStr, "timeout") || contains(errStr, "deadline exceeded") {
		return true
	}

	return false
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) &&
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
			findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
