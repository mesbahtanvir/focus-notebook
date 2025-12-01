package interfaces

import (
	"context"

	"cloud.google.com/go/firestore"
)

// Repository defines the interface for data persistence operations
type Repository interface {
	// Document operations
	Get(ctx context.Context, path string) (map[string]interface{}, error)
	Create(ctx context.Context, path string, data map[string]interface{}) error
	Update(ctx context.Context, path string, data map[string]interface{}) error
	Delete(ctx context.Context, path string) error
	List(ctx context.Context, collectionPath string, limit int) ([]map[string]interface{}, error)

	// Firestore-specific operations (for compatibility with existing code)
	GetDocument(ctx context.Context, path string) (*firestore.DocumentSnapshot, error)
	SetDocument(ctx context.Context, path string, data map[string]interface{}) error
	UpdateDocument(ctx context.Context, path string, updates map[string]interface{}) error
	DeleteDocument(ctx context.Context, path string) error
	CreateDocument(ctx context.Context, path string, data map[string]interface{}) error
	QueryCollection(ctx context.Context, collectionPath string, opts ...QueryOption) ([]*firestore.DocumentSnapshot, error)

	// Collection and batch operations
	Collection(path string) *firestore.CollectionRef
	Batch() *firestore.WriteBatch
	Client() *firestore.Client
}

// QueryOption is a function that modifies a Firestore query
type QueryOption func(firestore.Query) firestore.Query
