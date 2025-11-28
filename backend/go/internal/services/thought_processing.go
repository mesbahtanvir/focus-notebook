package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/models"
	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/repository"
)

// ThoughtProcessingService processes thoughts with AI
type ThoughtProcessingService struct {
	repo              *repository.FirestoreRepository
	openaiClient      *clients.OpenAIClient
	anthropicClient   *clients.AnthropicClient
	contextGatherer   *ContextGathererService
	subscriptionSvc   *SubscriptionService
	actionProcessor   *ActionProcessor
	logger            *zap.Logger
}

// NewThoughtProcessingService creates a new thought processing service
func NewThoughtProcessingService(
	repo *repository.FirestoreRepository,
	openaiClient *clients.OpenAIClient,
	anthropicClient *clients.AnthropicClient,
	contextGatherer *ContextGathererService,
	subscriptionSvc *SubscriptionService,
	actionProcessor *ActionProcessor,
	logger *zap.Logger,
) *ThoughtProcessingService {
	return &ThoughtProcessingService{
		repo:            repo,
		openaiClient:    openaiClient,
		anthropicClient: anthropicClient,
		contextGatherer: contextGatherer,
		subscriptionSvc: subscriptionSvc,
		actionProcessor: actionProcessor,
		logger:          logger,
	}
}

// ProcessThought processes a thought with AI
func (s *ThoughtProcessingService) ProcessThought(ctx context.Context, thoughtID string, thought map[string]interface{}, modelName string) error {
	uid := ctx.Value("uid").(string)
	isAnonymous := ctx.Value("isAnonymous").(bool)

	s.logger.Info("Processing thought",
		zap.String("uid", uid),
		zap.String("thoughtId", thoughtID),
		zap.String("model", modelName),
	)

	// 1. Check AI access
	allowed, reason, err := s.subscriptionSvc.IsAIAllowed(ctx, uid, isAnonymous)
	if err != nil {
		return fmt.Errorf("failed to check AI access: %w", err)
	}
	if !allowed {
		return fmt.Errorf("AI access denied: %s", reason)
	}

	// 2. Check if already processed
	if tags, ok := thought["tags"].([]interface{}); ok {
		for _, tag := range tags {
			if tag == "processed" {
				return fmt.Errorf("thought already processed")
			}
		}
	}

	// 3. Update thought status to processing
	thoughtPath := fmt.Sprintf("users/%s/thoughts/%s", uid, thoughtID)
	err = s.repo.UpdateDocument(ctx, thoughtPath, map[string]interface{}{
		"aiProcessingStatus": "processing",
	})
	if err != nil {
		return fmt.Errorf("failed to update thought status: %w", err)
	}

	// 4. Gather user context
	userContext, err := s.contextGatherer.GatherContext(ctx, uid)
	if err != nil {
		s.logger.Warn("Failed to gather context", zap.Error(err))
		userContext = &models.UserContext{} // Continue with empty context
	}

	// 5. Build prompt
	prompt := s.buildPrompt(thought, userContext)

	// 6. Call AI
	var response *clients.ChatCompletionResponse
	if modelName == "" || strings.Contains(modelName, "gpt") {
		// Use OpenAI
		response, err = s.openaiClient.ChatCompletion(ctx, clients.ChatCompletionRequest{
			Model: modelName,
			Messages: []clients.ChatMessage{
				{Role: "system", Content: prompt},
			},
			ResponseFormat: &clients.ResponseFormat{Type: "json_object"},
		})
	} else {
		// Use Anthropic
		response, err = s.anthropicClient.ChatCompletion(ctx, clients.ChatCompletionRequest{
			Model: modelName,
			Messages: []clients.ChatMessage{
				{Role: "user", Content: prompt},
			},
		})
	}

	if err != nil {
		// Mark as failed
		s.repo.UpdateDocument(ctx, thoughtPath, map[string]interface{}{
			"aiProcessingStatus": "failed",
			"aiProcessingError":  err.Error(),
		})
		return fmt.Errorf("AI request failed: %w", err)
	}

	// 7. Parse AI response
	var aiResponse models.ThoughtProcessingResponse
	if err := json.Unmarshal([]byte(response.Content), &aiResponse); err != nil {
		s.logger.Error("Failed to parse AI response", zap.Error(err), zap.String("content", response.Content))
		return fmt.Errorf("failed to parse AI response: %w", err)
	}

	// 8. Execute actions
	executedActions := 0
	for _, action := range aiResponse.Actions {
		// Only auto-execute high confidence actions
		if action.Confidence >= 95 {
			err := s.actionProcessor.ExecuteAction(ctx, uid, thoughtID, action)
			if err != nil {
				s.logger.Warn("Failed to execute action",
					zap.Error(err),
					zap.String("actionType", action.Type),
				)
			} else {
				executedActions++
			}
		}
	}

	// 9. Update thought with results
	tags := []interface{}{"processed"}
	if existingTags, ok := thought["tags"].([]interface{}); ok {
		tags = append(existingTags, "processed")
	}

	updates := map[string]interface{}{
		"tags":                tags,
		"aiProcessingStatus":  "completed",
		"processedAt":         time.Now(),
		"aiMetadata": map[string]interface{}{
			"model":           response.Model,
			"tokensUsed":      response.TokensUsed,
			"actionsFound":    len(aiResponse.Actions),
			"actionsExecuted": executedActions,
			"processedAt":     time.Now(),
		},
	}

	err = s.repo.UpdateDocument(ctx, thoughtPath, updates)
	if err != nil {
		return fmt.Errorf("failed to update thought: %w", err)
	}

	// 10. Increment usage stats
	s.subscriptionSvc.IncrementUsage(ctx, uid, response.TokensUsed)

	s.logger.Info("Thought processing completed",
		zap.String("uid", uid),
		zap.String("thoughtId", thoughtID),
		zap.Int("tokensUsed", response.TokensUsed),
		zap.Int("actionsExecuted", executedActions),
	)

	return nil
}

// buildPrompt builds the AI prompt for thought processing
func (s *ThoughtProcessingService) buildPrompt(thought map[string]interface{}, context *models.UserContext) string {
	// Extract thought text
	thoughtText := ""
	if text, ok := thought["text"].(string); ok {
		thoughtText = text
	}

	thoughtType := "neutral"
	if t, ok := thought["type"].(string); ok {
		thoughtType = t
	}

	tags := []string{}
	if t, ok := thought["tags"].([]interface{}); ok {
		for _, tag := range t {
			if tagStr, ok := tag.(string); ok {
				tags = append(tags, tagStr)
			}
		}
	}

	// Build context section
	contextSection := s.buildContextSection(context)

	// Build the prompt (matches the TypeScript version)
	prompt := fmt.Sprintf(`You are an intelligent thought processor for a productivity and mental wellness app.

Available Tools (connect thoughts to tools for processing):
- tasks: Thought contains actionable items that should become tasks
- projects: Relates to project planning or execution
- goals: Connects to personal or professional goals
- moodtracker: Expresses emotions or mental state that should be tracked
- cbt: Contains cognitive distortions or negative thinking patterns suitable for CBT analysis
- focus: Suitable for focused work sessions or deep work
- brainstorming: Contains ideas for exploration and ideation
- relationships: Mentions people or relationship dynamics
- notes: General reference or learning material to save
- errands: Contains to-do items for daily tasks

Available Actions:
- createRelationship: Connect this thought to a tool or entity
  * For tool connections: Use when thought should be processed by a specific tool
  * For entity connections: Use to link thought to tasks, projects, goals, moods, or people
- createTask: Create a new task from the thought
- enhanceTask: Enhance an existing task with information from this thought (provide taskId in data)
- createProject: Create a new project
- createGoal: Create a new goal
- createMood: Create a mood entry

%s

User Thought:
Text: "%s"
Type: %s
Current Tags: %s

Analyze this thought and suggest helpful actions. Consider:
1. **Tool Tags**: Which tools (tasks, projects, goals, mood, cbt, etc.) can benefit from this thought?
2. **Existing Data Context**: Review the user's current goals, projects, tasks, and moods to determine if this thought should:
   - Link to an existing project/goal (use createRelationship action)
   - Create a new project/goal (use createProject/createGoal action)
   - Enhance an existing task with new information (use enhanceTask with taskId)
   - Create a new task (use createTask)
   - Track mood/emotion (use createMood)
3. **Confidence Scoring**: For each action, provide a confidence score (0-100):
   - 99-100: Very high confidence, safe to auto-apply immediately
   - 70-98: Medium confidence, show as suggestion for user approval
   - 0-69: Low confidence, do not suggest

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "actions": [
    {
      "type": "createRelationship",
      "confidence": 95,
      "data": {
        "targetType": "tool",
        "targetId": "tasks",
        "relationshipType": "should-be-processed-by",
        "reasoning": "Thought contains actionable items that should become tasks"
      },
      "reasoning": "Thought contains clear actionable items"
    },
    {
      "type": "createTask",
      "confidence": 85,
      "data": {
        "title": "specific task title",
        "category": "mastery",
        "priority": "high"
      },
      "reasoning": "Clear actionable item identified"
    }
  ]
}

Rules:
- Only suggest actions that are truly helpful
- Don't create tasks for vague thoughts
- Use appropriate categories: health, wealth, mastery, connection
- Be conservative with task creation
- Consider existing user data when making decisions
- Confidence scores should be accurate and conservative
- Each relationship should have clear reasoning explaining why the connection is valuable`, contextSection, thoughtText, thoughtType, strings.Join(tags, ", "))

	return prompt
}

// buildContextSection builds the user context section of the prompt
func (s *ThoughtProcessingService) buildContextSection(context *models.UserContext) string {
	var sections []string

	if len(context.Goals) > 0 {
		goalsStr := fmt.Sprintf("\nGoals (%d):", len(context.Goals))
		for _, goal := range context.Goals {
			title := getStringField(goal, "title")
			status := getStringField(goal, "status")
			objective := getStringField(goal, "objective")
			goalsStr += fmt.Sprintf("\n- %s (%s) - %s", title, status, objective)
		}
		sections = append(sections, goalsStr)
	}

	if len(context.Projects) > 0 {
		projectsStr := fmt.Sprintf("\nProjects (%d):", len(context.Projects))
		for _, project := range context.Projects {
			title := getStringField(project, "title")
			status := getStringField(project, "status")
			description := getStringField(project, "description")
			projectsStr += fmt.Sprintf("\n- %s (%s) - %s", title, status, description)
		}
		sections = append(sections, projectsStr)
	}

	if len(context.Tasks) > 0 {
		tasksStr := fmt.Sprintf("\nActive Tasks (%d):", len(context.Tasks))
		for _, task := range context.Tasks {
			title := getStringField(task, "title")
			category := getStringField(task, "category")
			priority := getStringField(task, "priority")
			tasksStr += fmt.Sprintf("\n- %s (%s) - %s", title, category, priority)
		}
		sections = append(sections, tasksStr)
	}

	if len(context.Moods) > 0 {
		moodsStr := fmt.Sprintf("\nRecent Moods (%d):", len(context.Moods))
		for _, mood := range context.Moods {
			value := getIntField(mood, "value")
			note := getStringField(mood, "note")
			moodsStr += fmt.Sprintf("\n- %d/10 - %s", value, note)
		}
		sections = append(sections, moodsStr)
	}

	if len(sections) == 0 {
		return ""
	}

	return "User's Current Data Context:" + strings.Join(sections, "\n")
}

// Helper functions to safely extract fields from maps
func getStringField(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getIntField(m map[string]interface{}, key string) int {
	if val, ok := m[key].(float64); ok {
		return int(val)
	}
	if val, ok := m[key].(int); ok {
		return val
	}
	return 0
}
