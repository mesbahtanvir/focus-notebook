package services

import (
	"context"
	"fmt"
	"time"

	"github.com/stripe/stripe-go/v76"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/models"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
)

const (
	StripeCustomersCollection = "stripeCustomers"
	SubscriptionStatusDoc     = "current"
)

// StripeBillingService handles Stripe billing operations
type StripeBillingService struct {
	stripeClient *clients.StripeClient
	repo         *repository.FirestoreRepository
	logger       *zap.Logger
}

// NewStripeBillingService creates a new Stripe billing service
func NewStripeBillingService(
	stripeClient *clients.StripeClient,
	repo *repository.FirestoreRepository,
	logger *zap.Logger,
) *StripeBillingService {
	return &StripeBillingService{
		stripeClient: stripeClient,
		repo:         repo,
		logger:       logger,
	}
}

// CreateCheckoutSession creates a Stripe checkout session for a user
func (s *StripeBillingService) CreateCheckoutSession(ctx context.Context, uid string, userEmail string, successURL, cancelURL string) (string, error) {
	s.logger.Info("Creating checkout session",
		zap.String("uid", uid),
		zap.String("email", userEmail),
	)

	// Create Stripe checkout session
	session, err := s.stripeClient.CreateCheckoutSession(userEmail, successURL, cancelURL)
	if err != nil {
		return "", fmt.Errorf("failed to create checkout session: %w", err)
	}

	// Store session metadata
	// This helps track checkout sessions for debugging
	sessionData := map[string]interface{}{
		"uid":       uid,
		"sessionId": session.ID,
		"email":     userEmail,
		"status":    "pending",
		"createdAt": time.Now(),
		"expiresAt": time.Unix(session.ExpiresAt, 0),
	}

	sessionPath := fmt.Sprintf("users/%s/checkoutSessions/%s", uid, session.ID)
	err = s.repo.CreateDocument(ctx, sessionPath, sessionData)
	if err != nil {
		s.logger.Warn("Failed to store checkout session", zap.Error(err))
		// Don't fail the request if we can't store metadata
	}

	return session.URL, nil
}

// CreatePortalSession creates a Stripe billing portal session
func (s *StripeBillingService) CreatePortalSession(ctx context.Context, uid string, returnURL string) (string, error) {
	s.logger.Info("Creating portal session", zap.String("uid", uid))

	// Get customer ID from Firestore
	customerID, err := s.getStripeCustomerID(ctx, uid)
	if err != nil {
		return "", fmt.Errorf("failed to get customer ID: %w", err)
	}

	if customerID == "" {
		return "", fmt.Errorf("no Stripe customer found for user")
	}

	// Create portal session
	session, err := s.stripeClient.CreatePortalSession(customerID, returnURL)
	if err != nil {
		return "", fmt.Errorf("failed to create portal session: %w", err)
	}

	return session.URL, nil
}

// HandleWebhookEvent processes Stripe webhook events
func (s *StripeBillingService) HandleWebhookEvent(ctx context.Context, event stripe.Event) error {
	s.logger.Info("Processing webhook event",
		zap.String("type", string(event.Type)),
		zap.String("eventId", event.ID),
	)

	switch event.Type {
	case "customer.subscription.created":
		return s.handleSubscriptionCreated(ctx, event)
	case "customer.subscription.updated":
		return s.handleSubscriptionUpdated(ctx, event)
	case "customer.subscription.deleted":
		return s.handleSubscriptionDeleted(ctx, event)
	case "checkout.session.completed":
		return s.handleCheckoutCompleted(ctx, event)
	case "invoice.paid":
		return s.handleInvoicePaid(ctx, event)
	case "invoice.payment_failed":
		return s.handleInvoicePaymentFailed(ctx, event)
	default:
		s.logger.Debug("Unhandled webhook event type", zap.String("type", string(event.Type)))
		return nil
	}
}

// handleSubscriptionCreated handles subscription.created event
func (s *StripeBillingService) handleSubscriptionCreated(ctx context.Context, event stripe.Event) error {
	var subscription stripe.Subscription
	if err := event.Data.Object.UnmarshalJSON(&subscription); err != nil {
		return fmt.Errorf("failed to parse subscription: %w", err)
	}

	return s.syncSubscriptionToFirestore(ctx, &subscription)
}

// handleSubscriptionUpdated handles subscription.updated event
func (s *StripeBillingService) handleSubscriptionUpdated(ctx context.Context, event stripe.Event) error {
	var subscription stripe.Subscription
	if err := event.Data.Object.UnmarshalJSON(&subscription); err != nil {
		return fmt.Errorf("failed to parse subscription: %w", err)
	}

	return s.syncSubscriptionToFirestore(ctx, &subscription)
}

// handleSubscriptionDeleted handles subscription.deleted event
func (s *StripeBillingService) handleSubscriptionDeleted(ctx context.Context, event stripe.Event) error {
	var subscription stripe.Subscription
	if err := event.Data.Object.UnmarshalJSON(&subscription); err != nil {
		return fmt.Errorf("failed to parse subscription: %w", err)
	}

	// Mark subscription as canceled in Firestore
	uid, err := s.getUIDFromCustomerID(ctx, getCustomerID(&subscription))
	if err != nil {
		return fmt.Errorf("failed to get UID: %w", err)
	}

	if uid == "" {
		s.logger.Warn("No UID found for customer", zap.String("customerId", getCustomerID(&subscription)))
		return nil
	}

	statusPath := fmt.Sprintf("users/%s/subscriptionStatus/%s", uid, SubscriptionStatusDoc)
	updates := map[string]interface{}{
		"status": "canceled",
		"tier":   "free",
		"entitlements": map[string]interface{}{
			"aiProcessing": false,
		},
		"canceledAt": time.Now(),
	}

	return s.repo.UpdateDocument(ctx, statusPath, updates)
}

// handleCheckoutCompleted handles checkout.session.completed event
func (s *StripeBillingService) handleCheckoutCompleted(ctx context.Context, event stripe.Event) error {
	var session stripe.CheckoutSession
	if err := event.Data.Object.UnmarshalJSON(&session); err != nil {
		return fmt.Errorf("failed to parse checkout session: %w", err)
	}

	s.logger.Info("Checkout completed",
		zap.String("sessionId", session.ID),
		zap.String("customerId", session.Customer.ID),
	)

	// Record customer mapping
	if session.Customer != nil && session.Metadata != nil {
		if uid, ok := session.Metadata["uid"]; ok {
			err := s.recordCustomerMapping(ctx, session.Customer.ID, uid)
			if err != nil {
				s.logger.Warn("Failed to record customer mapping", zap.Error(err))
			}
		}
	}

	// If there's a subscription, sync it
	if session.Subscription != nil {
		subscriptionID := getSubscriptionIDFromSession(&session)
		subscription, err := s.stripeClient.GetSubscription(subscriptionID)
		if err != nil {
			return fmt.Errorf("failed to get subscription: %w", err)
		}

		return s.syncSubscriptionToFirestore(ctx, subscription)
	}

	return nil
}

// handleInvoicePaid handles invoice.paid event
func (s *StripeBillingService) handleInvoicePaid(ctx context.Context, event stripe.Event) error {
	var invoice stripe.Invoice
	if err := event.Data.Object.UnmarshalJSON(&invoice); err != nil {
		return fmt.Errorf("failed to parse invoice: %w", err)
	}

	s.logger.Info("Invoice paid",
		zap.String("invoiceId", invoice.ID),
		zap.String("customerId", invoice.Customer.ID),
		zap.Int64("amount", invoice.AmountPaid),
	)

	// If invoice has a subscription, sync it
	if invoice.Subscription != nil {
		subscriptionID := invoice.Subscription.ID
		subscription, err := s.stripeClient.GetSubscription(subscriptionID)
		if err != nil {
			return fmt.Errorf("failed to get subscription: %w", err)
		}

		return s.syncSubscriptionToFirestore(ctx, subscription)
	}

	return nil
}

// handleInvoicePaymentFailed handles invoice.payment_failed event
func (s *StripeBillingService) handleInvoicePaymentFailed(ctx context.Context, event stripe.Event) error {
	var invoice stripe.Invoice
	if err := event.Data.Object.UnmarshalJSON(&invoice); err != nil {
		return fmt.Errorf("failed to parse invoice: %w", err)
	}

	s.logger.Warn("Invoice payment failed",
		zap.String("invoiceId", invoice.ID),
		zap.String("customerId", invoice.Customer.ID),
	)

	// Update subscription status to past_due if needed
	if invoice.Subscription != nil {
		subscriptionID := invoice.Subscription.ID
		subscription, err := s.stripeClient.GetSubscription(subscriptionID)
		if err != nil {
			return fmt.Errorf("failed to get subscription: %w", err)
		}

		return s.syncSubscriptionToFirestore(ctx, subscription)
	}

	return nil
}

// syncSubscriptionToFirestore syncs a Stripe subscription to Firestore
func (s *StripeBillingService) syncSubscriptionToFirestore(ctx context.Context, subscription *stripe.Subscription) error {
	customerID := getCustomerID(subscription)

	// Get UID from customer ID
	uid, err := s.getUIDFromCustomerID(ctx, customerID)
	if err != nil {
		return fmt.Errorf("failed to get UID: %w", err)
	}

	if uid == "" {
		s.logger.Warn("No UID found for customer", zap.String("customerId", customerID))
		return nil
	}

	// Map subscription to status
	status := mapSubscriptionToStatus(subscription)

	// Update subscription status in Firestore
	statusPath := fmt.Sprintf("users/%s/subscriptionStatus/%s", uid, SubscriptionStatusDoc)
	err = s.repo.SetDocument(ctx, statusPath, status)
	if err != nil {
		return fmt.Errorf("failed to update subscription status: %w", err)
	}

	s.logger.Info("Subscription synced to Firestore",
		zap.String("uid", uid),
		zap.String("subscriptionId", subscription.ID),
		zap.String("status", string(subscription.Status)),
	)

	return nil
}

// Helper functions

func (s *StripeBillingService) getStripeCustomerID(ctx context.Context, uid string) (string, error) {
	statusPath := fmt.Sprintf("users/%s/subscriptionStatus/%s", uid, SubscriptionStatusDoc)
	doc, err := s.repo.GetDocument(ctx, statusPath)
	if err != nil {
		return "", err
	}

	var status models.SubscriptionStatus
	if err := doc.DataTo(&status); err != nil {
		return "", err
	}

	if status.StripeCustomerID == nil {
		return "", nil
	}

	return *status.StripeCustomerID, nil
}

func (s *StripeBillingService) getUIDFromCustomerID(ctx context.Context, customerID string) (string, error) {
	if customerID == "" {
		return "", nil
	}

	// Query stripe customers collection
	customerPath := fmt.Sprintf("%s/%s", StripeCustomersCollection, customerID)
	doc, err := s.repo.GetDocument(ctx, customerPath)
	if err != nil {
		return "", nil // Not found is ok
	}

	var data map[string]interface{}
	if err := doc.DataTo(&data); err != nil {
		return "", err
	}

	if uid, ok := data["uid"].(string); ok {
		return uid, nil
	}

	return "", nil
}

func (s *StripeBillingService) recordCustomerMapping(ctx context.Context, customerID, uid string) error {
	if customerID == "" || uid == "" {
		return nil
	}

	customerPath := fmt.Sprintf("%s/%s", StripeCustomersCollection, customerID)
	data := map[string]interface{}{
		"uid":       uid,
		"updatedAt": time.Now(),
	}

	return s.repo.SetDocument(ctx, customerPath, data)
}

// Helper functions for extracting IDs

func getCustomerID(subscription *stripe.Subscription) string {
	if subscription.Customer == nil {
		return ""
	}

	if cust, ok := subscription.Customer.(*stripe.Customer); ok {
		return cust.ID
	}

	return ""
}

func getSubscriptionIDFromSession(session *stripe.CheckoutSession) string {
	if session.Subscription == nil {
		return ""
	}

	if sub, ok := session.Subscription.(*stripe.Subscription); ok {
		return sub.ID
	}

	// Fallback: subscription might be just an ID string
	if id, ok := session.Subscription.(string); ok {
		return id
	}

	return ""
}

// mapSubscriptionToStatus converts Stripe subscription to Firestore status
func mapSubscriptionToStatus(subscription *stripe.Subscription) map[string]interface{} {
	customerID := getCustomerID(subscription)
	priceID := ""
	if len(subscription.Items.Data) > 0 {
		priceID = subscription.Items.Data[0].Price.ID
	}

	// Determine tier based on status
	tier := "free"
	aiAllowed := false
	activeStatuses := []stripe.SubscriptionStatus{
		stripe.SubscriptionStatusActive,
		stripe.SubscriptionStatusTrialing,
		stripe.SubscriptionStatusPastDue,
	}

	for _, status := range activeStatuses {
		if subscription.Status == status {
			tier = "pro"
			aiAllowed = true
			break
		}
	}

	status := map[string]interface{}{
		"tier":                 tier,
		"status":               string(subscription.Status),
		"stripeCustomerId":     customerID,
		"stripeSubscriptionId": subscription.ID,
		"priceId":              priceID,
		"currentPeriodEnd":     time.Unix(subscription.CurrentPeriodEnd, 0),
		"currentPeriodStart":   time.Unix(subscription.CurrentPeriodStart, 0),
		"cancelAtPeriodEnd":    subscription.CancelAtPeriodEnd,
		"updatedAt":            time.Now(),
	}

	if subscription.CancelAt > 0 {
		status["cancelAt"] = time.Unix(subscription.CancelAt, 0)
	}

	if subscription.TrialEnd > 0 {
		status["trialEndsAt"] = time.Unix(subscription.TrialEnd, 0)
	}

	// Set entitlements
	status["entitlements"] = map[string]interface{}{
		"aiProcessing":       aiAllowed,
		"aiCreditsRemaining": nil,
		"aiCreditsResetsAt":  time.Unix(subscription.CurrentPeriodEnd, 0),
	}

	return status
}
