package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/repository/mocks"
	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/services"
)

func TestEntityGraphHandler_QueryRelationships(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	entityGraphSvc := services.NewEntityGraphService(mockRepo, logger)
	handler := NewEntityGraphHandler(entityGraphSvc, logger)

	uid := "test-user-123"

	// Add test relationships
	mockRepo.AddDocument("entityRelationships", "rel1", map[string]interface{}{
		"id":               "rel1",
		"uid":              uid,
		"sourceType":       "task",
		"sourceId":         "task1",
		"targetType":       "project",
		"targetId":         "proj1",
		"relationshipType": "created-from",
		"strength":         85.0,
		"status":           "active",
		"createdBy":        "ai",
	})

	tests := []struct {
		name       string
		method     string
		query      string
		body       interface{}
		wantStatus int
	}{
		{
			name:       "GET with query params",
			method:     "GET",
			query:      "?sourceType=task&limit=50",
			wantStatus: http.StatusOK,
		},
		{
			name:   "POST with JSON body",
			method: "POST",
			body: services.RelationshipFilters{
				SourceType: func() *services.EntityType { et := services.EntityTypeTask; return &et }(),
				Limit:      50,
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "GET without params (default)",
			method:     "GET",
			query:      "",
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request

			if tt.method == "POST" {
				body, _ := json.Marshal(tt.body)
				req = httptest.NewRequest("POST", "/api/entity-graph/relationships", bytes.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest("GET", "/api/entity-graph/relationships"+tt.query, nil)
			}

			// Add user context
			ctx := context.WithValue(req.Context(), "uid", uid)
			req = req.WithContext(ctx)

			// Create response recorder
			w := httptest.NewRecorder()

			// Call handler
			handler.QueryRelationships(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

func TestEntityGraphHandler_GetLinkedEntities(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	entityGraphSvc := services.NewEntityGraphService(mockRepo, logger)
	handler := NewEntityGraphHandler(entityGraphSvc, logger)

	uid := "test-user-123"

	// Add test relationship
	mockRepo.AddDocument("entityRelationships", "rel1", map[string]interface{}{
		"id":               "rel1",
		"uid":              uid,
		"sourceType":       "project",
		"sourceId":         "proj1",
		"targetType":       "task",
		"targetId":         "task1",
		"relationshipType": "created-from",
		"status":           "active",
	})

	// Add entity data
	mockRepo.AddDocument("tasks", "task1", map[string]interface{}{
		"id":     "task1",
		"uid":    uid,
		"title":  "Test Task",
		"status": "active",
	})

	tests := []struct {
		name        string
		entityType  string
		entityID    string
		wantStatus  int
	}{
		{
			name:        "valid entity",
			entityType:  "project",
			entityID:    "proj1",
			wantStatus:  http.StatusOK,
		},
		{
			name:        "empty entity type",
			entityType:  "",
			entityID:    "proj1",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "empty entity ID",
			entityType:  "project",
			entityID:    "",
			wantStatus:  http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			req := httptest.NewRequest("GET", "/api/entity-graph/linked/"+tt.entityType+"/"+tt.entityID, nil)

			// Add mux vars
			req = mux.SetURLVars(req, map[string]string{
				"entityType": tt.entityType,
				"entityId":   tt.entityID,
			})

			// Add user context
			ctx := context.WithValue(req.Context(), "uid", uid)
			req = req.WithContext(ctx)

			// Create response recorder
			w := httptest.NewRecorder()

			// Call handler
			handler.GetLinkedEntities(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

func TestEntityGraphHandler_GetToolRelationships(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	entityGraphSvc := services.NewEntityGraphService(mockRepo, logger)
	handler := NewEntityGraphHandler(entityGraphSvc, logger)

	uid := "test-user-123"

	// Add test tool relationships
	mockRepo.AddDocument("entityRelationships", "tool1", map[string]interface{}{
		"id":               "tool1",
		"uid":              uid,
		"sourceType":       "tool",
		"relationshipType": "tool-pending",
		"status":           "active",
	})

	mockRepo.AddDocument("entityRelationships", "tool2", map[string]interface{}{
		"id":               "tool2",
		"uid":              uid,
		"sourceType":       "tool",
		"relationshipType": "tool-processed",
		"status":           "active",
	})

	tests := []struct {
		name       string
		toolType   string
		wantStatus int
	}{
		{
			name:       "without tool type filter",
			toolType:   "",
			wantStatus: http.StatusOK,
		},
		{
			name:       "with tool type filter",
			toolType:   "thought-processing",
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			url := "/api/entity-graph/tools"
			if tt.toolType != "" {
				url += "?toolType=" + tt.toolType
			}
			req := httptest.NewRequest("GET", url, nil)

			// Add user context
			ctx := context.WithValue(req.Context(), "uid", uid)
			req = req.WithContext(ctx)

			// Create response recorder
			w := httptest.NewRecorder()

			// Call handler
			handler.GetToolRelationships(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("Expected status %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

func TestEntityGraphHandler_GetRelationshipStats(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	entityGraphSvc := services.NewEntityGraphService(mockRepo, logger)
	handler := NewEntityGraphHandler(entityGraphSvc, logger)

	uid := "test-user-123"

	// Add test relationships
	mockRepo.AddDocument("entityRelationships", "rel1", map[string]interface{}{
		"id":               "rel1",
		"uid":              uid,
		"sourceType":       "task",
		"targetType":       "project",
		"relationshipType": "created-from",
		"strength":         85.0,
		"status":           "active",
		"createdBy":        "ai",
	})

	// Create request
	req := httptest.NewRequest("GET", "/api/entity-graph/stats", nil)

	// Add user context
	ctx := context.WithValue(req.Context(), "uid", uid)
	req = req.WithContext(ctx)

	// Create response recorder
	w := httptest.NewRecorder()

	// Call handler
	handler.GetRelationshipStats(w, req)

	// Check status code
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("Failed to unmarshal response: %v", err)
	}

	// Check for expected fields
	if _, ok := response["data"]; !ok {
		t.Error("Expected 'data' field in response")
	}
}
