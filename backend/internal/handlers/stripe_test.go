package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

func TestNewStripeHandler(t *testing.T) {
	stripeClient := &clients.StripeClient{}
	stripeSvc := &services.StripeBillingService{}
	logger := zap.NewNop()

	handler := NewStripeHandler(stripeClient, stripeSvc, logger)

	require.NotNil(t, handler)
	assert.Equal(t, stripeClient, handler.stripeClient)
	assert.Equal(t, stripeSvc, handler.stripeBillingSvc)
	assert.Equal(t, logger, handler.logger)
}

func TestNewStripeHandler_WithNilService(t *testing.T) {
	stripeClient := &clients.StripeClient{}
	logger := zap.NewNop()

	handler := NewStripeHandler(stripeClient, nil, logger)

	require.NotNil(t, handler)
	assert.Equal(t, stripeClient, handler.stripeClient)
	assert.Nil(t, handler.stripeBillingSvc)
	assert.Equal(t, logger, handler.logger)
}

func TestNewStripeHandler_WithNilLogger(t *testing.T) {
	stripeClient := &clients.StripeClient{}
	stripeSvc := &services.StripeBillingService{}

	handler := NewStripeHandler(stripeClient, stripeSvc, nil)

	require.NotNil(t, handler)
	assert.Equal(t, stripeClient, handler.stripeClient)
	assert.Equal(t, stripeSvc, handler.stripeBillingSvc)
	assert.Nil(t, handler.logger)
}

func TestNewStripeHandler_BothNil(t *testing.T) {
	handler := NewStripeHandler(nil, nil, nil)

	require.NotNil(t, handler)
	assert.Nil(t, handler.stripeClient)
	assert.Nil(t, handler.stripeBillingSvc)
	assert.Nil(t, handler.logger)
}

func TestNewStripeHandler_MultipleInstances(t *testing.T) {
	stripeClient := &clients.StripeClient{}
	stripeSvc := &services.StripeBillingService{}
	logger := zap.NewNop()

	handler1 := NewStripeHandler(stripeClient, stripeSvc, logger)
	handler2 := NewStripeHandler(stripeClient, stripeSvc, logger)

	require.NotNil(t, handler1)
	require.NotNil(t, handler2)
	assert.Equal(t, handler1.stripeClient, handler2.stripeClient)
	assert.Equal(t, handler1.stripeBillingSvc, handler2.stripeBillingSvc)
	assert.Equal(t, handler1.logger, handler2.logger)
}

func TestNewStripeHandler_FieldAssignment(t *testing.T) {
	stripeClient := &clients.StripeClient{}
	stripeSvc := &services.StripeBillingService{}
	logger := zap.NewNop()

	handler := NewStripeHandler(stripeClient, stripeSvc, logger)

	assert.NotNil(t, handler.stripeClient)
	assert.NotNil(t, handler.stripeBillingSvc)
	assert.NotNil(t, handler.logger)
	assert.Equal(t, stripeClient, handler.stripeClient)
	assert.Equal(t, stripeSvc, handler.stripeBillingSvc)
	assert.Equal(t, logger, handler.logger)
}
