package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository"
)

// ImportExportService handles import/export operations
type ImportExportService struct {
	repo   repository.Repository
	logger *zap.Logger
}

// NewImportExportService creates a new import/export service
func NewImportExportService(repo repository.Repository, logger *zap.Logger) *ImportExportService {
	return &ImportExportService{
		repo:   repo,
		logger: logger,
	}
}

// EntityType represents the type of entity being imported/exported
type EntityType string

const (
	EntityTypeTasks         EntityType = "tasks"
	EntityTypeProjects      EntityType = "projects"
	EntityTypeGoals         EntityType = "goals"
	EntityTypeThoughts      EntityType = "thoughts"
	EntityTypeMoods         EntityType = "moods"
	EntityTypeFocusSessions EntityType = "focusSessions"
	EntityTypePeople        EntityType = "people"
	EntityTypePortfolios    EntityType = "portfolios"
	EntityTypeSpending      EntityType = "spending"
	EntityTypeRelationships EntityType = "relationships"
	EntityTypeLLMLogs       EntityType = "llmLogs"
)

// EntityCollection represents a collection of entities
type EntityCollection struct {
	Tasks         []map[string]interface{} `json:"tasks,omitempty"`
	Projects      []map[string]interface{} `json:"projects,omitempty"`
	Goals         []map[string]interface{} `json:"goals,omitempty"`
	Thoughts      []map[string]interface{} `json:"thoughts,omitempty"`
	Moods         []map[string]interface{} `json:"moods,omitempty"`
	FocusSessions []map[string]interface{} `json:"focusSessions,omitempty"`
	People        []map[string]interface{} `json:"people,omitempty"`
	Portfolios    []map[string]interface{} `json:"portfolios,omitempty"`
	Spending      []map[string]interface{} `json:"spending,omitempty"`
	Relationships []map[string]interface{} `json:"relationships,omitempty"`
	LLMLogs       []map[string]interface{} `json:"llmLogs,omitempty"`
}

// ExportMetadata contains metadata about exported data
type ExportMetadata struct {
	Version     string    `json:"version"`
	ExportedAt  time.Time `json:"exportedAt"`
	ExportedBy  string    `json:"exportedBy,omitempty"`
	TotalItems  int       `json:"totalItems"`
	AppVersion  string    `json:"appVersion,omitempty"`
	Description string    `json:"description,omitempty"`
}

// ImportData represents the structure of import data
type ImportData struct {
	Metadata ExportMetadata   `json:"metadata"`
	Entities EntityCollection `json:"entities"`
}

// ConflictType represents the type of conflict
type ConflictType string

const (
	ConflictTypeDuplicateID    ConflictType = "duplicate_id"
	ConflictTypeBrokenReference ConflictType = "broken_reference"
	ConflictTypeInvalidData    ConflictType = "invalid_data"
)

// Conflict represents a detected conflict
type Conflict struct {
	Type       ConflictType `json:"type"`
	EntityType EntityType   `json:"entityType"`
	EntityID   string       `json:"entityId"`
	Field      string       `json:"field,omitempty"`
	Message    string       `json:"message"`
}

// ValidationResult represents the result of import validation
type ValidationResult struct {
	Valid     bool       `json:"valid"`
	Conflicts []Conflict `json:"conflicts"`
	Summary   struct {
		TotalItems    int                       `json:"totalItems"`
		ItemsPerType  map[EntityType]int        `json:"itemsPerType"`
		ConflictCount int                       `json:"conflictCount"`
		NewItems      int                       `json:"newItems"`
		ExistingItems int                       `json:"existingItems"`
		Dependencies  map[string][]string       `json:"dependencies"`
	} `json:"summary"`
	ParsedData ImportData `json:"parsedData"`
}

// ImportOptions represents options for import execution
type ImportOptions struct {
	UpdateReferences bool                      `json:"updateReferences"`
	SkipConflicts    bool                      `json:"skipConflicts"`
	Selection        map[EntityType][]string   `json:"selection"` // Entity IDs to import per type
	ConflictResolution map[string]string       `json:"conflictResolution"` // Entity ID -> resolution action
}

// ImportResult represents the result of import execution
type ImportResult struct {
	Success       bool              `json:"success"`
	ImportedCount int               `json:"importedCount"`
	SkippedCount  int               `json:"skippedCount"`
	ErrorCount    int               `json:"errorCount"`
	ByType        map[EntityType]int `json:"byType"`
	Errors        []string          `json:"errors,omitempty"`
}

// ExportFilters represents filters for data export
type ExportFilters struct {
	EntityTypes []EntityType `json:"entityTypes,omitempty"` // Empty = all types
	StartDate   *time.Time   `json:"startDate,omitempty"`
	EndDate     *time.Time   `json:"endDate,omitempty"`

	// Task filters
	TaskStatus    []string `json:"taskStatus,omitempty"`
	TaskCategory  []string `json:"taskCategory,omitempty"`
	TaskTags      []string `json:"taskTags,omitempty"`

	// Project filters
	ProjectStatus []string `json:"projectStatus,omitempty"`

	// Goal filters
	GoalStatus    []string `json:"goalStatus,omitempty"`
}

// ExportSummary represents summary statistics for export preview
type ExportSummary struct {
	Tasks struct {
		Total        int `json:"total"`
		Active       int `json:"active"`
		Completed    int `json:"completed"`
		HighPriority int `json:"highPriority"`
	} `json:"tasks"`
	Projects struct {
		Total     int `json:"total"`
		Active    int `json:"active"`
		Completed int `json:"completed"`
		OnHold    int `json:"onHold"`
	} `json:"projects"`
	Goals struct {
		Total     int `json:"total"`
		ShortTerm int `json:"shortTerm"`
		LongTerm  int `json:"longTerm"`
		Active    int `json:"active"`
	} `json:"goals"`
	Thoughts struct {
		Total           int `json:"total"`
		DeepThoughts    int `json:"deepThoughts"`
		WithSuggestions int `json:"withSuggestions"`
	} `json:"thoughts"`
	Moods struct {
		Total       int     `json:"total"`
		AverageMood float64 `json:"averageMood"`
		ThisMonth   int     `json:"thisMonth"`
	} `json:"moods"`
	FocusSessions struct {
		Total         int     `json:"total"`
		TotalMinutes  int     `json:"totalMinutes"`
		AverageRating float64 `json:"averageRating"`
		ThisWeek      int     `json:"thisWeek"`
	} `json:"focusSessions"`
	People struct {
		Total      int `json:"total"`
		Family     int `json:"family"`
		Friends    int `json:"friends"`
		Colleagues int `json:"colleagues"`
	} `json:"people"`
	Portfolios struct {
		Total            int     `json:"total"`
		TotalInvestments float64 `json:"totalInvestments"`
		Active           int     `json:"active"`
	} `json:"portfolios"`
	Spending struct {
		Total              int     `json:"total"`
		TotalAmount        float64 `json:"totalAmount"`
		ThisMonth          int     `json:"thisMonth"`
		AverageTransaction float64 `json:"averageTransaction"`
	} `json:"spending"`
	Relationships struct {
		Total       int `json:"total"`
		Active      int `json:"active"`
		ToolRelated int `json:"toolRelated"`
		Manual      int `json:"manual"`
	} `json:"relationships"`
	LLMLogs struct {
		Total       int `json:"total"`
		Completed   int `json:"completed"`
		Failed      int `json:"failed"`
		TotalTokens int `json:"totalTokens"`
	} `json:"llmLogs"`
}

// ValidateImport validates import data and detects conflicts
func (s *ImportExportService) ValidateImport(ctx context.Context, uid string, data []byte) (*ValidationResult, error) {
	// Parse JSON
	var importData ImportData
	if err := json.Unmarshal(data, &importData); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	// Validate metadata
	if importData.Metadata.Version == "" {
		return nil, fmt.Errorf("missing metadata version")
	}

	result := &ValidationResult{
		Valid:      true,
		Conflicts:  []Conflict{},
		ParsedData: importData,
	}

	// Count items per type
	result.Summary.ItemsPerType = make(map[EntityType]int)
	result.Summary.ItemsPerType[EntityTypeTasks] = len(importData.Entities.Tasks)
	result.Summary.ItemsPerType[EntityTypeProjects] = len(importData.Entities.Projects)
	result.Summary.ItemsPerType[EntityTypeGoals] = len(importData.Entities.Goals)
	result.Summary.ItemsPerType[EntityTypeThoughts] = len(importData.Entities.Thoughts)
	result.Summary.ItemsPerType[EntityTypeMoods] = len(importData.Entities.Moods)
	result.Summary.ItemsPerType[EntityTypeFocusSessions] = len(importData.Entities.FocusSessions)
	result.Summary.ItemsPerType[EntityTypePeople] = len(importData.Entities.People)
	result.Summary.ItemsPerType[EntityTypePortfolios] = len(importData.Entities.Portfolios)
	result.Summary.ItemsPerType[EntityTypeSpending] = len(importData.Entities.Spending)
	result.Summary.ItemsPerType[EntityTypeRelationships] = len(importData.Entities.Relationships)
	result.Summary.ItemsPerType[EntityTypeLLMLogs] = len(importData.Entities.LLMLogs)

	result.Summary.TotalItems = 0
	for _, count := range result.Summary.ItemsPerType {
		result.Summary.TotalItems += count
	}

	// Validate and detect conflicts for each entity type
	existingIDs := make(map[EntityType]map[string]bool)

	// Fetch existing IDs from Firestore for each collection
	collections := map[EntityType]string{
		EntityTypeTasks:         "tasks",
		EntityTypeProjects:      "projects",
		EntityTypeGoals:         "goals",
		EntityTypeThoughts:      "thoughts",
		EntityTypeMoods:         "moods",
		EntityTypeFocusSessions: "focusSessions",
		EntityTypePeople:        "people",
		EntityTypePortfolios:    "portfolios",
		EntityTypeSpending:      "transactions",
		EntityTypeRelationships: "entityRelationships",
		EntityTypeLLMLogs:       "llmLogs",
	}

	for entityType, collection := range collections {
		existingIDs[entityType] = make(map[string]bool)

		// Query existing documents for this user
		query := s.repo.Collection(collection).Where("uid", "==", uid).Select("id")
		iter := query.Documents(ctx)
		defer iter.Stop()

		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				s.logger.Warn("Error fetching existing IDs",
					zap.String("collection", collection),
					zap.Error(err),
				)
				continue
			}

			if idVal, ok := doc.Data()["id"]; ok {
				if idStr, ok := idVal.(string); ok {
					existingIDs[entityType][idStr] = true
				}
			}
		}
	}

	// Check for duplicate IDs and validate entities
	s.validateEntities(importData.Entities.Tasks, EntityTypeTasks, existingIDs[EntityTypeTasks], result)
	s.validateEntities(importData.Entities.Projects, EntityTypeProjects, existingIDs[EntityTypeProjects], result)
	s.validateEntities(importData.Entities.Goals, EntityTypeGoals, existingIDs[EntityTypeGoals], result)
	s.validateEntities(importData.Entities.Thoughts, EntityTypeThoughts, existingIDs[EntityTypeThoughts], result)
	s.validateEntities(importData.Entities.Moods, EntityTypeMoods, existingIDs[EntityTypeMoods], result)
	s.validateEntities(importData.Entities.FocusSessions, EntityTypeFocusSessions, existingIDs[EntityTypeFocusSessions], result)
	s.validateEntities(importData.Entities.People, EntityTypePeople, existingIDs[EntityTypePeople], result)
	s.validateEntities(importData.Entities.Portfolios, EntityTypePortfolios, existingIDs[EntityTypePortfolios], result)
	s.validateEntities(importData.Entities.Spending, EntityTypeSpending, existingIDs[EntityTypeSpending], result)
	s.validateEntities(importData.Entities.Relationships, EntityTypeRelationships, existingIDs[EntityTypeRelationships], result)
	s.validateEntities(importData.Entities.LLMLogs, EntityTypeLLMLogs, existingIDs[EntityTypeLLMLogs], result)

	// Detect broken references
	s.detectBrokenReferences(&importData, result)

	// Update summary
	result.Summary.ConflictCount = len(result.Conflicts)
	result.Valid = result.Summary.ConflictCount == 0

	return result, nil
}

// validateEntities validates a list of entities and detects conflicts
func (s *ImportExportService) validateEntities(
	entities []map[string]interface{},
	entityType EntityType,
	existingIDs map[string]bool,
	result *ValidationResult,
) {
	for _, entity := range entities {
		// Validate ID field
		idVal, hasID := entity["id"]
		if !hasID {
			result.Conflicts = append(result.Conflicts, Conflict{
				Type:       ConflictTypeInvalidData,
				EntityType: entityType,
				EntityID:   "",
				Field:      "id",
				Message:    "Missing id field",
			})
			continue
		}

		id, ok := idVal.(string)
		if !ok || id == "" {
			result.Conflicts = append(result.Conflicts, Conflict{
				Type:       ConflictTypeInvalidData,
				EntityType: entityType,
				EntityID:   fmt.Sprintf("%v", idVal),
				Field:      "id",
				Message:    "Invalid id field",
			})
			continue
		}

		// Check for duplicate ID
		if existingIDs[id] {
			result.Conflicts = append(result.Conflicts, Conflict{
				Type:       ConflictTypeDuplicateID,
				EntityType: entityType,
				EntityID:   id,
				Message:    fmt.Sprintf("Entity with ID %s already exists", id),
			})
			result.Summary.ExistingItems++
		} else {
			result.Summary.NewItems++
		}

		// Additional validation based on entity type
		s.validateEntityFields(entity, entityType, id, result)
	}
}

// validateEntityFields validates required fields for each entity type
func (s *ImportExportService) validateEntityFields(
	entity map[string]interface{},
	entityType EntityType,
	id string,
	result *ValidationResult,
) {
	switch entityType {
	case EntityTypeTasks:
		if _, ok := entity["title"]; !ok {
			result.Conflicts = append(result.Conflicts, Conflict{
				Type:       ConflictTypeInvalidData,
				EntityType: entityType,
				EntityID:   id,
				Field:      "title",
				Message:    "Missing required field: title",
			})
		}
	case EntityTypeProjects:
		if _, ok := entity["name"]; !ok {
			result.Conflicts = append(result.Conflicts, Conflict{
				Type:       ConflictTypeInvalidData,
				EntityType: entityType,
				EntityID:   id,
				Field:      "name",
				Message:    "Missing required field: name",
			})
		}
	case EntityTypeGoals:
		if _, ok := entity["title"]; !ok {
			result.Conflicts = append(result.Conflicts, Conflict{
				Type:       ConflictTypeInvalidData,
				EntityType: entityType,
				EntityID:   id,
				Field:      "title",
				Message:    "Missing required field: title",
			})
		}
	// Add more validations as needed
	}
}

// detectBrokenReferences detects broken references between entities
func (s *ImportExportService) detectBrokenReferences(importData *ImportData, result *ValidationResult) {
	// Build a map of all imported entity IDs
	importedIDs := make(map[EntityType]map[string]bool)
	importedIDs[EntityTypeTasks] = s.buildIDMap(importData.Entities.Tasks)
	importedIDs[EntityTypeProjects] = s.buildIDMap(importData.Entities.Projects)
	importedIDs[EntityTypeGoals] = s.buildIDMap(importData.Entities.Goals)
	importedIDs[EntityTypeThoughts] = s.buildIDMap(importData.Entities.Thoughts)
	importedIDs[EntityTypePeople] = s.buildIDMap(importData.Entities.People)

	// Check task references
	for _, task := range importData.Entities.Tasks {
		id := s.getString(task, "id")

		// Check project reference
		if projectID := s.getString(task, "projectId"); projectID != "" {
			if !importedIDs[EntityTypeProjects][projectID] {
				result.Conflicts = append(result.Conflicts, Conflict{
					Type:       ConflictTypeBrokenReference,
					EntityType: EntityTypeTasks,
					EntityID:   id,
					Field:      "projectId",
					Message:    fmt.Sprintf("Referenced project %s not found in import", projectID),
				})
			}
		}

		// Check thought references
		if thoughtIDs := s.getStringArray(task, "linkedThoughtIds"); len(thoughtIDs) > 0 {
			for _, thoughtID := range thoughtIDs {
				if !importedIDs[EntityTypeThoughts][thoughtID] {
					result.Conflicts = append(result.Conflicts, Conflict{
						Type:       ConflictTypeBrokenReference,
						EntityType: EntityTypeTasks,
						EntityID:   id,
						Field:      "linkedThoughtIds",
						Message:    fmt.Sprintf("Referenced thought %s not found in import", thoughtID),
					})
				}
			}
		}
	}

	// Check project → goal references
	for _, project := range importData.Entities.Projects {
		id := s.getString(project, "id")

		if goalIDs := s.getStringArray(project, "goalIds"); len(goalIDs) > 0 {
			for _, goalID := range goalIDs {
				if !importedIDs[EntityTypeGoals][goalID] {
					result.Conflicts = append(result.Conflicts, Conflict{
						Type:       ConflictTypeBrokenReference,
						EntityType: EntityTypeProjects,
						EntityID:   id,
						Field:      "goalIds",
						Message:    fmt.Sprintf("Referenced goal %s not found in import", goalID),
					})
				}
			}
		}
	}
}

// buildIDMap builds a map of IDs from a list of entities
func (s *ImportExportService) buildIDMap(entities []map[string]interface{}) map[string]bool {
	idMap := make(map[string]bool)
	for _, entity := range entities {
		if id := s.getString(entity, "id"); id != "" {
			idMap[id] = true
		}
	}
	return idMap
}

// Helper functions to extract values from map[string]interface{}
func (s *ImportExportService) getString(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func (s *ImportExportService) getStringArray(m map[string]interface{}, key string) []string {
	if val, ok := m[key]; ok {
		if arr, ok := val.([]interface{}); ok {
			result := make([]string, 0, len(arr))
			for _, item := range arr {
				if str, ok := item.(string); ok {
					result = append(result, str)
				}
			}
			return result
		}
	}
	return nil
}

// ExecuteImport executes the import with the given options
func (s *ImportExportService) ExecuteImport(
	ctx context.Context,
	uid string,
	data *ImportData,
	options ImportOptions,
) (*ImportResult, error) {
	result := &ImportResult{
		Success: true,
		ByType:  make(map[EntityType]int),
		Errors:  []string{},
	}

	// Determine import order based on dependencies
	importOrder := []struct {
		entityType EntityType
		collection string
		entities   []map[string]interface{}
	}{
		{EntityTypeGoals, "goals", data.Entities.Goals},
		{EntityTypeProjects, "projects", data.Entities.Projects},
		{EntityTypeThoughts, "thoughts", data.Entities.Thoughts},
		{EntityTypePeople, "people", data.Entities.People},
		{EntityTypeTasks, "tasks", data.Entities.Tasks}, // Tasks depend on projects/thoughts
		{EntityTypeMoods, "moods", data.Entities.Moods},
		{EntityTypeFocusSessions, "focusSessions", data.Entities.FocusSessions},
		{EntityTypePortfolios, "portfolios", data.Entities.Portfolios},
		{EntityTypeSpending, "transactions", data.Entities.Spending},
		{EntityTypeRelationships, "entityRelationships", data.Entities.Relationships},
		{EntityTypeLLMLogs, "llmLogs", data.Entities.LLMLogs},
	}

	// Import each entity type
	for _, item := range importOrder {
		if len(item.entities) == 0 {
			continue
		}

		// Filter by selection if provided
		entitiesToImport := item.entities
		if options.Selection != nil && len(options.Selection[item.entityType]) > 0 {
			selected := make(map[string]bool)
			for _, id := range options.Selection[item.entityType] {
				selected[id] = true
			}

			filtered := []map[string]interface{}{}
			for _, entity := range item.entities {
				if id := s.getString(entity, "id"); id != "" && selected[id] {
					filtered = append(filtered, entity)
				}
			}
			entitiesToImport = filtered
		}

		// Import in batches of 500 (Firestore limit)
		batchSize := 500
		for i := 0; i < len(entitiesToImport); i += batchSize {
			end := i + batchSize
			if end > len(entitiesToImport) {
				end = len(entitiesToImport)
			}

			batch := s.repo.Batch()
			for _, entity := range entitiesToImport[i:end] {
				id := s.getString(entity, "id")
				if id == "" {
					continue
				}

				// Add uid to entity
				entity["uid"] = uid

				// Add timestamps
				now := time.Now()
				if _, ok := entity["createdAt"]; !ok {
					entity["createdAt"] = now
				}
				entity["updatedAt"] = now
				entity["updatedBy"] = uid

				// Sanitize for Firestore (remove undefined values)
				sanitized := s.sanitizeForFirestore(entity)

				// Create document reference
				docRef := s.repo.Collection(item.collection).Doc(id)
				batch.Set(docRef, sanitized, firestore.MergeAll)
			}

			// Commit batch
			if _, err := batch.Commit(ctx); err != nil {
				errMsg := fmt.Sprintf("Failed to import %s batch: %v", item.entityType, err)
				result.Errors = append(result.Errors, errMsg)
				result.ErrorCount += (end - i)
				result.Success = false
				s.logger.Error("Import batch failed",
					zap.String("entityType", string(item.entityType)),
					zap.Error(err),
				)
			} else {
				imported := end - i
				result.ImportedCount += imported
				result.ByType[item.entityType] += imported
			}
		}
	}

	return result, nil
}

// sanitizeForFirestore removes nil/undefined values recursively
func (s *ImportExportService) sanitizeForFirestore(data map[string]interface{}) map[string]interface{} {
	sanitized := make(map[string]interface{})
	for key, value := range data {
		if value == nil {
			continue
		}

		switch v := value.(type) {
		case map[string]interface{}:
			sanitized[key] = s.sanitizeForFirestore(v)
		case []interface{}:
			arr := make([]interface{}, 0, len(v))
			for _, item := range v {
				if item != nil {
					if m, ok := item.(map[string]interface{}); ok {
						arr = append(arr, s.sanitizeForFirestore(m))
					} else {
						arr = append(arr, item)
					}
				}
			}
			if len(arr) > 0 {
				sanitized[key] = arr
			}
		default:
			sanitized[key] = value
		}
	}
	return sanitized
}

// ExportData exports user data with optional filters
func (s *ImportExportService) ExportData(
	ctx context.Context,
	uid string,
	filters ExportFilters,
) (*ImportData, error) {
	exportData := &ImportData{
		Metadata: ExportMetadata{
			Version:    "1.0",
			ExportedAt: time.Now(),
			ExportedBy: uid,
			AppVersion: "focus-notebook-backend",
		},
		Entities: EntityCollection{},
	}

	// Determine which entity types to export
	typesToExport := filters.EntityTypes
	if len(typesToExport) == 0 {
		// Export all types by default
		typesToExport = []EntityType{
			EntityTypeTasks, EntityTypeProjects, EntityTypeGoals,
			EntityTypeThoughts, EntityTypeMoods, EntityTypeFocusSessions,
			EntityTypePeople, EntityTypePortfolios, EntityTypeSpending,
			EntityTypeRelationships, EntityTypeLLMLogs,
		}
	}

	// Export each entity type
	for _, entityType := range typesToExport {
		switch entityType {
		case EntityTypeTasks:
			exportData.Entities.Tasks = s.exportTasks(ctx, uid, filters)
		case EntityTypeProjects:
			exportData.Entities.Projects = s.exportProjects(ctx, uid, filters)
		case EntityTypeGoals:
			exportData.Entities.Goals = s.exportGoals(ctx, uid, filters)
		case EntityTypeThoughts:
			exportData.Entities.Thoughts = s.exportThoughts(ctx, uid, filters)
		case EntityTypeMoods:
			exportData.Entities.Moods = s.exportMoods(ctx, uid, filters)
		case EntityTypeFocusSessions:
			exportData.Entities.FocusSessions = s.exportFocusSessions(ctx, uid, filters)
		case EntityTypePeople:
			exportData.Entities.People = s.exportPeople(ctx, uid, filters)
		case EntityTypePortfolios:
			exportData.Entities.Portfolios = s.exportPortfolios(ctx, uid, filters)
		case EntityTypeSpending:
			exportData.Entities.Spending = s.exportSpending(ctx, uid, filters)
		case EntityTypeRelationships:
			exportData.Entities.Relationships = s.exportRelationships(ctx, uid, filters)
		case EntityTypeLLMLogs:
			exportData.Entities.LLMLogs = s.exportLLMLogs(ctx, uid, filters)
		}
	}

	// Calculate total items
	exportData.Metadata.TotalItems = len(exportData.Entities.Tasks) +
		len(exportData.Entities.Projects) + len(exportData.Entities.Goals) +
		len(exportData.Entities.Thoughts) + len(exportData.Entities.Moods) +
		len(exportData.Entities.FocusSessions) + len(exportData.Entities.People) +
		len(exportData.Entities.Portfolios) + len(exportData.Entities.Spending) +
		len(exportData.Entities.Relationships) + len(exportData.Entities.LLMLogs)

	return exportData, nil
}

// Export functions for each entity type
func (s *ImportExportService) exportTasks(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("tasks").Where("uid", "==", uid)

	// Apply filters
	if len(filters.TaskStatus) > 0 {
		query = query.Where("status", "in", toInterfaceSlice(filters.TaskStatus))
	}
	if filters.StartDate != nil {
		query = query.Where("createdAt", ">=", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("createdAt", "<=", *filters.EndDate)
	}

	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportProjects(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("projects").Where("uid", "==", uid)

	if len(filters.ProjectStatus) > 0 {
		query = query.Where("status", "in", toInterfaceSlice(filters.ProjectStatus))
	}
	if filters.StartDate != nil {
		query = query.Where("createdAt", ">=", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("createdAt", "<=", *filters.EndDate)
	}

	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportGoals(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("goals").Where("uid", "==", uid)

	if len(filters.GoalStatus) > 0 {
		query = query.Where("status", "in", toInterfaceSlice(filters.GoalStatus))
	}
	if filters.StartDate != nil {
		query = query.Where("createdAt", ">=", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("createdAt", "<=", *filters.EndDate)
	}

	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportThoughts(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("thoughts").Where("uid", "==", uid)

	if filters.StartDate != nil {
		query = query.Where("createdAt", ">=", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("createdAt", "<=", *filters.EndDate)
	}

	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportMoods(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("moods").Where("uid", "==", uid)

	if filters.StartDate != nil {
		query = query.Where("date", ">=", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("date", "<=", *filters.EndDate)
	}

	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportFocusSessions(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("focusSessions").Where("uid", "==", uid)

	if filters.StartDate != nil {
		query = query.Where("startedAt", ">=", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("startedAt", "<=", *filters.EndDate)
	}

	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportPeople(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("people").Where("uid", "==", uid)
	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportPortfolios(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("portfolios").Where("uid", "==", uid)
	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportSpending(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("transactions").Where("uid", "==", uid)

	if filters.StartDate != nil {
		query = query.Where("date", ">=", filters.StartDate.Format("2006-01-02"))
	}
	if filters.EndDate != nil {
		query = query.Where("date", "<=", filters.EndDate.Format("2006-01-02"))
	}

	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportRelationships(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("entityRelationships").Where("uid", "==", uid)
	return s.queryToMaps(ctx, query)
}

func (s *ImportExportService) exportLLMLogs(ctx context.Context, uid string, filters ExportFilters) []map[string]interface{} {
	query := s.repo.Collection("llmLogs").Where("uid", "==", uid)

	if filters.StartDate != nil {
		query = query.Where("timestamp", ">=", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("timestamp", "<=", *filters.EndDate)
	}

	return s.queryToMaps(ctx, query)
}

// queryToMaps executes a query and returns results as maps
func (s *ImportExportService) queryToMaps(ctx context.Context, query firestore.Query) []map[string]interface{} {
	iter := query.Documents(ctx)
	defer iter.Stop()

	results := []map[string]interface{}{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Warn("Error fetching document", zap.Error(err))
			continue
		}

		results = append(results, doc.Data())
	}

	return results
}

// Helper to convert []string to []interface{}
func toInterfaceSlice(slice []string) []interface{} {
	result := make([]interface{}, len(slice))
	for i, v := range slice {
		result[i] = v
	}
	return result
}

// GetExportSummary calculates summary statistics for export preview
func (s *ImportExportService) GetExportSummary(ctx context.Context, uid string) (*ExportSummary, error) {
	summary := &ExportSummary{}

	// Fetch and calculate tasks summary
	tasksQuery := s.repo.Collection("tasks").Where("uid", "==", uid)
	tasks := s.queryToMaps(ctx, tasksQuery)
	summary.Tasks.Total = len(tasks)
	for _, task := range tasks {
		status := strings.ToLower(s.getString(task, "status"))
		if status == "active" || status == "in-progress" {
			summary.Tasks.Active++
		}
		if status == "completed" || status == "done" {
			summary.Tasks.Completed++
		}
		if s.getString(task, "priority") == "high" {
			summary.Tasks.HighPriority++
		}
	}

	// Projects summary
	projectsQuery := s.repo.Collection("projects").Where("uid", "==", uid)
	projects := s.queryToMaps(ctx, projectsQuery)
	summary.Projects.Total = len(projects)
	for _, project := range projects {
		status := strings.ToLower(s.getString(project, "status"))
		if status == "active" {
			summary.Projects.Active++
		}
		if status == "completed" {
			summary.Projects.Completed++
		}
		if status == "on-hold" || status == "paused" {
			summary.Projects.OnHold++
		}
	}

	// Goals summary
	goalsQuery := s.repo.Collection("goals").Where("uid", "==", uid)
	goals := s.queryToMaps(ctx, goalsQuery)
	summary.Goals.Total = len(goals)
	for _, goal := range goals {
		goalType := strings.ToLower(s.getString(goal, "type"))
		if goalType == "short-term" {
			summary.Goals.ShortTerm++
		}
		if goalType == "long-term" {
			summary.Goals.LongTerm++
		}
		status := strings.ToLower(s.getString(goal, "status"))
		if status == "active" {
			summary.Goals.Active++
		}
	}

	// Add other summaries as needed (thoughts, moods, focus sessions, etc.)
	// For brevity, showing pattern for a few types

	return summary, nil
}
