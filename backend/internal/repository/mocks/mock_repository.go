package mocks

import (
	"context"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
)

// MockRepository is a mock implementation of Repository for testing
type MockRepository struct {
	// Storage for mock data
	Collections map[string]map[string]map[string]interface{} // collection -> docID -> data

	// Callbacks for testing
	OnCollection func(name string) repository.CollectionRef
	OnBatch      func() repository.WriteBatch
}

// NewMockRepository creates a new mock repository
func NewMockRepository() *MockRepository {
	return &MockRepository{
		Collections: make(map[string]map[string]map[string]interface{}),
	}
}

// Collection returns a mock collection reference
func (m *MockRepository) Collection(name string) repository.CollectionRef {
	if m.OnCollection != nil {
		return m.OnCollection(name)
	}

	// Ensure collection exists
	if _, exists := m.Collections[name]; !exists {
		m.Collections[name] = make(map[string]map[string]interface{})
	}

	return &MockCollectionRef{
		repo:           m,
		collectionName: name,
		whereClauses:   []whereClause{},
	}
}

// Batch returns a mock write batch
func (m *MockRepository) Batch() repository.WriteBatch {
	if m.OnBatch != nil {
		return m.OnBatch()
	}
	return &MockWriteBatch{
		repo:       m,
		operations: []batchOperation{},
	}
}

// AddDocument adds a document to the mock repository
func (m *MockRepository) AddDocument(collection, docID string, data map[string]interface{}) {
	if _, exists := m.Collections[collection]; !exists {
		m.Collections[collection] = make(map[string]map[string]interface{})
	}
	m.Collections[collection][docID] = data
}

// GetDocument retrieves a document from the mock repository
func (m *MockRepository) GetDocument(collection, docID string) (map[string]interface{}, bool) {
	if coll, exists := m.Collections[collection]; exists {
		if doc, exists := coll[docID]; exists {
			return doc, true
		}
	}
	return nil, false
}

// MockCollectionRef is a mock implementation of CollectionRef
type MockCollectionRef struct {
	repo           *MockRepository
	collectionName string
	whereClauses   []whereClause
	orderByClauses []orderByClause
	limitValue     int
	selectFields   []string
}

type whereClause struct {
	field    string
	operator string
	value    interface{}
}

type orderByClause struct {
	field     string
	direction string
}

// Where adds a where clause
func (m *MockCollectionRef) Where(field, op string, value interface{}) repository.Query {
	newRef := &MockCollectionRef{
		repo:           m.repo,
		collectionName: m.collectionName,
		whereClauses:   append(m.whereClauses, whereClause{field, op, value}),
		orderByClauses: m.orderByClauses,
		limitValue:     m.limitValue,
		selectFields:   m.selectFields,
	}
	return newRef
}

// OrderBy adds an order by clause
func (m *MockCollectionRef) OrderBy(field, direction string) repository.Query {
	newRef := &MockCollectionRef{
		repo:           m.repo,
		collectionName: m.collectionName,
		whereClauses:   m.whereClauses,
		orderByClauses: append(m.orderByClauses, orderByClause{field, direction}),
		limitValue:     m.limitValue,
		selectFields:   m.selectFields,
	}
	return newRef
}

// Limit adds a limit clause
func (m *MockCollectionRef) Limit(n int) repository.Query {
	newRef := &MockCollectionRef{
		repo:           m.repo,
		collectionName: m.collectionName,
		whereClauses:   m.whereClauses,
		orderByClauses: m.orderByClauses,
		limitValue:     n,
		selectFields:   m.selectFields,
	}
	return newRef
}

// Select specifies fields to select
func (m *MockCollectionRef) Select(fields ...string) repository.Query {
	newRef := &MockCollectionRef{
		repo:           m.repo,
		collectionName: m.collectionName,
		whereClauses:   m.whereClauses,
		orderByClauses: m.orderByClauses,
		limitValue:     m.limitValue,
		selectFields:   fields,
	}
	return newRef
}

// Documents returns a mock document iterator
func (m *MockCollectionRef) Documents(ctx context.Context) repository.DocumentIterator {
	// Get all documents in collection
	collection := m.repo.Collections[m.collectionName]
	if collection == nil {
		collection = make(map[string]map[string]interface{})
	}

	// Filter by where clauses
	var results []map[string]interface{}
	for docID, data := range collection {
		// Copy data
		dataCopy := make(map[string]interface{})
		for k, v := range data {
			dataCopy[k] = v
		}
		dataCopy["_id"] = docID

		// Apply where clauses
		if m.matchesWhereClauses(dataCopy) {
			results = append(results, dataCopy)
		}
	}

	// Apply limit
	if m.limitValue > 0 && len(results) > m.limitValue {
		results = results[:m.limitValue]
	}

	return &MockDocumentIterator{
		docs:  results,
		index: 0,
	}
}

// Doc returns a mock document reference
func (m *MockCollectionRef) Doc(id string) repository.DocumentRef {
	return &MockDocumentRef{
		repo:           m.repo,
		collectionName: m.collectionName,
		docID:          id,
	}
}

// matchesWhereClauses checks if a document matches all where clauses
func (m *MockCollectionRef) matchesWhereClauses(data map[string]interface{}) bool {
	for _, clause := range m.whereClauses {
		value, ok := data[clause.field]
		if !ok && clause.operator != "==" {
			return false
		}

		switch clause.operator {
		case "==":
			if value != clause.value {
				return false
			}
		case "in":
			// Check if value is in the slice
			inValues, ok := clause.value.([]interface{})
			if !ok {
				return false
			}
			found := false
			for _, inVal := range inValues {
				if value == inVal {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		case ">=":
			// Simple string/number comparison
			if !compareValues(value, clause.value, ">=") {
				return false
			}
		case "<=":
			if !compareValues(value, clause.value, "<=") {
				return false
			}
		}
	}
	return true
}

// compareValues performs simple comparison
func compareValues(a, b interface{}, op string) bool {
	// Simple string comparison for mock
	aStr, aOk := a.(string)
	bStr, bOk := b.(string)
	if aOk && bOk {
		if op == ">=" {
			return aStr >= bStr
		}
		if op == "<=" {
			return aStr <= bStr
		}
	}
	return true
}

// MockDocumentRef is a mock implementation of DocumentRef
type MockDocumentRef struct {
	repo           *MockRepository
	collectionName string
	docID          string
}

// Get retrieves a document
func (m *MockDocumentRef) Get(ctx context.Context) (repository.DocumentSnapshot, error) {
	data, exists := m.repo.GetDocument(m.collectionName, m.docID)
	if !exists {
		return nil, &firestore.Status{Code: 5} // NotFound
	}

	return &MockDocumentSnapshot{
		data:   data,
		exists: true,
	}, nil
}

// Set sets a document
func (m *MockDocumentRef) Set(ctx context.Context, data interface{}, opts ...firestore.SetOption) error {
	dataMap, ok := data.(map[string]interface{})
	if !ok {
		return nil
	}

	m.repo.AddDocument(m.collectionName, m.docID, dataMap)
	return nil
}

// MockDocumentSnapshot is a mock implementation of DocumentSnapshot
type MockDocumentSnapshot struct {
	data   map[string]interface{}
	exists bool
}

// Data returns the document data
func (m *MockDocumentSnapshot) Data() map[string]interface{} {
	return m.data
}

// Exists returns whether the document exists
func (m *MockDocumentSnapshot) Exists() bool {
	return m.exists
}

// MockDocumentIterator is a mock implementation of DocumentIterator
type MockDocumentIterator struct {
	docs  []map[string]interface{}
	index int
}

// Next returns the next document
func (m *MockDocumentIterator) Next() (repository.DocumentSnapshot, error) {
	if m.index >= len(m.docs) {
		return nil, iterator.Done
	}

	doc := m.docs[m.index]
	m.index++

	return &MockDocumentSnapshot{
		data:   doc,
		exists: true,
	}, nil
}

// Stop stops the iterator
func (m *MockDocumentIterator) Stop() {
	m.index = len(m.docs)
}

// MockWriteBatch is a mock implementation of WriteBatch
type MockWriteBatch struct {
	repo       *MockRepository
	operations []batchOperation
}

type batchOperation struct {
	collection string
	docID      string
	data       map[string]interface{}
}

// Set adds a set operation to the batch
func (m *MockWriteBatch) Set(ref repository.DocumentRef, data interface{}, opts ...firestore.SetOption) repository.WriteBatch {
	docRef, ok := ref.(*MockDocumentRef)
	if !ok {
		return m
	}

	dataMap, ok := data.(map[string]interface{})
	if !ok {
		return m
	}

	m.operations = append(m.operations, batchOperation{
		collection: docRef.collectionName,
		docID:      docRef.docID,
		data:       dataMap,
	})

	return m
}

// Commit commits the batch
func (m *MockWriteBatch) Commit(ctx context.Context) ([]*firestore.WriteResult, error) {
	for _, op := range m.operations {
		m.repo.AddDocument(op.collection, op.docID, op.data)
	}

	results := make([]*firestore.WriteResult, len(m.operations))
	return results, nil
}
