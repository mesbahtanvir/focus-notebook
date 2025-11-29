package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
)

// PlaidHandler handles Plaid banking requests
type PlaidHandler struct {
	plaidService *services.PlaidService
	logger       *zap.Logger
}

// NewPlaidHandler creates a new Plaid handler
func NewPlaidHandler(plaidService *services.PlaidService, logger *zap.Logger) *PlaidHandler {
	return &PlaidHandler{
		plaidService: plaidService,
		logger:       logger,
	}
}

// CreateLinkToken creates a Plaid Link token for new connections
// POST /api/plaid/create-link-token
func (h *PlaidHandler) CreateLinkToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	email := ctx.Value("email").(string)

	var req struct {
		Platform    string `json:"platform"`
		RedirectURI string `json:"redirectUri"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Default platform to web
	if req.Platform == "" {
		req.Platform = "web"
	}

	h.logger.Debug("CreateLinkToken request",
		zap.String("uid", uid),
		zap.String("platform", req.Platform),
	)

	result, err := h.plaidService.CreateLinkToken(ctx, services.CreateLinkTokenRequest{
		UID:         uid,
		Email:       email,
		Platform:    req.Platform,
		RedirectURI: req.RedirectURI,
	})
	if err != nil {
		h.logger.Error("Failed to create link token", zap.Error(err))
		utils.RespondError(w, "Failed to create link token", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, result, "Link token created")
}

// ExchangePublicToken exchanges a public token for an access token
// POST /api/plaid/exchange-public-token
func (h *PlaidHandler) ExchangePublicToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	var req struct {
		PublicToken string `json:"public_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.PublicToken == "" {
		utils.RespondError(w, "public_token is required", http.StatusBadRequest)
		return
	}

	h.logger.Debug("ExchangePublicToken request",
		zap.String("uid", uid),
	)

	result, err := h.plaidService.ExchangePublicToken(ctx, services.ExchangePublicTokenRequest{
		UID:         uid,
		PublicToken: req.PublicToken,
	})
	if err != nil {
		h.logger.Error("Failed to exchange public token", zap.Error(err))
		utils.RespondError(w, "Failed to exchange public token", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, result, "Public token exchanged")
}

// CreateRelinkToken creates a link token for updating/relinking an existing item
// POST /api/plaid/create-relink-token
func (h *PlaidHandler) CreateRelinkToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	email := ctx.Value("email").(string)

	var req struct {
		ItemID   string `json:"itemId"`
		Platform string `json:"platform"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ItemID == "" {
		utils.RespondError(w, "itemId is required", http.StatusBadRequest)
		return
	}

	// Default platform to web
	if req.Platform == "" {
		req.Platform = "web"
	}

	h.logger.Debug("CreateRelinkToken request",
		zap.String("uid", uid),
		zap.String("itemId", req.ItemID),
	)

	result, err := h.plaidService.CreateRelinkToken(ctx, services.CreateRelinkTokenRequest{
		UID:      uid,
		Email:    email,
		ItemID:   req.ItemID,
		Platform: req.Platform,
	})
	if err != nil {
		h.logger.Error("Failed to create relink token", zap.Error(err))
		utils.RespondError(w, "Failed to create relink token", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, result, "Relink token created")
}

// MarkRelinking marks an item as successfully relinked
// POST /api/plaid/mark-relinking
func (h *PlaidHandler) MarkRelinking(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	var req struct {
		ItemID string `json:"itemId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ItemID == "" {
		utils.RespondError(w, "itemId is required", http.StatusBadRequest)
		return
	}

	h.logger.Debug("MarkRelinking request",
		zap.String("uid", uid),
		zap.String("itemId", req.ItemID),
	)

	err := h.plaidService.MarkRelinking(ctx, services.MarkRelinkingRequest{
		UID:    uid,
		ItemID: req.ItemID,
	})
	if err != nil {
		h.logger.Error("Failed to mark relinking", zap.Error(err))
		utils.RespondError(w, "Failed to mark relinking", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{"ok": true}, "Item marked as relinked")
}

// TriggerSync manually triggers a transaction sync for an item
// POST /api/plaid/trigger-sync
func (h *PlaidHandler) TriggerSync(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	var req struct {
		ItemID string `json:"itemId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		utils.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ItemID == "" {
		utils.RespondError(w, "itemId is required", http.StatusBadRequest)
		return
	}

	h.logger.Debug("TriggerSync request",
		zap.String("uid", uid),
		zap.String("itemId", req.ItemID),
	)

	result, err := h.plaidService.TriggerSync(ctx, services.TriggerSyncRequest{
		UID:    uid,
		ItemID: req.ItemID,
	})
	if err != nil {
		h.logger.Error("Failed to trigger sync", zap.Error(err))
		utils.RespondError(w, "Failed to trigger sync", http.StatusInternalServerError)
		return
	}

	utils.RespondSuccess(w, result, "Transaction sync completed")
}

// HandleWebhook processes Plaid webhook events
// POST /api/plaid/webhook
func (h *PlaidHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Read raw body for signature verification
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("Failed to read webhook body", zap.Error(err))
		utils.RespondError(w, "Failed to read request", http.StatusBadRequest)
		return
	}

	// Parse webhook payload
	var webhook struct {
		WebhookType string  `json:"webhook_type"`
		WebhookCode string  `json:"webhook_code"`
		ItemID      string  `json:"item_id"`
		Error       *string `json:"error"`
		ErrorCode   *string `json:"error_code"`
	}

	if err := json.Unmarshal(body, &webhook); err != nil {
		h.logger.Error("Failed to parse webhook", zap.Error(err))
		utils.RespondError(w, "Invalid webhook payload", http.StatusBadRequest)
		return
	}

	h.logger.Info("Received Plaid webhook",
		zap.String("type", webhook.WebhookType),
		zap.String("code", webhook.WebhookCode),
		zap.String("itemId", webhook.ItemID),
	)

	// Process webhook (async to return 200 quickly)
	go func() {
		processCtx := context.Background()
		if err := h.plaidService.HandleWebhook(
			processCtx,
			webhook.WebhookType,
			webhook.WebhookCode,
			webhook.ItemID,
			webhook.ErrorCode,
		); err != nil {
			h.logger.Error("Failed to process webhook", zap.Error(err))
		}
	}()

	// Always return 200 to Plaid
	utils.RespondSuccess(w, map[string]interface{}{
		"received": true,
		"type":     webhook.WebhookType,
		"code":     webhook.WebhookCode,
	}, "Webhook received")
}
