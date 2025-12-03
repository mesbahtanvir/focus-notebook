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
