package clients

import (
	"context"
	"fmt"
	"time"

	"github.com/plaid/plaid-go/v20/plaid"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/config"
)

// PlaidClient wraps the Plaid API client
type PlaidClient struct {
	client      *plaid.APIClient
	environment plaid.Environment
	clientID    string
	secret      string
	products    []plaid.Products
	countryCodes []plaid.CountryCode
	webhookURL  string
	logger      *zap.Logger
}

// PlaidConfig holds initialization parameters
type PlaidClientConfig struct {
	ClientID    string
	Secret      string
	Environment string // "sandbox", "development", or "production"
	Products    []string
	CountryCodes []string
	WebhookURL  string
}

// NewPlaidClient creates a new Plaid client
func NewPlaidClient(cfg *config.PlaidConfig, logger *zap.Logger) (*PlaidClient, error) {
	if cfg.ClientID == "" || cfg.Secret == "" {
		return nil, fmt.Errorf("Plaid client ID and secret are required")
	}

	// Map environment string to Plaid enum
	var env plaid.Environment
	switch cfg.Environment {
	case "sandbox":
		env = plaid.Sandbox
	case "development":
		env = plaid.Development
	case "production":
		env = plaid.Production
	default:
		return nil, fmt.Errorf("invalid Plaid environment: %s", cfg.Environment)
	}

	// Map products
	products := []plaid.Products{}
	for _, p := range cfg.Products {
		switch p {
		case "transactions":
			products = append(products, plaid.PRODUCTS_TRANSACTIONS)
		case "auth":
			products = append(products, plaid.PRODUCTS_AUTH)
		case "identity":
			products = append(products, plaid.PRODUCTS_IDENTITY)
		case "assets":
			products = append(products, plaid.PRODUCTS_ASSETS)
		case "liabilities":
			products = append(products, plaid.PRODUCTS_LIABILITIES)
		case "investments":
			products = append(products, plaid.PRODUCTS_INVESTMENTS)
		}
	}

	// Map country codes
	countryCodes := []plaid.CountryCode{}
	for _, c := range cfg.CountryCodes {
		countryCodes = append(countryCodes, plaid.CountryCode(c))
	}

	// Create Plaid configuration
	configuration := plaid.NewConfiguration()
	configuration.AddDefaultHeader("PLAID-CLIENT-ID", cfg.ClientID)
	configuration.AddDefaultHeader("PLAID-SECRET", cfg.Secret)
	configuration.UseEnvironment(env)

	client := plaid.NewAPIClient(configuration)

	logger.Info("Plaid client initialized",
		zap.String("environment", cfg.Environment),
		zap.Int("products", len(products)),
	)

	return &PlaidClient{
		client:       client,
		environment:  env,
		clientID:     cfg.ClientID,
		secret:       cfg.Secret,
		products:     products,
		countryCodes: countryCodes,
		webhookURL:   cfg.WebhookURL,
		logger:       logger,
	}, nil
}

// CreateLinkTokenRequest holds parameters for link token creation
type CreateLinkTokenRequest struct {
	UserID       string
	UserEmail    string
	Platform     string // "web", "ios", or "android"
	RedirectURI  string // Optional redirect URI for OAuth
	AccessToken  string // Optional: for update mode
}

// CreateLinkTokenResponse holds the link token result
type CreateLinkTokenResponse struct {
	LinkToken  string
	Expiration time.Time
	RequestID  string
}

// CreateLinkToken creates a Plaid Link token for connecting accounts
func (c *PlaidClient) CreateLinkToken(ctx context.Context, req CreateLinkTokenRequest) (*CreateLinkTokenResponse, error) {
	c.logger.Debug("Creating Plaid link token",
		zap.String("userId", req.UserID),
		zap.String("platform", req.Platform),
		zap.Bool("updateMode", req.AccessToken != ""),
	)

	// Build user info
	user := plaid.LinkTokenCreateRequestUser{
		ClientUserId: req.UserID,
	}
	if req.UserEmail != "" {
		user.EmailAddress = plaid.PtrString(req.UserEmail)
	}

	// Build request
	request := plaid.NewLinkTokenCreateRequest(
		"Focus Notebook",
		"en",
		c.countryCodes,
		user,
	)

	// Set products (not needed in update mode)
	if req.AccessToken == "" {
		request.SetProducts(c.products)
	}

	// Set webhook URL
	if c.webhookURL != "" {
		request.SetWebhook(c.webhookURL)
	}

	// Set platform-specific redirect URI
	if req.RedirectURI != "" {
		request.SetRedirectUri(req.RedirectURI)
	}

	// Set access token for update mode
	if req.AccessToken != "" {
		request.SetAccessToken(req.AccessToken)
	}

	// Call Plaid API
	response, httpResp, err := c.client.PlaidApi.LinkTokenCreate(ctx).LinkTokenCreateRequest(*request).Execute()
	if err != nil {
		c.logger.Error("Failed to create link token",
			zap.Error(err),
			zap.String("userId", req.UserID),
		)
		return nil, fmt.Errorf("failed to create link token: %w", err)
	}
	defer httpResp.Body.Close()

	expiration, _ := time.Parse(time.RFC3339, response.GetExpiration())

	c.logger.Info("Link token created",
		zap.String("userId", req.UserID),
		zap.String("platform", req.Platform),
		zap.Time("expiration", expiration),
	)

	return &CreateLinkTokenResponse{
		LinkToken:  response.GetLinkToken(),
		Expiration: expiration,
		RequestID:  response.GetRequestId(),
	}, nil
}

// ExchangePublicTokenRequest holds parameters for public token exchange
type ExchangePublicTokenRequest struct {
	PublicToken string
}

// ExchangePublicTokenResponse holds the exchange result
type ExchangePublicTokenResponse struct {
	AccessToken string
	ItemID      string
	RequestID   string
}

// ExchangePublicToken exchanges a public token for an access token
func (c *PlaidClient) ExchangePublicToken(ctx context.Context, req ExchangePublicTokenRequest) (*ExchangePublicTokenResponse, error) {
	c.logger.Debug("Exchanging public token")

	request := plaid.NewItemPublicTokenExchangeRequest(req.PublicToken)

	response, httpResp, err := c.client.PlaidApi.ItemPublicTokenExchange(ctx).ItemPublicTokenExchangeRequest(*request).Execute()
	if err != nil {
		c.logger.Error("Failed to exchange public token", zap.Error(err))
		return nil, fmt.Errorf("failed to exchange public token: %w", err)
	}
	defer httpResp.Body.Close()

	c.logger.Info("Public token exchanged",
		zap.String("itemId", response.GetItemId()),
	)

	return &ExchangePublicTokenResponse{
		AccessToken: response.GetAccessToken(),
		ItemID:      response.GetItemId(),
		RequestID:   response.GetRequestId(),
	}, nil
}

// GetItemResponse holds item information
type GetItemResponse struct {
	ItemID        string
	InstitutionID string
	Webhook       string
	AvailableProducts []string
	BilledProducts    []string
	Error         *string
	UpdateType    string
}

// GetItem retrieves information about a Plaid item
func (c *PlaidClient) GetItem(ctx context.Context, accessToken string) (*GetItemResponse, error) {
	c.logger.Debug("Getting Plaid item")

	request := plaid.NewItemGetRequest(accessToken)

	response, httpResp, err := c.client.PlaidApi.ItemGet(ctx).ItemGetRequest(*request).Execute()
	if err != nil {
		c.logger.Error("Failed to get item", zap.Error(err))
		return nil, fmt.Errorf("failed to get item: %w", err)
	}
	defer httpResp.Body.Close()

	item := response.GetItem()
	result := &GetItemResponse{
		ItemID:            item.GetItemId(),
		InstitutionID:     item.InstitutionId.Get(),
		Webhook:           item.GetWebhook(),
		AvailableProducts: []string{},
		BilledProducts:    []string{},
	}

	// Convert products to strings
	for _, p := range item.GetAvailableProducts() {
		result.AvailableProducts = append(result.AvailableProducts, string(p))
	}
	for _, p := range item.GetBilledProducts() {
		result.BilledProducts = append(result.BilledProducts, string(p))
	}

	// Check for errors
	if item.Error != nil {
		errorStr := item.Error.GetErrorMessage()
		result.Error = &errorStr
		result.UpdateType = string(item.Error.GetErrorType())
	}

	c.logger.Debug("Item retrieved",
		zap.String("itemId", result.ItemID),
		zap.String("institutionId", result.InstitutionID),
	)

	return result, nil
}

// InstitutionInfo holds institution details
type InstitutionInfo struct {
	InstitutionID string
	Name          string
	Products      []string
	CountryCodes  []string
	URL           string
	PrimaryColor  string
	Logo          string
}

// GetInstitution retrieves institution details by ID
func (c *PlaidClient) GetInstitution(ctx context.Context, institutionID string) (*InstitutionInfo, error) {
	c.logger.Debug("Getting institution", zap.String("institutionId", institutionID))

	request := plaid.NewInstitutionsGetByIdRequest(institutionID, c.countryCodes)

	response, httpResp, err := c.client.PlaidApi.InstitutionsGetById(ctx).InstitutionsGetByIdRequest(*request).Execute()
	if err != nil {
		c.logger.Error("Failed to get institution", zap.Error(err))
		return nil, fmt.Errorf("failed to get institution: %w", err)
	}
	defer httpResp.Body.Close()

	inst := response.GetInstitution()
	result := &InstitutionInfo{
		InstitutionID: inst.GetInstitutionId(),
		Name:          inst.GetName(),
		Products:      []string{},
		CountryCodes:  []string{},
		URL:           inst.GetUrl(),
		PrimaryColor:  inst.GetPrimaryColor(),
		Logo:          inst.GetLogo(),
	}

	for _, p := range inst.GetProducts() {
		result.Products = append(result.Products, string(p))
	}
	for _, c := range inst.GetCountryCodes() {
		result.CountryCodes = append(result.CountryCodes, string(c))
	}

	c.logger.Debug("Institution retrieved", zap.String("name", result.Name))

	return result, nil
}

// Account holds account information
type Account struct {
	AccountID    string
	Name         string
	Mask         string
	Type         string
	Subtype      string
	OfficialName string
	Balances     AccountBalances
}

// AccountBalances holds account balance information
type AccountBalances struct {
	Current     float64
	Available   *float64
	Limit       *float64
	IsoCurrency string
}

// GetAccounts retrieves accounts for an item
func (c *PlaidClient) GetAccounts(ctx context.Context, accessToken string) ([]Account, error) {
	c.logger.Debug("Getting accounts")

	request := plaid.NewAccountsGetRequest(accessToken)

	response, httpResp, err := c.client.PlaidApi.AccountsGet(ctx).AccountsGetRequest(*request).Execute()
	if err != nil {
		c.logger.Error("Failed to get accounts", zap.Error(err))
		return nil, fmt.Errorf("failed to get accounts: %w", err)
	}
	defer httpResp.Body.Close()

	accounts := []Account{}
	for _, acc := range response.GetAccounts() {
		account := Account{
			AccountID:    acc.GetAccountId(),
			Name:         acc.GetName(),
			Mask:         acc.GetMask(),
			Type:         string(acc.GetType()),
			Subtype:      string(acc.GetSubtype()),
			OfficialName: acc.GetOfficialName(),
			Balances: AccountBalances{
				Current:     acc.Balances.GetCurrent(),
				IsoCurrency: acc.Balances.GetIsoCurrencyCode(),
			},
		}

		if available := acc.Balances.GetAvailable(); available != 0 {
			account.Balances.Available = &available
		}
		if limit := acc.Balances.GetLimit(); limit != 0 {
			account.Balances.Limit = &limit
		}

		accounts = append(accounts, account)
	}

	c.logger.Debug("Accounts retrieved", zap.Int("count", len(accounts)))

	return accounts, nil
}

// Transaction holds transaction information
type Transaction struct {
	TransactionID    string
	AccountID        string
	Amount           float64
	IsoCurrency      string
	Date             string
	AuthorizedDate   *string
	Name             string
	MerchantName     *string
	Pending          bool
	Category         []string
	PersonalFinanceCategory *string
}

// SyncTransactionsRequest holds parameters for transaction sync
type SyncTransactionsRequest struct {
	AccessToken string
	Cursor      *string
}

// SyncTransactionsResponse holds the sync result
type SyncTransactionsResponse struct {
	Added    []Transaction
	Modified []Transaction
	Removed  []RemovedTransaction
	NextCursor string
	HasMore    bool
}

// RemovedTransaction holds information about removed transactions
type RemovedTransaction struct {
	TransactionID string
}

// SyncTransactions fetches transactions using the sync endpoint
func (c *PlaidClient) SyncTransactions(ctx context.Context, req SyncTransactionsRequest) (*SyncTransactionsResponse, error) {
	c.logger.Debug("Syncing transactions", zap.Bool("hasCursor", req.Cursor != nil))

	request := plaid.NewTransactionsSyncRequest(req.AccessToken)
	if req.Cursor != nil && *req.Cursor != "" {
		request.SetCursor(*req.Cursor)
	}

	response, httpResp, err := c.client.PlaidApi.TransactionsSync(ctx).TransactionsSyncRequest(*request).Execute()
	if err != nil {
		c.logger.Error("Failed to sync transactions", zap.Error(err))
		return nil, fmt.Errorf("failed to sync transactions: %w", err)
	}
	defer httpResp.Body.Close()

	result := &SyncTransactionsResponse{
		Added:      []Transaction{},
		Modified:   []Transaction{},
		Removed:    []RemovedTransaction{},
		NextCursor: response.GetNextCursor(),
		HasMore:    response.GetHasMore(),
	}

	// Process added transactions
	for _, txn := range response.GetAdded() {
		transaction := Transaction{
			TransactionID: txn.GetTransactionId(),
			AccountID:     txn.GetAccountId(),
			Amount:        txn.GetAmount(),
			IsoCurrency:   txn.GetIsoCurrencyCode(),
			Date:          txn.GetDate(),
			Name:          txn.GetName(),
			Pending:       txn.GetPending(),
			Category:      txn.GetCategory(),
		}

		if authDate := txn.GetAuthorizedDate(); authDate != "" {
			transaction.AuthorizedDate = &authDate
		}
		if merchantName := txn.GetMerchantName(); merchantName != "" {
			transaction.MerchantName = &merchantName
		}
		if pfc := txn.PersonalFinanceCategory; pfc != nil {
			pfcStr := pfc.GetPrimary()
			transaction.PersonalFinanceCategory = &pfcStr
		}

		result.Added = append(result.Added, transaction)
	}

	// Process modified transactions
	for _, txn := range response.GetModified() {
		transaction := Transaction{
			TransactionID: txn.GetTransactionId(),
			AccountID:     txn.GetAccountId(),
			Amount:        txn.GetAmount(),
			IsoCurrency:   txn.GetIsoCurrencyCode(),
			Date:          txn.GetDate(),
			Name:          txn.GetName(),
			Pending:       txn.GetPending(),
			Category:      txn.GetCategory(),
		}

		if authDate := txn.GetAuthorizedDate(); authDate != "" {
			transaction.AuthorizedDate = &authDate
		}
		if merchantName := txn.GetMerchantName(); merchantName != "" {
			transaction.MerchantName = &merchantName
		}

		result.Modified = append(result.Modified, transaction)
	}

	// Process removed transactions
	for _, removed := range response.GetRemoved() {
		result.Removed = append(result.Removed, RemovedTransaction{
			TransactionID: removed.GetTransactionId(),
		})
	}

	c.logger.Info("Transactions synced",
		zap.Int("added", len(result.Added)),
		zap.Int("modified", len(result.Modified)),
		zap.Int("removed", len(result.Removed)),
		zap.Bool("hasMore", result.HasMore),
	)

	return result, nil
}

// RemoveItem removes a Plaid item (disconnects bank)
func (c *PlaidClient) RemoveItem(ctx context.Context, accessToken string) error {
	c.logger.Debug("Removing Plaid item")

	request := plaid.NewItemRemoveRequest(accessToken)

	_, httpResp, err := c.client.PlaidApi.ItemRemove(ctx).ItemRemoveRequest(*request).Execute()
	if err != nil {
		c.logger.Error("Failed to remove item", zap.Error(err))
		return fmt.Errorf("failed to remove item: %w", err)
	}
	defer httpResp.Body.Close()

	c.logger.Info("Item removed")

	return nil
}

// VerifyWebhook verifies a Plaid webhook signature
func (c *PlaidClient) VerifyWebhook(payload []byte, signature string) (bool, error) {
	// Note: Plaid webhook verification is done via JWT validation
	// This is a placeholder - actual implementation would use plaid.VerifyWebhookSignature
	c.logger.Debug("Verifying webhook signature")

	// For now, return true - implement JWT verification in production
	// See: https://plaid.com/docs/api/webhooks/webhook-verification/
	return true, nil
}
