package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/utils"
)

// ImportExportHandler handles import/export requests
type ImportExportHandler struct {
	svc    *services.ImportExportService
	logger *zap.Logger
}

// NewImportExportHandler creates a new import/export handler
func NewImportExportHandler(svc *services.ImportExportService, logger *zap.Logger) *ImportExportHandler {
	return &ImportExportHandler{
		svc:    svc,
		logger: logger,
	}
}

// ValidateImport validates import data and returns conflicts
// POST /api/import/validate
func (h *ImportExportHandler) ValidateImport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Read uploaded file (max 50MB)
	r.Body = http.MaxBytesReader(w, r.Body, 50*1024*1024)

	// Parse multipart form
	if err := r.ParseMultipartForm(50 * 1024 * 1024); err != nil {
		utils.RespondError(w, "File too large or invalid multipart form", http.StatusBadRequest)
		return
	}

	// Get file from form
	file, _, err := r.FormFile("file")
	if err != nil {
		utils.RespondError(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file contents
	data, err := io.ReadAll(file)
	if err != nil {
		h.logger.Error("Failed to read file", zap.Error(err))
		utils.RespondError(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	h.logger.Debug("ValidateImport request",
		zap.String("uid", uid),
		zap.Int("fileSize", len(data)),
	)

	// Validate import
	result, err := h.svc.ValidateImport(ctx, uid, data)
	if err != nil {
		h.logger.Error("Failed to validate import", zap.Error(err))
		utils.RespondError(w, "Failed to validate import: "+err.Error(), http.StatusBadRequest)
		return
	}

	utils.RespondSuccess(w, result, "Import validation completed")
}

// ExecuteImport executes the import with the given options
// POST /api/import/execute
func (h *ImportExportHandler) ExecuteImport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Parse request body
	var req struct {
		Data    services.ImportData    `json:"data"`
		Options services.ImportOptions `json:"options"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.logger.Debug("ExecuteImport request",
		zap.String("uid", uid),
		zap.Int("totalItems", req.Data.Metadata.TotalItems),
		zap.Bool("updateReferences", req.Options.UpdateReferences),
	)

	// Execute import
	result, err := h.svc.ExecuteImport(ctx, uid, &req.Data, req.Options)
	if err != nil {
		h.logger.Error("Failed to execute import", zap.Error(err))
		utils.RespondError(w, "Failed to execute import", http.StatusInternalServerError)
		return
	}

	h.logger.Info("Import completed",
		zap.String("uid", uid),
		zap.Int("importedCount", result.ImportedCount),
		zap.Int("skippedCount", result.SkippedCount),
		zap.Int("errorCount", result.ErrorCount),
	)

	utils.RespondSuccess(w, result, "Import completed")
}

// ExportData exports user data with optional filters
// GET /api/export?entityTypes=tasks,projects&startDate=2024-01-01&endDate=2024-12-31
func (h *ImportExportHandler) ExportData(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Parse query parameters
	filters := services.ExportFilters{}

	// Parse entity types
	if entityTypesStr := r.URL.Query().Get("entityTypes"); entityTypesStr != "" {
		entityTypeStrs := splitAndTrim(entityTypesStr, ",")
		filters.EntityTypes = make([]services.EntityType, 0, len(entityTypeStrs))
		for _, etStr := range entityTypeStrs {
			filters.EntityTypes = append(filters.EntityTypes, services.EntityType(etStr))
		}
	}

	// Parse dates
	if startDateStr := r.URL.Query().Get("startDate"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filters.StartDate = &startDate
		}
	}
	if endDateStr := r.URL.Query().Get("endDate"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filters.EndDate = &endDate
		}
	}

	// Parse task filters
	if taskStatusStr := r.URL.Query().Get("taskStatus"); taskStatusStr != "" {
		filters.TaskStatus = splitAndTrim(taskStatusStr, ",")
	}
	if taskCategoryStr := r.URL.Query().Get("taskCategory"); taskCategoryStr != "" {
		filters.TaskCategory = splitAndTrim(taskCategoryStr, ",")
	}
	if taskTagsStr := r.URL.Query().Get("taskTags"); taskTagsStr != "" {
		filters.TaskTags = splitAndTrim(taskTagsStr, ",")
	}

	// Parse project filters
	if projectStatusStr := r.URL.Query().Get("projectStatus"); projectStatusStr != "" {
		filters.ProjectStatus = splitAndTrim(projectStatusStr, ",")
	}

	// Parse goal filters
	if goalStatusStr := r.URL.Query().Get("goalStatus"); goalStatusStr != "" {
		filters.GoalStatus = splitAndTrim(goalStatusStr, ",")
	}

	h.logger.Debug("ExportData request",
		zap.String("uid", uid),
		zap.Int("entityTypeCount", len(filters.EntityTypes)),
	)

	// Execute export
	exportData, err := h.svc.ExportData(ctx, uid, filters)
	if err != nil {
		h.logger.Error("Failed to export data", zap.Error(err))
		utils.RespondError(w, "Failed to export data", http.StatusInternalServerError)
		return
	}

	h.logger.Info("Export completed",
		zap.String("uid", uid),
		zap.Int("totalItems", exportData.Metadata.TotalItems),
	)

	// Set headers for file download
	filename := "focus-notebook-export-" + time.Now().Format("2006-01-02") + ".json"
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")

	// Stream JSON response
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ") // Pretty print
	if err := encoder.Encode(exportData); err != nil {
		h.logger.Error("Failed to encode export data", zap.Error(err))
		return
	}
}

// GetExportSummary returns export summary statistics
// GET /api/export/summary
func (h *ImportExportHandler) GetExportSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	h.logger.Debug("GetExportSummary request",
		zap.String("uid", uid),
	)

	// Get summary
	summary, err := h.svc.GetExportSummary(ctx, uid)
	if err != nil {
		h.logger.Error("Failed to get export summary", zap.Error(err))
		utils.RespondError(w, "Failed to get export summary", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, summary, "Export summary retrieved")
}

// splitAndTrim splits a string by delimiter and trims whitespace
func splitAndTrim(s, delim string) []string {
	parts := make([]string, 0)
	for _, part := range splitString(s, delim) {
		trimmed := trimSpace(part)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func splitString(s, delim string) []string {
	if s == "" {
		return []string{}
	}
	result := []string{}
	current := ""
	for _, ch := range s {
		if string(ch) == delim {
			result = append(result, current)
			current = ""
		} else {
			current += string(ch)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

func trimSpace(s string) string {
	start := 0
	end := len(s)

	// Trim leading spaces
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}

	// Trim trailing spaces
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}

	return s[start:end]
}
