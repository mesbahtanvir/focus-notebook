package services

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stripe/stripe-go/v76"
)

func TestNewStripeBillingService(t *testing.T) {
	// Test that service can be created with nil dependencies
	// (nil checks should be handled by the caller)
	service := NewStripeBillingService(nil, nil, nil)
	assert.NotNil(t, service)
}

func TestMapSubscriptionToStatus_Active(t *testing.T) {
	subscription := &stripe.Subscription{
		ID:                 "sub_123",
		Status:             stripe.SubscriptionStatusActive,
		CurrentPeriodStart: time.Now().Unix(),
		CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour).Unix(),
		CancelAtPeriodEnd:  false,
		Customer: &stripe.Customer{
			ID: "cus_123",
		},
		Items: &stripe.SubscriptionItemList{
			Data: []*stripe.SubscriptionItem{
				{
					Price: &stripe.Price{
						ID: "price_pro",
					},
				},
			},
		},
	}

	status := mapSubscriptionToStatus(subscription)

	assert.Equal(t, "pro", status["tier"])
	assert.Equal(t, "active", status["status"])
	assert.Equal(t, "cus_123", status["stripeCustomerId"])
	assert.Equal(t, "sub_123", status["stripeSubscriptionId"])
	assert.Equal(t, "price_pro", status["priceId"])
	assert.False(t, status["cancelAtPeriodEnd"].(bool))

	entitlements := status["entitlements"].(map[string]interface{})
	assert.True(t, entitlements["aiProcessing"].(bool))
}

func TestMapSubscriptionToStatus_Trialing(t *testing.T) {
	trialEnd := time.Now().Add(14 * 24 * time.Hour).Unix()
	subscription := &stripe.Subscription{
		ID:                 "sub_trial",
		Status:             stripe.SubscriptionStatusTrialing,
		CurrentPeriodStart: time.Now().Unix(),
		CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour).Unix(),
		TrialEnd:           trialEnd,
		Customer: &stripe.Customer{
			ID: "cus_456",
		},
		Items: &stripe.SubscriptionItemList{
			Data: []*stripe.SubscriptionItem{
				{
					Price: &stripe.Price{
						ID: "price_pro",
					},
				},
			},
		},
	}

	status := mapSubscriptionToStatus(subscription)

	assert.Equal(t, "pro", status["tier"])
	assert.Equal(t, "trialing", status["status"])
	assert.NotNil(t, status["trialEndsAt"])

	entitlements := status["entitlements"].(map[string]interface{})
	assert.True(t, entitlements["aiProcessing"].(bool))
}

func TestMapSubscriptionToStatus_PastDue(t *testing.T) {
	subscription := &stripe.Subscription{
		ID:                 "sub_pastdue",
		Status:             stripe.SubscriptionStatusPastDue,
		CurrentPeriodStart: time.Now().Unix(),
		CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour).Unix(),
		Customer: &stripe.Customer{
			ID: "cus_789",
		},
		Items: &stripe.SubscriptionItemList{
			Data: []*stripe.SubscriptionItem{
				{
					Price: &stripe.Price{
						ID: "price_pro",
					},
				},
			},
		},
	}

	status := mapSubscriptionToStatus(subscription)

	assert.Equal(t, "pro", status["tier"])
	assert.Equal(t, "past_due", status["status"])

	// Still has AI access (past_due is grace period)
	entitlements := status["entitlements"].(map[string]interface{})
	assert.True(t, entitlements["aiProcessing"].(bool))
}

func TestMapSubscriptionToStatus_Canceled(t *testing.T) {
	subscription := &stripe.Subscription{
		ID:                 "sub_canceled",
		Status:             stripe.SubscriptionStatusCanceled,
		CurrentPeriodStart: time.Now().Unix(),
		CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour).Unix(),
		Customer: &stripe.Customer{
			ID: "cus_000",
		},
		Items: &stripe.SubscriptionItemList{
			Data: []*stripe.SubscriptionItem{
				{
					Price: &stripe.Price{
						ID: "price_pro",
					},
				},
			},
		},
	}

	status := mapSubscriptionToStatus(subscription)

	// Canceled subscriptions don't give pro tier
	assert.Equal(t, "free", status["tier"])
	assert.Equal(t, "canceled", status["status"])

	// No AI access for canceled
	entitlements := status["entitlements"].(map[string]interface{})
	assert.False(t, entitlements["aiProcessing"].(bool))
}

func TestMapSubscriptionToStatus_Incomplete(t *testing.T) {
	subscription := &stripe.Subscription{
		ID:                 "sub_incomplete",
		Status:             stripe.SubscriptionStatusIncomplete,
		CurrentPeriodStart: time.Now().Unix(),
		CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour).Unix(),
		Customer: &stripe.Customer{
			ID: "cus_incomplete",
		},
		Items: &stripe.SubscriptionItemList{
			Data: []*stripe.SubscriptionItem{},
		},
	}

	status := mapSubscriptionToStatus(subscription)

	assert.Equal(t, "free", status["tier"])
	assert.Equal(t, "incomplete", status["status"])

	entitlements := status["entitlements"].(map[string]interface{})
	assert.False(t, entitlements["aiProcessing"].(bool))
}

func TestMapSubscriptionToStatus_CancelScheduled(t *testing.T) {
	cancelAt := time.Now().Add(7 * 24 * time.Hour).Unix()
	subscription := &stripe.Subscription{
		ID:                 "sub_cancel_scheduled",
		Status:             stripe.SubscriptionStatusActive,
		CurrentPeriodStart: time.Now().Unix(),
		CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour).Unix(),
		CancelAtPeriodEnd:  true,
		CancelAt:           cancelAt,
		Customer: &stripe.Customer{
			ID: "cus_cancel",
		},
		Items: &stripe.SubscriptionItemList{
			Data: []*stripe.SubscriptionItem{
				{
					Price: &stripe.Price{
						ID: "price_pro",
					},
				},
			},
		},
	}

	status := mapSubscriptionToStatus(subscription)

	assert.Equal(t, "pro", status["tier"])
	assert.Equal(t, "active", status["status"])
	assert.True(t, status["cancelAtPeriodEnd"].(bool))
	assert.NotNil(t, status["cancelAt"])

	// Still has AI access until cancellation
	entitlements := status["entitlements"].(map[string]interface{})
	assert.True(t, entitlements["aiProcessing"].(bool))
}

func TestMapSubscriptionToStatus_EmptyItems(t *testing.T) {
	subscription := &stripe.Subscription{
		ID:                 "sub_no_items",
		Status:             stripe.SubscriptionStatusActive,
		CurrentPeriodStart: time.Now().Unix(),
		CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour).Unix(),
		Customer: &stripe.Customer{
			ID: "cus_no_items",
		},
		Items: &stripe.SubscriptionItemList{
			Data: []*stripe.SubscriptionItem{},
		},
	}

	status := mapSubscriptionToStatus(subscription)

	// Should handle empty items gracefully
	assert.Equal(t, "", status["priceId"])
}

func TestGetCustomerID_WithCustomer(t *testing.T) {
	subscription := &stripe.Subscription{
		Customer: &stripe.Customer{
			ID: "cus_test123",
		},
	}

	customerID := getCustomerID(subscription)
	assert.Equal(t, "cus_test123", customerID)
}

func TestGetCustomerID_NilCustomer(t *testing.T) {
	subscription := &stripe.Subscription{
		Customer: nil,
	}

	customerID := getCustomerID(subscription)
	assert.Equal(t, "", customerID)
}

func TestGetSubscriptionIDFromSession_WithSubscription(t *testing.T) {
	session := &stripe.CheckoutSession{
		Subscription: &stripe.Subscription{
			ID: "sub_session123",
		},
	}

	subscriptionID := getSubscriptionIDFromSession(session)
	assert.Equal(t, "sub_session123", subscriptionID)
}

func TestGetSubscriptionIDFromSession_NilSubscription(t *testing.T) {
	session := &stripe.CheckoutSession{
		Subscription: nil,
	}

	subscriptionID := getSubscriptionIDFromSession(session)
	assert.Equal(t, "", subscriptionID)
}

func TestMapSubscriptionToStatus_AllStatuses(t *testing.T) {
	tests := []struct {
		name     string
		status   stripe.SubscriptionStatus
		wantTier string
		wantAI   bool
	}{
		{"active", stripe.SubscriptionStatusActive, "pro", true},
		{"trialing", stripe.SubscriptionStatusTrialing, "pro", true},
		{"past_due", stripe.SubscriptionStatusPastDue, "pro", true},
		{"canceled", stripe.SubscriptionStatusCanceled, "free", false},
		{"incomplete", stripe.SubscriptionStatusIncomplete, "free", false},
		{"incomplete_expired", stripe.SubscriptionStatusIncompleteExpired, "free", false},
		{"unpaid", stripe.SubscriptionStatusUnpaid, "free", false},
		{"paused", stripe.SubscriptionStatusPaused, "free", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			subscription := &stripe.Subscription{
				ID:                 "sub_test",
				Status:             tt.status,
				CurrentPeriodStart: time.Now().Unix(),
				CurrentPeriodEnd:   time.Now().Add(30 * 24 * time.Hour).Unix(),
				Customer: &stripe.Customer{
					ID: "cus_test",
				},
				Items: &stripe.SubscriptionItemList{
					Data: []*stripe.SubscriptionItem{
						{
							Price: &stripe.Price{
								ID: "price_test",
							},
						},
					},
				},
			}

			status := mapSubscriptionToStatus(subscription)

			assert.Equal(t, tt.wantTier, status["tier"])
			entitlements := status["entitlements"].(map[string]interface{})
			assert.Equal(t, tt.wantAI, entitlements["aiProcessing"].(bool))
		})
	}
}
