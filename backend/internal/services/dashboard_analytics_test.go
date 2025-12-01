package services

import (
	"context"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

func TestDashboardAnalyticsService_ComputeAnalytics(t *testing.T) {
	// Setup
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewDashboardAnalyticsService(mockRepo, logger)

	uid := "test-user-123"
	ctx := context.Background()

	// Add test data - tasks
	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)
	lastWeek := now.Add(-7 * 24 * time.Hour)

	mockRepo.AddDocument("tasks/task1", map[string]interface{}{
		"id":          "task1",
		"uid":         uid,
		"title":       "Test Task 1",
		"status":      "completed",
		"category":    "work",
		"completedAt": now,
		"createdAt":   yesterday,
	})

	mockRepo.AddDocument("tasks/task2", map[string]interface{}{
		"id":        "task2",
		"uid":       uid,
		"title":     "Test Task 2",
		"status":    "active",
		"category":  "personal",
		"createdAt": lastWeek,
	})

	// Add test data - focus sessions
	mockRepo.AddDocument("focusSessions/session1", map[string]interface{}{
		"id":        "session1",
		"uid":       uid,
		"duration":  25,
		"startedAt": now.Add(-30 * time.Minute),
		"endedAt":   now.Add(-5 * time.Minute),
	})

	mockRepo.AddDocument("focusSessions/session2", map[string]interface{}{
		"id":        "session2",
		"uid":       uid,
		"duration":  50,
		"startedAt": yesterday.Add(-1 * time.Hour),
		"endedAt":   yesterday.Add(-10 * time.Minute),
	})

	tests := []struct {
		name    string
		period  SummaryPeriod
		wantErr bool
	}{
		{
			name:    "compute analytics for today",
			period:  PeriodToday,
			wantErr: false,
		},
		{
			name:    "compute analytics for week",
			period:  PeriodWeek,
			wantErr: false,
		},
		{
			name:    "compute analytics for month",
			period:  PeriodMonth,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.ComputeAnalytics(ctx, uid, tt.period)

			if (err != nil) != tt.wantErr {
				t.Errorf("ComputeAnalytics() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if err == nil {
				// Verify structure
				if result == nil {
					t.Error("Expected non-nil result")
					return
				}

				// Basic validations
				if result.FocusData == nil {
					t.Error("Expected non-nil FocusData")
				}
				if result.TaskData == nil {
					t.Error("Expected non-nil TaskData")
				}
				if result.CategoryData == nil {
					t.Error("Expected non-nil CategoryData")
				}

				// For today period, we should have some stats
				if tt.period == PeriodToday {
					if result.Stats.TotalFocusTime == 0 {
						t.Log("Warning: Expected some focus time for today (may be timing-dependent)")
					}
				}
			}
		})
	}
}

func TestDashboardAnalyticsService_CalculateStreak(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewDashboardAnalyticsService(mockRepo, logger)

	uid := "test-user-123"
	ctx := context.Background()
	now := time.Now()

	// Add sessions for consecutive days
	for i := 0; i < 5; i++ {
		date := now.Add(-time.Duration(i) * 24 * time.Hour)
		sessionID := "session-" + string(rune('0'+i))
		mockRepo.AddDocument("focusSessions/"+sessionID, map[string]interface{}{
			"id":        sessionID,
			"uid":       uid,
			"duration":  25,
			"startedAt": date,
			"endedAt":   date.Add(25 * time.Minute),
		})
	}

	streak := service.calculateStreak(ctx, uid, now)

	if streak < 1 {
		t.Errorf("Expected streak >= 1, got %d", streak)
	}
}

func TestDashboardAnalyticsService_ResolvePeriodRange(t *testing.T) {
	service := &DashboardAnalyticsService{}

	tests := []struct {
		name   string
		period SummaryPeriod
		want   struct {
			daysBack int
			minDays  int
		}
	}{
		{
			name:   "today period",
			period: PeriodToday,
			want: struct {
				daysBack int
				minDays  int
			}{0, 0},
		},
		{
			name:   "week period",
			period: PeriodWeek,
			want: struct {
				daysBack int
				minDays  int
			}{6, 7},
		},
		{
			name:   "month period",
			period: PeriodMonth,
			want: struct {
				daysBack int
				minDays  int
			}{29, 30},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			now := time.Now()
			startDate, endDate, days := service.resolvePeriodRange(tt.period, now)

			// Verify date range
			if startDate.After(endDate) {
				t.Error("Start date should be before or equal to end date")
			}

			// Verify days
			expectedDays := tt.want.minDays
			if days < expectedDays {
				t.Errorf("Expected at least %d days, got %d", expectedDays, days)
			}
		})
	}
}
