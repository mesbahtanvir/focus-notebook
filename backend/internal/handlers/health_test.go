package handlers

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewHealthHandler(t *testing.T) {
	handler := NewHealthHandler(nil)

	assert.NotNil(t, handler)
	assert.Nil(t, handler.firebase)
	assert.NotZero(t, handler.startTime)
}

func TestHealthHandler_StartTimeSet(t *testing.T) {
	before := time.Now()
	handler := NewHealthHandler(nil)
	after := time.Now()

	assert.True(t, handler.startTime.After(before.Add(-1*time.Millisecond)))
	assert.True(t, handler.startTime.Before(after.Add(1*time.Millisecond)))
}

func TestHealthHandler_FirebaseClientStored(t *testing.T) {
	handler := NewHealthHandler(nil)

	assert.Nil(t, handler.firebase)
}

func TestHealthHandler_NotNilAfterCreation(t *testing.T) {
	handler := NewHealthHandler(nil)
	assert.NotNil(t, handler)
}

func TestHealthHandler_StructFields(t *testing.T) {
	handler := NewHealthHandler(nil)

	assert.NotZero(t, handler.startTime)
}

func TestHealthHandler_MultipleHandlerInstances(t *testing.T) {
	handler1 := NewHealthHandler(nil)
	handler2 := NewHealthHandler(nil)

	assert.NotNil(t, handler1)
	assert.NotNil(t, handler2)
	assert.NotEqual(t, handler1.startTime, handler2.startTime)
}

func TestHealthHandler_StartTimeProgresses(t *testing.T) {
	handler1 := NewHealthHandler(nil)
	time.Sleep(10 * time.Millisecond)
	handler2 := NewHealthHandler(nil)

	assert.True(t, handler2.startTime.After(handler1.startTime))
}

func TestHealthHandler_StartTimeNotZero(t *testing.T) {
	handler := NewHealthHandler(nil)
	zeroTime := time.Time{}

	assert.NotEqual(t, handler.startTime, zeroTime)
}

func TestHealthHandler_FirebaseCanBeNil(t *testing.T) {
	handler := NewHealthHandler(nil)

	assert.Nil(t, handler.firebase)
}
