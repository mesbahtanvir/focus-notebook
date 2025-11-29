package services

import (
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/models"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository"
)

// ContextGathererService gathers user context for AI processing
// Matches contextGatherer.ts from Firebase Functions
type ContextGathererService struct {
	repo   *repository.FirestoreRepository
	logger *zap.Logger
}

// NewContextGathererService creates a new context gatherer service
func NewContextGathererService(repo *repository.FirestoreRepository, logger *zap.Logger) *ContextGathererService {
	return &ContextGathererService{
		repo:   repo,
		logger: logger,
	}
}

// GatherContext gathers user's goals, tasks, projects, etc. for AI context
func (s *ContextGathererService) GatherContext(ctx context.Context, uid string) (*models.UserContext, error) {
	s.logger.Debug("Gathering user context", zap.String("uid", uid))

	userContext := &models.UserContext{
		Goals:         []map[string]interface{}{},
		Projects:      []map[string]interface{}{},
		Tasks:         []map[string]interface{}{},
		Moods:         []map[string]interface{}{},
		Relationships: []map[string]interface{}{},
		Notes:         []map[string]interface{}{},
		Errands:       []map[string]interface{}{},
	}

	// Gather goals
	goals, err := s.getCollection(ctx, fmt.Sprintf("users/%s/goals", uid), 20)
	if err != nil {
		s.logger.Warn("Failed to fetch goals", zap.Error(err))
	} else {
		userContext.Goals = goals
	}

	// Gather projects
	projects, err := s.getCollection(ctx, fmt.Sprintf("users/%s/projects", uid), 20)
	if err != nil {
		s.logger.Warn("Failed to fetch projects", zap.Error(err))
	} else {
		userContext.Projects = projects
	}

	// Gather active tasks
	tasks, err := s.getActiveTasks(ctx, uid)
	if err != nil {
		s.logger.Warn("Failed to fetch tasks", zap.Error(err))
	} else {
		userContext.Tasks = tasks
	}

	// Gather recent moods
	moods, err := s.getRecentMoods(ctx, uid)
	if err != nil {
		s.logger.Warn("Failed to fetch moods", zap.Error(err))
	} else {
		userContext.Moods = moods
	}

	// Gather relationships
	relationships, err := s.getCollection(ctx, fmt.Sprintf("users/%s/people", uid), 20)
	if err != nil {
		s.logger.Warn("Failed to fetch relationships", zap.Error(err))
	} else {
		userContext.Relationships = relationships
	}

	// Gather recent notes
	notes, err := s.getCollection(ctx, fmt.Sprintf("users/%s/notes", uid), 10)
	if err != nil {
		s.logger.Warn("Failed to fetch notes", zap.Error(err))
	} else {
		userContext.Notes = notes
	}

	// Gather active errands
	errands, err := s.getActiveErrands(ctx, uid)
	if err != nil {
		s.logger.Warn("Failed to fetch errands", zap.Error(err))
	} else {
		userContext.Errands = errands
	}

	s.logger.Debug("Context gathered",
		zap.String("uid", uid),
		zap.Int("goals", len(userContext.Goals)),
		zap.Int("projects", len(userContext.Projects)),
		zap.Int("tasks", len(userContext.Tasks)),
		zap.Int("moods", len(userContext.Moods)),
	)

	return userContext, nil
}

// getCollection fetches documents from a collection
func (s *ContextGathererService) getCollection(ctx context.Context, collectionPath string, limit int) ([]map[string]interface{}, error) {
	docs, err := s.repo.QueryCollection(ctx, collectionPath,
		repository.OrderBy("createdAt", firestore.Desc),
		repository.Limit(limit),
	)
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for _, doc := range docs {
		data := doc.Data()
		data["id"] = doc.Ref.ID
		results = append(results, data)
	}

	return results, nil
}

// getActiveTasks fetches active tasks (not completed or archived)
func (s *ContextGathererService) getActiveTasks(ctx context.Context, uid string) ([]map[string]interface{}, error) {
	collectionPath := fmt.Sprintf("users/%s/tasks", uid)

	docs, err := s.repo.QueryCollection(ctx, collectionPath,
		repository.Where("status", "==", "active"),
		repository.OrderBy("priority", firestore.Desc),
		repository.Limit(20),
	)
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for _, doc := range docs {
		data := doc.Data()
		data["id"] = doc.Ref.ID
		results = append(results, data)
	}

	return results, nil
}

// getRecentMoods fetches recent mood entries
func (s *ContextGathererService) getRecentMoods(ctx context.Context, uid string) ([]map[string]interface{}, error) {
	collectionPath := fmt.Sprintf("users/%s/moods", uid)

	docs, err := s.repo.QueryCollection(ctx, collectionPath,
		repository.OrderBy("createdAt", firestore.Desc),
		repository.Limit(10),
	)
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for _, doc := range docs {
		data := doc.Data()
		data["id"] = doc.Ref.ID
		results = append(results, data)
	}

	return results, nil
}

// getActiveErrands fetches active errands (not completed)
func (s *ContextGathererService) getActiveErrands(ctx context.Context, uid string) ([]map[string]interface{}, error) {
	collectionPath := fmt.Sprintf("users/%s/errands", uid)

	docs, err := s.repo.QueryCollection(ctx, collectionPath,
		repository.Where("completed", "==", false),
		repository.OrderBy("createdAt", firestore.Desc),
		repository.Limit(15),
	)
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for _, doc := range docs {
		data := doc.Data()
		data["id"] = doc.Ref.ID
		results = append(results, data)
	}

	return results, nil
}
