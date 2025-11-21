package handlers

import (
	"fmt"
	"io"
	"net/http"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
)

// StripeHandler handles Stripe billing requests
type StripeHandler struct {
	stripeClient     *clients.StripeClient
	stripeBillingSvc *services.StripeBillingService
	logger           *zap.Logger
}

// NewStripeHandler creates a new Stripe handler
func NewStripeHandler(
	stripeClient *clients.StripeClient,
	stripeBillingSvc *services.StripeBillingService,
	logger *zap.Logger,
) *StripeHandler {
	return &StripeHandler{
		stripeClient:     stripeClient,
		stripeBillingSvc: stripeBillingSvc,
		logger:           logger,
	}
}

// CreateCheckoutSession handles POST /api/stripe/create-checkout-session
func (h *StripeHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	uid := r.Context().Value("uid").(string)

	// Parse request
	var req struct {
		SuccessURL string `json:"successUrl"`
		CancelURL  string `json:"cancelUrl"`
	}
	if err := utils.ParseJSON(r, &req); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	h.logger.Info("Creating checkout session",
		zap.String("uid", uid),
	)

	// Get user email from token (if available)
	userEmail := ""
	if decodedToken, ok := r.Context().Value("decodedToken").(interface{}); ok {
		if claims, ok := decodedToken.(map[string]interface{}); ok {
			if email, ok := claims["email"].(string); ok {
				userEmail = email
			}
		}
	}

	// Create checkout session
	sessionURL, err := h.stripeBillingSvc.CreateCheckoutSession(
		r.Context(),
		uid,
		userEmail,
		req.SuccessURL,
		req.CancelURL,
	)
	if err != nil {
		h.logger.Error("Failed to create checkout session",
			zap.Error(err),
			zap.String("uid", uid),
		)
		utils.RespondError(w, fmt.Sprintf("Failed to create checkout session: %v", err), http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"url": sessionURL,
	}, "Checkout session created")
}

// CreatePortalSession handles POST /api/stripe/create-portal-session
func (h *StripeHandler) CreatePortalSession(w http.ResponseWriter, r *http.Request) {
	uid := r.Context().Value("uid").(string)

	// Parse request
	var req struct {
		ReturnURL string `json:"returnUrl"`
	}
	if err := utils.ParseJSON(r, &req); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	h.logger.Info("Creating portal session",
		zap.String("uid", uid),
	)

	// Create portal session
	sessionURL, err := h.stripeBillingSvc.CreatePortalSession(
		r.Context(),
		uid,
		req.ReturnURL,
	)
	if err != nil {
		h.logger.Error("Failed to create portal session",
			zap.Error(err),
			zap.String("uid", uid),
		)
		utils.RespondError(w, fmt.Sprintf("Failed to create portal session: %v", err), http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"url": sessionURL,
	}, "Portal session created")
}

// HandleWebhook handles POST /api/stripe/webhook
func (h *StripeHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// Read request body
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("Failed to read webhook payload", zap.Error(err))
		utils.RespondError(w, "Failed to read request", http.StatusBadRequest)
		return
	}

	// Get Stripe signature
	signature := r.Header.Get("Stripe-Signature")
	if signature == "" {
		h.logger.Warn("Missing Stripe signature")
		utils.RespondError(w, "Missing signature", http.StatusBadRequest)
		return
	}

	// Verify and construct event
	event, err := h.stripeClient.ConstructWebhookEvent(payload, signature)
	if err != nil {
		h.logger.Error("Failed to verify webhook", zap.Error(err))
		utils.RespondError(w, "Invalid signature", http.StatusBadRequest)
		return
	}

	h.logger.Info("Processing webhook event",
		zap.String("type", string(event.Type)),
		zap.String("eventId", event.ID),
	)

	// Process event
	err = h.stripeBillingSvc.HandleWebhookEvent(r.Context(), event)
	if err != nil {
		h.logger.Error("Failed to process webhook event",
			zap.Error(err),
			zap.String("type", string(event.Type)),
			zap.String("eventId", event.ID),
		)
		// Still return 200 to Stripe to acknowledge receipt
		// Log the error but don't fail the webhook
	}

	// Return 200 to acknowledge receipt
	utils.RespondSuccess(w, map[string]interface{}{
		"received": true,
		"eventId":  event.ID,
	}, "Webhook processed")
}

// GetInvoices handles GET /api/stripe/invoices
func (h *StripeHandler) GetInvoices(w http.ResponseWriter, r *http.Request) {
	uid := r.Context().Value("uid").(string)

	h.logger.Info("Fetching invoices", zap.String("uid", uid))

	// Get customer ID from subscription service
	// This is a simplified version - in production you'd want to use the subscription service
	// For now, return a placeholder
	utils.RespondSuccess(w, map[string]interface{}{
		"invoices": []interface{}{},
	}, "Invoices retrieved")
}

// GetPaymentMethod handles GET /api/stripe/payment-method
func (h *StripeHandler) GetPaymentMethod(w http.ResponseWriter, r *http.Request) {
	uid := r.Context().Value("uid").(string)

	h.logger.Info("Fetching payment method", zap.String("uid", uid))

	// Get customer ID from subscription service
	// This is a simplified version - in production you'd want to use the subscription service
	// For now, return a placeholder
	utils.RespondSuccess(w, map[string]interface{}{
		"paymentMethod": nil,
	}, "Payment method retrieved")
}

// ReactivateSubscription handles POST /api/stripe/reactivate-subscription
func (h *StripeHandler) ReactivateSubscription(w http.ResponseWriter, r *http.Request) {
	uid := r.Context().Value("uid").(string)

	h.logger.Info("Reactivating subscription", zap.String("uid", uid))

	// Parse request
	var req struct {
		SubscriptionID string `json:"subscriptionId"`
	}
	if err := utils.ParseJSON(r, &req); err != nil {
		utils.RespondError(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.SubscriptionID == "" {
		utils.RespondError(w, "subscriptionId is required", http.StatusBadRequest)
		return
	}

	// Reactivate subscription
	subscription, err := h.stripeClient.ReactivateSubscription(req.SubscriptionID)
	if err != nil {
		h.logger.Error("Failed to reactivate subscription",
			zap.Error(err),
			zap.String("uid", uid),
			zap.String("subscriptionId", req.SubscriptionID),
		)
		utils.RespondError(w, fmt.Sprintf("Failed to reactivate subscription: %v", err), http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"subscription": map[string]interface{}{
			"id":                subscription.ID,
			"status":            string(subscription.Status),
			"cancelAtPeriodEnd": subscription.CancelAtPeriodEnd,
		},
	}, "Subscription reactivated")
}

// GetUsageStats handles GET /api/stripe/usage-stats
func (h *StripeHandler) GetUsageStats(w http.ResponseWriter, r *http.Request) {
	uid := r.Context().Value("uid").(string)

	h.logger.Info("Fetching usage stats", zap.String("uid", uid))

	// TODO: Implement usage stats retrieval from Firestore
	// For now, return placeholder data
	utils.RespondSuccess(w, map[string]interface{}{
		"totalRequests":   0,
		"totalTokens":     0,
		"monthlyRequests": 0,
		"monthlyTokens":   0,
	}, "Usage stats retrieved")
}
