package services

import (
	"context"
	"testing"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

func TestEntityGraphService_QueryRelationships(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewEntityGraphService(mockRepo, logger)

	uid := "test-user-123"
	ctx := context.Background()

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

	mockRepo.AddDocument("entityRelationships", "rel2", map[string]interface{}{
		"id":               "rel2",
		"uid":              uid,
		"sourceType":       "task",
		"sourceId":         "task2",
		"targetType":       "thought",
		"targetId":         "thought1",
		"relationshipType": "linked-to",
		"strength":         70.0,
		"status":           "active",
		"createdBy":        "user",
	})

	mockRepo.AddDocument("entityRelationships", "rel3", map[string]interface{}{
		"id":               "rel3",
		"uid":              uid,
		"sourceType":       "project",
		"sourceId":         "proj1",
		"targetType":       "goal",
		"targetId":         "goal1",
		"relationshipType": "related-to",
		"strength":         60.0,
		"status":           "archived",
		"createdBy":        "ai",
	})

	tests := []struct {
		name       string
		filters    RelationshipFilters
		wantCount  int
		wantTotal  int
	}{
		{
			name: "filter by source type",
			filters: RelationshipFilters{
				SourceType: func() *EntityType { et := EntityTypeTask; return &et }(),
				Limit:      100,
			},
			wantCount: 2,
			wantTotal: 2,
		},
		{
			name: "filter by status",
			filters: RelationshipFilters{
				Status: func() *string { s := "active"; return &s }(),
				Limit:  100,
			},
			wantCount: 2,
			wantTotal: 2,
		},
		{
			name: "filter by creator",
			filters: RelationshipFilters{
				CreatedBy: func() *string { s := "ai"; return &s }(),
				Limit:     100,
			},
			wantCount: 2,
			wantTotal: 2,
		},
		{
			name: "filter by min strength",
			filters: RelationshipFilters{
				MinStrength: func() *int { i := 75; return &i }(),
				Limit:       100,
			},
			wantCount: 1, // Only rel1 has strength >= 75
			wantTotal: 1,
		},
		{
			name: "pagination - limit 1",
			filters: RelationshipFilters{
				Limit: 1,
			},
			wantCount: 1,
			wantTotal: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, total, err := service.QueryRelationships(ctx, uid, tt.filters)

			if err != nil {
				t.Errorf("QueryRelationships() error = %v", err)
				return
			}

			if len(results) != tt.wantCount {
				t.Errorf("Expected %d results, got %d", tt.wantCount, len(results))
			}

			if total != tt.wantTotal {
				t.Errorf("Expected total %d, got %d", tt.wantTotal, total)
			}
		})
	}
}

func TestEntityGraphService_GetLinkedEntities(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewEntityGraphService(mockRepo, logger)

	uid := "test-user-123"
	ctx := context.Background()

	// Add relationships
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

	mockRepo.AddDocument("entityRelationships", "rel2", map[string]interface{}{
		"id":               "rel2",
		"uid":              uid,
		"sourceType":       "project",
		"sourceId":         "proj1",
		"targetType":       "goal",
		"targetId":         "goal1",
		"relationshipType": "related-to",
		"status":           "active",
	})

	// Add entity data
	mockRepo.AddDocument("tasks", "task1", map[string]interface{}{
		"id":     "task1",
		"uid":    uid,
		"title":  "Test Task",
		"status": "active",
	})

	mockRepo.AddDocument("goals", "goal1", map[string]interface{}{
		"id":     "goal1",
		"uid":    uid,
		"title":  "Test Goal",
		"status": "active",
	})

	result, err := service.GetLinkedEntities(ctx, uid, EntityTypeProject, "proj1")

	if err != nil {
		t.Fatalf("GetLinkedEntities() error = %v", err)
	}

	// Verify counts
	if result.Count.Tasks != 1 {
		t.Errorf("Expected 1 linked task, got %d", result.Count.Tasks)
	}

	if result.Count.Goals != 1 {
		t.Errorf("Expected 1 linked goal, got %d", result.Count.Goals)
	}

	if result.Count.Total != 2 {
		t.Errorf("Expected total count 2, got %d", result.Count.Total)
	}

	// Verify entity data is populated
	if len(result.Tasks) != 1 {
		t.Errorf("Expected 1 task in results, got %d", len(result.Tasks))
	}

	if len(result.Goals) != 1 {
		t.Errorf("Expected 1 goal in results, got %d", len(result.Goals))
	}
}

func TestEntityGraphService_GetToolRelationships(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewEntityGraphService(mockRepo, logger)

	uid := "test-user-123"
	ctx := context.Background()

	// Add tool relationships
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

	mockRepo.AddDocument("entityRelationships", "tool3", map[string]interface{}{
		"id":               "tool3",
		"uid":              uid,
		"sourceType":       "tool",
		"relationshipType": "tool-processed",
		"status":           "active",
	})

	result, err := service.GetToolRelationships(ctx, uid, nil)

	if err != nil {
		t.Fatalf("GetToolRelationships() error = %v", err)
	}

	// Verify counts
	if result.Count.Pending != 1 {
		t.Errorf("Expected 1 pending relationship, got %d", result.Count.Pending)
	}

	if result.Count.Processed != 2 {
		t.Errorf("Expected 2 processed relationships, got %d", result.Count.Processed)
	}

	if result.Count.Total != 3 {
		t.Errorf("Expected total count 3, got %d", result.Count.Total)
	}
}

func TestEntityGraphService_GetRelationshipStats(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewEntityGraphService(mockRepo, logger)

	uid := "test-user-123"
	ctx := context.Background()

	// Add relationships with various attributes
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

	mockRepo.AddDocument("entityRelationships", "rel2", map[string]interface{}{
		"id":               "rel2",
		"uid":              uid,
		"sourceType":       "task",
		"targetType":       "thought",
		"relationshipType": "linked-to",
		"strength":         75.0,
		"status":           "active",
		"createdBy":        "user",
	})

	mockRepo.AddDocument("entityRelationships", "rel3", map[string]interface{}{
		"id":               "rel3",
		"uid":              uid,
		"sourceType":       "project",
		"targetType":       "goal",
		"relationshipType": "related-to",
		"strength":         90.0,
		"status":           "archived",
		"createdBy":        "ai",
	})

	stats, err := service.GetRelationshipStats(ctx, uid)

	if err != nil {
		t.Fatalf("GetRelationshipStats() error = %v", err)
	}

	// Verify total count
	if stats.TotalRelationships != 3 {
		t.Errorf("Expected 3 total relationships, got %d", stats.TotalRelationships)
	}

	// Verify by-type counts
	if stats.ByType["created-from"] != 1 {
		t.Errorf("Expected 1 'created-from' relationship, got %d", stats.ByType["created-from"])
	}

	if stats.ByType["linked-to"] != 1 {
		t.Errorf("Expected 1 'linked-to' relationship, got %d", stats.ByType["linked-to"])
	}

	// Verify by-status counts
	if stats.ByStatus["active"] != 2 {
		t.Errorf("Expected 2 active relationships, got %d", stats.ByStatus["active"])
	}

	if stats.ByStatus["archived"] != 1 {
		t.Errorf("Expected 1 archived relationship, got %d", stats.ByStatus["archived"])
	}

	// Verify by-creator counts
	if stats.ByCreator["ai"] != 2 {
		t.Errorf("Expected 2 AI-created relationships, got %d", stats.ByCreator["ai"])
	}

	if stats.ByCreator["user"] != 1 {
		t.Errorf("Expected 1 user-created relationship, got %d", stats.ByCreator["user"])
	}

	// Verify average strength (85 + 75 + 90) / 3 = 83.33
	expectedAvgStrength := 83.33
	if stats.AverageStrength < expectedAvgStrength-1 || stats.AverageStrength > expectedAvgStrength+1 {
		t.Errorf("Expected average strength ~%f, got %f", expectedAvgStrength, stats.AverageStrength)
	}
}
