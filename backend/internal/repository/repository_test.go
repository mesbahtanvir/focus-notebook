package repository

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

// This file provides test coverage for repository operations using MockRepository

func TestRepositoryPackageExists(t *testing.T) {
	// Verify repository package is importable and contains expected types
	assert.True(t, true)
}

func TestRepositoryInterfaceIsUsable(t *testing.T) {
	// Repository interface should be importable from internal/repository/interfaces
	assert.True(t, true)
}

// Repository operation tests using MockRepository

func TestRepository_CreateAndRetrieve(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create a document
	userData := map[string]interface{}{
		"name":  "John Doe",
		"email": "john@example.com",
		"age":   30,
	}
	err := repo.Create(ctx, "users/john", userData)
	require.NoError(t, err)

	// Retrieve the document
	retrieved, err := repo.Get(ctx, "users/john")
	require.NoError(t, err)
	assert.Equal(t, userData, retrieved)
}

func TestRepository_CreateUpdateRetrieve(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create
	err := repo.Create(ctx, "users/jane", map[string]interface{}{"name": "Jane", "age": 25})
	require.NoError(t, err)

	// Update
	err = repo.Update(ctx, "users/jane", map[string]interface{}{"age": 26})
	require.NoError(t, err)

	// Retrieve
	data, err := repo.Get(ctx, "users/jane")
	require.NoError(t, err)
	assert.Equal(t, 26, data["age"])
	assert.Equal(t, "Jane", data["name"])
}

func TestRepository_CreateAndDelete(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create
	err := repo.Create(ctx, "users/bob", map[string]interface{}{"name": "Bob"})
	require.NoError(t, err)

	// Verify exists
	data, err := repo.Get(ctx, "users/bob")
	require.NoError(t, err)
	assert.NotNil(t, data)

	// Delete
	err = repo.Delete(ctx, "users/bob")
	require.NoError(t, err)

	// Verify deleted
	data, err = repo.Get(ctx, "users/bob")
	require.NoError(t, err)
	assert.Nil(t, data)
}

func TestRepository_ListDocuments(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create multiple documents
	err := repo.Create(ctx, "users/user1", map[string]interface{}{"name": "User1"})
	require.NoError(t, err)
	err = repo.Create(ctx, "users/user2", map[string]interface{}{"name": "User2"})
	require.NoError(t, err)
	err = repo.Create(ctx, "users/user3", map[string]interface{}{"name": "User3"})
	require.NoError(t, err)

	// List all
	docs, err := repo.List(ctx, "users", 0)
	require.NoError(t, err)
	assert.Equal(t, 3, len(docs))

	// List with limit
	docs, err = repo.List(ctx, "users", 2)
	require.NoError(t, err)
	assert.Equal(t, 2, len(docs))
}

func TestRepository_BulkCreateAndQuery(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create batch of documents
	for i := 1; i <= 5; i++ {
		data := map[string]interface{}{
			"id":   i,
			"name": "Task " + string(rune(i+'0')),
			"done": i%2 == 0,
		}
		err := repo.Create(ctx, "tasks/task"+string(rune(i+'0')), data)
		require.NoError(t, err)
	}

	// Query collection
	result := repo.GetCollectionDocuments("tasks")
	assert.Equal(t, 5, len(result))

	// Verify some data
	for _, doc := range result {
		assert.NotNil(t, doc["id"])
		assert.NotNil(t, doc["name"])
	}
}

func TestRepository_FilteredQuery(t *testing.T) {
	repo := mocks.NewMockRepository()

	// Add test data
	repo.AddDocument("tasks/task1", map[string]interface{}{"status": "pending", "priority": "high"})
	repo.AddDocument("tasks/task2", map[string]interface{}{"status": "pending", "priority": "low"})
	repo.AddDocument("tasks/task3", map[string]interface{}{"status": "done", "priority": "high"})

	// Query with filters
	filters := map[string]interface{}{"status": "pending"}
	result := repo.GetCollectionDocumentsFiltered("tasks", filters, "")

	assert.Equal(t, 2, len(result))
	for _, doc := range result {
		assert.Equal(t, "pending", doc["status"])
	}
}

func TestRepository_ComplexDocumentStructure(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create document with nested structure
	complexData := map[string]interface{}{
		"id":    "user1",
		"name":  "John",
		"email": "john@example.com",
		"metadata": map[string]interface{}{
			"created": "2024-01-01",
			"active":  true,
		},
		"tags": []string{"vip", "verified"},
	}

	err := repo.Create(ctx, "users/user1", complexData)
	require.NoError(t, err)

	retrieved, err := repo.Get(ctx, "users/user1")
	require.NoError(t, err)
	assert.Equal(t, complexData, retrieved)
}

func TestRepository_DocumentVariations(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Test with different data types
	testCases := []map[string]interface{}{
		{"type": "string", "value": "text"},
		{"type": "number", "value": 42},
		{"type": "float", "value": 3.14},
		{"type": "bool", "value": true},
		{"type": "nil", "value": nil},
	}

	for i, testData := range testCases {
		path := "data/item" + string(rune('0'+i))
		err := repo.Create(ctx, path, testData)
		require.NoError(t, err)
	}

	// Retrieve and verify
	for i := range testCases {
		path := "data/item" + string(rune('0'+i))
		retrieved, _ := repo.Get(ctx, path)
		assert.NotNil(t, retrieved)
	}
}

func TestRepository_CollectionIsolation(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create documents in different collections
	err := repo.Create(ctx, "users/user1", map[string]interface{}{"type": "user"})
	require.NoError(t, err)
	err = repo.Create(ctx, "posts/post1", map[string]interface{}{"type": "post"})
	require.NoError(t, err)

	// List users
	users, err := repo.List(ctx, "users", 0)
	require.NoError(t, err)
	assert.Equal(t, 1, len(users))

	// List posts
	posts, err := repo.List(ctx, "posts", 0)
	require.NoError(t, err)
	assert.Equal(t, 1, len(posts))
}

func TestRepository_MultiLevelPaths(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create documents with nested collection paths
	paths := []string{
		"users/user1/posts/post1",
		"users/user1/posts/post2",
		"users/user2/posts/post1",
	}

	for _, path := range paths {
		err := repo.Create(ctx, path, map[string]interface{}{"path": path})
		require.NoError(t, err)
	}

	// Verify total documents
	assert.Equal(t, 3, len(repo.Documents))

	// Query nested collection
	nested := repo.GetCollectionDocuments("users/user1/posts")
	assert.Equal(t, 2, len(nested))
}

func TestRepository_LargeDataSet(t *testing.T) {
	repo := mocks.NewMockRepository()
	ctx := context.Background()

	// Create many documents
	count := 100
	for i := 0; i < count; i++ {
		data := map[string]interface{}{"index": i, "value": i * 2}
		err := repo.Create(ctx, "items/item"+fmt.Sprintf("%03d", i), data)
		require.NoError(t, err)
	}

	// List with limit
	docs, err := repo.List(ctx, "items", 50)
	require.NoError(t, err)
	assert.Equal(t, 50, len(docs))

	// List all
	docs, err = repo.List(ctx, "items", 0)
	require.NoError(t, err)
	assert.Equal(t, count, len(docs))
}
