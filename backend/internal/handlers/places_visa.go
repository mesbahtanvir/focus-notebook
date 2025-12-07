package handlers

import (
	"encoding/json"
	"net/http"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
)

// PlaceInsightsHandler handles place insights requests
type PlaceInsightsHandler struct {
	placeInsightsService *services.PlaceInsightsService
	logger               *zap.Logger
}

// NewPlaceInsightsHandler creates a new place insights handler
func NewPlaceInsightsHandler(
	placeInsightsService *services.PlaceInsightsService,
	logger *zap.Logger,
) *PlaceInsightsHandler {
	return &PlaceInsightsHandler{
		placeInsightsService: placeInsightsService,
		logger:               logger,
	}
}

// GenerateInsightsRequest represents the request to generate place insights
type GenerateInsightsRequest struct {
	DestinationName string `json:"destinationName"`
	Country         string `json:"country,omitempty"`
}

// GenerateInsightsResponse represents the response with place insights
type GenerateInsightsResponse struct {
	Result *services.PlaceInsights `json:"result"`
}

// GenerateInsights handles POST /api/place-insights
func (h *PlaceInsightsHandler) GenerateInsights(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value("userID").(string)

	var req GenerateInsightsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.WriteError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Trim and validate
	destinationName := utils.TrimString(req.DestinationName)
	country := utils.TrimString(req.Country)

	if destinationName == "" {
		utils.WriteError(w, "destinationName is required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Generating place insights",
		zap.String("uid", userID),
		zap.String("destination", destinationName),
		zap.String("country", country),
	)

	insights, err := h.placeInsightsService.GeneratePlaceInsights(ctx, destinationName, country)
	if err != nil {
		h.logger.Error("Failed to generate place insights",
			zap.String("uid", userID),
			zap.String("destination", destinationName),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to generate place insights", http.StatusInternalServerError)
		return
	}

	response := GenerateInsightsResponse{
		Result: insights,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}

// VisaHandler handles visa requirements requests
type VisaHandler struct {
	visaService *services.VisaService
	logger      *zap.Logger
}

// NewVisaHandler creates a new visa handler
func NewVisaHandler(visaService *services.VisaService, logger *zap.Logger) *VisaHandler {
	return &VisaHandler{
		visaService: visaService,
		logger:      logger,
	}
}

// GetVisaRequirementsResponse represents the response with visa requirements
type GetVisaRequirementsResponse struct {
	Success      bool                       `json:"success"`
	Count        int                        `json:"count"`
	Requirements []services.VisaRequirement `json:"requirements"`
}

// GetVisaRequirements handles GET /api/visa-requirements
func (h *VisaHandler) GetVisaRequirements(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get nationality from query parameter
	nationality := r.URL.Query().Get("nationality")

	if nationality == "" {
		utils.WriteError(w, "nationality query parameter is required", http.StatusBadRequest)
		return
	}

	h.logger.Info("Getting visa requirements",
		zap.String("nationality", nationality),
	)

	requirements, err := h.visaService.GetVisaRequirements(ctx, nationality)
	if err != nil {
		h.logger.Error("Failed to get visa requirements",
			zap.String("nationality", nationality),
			zap.Error(err),
		)
		utils.WriteError(w, "Failed to get visa requirements", http.StatusInternalServerError)
		return
	}

	response := GetVisaRequirementsResponse{
		Success:      true,
		Count:        len(requirements),
		Requirements: requirements,
	}

	utils.WriteJSON(w, response, http.StatusOK)
}
