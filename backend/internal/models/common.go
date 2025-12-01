package models

import (
	"time"
)

// BaseModel contains common fields for all documents
type BaseModel struct {
	ID        string    `firestore:"id" json:"id"`
	CreatedAt time.Time `firestore:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `firestore:"updatedAt" json:"updatedAt"`
	UpdatedBy string    `firestore:"updatedBy" json:"updatedBy"`
	Version   int       `firestore:"version" json:"version"`
}

// AnonymousSession represents an anonymous user session
type AnonymousSession struct {
	UID            string     `firestore:"uid" json:"uid"`
	CreatedAt      time.Time  `firestore:"createdAt" json:"createdAt"`
	ExpiresAt      time.Time  `firestore:"expiresAt" json:"expiresAt"`
	ExpiredAt      *time.Time `firestore:"expiredAt,omitempty" json:"expiredAt,omitempty"`
	CleanupPending bool       `firestore:"cleanupPending" json:"cleanupPending"`
	AllowAi        bool       `firestore:"allowAi" json:"allowAi"`
	CiOverrideKey  *string    `firestore:"ciOverrideKey,omitempty" json:"ciOverrideKey,omitempty"`
	Status         string     `firestore:"status" json:"status"` // active, expired, signed-out
	UpdatedAt      time.Time  `firestore:"updatedAt" json:"updatedAt"`
}

// SubscriptionStatus represents a user's subscription status
type SubscriptionStatus struct {
	ID                   string                    `firestore:"id" json:"id"`
	Tier                 string                    `firestore:"tier" json:"tier"`     // free, pro
	Status               string                    `firestore:"status" json:"status"` // active, trialing, past_due, etc.
	StripeCustomerID     *string                   `firestore:"stripeCustomerId,omitempty" json:"stripeCustomerId,omitempty"`
	StripeSubscriptionID *string                   `firestore:"stripeSubscriptionId,omitempty" json:"stripeSubscriptionId,omitempty"`
	PriceID              *string                   `firestore:"priceId,omitempty" json:"priceId,omitempty"`
	CurrentPeriodEnd     *time.Time                `firestore:"currentPeriodEnd,omitempty" json:"currentPeriodEnd,omitempty"`
	CancelAtPeriodEnd    *bool                     `firestore:"cancelAtPeriodEnd,omitempty" json:"cancelAtPeriodEnd,omitempty"`
	TrialEndsAt          *time.Time                `firestore:"trialEndsAt,omitempty" json:"trialEndsAt,omitempty"`
	Entitlements         *SubscriptionEntitlements `firestore:"entitlements,omitempty" json:"entitlements,omitempty"`
	UpdatedAt            time.Time                 `firestore:"updatedAt" json:"updatedAt"`
}

// SubscriptionEntitlements defines what features are available
type SubscriptionEntitlements struct {
	AiProcessing       bool       `firestore:"aiProcessing" json:"aiProcessing"`
	AiCreditsRemaining *int       `firestore:"aiCreditsRemaining,omitempty" json:"aiCreditsRemaining,omitempty"`
	AiCreditsResetsAt  *time.Time `firestore:"aiCreditsResetsAt,omitempty" json:"aiCreditsResetsAt,omitempty"`
}

// UserContext represents the context gathered for AI processing
type UserContext struct {
	Goals         []map[string]interface{} `json:"goals"`
	Projects      []map[string]interface{} `json:"projects"`
	Tasks         []map[string]interface{} `json:"tasks"`
	Moods         []map[string]interface{} `json:"moods"`
	Relationships []map[string]interface{} `json:"relationships"`
	Notes         []map[string]interface{} `json:"notes"`
	Errands       []map[string]interface{} `json:"errands"`
}

// ErrorResponse represents an API error response
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Details map[string]interface{} `json:"details,omitempty"`
	Code    string                 `json:"code,omitempty"`
}

// SuccessResponse represents a successful API response
type SuccessResponse struct {
	Success bool                   `json:"success"`
	Data    map[string]interface{} `json:"data,omitempty"`
	Message string                 `json:"message,omitempty"`
}
