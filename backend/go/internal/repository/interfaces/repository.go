package interfaces

import "context"

// Repository defines the interface for data storage operations
type Repository interface {
	// Get retrieves a document by path
	Get(ctx context.Context, path string) (map[string]interface{}, error)

	// Create creates a new document at the given path
	Create(ctx context.Context, path string, data map[string]interface{}) error

	// Update updates an existing document at the given path
	Update(ctx context.Context, path string, updates map[string]interface{}) error

	// Delete deletes a document at the given path
	Delete(ctx context.Context, path string) error
}
