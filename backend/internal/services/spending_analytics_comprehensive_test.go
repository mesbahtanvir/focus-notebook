package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

func TestNewSpendingAnalyticsService(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()

	service := NewSpendingAnalyticsService(mockRepo, logger)

	require.NotNil(t, service)
}

func TestSpendingAnalyticsService_GetFloatField(t *testing.T) {
	service := &SpendingAnalyticsService{}

	tests := []struct {
		name     string
		data     map[string]interface{}
		field    string
		expected float64
	}{
		{"float64 value", map[string]interface{}{"amount": 99.99}, "amount", 99.99},
		{"int64 value", map[string]interface{}{"amount": int64(100)}, "amount", 100.0},
		{"int value", map[string]interface{}{"amount": 100}, "amount", 100.0},
		{"missing field", map[string]interface{}{}, "amount", 0},
		{"nil value", map[string]interface{}{"amount": nil}, "amount", 0},
		{"string value", map[string]interface{}{"amount": "100"}, "amount", 0},
		{"negative float", map[string]interface{}{"amount": -50.5}, "amount", -50.5},
		{"zero value", map[string]interface{}{"amount": float64(0)}, "amount", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getFloatField(tt.data, tt.field)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSpendingAnalyticsService_GetStringField(t *testing.T) {
	service := &SpendingAnalyticsService{}

	tests := []struct {
		name     string
		data     map[string]interface{}
		field    string
		expected string
	}{
		{"string value", map[string]interface{}{"category": "Food"}, "category", "Food"},
		{"missing field", map[string]interface{}{}, "category", ""},
		{"nil value", map[string]interface{}{"category": nil}, "category", ""},
		{"int value", map[string]interface{}{"category": 123}, "category", ""},
		{"empty string", map[string]interface{}{"category": ""}, "category", ""},
		{"unicode string", map[string]interface{}{"category": "日本食"}, "category", "日本食"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getStringField(tt.data, tt.field)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSpendingAnalyticsService_GetBoolField(t *testing.T) {
	service := &SpendingAnalyticsService{}

	tests := []struct {
		name     string
		data     map[string]interface{}
		field    string
		expected bool
	}{
		{"true value", map[string]interface{}{"isIncome": true}, "isIncome", true},
		{"false value", map[string]interface{}{"isIncome": false}, "isIncome", false},
		{"missing field", map[string]interface{}{}, "isIncome", false},
		{"nil value", map[string]interface{}{"isIncome": nil}, "isIncome", false},
		{"string value", map[string]interface{}{"isIncome": "true"}, "isIncome", false},
		{"int value", map[string]interface{}{"isIncome": 1}, "isIncome", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getBoolField(tt.data, tt.field)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSpendingAnalyticsService_GetSignedAmount(t *testing.T) {
	service := &SpendingAnalyticsService{}

	tests := []struct {
		name     string
		data     map[string]interface{}
		expected float64
	}{
		{"signedAmount positive", map[string]interface{}{"signedAmount": 100.0}, 100.0},
		{"signedAmount negative (income)", map[string]interface{}{"signedAmount": -50.0}, -50.0},
		{"amount with isIncome false", map[string]interface{}{"amount": 75.0, "isIncome": false}, 75.0},
		{"amount with isIncome true", map[string]interface{}{"amount": 75.0, "isIncome": true}, -75.0},
		{"amount only", map[string]interface{}{"amount": 50.0}, 50.0},
		{"no amount fields", map[string]interface{}{}, 0.0},
		{"signedAmount takes precedence", map[string]interface{}{"signedAmount": 100.0, "amount": 200.0}, 100.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getSignedAmount(tt.data)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSpendingAnalyticsService_GetMerchantName(t *testing.T) {
	service := &SpendingAnalyticsService{}

	tests := []struct {
		name     string
		data     map[string]interface{}
		expected string
	}{
		{
			"merchant object with name",
			map[string]interface{}{
				"merchant": map[string]interface{}{"name": "Starbucks"},
			},
			"Starbucks",
		},
		{
			"merchant as string",
			map[string]interface{}{
				"merchant": "Amazon",
			},
			"Amazon",
		},
		{
			"merchantName field",
			map[string]interface{}{
				"merchantName": "Walmart",
			},
			"Walmart",
		},
		{
			"originalDescription fallback",
			map[string]interface{}{
				"originalDescription": "AMAZON.COM",
			},
			"AMAZON.COM",
		},
		{
			"no merchant info",
			map[string]interface{}{},
			"",
		},
		{
			"merchant object empty name",
			map[string]interface{}{
				"merchant": map[string]interface{}{"name": ""},
			},
			"",
		},
		{
			"priority: merchant object over string",
			map[string]interface{}{
				"merchant":     map[string]interface{}{"name": "Priority"},
				"merchantName": "Fallback",
			},
			"Priority",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getMerchantName(tt.data)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSpendingAnalyticsService_ComputeStats(t *testing.T) {
	service := &SpendingAnalyticsService{}

	tests := []struct {
		name         string
		transactions []map[string]interface{}
		days         int
		wantSpend    float64
		wantIncome   float64
		wantCount    int
	}{
		{
			"empty transactions",
			[]map[string]interface{}{},
			30,
			0, 0, 0,
		},
		{
			"single spending transaction",
			[]map[string]interface{}{
				{"signedAmount": 100.0},
			},
			30,
			100.0, 0, 1,
		},
		{
			"single income transaction",
			[]map[string]interface{}{
				{"signedAmount": -500.0},
			},
			30,
			0, 500.0, 1,
		},
		{
			"mixed transactions",
			[]map[string]interface{}{
				{"signedAmount": 100.0},
				{"signedAmount": 50.0},
				{"signedAmount": -200.0},
			},
			30,
			150.0, 200.0, 3,
		},
		{
			"with subscriptions",
			[]map[string]interface{}{
				{"signedAmount": 15.0, "subscription": true},
				{"signedAmount": 9.99, "isSubscription": true},
				{"signedAmount": 100.0},
			},
			30,
			124.99, 0, 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stats := service.computeStats(tt.transactions, tt.days)

			assert.Equal(t, tt.wantCount, stats.TransactionCount)
			assert.InDelta(t, tt.wantSpend, stats.TotalSpend, 0.01)
			assert.InDelta(t, tt.wantIncome, stats.TotalIncome, 0.01)
		})
	}
}

func TestSpendingAnalyticsService_ComputeStats_AvgDailySpend(t *testing.T) {
	service := &SpendingAnalyticsService{}

	transactions := []map[string]interface{}{
		{"signedAmount": 100.0},
		{"signedAmount": 200.0},
	}

	stats := service.computeStats(transactions, 30)

	expectedAvg := 300.0 / 30.0 // 10.0
	assert.InDelta(t, expectedAvg, stats.AvgDailySpend, 0.01)
}

func TestSpendingAnalyticsService_ComputeStats_ZeroDays(t *testing.T) {
	service := &SpendingAnalyticsService{}

	transactions := []map[string]interface{}{
		{"signedAmount": 100.0},
	}

	stats := service.computeStats(transactions, 0)

	// Should not divide by zero
	assert.Equal(t, 0.0, stats.AvgDailySpend)
}

func TestSpendingAnalyticsService_ComputeCategoryBreakdown(t *testing.T) {
	service := &SpendingAnalyticsService{}

	transactions := []map[string]interface{}{
		{"signedAmount": 100.0, "category": "Food"},
		{"signedAmount": 50.0, "category": "Food"},
		{"signedAmount": 200.0, "category": "Shopping"},
		{"signedAmount": 75.0, "category": "Transportation"},
		{"signedAmount": -500.0, "category": "Income"}, // Should be ignored
	}

	breakdown := service.computeCategoryBreakdown(transactions)

	// Should be sorted by value descending
	require.GreaterOrEqual(t, len(breakdown), 3)
	assert.Equal(t, "Shopping", breakdown[0].Name)
	assert.Equal(t, 200.0, breakdown[0].Value)
	assert.Equal(t, "Food", breakdown[1].Name)
	assert.Equal(t, 150.0, breakdown[1].Value)
}

func TestSpendingAnalyticsService_ComputeCategoryBreakdown_Uncategorized(t *testing.T) {
	service := &SpendingAnalyticsService{}

	transactions := []map[string]interface{}{
		{"signedAmount": 100.0},                     // No category
		{"signedAmount": 50.0, "category": ""},      // Empty category
		{"signedAmount": 75.0, "category": "Other"}, // Has category
	}

	breakdown := service.computeCategoryBreakdown(transactions)

	// Find uncategorized
	var uncategorized float64
	for _, item := range breakdown {
		if item.Name == "Uncategorized" {
			uncategorized = item.Value
			break
		}
	}
	assert.Equal(t, 150.0, uncategorized)
}

func TestSpendingAnalyticsService_ComputeCategoryBreakdown_Max8(t *testing.T) {
	service := &SpendingAnalyticsService{}

	// Create transactions with 10 different categories
	transactions := []map[string]interface{}{}
	for i := 0; i < 10; i++ {
		transactions = append(transactions, map[string]interface{}{
			"signedAmount": float64(100 - i*10),
			"category":     string(rune('A' + i)),
		})
	}

	breakdown := service.computeCategoryBreakdown(transactions)

	// Should return max 8 categories
	assert.LessOrEqual(t, len(breakdown), 8)
}

func TestSpendingAnalyticsService_ComputeAccountBreakdown(t *testing.T) {
	service := &SpendingAnalyticsService{}

	transactions := []map[string]interface{}{
		{"signedAmount": 100.0, "accountName": "Checking"},
		{"signedAmount": 200.0, "accountName": "Credit Card"},
		{"signedAmount": 50.0, "accountName": "Checking"},
		{"signedAmount": -500.0, "accountName": "Checking"}, // Income, ignored
	}

	breakdown := service.computeAccountBreakdown(transactions)

	require.GreaterOrEqual(t, len(breakdown), 2)

	// Should be sorted by value descending
	assert.Equal(t, "Credit Card", breakdown[0].Name)
	assert.Equal(t, 200.0, breakdown[0].Value)
	assert.Equal(t, "Checking", breakdown[1].Name)
	assert.Equal(t, 150.0, breakdown[1].Value)
}

func TestSpendingAnalyticsService_ComputeTrendData(t *testing.T) {
	service := &SpendingAnalyticsService{}

	transactions := []map[string]interface{}{
		{"signedAmount": 50.0, "postedAt": "2024-01-01"},
		{"signedAmount": 30.0, "postedAt": "2024-01-01"},
		{"signedAmount": 100.0, "postedAt": "2024-01-02"},
		{"signedAmount": -200.0, "postedAt": "2024-01-02"}, // Income
	}

	trend := service.computeTrendData(transactions)

	require.Len(t, trend, 2)

	// Should be sorted by date ascending
	assert.Equal(t, "2024-01-01", trend[0].Date)
	assert.Equal(t, 80.0, trend[0].Spend)
	assert.Equal(t, 0.0, trend[0].Income)

	assert.Equal(t, "2024-01-02", trend[1].Date)
	assert.Equal(t, 100.0, trend[1].Spend)
	assert.Equal(t, 200.0, trend[1].Income)
}

func TestSpendingAnalyticsService_ComputeTopMerchants(t *testing.T) {
	service := &SpendingAnalyticsService{}

	transactions := []map[string]interface{}{
		{"signedAmount": 50.0, "merchantName": "Amazon"},
		{"signedAmount": 100.0, "merchantName": "Amazon"},
		{"signedAmount": 75.0, "merchantName": "Starbucks"},
		{"signedAmount": 25.0, "merchantName": "Target"},
		{"signedAmount": -500.0, "merchantName": "Employer"}, // Income, ignored
	}

	merchants := service.computeTopMerchants(transactions)

	require.GreaterOrEqual(t, len(merchants), 3)

	// Should be sorted by value descending
	assert.Equal(t, "Amazon", merchants[0].Name)
	assert.Equal(t, 150.0, merchants[0].Value)
	assert.Equal(t, "Starbucks", merchants[1].Name)
	assert.Equal(t, 75.0, merchants[1].Value)
}

func TestSpendingAnalyticsService_ComputeTopMerchants_Max5(t *testing.T) {
	service := &SpendingAnalyticsService{}

	// Create transactions with 10 different merchants
	transactions := []map[string]interface{}{}
	for i := 0; i < 10; i++ {
		transactions = append(transactions, map[string]interface{}{
			"signedAmount": float64(100 - i*10),
			"merchantName": string(rune('A' + i)),
		})
	}

	merchants := service.computeTopMerchants(transactions)

	// Should return max 5 merchants
	assert.LessOrEqual(t, len(merchants), 5)
}

func TestSpendingAnalyticsService_ComputeSpendingAnalytics(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewSpendingAnalyticsService(mockRepo, logger)

	ctx := context.Background()
	uid := "test-user-123"

	// Add test transactions
	mockRepo.AddDocument("users/"+uid+"/transactions/txn1", map[string]interface{}{
		"id":           "txn1",
		"signedAmount": 100.0,
		"postedAt":     "2024-01-15",
		"accountName":  "Checking",
		"category":     "Food",
		"merchantName": "Starbucks",
	})
	mockRepo.AddDocument("users/"+uid+"/transactions/txn2", map[string]interface{}{
		"id":           "txn2",
		"signedAmount": 200.0,
		"postedAt":     "2024-01-16",
		"accountName":  "Credit Card",
		"category":     "Shopping",
		"merchantName": "Amazon",
	})

	analytics, err := service.ComputeSpendingAnalytics(ctx, uid, "2024-01-01", "2024-01-31", nil)

	require.NoError(t, err)
	require.NotNil(t, analytics)

	assert.Equal(t, "2024-01-01", analytics.DateRange.Start)
	assert.Equal(t, "2024-01-31", analytics.DateRange.End)
	assert.Equal(t, 31, analytics.DateRange.Days)
}

func TestSpendingAnalyticsService_ComputeSpendingAnalytics_InvalidDate(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewSpendingAnalyticsService(mockRepo, logger)

	ctx := context.Background()

	_, err := service.ComputeSpendingAnalytics(ctx, "user", "invalid", "2024-01-31", nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid start date")

	_, err = service.ComputeSpendingAnalytics(ctx, "user", "2024-01-01", "invalid", nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid end date")
}
