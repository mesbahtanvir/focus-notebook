package mocks

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewMockRepository(t *testing.T) {
	repo := NewMockRepository()

	require.NotNil(t, repo)
	assert.NotNil(t, repo.Documents)
	assert.Empty(t, repo.Documents)
	assert.Nil(t, repo.Client_)
}

func TestMockRepository_Client(t *testing.T) {
	repo := NewMockRepository()

	client := repo.Client()

	assert.Nil(t, client)
}

func TestMockRepository_Collection_WithNilClient(t *testing.T) {
	repo := NewMockRepository()

	collection := repo.Collection("users")

	assert.Nil(t, collection)
}

func TestMockRepository_Batch_WithNilClient(t *testing.T) {
	repo := NewMockRepository()

	batch := repo.Batch()

	assert.Nil(t, batch)
}

// Get operation tests
func TestMockRepository_Get_ExistingDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	// Setup
	testData := map[string]interface{}{"name": "John", "age": 30}
	repo.AddDocument("users/user1", testData)

	// Test
	result, err := repo.Get(ctx, "users/user1")

	assert.NoError(t, err)
	assert.Equal(t, testData, result)
}

func TestMockRepository_Get_NonExistentDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	result, err := repo.Get(ctx, "users/nonexistent")

	assert.NoError(t, err)
	assert.Nil(t, result)
}

func TestMockRepository_Get_EmptyPath(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	result, err := repo.Get(ctx, "")

	assert.NoError(t, err)
	assert.Nil(t, result)
}

// Create operation tests
func TestMockRepository_Create_NewDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	testData := map[string]interface{}{"name": "Alice", "email": "alice@example.com"}
	err := repo.Create(ctx, "users/alice", testData)

	assert.NoError(t, err)
	assert.Equal(t, testData, repo.Documents["users/alice"])
}

func TestMockRepository_Create_MultipleDocuments(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	data1 := map[string]interface{}{"id": "1", "name": "User1"}
	data2 := map[string]interface{}{"id": "2", "name": "User2"}

	err1 := repo.Create(ctx, "users/user1", data1)
	err2 := repo.Create(ctx, "users/user2", data2)

	assert.NoError(t, err1)
	assert.NoError(t, err2)
	assert.Equal(t, 2, len(repo.Documents))
}

func TestMockRepository_Create_EmptyData(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	emptyData := map[string]interface{}{}
	err := repo.Create(ctx, "users/empty", emptyData)

	assert.NoError(t, err)
	assert.Equal(t, emptyData, repo.Documents["users/empty"])
}

func TestMockRepository_Create_WithNilValues(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	testData := map[string]interface{}{"name": "Bob", "middle": nil}
	err := repo.Create(ctx, "users/bob", testData)

	assert.NoError(t, err)
	assert.NotNil(t, repo.Documents["users/bob"])
}

// Update operation tests
func TestMockRepository_Update_ExistingDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	// Setup
	original := map[string]interface{}{"name": "John", "age": 30}
	repo.AddDocument("users/john", original)

	// Test
	updates := map[string]interface{}{"age": 31}
	err := repo.Update(ctx, "users/john", updates)

	assert.NoError(t, err)
	assert.Equal(t, 31, repo.Documents["users/john"]["age"])
	assert.Equal(t, "John", repo.Documents["users/john"]["name"]) // Existing field preserved
}

func TestMockRepository_Update_NonExistentDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	updates := map[string]interface{}{"name": "NewUser"}
	err := repo.Update(ctx, "users/newuser", updates)

	assert.NoError(t, err)
	assert.Equal(t, updates, repo.Documents["users/newuser"])
}

func TestMockRepository_Update_MultipleFields(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	original := map[string]interface{}{"name": "John", "age": 30, "city": "NYC"}
	repo.AddDocument("users/john", original)

	updates := map[string]interface{}{"age": 31, "city": "LA"}
	err := repo.Update(ctx, "users/john", updates)

	assert.NoError(t, err)
	assert.Equal(t, 31, repo.Documents["users/john"]["age"])
	assert.Equal(t, "LA", repo.Documents["users/john"]["city"])
	assert.Equal(t, "John", repo.Documents["users/john"]["name"])
}

// Delete operation tests
func TestMockRepository_Delete_ExistingDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	// Setup
	repo.AddDocument("users/john", map[string]interface{}{"name": "John"})

	// Test
	err := repo.Delete(ctx, "users/john")

	assert.NoError(t, err)
	_, exists := repo.Documents["users/john"]
	assert.False(t, exists)
}

func TestMockRepository_Delete_NonExistentDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	err := repo.Delete(ctx, "users/nonexistent")

	assert.NoError(t, err)
}

func TestMockRepository_Delete_MultipleDocuments(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	repo.AddDocument("users/user1", map[string]interface{}{"name": "User1"})
	repo.AddDocument("users/user2", map[string]interface{}{"name": "User2"})

	err1 := repo.Delete(ctx, "users/user1")
	err2 := repo.Delete(ctx, "users/user2")

	assert.NoError(t, err1)
	assert.NoError(t, err2)
	assert.Empty(t, repo.Documents)
}

// List operation tests
func TestMockRepository_List_NoLimit(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	// Setup
	repo.AddDocument("users/user1", map[string]interface{}{"name": "User1"})
	repo.AddDocument("users/user2", map[string]interface{}{"name": "User2"})

	// Test
	result, err := repo.List(ctx, "users", 0)

	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
}

func TestMockRepository_List_WithLimit(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	// Setup
	repo.AddDocument("users/user1", map[string]interface{}{"name": "User1"})
	repo.AddDocument("users/user2", map[string]interface{}{"name": "User2"})
	repo.AddDocument("users/user3", map[string]interface{}{"name": "User3"})

	// Test
	result, err := repo.List(ctx, "users", 2)

	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
}

func TestMockRepository_List_NoDocuments(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	result, err := repo.List(ctx, "users", 0)

	assert.NoError(t, err)
	assert.Empty(t, result)
}

func TestMockRepository_List_EmptyCollection(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	repo.AddDocument("posts/post1", map[string]interface{}{"title": "Post1"})

	result, err := repo.List(ctx, "users", 0)

	assert.NoError(t, err)
	assert.Empty(t, result)
}

// SetDocument tests
func TestMockRepository_SetDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	testData := map[string]interface{}{"name": "John"}
	err := repo.SetDocument(ctx, "users/john", testData)

	assert.NoError(t, err)
	assert.Equal(t, testData, repo.Documents["users/john"])
}

// UpdateDocument tests
func TestMockRepository_UpdateDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	repo.AddDocument("users/john", map[string]interface{}{"name": "John"})
	updates := map[string]interface{}{"age": 30}

	err := repo.UpdateDocument(ctx, "users/john", updates)

	assert.NoError(t, err)
	assert.Equal(t, 30, repo.Documents["users/john"]["age"])
}

// DeleteDocument tests
func TestMockRepository_DeleteDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	repo.AddDocument("users/john", map[string]interface{}{"name": "John"})

	err := repo.DeleteDocument(ctx, "users/john")

	assert.NoError(t, err)
	_, exists := repo.Documents["users/john"]
	assert.False(t, exists)
}

// CreateDocument tests
func TestMockRepository_CreateDocument(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	testData := map[string]interface{}{"name": "John"}
	err := repo.CreateDocument(ctx, "users/john", testData)

	assert.NoError(t, err)
	assert.Equal(t, testData, repo.Documents["users/john"])
}

// QueryCollection tests
func TestMockRepository_QueryCollection(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	result, err := repo.QueryCollection(ctx, "users")

	assert.NoError(t, err)
	assert.Empty(t, result)
}

// AddDocument helper tests
func TestMockRepository_AddDocument(t *testing.T) {
	repo := NewMockRepository()

	testData := map[string]interface{}{"name": "John"}
	repo.AddDocument("users/john", testData)

	assert.Equal(t, testData, repo.Documents["users/john"])
}

func TestMockRepository_AddDocument_Multiple(t *testing.T) {
	repo := NewMockRepository()

	repo.AddDocument("users/user1", map[string]interface{}{"id": "1"})
	repo.AddDocument("users/user2", map[string]interface{}{"id": "2"})

	assert.Equal(t, 2, len(repo.Documents))
}

// GetCollectionDocuments tests
func TestMockRepository_GetCollectionDocuments(t *testing.T) {
	repo := NewMockRepository()

	repo.AddDocument("users/user1", map[string]interface{}{"name": "User1"})
	repo.AddDocument("users/user2", map[string]interface{}{"name": "User2"})

	result := repo.GetCollectionDocuments("users")

	assert.Equal(t, 2, len(result))
}

func TestMockRepository_GetCollectionDocuments_Empty(t *testing.T) {
	repo := NewMockRepository()

	result := repo.GetCollectionDocuments("users")

	assert.Empty(t, result)
}

func TestMockRepository_GetCollectionDocuments_WithID(t *testing.T) {
	repo := NewMockRepository()
	repo.AddDocument("users/user1", map[string]interface{}{"name": "User1"})

	result := repo.GetCollectionDocuments("users")

	require.Equal(t, 1, len(result))
	assert.Equal(t, "user1", result[0]["id"])
}

// GetCollectionDocumentsFiltered tests
func TestMockRepository_GetCollectionDocumentsFiltered(t *testing.T) {
	repo := NewMockRepository()

	repo.AddDocument("users/user1", map[string]interface{}{"name": "John", "age": 30})
	repo.AddDocument("users/user2", map[string]interface{}{"name": "Jane", "age": 25})

	filters := map[string]interface{}{"age": 30}
	result := repo.GetCollectionDocumentsFiltered("users", filters, "")

	assert.Equal(t, 1, len(result))
	assert.Equal(t, "John", result[0]["name"])
}

func TestMockRepository_GetCollectionDocumentsFiltered_NoMatches(t *testing.T) {
	repo := NewMockRepository()

	repo.AddDocument("users/user1", map[string]interface{}{"name": "John", "age": 30})

	filters := map[string]interface{}{"age": 25}
	result := repo.GetCollectionDocumentsFiltered("users", filters, "")

	assert.Empty(t, result)
}

func TestMockRepository_GetCollectionDocumentsFiltered_MultipleFilters(t *testing.T) {
	repo := NewMockRepository()

	repo.AddDocument("users/user1", map[string]interface{}{"name": "John", "age": 30, "city": "NYC"})
	repo.AddDocument("users/user2", map[string]interface{}{"name": "Jane", "age": 30, "city": "LA"})

	filters := map[string]interface{}{"age": 30, "city": "NYC"}
	result := repo.GetCollectionDocumentsFiltered("users", filters, "")

	assert.Equal(t, 1, len(result))
	assert.Equal(t, "John", result[0]["name"])
}

func TestMockRepository_GetCollectionDocumentsFiltered_Empty(t *testing.T) {
	repo := NewMockRepository()

	filters := map[string]interface{}{"age": 30}
	result := repo.GetCollectionDocumentsFiltered("users", filters, "")

	assert.Empty(t, result)
}

// Complex operation tests
func TestMockRepository_CreateUpdateGet(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	// Create
	data := map[string]interface{}{"name": "John", "age": 30}
	err := repo.Create(ctx, "users/john", data)
	require.NoError(t, err)

	// Update
	updates := map[string]interface{}{"age": 31}
	err = repo.Update(ctx, "users/john", updates)
	require.NoError(t, err)

	// Get
	result, err := repo.Get(ctx, "users/john")
	assert.NoError(t, err)
	assert.Equal(t, 31, result["age"])
	assert.Equal(t, "John", result["name"])
}

func TestMockRepository_CreateListDelete(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	// Create multiple
	repo.Create(ctx, "users/user1", map[string]interface{}{"name": "User1"})
	repo.Create(ctx, "users/user2", map[string]interface{}{"name": "User2"})

	// List
	list1, _ := repo.List(ctx, "users", 0)
	assert.Equal(t, 2, len(list1))

	// Delete one
	repo.Delete(ctx, "users/user1")

	// List again
	list2, _ := repo.List(ctx, "users", 0)
	assert.Equal(t, 1, len(list2))
}

func TestMockRepository_ConcurrentOperations(t *testing.T) {
	repo := NewMockRepository()
	ctx := context.Background()

	// Create initial data
	repo.Create(ctx, "users/user1", map[string]interface{}{"name": "User1"})

	// Perform multiple operations
	repo.Update(ctx, "users/user1", map[string]interface{}{"status": "active"})
	repo.Get(ctx, "users/user1")
	repo.List(ctx, "users", 0)

	// Verify state
	assert.Equal(t, 1, len(repo.Documents))
	assert.Equal(t, "active", repo.Documents["users/user1"]["status"])
}
