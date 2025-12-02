package clients

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
)

func TestNewOpenAIClient_ValidConfig(t *testing.T) {
	cfg := &config.OpenAIConfig{
		APIKey:       "test-api-key",
		DefaultModel: "gpt-4",
		MaxTokens:    4000,
		Temperature:  0.7,
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewOpenAIClient(cfg, logger)

	assert.NoError(t, err)
	assert.NotNil(t, client)
	assert.Equal(t, cfg, client.config)
	assert.NotNil(t, client.rateLimiter)
}

func TestNewOpenAIClient_MissingAPIKey(t *testing.T) {
	cfg := &config.OpenAIConfig{
		APIKey:       "",
		DefaultModel: "gpt-4",
	}
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewOpenAIClient(cfg, logger)

	assert.Error(t, err)
	assert.Nil(t, client)
	assert.Contains(t, err.Error(), "OpenAI API key is required")
}

func TestNewOpenAIClient_RateLimiterInitialized(t *testing.T) {
	cfg := &config.OpenAIConfig{
		APIKey:       "test-key",
		DefaultModel: "gpt-4",
	}
	cfg.RateLimit.RequestsPerMinute = 100
	cfg.RateLimit.TokensPerMinute = 50000

	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	client, err := NewOpenAIClient(cfg, logger)

	assert.NoError(t, err)
	assert.NotNil(t, client.rateLimiter)
	assert.Equal(t, 100, client.rateLimiter.requestsPerMinute)
	assert.Equal(t, 50000, client.rateLimiter.tokensPerMinute)
}

func TestContains_ExactMatch(t *testing.T) {
	result := contains("rate_limit_exceeded", "rate_limit_exceeded")
	assert.True(t, result)
}

func TestContains_Substring(t *testing.T) {
	result := contains("error: rate_limit_exceeded message", "rate_limit_exceeded")
	assert.True(t, result)
}

func TestContains_NoMatch(t *testing.T) {
	result := contains("some error message", "nonexistent")
	assert.False(t, result)
}

func TestContains_EmptySubstring(t *testing.T) {
	result := contains("some string", "")
	assert.True(t, result) // Empty substring is always contained
}

func TestContains_EmptyString(t *testing.T) {
	result := contains("", "substring")
	assert.False(t, result)
}

func TestContains_StartOfString(t *testing.T) {
	result := contains("error: 429 rate limited", "error")
	assert.True(t, result)
}

func TestContains_EndOfString(t *testing.T) {
	result := contains("rate limit error 429", "429")
	assert.True(t, result)
}

func TestFindSubstring_Found(t *testing.T) {
	result := findSubstring("hello world", "world")
	assert.True(t, result)
}

func TestFindSubstring_NotFound(t *testing.T) {
	result := findSubstring("hello world", "xyz")
	assert.False(t, result)
}

func TestFindSubstring_MultipleOccurrences(t *testing.T) {
	result := findSubstring("error error error", "error")
	assert.True(t, result)
}

func TestFindSubstring_PartialMatch(t *testing.T) {
	result := findSubstring("server", "serve")
	assert.True(t, result)
}

func TestIsRetryableError_NilError(t *testing.T) {
	result := isRetryableError(nil)
	assert.False(t, result)
}

func TestIsRetryableError_RateLimitExceeded(t *testing.T) {
	// Create test error with rate limit message
	err := NewTestError("rate_limit_exceeded")
	result := isRetryableError(err)
	assert.True(t, result)
}

func TestIsRetryableError_429Status(t *testing.T) {
	err := NewTestError("429 Too Many Requests")
	result := isRetryableError(err)
	assert.True(t, result)
}

func TestIsRetryableError_500Error(t *testing.T) {
	err := NewTestError("500 Internal Server Error")
	result := isRetryableError(err)
	assert.True(t, result)
}

func TestIsRetryableError_502Error(t *testing.T) {
	err := NewTestError("502 Bad Gateway")
	result := isRetryableError(err)
	assert.True(t, result)
}

func TestIsRetryableError_503Error(t *testing.T) {
	err := NewTestError("503 Service Unavailable")
	result := isRetryableError(err)
	assert.True(t, result)
}

func TestIsRetryableError_504Error(t *testing.T) {
	err := NewTestError("504 Gateway Timeout")
	result := isRetryableError(err)
	assert.True(t, result)
}

func TestIsRetryableError_TimeoutError(t *testing.T) {
	err := NewTestError("timeout")
	result := isRetryableError(err)
	assert.True(t, result)
}

func TestIsRetryableError_DeadlineExceededError(t *testing.T) {
	err := NewTestError("deadline exceeded")
	result := isRetryableError(err)
	assert.True(t, result)
}

func TestIsRetryableError_InvalidAPIKey(t *testing.T) {
	err := NewTestError("Invalid API key")
	result := isRetryableError(err)
	assert.False(t, result)
}

func TestIsRetryableError_AuthenticationError(t *testing.T) {
	err := NewTestError("401 Unauthorized")
	result := isRetryableError(err)
	assert.False(t, result)
}

func TestChatCompletionRequest_DefaultModel(t *testing.T) {
	req := ChatCompletionRequest{
		Model:     "",
		MaxTokens: 0,
	}

	assert.Empty(t, req.Model)
	assert.Equal(t, 0, req.MaxTokens)
}

func TestChatCompletionRequest_WithModel(t *testing.T) {
	req := ChatCompletionRequest{
		Model:     "gpt-4",
		MaxTokens: 2000,
	}

	assert.Equal(t, "gpt-4", req.Model)
	assert.Equal(t, 2000, req.MaxTokens)
}

func TestChatMessage_SystemRole(t *testing.T) {
	msg := ChatMessage{
		Role:    "system",
		Content: "You are helpful",
	}

	assert.Equal(t, "system", msg.Role)
	assert.Equal(t, "You are helpful", msg.Content)
}

func TestChatMessage_UserRole(t *testing.T) {
	msg := ChatMessage{
		Role:    "user",
		Content: "Hello",
	}

	assert.Equal(t, "user", msg.Role)
	assert.Equal(t, "Hello", msg.Content)
}

func TestResponseFormat_JSONObject(t *testing.T) {
	format := &ResponseFormat{
		Type: "json_object",
	}

	assert.Equal(t, "json_object", format.Type)
}

func TestResponseFormat_Text(t *testing.T) {
	format := &ResponseFormat{
		Type: "text",
	}

	assert.Equal(t, "text", format.Type)
}

func TestChatCompletionResponse_Fields(t *testing.T) {
	resp := &ChatCompletionResponse{
		Content:      "Hello, I'm Claude",
		FinishReason: "stop",
		TokensUsed:   42,
		Model:        "gpt-4",
	}

	assert.Equal(t, "Hello, I'm Claude", resp.Content)
	assert.Equal(t, "stop", resp.FinishReason)
	assert.Equal(t, 42, resp.TokensUsed)
	assert.Equal(t, "gpt-4", resp.Model)
}

// TestError is a simple error implementation for testing
type TestError struct {
	message string
}

func NewTestError(message string) error {
	return &TestError{message: message}
}

func (e *TestError) Error() string {
	return e.message
}
