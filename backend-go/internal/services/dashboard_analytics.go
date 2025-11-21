package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository"
)

// DashboardAnalyticsService handles dashboard analytics computations
type DashboardAnalyticsService struct {
	repo   *repository.FirestoreRepository
	logger *zap.Logger
}

// NewDashboardAnalyticsService creates a new dashboard analytics service
func NewDashboardAnalyticsService(repo *repository.FirestoreRepository, logger *zap.Logger) *DashboardAnalyticsService {
	return &DashboardAnalyticsService{
		repo:   repo,
		logger: logger,
	}
}

// SummaryPeriod represents the time period for analytics
type SummaryPeriod string

const (
	PeriodToday SummaryPeriod = "today"
	PeriodWeek  SummaryPeriod = "week"
	PeriodMonth SummaryPeriod = "month"
)

// TimeOfDayStats holds statistics for a time period
type TimeOfDayStats struct {
	Sessions       int     `json:"sessions"`
	TotalTime      int     `json:"totalTime"`       // in seconds
	CompletedTasks int     `json:"completedTasks"`
	AvgCompletion  float64 `json:"avgCompletion"`   // percentage
}

// DashboardAnalytics holds the complete analytics response
type DashboardAnalytics struct {
	FocusData     []map[string]interface{} `json:"focusData"`
	TaskData      []map[string]interface{} `json:"taskData"`
	CategoryData  []map[string]interface{} `json:"categoryData"`
	TimeOfDayData map[string]TimeOfDayStats `json:"timeOfDayData"`
	Stats         struct {
		TotalFocusTime int     `json:"totalFocusTime"` // in minutes
		TotalSessions  int     `json:"totalSessions"`
		CompletedTasks int     `json:"completedTasks"`
		MasteryTasks   int     `json:"masteryTasks"`
		PleasureTasks  int     `json:"pleasureTasks"`
		CurrentStreak  int     `json:"currentStreak"`
		CompletionRate float64 `json:"completionRate"` // percentage
	} `json:"stats"`
	Comparison *struct {
		FocusTime float64 `json:"focusTime"` // percentage change
		Tasks     float64 `json:"tasks"`     // percentage change
	} `json:"comparison"`
	Goals struct {
		Total     int                    `json:"total"`
		Active    int                    `json:"active"`
		Completed int                    `json:"completed"`
		Progress  float64                `json:"progress"` // percentage
		TopGoal   map[string]interface{} `json:"topGoal"`
	} `json:"goals"`
	Projects struct {
		Total     int     `json:"total"`
		Active    int     `json:"active"`
		Completed int     `json:"completed"`
		Progress  float64 `json:"progress"` // percentage
	} `json:"projects"`
	Period string `json:"period"`
	Days   int    `json:"days"`
}

// ComputeAnalytics computes dashboard analytics for a user
func (s *DashboardAnalyticsService) ComputeAnalytics(ctx context.Context, uid string, period SummaryPeriod) (*DashboardAnalytics, error) {
	s.logger.Debug("Computing dashboard analytics",
		zap.String("uid", uid),
		zap.String("period", string(period)),
	)

	// Determine date range
	startDate, endDate, days := s.resolvePeriodRange(period, time.Now())

	// Fetch data in parallel
	tasksCh := make(chan []map[string]interface{}, 1)
	sessionsCh := make(chan []map[string]interface{}, 1)
	goalsCh := make(chan []map[string]interface{}, 1)
	projectsCh := make(chan []map[string]interface{}, 1)
	errCh := make(chan error, 4)

	// Fetch tasks
	go func() {
		tasks, err := s.fetchTasks(ctx, uid, startDate, endDate)
		if err != nil {
			errCh <- err
			return
		}
		tasksCh <- tasks
	}()

	// Fetch sessions
	go func() {
		sessions, err := s.fetchSessions(ctx, uid, startDate, endDate)
		if err != nil {
			errCh <- err
			return
		}
		sessionsCh <- sessions
	}()

	// Fetch goals
	go func() {
		goals, err := s.fetchGoals(ctx, uid)
		if err != nil {
			errCh <- err
			return
		}
		goalsCh <- goals
	}()

	// Fetch projects
	go func() {
		projects, err := s.fetchProjects(ctx, uid)
		if err != nil {
			errCh <- err
			return
		}
		projectsCh <- projects
	}()

	// Wait for all fetches
	var tasks, sessions, goals, projects []map[string]interface{}
	for i := 0; i < 4; i++ {
		select {
		case err := <-errCh:
			return nil, err
		case tasks = <-tasksCh:
		case sessions = <-sessionsCh:
		case goals = <-goalsCh:
		case projects = <-projectsCh:
		}
	}

	// Compute analytics
	analytics := &DashboardAnalytics{
		Period: string(period),
		Days:   days,
	}

	// Build date offsets for the period
	dateOffsets := s.buildDateOffsets(startDate, days)

	// Filter completed tasks in range
	completedTasks := s.filterCompletedTasks(tasks, startDate, endDate)

	// Group data by date
	tasksByDate := s.groupTasksByDate(completedTasks)
	sessionsByDate := s.groupSessionsByDate(sessions)

	// Compute focus data (minutes per day)
	analytics.FocusData = s.computeFocusData(dateOffsets, sessionsByDate)

	// Compute task data (tasks per day by category)
	analytics.TaskData = s.computeTaskData(dateOffsets, tasksByDate)

	// Compute category data (mastery vs pleasure)
	analytics.CategoryData = s.computeCategoryData(dateOffsets, tasksByDate)

	// Compute time of day statistics
	analytics.TimeOfDayData = s.computeTimeOfDayData(sessions)

	// Compute overall stats
	analytics.Stats.TotalFocusTime = s.sumSessionTime(sessions) / 60 // convert to minutes
	analytics.Stats.TotalSessions = len(sessions)
	analytics.Stats.CompletedTasks = len(completedTasks)

	categoryTotals := s.countTasksByCategory(completedTasks)
	analytics.Stats.MasteryTasks = categoryTotals["mastery"]
	analytics.Stats.PleasureTasks = categoryTotals["pleasure"]

	analytics.Stats.CurrentStreak = s.calculateStreak(ctx, uid, time.Now())

	// Completion rate (all tasks vs completed)
	allTasksCount, _ := s.countAllTasks(ctx, uid)
	completedCount := s.countCompletedTasks(tasks)
	if allTasksCount > 0 {
		analytics.Stats.CompletionRate = float64(completedCount) / float64(allTasksCount) * 100
	}

	// Compute comparison with previous period
	analytics.Comparison = s.calculateComparison(ctx, uid, period, startDate, endDate, sessions, completedTasks)

	// Compute goal stats
	analytics.Goals = s.calculateGoalStats(goals)

	// Compute project stats
	analytics.Projects = s.calculateProjectStats(projects)

	s.logger.Info("Dashboard analytics computed",
		zap.String("uid", uid),
		zap.String("period", string(period)),
		zap.Int("sessions", analytics.Stats.TotalSessions),
		zap.Int("tasks", analytics.Stats.CompletedTasks),
	)

	return analytics, nil
}

// resolvePeriodRange determines the date range for a period
func (s *DashboardAnalyticsService) resolvePeriodRange(period SummaryPeriod, ref time.Time) (startDate, endDate time.Time, days int) {
	switch period {
	case PeriodToday:
		startDate = s.startOfDay(ref)
		endDate = s.endOfDay(ref)
		days = 1
	case PeriodWeek:
		startDate = s.startOfWeek(ref)
		endDate = s.endOfWeek(ref)
		days = 7
	case PeriodMonth:
		startDate = s.startOfMonth(ref)
		endDate = s.endOfMonth(ref)
		days = int(math.Round(endDate.Sub(startDate).Hours()/24)) + 1
	default:
		startDate = s.startOfDay(ref)
		endDate = s.endOfDay(ref)
		days = 1
	}
	return
}

// fetchTasks fetches tasks for a user
func (s *DashboardAnalyticsService) fetchTasks(ctx context.Context, uid string, startDate, endDate time.Time) ([]map[string]interface{}, error) {
	query := s.repo.Client().Collection(fmt.Sprintf("users/%s/tasks", uid))

	// Fetch all tasks (we need to check done status and completedAt)
	iter := query.Documents(ctx)
	defer iter.Stop()

	var tasks []map[string]interface{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		task := doc.Data()
		task["id"] = doc.Ref.ID
		tasks = append(tasks, task)
	}

	return tasks, nil
}

// fetchSessions fetches focus sessions for a user in date range
func (s *DashboardAnalyticsService) fetchSessions(ctx context.Context, uid string, startDate, endDate time.Time) ([]map[string]interface{}, error) {
	query := s.repo.Client().Collection(fmt.Sprintf("users/%s/focusSessions", uid)).
		Where("startTime", ">=", startDate).
		Where("startTime", "<=", endDate).
		OrderBy("startTime", firestore.Asc)

	iter := query.Documents(ctx)
	defer iter.Stop()

	var sessions []map[string]interface{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		session := doc.Data()
		session["id"] = doc.Ref.ID
		sessions = append(sessions, session)
	}

	return sessions, nil
}

// fetchGoals fetches all goals for a user
func (s *DashboardAnalyticsService) fetchGoals(ctx context.Context, uid string) ([]map[string]interface{}, error) {
	query := s.repo.Client().Collection(fmt.Sprintf("users/%s/goals", uid))

	iter := query.Documents(ctx)
	defer iter.Stop()

	var goals []map[string]interface{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		goal := doc.Data()
		goal["id"] = doc.Ref.ID
		goals = append(goals, goal)
	}

	return goals, nil
}

// fetchProjects fetches all projects for a user
func (s *DashboardAnalyticsService) fetchProjects(ctx context.Context, uid string) ([]map[string]interface{}, error) {
	query := s.repo.Client().Collection(fmt.Sprintf("users/%s/projects", uid))

	iter := query.Documents(ctx)
	defer iter.Stop()

	var projects []map[string]interface{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		project := doc.Data()
		project["id"] = doc.Ref.ID
		projects = append(projects, project)
	}

	return projects, nil
}

// buildDateOffsets creates an array of dates for the period
func (s *DashboardAnalyticsService) buildDateOffsets(startDate time.Time, days int) []time.Time {
	offsets := make([]time.Time, days)
	for i := 0; i < days; i++ {
		offsets[i] = startDate.AddDate(0, 0, i)
	}
	return offsets
}

// filterCompletedTasks filters tasks completed in the date range
func (s *DashboardAnalyticsService) filterCompletedTasks(tasks []map[string]interface{}, startDate, endDate time.Time) []map[string]interface{} {
	var completed []map[string]interface{}
	for _, task := range tasks {
		if completedAt, ok := task["completedAt"].(time.Time); ok {
			if !completedAt.Before(startDate) && !completedAt.After(endDate) {
				completed = append(completed, task)
			}
		}
	}
	return completed
}

// groupTasksByDate groups tasks by date string
func (s *DashboardAnalyticsService) groupTasksByDate(tasks []map[string]interface{}) map[string][]map[string]interface{} {
	grouped := make(map[string][]map[string]interface{})
	for _, task := range tasks {
		if completedAt, ok := task["completedAt"].(time.Time); ok {
			dateStr := s.startOfDay(completedAt).Format("Mon Jan 02 2006")
			grouped[dateStr] = append(grouped[dateStr], task)
		}
	}
	return grouped
}

// groupSessionsByDate groups sessions by date string
func (s *DashboardAnalyticsService) groupSessionsByDate(sessions []map[string]interface{}) map[string][]map[string]interface{} {
	grouped := make(map[string][]map[string]interface{})
	for _, session := range sessions {
		if startTime, ok := session["startTime"].(time.Time); ok {
			dateStr := s.startOfDay(startTime).Format("Mon Jan 02 2006")
			grouped[dateStr] = append(grouped[dateStr], session)
		}
	}
	return grouped
}

// computeFocusData computes focus minutes per day
func (s *DashboardAnalyticsService) computeFocusData(dateOffsets []time.Time, sessionsByDate map[string][]map[string]interface{}) []map[string]interface{} {
	focusData := make([]map[string]interface{}, len(dateOffsets))
	for i, date := range dateOffsets {
		dateStr := date.Format("Mon Jan 02 2006")
		sessions := sessionsByDate[dateStr]

		totalMinutes := s.sumSessionTime(sessions) / 60 // convert to minutes

		focusData[i] = map[string]interface{}{
			"date":    date.Format(time.RFC3339),
			"minutes": totalMinutes,
		}
	}
	return focusData
}

// computeTaskData computes task counts per day
func (s *DashboardAnalyticsService) computeTaskData(dateOffsets []time.Time, tasksByDate map[string][]map[string]interface{}) []map[string]interface{} {
	taskData := make([]map[string]interface{}, len(dateOffsets))
	for i, date := range dateOffsets {
		dateStr := date.Format("Mon Jan 02 2006")
		tasks := tasksByDate[dateStr]

		categories := s.countTasksByCategory(tasks)

		taskData[i] = map[string]interface{}{
			"date":     date.Format(time.RFC3339),
			"total":    len(tasks),
			"mastery":  categories["mastery"],
			"pleasure": categories["pleasure"],
		}
	}
	return taskData
}

// computeCategoryData computes category distribution per day
func (s *DashboardAnalyticsService) computeCategoryData(dateOffsets []time.Time, tasksByDate map[string][]map[string]interface{}) []map[string]interface{} {
	categoryData := make([]map[string]interface{}, len(dateOffsets))
	for i, date := range dateOffsets {
		dateStr := date.Format("Mon Jan 02 2006")
		tasks := tasksByDate[dateStr]

		categories := s.countTasksByCategory(tasks)

		categoryData[i] = map[string]interface{}{
			"date":     date.Format(time.RFC3339),
			"mastery":  categories["mastery"],
			"pleasure": categories["pleasure"],
		}
	}
	return categoryData
}

// sumSessionTime sums the time spent in sessions
func (s *DashboardAnalyticsService) sumSessionTime(sessions []map[string]interface{}) int {
	total := 0
	for _, session := range sessions {
		if tasks, ok := session["tasks"].([]interface{}); ok {
			for _, task := range tasks {
				if taskMap, ok := task.(map[string]interface{}); ok {
					if timeSpent, ok := taskMap["timeSpent"].(int64); ok {
						total += int(timeSpent)
					} else if timeSpent, ok := taskMap["timeSpent"].(float64); ok {
						total += int(timeSpent)
					}
				}
			}
		}
	}
	return total
}

// countTasksByCategory counts tasks by mastery/pleasure category
func (s *DashboardAnalyticsService) countTasksByCategory(tasks []map[string]interface{}) map[string]int {
	counts := map[string]int{"mastery": 0, "pleasure": 0}
	for _, task := range tasks {
		category := "mastery" // default
		if cat, ok := task["category"].(string); ok {
			category = cat
		}
		if category == "mastery" || category == "pleasure" {
			counts[category]++
		}
	}
	return counts
}

// computeTimeOfDayData computes statistics by time of day
func (s *DashboardAnalyticsService) computeTimeOfDayData(sessions []map[string]interface{}) map[string]TimeOfDayStats {
	timeOfDay := map[string]TimeOfDayStats{
		"morning":   {Sessions: 0, TotalTime: 0, CompletedTasks: 0, AvgCompletion: 0},
		"afternoon": {Sessions: 0, TotalTime: 0, CompletedTasks: 0, AvgCompletion: 0},
		"evening":   {Sessions: 0, TotalTime: 0, CompletedTasks: 0, AvgCompletion: 0},
		"night":     {Sessions: 0, TotalTime: 0, CompletedTasks: 0, AvgCompletion: 0},
	}

	totalTasksByPeriod := map[string]int{
		"morning": 0, "afternoon": 0, "evening": 0, "night": 0,
	}

	for _, session := range sessions {
		startTime, ok := session["startTime"].(time.Time)
		if !ok {
			continue
		}

		period := s.getTimeOfDayCategory(startTime)
		stats := timeOfDay[period]

		// Count session
		stats.Sessions++

		// Sum time
		if tasks, ok := session["tasks"].([]interface{}); ok {
			for _, task := range tasks {
				if taskMap, ok := task.(map[string]interface{}); ok {
					if timeSpent, ok := taskMap["timeSpent"].(int64); ok {
						stats.TotalTime += int(timeSpent)
					} else if timeSpent, ok := taskMap["timeSpent"].(float64); ok {
						stats.TotalTime += int(timeSpent)
					}

					// Count completed tasks
					if completed, ok := taskMap["completed"].(bool); ok && completed {
						stats.CompletedTasks++
					}

					totalTasksByPeriod[period]++
				}
			}
		}

		timeOfDay[period] = stats
	}

	// Calculate average completion percentage
	for period, stats := range timeOfDay {
		totalTasks := totalTasksByPeriod[period]
		if totalTasks > 0 {
			stats.AvgCompletion = float64(stats.CompletedTasks) / float64(totalTasks) * 100
			timeOfDay[period] = stats
		}
	}

	return timeOfDay
}

// getTimeOfDayCategory categorizes time into morning/afternoon/evening/night
func (s *DashboardAnalyticsService) getTimeOfDayCategory(t time.Time) string {
	hour := t.Hour()
	if hour >= 5 && hour < 12 {
		return "morning"
	} else if hour >= 12 && hour < 17 {
		return "afternoon"
	} else if hour >= 17 && hour < 21 {
		return "evening"
	}
	return "night"
}

// calculateStreak calculates consecutive days with focus sessions
func (s *DashboardAnalyticsService) calculateStreak(ctx context.Context, uid string, referenceDate time.Time) int {
	// Fetch ALL sessions to calculate streak (we need historical data)
	query := s.repo.Client().Collection(fmt.Sprintf("users/%s/focusSessions", uid)).
		OrderBy("startTime", firestore.Desc).
		Limit(1000) // Limit to recent 1000 sessions for performance

	iter := query.Documents(ctx)
	defer iter.Stop()

	sessionsByDate := make(map[string]bool)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			s.logger.Error("Error fetching sessions for streak", zap.Error(err))
			return 0
		}

		session := doc.Data()
		if startTime, ok := session["startTime"].(time.Time); ok {
			dateStr := s.startOfDay(startTime).Format("2006-01-02")
			sessionsByDate[dateStr] = true
		}
	}

	// Count backwards from reference date
	streak := 0
	currentDate := s.startOfDay(referenceDate)
	for {
		dateStr := currentDate.Format("2006-01-02")
		if sessionsByDate[dateStr] {
			streak++
			currentDate = currentDate.AddDate(0, 0, -1)
		} else {
			break
		}
	}

	return streak
}

// countAllTasks counts all tasks (for completion rate)
func (s *DashboardAnalyticsService) countAllTasks(ctx context.Context, uid string) (int, error) {
	query := s.repo.Client().Collection(fmt.Sprintf("users/%s/tasks", uid))

	// Use aggregation query for count (more efficient)
	count := 0
	iter := query.Documents(ctx)
	defer iter.Stop()

	for {
		_, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return 0, err
		}
		count++
	}

	return count, nil
}

// countCompletedTasks counts completed tasks
func (s *DashboardAnalyticsService) countCompletedTasks(tasks []map[string]interface{}) int {
	count := 0
	for _, task := range tasks {
		if done, ok := task["done"].(bool); ok && done {
			count++
		}
	}
	return count
}

// calculateComparison computes comparison with previous period
func (s *DashboardAnalyticsService) calculateComparison(ctx context.Context, uid string, period SummaryPeriod, startDate, endDate time.Time, currentSessions []map[string]interface{}, currentTasks []map[string]interface{}) *struct {
	FocusTime float64 `json:"focusTime"`
	Tasks     float64 `json:"tasks"`
} {
	var prevStart, prevEnd time.Time

	switch period {
	case PeriodToday:
		prevStart = startDate.AddDate(0, 0, -1)
		prevEnd = endDate.AddDate(0, 0, -1)
	case PeriodWeek:
		prevStart = startDate.AddDate(0, 0, -7)
		prevEnd = endDate.AddDate(0, 0, -7)
	case PeriodMonth:
		prevStart = s.startOfMonth(startDate.AddDate(0, -1, 0))
		prevEnd = s.endOfMonth(prevStart)
	default:
		return nil
	}

	// Fetch previous period data
	prevSessions, err := s.fetchSessions(ctx, uid, prevStart, prevEnd)
	if err != nil {
		s.logger.Error("Error fetching previous sessions", zap.Error(err))
		return nil
	}

	prevTasks, err := s.fetchTasks(ctx, uid, prevStart, prevEnd)
	if err != nil {
		s.logger.Error("Error fetching previous tasks", zap.Error(err))
		return nil
	}

	prevCompletedTasks := s.filterCompletedTasks(prevTasks, prevStart, prevEnd)

	// Calculate focus time
	currFocusTime := float64(s.sumSessionTime(currentSessions) / 60)
	prevFocusTime := float64(s.sumSessionTime(prevSessions) / 60)

	focusTimeChange := 0.0
	if prevFocusTime > 0 {
		focusTimeChange = ((currFocusTime - prevFocusTime) / prevFocusTime) * 100
	}

	// Calculate task count
	currTaskCount := float64(len(currentTasks))
	prevTaskCount := float64(len(prevCompletedTasks))

	taskChange := 0.0
	if prevTaskCount > 0 {
		taskChange = ((currTaskCount - prevTaskCount) / prevTaskCount) * 100
	}

	return &struct {
		FocusTime float64 `json:"focusTime"`
		Tasks     float64 `json:"tasks"`
	}{
		FocusTime: focusTimeChange,
		Tasks:     taskChange,
	}
}

// calculateGoalStats computes goal statistics
func (s *DashboardAnalyticsService) calculateGoalStats(goals []map[string]interface{}) struct {
	Total     int                    `json:"total"`
	Active    int                    `json:"active"`
	Completed int                    `json:"completed"`
	Progress  float64                `json:"progress"`
	TopGoal   map[string]interface{} `json:"topGoal"`
} {
	total := len(goals)
	active := 0
	completed := 0
	var topGoal map[string]interface{}

	for _, goal := range goals {
		if status, ok := goal["status"].(string); ok {
			if status == "active" {
				active++
				if topGoal == nil {
					topGoal = goal
				}
			} else if status == "completed" {
				completed++
			}
		}
	}

	progress := 0.0
	if total > 0 {
		progress = float64(completed) / float64(total) * 100
	}

	return struct {
		Total     int                    `json:"total"`
		Active    int                    `json:"active"`
		Completed int                    `json:"completed"`
		Progress  float64                `json:"progress"`
		TopGoal   map[string]interface{} `json:"topGoal"`
	}{
		Total:     total,
		Active:    active,
		Completed: completed,
		Progress:  progress,
		TopGoal:   topGoal,
	}
}

// calculateProjectStats computes project statistics
func (s *DashboardAnalyticsService) calculateProjectStats(projects []map[string]interface{}) struct {
	Total     int     `json:"total"`
	Active    int     `json:"active"`
	Completed int     `json:"completed"`
	Progress  float64 `json:"progress"`
} {
	total := len(projects)
	active := 0
	completed := 0

	for _, project := range projects {
		if status, ok := project["status"].(string); ok {
			if status == "active" || status == "on-hold" {
				active++
			} else if status == "completed" {
				completed++
			}
		}
	}

	progress := 0.0
	if total > 0 {
		progress = float64(completed) / float64(total) * 100
	}

	return struct {
		Total     int     `json:"total"`
		Active    int     `json:"active"`
		Completed int     `json:"completed"`
		Progress  float64 `json:"progress"`
	}{
		Total:     total,
		Active:    active,
		Completed: completed,
		Progress:  progress,
	}
}

// Date utility functions

func (s *DashboardAnalyticsService) startOfDay(t time.Time) time.Time {
	year, month, day := t.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, t.Location())
}

func (s *DashboardAnalyticsService) endOfDay(t time.Time) time.Time {
	year, month, day := t.Date()
	return time.Date(year, month, day, 23, 59, 59, 999999999, t.Location())
}

func (s *DashboardAnalyticsService) startOfWeek(t time.Time) time.Time {
	// Go weeks start on Sunday (0), we want Monday (1)
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday becomes 7
	}
	daysToSubtract := weekday - 1
	return s.startOfDay(t.AddDate(0, 0, -daysToSubtract))
}

func (s *DashboardAnalyticsService) endOfWeek(t time.Time) time.Time {
	return s.endOfDay(s.startOfWeek(t).AddDate(0, 0, 6))
}

func (s *DashboardAnalyticsService) startOfMonth(t time.Time) time.Time {
	year, month, _ := t.Date()
	return time.Date(year, month, 1, 0, 0, 0, 0, t.Location())
}

func (s *DashboardAnalyticsService) endOfMonth(t time.Time) time.Time {
	return s.endOfDay(s.startOfMonth(t).AddDate(0, 1, -1))
}
