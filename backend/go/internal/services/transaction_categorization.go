package services

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/models"
	"go.uber.org/zap"
)

// TransactionCategorizationService handles AI-powered transaction categorization
type TransactionCategorizationService struct {
	openaiClient *clients.OpenAIClient
	logger       *zap.Logger
}

// NewTransactionCategorizationService creates a new categorization service
func NewTransactionCategorizationService(
	openaiClient *clients.OpenAIClient,
	logger *zap.Logger,
) *TransactionCategorizationService {
	return &TransactionCategorizationService{
		openaiClient: openaiClient,
		logger:       logger,
	}
}

// EnhanceTransactions enhances a batch of transactions with AI categorization
func (s *TransactionCategorizationService) EnhanceTransactions(
	ctx context.Context,
	transactions []models.CSVTransaction,
) (*models.EnhancementResult, error) {
	if len(transactions) == 0 {
		return &models.EnhancementResult{
			Transactions: []models.EnhancedTransaction{},
			Summary: models.EnhancementSummary{
				TotalProcessed:        0,
				CategoriesUsed:        []string{},
				SubscriptionsDetected: 0,
			},
		}, nil
	}

	s.logger.Info("Enhancing transactions",
		zap.Int("count", len(transactions)),
	)

	// Build the prompt
	systemMessage := s.buildSystemPrompt()
	userMessage := s.buildUserPrompt(transactions)

	// Call OpenAI
	response, err := s.openaiClient.ChatCompletion(ctx, clients.ChatCompletionRequest{
		Model: "gpt-4o",
		Messages: []clients.ChatMessage{
			{Role: "system", Content: systemMessage},
			{Role: "user", Content: userMessage},
		},
		Temperature:    0.3,
		MaxTokens:      2000,
		ResponseFormat: &clients.ResponseFormat{Type: "json_object"},
	})

	if err != nil {
		return nil, fmt.Errorf("failed to call OpenAI: %w", err)
	}

	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	aiResponse := response.Choices[0].Message.Content

	// Parse the response
	result, err := s.parseAIResponse(aiResponse, len(transactions))
	if err != nil {
		s.logger.Error("Failed to parse AI response",
			zap.Error(err),
			zap.String("response", aiResponse),
		)
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	s.logger.Info("Successfully enhanced transactions",
		zap.Int("total", result.Summary.TotalProcessed),
		zap.Int("categories", len(result.Summary.CategoriesUsed)),
		zap.Int("subscriptions", result.Summary.SubscriptionsDetected),
	)

	return result, nil
}

// buildSystemPrompt creates the system prompt for transaction enhancement
func (s *TransactionCategorizationService) buildSystemPrompt() string {
	return `You are a financial transaction categorization assistant.

Your task is to analyze transaction descriptions and provide:
1. A clean merchant name
2. A specific category from the list below
3. Whether it's a recurring subscription
4. Any relevant notes

Categories (use these exactly):
- Groceries
- Restaurants & Dining
- Transportation
- Shopping
- Entertainment
- Healthcare
- Bills & Utilities
- Housing
- Insurance
- Travel
- Education
- Personal Care
- Gifts & Donations
- Business Expenses
- Investments
- Transfers
- Fees & Charges
- Other

Rules:
- Extract clean merchant names (e.g., "AMZN MKTP US" → "Amazon")
- Categorize accurately based on the description
- Mark subscriptions (Netflix, Spotify, gym memberships, etc.) as isSubscription: true
- Keep notes brief and relevant
- Return valid JSON matching this schema:
{
  "transactions": [
    {
      "originalDescription": "original description from input",
      "merchantName": "Clean Merchant Name",
      "category": "Category Name",
      "isSubscription": false,
      "notes": "Brief note if relevant"
    }
  ],
  "summary": {
    "totalProcessed": 0,
    "categoriesUsed": [],
    "subscriptionsDetected": 0
  }
}`
}

// buildUserPrompt creates the user prompt with transaction data
func (s *TransactionCategorizationService) buildUserPrompt(transactions []models.CSVTransaction) string {
	transactionsJSON, _ := json.MarshalIndent(transactions, "", "  ")
	return fmt.Sprintf("Please categorize and enhance these transactions:\n\n%s", string(transactionsJSON))
}

// parseAIResponse parses the AI response into structured data
func (s *TransactionCategorizationService) parseAIResponse(aiResponse string, expectedCount int) (*models.EnhancementResult, error) {
	// Try to extract JSON from the response
	jsonStr := extractJSON(aiResponse)

	var result models.EnhancementResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		// Try alternative parsing strategies
		result = s.tryAlternativeParsing(aiResponse, expectedCount)
	}

	// Validate and fill in summary if missing
	if result.Summary.TotalProcessed == 0 {
		result.Summary = s.buildSummary(result.Transactions, expectedCount)
	}

	return &result, nil
}

// tryAlternativeParsing attempts alternative parsing strategies
func (s *TransactionCategorizationService) tryAlternativeParsing(aiResponse string, expectedCount int) models.EnhancementResult {
	// Try parsing as array directly
	var transactions []models.EnhancedTransaction
	if err := json.Unmarshal([]byte(extractJSON(aiResponse)), &transactions); err == nil {
		return models.EnhancementResult{
			Transactions: transactions,
			Summary:      s.buildSummary(transactions, expectedCount),
		}
	}

	// Return empty result if all parsing fails
	s.logger.Warn("Failed to parse AI response, returning empty result")
	return models.EnhancementResult{
		Transactions: []models.EnhancedTransaction{},
		Summary: models.EnhancementSummary{
			TotalProcessed:        0,
			CategoriesUsed:        []string{},
			SubscriptionsDetected: 0,
		},
	}
}

// buildSummary builds a summary from enhanced transactions
func (s *TransactionCategorizationService) buildSummary(transactions []models.EnhancedTransaction, expectedCount int) models.EnhancementSummary {
	categoriesMap := make(map[string]bool)
	subscriptions := 0

	for _, tx := range transactions {
		if tx.Category != "" {
			categoriesMap[tx.Category] = true
		}
		if tx.IsSubscription {
			subscriptions++
		}
	}

	categories := make([]string, 0, len(categoriesMap))
	for category := range categoriesMap {
		categories = append(categories, category)
	}

	totalProcessed := len(transactions)
	if totalProcessed == 0 && expectedCount > 0 {
		totalProcessed = expectedCount
	}

	return models.EnhancementSummary{
		TotalProcessed:        totalProcessed,
		CategoriesUsed:        categories,
		SubscriptionsDetected: subscriptions,
	}
}

// extractJSON extracts JSON from a string that may contain markdown or other formatting
func extractJSON(s string) string {
	// Try to find JSON in markdown code blocks
	re := regexp.MustCompile("```(?:json)?\\s*([\\s\\S]*?)```")
	matches := re.FindStringSubmatch(s)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}

	// Try to find JSON by braces
	firstBrace := strings.Index(s, "{")
	lastBrace := strings.LastIndex(s, "}")
	if firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace {
		return strings.TrimSpace(s[firstBrace : lastBrace+1])
	}

	// Return trimmed string as-is
	return strings.TrimSpace(s)
}
