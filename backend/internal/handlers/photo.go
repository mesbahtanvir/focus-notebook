package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
	"go.uber.org/zap"
)

// PhotoHandler handles photo-related requests
type PhotoHandler struct {
	photoService *services.PhotoService
	logger       *zap.Logger
}

// NewPhotoHandler creates a new photo handler
func NewPhotoHandler(photoService *services.PhotoService, logger *zap.Logger) *PhotoHandler {
	return &PhotoHandler{
		photoService: photoService,
		logger:       logger,
	}
}

// SubmitVoteRequest represents the request to submit a vote
type SubmitVoteRequest struct {
	SessionID string `json:"sessionId"`
	WinnerID  string `json:"winnerId"`
	LoserID   string `json:"loserId"`
}

// SubmitVote handles POST /api/photo/vote
func (h *PhotoHandler) SubmitVote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// VoterID can be anonymous or authenticated user
	voterID := ""
	if userID := ctx.Value("userID"); userID != nil {
		voterID = userID.(string)
	}

	var req SubmitVoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.SessionID == "" {
		utils.WriteError(w, "sessionId is required", http.StatusBadRequest)
		return
	}
	if req.WinnerID == "" || req.LoserID == "" {
		utils.WriteError(w, "winnerId and loserId are required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Submitting photo vote",
		zap.String("sessionId", req.SessionID),
		zap.String("winnerId", req.WinnerID),
		zap.String("loserId", req.LoserID),
		zap.String("voterId", voterID),
	)

	err := h.photoService.SubmitVote(ctx, req.SessionID, req.WinnerID, req.LoserID, voterID)
	if err != nil {
		h.logger.Error("Failed to submit vote",
			zap.String("sessionId", req.SessionID),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to submit vote", http.StatusInternalServerError)
		return
	}

	// Return empty response (matches Firebase callable function pattern)
	utils.WriteJSON(w, map[string]interface{}{}, http.StatusOK)
}

// GetNextPairRequest represents the request to get next photo pair
type GetNextPairRequest struct {
	SessionID string `json:"sessionId"`
}

// GetNextPairResponse represents the response with photo pair
type GetNextPairResponse struct {
	Left  *services.BattlePhoto `json:"left"`
	Right *services.BattlePhoto `json:"right"`
}

// GetNextPair handles POST /api/photo/next-pair
func (h *PhotoHandler) GetNextPair(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req GetNextPairRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.SessionID == "" {
		utils.WriteError(w, "sessionId is required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Getting next photo pair", zap.String("sessionId", req.SessionID))

	left, right, err := h.photoService.GetNextPair(ctx, req.SessionID)
	if err != nil {
		h.logger.Error("Failed to get next pair",
			zap.String("sessionId", req.SessionID),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to get next photo pair", http.StatusInternalServerError)
		return
	}

	response := GetNextPairResponse{
		Left:  left,
		Right: right,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}

// GetSignedURLRequest represents the request for a signed URL
type GetSignedURLRequest struct {
	Path      string `json:"path"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}

// GetSignedURLResponse represents the signed URL response
type GetSignedURLResponse struct {
	URL       string `json:"url"`
	ExpiresAt string `json:"expiresAt"`
}

// GetSignedURL handles POST /api/photo/signed-url
func (h *PhotoHandler) GetSignedURL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req GetSignedURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Path == "" {
		utils.WriteError(w, "path is required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Generating signed URL",
		zap.String("uid", userID),
		zap.String("path", req.Path),
	)

	// Parse expiry if provided
	var expiresAt *time.Time
	if req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err != nil {
			utils.WriteError(w, "invalid expiresAt format (use RFC3339)", http.StatusBadRequest)
			return
		}
		expiresAt = &t
	}

	url, expires, err := h.photoService.GetSignedURL(ctx, userID, req.Path, expiresAt)
	if err != nil {
		h.logger.Error("Failed to generate signed URL",
			zap.String("uid", userID),
			zap.String("path", req.Path),
			zap.Error(err),
		)

		// Check for permission denied error
		if err.Error() == "permission denied: cannot access other users' files" ||
			err.Error() == "invalid storage path" ||
			err.Error() == "path is incomplete" {
			utils.WriteError(w, err.Error(), http.StatusForbidden)
			return
		}

		utils.WriteError(w, "Failed to generate signed URL", http.StatusInternalServerError)
		return
	}

	response := GetSignedURLResponse{
		URL:       url,
		ExpiresAt: expires.Format(time.RFC3339),
	}

	utils.WriteJSON(w, response, http.StatusOK)
}
