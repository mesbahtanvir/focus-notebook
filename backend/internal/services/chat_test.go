package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
)

// Tests for ChatService

func TestNewChatService(t *testing.T) {
	openaiClient := &clients.OpenAIClient{}
	anthropicClient := &clients.AnthropicClient{}
	logger := zap.NewNop()

	service := NewChatService(openaiClient, anthropicClient, logger)

	assert.NotNil(t, service)
	assert.Equal(t, openaiClient, service.openaiClient)
	assert.Equal(t, anthropicClient, service.anthropicClient)
	assert.Equal(t, logger, service.logger)
}

func TestNewChatService_WithNilOpenAI(t *testing.T) {
	anthropicClient := &clients.AnthropicClient{}
	logger := zap.NewNop()

	service := NewChatService(nil, anthropicClient, logger)

	assert.NotNil(t, service)
	assert.Nil(t, service.openaiClient)
	assert.Equal(t, anthropicClient, service.anthropicClient)
}

func TestNewChatService_WithNilAnthropic(t *testing.T) {
	openaiClient := &clients.OpenAIClient{}
	logger := zap.NewNop()

	service := NewChatService(openaiClient, nil, logger)

	assert.NotNil(t, service)
	assert.Equal(t, openaiClient, service.openaiClient)
	assert.Nil(t, service.anthropicClient)
}

func TestNewChatService_WithNilLogger(t *testing.T) {
	openaiClient := &clients.OpenAIClient{}
	anthropicClient := &clients.AnthropicClient{}

	service := NewChatService(openaiClient, anthropicClient, nil)

	assert.NotNil(t, service)
	assert.Nil(t, service.logger)
}

func TestNewChatService_AllNil(t *testing.T) {
	service := NewChatService(nil, nil, nil)

	assert.NotNil(t, service)
	assert.Nil(t, service.openaiClient)
	assert.Nil(t, service.anthropicClient)
	assert.Nil(t, service.logger)
}

func TestChatService_Chat_EmptyMessages(t *testing.T) {
	service := NewChatService(nil, nil, zap.NewNop())
	ctx := context.Background()

	response, err := service.Chat(ctx, []ChatMessage{}, "gpt-4o", 0.7)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Contains(t, err.Error(), "messages array cannot be empty")
}

func TestChatService_Chat_NoModelSpecified(t *testing.T) {
	service := NewChatService(nil, nil, zap.NewNop())
	ctx := context.Background()
	messages := []ChatMessage{
		{Role: "user", Content: "Hello"},
	}

	// Should error because no client configured, not because of model selection
	response, err := service.Chat(ctx, messages, "", 0.7)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Contains(t, err.Error(), "OpenAI client not configured")
}

func TestChatService_Chat_UnsupportedModel(t *testing.T) {
	service := NewChatService(nil, nil, zap.NewNop())
	ctx := context.Background()
	messages := []ChatMessage{
		{Role: "user", Content: "Hello"},
	}

	response, err := service.Chat(ctx, messages, "unsupported-model", 0.7)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Contains(t, err.Error(), "unsupported model")
}

func TestChatService_Chat_OpenAINoClient(t *testing.T) {
	service := NewChatService(nil, nil, zap.NewNop())
	ctx := context.Background()
	messages := []ChatMessage{
		{Role: "user", Content: "Hello"},
	}

	response, err := service.Chat(ctx, messages, "gpt-4o", 0.7)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Contains(t, err.Error(), "OpenAI client not configured")
}

func TestChatService_Chat_AnthropicNoClient(t *testing.T) {
	service := NewChatService(nil, nil, zap.NewNop())
	ctx := context.Background()
	messages := []ChatMessage{
		{Role: "user", Content: "Hello"},
	}

	response, err := service.Chat(ctx, messages, "claude-3-5-sonnet-20241022", 0.7)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Contains(t, err.Error(), "Anthropic client not configured")
}

func TestChatService_Fields(t *testing.T) {
	openaiClient := &clients.OpenAIClient{}
	anthropicClient := &clients.AnthropicClient{}
	logger := zap.NewNop()
	service := NewChatService(openaiClient, anthropicClient, logger)

	assert.NotNil(t, service.openaiClient)
	assert.NotNil(t, service.anthropicClient)
	assert.NotNil(t, service.logger)
}

func TestChatService_MultipleInstances(t *testing.T) {
	openaiClient := &clients.OpenAIClient{}
	anthropicClient := &clients.AnthropicClient{}
	logger := zap.NewNop()

	service1 := NewChatService(openaiClient, anthropicClient, logger)
	service2 := NewChatService(openaiClient, anthropicClient, logger)

	assert.NotNil(t, service1)
	assert.NotNil(t, service2)
	assert.Equal(t, openaiClient, service1.openaiClient)
	assert.Equal(t, openaiClient, service2.openaiClient)
}

func TestChatService_OpenAIClientStorage(t *testing.T) {
	openaiClient := &clients.OpenAIClient{}
	service := NewChatService(openaiClient, nil, nil)

	assert.Equal(t, openaiClient, service.openaiClient)
}

func TestChatService_AnthropicClientStorage(t *testing.T) {
	anthropicClient := &clients.AnthropicClient{}
	service := NewChatService(nil, anthropicClient, nil)

	assert.Equal(t, anthropicClient, service.anthropicClient)
}

func TestChatService_LoggerStorage(t *testing.T) {
	logger := zap.NewNop()
	service := NewChatService(nil, nil, logger)

	assert.Equal(t, logger, service.logger)
}

func TestChatService_Constructor(t *testing.T) {
	service := NewChatService(nil, nil, nil)

	assert.Nil(t, service.openaiClient)
	assert.Nil(t, service.anthropicClient)
	assert.Nil(t, service.logger)
}

// Tests for model detection functions

func TestIsOpenAIModel_GPT4o(t *testing.T) {
	assert.True(t, isOpenAIModel("gpt-4o"))
}

func TestIsOpenAIModel_GPT4oMini(t *testing.T) {
	assert.True(t, isOpenAIModel("gpt-4o-mini"))
}

func TestIsOpenAIModel_GPT4(t *testing.T) {
	assert.True(t, isOpenAIModel("gpt-4"))
}

func TestIsOpenAIModel_GPT4Turbo(t *testing.T) {
	assert.True(t, isOpenAIModel("gpt-4-turbo"))
}

func TestIsOpenAIModel_GPT35Turbo(t *testing.T) {
	assert.True(t, isOpenAIModel("gpt-3.5-turbo"))
}

func TestIsOpenAIModel_UnknownModel(t *testing.T) {
	assert.False(t, isOpenAIModel("unknown-model"))
}

func TestIsOpenAIModel_AnthropicModel(t *testing.T) {
	assert.False(t, isOpenAIModel("claude-3-5-sonnet-20241022"))
}

func TestIsAnthropicModel_Claude3Sonnet(t *testing.T) {
	assert.True(t, isAnthropicModel("claude-3-5-sonnet-20241022"))
}

func TestIsAnthropicModel_Claude3Haiku(t *testing.T) {
	assert.True(t, isAnthropicModel("claude-3-5-haiku-20241022"))
}

func TestIsAnthropicModel_Claude3Opus(t *testing.T) {
	assert.True(t, isAnthropicModel("claude-3-opus-20240229"))
}

func TestIsAnthropicModel_Claude2(t *testing.T) {
	assert.True(t, isAnthropicModel("claude-2.1"))
}

func TestIsAnthropicModel_UnknownModel(t *testing.T) {
	assert.False(t, isAnthropicModel("unknown-model"))
}

func TestIsAnthropicModel_OpenAIModel(t *testing.T) {
	assert.False(t, isAnthropicModel("gpt-4o"))
}

// Tests for ChatMessage struct

func TestChatMessage_Structure(t *testing.T) {
	msg := ChatMessage{
		Role:    "user",
		Content: "Hello, world!",
	}

	assert.Equal(t, "user", msg.Role)
	assert.Equal(t, "Hello, world!", msg.Content)
}

func TestChatMessage_AssistantRole(t *testing.T) {
	msg := ChatMessage{
		Role:    "assistant",
		Content: "Hi there!",
	}

	assert.Equal(t, "assistant", msg.Role)
}

func TestChatMessage_SystemRole(t *testing.T) {
	msg := ChatMessage{
		Role:    "system",
		Content: "You are a helpful assistant.",
	}

	assert.Equal(t, "system", msg.Role)
}

// Tests for ChatResponse struct

func TestChatResponse_Structure(t *testing.T) {
	response := ChatResponse{
		Message: ChatMessage{
			Role:    "assistant",
			Content: "Response content",
		},
		Model:        "gpt-4o",
		TokensUsed:   150,
		FinishReason: "stop",
	}

	assert.Equal(t, "assistant", response.Message.Role)
	assert.Equal(t, "Response content", response.Message.Content)
	assert.Equal(t, "gpt-4o", response.Model)
	assert.Equal(t, 150, response.TokensUsed)
	assert.Equal(t, "stop", response.FinishReason)
}

func TestChatResponse_WithoutTokens(t *testing.T) {
	response := ChatResponse{
		Message: ChatMessage{
			Role:    "assistant",
			Content: "Response",
		},
		Model: "gpt-4o",
	}

	assert.Equal(t, 0, response.TokensUsed)
	assert.Equal(t, "", response.FinishReason)
}

func TestChatService_ImplementsExpectedMethods(t *testing.T) {
	service := NewChatService(nil, nil, nil)

	assert.NotNil(t, service)
	// Service should have Chat method callable
}

func TestChatService_AllClients(t *testing.T) {
	openai := &clients.OpenAIClient{}
	anthropic := &clients.AnthropicClient{}
	logger := zap.NewNop()

	service := NewChatService(openai, anthropic, logger)

	assert.NotNil(t, service)
	assert.NotNil(t, service.openaiClient)
	assert.NotNil(t, service.anthropicClient)
	assert.NotNil(t, service.logger)
}
