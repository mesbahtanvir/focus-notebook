package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestBaseModel_Creation(t *testing.T) {
	now := time.Now()
	model := BaseModel{
		ID:        "test-id",
		CreatedAt: now,
		UpdatedAt: now,
		UpdatedBy: "user-123",
		Version:   1,
	}

	assert.Equal(t, "test-id", model.ID)
	assert.Equal(t, now, model.CreatedAt)
	assert.Equal(t, now, model.UpdatedAt)
	assert.Equal(t, "user-123", model.UpdatedBy)
	assert.Equal(t, 1, model.Version)
}

func TestBaseModel_EmptyValues(t *testing.T) {
	model := BaseModel{}

	assert.Empty(t, model.ID)
	assert.True(t, model.CreatedAt.IsZero())
	assert.True(t, model.UpdatedAt.IsZero())
	assert.Empty(t, model.UpdatedBy)
	assert.Equal(t, 0, model.Version)
}

func TestAnonymousSession_Active(t *testing.T) {
	now := time.Now()
	future := now.Add(24 * time.Hour)

	session := AnonymousSession{
		UID:            "anon-123",
		CreatedAt:      now,
		ExpiresAt:      future,
		CleanupPending: false,
		AllowAi:        true,
		Status:         "active",
		UpdatedAt:      now,
	}

	assert.Equal(t, "anon-123", session.UID)
	assert.Equal(t, "active", session.Status)
	assert.True(t, session.AllowAi)
	assert.False(t, session.CleanupPending)
	assert.Nil(t, session.ExpiredAt)
	assert.Nil(t, session.CiOverrideKey)
}

func TestAnonymousSession_Expired(t *testing.T) {
	now := time.Now()
	expiredAt := now

	session := AnonymousSession{
		UID:            "anon-456",
		CreatedAt:      now,
		ExpiresAt:      now,
		ExpiredAt:      &expiredAt,
		CleanupPending: true,
		AllowAi:        false,
		Status:         "expired",
		UpdatedAt:      now,
	}

	assert.Equal(t, "anon-456", session.UID)
	assert.Equal(t, "expired", session.Status)
	assert.False(t, session.AllowAi)
	assert.True(t, session.CleanupPending)
	assert.NotNil(t, session.ExpiredAt)
}

func TestAnonymousSession_WithOverrideKey(t *testing.T) {
	key := "ci-override-key-123"
	session := AnonymousSession{
		UID:            "anon-789",
		CiOverrideKey:  &key,
		Status:         "active",
		CreatedAt:      time.Now(),
		ExpiresAt:      time.Now().Add(2 * time.Hour),
		UpdatedAt:      time.Now(),
	}

	assert.NotNil(t, session.CiOverrideKey)
	assert.Equal(t, key, *session.CiOverrideKey)
}

func TestSubscriptionStatus_FreeTier(t *testing.T) {
	sub := SubscriptionStatus{
		ID:       "sub-123",
		Tier:     "free",
		Status:   "active",
		UpdatedAt: time.Now(),
	}

	assert.Equal(t, "free", sub.Tier)
	assert.Equal(t, "active", sub.Status)
	assert.Nil(t, sub.StripeCustomerID)
	assert.Nil(t, sub.StripeSubscriptionID)
}

func TestSubscriptionStatus_ProTier(t *testing.T) {
	now := time.Now()
	periodEnd := now.AddDate(0, 1, 0)
	customerID := "cus_123abc"
	subscriptionID := "sub_456def"
	priceID := "price_789ghi"

	sub := SubscriptionStatus{
		ID:                   "sub-pro-123",
		Tier:                 "pro",
		Status:               "active",
		StripeCustomerID:     &customerID,
		StripeSubscriptionID: &subscriptionID,
		PriceID:              &priceID,
		CurrentPeriodEnd:     &periodEnd,
		UpdatedAt:            now,
	}

	assert.Equal(t, "pro", sub.Tier)
	assert.Equal(t, "active", sub.Status)
	assert.NotNil(t, sub.StripeCustomerID)
	assert.Equal(t, customerID, *sub.StripeCustomerID)
	assert.NotNil(t, sub.CurrentPeriodEnd)
}

func TestSubscriptionStatus_Trialing(t *testing.T) {
	now := time.Now()
	trialEnd := now.AddDate(0, 0, 14)

	sub := SubscriptionStatus{
		ID:          "sub-trial-123",
		Tier:        "pro",
		Status:      "trialing",
		TrialEndsAt: &trialEnd,
		UpdatedAt:   now,
	}

	assert.Equal(t, "trialing", sub.Status)
	assert.NotNil(t, sub.TrialEndsAt)
	assert.Equal(t, trialEnd, *sub.TrialEndsAt)
}

func TestSubscriptionStatus_CancelAtPeriodEnd(t *testing.T) {
	now := time.Now()
	cancel := true

	sub := SubscriptionStatus{
		ID:               "sub-cancel-123",
		Tier:             "pro",
		Status:           "active",
		CancelAtPeriodEnd: &cancel,
		UpdatedAt:        now,
	}

	assert.NotNil(t, sub.CancelAtPeriodEnd)
	assert.True(t, *sub.CancelAtPeriodEnd)
}

func TestSubscriptionEntitlements_AiEnabled(t *testing.T) {
	credits := 1000
	resetsAt := time.Now().AddDate(0, 1, 0)

	ent := SubscriptionEntitlements{
		AiProcessing:       true,
		AiCreditsRemaining: &credits,
		AiCreditsResetsAt:  &resetsAt,
	}

	assert.True(t, ent.AiProcessing)
	assert.NotNil(t, ent.AiCreditsRemaining)
	assert.Equal(t, 1000, *ent.AiCreditsRemaining)
	assert.NotNil(t, ent.AiCreditsResetsAt)
}

func TestSubscriptionEntitlements_AiDisabled(t *testing.T) {
	ent := SubscriptionEntitlements{
		AiProcessing: false,
	}

	assert.False(t, ent.AiProcessing)
	assert.Nil(t, ent.AiCreditsRemaining)
	assert.Nil(t, ent.AiCreditsResetsAt)
}

func TestUserContext_Empty(t *testing.T) {
	ctx := UserContext{
		Goals:         []map[string]interface{}{},
		Projects:      []map[string]interface{}{},
		Tasks:         []map[string]interface{}{},
		Moods:         []map[string]interface{}{},
		Relationships: []map[string]interface{}{},
		Notes:         []map[string]interface{}{},
		Errands:       []map[string]interface{}{},
	}

	assert.Equal(t, 0, len(ctx.Goals))
	assert.Equal(t, 0, len(ctx.Tasks))
	assert.NotNil(t, ctx.Goals)
}

func TestUserContext_WithData(t *testing.T) {
	ctx := UserContext{
		Goals: []map[string]interface{}{
			{"id": "goal-1", "title": "Learn Go"},
		},
		Tasks: []map[string]interface{}{
			{"id": "task-1", "title": "Write tests"},
		},
	}

	assert.Equal(t, 1, len(ctx.Goals))
	assert.Equal(t, 1, len(ctx.Tasks))
	assert.Equal(t, "goal-1", ctx.Goals[0]["id"])
}

func TestErrorResponse_WithDetails(t *testing.T) {
	resp := ErrorResponse{
		Error: "Validation failed",
		Details: map[string]interface{}{
			"field": "email",
			"reason": "invalid format",
		},
		Code: "VALIDATION_ERROR",
	}

	assert.Equal(t, "Validation failed", resp.Error)
	assert.Equal(t, "VALIDATION_ERROR", resp.Code)
	assert.Equal(t, "email", resp.Details["field"])
}

func TestErrorResponse_MinimalError(t *testing.T) {
	resp := ErrorResponse{
		Error: "Not found",
	}

	assert.Equal(t, "Not found", resp.Error)
	assert.Empty(t, resp.Code)
	assert.Nil(t, resp.Details)
}

func TestSuccessResponse_WithData(t *testing.T) {
	data := map[string]interface{}{
		"id":   "123",
		"name": "Test",
	}

	resp := SuccessResponse{
		Success: true,
		Data:    data,
		Message: "Operation completed",
	}

	assert.True(t, resp.Success)
	assert.Equal(t, "Operation completed", resp.Message)
	assert.Equal(t, data, resp.Data)
}

func TestSuccessResponse_WithoutData(t *testing.T) {
	resp := SuccessResponse{
		Success: true,
		Message: "Deleted successfully",
	}

	assert.True(t, resp.Success)
	assert.Nil(t, resp.Data)
	assert.Equal(t, "Deleted successfully", resp.Message)
}

func TestSuccessResponse_ListData(t *testing.T) {
	data := []map[string]interface{}{
		{"id": "1", "name": "Item 1"},
		{"id": "2", "name": "Item 2"},
	}

	resp := SuccessResponse{
		Success: true,
		Data:    data,
	}

	assert.True(t, resp.Success)
	assert.Equal(t, data, resp.Data)
}
