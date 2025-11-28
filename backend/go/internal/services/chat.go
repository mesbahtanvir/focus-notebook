package services

import (
	"context"
	"fmt"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/clients"
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

	// Extract response
	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	choice := response.Choices[0]

	return &ChatResponse{
		Message: ChatMessage{
			Role:    choice.Message.Role,
			Content: choice.Message.Content,
		},
		Model:        response.Model,
		TokensUsed:   response.Usage.TotalTokens,
		FinishReason: choice.FinishReason,
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

	// Separate system message if present
	var systemMessage string
	anthropicMessages := make([]clients.AnthropicMessage, 0, len(messages))

	for _, msg := range messages {
		if msg.Role == "system" {
			// Anthropic uses a separate system parameter
			systemMessage = msg.Content
		} else {
			anthropicMessages = append(anthropicMessages, clients.AnthropicMessage{
				Role:    msg.Role,
				Content: msg.Content,
			})
		}
	}

	// Make request to Anthropic
	response, err := s.anthropicClient.CreateMessage(ctx, clients.AnthropicRequest{
		Model:       model,
		Messages:    anthropicMessages,
		System:      systemMessage,
		MaxTokens:   2000,
		Temperature: temperature,
	})

	if err != nil {
		return nil, fmt.Errorf("Anthropic API error: %w", err)
	}

	// Extract text content from response
	var content string
	if len(response.Content) > 0 {
		if textContent, ok := response.Content[0].(map[string]interface{}); ok {
			if text, ok := textContent["text"].(string); ok {
				content = text
			}
		}
	}

	tokensUsed := 0
	if response.Usage != nil {
		tokensUsed = response.Usage.InputTokens + response.Usage.OutputTokens
	}

	return &ChatResponse{
		Message: ChatMessage{
			Role:    "assistant",
			Content: content,
		},
		Model:        response.Model,
		TokensUsed:   tokensUsed,
		FinishReason: response.StopReason,
	}, nil
}

// isOpenAIModel checks if the model is an OpenAI model
func isOpenAIModel(model string) bool {
	openaiModels := map[string]bool{
		"gpt-4o":            true,
		"gpt-4o-mini":       true,
		"gpt-4":             true,
		"gpt-4-turbo":       true,
		"gpt-3.5-turbo":     true,
		"gpt-4-1106-preview": true,
		"gpt-4-0125-preview": true,
	}
	return openaiModels[model]
}

// isAnthropicModel checks if the model is an Anthropic model
func isAnthropicModel(model string) bool {
	anthropicModels := map[string]bool{
		"claude-3-5-sonnet-20241022":    true,
		"claude-3-5-haiku-20241022":     true,
		"claude-3-opus-20240229":        true,
		"claude-3-sonnet-20240229":      true,
		"claude-3-haiku-20240307":       true,
		"claude-2.1":                    true,
		"claude-2.0":                    true,
	}
	return anthropicModels[model]
}
