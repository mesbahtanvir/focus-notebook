package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository"
)

// PlaidService handles Plaid banking operations
type PlaidService struct {
	plaidClient *clients.PlaidClient
	repo        *repository.FirestoreRepository
	logger      *zap.Logger
}

// NewPlaidService creates a new Plaid service
func NewPlaidService(plaidClient *clients.PlaidClient, repo *repository.FirestoreRepository, logger *zap.Logger) *PlaidService {
	return &PlaidService{
		plaidClient: plaidClient,
		repo:        repo,
		logger:      logger,
	}
}

// CreateLinkTokenRequest holds parameters for creating a link token
type CreateLinkTokenRequest struct {
	UID        string
	Email      string
	Platform   string
	RedirectURI string
}

// CreateLinkToken creates a Plaid Link token for new connections
func (s *PlaidService) CreateLinkToken(ctx context.Context, req CreateLinkTokenRequest) (map[string]interface{}, error) {
	s.logger.Debug("Creating link token",
		zap.String("uid", req.UID),
		zap.String("platform", req.Platform),
	)

	result, err := s.plaidClient.CreateLinkToken(ctx, clients.CreateLinkTokenRequest{
		UserID:      req.UID,
		UserEmail:   req.Email,
		Platform:    req.Platform,
		RedirectURI: req.RedirectURI,
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"link_token": result.LinkToken,
		"expires_at": result.Expiration.Format(time.RFC3339),
	}, nil
}

// CreateRelinkTokenRequest holds parameters for creating a relink token
type CreateRelinkTokenRequest struct {
	UID      string
	Email    string
	ItemID   string
	Platform string
}

// CreateRelinkToken creates a Plaid Link token for updating/relinking
func (s *PlaidService) CreateRelinkToken(ctx context.Context, req CreateRelinkTokenRequest) (map[string]interface{}, error) {
	s.logger.Debug("Creating relink token",
		zap.String("uid", req.UID),
		zap.String("itemId", req.ItemID),
	)

	// Verify ownership
	itemPath := fmt.Sprintf("plaidItems/%s", req.ItemID)
	itemData, err := s.repo.GetDocument(ctx, itemPath)
	if err != nil {
		return nil, fmt.Errorf("item not found: %w", err)
	}

	if itemData["uid"] != req.UID {
		return nil, fmt.Errorf("not authorized to access this item")
	}

	// Get encrypted access token
	accessToken, err := s.getAccessToken(ctx, req.ItemID)
	if err != nil {
		return nil, err
	}

	// Create link token in update mode
	result, err := s.plaidClient.CreateLinkToken(ctx, clients.CreateLinkTokenRequest{
		UserID:      req.UID,
		UserEmail:   req.Email,
		Platform:    req.Platform,
		AccessToken: accessToken,
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"link_token": result.LinkToken,
		"expires_at": result.Expiration.Format(time.RFC3339),
	}, nil
}

// ExchangePublicTokenRequest holds parameters for exchanging a public token
type ExchangePublicTokenRequest struct {
	UID         string
	PublicToken string
}

// ExchangePublicToken exchanges a public token for an access token and stores connection
func (s *PlaidService) ExchangePublicToken(ctx context.Context, req ExchangePublicTokenRequest) (map[string]interface{}, error) {
	s.logger.Debug("Exchanging public token", zap.String("uid", req.UID))

	// Exchange public token
	exchangeResult, err := s.plaidClient.ExchangePublicToken(ctx, clients.ExchangePublicTokenRequest{
		PublicToken: req.PublicToken,
	})
	if err != nil {
		return nil, err
	}

	itemID := exchangeResult.ItemID
	accessToken := exchangeResult.AccessToken

	// Get item info
	item, err := s.plaidClient.GetItem(ctx, accessToken)
	if err != nil {
		s.logger.Error("Failed to get item", zap.Error(err))
		return nil, err
	}

	// Get institution info
	var institutionName string
	if item.InstitutionID != "" {
		institution, err := s.plaidClient.GetInstitution(ctx, item.InstitutionID)
		if err != nil {
			s.logger.Warn("Could not fetch institution name", zap.Error(err))
			institutionName = "Unknown Institution"
		} else {
			institutionName = institution.Name
		}
	} else {
		institutionName = "Unknown Institution"
	}

	// Encrypt access token (simplified - in production, use proper KMS)
	encryptedToken := s.encryptAccessToken(accessToken)

	// Store item in Firestore
	itemPath := fmt.Sprintf("plaidItems/%s", itemID)
	itemData := map[string]interface{}{
		"uid":             req.UID,
		"institutionId":   item.InstitutionID,
		"institutionName": institutionName,
		"status":          "ok",
		"kmsRef":          encryptedToken,
		"lastSyncAt":      time.Now(),
		"createdAt":       time.Now(),
	}

	if err := s.repo.SetDocument(ctx, itemPath, itemData); err != nil {
		return nil, fmt.Errorf("failed to store item: %w", err)
	}

	// Get accounts
	accounts, err := s.plaidClient.GetAccounts(ctx, accessToken)
	if err != nil {
		s.logger.Error("Failed to get accounts", zap.Error(err))
		return nil, err
	}

	// Store accounts
	accountDocs := []map[string]interface{}{}
	for _, account := range accounts {
		accountPath := fmt.Sprintf("accounts/%s", account.AccountID)
		accountData := map[string]interface{}{
			"uid":      req.UID,
			"itemId":   itemID,
			"type":     account.Type,
			"subtype":  account.Subtype,
			"name":     account.Name,
			"mask":     account.Mask,
			"balances": map[string]interface{}{
				"current":     account.Balances.Current,
				"available":   account.Balances.Available,
				"isoCurrency": account.Balances.IsoCurrency,
				"limit":       account.Balances.Limit,
			},
			"officialName": account.OfficialName,
			"updatedAt":    time.Now(),
		}

		if err := s.repo.SetDocument(ctx, accountPath, accountData); err != nil {
			s.logger.Error("Failed to store account", zap.Error(err), zap.String("accountId", account.AccountID))
			continue
		}

		accountDocs = append(accountDocs, map[string]interface{}{
			"id":   account.AccountID,
			"name": account.Name,
			"type": account.Type,
			"mask": account.Mask,
		})
	}

	// Trigger initial transaction sync (async)
	go func() {
		syncCtx := context.Background()
		if _, err := s.syncTransactions(syncCtx, itemID, accessToken, req.UID, nil); err != nil {
			s.logger.Error("Failed to sync transactions after exchange", zap.Error(err))
		}
	}()

	s.logger.Info("Public token exchanged successfully",
		zap.String("uid", req.UID),
		zap.String("itemId", itemID),
		zap.String("institution", institutionName),
		zap.Int("accounts", len(accountDocs)),
	)

	return map[string]interface{}{
		"itemId":          itemID,
		"institutionId":   item.InstitutionID,
		"institutionName": institutionName,
		"accounts":        accountDocs,
	}, nil
}

// MarkRelinkingRequest holds parameters for marking relinking as complete
type MarkRelinkingRequest struct {
	UID    string
	ItemID string
}

// MarkRelinking marks an item as successfully relinked
func (s *PlaidService) MarkRelinking(ctx context.Context, req MarkRelinkingRequest) error {
	s.logger.Debug("Marking relinking complete",
		zap.String("uid", req.UID),
		zap.String("itemId", req.ItemID),
	)

	// Verify ownership
	itemPath := fmt.Sprintf("plaidItems/%s", req.ItemID)
	itemData, err := s.repo.GetDocument(ctx, itemPath)
	if err != nil {
		return fmt.Errorf("item not found: %w", err)
	}

	if itemData["uid"] != req.UID {
		return fmt.Errorf("not authorized to access this item")
	}

	// Update status to ok
	if err := s.updateItemStatus(ctx, req.ItemID, "ok"); err != nil {
		return err
	}

	// Get access token and trigger sync
	accessToken, err := s.getAccessToken(ctx, req.ItemID)
	if err != nil {
		return err
	}

	// Get current cursor
	var cursor *string
	if cursorVal, ok := itemData["cursor"].(string); ok && cursorVal != "" {
		cursor = &cursorVal
	}

	// Trigger sync (async)
	go func() {
		syncCtx := context.Background()
		if _, err := s.syncTransactions(syncCtx, req.ItemID, accessToken, req.UID, cursor); err != nil {
			s.logger.Error("Failed to sync transactions after relinking", zap.Error(err))
		}
	}()

	return nil
}

// TriggerSyncRequest holds parameters for triggering a sync
type TriggerSyncRequest struct {
	UID    string
	ItemID string
}

// TriggerSync manually triggers a transaction sync
func (s *PlaidService) TriggerSync(ctx context.Context, req TriggerSyncRequest) (map[string]interface{}, error) {
	s.logger.Debug("Triggering transaction sync",
		zap.String("uid", req.UID),
		zap.String("itemId", req.ItemID),
	)

	// Verify ownership
	itemPath := fmt.Sprintf("plaidItems/%s", req.ItemID)
	itemData, err := s.repo.GetDocument(ctx, itemPath)
	if err != nil {
		return nil, fmt.Errorf("item not found: %w", err)
	}

	if itemData["uid"] != req.UID {
		return nil, fmt.Errorf("not authorized to access this item")
	}

	// Get access token
	accessToken, err := s.getAccessToken(ctx, req.ItemID)
	if err != nil {
		return nil, err
	}

	// Get current cursor
	var cursor *string
	if cursorVal, ok := itemData["cursor"].(string); ok && cursorVal != "" {
		cursor = &cursorVal
	}

	// Sync transactions
	result, err := s.syncTransactions(ctx, req.ItemID, accessToken, req.UID, cursor)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"ok":       true,
		"added":    result["added"],
		"modified": result["modified"],
		"removed":  result["removed"],
	}, nil
}

// HandleWebhook processes Plaid webhook events
func (s *PlaidService) HandleWebhook(ctx context.Context, webhookType string, webhookCode string, itemID string, error_code *string) error {
	s.logger.Info("Processing Plaid webhook",
		zap.String("type", webhookType),
		zap.String("code", webhookCode),
		zap.String("itemId", itemID),
	)

	switch webhookType {
	case "TRANSACTIONS":
		return s.handleTransactionsWebhook(ctx, webhookCode, itemID)
	case "ITEM":
		return s.handleItemWebhook(ctx, webhookCode, itemID, error_code)
	default:
		s.logger.Warn("Unknown webhook type", zap.String("type", webhookType))
	}

	return nil
}

// handleTransactionsWebhook handles transaction-related webhooks
func (s *PlaidService) handleTransactionsWebhook(ctx context.Context, code string, itemID string) error {
	switch code {
	case "SYNC_UPDATES_AVAILABLE":
		// Trigger sync in background
		go func() {
			syncCtx := context.Background()
			itemPath := fmt.Sprintf("plaidItems/%s", itemID)
			itemData, err := s.repo.GetDocument(syncCtx, itemPath)
			if err != nil {
				s.logger.Error("Failed to get item for webhook sync", zap.Error(err))
				return
			}

			uid, ok := itemData["uid"].(string)
			if !ok {
				s.logger.Error("Invalid item data - no uid")
				return
			}

			accessToken, err := s.getAccessToken(syncCtx, itemID)
			if err != nil {
				s.logger.Error("Failed to get access token for webhook sync", zap.Error(err))
				return
			}

			var cursor *string
			if cursorVal, ok := itemData["cursor"].(string); ok && cursorVal != "" {
				cursor = &cursorVal
			}

			if _, err := s.syncTransactions(syncCtx, itemID, accessToken, uid, cursor); err != nil {
				s.logger.Error("Failed to sync transactions from webhook", zap.Error(err))
			}
		}()
	}

	return nil
}

// handleItemWebhook handles item-related webhooks
func (s *PlaidService) handleItemWebhook(ctx context.Context, code string, itemID string, error_code *string) error {
	switch code {
	case "ERROR":
		if error_code != nil {
			return s.updateItemStatus(ctx, itemID, "error:"+*error_code)
		}
		return s.updateItemStatus(ctx, itemID, "error")
	case "PENDING_EXPIRATION":
		return s.updateItemStatus(ctx, itemID, "pending_expiration")
	case "LOGIN_REPAIRED":
		return s.updateItemStatus(ctx, itemID, "ok")
	}

	return nil
}

// syncTransactions syncs transactions for an item
func (s *PlaidService) syncTransactions(ctx context.Context, itemID string, accessToken string, uid string, cursor *string) (map[string]interface{}, error) {
	totalAdded := 0
	totalModified := 0
	totalRemoved := 0

	var currentCursor *string = cursor
	hasMore := true

	for hasMore {
		result, err := s.plaidClient.SyncTransactions(ctx, clients.SyncTransactionsRequest{
			AccessToken: accessToken,
			Cursor:      currentCursor,
		})
		if err != nil {
			return nil, err
		}

		// Process added transactions
		for _, txn := range result.Added {
			txnPath := fmt.Sprintf("transactions/%s", txn.TransactionID)
			txnData := map[string]interface{}{
				"uid":                 uid,
				"itemId":              itemID,
				"accountId":           txn.AccountID,
				"plaidTransactionId":  txn.TransactionID,
				"postedAt":            txn.Date,
				"authorizedAt":        txn.AuthorizedDate,
				"pending":             txn.Pending,
				"amount":              txn.Amount,
				"isoCurrency":         txn.IsoCurrency,
				"merchant":            map[string]interface{}{
					"name":       txn.Name,
					"normalized": normalizeMerchantName(txn.Name),
				},
				"originalDescription": txn.Name,
				"category_base":       txn.Category,
				"category_premium":    txn.PersonalFinanceCategory,
				"confidence":          0.8,
				"isSubscription":      false,
				"recurringStreamId":   nil,
				"ingestedAt":          time.Now(),
				"updatedAt":           time.Now(),
				"source":              "plaid",
			}

			if txn.MerchantName != nil {
				txnData["merchant"].(map[string]interface{})["name"] = *txn.MerchantName
				txnData["merchant"].(map[string]interface{})["normalized"] = normalizeMerchantName(*txn.MerchantName)
			}

			if err := s.repo.SetDocument(ctx, txnPath, txnData); err != nil {
				s.logger.Error("Failed to store transaction", zap.Error(err))
				continue
			}

			totalAdded++
		}

		// Process modified transactions
		for _, txn := range result.Modified {
			txnPath := fmt.Sprintf("transactions/%s", txn.TransactionID)
			updates := map[string]interface{}{
				"pending":   txn.Pending,
				"amount":    txn.Amount,
				"updatedAt": time.Now(),
			}

			if err := s.repo.UpdateDocument(ctx, txnPath, updates); err != nil {
				s.logger.Error("Failed to update transaction", zap.Error(err))
				continue
			}

			totalModified++
		}

		// Process removed transactions
		for _, removed := range result.Removed {
			txnPath := fmt.Sprintf("transactions/%s", removed.TransactionID)
			if err := s.repo.DeleteDocument(ctx, txnPath); err != nil {
				s.logger.Error("Failed to delete transaction", zap.Error(err))
				continue
			}

			totalRemoved++
		}

		// Update cursor and check if more data
		currentCursor = &result.NextCursor
		hasMore = result.HasMore
	}

	// Update item with latest cursor and sync time
	itemPath := fmt.Sprintf("plaidItems/%s", itemID)
	if err := s.repo.UpdateDocument(ctx, itemPath, map[string]interface{}{
		"cursor":     *currentCursor,
		"lastSyncAt": time.Now(),
	}); err != nil {
		s.logger.Error("Failed to update item cursor", zap.Error(err))
	}

	s.logger.Info("Transaction sync complete",
		zap.String("itemId", itemID),
		zap.Int("added", totalAdded),
		zap.Int("modified", totalModified),
		zap.Int("removed", totalRemoved),
	)

	return map[string]interface{}{
		"added":    totalAdded,
		"modified": totalModified,
		"removed":  totalRemoved,
	}, nil
}

// getAccessToken retrieves and decrypts the access token for an item
func (s *PlaidService) getAccessToken(ctx context.Context, itemID string) (string, error) {
	itemPath := fmt.Sprintf("plaidItems/%s", itemID)
	itemData, err := s.repo.GetDocument(ctx, itemPath)
	if err != nil {
		return "", fmt.Errorf("failed to get item: %w", err)
	}

	encryptedToken, ok := itemData["kmsRef"].(string)
	if !ok {
		return "", fmt.Errorf("no access token found for item")
	}

	// Decrypt access token (simplified - in production, use proper KMS)
	accessToken := s.decryptAccessToken(encryptedToken)

	return accessToken, nil
}

// updateItemStatus updates the status of a Plaid item
func (s *PlaidService) updateItemStatus(ctx context.Context, itemID string, status string) error {
	itemPath := fmt.Sprintf("plaidItems/%s", itemID)
	return s.repo.UpdateDocument(ctx, itemPath, map[string]interface{}{
		"status":    status,
		"updatedAt": firestore.ServerTimestamp,
	})
}

// encryptAccessToken encrypts an access token (simplified)
// In production, use Google Cloud KMS or similar
func (s *PlaidService) encryptAccessToken(accessToken string) string {
	// TODO: Implement proper encryption using Cloud KMS
	// For now, this is a placeholder that just base64 encodes
	// In production, use: github.com/googleapis/google-cloud-go/kms
	return fmt.Sprintf("encrypted:%s", accessToken)
}

// decryptAccessToken decrypts an access token (simplified)
func (s *PlaidService) decryptAccessToken(encryptedToken string) string {
	// TODO: Implement proper decryption using Cloud KMS
	// For now, just strip the prefix
	return strings.TrimPrefix(encryptedToken, "encrypted:")
}

// normalizeMerchantName normalizes a merchant name for matching
func normalizeMerchantName(name string) string {
	// Convert to lowercase
	normalized := strings.ToLower(name)

	// Remove special characters
	normalized = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == ' ' {
			return r
		}
		return -1
	}, normalized)

	// Trim spaces
	normalized = strings.TrimSpace(normalized)

	// Replace multiple spaces with single space
	for strings.Contains(normalized, "  ") {
		normalized = strings.ReplaceAll(normalized, "  ", " ")
	}

	return normalized
}
