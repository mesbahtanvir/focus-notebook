package services

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/interfaces"
)

// EntityGraphService handles entity graph operations
type EntityGraphService struct {
	repo   interfaces.Repository
	logger *zap.Logger
}

// NewEntityGraphService creates a new entity graph service
func NewEntityGraphService(repo interfaces.Repository, logger *zap.Logger) *EntityGraphService {
	return &EntityGraphService{
		repo:   repo,
		logger: logger,
	}
}

// EntityType represents the type of entity in the graph
type EntityType string

const (
	EntityTypeThought EntityType = "thought"
	EntityTypeTask    EntityType = "task"
	EntityTypeProject EntityType = "project"
	EntityTypeGoal    EntityType = "goal"
	EntityTypeMood    EntityType = "mood"
	EntityTypeTool    EntityType = "tool"
	EntityTypePerson  EntityType = "person"
)

// RelationshipType represents the type of relationship
type RelationshipType string

const (
	RelationshipTypeCreatedFrom    RelationshipType = "created-from"
	RelationshipTypeLinkedTo       RelationshipType = "linked-to"
	RelationshipTypeRelatedTo      RelationshipType = "related-to"
	RelationshipTypeDependsOn      RelationshipType = "depends-on"
	RelationshipTypeToolProcessing RelationshipType = "tool-processing"
	RelationshipTypeToolPending    RelationshipType = "tool-pending"
	RelationshipTypeToolProcessed  RelationshipType = "tool-processed"
)

// RelationshipFilters represents filters for querying relationships
type RelationshipFilters struct {
	SourceType       *EntityType       `json:"sourceType,omitempty"`
	SourceID         *string           `json:"sourceId,omitempty"`
	TargetType       *EntityType       `json:"targetType,omitempty"`
	TargetID         *string           `json:"targetId,omitempty"`
	RelationshipType *RelationshipType `json:"relationshipType,omitempty"`
	Status           *string           `json:"status,omitempty"`    // active, archived, rejected
	CreatedBy        *string           `json:"createdBy,omitempty"` // ai, user
	MinStrength      *int              `json:"minStrength,omitempty"`
	MaxStrength      *int              `json:"maxStrength,omitempty"`
	Limit            int               `json:"limit,omitempty"`
	Offset           int               `json:"offset,omitempty"`
	SortBy           string            `json:"sortBy,omitempty"`    // createdAt, strength
	SortOrder        string            `json:"sortOrder,omitempty"` // asc, desc
}

// LinkedEntitiesResponse represents linked entities for a given entity
type LinkedEntitiesResponse struct {
	Tasks    []map[string]interface{} `json:"tasks"`
	Projects []map[string]interface{} `json:"projects"`
	Goals    []map[string]interface{} `json:"goals"`
	Thoughts []map[string]interface{} `json:"thoughts"`
	People   []map[string]interface{} `json:"people"`
	Count    struct {
		Tasks    int `json:"tasks"`
		Projects int `json:"projects"`
		Goals    int `json:"goals"`
		Thoughts int `json:"thoughts"`
		People   int `json:"people"`
		Total    int `json:"total"`
	} `json:"count"`
}

// ToolRelationshipsResponse represents tool-related relationships
type ToolRelationshipsResponse struct {
	Pending   []map[string]interface{} `json:"pending"`
	Processed []map[string]interface{} `json:"processed"`
	Count     struct {
		Pending   int `json:"pending"`
		Processed int `json:"processed"`
		Total     int `json:"total"`
	} `json:"count"`
}

// RelationshipStats represents statistics about relationships
type RelationshipStats struct {
	TotalRelationships int                      `json:"totalRelationships"`
	ByType             map[string]int           `json:"byType"`
	BySourceType       map[string]int           `json:"bySourceType"`
	ByTargetType       map[string]int           `json:"byTargetType"`
	ByStatus           map[string]int           `json:"byStatus"`
	ByCreator          map[string]int           `json:"byCreator"`
	AverageStrength    float64                  `json:"averageStrength"`
	ToolUsage          map[string]ToolUsageStat `json:"toolUsage"`
}

// ToolUsageStat represents usage statistics for a specific tool
type ToolUsageStat struct {
	ProcessedCount int       `json:"processedCount"`
	PendingCount   int       `json:"pendingCount"`
	LastProcessed  time.Time `json:"lastProcessed"`
}

// QueryRelationships queries relationships with filters
func (s *EntityGraphService) QueryRelationships(
	ctx context.Context,
	uid string,
	filters RelationshipFilters,
) ([]map[string]interface{}, int, error) {
	// Build base query
	query := s.repo.Collection("entityRelationships").Where("uid", "==", uid)

	// Apply filters
	if filters.SourceType != nil {
		query = query.Where("sourceType", "==", string(*filters.SourceType))
	}
	if filters.SourceID != nil {
		query = query.Where("sourceId", "==", *filters.SourceID)
	}
	if filters.TargetType != nil {
		query = query.Where("targetType", "==", string(*filters.TargetType))
	}
	if filters.TargetID != nil {
		query = query.Where("targetId", "==", *filters.TargetID)
	}
	if filters.RelationshipType != nil {
		query = query.Where("relationshipType", "==", string(*filters.RelationshipType))
	}
	if filters.Status != nil {
		query = query.Where("status", "==", *filters.Status)
	}
	if filters.CreatedBy != nil {
		query = query.Where("createdBy", "==", *filters.CreatedBy)
	}

	// Apply sorting
	sortBy := "createdAt"
	if filters.SortBy != "" {
		sortBy = filters.SortBy
	}
	sortOrder := "desc"
	if filters.SortOrder != "" {
		sortOrder = filters.SortOrder
	}

	if sortOrder == "asc" {
		query = query.OrderBy(sortBy, "asc")
	} else {
		query = query.OrderBy(sortBy, "desc")
	}

	// Get total count (before pagination)
	iter := query.Documents(ctx)
	defer iter.Stop()

	allResults := []map[string]interface{}{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching relationship", zap.Error(err))
			continue
		}

		relationship := doc.Data()

		// Apply strength filters (client-side since Firestore doesn't support range queries with other filters)
		if filters.MinStrength != nil || filters.MaxStrength != nil {
			strength := int(s.getFloatFromMap(relationship, "strength", 0))
			if filters.MinStrength != nil && strength < *filters.MinStrength {
				continue
			}
			if filters.MaxStrength != nil && strength > *filters.MaxStrength {
				continue
			}
		}

		allResults = append(allResults, relationship)
	}

	totalCount := len(allResults)

	// Apply pagination
	limit := filters.Limit
	if limit <= 0 {
		limit = 100 // Default limit
	}
	offset := filters.Offset
	if offset < 0 {
		offset = 0
	}

	// Calculate slice bounds
	start := offset
	if start > len(allResults) {
		start = len(allResults)
	}
	end := start + limit
	if end > len(allResults) {
		end = len(allResults)
	}

	paginatedResults := allResults[start:end]

	return paginatedResults, totalCount, nil
}

// GetLinkedEntities gets all entities linked to a specific entity
func (s *EntityGraphService) GetLinkedEntities(
	ctx context.Context,
	uid string,
	entityType EntityType,
	entityID string,
) (*LinkedEntitiesResponse, error) {
	response := &LinkedEntitiesResponse{
		Tasks:    []map[string]interface{}{},
		Projects: []map[string]interface{}{},
		Goals:    []map[string]interface{}{},
		Thoughts: []map[string]interface{}{},
		People:   []map[string]interface{}{},
	}

	// Query relationships where this entity is the source
	sourceQuery := s.repo.Collection("entityRelationships").
		Where("uid", "==", uid).
		Where("sourceType", "==", string(entityType)).
		Where("sourceId", "==", entityID).
		Where("status", "==", "active")

	// Query relationships where this entity is the target
	targetQuery := s.repo.Collection("entityRelationships").
		Where("uid", "==", uid).
		Where("targetType", "==", string(entityType)).
		Where("targetId", "==", entityID).
		Where("status", "==", "active")

	// Collect all linked entity IDs by type
	linkedIDs := map[EntityType]map[string]bool{
		EntityTypeTask:    {},
		EntityTypeProject: {},
		EntityTypeGoal:    {},
		EntityTypeThought: {},
		EntityTypePerson:  {},
	}

	// Process source relationships
	s.collectLinkedIDs(ctx, sourceQuery, entityType, "target", linkedIDs)

	// Process target relationships
	s.collectLinkedIDs(ctx, targetQuery, entityType, "source", linkedIDs)

	// Fetch actual entity data for linked IDs
	response.Tasks = s.fetchEntitiesByIDs(ctx, uid, "tasks", linkedIDs[EntityTypeTask])
	response.Projects = s.fetchEntitiesByIDs(ctx, uid, "projects", linkedIDs[EntityTypeProject])
	response.Goals = s.fetchEntitiesByIDs(ctx, uid, "goals", linkedIDs[EntityTypeGoal])
	response.Thoughts = s.fetchEntitiesByIDs(ctx, uid, "thoughts", linkedIDs[EntityTypeThought])
	response.People = s.fetchEntitiesByIDs(ctx, uid, "people", linkedIDs[EntityTypePerson])

	// Calculate counts
	response.Count.Tasks = len(response.Tasks)
	response.Count.Projects = len(response.Projects)
	response.Count.Goals = len(response.Goals)
	response.Count.Thoughts = len(response.Thoughts)
	response.Count.People = len(response.People)
	response.Count.Total = response.Count.Tasks + response.Count.Projects +
		response.Count.Goals + response.Count.Thoughts + response.Count.People

	return response, nil
}

// collectLinkedIDs collects linked entity IDs from relationships
func (s *EntityGraphService) collectLinkedIDs(
	ctx context.Context,
	query firestore.Query,
	excludeEntityType EntityType,
	direction string, // "source" or "target"
	linkedIDs map[EntityType]map[string]bool,
) {
	iter := query.Documents(ctx)
	defer iter.Stop()

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching relationship", zap.Error(err))
			continue
		}

		relationship := doc.Data()

		var linkedType, linkedID string
		if direction == "target" {
			linkedType = s.getStringFromMap(relationship, "targetType", "")
			linkedID = s.getStringFromMap(relationship, "targetId", "")
		} else {
			linkedType = s.getStringFromMap(relationship, "sourceType", "")
			linkedID = s.getStringFromMap(relationship, "sourceId", "")
		}

		if linkedType == "" || linkedID == "" {
			continue
		}

		// Don't include relationships to the same entity type (avoid self-loops)
		if linkedType == string(excludeEntityType) {
			continue
		}

		entityType := EntityType(linkedType)
		if _, ok := linkedIDs[entityType]; ok {
			linkedIDs[entityType][linkedID] = true
		}
	}
}

// fetchEntitiesByIDs fetches entity data for a set of IDs
func (s *EntityGraphService) fetchEntitiesByIDs(
	ctx context.Context,
	uid string,
	collection string,
	ids map[string]bool,
) []map[string]interface{} {
	if len(ids) == 0 {
		return []map[string]interface{}{}
	}

	// Convert map to slice
	idSlice := make([]string, 0, len(ids))
	for id := range ids {
		idSlice = append(idSlice, id)
	}

	// Firestore 'in' query supports max 10 items, so batch if needed
	results := []map[string]interface{}{}
	batchSize := 10

	for i := 0; i < len(idSlice); i += batchSize {
		end := i + batchSize
		if end > len(idSlice) {
			end = len(idSlice)
		}

		batch := idSlice[i:end]
		query := s.repo.Collection(collection).
			Where("uid", "==", uid).
			Where("id", "in", toInterfaceSlice(batch))

		iter := query.Documents(ctx)
		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				s.logger.Warn("Error fetching entity", zap.Error(err))
				continue
			}

			results = append(results, doc.Data())
		}
		iter.Stop()
	}

	return results
}

// GetToolRelationships gets tool-related relationships
func (s *EntityGraphService) GetToolRelationships(
	ctx context.Context,
	uid string,
	toolType *string,
) (*ToolRelationshipsResponse, error) {
	response := &ToolRelationshipsResponse{
		Pending:   []map[string]interface{}{},
		Processed: []map[string]interface{}{},
	}

	// Query pending tool processing
	pendingQuery := s.repo.Collection("entityRelationships").
		Where("uid", "==", uid).
		Where("relationshipType", "==", "tool-pending").
		Where("status", "==", "active")

	if toolType != nil {
		pendingQuery = pendingQuery.Where("sourceType", "==", "tool").
			Where("metadata.createdByTool", "==", *toolType)
	}

	// Query processed tool processing
	processedQuery := s.repo.Collection("entityRelationships").
		Where("uid", "==", uid).
		Where("relationshipType", "==", "tool-processed").
		Where("status", "==", "active")

	if toolType != nil {
		processedQuery = processedQuery.Where("sourceType", "==", "tool").
			Where("metadata.createdByTool", "==", *toolType)
	}

	// Fetch pending
	pendingIter := pendingQuery.Documents(ctx)
	defer pendingIter.Stop()
	for {
		doc, err := pendingIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching pending relationship", zap.Error(err))
			continue
		}
		response.Pending = append(response.Pending, doc.Data())
	}

	// Fetch processed
	processedIter := processedQuery.Documents(ctx)
	defer processedIter.Stop()
	for {
		doc, err := processedIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching processed relationship", zap.Error(err))
			continue
		}
		response.Processed = append(response.Processed, doc.Data())
	}

	// Calculate counts
	response.Count.Pending = len(response.Pending)
	response.Count.Processed = len(response.Processed)
	response.Count.Total = response.Count.Pending + response.Count.Processed

	return response, nil
}

// GetRelationshipStats calculates statistics about relationships
func (s *EntityGraphService) GetRelationshipStats(ctx context.Context, uid string) (*RelationshipStats, error) {
	stats := &RelationshipStats{
		ByType:       make(map[string]int),
		BySourceType: make(map[string]int),
		ByTargetType: make(map[string]int),
		ByStatus:     make(map[string]int),
		ByCreator:    make(map[string]int),
		ToolUsage:    make(map[string]ToolUsageStat),
	}

	// Query all relationships
	query := s.repo.Collection("entityRelationships").Where("uid", "==", uid)
	iter := query.Documents(ctx)
	defer iter.Stop()

	totalStrength := 0.0
	strengthCount := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching relationship", zap.Error(err))
			continue
		}

		relationship := doc.Data()
		stats.TotalRelationships++

		// Count by type
		relType := s.getStringFromMap(relationship, "relationshipType", "unknown")
		stats.ByType[relType]++

		// Count by source type
		sourceType := s.getStringFromMap(relationship, "sourceType", "unknown")
		stats.BySourceType[sourceType]++

		// Count by target type
		targetType := s.getStringFromMap(relationship, "targetType", "unknown")
		stats.ByTargetType[targetType]++

		// Count by status
		status := s.getStringFromMap(relationship, "status", "unknown")
		stats.ByStatus[status]++

		// Count by creator
		createdBy := s.getStringFromMap(relationship, "createdBy", "unknown")
		stats.ByCreator[createdBy]++

		// Calculate average strength
		strength := s.getFloatFromMap(relationship, "strength", 0)
		totalStrength += strength
		strengthCount++

		// Track tool usage
		if relType == "tool-processed" || relType == "tool-pending" {
			toolName := s.getStringFromMap(relationship, "metadata.createdByTool", "unknown")
			toolStat := stats.ToolUsage[toolName]

			if relType == "tool-processed" {
				toolStat.ProcessedCount++
				if processedAt := s.getStringFromMap(relationship, "toolProcessingData.processedAt", ""); processedAt != "" {
					if t, err := time.Parse(time.RFC3339, processedAt); err == nil {
						if toolStat.LastProcessed.IsZero() || t.After(toolStat.LastProcessed) {
							toolStat.LastProcessed = t
						}
					}
				}
			} else {
				toolStat.PendingCount++
			}

			stats.ToolUsage[toolName] = toolStat
		}
	}

	// Calculate average strength
	if strengthCount > 0 {
		stats.AverageStrength = totalStrength / float64(strengthCount)
	}

	return stats, nil
}

// Helper methods
func (s *EntityGraphService) getStringFromMap(m map[string]interface{}, key string, defaultVal string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultVal
}

func (s *EntityGraphService) getFloatFromMap(m map[string]interface{}, key string, defaultVal float64) float64 {
	if val, ok := m[key]; ok {
		switch v := val.(type) {
		case float64:
			return v
		case int64:
			return float64(v)
		case int:
			return float64(v)
		}
	}
	return defaultVal
}

// toInterfaceSlice converts []string to []interface{}
func toInterfaceSlice(slice []string) []interface{} {
	result := make([]interface{}, len(slice))
	for i, v := range slice {
		result[i] = v
	}
	return result
}
