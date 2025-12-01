package services

import (
	"context"
	"fmt"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"go.uber.org/zap"
)

// ChatService handles AI chat conversations
type ChatService struct {
	openaiClient    *clients.OpenAIClient
	anthropicClient *clients.AnthropicClient
	logger          *zap.Logger
}

// NewChatService creates a new chat service
func NewChatService(
	openaiClient *clients.OpenAIClient,
	anthropicClient *clients.AnthropicClient,
	logger *zap.Logger,
) *ChatService {
	return &ChatService{
		openaiClient:    openaiClient,
		anthropicClient: anthropicClient,
		logger:          logger,
	}
}

// ChatMessage represents a single message in a conversation
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse represents the response from a chat completion
type ChatResponse struct {
	Message      ChatMessage `json:"message"`
	Model        string      `json:"model"`
	TokensUsed   int         `json:"tokensUsed,omitempty"`
	FinishReason string      `json:"finishReason,omitempty"`
}

// Chat processes a chat conversation and returns a response
func (s *ChatService) Chat(
	ctx context.Context,
	messages []ChatMessage,
	model string,
	temperature float32,
) (*ChatResponse, error) {
	if len(messages) == 0 {
		return nil, fmt.Errorf("messages array cannot be empty")
	}

	// Default to GPT-4o if no model specified
	if model == "" {
		model = "gpt-4o"
	}

	s.logger.Info("Processing chat request",
		zap.String("model", model),
		zap.Int("messageCount", len(messages)),
	)

	// Route to appropriate AI provider based on model
	if isOpenAIModel(model) {
		return s.chatWithOpenAI(ctx, messages, model, temperature)
	} else if isAnthropicModel(model) {
		return s.chatWithAnthropic(ctx, messages, model, temperature)
	}

	return nil, fmt.Errorf("unsupported model: %s", model)
}

// chatWithOpenAI handles chat using OpenAI
func (s *ChatService) chatWithOpenAI(
	ctx context.Context,
	messages []ChatMessage,
	model string,
	temperature float32,
) (*ChatResponse, error) {
	if s.openaiClient == nil {
		return nil, fmt.Errorf("OpenAI client not configured")
	}

	// Convert messages to OpenAI format
	openaiMessages := make([]clients.ChatMessage, len(messages))
	for i, msg := range messages {
		openaiMessages[i] = clients.ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	// Make request to OpenAI
	response, err := s.openaiClient.ChatCompletion(ctx, clients.ChatCompletionRequest{
		Model:       model,
		Messages:    openaiMessages,
		Temperature: temperature,
		MaxTokens:   2000, // Allow longer responses for chat
	})

	if err != nil {
		return nil, fmt.Errorf("OpenAI API error: %w", err)
	}

	return &ChatResponse{
		Message: ChatMessage{
			Role:    "assistant",
			Content: response.Content,
		},
		Model:        response.Model,
		TokensUsed:   response.TokensUsed,
		FinishReason: response.FinishReason,
	}, nil
}

// chatWithAnthropic handles chat using Anthropic Claude
func (s *ChatService) chatWithAnthropic(
	ctx context.Context,
	messages []ChatMessage,
	model string,
	temperature float32,
) (*ChatResponse, error) {
	if s.anthropicClient == nil {
		return nil, fmt.Errorf("Anthropic client not configured")
	}

	// Anthropic requires at least one message and the first message must be from the user
	if len(messages) == 0 {
		return nil, fmt.Errorf("messages array cannot be empty")
	}

	// Convert messages to Anthropic format (using the shared ChatMessage type)
	anthropicMessages := make([]clients.ChatMessage, 0, len(messages))
	for _, msg := range messages {
		anthropicMessages = append(anthropicMessages, clients.ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Make request to Anthropic using ChatCompletion (same interface as OpenAI)
	response, err := s.anthropicClient.ChatCompletion(ctx, clients.ChatCompletionRequest{
		Model:       model,
		Messages:    anthropicMessages,
		MaxTokens:   2000,
		Temperature: temperature,
	})

	if err != nil {
		return nil, fmt.Errorf("Anthropic API error: %w", err)
	}

	return &ChatResponse{
		Message: ChatMessage{
			Role:    "assistant",
			Content: response.Content,
		},
		Model:        response.Model,
		TokensUsed:   response.TokensUsed,
		FinishReason: response.FinishReason,
	}, nil
}

// isOpenAIModel checks if the model is an OpenAI model
func isOpenAIModel(model string) bool {
	openaiModels := map[string]bool{
		"gpt-4o":             true,
		"gpt-4o-mini":        true,
		"gpt-4":              true,
		"gpt-4-turbo":        true,
		"gpt-3.5-turbo":      true,
		"gpt-4-1106-preview": true,
		"gpt-4-0125-preview": true,
	}
	return openaiModels[model]
}

// isAnthropicModel checks if the model is an Anthropic model
func isAnthropicModel(model string) bool {
	anthropicModels := map[string]bool{
		"claude-3-5-sonnet-20241022": true,
		"claude-3-5-haiku-20241022":  true,
		"claude-3-opus-20240229":     true,
		"claude-3-sonnet-20240229":   true,
		"claude-3-haiku-20240307":    true,
		"claude-2.1":                 true,
		"claude-2.0":                 true,
	}
	return anthropicModels[model]
}
