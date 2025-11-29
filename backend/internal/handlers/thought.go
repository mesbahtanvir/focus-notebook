package handlers

import (
	"fmt"
	"net/http"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/models"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
)

// ThoughtHandler handles thought processing requests
type ThoughtHandler struct {
	thoughtProcessingSvc *services.ThoughtProcessingService
	logger               *zap.Logger
}

// NewThoughtHandler creates a new thought handler
func NewThoughtHandler(thoughtProcessingSvc *services.ThoughtProcessingService, logger *zap.Logger) *ThoughtHandler {
	return &ThoughtHandler{
		thoughtProcessingSvc: thoughtProcessingSvc,
		logger:               logger,
	}
}

// ProcessThought handles POST /api/process-thought
func (h *ThoughtHandler) ProcessThought(w http.ResponseWriter, r *http.Request) {
	// Parse request
	var req models.ThoughtProcessingRequest
	if err := utils.ParseJSON(r, &req); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	// Validate request
	if req.ThoughtID == "" && req.Thought == nil {
		utils.RespondError(w, "thoughtId or thought is required", http.StatusBadRequest)
		return
	}

	// Get user context
	uid := r.Context().Value("uid").(string)

	h.logger.Info("Processing thought request",
		zap.String("uid", uid),
		zap.String("thoughtId", req.ThoughtID),
		zap.String("model", req.Model),
	)

	// Get thought data
	thoughtID := req.ThoughtID
	thought := req.Thought

	// If thought data is embedded, use it directly
	if thought == nil {
		utils.RespondError(w, "thought data is required", http.StatusBadRequest)
		return
	}

	// Process thought
	err := h.thoughtProcessingSvc.ProcessThought(r.Context(), thoughtID, thought, req.Model)
	if err != nil {
		h.logger.Error("Failed to process thought",
			zap.Error(err),
			zap.String("uid", uid),
			zap.String("thoughtId", thoughtID),
		)
		utils.RespondError(w, fmt.Sprintf("Failed to process thought: %v", err), http.StatusInternalServerError)
		return
	}

	// Success response
	utils.RespondSuccess(w, map[string]interface{}{
		"thoughtId": thoughtID,
		"processed": true,
	}, "Thought processed successfully")
}

// ReprocessThought handles POST /api/reprocess-thought
func (h *ThoughtHandler) ReprocessThought(w http.ResponseWriter, r *http.Request) {
	// Parse request
	var req models.ThoughtProcessingRequest
	if err := utils.ParseJSON(r, &req); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	// Validate request
	if req.ThoughtID == "" && req.Thought == nil {
		utils.RespondError(w, "thoughtId or thought is required", http.StatusBadRequest)
		return
	}

	uid := r.Context().Value("uid").(string)

	h.logger.Info("Reprocessing thought request",
		zap.String("uid", uid),
		zap.String("thoughtId", req.ThoughtID),
	)

	thoughtID := req.ThoughtID
	thought := req.Thought

	if thought == nil {
		utils.RespondError(w, "thought data is required", http.StatusBadRequest)
		return
	}

	// Remove "processed" tag to allow reprocessing
	if tags, ok := thought["tags"].([]interface{}); ok {
		var newTags []interface{}
		for _, tag := range tags {
			if tag != "processed" {
				newTags = append(newTags, tag)
			}
		}
		thought["tags"] = newTags
	}

	// Process thought
	err := h.thoughtProcessingSvc.ProcessThought(r.Context(), thoughtID, thought, req.Model)
	if err != nil {
		h.logger.Error("Failed to reprocess thought",
			zap.Error(err),
			zap.String("uid", uid),
			zap.String("thoughtId", thoughtID),
		)
		utils.RespondError(w, fmt.Sprintf("Failed to reprocess thought: %v", err), http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"thoughtId":   thoughtID,
		"reprocessed": true,
	}, "Thought reprocessed successfully")
}

// RevertThoughtProcessing handles POST /api/revert-thought-processing
func (h *ThoughtHandler) RevertThoughtProcessing(w http.ResponseWriter, r *http.Request) {
	// Parse request
	var req struct {
		ThoughtID string `json:"thoughtId"`
	}
	if err := utils.ParseJSON(r, &req); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.ThoughtID == "" {
		utils.RespondError(w, "thoughtId is required", http.StatusBadRequest)
		return
	}

	uid := r.Context().Value("uid").(string)

	h.logger.Info("Reverting thought processing",
		zap.String("uid", uid),
		zap.String("thoughtId", req.ThoughtID),
	)

	// TODO: Implement revert logic
	// This would involve:
	// 1. Removing the "processed" tag
	// 2. Deleting AI-created tasks/projects/relationships
	// 3. Clearing aiMetadata
	// 4. Resetting aiProcessingStatus

	utils.RespondSuccess(w, map[string]interface{}{
		"thoughtId": req.ThoughtID,
		"reverted":  true,
	}, "Thought processing reverted (feature coming soon)")
}
