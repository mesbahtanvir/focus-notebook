package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

// Tests for ChatHandler

func TestNewChatHandler(t *testing.T) {
	chatService := &services.ChatService{}
	logger := zap.NewNop()

	handler := NewChatHandler(chatService, logger)

	assert.NotNil(t, handler)
	assert.Equal(t, chatService, handler.chatService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewChatHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewChatHandler(nil, logger)

	assert.NotNil(t, handler)
	assert.Nil(t, handler.chatService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewChatHandler_WithNilLogger(t *testing.T) {
	chatService := &services.ChatService{}

	handler := NewChatHandler(chatService, nil)

	assert.NotNil(t, handler)
	assert.Equal(t, chatService, handler.chatService)
	assert.Nil(t, handler.logger)
}

func TestNewChatHandler_AllNil(t *testing.T) {
	handler := NewChatHandler(nil, nil)

	assert.NotNil(t, handler)
	assert.Nil(t, handler.chatService)
	assert.Nil(t, handler.logger)
}

func TestChatHandler_Fields(t *testing.T) {
	chatService := &services.ChatService{}
	logger := zap.NewNop()
	handler := NewChatHandler(chatService, logger)

	assert.NotNil(t, handler.chatService)
	assert.NotNil(t, handler.logger)
}

func TestChatHandler_ServiceStorage(t *testing.T) {
	chatService := &services.ChatService{}
	handler := NewChatHandler(chatService, nil)

	assert.Equal(t, chatService, handler.chatService)
}

func TestChatHandler_LoggerStorage(t *testing.T) {
	logger := zap.NewNop()
	handler := NewChatHandler(nil, logger)

	assert.Equal(t, logger, handler.logger)
}

func TestChatHandler_Constructor(t *testing.T) {
	handler := NewChatHandler(nil, nil)

	assert.Nil(t, handler.chatService)
	assert.Nil(t, handler.logger)
}

func TestChatHandler_MultipleInstances(t *testing.T) {
	chatService := &services.ChatService{}
	logger := zap.NewNop()

	handler1 := NewChatHandler(chatService, logger)
	handler2 := NewChatHandler(chatService, logger)

	assert.NotNil(t, handler1)
	assert.NotNil(t, handler2)
	assert.Equal(t, chatService, handler1.chatService)
	assert.Equal(t, chatService, handler2.chatService)
}

func TestChatHandler_WithService(t *testing.T) {
	chatService := &services.ChatService{}
	handler := NewChatHandler(chatService, nil)

	assert.NotNil(t, handler)
	assert.NotNil(t, handler.chatService)
}

func TestChatHandler_WithLogger(t *testing.T) {
	logger := zap.NewNop()
	handler := NewChatHandler(nil, logger)

	assert.NotNil(t, handler)
	assert.NotNil(t, handler.logger)
}

func TestChatHandler_ImplementsExpectedMethods(t *testing.T) {
	handler := NewChatHandler(nil, nil)

	assert.NotNil(t, handler)
	// Handler should have Chat method
}

// Tests for ChatRequest struct

func TestChatRequest_Structure(t *testing.T) {
	req := ChatRequest{
		Messages: []services.ChatMessage{
			{Role: "user", Content: "Hello"},
		},
		Model:       "gpt-4o",
		Temperature: 0.7,
	}

	assert.Equal(t, 1, len(req.Messages))
	assert.Equal(t, "gpt-4o", req.Model)
	assert.Equal(t, float32(0.7), req.Temperature)
}

func TestChatRequest_EmptyMessages(t *testing.T) {
	req := ChatRequest{
		Messages:    []services.ChatMessage{},
		Model:       "gpt-4o",
		Temperature: 0.7,
	}

	assert.Equal(t, 0, len(req.Messages))
}

func TestChatRequest_NoModel(t *testing.T) {
	req := ChatRequest{
		Messages: []services.ChatMessage{
			{Role: "user", Content: "Hello"},
		},
		Temperature: 0.7,
	}

	assert.Equal(t, "", req.Model)
}

func TestChatRequest_DefaultTemperature(t *testing.T) {
	req := ChatRequest{
		Messages: []services.ChatMessage{
			{Role: "user", Content: "Hello"},
		},
	}

	assert.Equal(t, float32(0), req.Temperature)
}

// Tests for ChatResponsePayload struct

func TestChatResponsePayload_Structure(t *testing.T) {
	payload := ChatResponsePayload{
		Message: services.ChatMessage{
			Role:    "assistant",
			Content: "Hi there!",
		},
		Model:        "gpt-4o",
		TokensUsed:   150,
		FinishReason: "stop",
	}

	assert.Equal(t, "assistant", payload.Message.Role)
	assert.Equal(t, "gpt-4o", payload.Model)
	assert.Equal(t, 150, payload.TokensUsed)
	assert.Equal(t, "stop", payload.FinishReason)
}

func TestChatResponsePayload_EmptyValues(t *testing.T) {
	payload := ChatResponsePayload{
		Message: services.ChatMessage{},
		Model:   "",
	}

	assert.Equal(t, "", payload.Message.Role)
	assert.Equal(t, "", payload.Model)
	assert.Equal(t, 0, payload.TokensUsed)
}

func TestChatHandler_AllFields(t *testing.T) {
	chatService := &services.ChatService{}
	logger := zap.NewNop()

	handler := NewChatHandler(chatService, logger)

	assert.NotNil(t, handler.chatService)
	assert.NotNil(t, handler.logger)
}

func TestChatHandler_ConstructorVariations(t *testing.T) {
	// Variation 1: both nil
	h1 := NewChatHandler(nil, nil)
	assert.Nil(t, h1.chatService)
	assert.Nil(t, h1.logger)

	// Variation 2: service only
	service := &services.ChatService{}
	h2 := NewChatHandler(service, nil)
	assert.NotNil(t, h2.chatService)
	assert.Nil(t, h2.logger)

	// Variation 3: logger only
	logger := zap.NewNop()
	h3 := NewChatHandler(nil, logger)
	assert.Nil(t, h3.chatService)
	assert.NotNil(t, h3.logger)

	// Variation 4: both
	h4 := NewChatHandler(service, logger)
	assert.NotNil(t, h4.chatService)
	assert.NotNil(t, h4.logger)
}

func TestChatRequest_MultipleMessages(t *testing.T) {
	req := ChatRequest{
		Messages: []services.ChatMessage{
			{Role: "user", Content: "Hello"},
			{Role: "assistant", Content: "Hi there!"},
			{Role: "user", Content: "How are you?"},
		},
		Model:       "gpt-4o",
		Temperature: 0.8,
	}

	assert.Equal(t, 3, len(req.Messages))
	assert.Equal(t, "user", req.Messages[0].Role)
	assert.Equal(t, "assistant", req.Messages[1].Role)
}

func TestChatResponsePayload_MultipleFields(t *testing.T) {
	payload := ChatResponsePayload{
		Message: services.ChatMessage{
			Role:    "assistant",
			Content: "This is a response",
		},
		Model:        "claude-3-5-sonnet-20241022",
		TokensUsed:   500,
		FinishReason: "max_tokens",
	}

	assert.NotEmpty(t, payload.Message.Content)
	assert.NotEmpty(t, payload.Model)
	assert.Greater(t, payload.TokensUsed, 0)
}
