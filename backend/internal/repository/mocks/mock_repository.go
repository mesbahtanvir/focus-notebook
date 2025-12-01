package mocks

import (
	"context"
	"strings"

	"cloud.google.com/go/firestore"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/interfaces"
)

// MockRepository is a mock implementation of Repository for testing
type MockRepository struct {
	// Storage for mock data
	Documents map[string]map[string]interface{} // path -> data
	Client_   *firestore.Client
}

// Ensure MockRepository implements interfaces.Repository
var _ interfaces.Repository = (*MockRepository)(nil)

// NewMockRepository creates a new mock repository
func NewMockRepository() *MockRepository {
	return &MockRepository{
		Documents: make(map[string]map[string]interface{}),
	}
}

// Client returns the Firestore client
func (m *MockRepository) Client() *firestore.Client {
	return m.Client_
}

// Collection returns a collection reference
func (m *MockRepository) Collection(path string) *firestore.CollectionRef {
	if m.Client_ != nil {
		return m.Client_.Collection(path)
	}
	return nil
}

// Batch returns a new write batch
func (m *MockRepository) Batch() *firestore.WriteBatch {
	if m.Client_ != nil {
		return m.Client_.Batch()
	}
	return nil
}

// Get retrieves a document data
func (m *MockRepository) Get(ctx context.Context, path string) (map[string]interface{}, error) {
	if data, ok := m.Documents[path]; ok {
		return data, nil
	}
	return nil, nil
}

// Create creates a new document
func (m *MockRepository) Create(ctx context.Context, path string, data map[string]interface{}) error {
	m.Documents[path] = data
	return nil
}

// Update updates a document
func (m *MockRepository) Update(ctx context.Context, path string, data map[string]interface{}) error {
	if existing, ok := m.Documents[path]; ok {
		for k, v := range data {
			existing[k] = v
		}
	} else {
		m.Documents[path] = data
	}
	return nil
}

// Delete deletes a document
func (m *MockRepository) Delete(ctx context.Context, path string) error {
	delete(m.Documents, path)
	return nil
}

// List retrieves documents from a collection
func (m *MockRepository) List(ctx context.Context, collectionPath string, limit int) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	for path, data := range m.Documents {
		if len(path) > len(collectionPath) && path[:len(collectionPath)] == collectionPath {
			results = append(results, data)
			if limit > 0 && len(results) >= limit {
				break
			}
		}
	}
	return results, nil
}

// GetDocument retrieves a document snapshot
func (m *MockRepository) GetDocument(ctx context.Context, path string) (*firestore.DocumentSnapshot, error) {
	// For mock purposes, return nil - tests should use Get() instead
	return nil, nil
}

// SetDocument sets a document with merge
func (m *MockRepository) SetDocument(ctx context.Context, path string, data map[string]interface{}) error {
	return m.Update(ctx, path, data)
}

// UpdateDocument updates specific fields
func (m *MockRepository) UpdateDocument(ctx context.Context, path string, updates map[string]interface{}) error {
	return m.Update(ctx, path, updates)
}

// DeleteDocument deletes a document
func (m *MockRepository) DeleteDocument(ctx context.Context, path string) error {
	return m.Delete(ctx, path)
}

// CreateDocument creates a new document with metadata
func (m *MockRepository) CreateDocument(ctx context.Context, path string, data map[string]interface{}) error {
	return m.Create(ctx, path, data)
}

// QueryCollection queries a collection
func (m *MockRepository) QueryCollection(ctx context.Context, collectionPath string, opts ...interfaces.QueryOption) ([]*firestore.DocumentSnapshot, error) {
	// For mock purposes, return empty slice
	return []*firestore.DocumentSnapshot{}, nil
}

// AddDocument is a helper for tests to add mock data
func (m *MockRepository) AddDocument(path string, data map[string]interface{}) {
	m.Documents[path] = data
}

// GetCollectionDocuments retrieves documents matching a collection path pattern
func (m *MockRepository) GetCollectionDocuments(collectionPath string) []map[string]interface{} {
	var results []map[string]interface{}
	for path, data := range m.Documents {
		if len(path) > len(collectionPath) && path[:len(collectionPath)] == collectionPath {
			// Add the document with its ID
			docData := make(map[string]interface{})
			for k, v := range data {
				docData[k] = v
			}
			// Extract ID from path (last segment)
			parts := strings.Split(path, "/")
			if len(parts) > 0 {
				docData["id"] = parts[len(parts)-1]
			}
			results = append(results, docData)
		}
	}
	return results
}

// GetCollectionDocumentsFiltered retrieves documents matching filters
func (m *MockRepository) GetCollectionDocumentsFiltered(collectionPath string, filters map[string]interface{}, order string) []map[string]interface{} {
	docs := m.GetCollectionDocuments(collectionPath)

	// Apply filters
	filtered := []map[string]interface{}{}
	for _, doc := range docs {
		match := true
		for key, filterValue := range filters {
			if docValue, ok := doc[key]; !ok || docValue != filterValue {
				match = false
				break
			}
		}
		if match {
			filtered = append(filtered, doc)
		}
	}

	return filtered
}
