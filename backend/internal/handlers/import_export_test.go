package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewImportExportHandler(t *testing.T) {
	svc := &services.ImportExportService{}
	logger := zap.NewNop()

	handler := NewImportExportHandler(svc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.svc)
	assert.Equal(t, logger, handler.logger)
}

func TestNewImportExportHandler_WithNilLogger(t *testing.T) {
	svc := &services.ImportExportService{}

	handler := NewImportExportHandler(svc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, svc, handler.svc)
	assert.Nil(t, handler.logger)
}

func TestNewImportExportHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewImportExportHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.svc)
	assert.Equal(t, logger, handler.logger)
}

func TestNewImportExportHandler_MultipleInstances(t *testing.T) {
	svc := &services.ImportExportService{}
	logger := zap.NewNop()

	handler1 := NewImportExportHandler(svc, logger)
	handler2 := NewImportExportHandler(svc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.svc, handler2.svc)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestSplitAndTrim_EmptyString(t *testing.T) {
	result := splitAndTrim("", ",")

	assert.Equal(t, []string{}, result)
}

func TestSplitAndTrim_SingleValue(t *testing.T) {
	result := splitAndTrim("tasks", ",")

	assert.Equal(t, []string{"tasks"}, result)
}

func TestSplitAndTrim_MultipleValues(t *testing.T) {
	result := splitAndTrim("tasks,projects,goals", ",")

	assert.Equal(t, []string{"tasks", "projects", "goals"}, result)
}

func TestSplitAndTrim_WithSpaces(t *testing.T) {
	result := splitAndTrim("tasks , projects , goals", ",")

	assert.Equal(t, []string{"tasks", "projects", "goals"}, result)
}

func TestSplitAndTrim_WithLeadingTrailingSpaces(t *testing.T) {
	result := splitAndTrim("  tasks  ,  projects  ,  goals  ", ",")

	assert.Equal(t, []string{"tasks", "projects", "goals"}, result)
}

func TestSplitAndTrim_EmptyParts(t *testing.T) {
	result := splitAndTrim("tasks,,projects", ",")

	assert.Equal(t, []string{"tasks", "projects"}, result)
}

func TestSplitAndTrim_OnlyWhitespace(t *testing.T) {
	result := splitAndTrim("  ,  ,  ", ",")

	assert.Equal(t, []string{}, result)
}

func TestSplitAndTrim_DifferentDelimiter(t *testing.T) {
	result := splitAndTrim("tasks;projects;goals", ";")

	assert.Equal(t, []string{"tasks", "projects", "goals"}, result)
}

func TestSplitAndTrim_TabAndNewline(t *testing.T) {
	result := splitAndTrim("tasks\t,\nprojects\n,\rgoals\r", ",")

	assert.Equal(t, []string{"tasks", "projects", "goals"}, result)
}

func TestSplitString_EmptyString(t *testing.T) {
	result := splitString("", ",")

	assert.Equal(t, []string{}, result)
}

func TestSplitString_SingleValue(t *testing.T) {
	result := splitString("tasks", ",")

	assert.Equal(t, []string{"tasks"}, result)
}

func TestSplitString_MultipleValues(t *testing.T) {
	result := splitString("tasks,projects,goals", ",")

	assert.Equal(t, []string{"tasks", "projects", "goals"}, result)
}

func TestSplitString_ConsecutiveDelimiters(t *testing.T) {
	result := splitString("tasks,,goals", ",")

	assert.Equal(t, []string{"tasks", "", "goals"}, result)
}

func TestSplitString_DifferentDelimiter(t *testing.T) {
	result := splitString("tasks;projects;goals", ";")

	assert.Equal(t, []string{"tasks", "projects", "goals"}, result)
}

func TestSplitString_SingleCharacter(t *testing.T) {
	result := splitString("a", ",")

	assert.Equal(t, []string{"a"}, result)
}

func TestSplitString_OnlyDelimiter(t *testing.T) {
	result := splitString(",", ",")

	assert.Equal(t, []string{""}, result)
}

func TestTrimSpace_EmptyString(t *testing.T) {
	result := trimSpace("")

	assert.Equal(t, "", result)
}

func TestTrimSpace_NoWhitespace(t *testing.T) {
	result := trimSpace("tasks")

	assert.Equal(t, "tasks", result)
}

func TestTrimSpace_LeadingSpaces(t *testing.T) {
	result := trimSpace("  tasks")

	assert.Equal(t, "tasks", result)
}

func TestTrimSpace_TrailingSpaces(t *testing.T) {
	result := trimSpace("tasks  ")

	assert.Equal(t, "tasks", result)
}

func TestTrimSpace_BothSides(t *testing.T) {
	result := trimSpace("  tasks  ")

	assert.Equal(t, "tasks", result)
}

func TestTrimSpace_OnlyWhitespace(t *testing.T) {
	result := trimSpace("   ")

	assert.Equal(t, "", result)
}

func TestTrimSpace_Tabs(t *testing.T) {
	result := trimSpace("\ttasks\t")

	assert.Equal(t, "tasks", result)
}

func TestTrimSpace_Newlines(t *testing.T) {
	result := trimSpace("\ntasks\n")

	assert.Equal(t, "tasks", result)
}

func TestTrimSpace_CarriageReturns(t *testing.T) {
	result := trimSpace("\rtasks\r")

	assert.Equal(t, "tasks", result)
}

func TestTrimSpace_MixedWhitespace(t *testing.T) {
	result := trimSpace("\t\n\r  tasks  \r\n\t")

	assert.Equal(t, "tasks", result)
}

func TestTrimSpace_WhitespaceInMiddle(t *testing.T) {
	result := trimSpace("  hello world  ")

	assert.Equal(t, "hello world", result)
}

func TestTrimSpace_SingleCharacter(t *testing.T) {
	result := trimSpace("a")

	assert.Equal(t, "a", result)
}
