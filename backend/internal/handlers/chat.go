package handlers

import (
	"encoding/json"
	"net/http"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
)

// ChatHandler handles chat API requests
type ChatHandler struct {
	chatService *services.ChatService
	logger      *zap.Logger
}

// NewChatHandler creates a new chat handler
func NewChatHandler(chatService *services.ChatService, logger *zap.Logger) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
		logger:      logger,
	}
}

// ChatRequest represents the request to the chat endpoint
type ChatRequest struct {
	Messages    []services.ChatMessage `json:"messages"`
	Model       string                 `json:"model,omitempty"`
	Temperature float32                `json:"temperature,omitempty"`
}

// ChatResponsePayload represents the full response payload
type ChatResponsePayload struct {
	Message      services.ChatMessage `json:"message"`
	Model        string               `json:"model"`
	TokensUsed   int                  `json:"tokensUsed,omitempty"`
	FinishReason string               `json:"finishReason,omitempty"`
}

// Chat handles POST /api/chat
func (h *ChatHandler) Chat(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if len(req.Messages) == 0 {
		utils.WriteError(w, "messages array cannot be empty", http.StatusBadRequest)
		return
	}

	// Default temperature to 0.7 if not specified
	temperature := req.Temperature
	if temperature == 0 {
		temperature = 0.7
	}

	// Validate temperature range
	if temperature < 0 || temperature > 2 {
		utils.WriteError(w, "temperature must be between 0 and 2", http.StatusBadRequest)
		return
	}

	h.logger.Info("Processing chat request",
		zap.String("uid", userID),
		zap.String("model", req.Model),
		zap.Int("messageCount", len(req.Messages)),
		zap.Float32("temperature", temperature),
	)

	// Process chat
	response, err := h.chatService.Chat(ctx, req.Messages, req.Model, temperature)
	if err != nil {
		h.logger.Error("Failed to process chat",
			zap.String("uid", userID),
			zap.Error(err),
		)

		// Return user-friendly error message
		utils.WriteJSON(w, map[string]interface{}{
			"error":   "AI service error",
			"message": "Oops! Something went wrong with the AI service. Let's try that again!",
		}, http.StatusOK) // Return 200 to avoid triggering error UI
		return
	}

	// Return successful response
	payload := ChatResponsePayload{
		Message:      response.Message,
		Model:        response.Model,
		TokensUsed:   response.TokensUsed,
		FinishReason: response.FinishReason,
	}

	utils.WriteJSON(w, payload, http.StatusOK)
}
