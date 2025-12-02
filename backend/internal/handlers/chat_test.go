package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewChatHandler(t *testing.T) {
	chatSvc := &services.ChatService{}
	logger := zap.NewNop()

	handler := NewChatHandler(chatSvc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, chatSvc, handler.chatService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewChatHandler_WithNilService(t *testing.T) {
	logger := zap.NewNop()

	handler := NewChatHandler(nil, logger)

	require.NotNil(t, handler)
	assert.Nil(t, handler.chatService)
	assert.Equal(t, logger, handler.logger)
}

func TestNewChatHandler_WithNilLogger(t *testing.T) {
	chatSvc := &services.ChatService{}

	handler := NewChatHandler(chatSvc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, chatSvc, handler.chatService)
	assert.Nil(t, handler.logger)
}

func TestNewChatHandler_BothNil(t *testing.T) {
	handler := NewChatHandler(nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.chatService)
	assert.Nil(t, handler.logger)
}

func TestNewChatHandler_MultipleInstances(t *testing.T) {
	chatSvc := &services.ChatService{}
	logger := zap.NewNop()

	handler1 := NewChatHandler(chatSvc, logger)
	handler2 := NewChatHandler(chatSvc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.chatService, handler2.chatService)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewChatHandler_FieldAssignment(t *testing.T) {
	chatSvc := &services.ChatService{}
	logger := zap.NewNop()

	handler := NewChatHandler(chatSvc, logger)

	assert.NotNil(t, handler.chatService)
	assert.NotNil(t, handler.logger)
	assert.Equal(t, chatSvc, handler.chatService)
	assert.Equal(t, logger, handler.logger)
}
