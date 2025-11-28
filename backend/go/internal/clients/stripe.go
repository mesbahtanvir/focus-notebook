package clients

import (
	"fmt"

	"github.com/stripe/stripe-go/v76"
	billingportal "github.com/stripe/stripe-go/v76/billingportal/session"
	checkout "github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/invoice"
	"github.com/stripe/stripe-go/v76/paymentmethod"
	sub "github.com/stripe/stripe-go/v76/subscription"
	"github.com/stripe/stripe-go/v76/webhook"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/config"
)

// StripeClient wraps the Stripe API client
type StripeClient struct {
	secretKey     string
	webhookSecret string
	proPriceID    string
	successURL    string
	cancelURL     string
	logger        *zap.Logger
}

// NewStripeClient creates a new Stripe client
func NewStripeClient(cfg *config.StripeConfig, logger *zap.Logger) (*StripeClient, error) {
	if cfg.SecretKey == "" {
		return nil, fmt.Errorf("Stripe secret key is required")
	}

	// Set API key globally for stripe-go library
	stripe.Key = cfg.SecretKey

	return &StripeClient{
		secretKey:     cfg.SecretKey,
		webhookSecret: cfg.WebhookSecret,
		proPriceID:    cfg.ProPriceID,
		successURL:    cfg.SuccessURL,
		cancelURL:     cfg.CancelURL,
		logger:        logger,
	}, nil
}

// CreateCheckoutSession creates a Stripe Checkout session for subscription
func (c *StripeClient) CreateCheckoutSession(customerEmail string, successURL, cancelURL string) (*checkout.Session, error) {
	// Use configured URLs if not provided
	if successURL == "" {
		successURL = c.successURL
	}
	if cancelURL == "" {
		cancelURL = c.cancelURL
	}

	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(c.proPriceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
	}

	// Add customer email if provided
	if customerEmail != "" {
		params.CustomerEmail = stripe.String(customerEmail)
	}

	// Allow promotion codes
	params.AllowPromotionCodes = stripe.Bool(true)

	// Add metadata
	params.AddMetadata("source", "focus-notebook-backend")

	c.logger.Debug("Creating Stripe checkout session",
		zap.String("priceId", c.proPriceID),
		zap.String("customerEmail", customerEmail),
	)

	session, err := checkout.New(params)
	if err != nil {
		c.logger.Error("Failed to create checkout session", zap.Error(err))
		return nil, fmt.Errorf("failed to create checkout session: %w", err)
	}

	c.logger.Info("Checkout session created",
		zap.String("sessionId", session.ID),
		zap.String("customerEmail", customerEmail),
	)

	return session, nil
}

// CreatePortalSession creates a Stripe billing portal session
func (c *StripeClient) CreatePortalSession(customerID string, returnURL string) (*billingportal.Session, error) {
	if customerID == "" {
		return nil, fmt.Errorf("customer ID is required")
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnURL),
	}

	c.logger.Debug("Creating billing portal session",
		zap.String("customerId", customerID),
	)

	session, err := billingportal.New(params)
	if err != nil {
		c.logger.Error("Failed to create portal session", zap.Error(err))
		return nil, fmt.Errorf("failed to create portal session: %w", err)
	}

	c.logger.Info("Portal session created",
		zap.String("sessionId", session.ID),
		zap.String("customerId", customerID),
	)

	return session, nil
}

// GetCustomer retrieves a Stripe customer by ID
func (c *StripeClient) GetCustomer(customerID string) (*stripe.Customer, error) {
	cust, err := customer.Get(customerID, nil)
	if err != nil {
		c.logger.Error("Failed to get customer", zap.Error(err), zap.String("customerId", customerID))
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	return cust, nil
}

// GetSubscription retrieves a Stripe subscription by ID
func (c *StripeClient) GetSubscription(subscriptionID string) (*stripe.Subscription, error) {
	subscription, err := sub.Get(subscriptionID, nil)
	if err != nil {
		c.logger.Error("Failed to get subscription", zap.Error(err), zap.String("subscriptionId", subscriptionID))
		return nil, fmt.Errorf("failed to get subscription: %w", err)
	}

	return subscription, nil
}

// ListInvoices retrieves invoices for a customer
func (c *StripeClient) ListInvoices(customerID string, limit int64) ([]*stripe.Invoice, error) {
	if limit <= 0 {
		limit = 10
	}

	params := &stripe.InvoiceListParams{
		Customer: stripe.String(customerID),
	}
	params.Filters.AddFilter("limit", "", fmt.Sprintf("%d", limit))

	c.logger.Debug("Listing invoices",
		zap.String("customerId", customerID),
		zap.Int64("limit", limit),
	)

	var invoices []*stripe.Invoice
	iter := invoice.List(params)
	for iter.Next() {
		invoices = append(invoices, iter.Invoice())
	}

	if err := iter.Err(); err != nil {
		c.logger.Error("Failed to list invoices", zap.Error(err))
		return nil, fmt.Errorf("failed to list invoices: %w", err)
	}

	c.logger.Debug("Invoices retrieved",
		zap.String("customerId", customerID),
		zap.Int("count", len(invoices)),
	)

	return invoices, nil
}

// GetPaymentMethod retrieves the default payment method for a customer
func (c *StripeClient) GetPaymentMethod(customerID string) (*stripe.PaymentMethod, error) {
	cust, err := c.GetCustomer(customerID)
	if err != nil {
		return nil, err
	}

	if cust.InvoiceSettings == nil || cust.InvoiceSettings.DefaultPaymentMethod == nil {
		return nil, fmt.Errorf("no default payment method found")
	}

	paymentMethodID := cust.InvoiceSettings.DefaultPaymentMethod.ID

	pm, err := paymentmethod.Get(paymentMethodID, nil)
	if err != nil {
		c.logger.Error("Failed to get payment method", zap.Error(err))
		return nil, fmt.Errorf("failed to get payment method: %w", err)
	}

	return pm, nil
}

// CancelSubscription cancels a subscription at period end
func (c *StripeClient) CancelSubscription(subscriptionID string, cancelAtPeriodEnd bool) (*stripe.Subscription, error) {
	params := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(cancelAtPeriodEnd),
	}

	subscription, err := sub.Update(subscriptionID, params)
	if err != nil {
		c.logger.Error("Failed to cancel subscription", zap.Error(err))
		return nil, fmt.Errorf("failed to cancel subscription: %w", err)
	}

	c.logger.Info("Subscription cancel scheduled",
		zap.String("subscriptionId", subscriptionID),
		zap.Bool("cancelAtPeriodEnd", cancelAtPeriodEnd),
	)

	return subscription, nil
}

// ReactivateSubscription reactivates a canceled subscription
func (c *StripeClient) ReactivateSubscription(subscriptionID string) (*stripe.Subscription, error) {
	params := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(false),
	}

	subscription, err := sub.Update(subscriptionID, params)
	if err != nil {
		c.logger.Error("Failed to reactivate subscription", zap.Error(err))
		return nil, fmt.Errorf("failed to reactivate subscription: %w", err)
	}

	c.logger.Info("Subscription reactivated",
		zap.String("subscriptionId", subscriptionID),
	)

	return subscription, nil
}

// ConstructWebhookEvent constructs and verifies a webhook event
func (c *StripeClient) ConstructWebhookEvent(payload []byte, signature string) (stripe.Event, error) {
	if c.webhookSecret == "" {
		return stripe.Event{}, fmt.Errorf("webhook secret not configured")
	}

	event, err := webhook.ConstructEvent(payload, signature, c.webhookSecret)
	if err != nil {
		c.logger.Error("Failed to verify webhook signature", zap.Error(err))
		return stripe.Event{}, fmt.Errorf("failed to verify webhook: %w", err)
	}

	c.logger.Debug("Webhook event verified",
		zap.String("type", string(event.Type)),
		zap.String("eventId", event.ID),
	)

	return event, nil
}

// GetProPriceID returns the configured Pro tier price ID
func (c *StripeClient) GetProPriceID() string {
	return c.proPriceID
}
