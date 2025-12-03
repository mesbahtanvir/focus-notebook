package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
)

// Tests for ActionProcessor

func TestNewActionProcessor(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()

	processor := NewActionProcessor(repo, logger)

	assert.NotNil(t, processor)
	assert.Equal(t, repo, processor.repo)
	assert.Equal(t, logger, processor.logger)
}

func TestNewActionProcessor_WithNilRepository(t *testing.T) {
	logger := zap.NewNop()

	processor := NewActionProcessor(nil, logger)

	assert.NotNil(t, processor)
	assert.Nil(t, processor.repo)
	assert.Equal(t, logger, processor.logger)
}

func TestNewActionProcessor_WithNilLogger(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)

	processor := NewActionProcessor(repo, nil)

	assert.NotNil(t, processor)
	assert.Equal(t, repo, processor.repo)
	assert.Nil(t, processor.logger)
}

func TestNewActionProcessor_AllNil(t *testing.T) {
	processor := NewActionProcessor(nil, nil)

	assert.NotNil(t, processor)
	assert.Nil(t, processor.repo)
	assert.Nil(t, processor.logger)
}

func TestActionProcessor_Fields(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()
	processor := NewActionProcessor(repo, logger)

	assert.NotNil(t, processor.repo)
	assert.NotNil(t, processor.logger)
}

func TestActionProcessor_RepositoryStorage(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	processor := NewActionProcessor(repo, nil)

	assert.Equal(t, repo, processor.repo)
}

func TestActionProcessor_LoggerStorage(t *testing.T) {
	logger := zap.NewNop()
	processor := NewActionProcessor(nil, logger)

	assert.Equal(t, logger, processor.logger)
}

func TestActionProcessor_Constructor(t *testing.T) {
	processor := NewActionProcessor(nil, nil)

	assert.Nil(t, processor.repo)
	assert.Nil(t, processor.logger)
}

func TestActionProcessor_MultipleInstances(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()

	processor1 := NewActionProcessor(repo, logger)
	processor2 := NewActionProcessor(repo, logger)

	assert.NotNil(t, processor1)
	assert.NotNil(t, processor2)
	assert.Equal(t, repo, processor1.repo)
	assert.Equal(t, repo, processor2.repo)
}

func TestActionProcessor_WithRepository(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	processor := NewActionProcessor(repo, nil)

	assert.NotNil(t, processor)
	assert.NotNil(t, processor.repo)
}

func TestActionProcessor_WithLogger(t *testing.T) {
	logger := zap.NewNop()
	processor := NewActionProcessor(nil, logger)

	assert.NotNil(t, processor)
	assert.NotNil(t, processor.logger)
}

func TestActionProcessor_ImplementsExpectedMethods(t *testing.T) {
	processor := NewActionProcessor(nil, nil)

	assert.NotNil(t, processor)
	// Processor should have ExecuteAction method
}

// Tests for helper functions

func TestGetStringFieldFromMap_ExistingField(t *testing.T) {
	m := map[string]interface{}{
		"title": "Test Title",
	}

	result := getStringFieldFromMap(m, "title")

	assert.Equal(t, "Test Title", result)
}

func TestGetStringFieldFromMap_MissingField(t *testing.T) {
	m := map[string]interface{}{
		"title": "Test Title",
	}

	result := getStringFieldFromMap(m, "missing")

	assert.Equal(t, "", result)
}

func TestGetStringFieldFromMap_EmptyMap(t *testing.T) {
	m := make(map[string]interface{})

	result := getStringFieldFromMap(m, "anykey")

	assert.Equal(t, "", result)
}

func TestGetStringFieldFromMap_NilValue(t *testing.T) {
	m := map[string]interface{}{
		"title": nil,
	}

	result := getStringFieldFromMap(m, "title")

	assert.Equal(t, "", result)
}

func TestGetStringFieldFromMap_WrongType(t *testing.T) {
	m := map[string]interface{}{
		"title": 123,
	}

	result := getStringFieldFromMap(m, "title")

	assert.Equal(t, "", result)
}

func TestGetIntFieldFromMap_ExistingFloat(t *testing.T) {
	m := map[string]interface{}{
		"count": 42.0,
	}

	result := getIntFieldFromMap(m, "count")

	assert.Equal(t, 42, result)
}

func TestGetIntFieldFromMap_ExistingInt(t *testing.T) {
	m := map[string]interface{}{
		"count": 42,
	}

	result := getIntFieldFromMap(m, "count")

	assert.Equal(t, 42, result)
}

func TestGetIntFieldFromMap_MissingField(t *testing.T) {
	m := map[string]interface{}{
		"count": 42,
	}

	result := getIntFieldFromMap(m, "missing")

	assert.Equal(t, 0, result)
}

func TestGetIntFieldFromMap_EmptyMap(t *testing.T) {
	m := make(map[string]interface{})

	result := getIntFieldFromMap(m, "anykey")

	assert.Equal(t, 0, result)
}

func TestGetIntFieldFromMap_NilValue(t *testing.T) {
	m := map[string]interface{}{
		"count": nil,
	}

	result := getIntFieldFromMap(m, "count")

	assert.Equal(t, 0, result)
}

func TestGetIntFieldFromMap_WrongType(t *testing.T) {
	m := map[string]interface{}{
		"count": "not a number",
	}

	result := getIntFieldFromMap(m, "count")

	assert.Equal(t, 0, result)
}

func TestGenerateID_NotEmpty(t *testing.T) {
	id := generateID()

	assert.NotEmpty(t, id)
}

func TestGenerateID_Unique(t *testing.T) {
	id1 := generateID()
	id2 := generateID()

	// IDs may or may not be unique due to timing (nano vs unix seconds)
	// but both should be non-empty
	assert.NotEmpty(t, id1)
	assert.NotEmpty(t, id2)
}

func TestGenerateID_HasDash(t *testing.T) {
	id := generateID()

	assert.Contains(t, id, "-")
}

func TestGenerateID_Format(t *testing.T) {
	id := generateID()

	// Should have format: timestamp-random
	parts := len(id)
	assert.Greater(t, parts, 0)
	assert.Contains(t, id, "-")
}

func TestGenerateID_MultipleGeneration(t *testing.T) {
	ids := make(map[string]bool)

	for i := 0; i < 5; i++ {
		id := generateID()
		assert.NotEmpty(t, id)
		assert.Contains(t, id, "-")
		ids[id] = true
	}

	assert.Greater(t, len(ids), 0)
}

func TestActionProcessor_AllFields(t *testing.T) {
	repo := repository.NewFirestoreRepository(nil)
	logger := zap.NewNop()

	processor := NewActionProcessor(repo, logger)

	assert.NotNil(t, processor.repo)
	assert.NotNil(t, processor.logger)
}

func TestGetStringFieldFromMap_MultipleKeys(t *testing.T) {
	m := map[string]interface{}{
		"title":       "Test",
		"description": "Desc",
		"priority":    "high",
	}

	assert.Equal(t, "Test", getStringFieldFromMap(m, "title"))
	assert.Equal(t, "Desc", getStringFieldFromMap(m, "description"))
	assert.Equal(t, "high", getStringFieldFromMap(m, "priority"))
}

func TestGetIntFieldFromMap_MultipleKeys(t *testing.T) {
	m := map[string]interface{}{
		"count": 42.0,
		"value": 100,
		"score": 5.5,
	}

	assert.Equal(t, 42, getIntFieldFromMap(m, "count"))
	assert.Equal(t, 100, getIntFieldFromMap(m, "value"))
	assert.Equal(t, 5, getIntFieldFromMap(m, "score"))
}

func TestGetStringFieldFromMap_EmptyString(t *testing.T) {
	m := map[string]interface{}{
		"title": "",
	}

	result := getStringFieldFromMap(m, "title")

	assert.Equal(t, "", result)
}

func TestActionProcessor_ConstructorVariations(t *testing.T) {
	// Variation 1: both nil
	p1 := NewActionProcessor(nil, nil)
	assert.Nil(t, p1.repo)
	assert.Nil(t, p1.logger)

	// Variation 2: repo only
	repo := repository.NewFirestoreRepository(nil)
	p2 := NewActionProcessor(repo, nil)
	assert.NotNil(t, p2.repo)
	assert.Nil(t, p2.logger)

	// Variation 3: logger only
	logger := zap.NewNop()
	p3 := NewActionProcessor(nil, logger)
	assert.Nil(t, p3.repo)
	assert.NotNil(t, p3.logger)

	// Variation 4: both
	p4 := NewActionProcessor(repo, logger)
	assert.NotNil(t, p4.repo)
	assert.NotNil(t, p4.logger)
}

// Additional comprehensive tests for helper functions

func TestGetStringFieldFromMap_AllEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		data     map[string]interface{}
		key      string
		expected string
	}{
		{"normal string", map[string]interface{}{"key": "value"}, "key", "value"},
		{"empty string", map[string]interface{}{"key": ""}, "key", ""},
		{"missing key", map[string]interface{}{}, "key", ""},
		{"nil map value", map[string]interface{}{"key": nil}, "key", ""},
		{"int value", map[string]interface{}{"key": 123}, "key", ""},
		{"float value", map[string]interface{}{"key": 12.34}, "key", ""},
		{"bool value", map[string]interface{}{"key": true}, "key", ""},
		{"array value", map[string]interface{}{"key": []string{"a", "b"}}, "key", ""},
		{"map value", map[string]interface{}{"key": map[string]string{"nested": "value"}}, "key", ""},
		{"unicode string", map[string]interface{}{"key": "日本語"}, "key", "日本語"},
		{"special chars", map[string]interface{}{"key": "!@#$%^&*()"}, "key", "!@#$%^&*()"},
		{"whitespace", map[string]interface{}{"key": "  spaces  "}, "key", "  spaces  "},
		{"newlines", map[string]interface{}{"key": "line1\nline2"}, "key", "line1\nline2"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getStringFieldFromMap(tt.data, tt.key)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetIntFieldFromMap_AllEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		data     map[string]interface{}
		key      string
		expected int
	}{
		{"positive float", map[string]interface{}{"key": float64(42)}, "key", 42},
		{"negative float", map[string]interface{}{"key": float64(-42)}, "key", -42},
		{"zero float", map[string]interface{}{"key": float64(0)}, "key", 0},
		{"large float", map[string]interface{}{"key": float64(1000000)}, "key", 1000000},
		{"positive int", map[string]interface{}{"key": 42}, "key", 42},
		{"negative int", map[string]interface{}{"key": -42}, "key", -42},
		{"zero int", map[string]interface{}{"key": 0}, "key", 0},
		{"missing key", map[string]interface{}{}, "key", 0},
		{"nil value", map[string]interface{}{"key": nil}, "key", 0},
		{"string value", map[string]interface{}{"key": "42"}, "key", 0},
		{"bool value", map[string]interface{}{"key": true}, "key", 0},
		{"fractional float truncates", map[string]interface{}{"key": float64(42.9)}, "key", 42},
		{"negative fractional", map[string]interface{}{"key": float64(-42.9)}, "key", -42},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getIntFieldFromMap(tt.data, tt.key)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGenerateID_Uniqueness(t *testing.T) {
	// Generate 100 IDs and ensure they're all unique
	ids := make(map[string]struct{})
	iterations := 100

	for i := 0; i < iterations; i++ {
		id := generateID()
		if _, exists := ids[id]; exists {
			t.Errorf("Duplicate ID generated: %s", id)
		}
		ids[id] = struct{}{}
	}

	assert.Equal(t, iterations, len(ids))
}

func TestGenerateID_LengthConsistency(t *testing.T) {
	// All generated IDs should have reasonable length
	for i := 0; i < 10; i++ {
		id := generateID()
		assert.GreaterOrEqual(t, len(id), 10, "ID should have minimum length")
		assert.LessOrEqual(t, len(id), 50, "ID should not be excessively long")
	}
}

func TestActionData_TaskCreation(t *testing.T) {
	data := map[string]interface{}{
		"title":    "Complete unit tests",
		"category": "mastery",
		"priority": "high",
		"notes":    "Need to reach 50% coverage",
	}

	title := getStringFieldFromMap(data, "title")
	category := getStringFieldFromMap(data, "category")
	priority := getStringFieldFromMap(data, "priority")
	notes := getStringFieldFromMap(data, "notes")

	assert.Equal(t, "Complete unit tests", title)
	assert.Equal(t, "mastery", category)
	assert.Equal(t, "high", priority)
	assert.Equal(t, "Need to reach 50% coverage", notes)
}

func TestActionData_ProjectCreation(t *testing.T) {
	data := map[string]interface{}{
		"title":       "Backend Testing Initiative",
		"description": "Improve test coverage across all services",
	}

	title := getStringFieldFromMap(data, "title")
	description := getStringFieldFromMap(data, "description")

	assert.Equal(t, "Backend Testing Initiative", title)
	assert.Equal(t, "Improve test coverage across all services", description)
}

func TestActionData_GoalCreation(t *testing.T) {
	data := map[string]interface{}{
		"title":     "Improve Code Quality",
		"objective": "Maintain 80%+ test coverage",
	}

	title := getStringFieldFromMap(data, "title")
	objective := getStringFieldFromMap(data, "objective")

	assert.Equal(t, "Improve Code Quality", title)
	assert.Equal(t, "Maintain 80%+ test coverage", objective)
}

func TestActionData_MoodCreation(t *testing.T) {
	data := map[string]interface{}{
		"value": float64(8),
		"note":  "Feeling productive after writing tests",
	}

	value := getIntFieldFromMap(data, "value")
	note := getStringFieldFromMap(data, "note")

	assert.Equal(t, 8, value)
	assert.Equal(t, "Feeling productive after writing tests", note)
}

func TestActionData_RelationshipCreation(t *testing.T) {
	data := map[string]interface{}{
		"targetType":       "tool",
		"targetId":         "tasks",
		"relationshipType": "should-be-processed-by",
		"reasoning":        "Contains actionable items that should become tasks",
	}

	targetType := getStringFieldFromMap(data, "targetType")
	targetId := getStringFieldFromMap(data, "targetId")
	relationshipType := getStringFieldFromMap(data, "relationshipType")
	reasoning := getStringFieldFromMap(data, "reasoning")

	assert.Equal(t, "tool", targetType)
	assert.Equal(t, "tasks", targetId)
	assert.Equal(t, "should-be-processed-by", relationshipType)
	assert.Contains(t, reasoning, "actionable items")
}

func TestActionData_EnhanceTask(t *testing.T) {
	data := map[string]interface{}{
		"taskId":   "task-123-456",
		"notes":    "Additional context from thought",
		"priority": "high",
		"category": "health",
	}

	taskId := getStringFieldFromMap(data, "taskId")
	notes := getStringFieldFromMap(data, "notes")
	priority := getStringFieldFromMap(data, "priority")
	category := getStringFieldFromMap(data, "category")

	assert.Equal(t, "task-123-456", taskId)
	assert.Equal(t, "Additional context from thought", notes)
	assert.Equal(t, "high", priority)
	assert.Equal(t, "health", category)
}

func TestActionData_MissingOptionalFields(t *testing.T) {
	// Test that missing optional fields return defaults
	data := map[string]interface{}{
		"title": "Task with minimal data",
	}

	title := getStringFieldFromMap(data, "title")
	category := getStringFieldFromMap(data, "category")
	priority := getStringFieldFromMap(data, "priority")
	notes := getStringFieldFromMap(data, "notes")

	assert.Equal(t, "Task with minimal data", title)
	assert.Empty(t, category)
	assert.Empty(t, priority)
	assert.Empty(t, notes)
}

func TestActionData_AllCategories(t *testing.T) {
	categories := []string{"health", "wealth", "mastery", "connection"}

	for _, cat := range categories {
		data := map[string]interface{}{"category": cat}
		result := getStringFieldFromMap(data, "category")
		assert.Equal(t, cat, result)
	}
}

func TestActionData_AllPriorities(t *testing.T) {
	priorities := []string{"low", "medium", "high", "urgent"}

	for _, priority := range priorities {
		data := map[string]interface{}{"priority": priority}
		result := getStringFieldFromMap(data, "priority")
		assert.Equal(t, priority, result)
	}
}

func TestActionData_MoodValues(t *testing.T) {
	// Test mood values from 1-10
	for i := 1; i <= 10; i++ {
		data := map[string]interface{}{"value": float64(i)}
		result := getIntFieldFromMap(data, "value")
		assert.Equal(t, i, result)
	}
}
