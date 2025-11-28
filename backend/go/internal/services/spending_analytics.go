package services

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"cloud.google.com/go/firestore"
	"go.uber.org/zap"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend/go/internal/repository"
)

// SpendingAnalyticsService handles spending analytics computations
type SpendingAnalyticsService struct {
	repo   *repository.FirestoreRepository
	logger *zap.Logger
}

// NewSpendingAnalyticsService creates a new spending analytics service
func NewSpendingAnalyticsService(repo *repository.FirestoreRepository, logger *zap.Logger) *SpendingAnalyticsService {
	return &SpendingAnalyticsService{
		repo:   repo,
		logger: logger,
	}
}

// SpendingAnalytics holds the complete spending analytics response
type SpendingAnalytics struct {
	Stats            SpendingStats              `json:"stats"`
	CategoryBreakdown []CategoryItem            `json:"categoryBreakdown"`
	AccountBreakdown  []AccountItem             `json:"accountBreakdown"`
	TrendData        []TrendItem                `json:"trendData"`
	TopMerchants     []MerchantItem             `json:"topMerchants"`
	DateRange        DateRangeInfo              `json:"dateRange"`
}

// SpendingStats holds overall spending statistics
type SpendingStats struct {
	TotalSpend        float64 `json:"totalSpend"`
	TotalIncome       float64 `json:"totalIncome"`
	AvgDailySpend     float64 `json:"avgDailySpend"`
	SubscriptionSpend float64 `json:"subscriptionSpend"`
	SubscriptionCount int     `json:"subscriptionCount"`
	TransactionCount  int     `json:"transactionCount"`
}

// CategoryItem holds spending by category
type CategoryItem struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}

// AccountItem holds spending by account
type AccountItem struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}

// TrendItem holds daily spending trend
type TrendItem struct {
	Date   string  `json:"date"`
	Spend  float64 `json:"spend"`
	Income float64 `json:"income"`
}

// MerchantItem holds spending by merchant
type MerchantItem struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}

// DateRangeInfo holds date range information
type DateRangeInfo struct {
	Start string `json:"start"`
	End   string `json:"end"`
	Days  int    `json:"days"`
}

// ComputeSpendingAnalytics computes spending analytics for a user
func (s *SpendingAnalyticsService) ComputeSpendingAnalytics(ctx context.Context, uid string, startDate, endDate string, accountIDs []string) (*SpendingAnalytics, error) {
	s.logger.Debug("Computing spending analytics",
		zap.String("uid", uid),
		zap.String("startDate", startDate),
		zap.String("endDate", endDate),
		zap.Int("accountCount", len(accountIDs)),
	)

	// Parse dates
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start date: %w", err)
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end date: %w", err)
	}

	// Fetch transactions
	transactions, err := s.fetchTransactions(ctx, uid, start, end, accountIDs)
	if err != nil {
		return nil, err
	}

	s.logger.Debug("Fetched transactions",
		zap.Int("count", len(transactions)),
	)

	// Calculate days in range
	days := int(math.Round(end.Sub(start).Hours()/24)) + 1

	// Compute analytics
	analytics := &SpendingAnalytics{
		DateRange: DateRangeInfo{
			Start: startDate,
			End:   endDate,
			Days:  days,
		},
	}

	// Compute stats
	analytics.Stats = s.computeStats(transactions, days)

	// Compute category breakdown
	analytics.CategoryBreakdown = s.computeCategoryBreakdown(transactions)

	// Compute account breakdown
	analytics.AccountBreakdown = s.computeAccountBreakdown(transactions)

	// Compute trend data
	analytics.TrendData = s.computeTrendData(transactions)

	// Compute top merchants
	analytics.TopMerchants = s.computeTopMerchants(transactions)

	s.logger.Info("Spending analytics computed",
		zap.String("uid", uid),
		zap.Int("transactions", analytics.Stats.TransactionCount),
		zap.Float64("totalSpend", analytics.Stats.TotalSpend),
	)

	return analytics, nil
}

// fetchTransactions fetches transactions for a user in date range
func (s *SpendingAnalyticsService) fetchTransactions(ctx context.Context, uid string, startDate, endDate time.Time, accountIDs []string) ([]map[string]interface{}, error) {
	// Start with base query
	query := s.repo.Client().Collection(fmt.Sprintf("users/%s/transactions", uid)).
		Where("postedAt", ">=", startDate.Format("2006-01-02")).
		Where("postedAt", "<=", endDate.Format("2006-01-02"))

	// Filter by account IDs if provided
	if len(accountIDs) > 0 {
		query = query.Where("accountId", "in", accountIDs)
	}

	query = query.OrderBy("postedAt", firestore.Desc)

	iter := query.Documents(ctx)
	defer iter.Stop()

	var transactions []map[string]interface{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		txn := doc.Data()
		txn["id"] = doc.Ref.ID
		transactions = append(transactions, txn)
	}

	return transactions, nil
}

// computeStats computes overall spending statistics
func (s *SpendingAnalyticsService) computeStats(transactions []map[string]interface{}, days int) SpendingStats {
	stats := SpendingStats{
		TransactionCount: len(transactions),
	}

	for _, txn := range transactions {
		// Get signedAmount (positive = spend, negative = income)
		signedAmount := s.getFloatField(txn, "signedAmount")
		if signedAmount == 0 {
			// Fallback to amount field if signedAmount not present
			amount := s.getFloatField(txn, "amount")
			isIncome := s.getBoolField(txn, "isIncome")
			if isIncome {
				signedAmount = -amount
			} else {
				signedAmount = amount
			}
		}

		if signedAmount >= 0 {
			// Spending
			stats.TotalSpend += signedAmount

			// Check if subscription
			if s.getBoolField(txn, "subscription") || s.getBoolField(txn, "isSubscription") {
				stats.SubscriptionSpend += signedAmount
				stats.SubscriptionCount++
			}
		} else {
			// Income
			stats.TotalIncome += math.Abs(signedAmount)
		}
	}

	// Calculate average daily spend
	if days > 0 {
		stats.AvgDailySpend = stats.TotalSpend / float64(days)
	}

	return stats
}

// computeCategoryBreakdown computes spending by category
func (s *SpendingAnalyticsService) computeCategoryBreakdown(transactions []map[string]interface{}) []CategoryItem {
	totals := make(map[string]float64)

	for _, txn := range transactions {
		signedAmount := s.getSignedAmount(txn)
		if signedAmount <= 0 {
			continue // Skip income
		}

		category := s.getStringField(txn, "category")
		if category == "" {
			// Try category_base (array)
			if catBase, ok := txn["category_base"].([]interface{}); ok && len(catBase) > 0 {
				if cat, ok := catBase[0].(string); ok {
					category = cat
				}
			}
		}
		if category == "" {
			category = "Uncategorized"
		}

		totals[category] += signedAmount
	}

	// Convert to slice and sort
	items := make([]CategoryItem, 0, len(totals))
	for name, value := range totals {
		items = append(items, CategoryItem{
			Name:  name,
			Value: value,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Value > items[j].Value
	})

	// Return top 8
	if len(items) > 8 {
		items = items[:8]
	}

	return items
}

// computeAccountBreakdown computes spending by account
func (s *SpendingAnalyticsService) computeAccountBreakdown(transactions []map[string]interface{}) []AccountItem {
	totals := make(map[string]float64)

	for _, txn := range transactions {
		signedAmount := s.getSignedAmount(txn)
		if signedAmount <= 0 {
			continue // Skip income
		}

		accountName := s.getStringField(txn, "accountName")
		if accountName == "" {
			accountName = "Unknown Account"
		}

		totals[accountName] += signedAmount
	}

	// Convert to slice and sort
	items := make([]AccountItem, 0, len(totals))
	for name, value := range totals {
		items = append(items, AccountItem{
			Name:  name,
			Value: value,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Value > items[j].Value
	})

	return items
}

// computeTrendData computes daily spending trend
func (s *SpendingAnalyticsService) computeTrendData(transactions []map[string]interface{}) []TrendItem {
	daily := make(map[string]*TrendItem)

	for _, txn := range transactions {
		// Get date (postedAt field)
		date := s.getStringField(txn, "postedAt")
		if date == "" {
			continue
		}

		if daily[date] == nil {
			daily[date] = &TrendItem{
				Date:   date,
				Spend:  0,
				Income: 0,
			}
		}

		signedAmount := s.getSignedAmount(txn)
		if signedAmount >= 0 {
			daily[date].Spend += signedAmount
		} else {
			daily[date].Income += math.Abs(signedAmount)
		}
	}

	// Convert to slice and sort by date
	items := make([]TrendItem, 0, len(daily))
	for _, item := range daily {
		// Round values
		item.Spend = math.Round(item.Spend)
		item.Income = math.Round(item.Income)
		items = append(items, *item)
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Date < items[j].Date
	})

	return items
}

// computeTopMerchants computes top merchants by spending
func (s *SpendingAnalyticsService) computeTopMerchants(transactions []map[string]interface{}) []MerchantItem {
	totals := make(map[string]float64)

	for _, txn := range transactions {
		signedAmount := s.getSignedAmount(txn)
		if signedAmount <= 0 {
			continue // Skip income
		}

		merchant := s.getMerchantName(txn)
		if merchant == "" {
			merchant = "Unknown"
		}

		totals[merchant] += signedAmount
	}

	// Convert to slice and sort
	items := make([]MerchantItem, 0, len(totals))
	for name, value := range totals {
		items = append(items, MerchantItem{
			Name:  name,
			Value: value,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Value > items[j].Value
	})

	// Return top 5
	if len(items) > 5 {
		items = items[:5]
	}

	return items
}

// Helper functions

func (s *SpendingAnalyticsService) getSignedAmount(txn map[string]interface{}) float64 {
	// Try signedAmount first
	if signedAmount := s.getFloatField(txn, "signedAmount"); signedAmount != 0 {
		return signedAmount
	}

	// Fallback to amount + isIncome
	amount := s.getFloatField(txn, "amount")
	isIncome := s.getBoolField(txn, "isIncome")
	if isIncome {
		return -amount
	}
	return amount
}

func (s *SpendingAnalyticsService) getMerchantName(txn map[string]interface{}) string {
	// Try merchant.name first (object)
	if merchant, ok := txn["merchant"].(map[string]interface{}); ok {
		if name, ok := merchant["name"].(string); ok && name != "" {
			return name
		}
	}

	// Try merchant as string
	if merchant, ok := txn["merchant"].(string); ok && merchant != "" {
		return merchant
	}

	// Try merchantName field
	if merchantName, ok := txn["merchantName"].(string); ok && merchantName != "" {
		return merchantName
	}

	// Try originalDescription
	if desc, ok := txn["originalDescription"].(string); ok && desc != "" {
		return desc
	}

	return ""
}

func (s *SpendingAnalyticsService) getFloatField(txn map[string]interface{}, field string) float64 {
	if val, ok := txn[field].(float64); ok {
		return val
	}
	if val, ok := txn[field].(int64); ok {
		return float64(val)
	}
	if val, ok := txn[field].(int); ok {
		return float64(val)
	}
	return 0
}

func (s *SpendingAnalyticsService) getStringField(txn map[string]interface{}, field string) string {
	if val, ok := txn[field].(string); ok {
		return val
	}
	return ""
}

func (s *SpendingAnalyticsService) getBoolField(txn map[string]interface{}, field string) bool {
	if val, ok := txn[field].(bool); ok {
		return val
	}
	return false
}
