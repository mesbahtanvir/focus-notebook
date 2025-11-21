package services

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/models"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository"
)

// ActionProcessor executes AI-suggested actions
type ActionProcessor struct {
	repo   *repository.FirestoreRepository
	logger *zap.Logger
}

// NewActionProcessor creates a new action processor
func NewActionProcessor(repo *repository.FirestoreRepository, logger *zap.Logger) *ActionProcessor {
	return &ActionProcessor{
		repo:   repo,
		logger: logger,
	}
}

// ExecuteAction executes a single AI action
func (a *ActionProcessor) ExecuteAction(ctx context.Context, uid, thoughtID string, action models.AIAction) error {
	a.logger.Debug("Executing action",
		zap.String("uid", uid),
		zap.String("thoughtId", thoughtID),
		zap.String("actionType", action.Type),
		zap.Int("confidence", action.Confidence),
	)

	switch action.Type {
	case "createTask":
		return a.createTask(ctx, uid, thoughtID, action.Data)
	case "createProject":
		return a.createProject(ctx, uid, thoughtID, action.Data)
	case "createGoal":
		return a.createGoal(ctx, uid, thoughtID, action.Data)
	case "createMood":
		return a.createMood(ctx, uid, thoughtID, action.Data)
	case "createRelationship":
		return a.createRelationship(ctx, uid, thoughtID, action.Data)
	case "enhanceTask":
		return a.enhanceTask(ctx, uid, thoughtID, action.Data)
	default:
		return fmt.Errorf("unknown action type: %s", action.Type)
	}
}

// createTask creates a new task
func (a *ActionProcessor) createTask(ctx context.Context, uid, thoughtID string, data map[string]interface{}) error {
	// Generate task ID
	taskID := generateID()
	taskPath := fmt.Sprintf("users/%s/tasks/%s", uid, taskID)

	// Build task data
	taskData := map[string]interface{}{
		"id":     taskID,
		"title":  getStringFieldFromMap(data, "title"),
		"done":   false,
		"status": "active",
	}

	// Optional fields
	if category := getStringFieldFromMap(data, "category"); category != "" {
		taskData["category"] = category
	}
	if priority := getStringFieldFromMap(data, "priority"); priority != "" {
		taskData["priority"] = priority
	}
	if notes := getStringFieldFromMap(data, "notes"); notes != "" {
		taskData["notes"] = notes
	}

	// Link to thought
	taskData["thoughtId"] = thoughtID
	taskData["createdBy"] = "ai"

	// Create task
	err := a.repo.CreateDocument(ctx, taskPath, taskData)
	if err != nil {
		return fmt.Errorf("failed to create task: %w", err)
	}

	a.logger.Info("Task created",
		zap.String("uid", uid),
		zap.String("taskId", taskID),
		zap.String("thoughtId", thoughtID),
	)

	return nil
}

// createProject creates a new project
func (a *ActionProcessor) createProject(ctx context.Context, uid, thoughtID string, data map[string]interface{}) error {
	projectID := generateID()
	projectPath := fmt.Sprintf("users/%s/projects/%s", uid, projectID)

	projectData := map[string]interface{}{
		"id":          projectID,
		"title":       getStringFieldFromMap(data, "title"),
		"description": getStringFieldFromMap(data, "description"),
		"status":      "active",
		"thoughtId":   thoughtID,
		"createdBy":   "ai",
	}

	err := a.repo.CreateDocument(ctx, projectPath, projectData)
	if err != nil {
		return fmt.Errorf("failed to create project: %w", err)
	}

	a.logger.Info("Project created",
		zap.String("uid", uid),
		zap.String("projectId", projectID),
		zap.String("thoughtId", thoughtID),
	)

	return nil
}

// createGoal creates a new goal
func (a *ActionProcessor) createGoal(ctx context.Context, uid, thoughtID string, data map[string]interface{}) error {
	goalID := generateID()
	goalPath := fmt.Sprintf("users/%s/goals/%s", uid, goalID)

	goalData := map[string]interface{}{
		"id":         goalID,
		"title":      getStringFieldFromMap(data, "title"),
		"objective":  getStringFieldFromMap(data, "objective"),
		"status":     "active",
		"thoughtId":  thoughtID,
		"createdBy":  "ai",
	}

	err := a.repo.CreateDocument(ctx, goalPath, goalData)
	if err != nil {
		return fmt.Errorf("failed to create goal: %w", err)
	}

	a.logger.Info("Goal created",
		zap.String("uid", uid),
		zap.String("goalId", goalID),
		zap.String("thoughtId", thoughtID),
	)

	return nil
}

// createMood creates a mood entry
func (a *ActionProcessor) createMood(ctx context.Context, uid, thoughtID string, data map[string]interface{}) error {
	moodID := generateID()
	moodPath := fmt.Sprintf("users/%s/moods/%s", uid, moodID)

	moodData := map[string]interface{}{
		"id":         moodID,
		"value":      getIntFieldFromMap(data, "value"),
		"note":       getStringFieldFromMap(data, "note"),
		"thoughtId":  thoughtID,
		"createdBy":  "ai",
	}

	err := a.repo.CreateDocument(ctx, moodPath, moodData)
	if err != nil {
		return fmt.Errorf("failed to create mood: %w", err)
	}

	a.logger.Info("Mood created",
		zap.String("uid", uid),
		zap.String("moodId", moodID),
		zap.String("thoughtId", thoughtID),
	)

	return nil
}

// createRelationship creates a relationship in the entity graph
func (a *ActionProcessor) createRelationship(ctx context.Context, uid, thoughtID string, data map[string]interface{}) error {
	relationshipID := generateID()
	relationshipPath := fmt.Sprintf("users/%s/entity_graph/%s", uid, relationshipID)

	relationshipData := map[string]interface{}{
		"id":               relationshipID,
		"sourceType":       "thought",
		"sourceId":         thoughtID,
		"targetType":       getStringFieldFromMap(data, "targetType"),
		"targetId":         getStringFieldFromMap(data, "targetId"),
		"relationshipType": getStringFieldFromMap(data, "relationshipType"),
		"reasoning":        getStringFieldFromMap(data, "reasoning"),
		"createdBy":        "ai",
	}

	err := a.repo.CreateDocument(ctx, relationshipPath, relationshipData)
	if err != nil {
		return fmt.Errorf("failed to create relationship: %w", err)
	}

	a.logger.Info("Relationship created",
		zap.String("uid", uid),
		zap.String("relationshipId", relationshipID),
		zap.String("thoughtId", thoughtID),
		zap.String("targetType", getStringFieldFromMap(data, "targetType")),
		zap.String("targetId", getStringFieldFromMap(data, "targetId")),
	)

	return nil
}

// enhanceTask enhances an existing task with information from the thought
func (a *ActionProcessor) enhanceTask(ctx context.Context, uid, thoughtID string, data map[string]interface{}) error {
	taskID := getStringFieldFromMap(data, "taskId")
	if taskID == "" {
		return fmt.Errorf("taskId is required for enhanceTask action")
	}

	taskPath := fmt.Sprintf("users/%s/tasks/%s", uid, taskID)

	// Build updates
	updates := make(map[string]interface{})

	if notes := getStringFieldFromMap(data, "notes"); notes != "" {
		updates["notes"] = notes
	}
	if priority := getStringFieldFromMap(data, "priority"); priority != "" {
		updates["priority"] = priority
	}
	if category := getStringFieldFromMap(data, "category"); category != "" {
		updates["category"] = category
	}

	if len(updates) == 0 {
		return fmt.Errorf("no updates provided for enhanceTask")
	}

	// Add AI metadata
	updates["aiEnhanced"] = true
	updates["enhancedFromThoughtId"] = thoughtID

	err := a.repo.UpdateDocument(ctx, taskPath, updates)
	if err != nil {
		return fmt.Errorf("failed to enhance task: %w", err)
	}

	a.logger.Info("Task enhanced",
		zap.String("uid", uid),
		zap.String("taskId", taskID),
		zap.String("thoughtId", thoughtID),
	)

	return nil
}

// Helper functions
func getStringFieldFromMap(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getIntFieldFromMap(m map[string]interface{}, key string) int {
	if val, ok := m[key].(float64); ok {
		return int(val)
	}
	if val, ok := m[key].(int); ok {
		return val
	}
	return 0
}

// generateID generates a unique ID (similar to Firestore auto-ID)
func generateID() string {
	// Use timestamp + random component
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), time.Now().Unix()%1000000)
}
