package services

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/models"
)

func TestGetStringField(t *testing.T) {
	tests := []struct {
		name     string
		data     map[string]interface{}
		key      string
		expected string
	}{
		{"existing string", map[string]interface{}{"name": "test"}, "name", "test"},
		{"missing key", map[string]interface{}{"other": "value"}, "name", ""},
		{"non-string value", map[string]interface{}{"count": 42}, "count", ""},
		{"nil value", map[string]interface{}{"name": nil}, "name", ""},
		{"empty string", map[string]interface{}{"name": ""}, "name", ""},
		{"empty map", map[string]interface{}{}, "name", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getStringField(tt.data, tt.key)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetIntField(t *testing.T) {
	tests := []struct {
		name     string
		data     map[string]interface{}
		key      string
		expected int
	}{
		{"float64 value", map[string]interface{}{"count": float64(42)}, "count", 42},
		{"int value", map[string]interface{}{"count": 42}, "count", 42},
		{"missing key", map[string]interface{}{}, "count", 0},
		{"non-numeric value", map[string]interface{}{"count": "42"}, "count", 0},
		{"nil value", map[string]interface{}{"count": nil}, "count", 0},
		{"negative float", map[string]interface{}{"count": float64(-10)}, "count", -10},
		{"large number", map[string]interface{}{"count": float64(1000000)}, "count", 1000000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getIntField(tt.data, tt.key)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBuildContextSection_Empty(t *testing.T) {
	service := &ThoughtProcessingService{}
	context := &models.UserContext{
		Goals:    []map[string]interface{}{},
		Projects: []map[string]interface{}{},
		Tasks:    []map[string]interface{}{},
		Moods:    []map[string]interface{}{},
	}

	result := service.buildContextSection(context)
	assert.Empty(t, result)
}

func TestBuildContextSection_WithGoals(t *testing.T) {
	service := &ThoughtProcessingService{}
	context := &models.UserContext{
		Goals: []map[string]interface{}{
			{
				"title":     "Learn Go",
				"status":    "active",
				"objective": "Master backend development",
			},
			{
				"title":     "Get fit",
				"status":    "active",
				"objective": "Run a marathon",
			},
		},
	}

	result := service.buildContextSection(context)

	assert.Contains(t, result, "Goals (2)")
	assert.Contains(t, result, "Learn Go")
	assert.Contains(t, result, "Get fit")
	assert.Contains(t, result, "Master backend development")
}

func TestBuildContextSection_WithProjects(t *testing.T) {
	service := &ThoughtProcessingService{}
	context := &models.UserContext{
		Projects: []map[string]interface{}{
			{
				"title":       "Focus Notebook",
				"status":      "in-progress",
				"description": "Mental health app",
			},
		},
	}

	result := service.buildContextSection(context)

	assert.Contains(t, result, "Projects (1)")
	assert.Contains(t, result, "Focus Notebook")
	assert.Contains(t, result, "in-progress")
}

func TestBuildContextSection_WithTasks(t *testing.T) {
	service := &ThoughtProcessingService{}
	context := &models.UserContext{
		Tasks: []map[string]interface{}{
			{
				"title":    "Write tests",
				"category": "mastery",
				"priority": "high",
			},
			{
				"title":    "Review PR",
				"category": "mastery",
				"priority": "medium",
			},
		},
	}

	result := service.buildContextSection(context)

	assert.Contains(t, result, "Active Tasks (2)")
	assert.Contains(t, result, "Write tests")
	assert.Contains(t, result, "Review PR")
	assert.Contains(t, result, "mastery")
}

func TestBuildContextSection_WithMoods(t *testing.T) {
	service := &ThoughtProcessingService{}
	context := &models.UserContext{
		Moods: []map[string]interface{}{
			{
				"value": 8,
				"note":  "Feeling productive",
			},
			{
				"value": float64(6),
				"note":  "A bit tired",
			},
		},
	}

	result := service.buildContextSection(context)

	assert.Contains(t, result, "Recent Moods (2)")
	assert.Contains(t, result, "8/10")
	assert.Contains(t, result, "Feeling productive")
	assert.Contains(t, result, "6/10")
}

func TestBuildContextSection_FullContext(t *testing.T) {
	service := &ThoughtProcessingService{}
	context := &models.UserContext{
		Goals: []map[string]interface{}{
			{"title": "Goal1", "status": "active", "objective": "Obj1"},
		},
		Projects: []map[string]interface{}{
			{"title": "Project1", "status": "active", "description": "Desc1"},
		},
		Tasks: []map[string]interface{}{
			{"title": "Task1", "category": "health", "priority": "high"},
		},
		Moods: []map[string]interface{}{
			{"value": 7, "note": "Good"},
		},
	}

	result := service.buildContextSection(context)

	assert.Contains(t, result, "User's Current Data Context")
	assert.Contains(t, result, "Goals (1)")
	assert.Contains(t, result, "Projects (1)")
	assert.Contains(t, result, "Active Tasks (1)")
	assert.Contains(t, result, "Recent Moods (1)")
}

func TestBuildPrompt_BasicThought(t *testing.T) {
	service := &ThoughtProcessingService{}
	thought := map[string]interface{}{
		"text": "I need to start exercising more",
		"type": "negative",
		"tags": []interface{}{"health", "improvement"},
	}
	context := &models.UserContext{}

	result := service.buildPrompt(thought, context)

	// Check prompt contains key elements
	assert.Contains(t, result, "I need to start exercising more")
	assert.Contains(t, result, "negative")
	assert.Contains(t, result, "health")
	assert.Contains(t, result, "improvement")
	assert.Contains(t, result, "Available Tools")
	assert.Contains(t, result, "Available Actions")
	assert.Contains(t, result, "createTask")
	assert.Contains(t, result, "createRelationship")
}

func TestBuildPrompt_WithContext(t *testing.T) {
	service := &ThoughtProcessingService{}
	thought := map[string]interface{}{
		"text": "Feeling good about my progress",
		"type": "positive",
	}
	context := &models.UserContext{
		Goals: []map[string]interface{}{
			{"title": "Fitness", "status": "active", "objective": "Stay healthy"},
		},
	}

	result := service.buildPrompt(thought, context)

	assert.Contains(t, result, "Feeling good about my progress")
	assert.Contains(t, result, "Fitness")
	assert.Contains(t, result, "Stay healthy")
}

func TestBuildPrompt_EmptyThought(t *testing.T) {
	service := &ThoughtProcessingService{}
	thought := map[string]interface{}{}
	context := &models.UserContext{}

	result := service.buildPrompt(thought, context)

	// Should handle empty thought gracefully
	assert.Contains(t, result, "User Thought")
	assert.Contains(t, result, "Type: neutral") // Default type
}

func TestBuildPrompt_ContainsAllTools(t *testing.T) {
	service := &ThoughtProcessingService{}
	thought := map[string]interface{}{
		"text": "test",
	}
	context := &models.UserContext{}

	result := service.buildPrompt(thought, context)

	// Verify all tools are mentioned
	tools := []string{
		"tasks", "projects", "goals", "moodtracker",
		"cbt", "focus", "brainstorming", "relationships",
		"notes", "errands",
	}

	for _, tool := range tools {
		assert.Contains(t, result, tool)
	}
}

func TestBuildPrompt_ContainsAllActions(t *testing.T) {
	service := &ThoughtProcessingService{}
	thought := map[string]interface{}{
		"text": "test",
	}
	context := &models.UserContext{}

	result := service.buildPrompt(thought, context)

	// Verify all actions are mentioned
	actions := []string{
		"createRelationship", "createTask", "enhanceTask",
		"createProject", "createGoal", "createMood",
	}

	for _, action := range actions {
		assert.Contains(t, result, action)
	}
}

func TestBuildPrompt_ContainsCategories(t *testing.T) {
	service := &ThoughtProcessingService{}
	thought := map[string]interface{}{
		"text": "test",
	}
	context := &models.UserContext{}

	result := service.buildPrompt(thought, context)

	// Verify categories are mentioned
	categories := []string{"health", "wealth", "mastery", "connection"}

	for _, category := range categories {
		assert.Contains(t, result, category)
	}
}

func TestBuildPrompt_JSONFormatInstructions(t *testing.T) {
	service := &ThoughtProcessingService{}
	thought := map[string]interface{}{
		"text": "test",
	}
	context := &models.UserContext{}

	result := service.buildPrompt(thought, context)

	// Verify JSON format instructions
	assert.Contains(t, result, "ONLY with valid JSON")
	assert.Contains(t, result, "\"actions\"")
	assert.Contains(t, result, "\"confidence\"")
	assert.Contains(t, result, "\"reasoning\"")
}

func TestNewThoughtProcessingService(t *testing.T) {
	service := NewThoughtProcessingService(nil, nil, nil, nil, nil, nil, nil)
	assert.NotNil(t, service)
}

func TestBuildContextSection_HandlesNilFields(t *testing.T) {
	service := &ThoughtProcessingService{}
	context := &models.UserContext{
		Goals: []map[string]interface{}{
			{
				"title":     nil,
				"status":    nil,
				"objective": nil,
			},
		},
	}

	// Should not panic
	result := service.buildContextSection(context)
	assert.Contains(t, result, "Goals (1)")
}

func TestBuildContextSection_MixedTypes(t *testing.T) {
	service := &ThoughtProcessingService{}
	context := &models.UserContext{
		Moods: []map[string]interface{}{
			{
				"value": 8,
				"note":  "Good",
			},
			{
				"value": float64(7),
				"note":  "OK",
			},
			{
				"value": "invalid", // Non-numeric value
				"note":  "Bad data",
			},
		},
	}

	result := service.buildContextSection(context)

	assert.Contains(t, result, "8/10")
	assert.Contains(t, result, "7/10")
	assert.Contains(t, result, "0/10") // Invalid value defaults to 0
}
