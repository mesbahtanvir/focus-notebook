package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
	"go.uber.org/zap"
)

// PackingListHandler handles packing list requests
type PackingListHandler struct {
	packingListService *services.PackingListService
	logger             *zap.Logger
}

// NewPackingListHandler creates a new packing list handler
func NewPackingListHandler(
	packingListService *services.PackingListService,
	logger *zap.Logger,
) *PackingListHandler {
	return &PackingListHandler{
		packingListService: packingListService,
		logger:             logger,
	}
}

// CreatePackingListRequest represents the request to create a packing list
type CreatePackingListRequest struct {
	TripID string `json:"tripId"`
}

// CreatePackingListResponse represents the response with created packing list
type CreatePackingListResponse struct {
	PackingList *services.PackingList `json:"packingList"`
}

// CreatePackingList handles POST /api/packing-list/create
func (h *PackingListHandler) CreatePackingList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req CreatePackingListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.TripID == "" {
		utils.WriteError(w, "tripId is required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Creating packing list",
		zap.String("uid", userID),
		zap.String("tripId", req.TripID),
	)

	packingList, err := h.packingListService.CreatePackingList(ctx, userID, req.TripID)
	if err != nil {
		h.logger.Error("Failed to create packing list",
			zap.String("uid", userID),
			zap.String("tripId", req.TripID),
			zap.Error(err),
		)

		// Check for specific error types
		if err.Error() == "trip not found" || err.Error() == "trip not found: not found" {
			utils.WriteError(w, "Trip not found", http.StatusNotFound)
			return
		}

		utils.WriteError(w, "Failed to create packing list", http.StatusInternalServerError)
		return
	}

	response := CreatePackingListResponse{
		PackingList: packingList,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}

// UpdatePackingListRequest represents the request to update a packing list
type UpdatePackingListRequest struct {
	TripID  string                 `json:"tripId"`
	Updates map[string]interface{} `json:"updates"`
}

// UpdatePackingListResponse represents the response for update
type UpdatePackingListResponse struct {
	Success bool `json:"success"`
}

// UpdatePackingList handles POST /api/packing-list/update
func (h *PackingListHandler) UpdatePackingList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req UpdatePackingListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.TripID == "" {
		utils.WriteError(w, "tripId is required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Updating packing list",
		zap.String("uid", userID),
		zap.String("tripId", req.TripID),
	)

	err := h.packingListService.UpdatePackingList(ctx, userID, req.TripID, req.Updates)
	if err != nil {
		h.logger.Error("Failed to update packing list",
			zap.String("uid", userID),
			zap.String("tripId", req.TripID),
			zap.Error(err),
		)

		// Check for specific error types
		if err.Error() == "trip not found" || err.Error() == "trip not found: not found" {
			utils.WriteError(w, "Trip not found", http.StatusNotFound)
			return
		}
		if err.Error() == "packing list not found" || err.Error() == "packing list not found: not found" {
			utils.WriteError(w, "Packing list not found. Create one first.", http.StatusNotFound)
			return
		}

		utils.WriteError(w, "Failed to update packing list", http.StatusInternalServerError)
		return
	}

	response := UpdatePackingListResponse{
		Success: true,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}

// SetItemStatusRequest represents the request to set item status
type SetItemStatusRequest struct {
	TripID string `json:"tripId"`
	ItemID string `json:"itemId"`
	Status string `json:"status"`
}

// SetItemStatusResponse represents the response for set status
type SetItemStatusResponse struct {
	Success bool `json:"success"`
}

// SetItemStatus handles POST /api/packing-list/toggle-item
func (h *PackingListHandler) SetItemStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req SetItemStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.TripID == "" || req.ItemID == "" || req.Status == "" {
		utils.WriteError(w, "tripId, itemId, and status are required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Setting item status",
		zap.String("uid", userID),
		zap.String("tripId", req.TripID),
		zap.String("itemId", req.ItemID),
		zap.String("status", req.Status),
	)

	err := h.packingListService.SetItemStatus(ctx, userID, req.TripID, req.ItemID, req.Status)
	if err != nil {
		h.logger.Error("Failed to set item status",
			zap.String("uid", userID),
			zap.String("tripId", req.TripID),
			zap.String("itemId", req.ItemID),
			zap.Error(err),
		)

		// Check for specific error types
		if err.Error() == "trip not found" || err.Error() == "trip not found: not found" {
			utils.WriteError(w, "Trip not found", http.StatusNotFound)
			return
		}
		if err.Error() == "packing list not found" || err.Error() == "packing list not found: not found" {
			utils.WriteError(w, "Packing list not found", http.StatusNotFound)
			return
		}
		if err.Error() == "invalid status: must be one of unpacked, packed, later, no-need" {
			utils.WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}

		utils.WriteError(w, "Failed to set item status", http.StatusInternalServerError)
		return
	}

	response := SetItemStatusResponse{
		Success: true,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}
