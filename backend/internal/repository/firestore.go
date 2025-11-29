package repository

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/interfaces"
)

// Ensure FirestoreRepository implements interfaces.Repository
var _ interfaces.Repository = (*FirestoreRepository)(nil)

// FirestoreRepository handles Firestore CRUD operations
type FirestoreRepository struct {
	client *firestore.Client
}

// NewFirestoreRepository creates a new Firestore repository
func NewFirestoreRepository(client *firestore.Client) *FirestoreRepository {
	return &FirestoreRepository{
		client: client,
	}
}

// Client returns the underlying Firestore client
func (r *FirestoreRepository) Client() *firestore.Client {
	return r.client
}

// Collection returns a collection reference
func (r *FirestoreRepository) Collection(path string) *firestore.CollectionRef {
	return r.client.Collection(path)
}

// Batch returns a new write batch
func (r *FirestoreRepository) Batch() *firestore.WriteBatch {
	return r.client.Batch()
}

// Get retrieves a document and returns its data as a map
func (r *FirestoreRepository) Get(ctx context.Context, path string) (map[string]interface{}, error) {
	ref := r.client.Doc(path)
	snap, err := ref.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get document at %s: %w", path, err)
	}
	return snap.Data(), nil
}

// Create creates a new document (alias for CreateDocument)
func (r *FirestoreRepository) Create(ctx context.Context, path string, data map[string]interface{}) error {
	return r.CreateDocument(ctx, path, data)
}

// Update updates a document (alias for UpdateDocument)
func (r *FirestoreRepository) Update(ctx context.Context, path string, data map[string]interface{}) error {
	return r.UpdateDocument(ctx, path, data)
}

// Delete deletes a document (alias for DeleteDocument)
func (r *FirestoreRepository) Delete(ctx context.Context, path string) error {
	return r.DeleteDocument(ctx, path)
}

// List retrieves documents from a collection with optional limit
func (r *FirestoreRepository) List(ctx context.Context, collectionPath string, limit int) ([]map[string]interface{}, error) {
	query := r.client.Collection(collectionPath).Query
	if limit > 0 {
		query = query.Limit(limit)
	}

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("failed to list collection %s: %w", collectionPath, err)
	}

	result := make([]map[string]interface{}, len(docs))
	for i, doc := range docs {
		result[i] = doc.Data()
	}
	return result, nil
}

// CreateDocument creates a new document with metadata
// Matches createAt() from src/lib/data/gateway.ts:59-68
func (r *FirestoreRepository) CreateDocument(ctx context.Context, path string, data map[string]interface{}) error {
	uid := GetUIDFromContext(ctx)

	// Add metadata
	now := time.Now()
	data["createdAt"] = now
	data["updatedAt"] = now
	data["updatedBy"] = uid
	data["version"] = 1

	// Remove undefined values
	cleanData := RemoveUndefinedValues(data)

	ref := r.client.Doc(path)
	_, err := ref.Set(ctx, cleanData)
	if err != nil {
		return fmt.Errorf("failed to create document at %s: %w", path, err)
	}

	return nil
}

// SetDocument sets/merges a document with metadata
// Matches setAt() from src/lib/data/gateway.ts:74-86
func (r *FirestoreRepository) SetDocument(ctx context.Context, path string, data map[string]interface{}) error {
	uid := GetUIDFromContext(ctx)

	// Add metadata
	data["updatedAt"] = time.Now()
	data["updatedBy"] = uid
	data["version"] = firestore.Increment(1)

	cleanData := RemoveUndefinedValues(data)

	ref := r.client.Doc(path)
	_, err := ref.Set(ctx, cleanData, firestore.MergeAll)
	if err != nil {
		return fmt.Errorf("failed to set document at %s: %w", path, err)
	}

	return nil
}

// UpdateDocument updates specific fields in a document
// Matches updateAt() from src/lib/data/gateway.ts:92-100
func (r *FirestoreRepository) UpdateDocument(ctx context.Context, path string, updates map[string]interface{}) error {
	uid := GetUIDFromContext(ctx)

	// Add metadata
	updates["updatedAt"] = time.Now()
	updates["updatedBy"] = uid
	updates["version"] = firestore.Increment(1)

	cleanUpdates := RemoveUndefinedValues(updates)

	// Convert to []firestore.Update
	var fieldUpdates []firestore.Update
	cleanMap, ok := cleanUpdates.(map[string]interface{})
	if !ok {
		return fmt.Errorf("failed to convert updates to map")
	}
	for key, value := range cleanMap {
		fieldUpdates = append(fieldUpdates, firestore.Update{
			Path:  key,
			Value: value,
		})
	}

	ref := r.client.Doc(path)
	_, err := ref.Update(ctx, fieldUpdates)
	if err != nil {
		return fmt.Errorf("failed to update document at %s: %w", path, err)
	}

	return nil
}

// DeleteDocument deletes a document
// Matches deleteAt() from src/lib/data/gateway.ts:105-108
func (r *FirestoreRepository) DeleteDocument(ctx context.Context, path string) error {
	ref := r.client.Doc(path)
	_, err := ref.Delete(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete document at %s: %w", path, err)
	}

	return nil
}

// GetDocument retrieves a single document
func (r *FirestoreRepository) GetDocument(ctx context.Context, path string) (*firestore.DocumentSnapshot, error) {
	ref := r.client.Doc(path)
	snap, err := ref.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get document at %s: %w", path, err)
	}

	return snap, nil
}

// QueryCollection queries a collection with optional filters
func (r *FirestoreRepository) QueryCollection(ctx context.Context, collectionPath string, opts ...interfaces.QueryOption) ([]*firestore.DocumentSnapshot, error) {
	query := r.client.Collection(collectionPath).Query

	// Apply options
	for _, opt := range opts {
		query = opt(query)
	}

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("failed to query collection %s: %w", collectionPath, err)
	}

	return docs, nil
}

// GetCollection retrieves all documents in a collection
func (r *FirestoreRepository) GetCollection(ctx context.Context, collectionPath string) ([]*firestore.DocumentSnapshot, error) {
	return r.QueryCollection(ctx, collectionPath)
}

// QueryOption is a function that modifies a Firestore query (alias for interfaces.QueryOption)
type QueryOption = interfaces.QueryOption

// Where adds a where clause to the query
func Where(field string, op string, value interface{}) QueryOption {
	return func(q firestore.Query) firestore.Query {
		return q.Where(field, op, value)
	}
}

// OrderBy adds ordering to the query
func OrderBy(field string, direction firestore.Direction) QueryOption {
	return func(q firestore.Query) firestore.Query {
		return q.OrderBy(field, direction)
	}
}

// Limit limits the number of results
func Limit(n int) QueryOption {
	return func(q firestore.Query) firestore.Query {
		return q.Limit(n)
	}
}

// GetUIDFromContext extracts the user ID from context
func GetUIDFromContext(ctx context.Context) string {
	if uid, ok := ctx.Value("uid").(string); ok {
		return uid
	}
	return "anon"
}

// RemoveUndefinedValues recursively removes nil values from maps
// Matches removeUndefined() from src/lib/data/gateway.ts:15-53
func RemoveUndefinedValues(obj interface{}) interface{} {
	switch v := obj.(type) {
	case map[string]interface{}:
		cleaned := make(map[string]interface{})
		for key, value := range v {
			if value != nil {
				cleanedValue := RemoveUndefinedValues(value)
				if cleanedValue != nil {
					cleaned[key] = cleanedValue
				}
			}
		}
		return cleaned

	case []interface{}:
		var cleaned []interface{}
		for _, item := range v {
			if item != nil {
				cleanedItem := RemoveUndefinedValues(item)
				if cleanedItem != nil {
					cleaned = append(cleaned, cleanedItem)
				}
			}
		}
		return cleaned

	default:
		return obj
	}
}

// BatchWrite provides batch write operations
type BatchWrite struct {
	batch *firestore.WriteBatch
	count int
}

// NewBatchWrite creates a new batch write
func (r *FirestoreRepository) NewBatchWrite(ctx context.Context) *BatchWrite {
	return &BatchWrite{
		batch: r.client.Batch(),
		count: 0,
	}
}

// Create adds a create operation to the batch
func (b *BatchWrite) Create(ref *firestore.DocumentRef, data map[string]interface{}) {
	b.batch.Create(ref, data)
	b.count++
}

// Update adds an update operation to the batch
func (b *BatchWrite) Update(ref *firestore.DocumentRef, updates []firestore.Update) {
	b.batch.Update(ref, updates)
	b.count++
}

// Delete adds a delete operation to the batch
func (b *BatchWrite) Delete(ref *firestore.DocumentRef) {
	b.batch.Delete(ref)
	b.count++
}

// Commit commits the batch
func (b *BatchWrite) Commit(ctx context.Context) error {
	_, err := b.batch.Commit(ctx)
	return err
}

// Count returns the number of operations in the batch
func (b *BatchWrite) Count() int {
	return b.count
}
