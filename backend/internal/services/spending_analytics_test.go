package services

import (
	"context"
	"testing"

	"cloud.google.com/go/firestore"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/interfaces"
)

// MockRepositoryForSpending implements interfaces.Repository for testing
type MockRepositoryForSpending struct {
	data map[string]map[string]interface{}
}

func NewMockRepositoryForSpending() *MockRepositoryForSpending {
	return &MockRepositoryForSpending{
		data: make(map[string]map[string]interface{}),
	}
}

func (m *MockRepositoryForSpending) Get(ctx context.Context, path string) (map[string]interface{}, error) {
	if data, ok := m.data[path]; ok {
		return data, nil
	}
	return nil, nil
}

func (m *MockRepositoryForSpending) Create(ctx context.Context, path string, data map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForSpending) Update(ctx context.Context, path string, data map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForSpending) Delete(ctx context.Context, path string) error {
	return nil
}

func (m *MockRepositoryForSpending) List(ctx context.Context, collectionPath string, limit int) ([]map[string]interface{}, error) {
	return nil, nil
}

func (m *MockRepositoryForSpending) GetDocument(ctx context.Context, path string) (*firestore.DocumentSnapshot, error) {
	return nil, nil
}

func (m *MockRepositoryForSpending) SetDocument(ctx context.Context, path string, data map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForSpending) UpdateDocument(ctx context.Context, path string, updates map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForSpending) DeleteDocument(ctx context.Context, path string) error {
	return nil
}

func (m *MockRepositoryForSpending) CreateDocument(ctx context.Context, path string, data map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForSpending) QueryCollection(ctx context.Context, collectionPath string, opts ...interfaces.QueryOption) ([]*firestore.DocumentSnapshot, error) {
	return nil, nil
}

func (m *MockRepositoryForSpending) Collection(path string) *firestore.CollectionRef {
	return nil
}

func (m *MockRepositoryForSpending) Batch() *firestore.WriteBatch {
	return nil
}

func (m *MockRepositoryForSpending) Client() *firestore.Client {
	return nil
}

// Tests for SpendingAnalyticsService

func TestNewSpendingAnalyticsService(t *testing.T) {
	repo := NewMockRepositoryForSpending()
	logger := zap.NewNop()

	service := NewSpendingAnalyticsService(repo, logger)

	assert.NotNil(t, service)
	assert.Equal(t, repo, service.repo)
	assert.Equal(t, logger, service.logger)
}

func TestNewSpendingAnalyticsService_WithNilRepository(t *testing.T) {
	logger := zap.NewNop()

	service := NewSpendingAnalyticsService(nil, logger)

	assert.NotNil(t, service)
	assert.Nil(t, service.repo)
	assert.Equal(t, logger, service.logger)
}

func TestNewSpendingAnalyticsService_WithNilLogger(t *testing.T) {
	repo := NewMockRepositoryForSpending()

	service := NewSpendingAnalyticsService(repo, nil)

	assert.NotNil(t, service)
	assert.Equal(t, repo, service.repo)
	assert.Nil(t, service.logger)
}

func TestNewSpendingAnalyticsService_AllNil(t *testing.T) {
	service := NewSpendingAnalyticsService(nil, nil)

	assert.NotNil(t, service)
	assert.Nil(t, service.repo)
	assert.Nil(t, service.logger)
}

func TestSpendingAnalyticsService_Fields(t *testing.T) {
	repo := NewMockRepositoryForSpending()
	logger := zap.NewNop()
	service := NewSpendingAnalyticsService(repo, logger)

	assert.NotNil(t, service.repo)
	assert.NotNil(t, service.logger)
}

func TestSpendingAnalyticsService_RepositoryStorage(t *testing.T) {
	repo := NewMockRepositoryForSpending()
	service := NewSpendingAnalyticsService(repo, nil)

	assert.Equal(t, repo, service.repo)
}

func TestSpendingAnalyticsService_LoggerStorage(t *testing.T) {
	logger := zap.NewNop()
	service := NewSpendingAnalyticsService(nil, logger)

	assert.Equal(t, logger, service.logger)
}

func TestSpendingAnalyticsService_Constructor(t *testing.T) {
	service := NewSpendingAnalyticsService(nil, nil)

	assert.Nil(t, service.repo)
	assert.Nil(t, service.logger)
}

func TestSpendingAnalyticsService_MultipleInstances(t *testing.T) {
	repo := NewMockRepositoryForSpending()
	logger := zap.NewNop()

	service1 := NewSpendingAnalyticsService(repo, logger)
	service2 := NewSpendingAnalyticsService(repo, logger)

	assert.NotNil(t, service1)
	assert.NotNil(t, service2)
	assert.Equal(t, repo, service1.repo)
	assert.Equal(t, repo, service2.repo)
}

func TestSpendingAnalyticsService_WithRepository(t *testing.T) {
	repo := NewMockRepositoryForSpending()
	service := NewSpendingAnalyticsService(repo, nil)

	assert.NotNil(t, service)
	assert.NotNil(t, service.repo)
}

func TestSpendingAnalyticsService_WithLogger(t *testing.T) {
	logger := zap.NewNop()
	service := NewSpendingAnalyticsService(nil, logger)

	assert.NotNil(t, service)
	assert.NotNil(t, service.logger)
}

func TestSpendingAnalyticsService_ImplementsExpectedMethods(t *testing.T) {
	service := NewSpendingAnalyticsService(nil, nil)

	assert.NotNil(t, service)
}

func TestSpendingAnalyticsService_AllFields(t *testing.T) {
	repo := NewMockRepositoryForSpending()
	logger := zap.NewNop()

	service := NewSpendingAnalyticsService(repo, logger)

	assert.NotNil(t, service.repo)
	assert.NotNil(t, service.logger)
}

// Tests for SpendingStats struct

func TestSpendingStats_ZeroValues(t *testing.T) {
	stats := SpendingStats{}

	assert.Equal(t, 0.0, stats.TotalSpend)
	assert.Equal(t, 0.0, stats.TotalIncome)
	assert.Equal(t, 0.0, stats.AvgDailySpend)
	assert.Equal(t, 0.0, stats.SubscriptionSpend)
	assert.Equal(t, 0, stats.SubscriptionCount)
	assert.Equal(t, 0, stats.TransactionCount)
}

func TestSpendingStats_WithValues(t *testing.T) {
	stats := SpendingStats{
		TotalSpend:        1000.0,
		TotalIncome:       3000.0,
		AvgDailySpend:     33.33,
		SubscriptionSpend: 150.0,
		SubscriptionCount: 5,
		TransactionCount:  50,
	}

	assert.Equal(t, 1000.0, stats.TotalSpend)
	assert.Equal(t, 3000.0, stats.TotalIncome)
	assert.Equal(t, 33.33, stats.AvgDailySpend)
	assert.Equal(t, 150.0, stats.SubscriptionSpend)
	assert.Equal(t, 5, stats.SubscriptionCount)
	assert.Equal(t, 50, stats.TransactionCount)
}

// Tests for CategoryItem struct

func TestCategoryItem_Structure(t *testing.T) {
	item := CategoryItem{
		Name:  "Food",
		Value: 150.0,
	}

	assert.Equal(t, "Food", item.Name)
	assert.Equal(t, 150.0, item.Value)
}

func TestCategoryItem_EmptyValues(t *testing.T) {
	item := CategoryItem{}

	assert.Equal(t, "", item.Name)
	assert.Equal(t, 0.0, item.Value)
}

// Tests for AccountItem struct

func TestAccountItem_Structure(t *testing.T) {
	item := AccountItem{
		Name:  "Checking",
		Value: 500.0,
	}

	assert.Equal(t, "Checking", item.Name)
	assert.Equal(t, 500.0, item.Value)
}

func TestAccountItem_EmptyValues(t *testing.T) {
	item := AccountItem{}

	assert.Equal(t, "", item.Name)
	assert.Equal(t, 0.0, item.Value)
}

func TestSpendingAnalyticsService_ConstructorVariations(t *testing.T) {
	// Variation 1: both nil
	s1 := NewSpendingAnalyticsService(nil, nil)
	assert.Nil(t, s1.repo)
	assert.Nil(t, s1.logger)

	// Variation 2: repo only
	repo := NewMockRepositoryForSpending()
	s2 := NewSpendingAnalyticsService(repo, nil)
	assert.NotNil(t, s2.repo)
	assert.Nil(t, s2.logger)

	// Variation 3: logger only
	logger := zap.NewNop()
	s3 := NewSpendingAnalyticsService(nil, logger)
	assert.Nil(t, s3.repo)
	assert.NotNil(t, s3.logger)

	// Variation 4: both
	s4 := NewSpendingAnalyticsService(repo, logger)
	assert.NotNil(t, s4.repo)
	assert.NotNil(t, s4.logger)
}

func TestSpendingAnalytics_EmptyState(t *testing.T) {
	analytics := SpendingAnalytics{
		Stats:             SpendingStats{},
		CategoryBreakdown: []CategoryItem{},
		AccountBreakdown:  []AccountItem{},
		TrendData:         []TrendItem{},
		TopMerchants:      []MerchantItem{},
		DateRange:         DateRangeInfo{},
	}

	assert.NotNil(t, analytics)
	assert.Equal(t, 0, len(analytics.CategoryBreakdown))
	assert.Equal(t, 0, len(analytics.AccountBreakdown))
}

func TestCategoryItem_MultipleCategories(t *testing.T) {
	categories := []CategoryItem{
		{Name: "Food", Value: 150.0},
		{Name: "Transport", Value: 75.0},
		{Name: "Entertainment", Value: 50.0},
	}

	assert.Equal(t, 3, len(categories))
	assert.Equal(t, "Food", categories[0].Name)
	assert.Equal(t, "Transport", categories[1].Name)
	assert.Equal(t, "Entertainment", categories[2].Name)
}

func TestSpendingStats_LargeValues(t *testing.T) {
	stats := SpendingStats{
		TotalSpend:        1000000.0,
		TotalIncome:       5000000.0,
		AvgDailySpend:     33333.33,
		SubscriptionSpend: 5000.0,
	}

	assert.Equal(t, 1000000.0, stats.TotalSpend)
	assert.Equal(t, 5000000.0, stats.TotalIncome)
}
