package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
)

// EntityGraphHandler handles entity graph requests
type EntityGraphHandler struct {
	svc    *services.EntityGraphService
	logger *zap.Logger
}

// NewEntityGraphHandler creates a new entity graph handler
func NewEntityGraphHandler(svc *services.EntityGraphService, logger *zap.Logger) *EntityGraphHandler {
	return &EntityGraphHandler{
		svc:    svc,
		logger: logger,
	}
}

// QueryRelationships queries relationships with filters
// GET /api/entity-graph/relationships?sourceType=task&sourceId=123&limit=50
// POST /api/entity-graph/relationships/query (for complex filters)
func (h *EntityGraphHandler) QueryRelationships(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	var filters services.RelationshipFilters

	// Support both GET with query params and POST with JSON body
	if r.Method == "POST" {
		if err := json.NewDecoder(r.Body).Decode(&filters); err != nil {
			utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}
	} else {
		// Parse query parameters
		filters = h.parseFiltersFromQuery(r)
	}

	h.logger.Debug("QueryRelationships request",
		zap.String("uid", uid),
		zap.Int("limit", filters.Limit),
	)

	// Query relationships
	relationships, totalCount, err := h.svc.QueryRelationships(ctx, uid, filters)
	if err != nil {
		h.logger.Error("Failed to query relationships", zap.Error(err))
		utils.RespondError(w, "Failed to query relationships", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"relationships": relationships,
		"total":         totalCount,
		"limit":         filters.Limit,
		"offset":        filters.Offset,
	}, "Relationships retrieved")
}

// parseFiltersFromQuery parses relationship filters from query parameters
func (h *EntityGraphHandler) parseFiltersFromQuery(r *http.Request) services.RelationshipFilters {
	filters := services.RelationshipFilters{}

	if sourceType := r.URL.Query().Get("sourceType"); sourceType != "" {
		et := services.EntityType(sourceType)
		filters.SourceType = &et
	}
	if sourceID := r.URL.Query().Get("sourceId"); sourceID != "" {
		filters.SourceID = &sourceID
	}
	if targetType := r.URL.Query().Get("targetType"); targetType != "" {
		et := services.EntityType(targetType)
		filters.TargetType = &et
	}
	if targetID := r.URL.Query().Get("targetId"); targetID != "" {
		filters.TargetID = &targetID
	}
	if relType := r.URL.Query().Get("relationshipType"); relType != "" {
		rt := services.RelationshipType(relType)
		filters.RelationshipType = &rt
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filters.Status = &status
	}
	if createdBy := r.URL.Query().Get("createdBy"); createdBy != "" {
		filters.CreatedBy = &createdBy
	}

	// Parse numeric filters
	if minStrength := r.URL.Query().Get("minStrength"); minStrength != "" {
		if val := parseInt(minStrength, 0); val > 0 {
			filters.MinStrength = &val
		}
	}
	if maxStrength := r.URL.Query().Get("maxStrength"); maxStrength != "" {
		if val := parseInt(maxStrength, 100); val > 0 {
			filters.MaxStrength = &val
		}
	}

	// Parse pagination
	filters.Limit = parseInt(r.URL.Query().Get("limit"), 100)
	filters.Offset = parseInt(r.URL.Query().Get("offset"), 0)

	// Parse sorting
	filters.SortBy = r.URL.Query().Get("sortBy")
	filters.SortOrder = r.URL.Query().Get("sortOrder")

	return filters
}

// GetLinkedEntities gets all entities linked to a specific entity
// GET /api/entity-graph/linked/{entityType}/{entityId}
func (h *EntityGraphHandler) GetLinkedEntities(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Get parameters from URL
	vars := mux.Vars(r)
	entityType := services.EntityType(vars["entityType"])
	entityID := vars["entityId"]

	if entityType == "" || entityID == "" {
		utils.RespondError(w, "Entity type and ID are required", http.StatusBadRequest)
		return
	}

	h.logger.Debug("GetLinkedEntities request",
		zap.String("uid", uid),
		zap.String("entityType", string(entityType)),
		zap.String("entityId", entityID),
	)

	// Get linked entities
	linkedEntities, err := h.svc.GetLinkedEntities(ctx, uid, entityType, entityID)
	if err != nil {
		h.logger.Error("Failed to get linked entities", zap.Error(err))
		utils.RespondError(w, "Failed to get linked entities", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, linkedEntities, "Linked entities retrieved")
}

// GetToolRelationships gets tool-related relationships
// GET /api/entity-graph/tools?toolType=thought-processing
func (h *EntityGraphHandler) GetToolRelationships(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Get optional tool type filter
	var toolType *string
	if tt := r.URL.Query().Get("toolType"); tt != "" {
		toolType = &tt
	}

	h.logger.Debug("GetToolRelationships request",
		zap.String("uid", uid),
	)

	// Get tool relationships
	toolRelationships, err := h.svc.GetToolRelationships(ctx, uid, toolType)
	if err != nil {
		h.logger.Error("Failed to get tool relationships", zap.Error(err))
		utils.RespondError(w, "Failed to get tool relationships", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, toolRelationships, "Tool relationships retrieved")
}

// GetRelationshipStats gets statistics about relationships
// GET /api/entity-graph/stats
func (h *EntityGraphHandler) GetRelationshipStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	h.logger.Debug("GetRelationshipStats request",
		zap.String("uid", uid),
	)

	// Get stats
	stats, err := h.svc.GetRelationshipStats(ctx, uid)
	if err != nil {
		h.logger.Error("Failed to get relationship stats", zap.Error(err))
		utils.RespondError(w, "Failed to get relationship stats", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, stats, "Relationship stats retrieved")
}

// Helper to parse integer from string
func parseInt(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	var val int
	_, err := fmt.Sscanf(s, "%d", &val)
	if err != nil {
		return defaultVal
	}
	return val
}
