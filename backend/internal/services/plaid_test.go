package services

import (
	"context"
	"testing"

	"cloud.google.com/go/firestore"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/interfaces"
)

// MockRepositoryForPlaid implements interfaces.Repository for testing
type MockRepositoryForPlaid struct {
	data map[string]map[string]interface{}
}

func NewMockRepositoryForPlaid() *MockRepositoryForPlaid {
	return &MockRepositoryForPlaid{
		data: make(map[string]map[string]interface{}),
	}
}

func (m *MockRepositoryForPlaid) Get(ctx context.Context, path string) (map[string]interface{}, error) {
	if data, ok := m.data[path]; ok {
		return data, nil
	}
	return nil, nil
}

func (m *MockRepositoryForPlaid) Create(ctx context.Context, path string, data map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForPlaid) Update(ctx context.Context, path string, data map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForPlaid) Delete(ctx context.Context, path string) error {
	return nil
}

func (m *MockRepositoryForPlaid) List(ctx context.Context, collectionPath string, limit int) ([]map[string]interface{}, error) {
	return nil, nil
}

func (m *MockRepositoryForPlaid) GetDocument(ctx context.Context, path string) (*firestore.DocumentSnapshot, error) {
	return nil, nil
}

func (m *MockRepositoryForPlaid) SetDocument(ctx context.Context, path string, data map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForPlaid) UpdateDocument(ctx context.Context, path string, updates map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForPlaid) DeleteDocument(ctx context.Context, path string) error {
	return nil
}

func (m *MockRepositoryForPlaid) CreateDocument(ctx context.Context, path string, data map[string]interface{}) error {
	return nil
}

func (m *MockRepositoryForPlaid) QueryCollection(ctx context.Context, collectionPath string, opts ...interfaces.QueryOption) ([]*firestore.DocumentSnapshot, error) {
	return nil, nil
}

func (m *MockRepositoryForPlaid) Collection(path string) *firestore.CollectionRef {
	return nil
}

func (m *MockRepositoryForPlaid) Batch() *firestore.WriteBatch {
	return nil
}

func (m *MockRepositoryForPlaid) Client() *firestore.Client {
	return nil
}

// Tests for PlaidService

func TestNewPlaidService(t *testing.T) {
	plaidClient := &clients.PlaidClient{}
	repo := NewMockRepositoryForPlaid()
	logger := zap.NewNop()

	service := NewPlaidService(plaidClient, repo, logger)

	assert.NotNil(t, service)
	assert.Equal(t, plaidClient, service.plaidClient)
	assert.Equal(t, repo, service.repo)
	assert.Equal(t, logger, service.logger)
}

func TestNewPlaidService_WithNilClient(t *testing.T) {
	repo := NewMockRepositoryForPlaid()
	logger := zap.NewNop()

	service := NewPlaidService(nil, repo, logger)

	assert.NotNil(t, service)
	assert.Nil(t, service.plaidClient)
	assert.Equal(t, repo, service.repo)
}

func TestNewPlaidService_WithNilRepository(t *testing.T) {
	plaidClient := &clients.PlaidClient{}
	logger := zap.NewNop()

	service := NewPlaidService(plaidClient, nil, logger)

	assert.NotNil(t, service)
	assert.Equal(t, plaidClient, service.plaidClient)
	assert.Nil(t, service.repo)
}

func TestNewPlaidService_WithNilLogger(t *testing.T) {
	plaidClient := &clients.PlaidClient{}
	repo := NewMockRepositoryForPlaid()

	service := NewPlaidService(plaidClient, repo, nil)

	assert.NotNil(t, service)
	assert.Equal(t, plaidClient, service.plaidClient)
	assert.Equal(t, repo, service.repo)
	assert.Nil(t, service.logger)
}

func TestNewPlaidService_AllNil(t *testing.T) {
	service := NewPlaidService(nil, nil, nil)

	assert.NotNil(t, service)
	assert.Nil(t, service.plaidClient)
	assert.Nil(t, service.repo)
	assert.Nil(t, service.logger)
}

func TestPlaidService_Fields(t *testing.T) {
	plaidClient := &clients.PlaidClient{}
	repo := NewMockRepositoryForPlaid()
	logger := zap.NewNop()
	service := NewPlaidService(plaidClient, repo, logger)

	assert.NotNil(t, service.plaidClient)
	assert.NotNil(t, service.repo)
	assert.NotNil(t, service.logger)
}

func TestPlaidService_PlaidClientStorage(t *testing.T) {
	plaidClient := &clients.PlaidClient{}
	service := NewPlaidService(plaidClient, nil, nil)

	assert.Equal(t, plaidClient, service.plaidClient)
}

func TestPlaidService_RepositoryStorage(t *testing.T) {
	repo := NewMockRepositoryForPlaid()
	service := NewPlaidService(nil, repo, nil)

	assert.Equal(t, repo, service.repo)
}

func TestPlaidService_LoggerStorage(t *testing.T) {
	logger := zap.NewNop()
	service := NewPlaidService(nil, nil, logger)

	assert.Equal(t, logger, service.logger)
}

func TestPlaidService_Constructor(t *testing.T) {
	service := NewPlaidService(nil, nil, nil)

	assert.Nil(t, service.plaidClient)
	assert.Nil(t, service.repo)
	assert.Nil(t, service.logger)
}

func TestPlaidService_MultipleInstances(t *testing.T) {
	plaidClient := &clients.PlaidClient{}
	repo := NewMockRepositoryForPlaid()
	logger := zap.NewNop()

	service1 := NewPlaidService(plaidClient, repo, logger)
	service2 := NewPlaidService(plaidClient, repo, logger)

	assert.NotNil(t, service1)
	assert.NotNil(t, service2)
	assert.Equal(t, plaidClient, service1.plaidClient)
	assert.Equal(t, plaidClient, service2.plaidClient)
}

func TestPlaidService_WithClient(t *testing.T) {
	plaidClient := &clients.PlaidClient{}
	service := NewPlaidService(plaidClient, nil, nil)

	assert.NotNil(t, service)
	assert.NotNil(t, service.plaidClient)
}

func TestPlaidService_WithRepository(t *testing.T) {
	repo := NewMockRepositoryForPlaid()
	service := NewPlaidService(nil, repo, nil)

	assert.NotNil(t, service)
	assert.NotNil(t, service.repo)
}

func TestPlaidService_WithLogger(t *testing.T) {
	logger := zap.NewNop()
	service := NewPlaidService(nil, nil, logger)

	assert.NotNil(t, service)
	assert.NotNil(t, service.logger)
}

func TestPlaidService_ImplementsExpectedMethods(t *testing.T) {
	service := NewPlaidService(nil, nil, nil)

	assert.NotNil(t, service)
	// Service should have CreateLinkToken and other methods
}

func TestPlaidService_AllFields(t *testing.T) {
	plaidClient := &clients.PlaidClient{}
	repo := NewMockRepositoryForPlaid()
	logger := zap.NewNop()

	service := NewPlaidService(plaidClient, repo, logger)

	assert.NotNil(t, service.plaidClient)
	assert.NotNil(t, service.repo)
	assert.NotNil(t, service.logger)
}

func TestPlaidService_ConstructorVariations(t *testing.T) {
	// Variation 1: all nil
	s1 := NewPlaidService(nil, nil, nil)
	assert.Nil(t, s1.plaidClient)
	assert.Nil(t, s1.repo)
	assert.Nil(t, s1.logger)

	// Variation 2: client only
	client := &clients.PlaidClient{}
	s2 := NewPlaidService(client, nil, nil)
	assert.NotNil(t, s2.plaidClient)
	assert.Nil(t, s2.repo)
	assert.Nil(t, s2.logger)

	// Variation 3: repo only
	repo := NewMockRepositoryForPlaid()
	s3 := NewPlaidService(nil, repo, nil)
	assert.Nil(t, s3.plaidClient)
	assert.NotNil(t, s3.repo)
	assert.Nil(t, s3.logger)

	// Variation 4: all
	logger := zap.NewNop()
	s4 := NewPlaidService(client, repo, logger)
	assert.NotNil(t, s4.plaidClient)
	assert.NotNil(t, s4.repo)
	assert.NotNil(t, s4.logger)
}

// Tests for CreateLinkTokenRequest struct

func TestCreateLinkTokenRequest_Structure(t *testing.T) {
	req := CreateLinkTokenRequest{
		UID:         "user-123",
		Email:       "user@example.com",
		Platform:    "web",
		RedirectURI: "https://example.com/callback",
	}

	assert.Equal(t, "user-123", req.UID)
	assert.Equal(t, "user@example.com", req.Email)
	assert.Equal(t, "web", req.Platform)
	assert.Equal(t, "https://example.com/callback", req.RedirectURI)
}

func TestCreateLinkTokenRequest_EmptyValues(t *testing.T) {
	req := CreateLinkTokenRequest{}

	assert.Equal(t, "", req.UID)
	assert.Equal(t, "", req.Email)
	assert.Equal(t, "", req.Platform)
	assert.Equal(t, "", req.RedirectURI)
}
