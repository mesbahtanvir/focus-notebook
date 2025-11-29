package services

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/models"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
)

const (
	AnonymousSessionCollection = "anonymousSessions"
	SubscriptionStatusDoc      = "current"
)

// SubscriptionService handles subscription and AI entitlement checks
type SubscriptionService struct {
	repo        *repository.FirestoreRepository
	logger      *zap.Logger
	overrideKey string
	cache       map[string]*cachedSubscription
}

type cachedSubscription struct {
	status    *models.SubscriptionStatus
	expiresAt time.Time
}

// NewSubscriptionService creates a new subscription service
func NewSubscriptionService(repo *repository.FirestoreRepository, logger *zap.Logger, overrideKey string) *SubscriptionService {
	return &SubscriptionService{
		repo:        repo,
		logger:      logger,
		overrideKey: overrideKey,
		cache:       make(map[string]*cachedSubscription),
	}
}

// IsAIAllowed checks if the user has AI access
// Returns (allowed bool, entitlement info, error)
func (s *SubscriptionService) IsAIAllowed(ctx context.Context, uid string, isAnonymous bool) (bool, string, error) {
	// Anonymous users need special check
	if isAnonymous {
		return s.checkAnonymousAIAccess(ctx, uid)
	}

	// Regular users: check subscription
	return s.checkSubscriptionAIAccess(ctx, uid)
}

// checkAnonymousAIAccess checks if anonymous user has AI access
func (s *SubscriptionService) checkAnonymousAIAccess(ctx context.Context, uid string) (bool, string, error) {
	sessionPath := fmt.Sprintf("%s/%s", AnonymousSessionCollection, uid)
	doc, err := s.repo.GetDocument(ctx, sessionPath)
	if err != nil {
		return false, "Anonymous session not found", nil
	}

	var session models.AnonymousSession
	if err := doc.DataTo(&session); err != nil {
		return false, "Failed to read session", err
	}

	// Check allowAi flag
	if !session.AllowAi {
		// Check override key
		if s.overrideKey != "" && session.CiOverrideKey != nil && *session.CiOverrideKey == s.overrideKey {
			s.logger.Debug("Anonymous AI access granted via override key", zap.String("uid", uid))
			return true, "Override key matched", nil
		}
		return false, "AI not enabled for anonymous session", nil
	}

	// Check cleanup pending
	if session.CleanupPending {
		return false, "Session cleanup pending", nil
	}

	// Check expiry
	if session.ExpiresAt.Before(time.Now()) {
		// Mark as expired
		_, err := s.repo.SetDocument(ctx, sessionPath, map[string]interface{}{
			"status":         "expired",
			"cleanupPending": true,
			"expiredAt":      time.Now(),
		})
		if err != nil {
			s.logger.Error("Failed to mark session as expired", zap.Error(err))
		}
		return false, "Session expired", nil
	}

	return true, "Anonymous session active", nil
}

// checkSubscriptionAIAccess checks if regular user has AI access
func (s *SubscriptionService) checkSubscriptionAIAccess(ctx context.Context, uid string) (bool, string, error) {
	// Check cache first
	if cached, ok := s.cache[uid]; ok {
		if time.Now().Before(cached.expiresAt) {
			return s.evaluateSubscription(cached.status)
		}
	}

	// Fetch from Firestore
	statusPath := fmt.Sprintf("users/%s/subscriptionStatus/%s", uid, SubscriptionStatusDoc)
	doc, err := s.repo.GetDocument(ctx, statusPath)
	if err != nil {
		// No subscription found - treat as free tier
		s.logger.Debug("No subscription found", zap.String("uid", uid))
		return false, "Pro subscription required", nil
	}

	var status models.SubscriptionStatus
	if err := doc.DataTo(&status); err != nil {
		return false, "Failed to read subscription", err
	}

	// Cache for 1 minute
	s.cache[uid] = &cachedSubscription{
		status:    &status,
		expiresAt: time.Now().Add(1 * time.Minute),
	}

	return s.evaluateSubscription(&status)
}

// evaluateSubscription evaluates subscription status for AI access
func (s *SubscriptionService) evaluateSubscription(status *models.SubscriptionStatus) (bool, string, error) {
	// Check tier
	if status.Tier != "pro" {
		return false, "Pro subscription required", nil
	}

	// Check entitlements
	if status.Entitlements == nil {
		return false, "No entitlements found", nil
	}

	if !status.Entitlements.AiProcessing {
		return false, "AI processing not enabled", nil
	}

	// Check credits if applicable
	if status.Entitlements.AiCreditsRemaining != nil {
		if *status.Entitlements.AiCreditsRemaining <= 0 {
			return false, "AI credits exhausted", nil
		}
	}

	return true, "Pro subscription active", nil
}

// IncrementUsage increments AI usage counters
func (s *SubscriptionService) IncrementUsage(ctx context.Context, uid string, tokensUsed int) error {
	// Update usage stats
	usagePath := fmt.Sprintf("users/%s/usageStats/ai", uid)

	updates := map[string]interface{}{
		"totalRequests":      firestore.Increment(1),
		"totalTokens":        firestore.Increment(tokensUsed),
		"lastRequestAt":      time.Now(),
		"monthlyRequests":    firestore.Increment(1),
		"monthlyTokens":      firestore.Increment(tokensUsed),
	}

	err := s.repo.SetDocument(ctx, usagePath, updates)
	if err != nil {
		s.logger.Error("Failed to increment usage", zap.Error(err), zap.String("uid", uid))
		return err
	}

	return nil
}

// ClearCache clears the subscription cache
func (s *SubscriptionService) ClearCache(uid string) {
	delete(s.cache, uid)
}
