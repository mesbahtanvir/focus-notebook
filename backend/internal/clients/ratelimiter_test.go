package clients

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewRateLimiter(t *testing.T) {
	rl := NewRateLimiter(60, 4000)

	assert.NotNil(t, rl)
	assert.Equal(t, 60, rl.requestsPerMinute)
	assert.Equal(t, 4000, rl.tokensPerMinute)
	assert.Equal(t, 60, rl.requestTokens)
	assert.Equal(t, 4000, rl.aiTokens)
}

func TestRateLimiter_WaitForRequest_HasTokens(t *testing.T) {
	rl := NewRateLimiter(10, 1000)

	ctx := context.Background()
	err := rl.WaitForRequest(ctx)

	assert.NoError(t, err)
	// Request tokens should be decremented
	assert.Equal(t, 9, rl.requestTokens)
}

func TestRateLimiter_WaitForRequest_MultipleRequests(t *testing.T) {
	rl := NewRateLimiter(5, 1000)

	ctx := context.Background()
	for i := 0; i < 5; i++ {
		err := rl.WaitForRequest(ctx)
		assert.NoError(t, err)
	}

	// All tokens should be exhausted
	assert.Equal(t, 0, rl.requestTokens)
}

func TestRateLimiter_WaitForRequest_ContextCanceled(t *testing.T) {
	rl := NewRateLimiter(1, 1000)
	rl.requestTokens = 0 // Exhaust tokens

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Immediately cancel

	err := rl.WaitForRequest(ctx)

	assert.Error(t, err)
	assert.Equal(t, context.Canceled, err)
}

func TestRateLimiter_WaitForRequest_ContextTimeout(t *testing.T) {
	rl := NewRateLimiter(1, 1000)
	rl.requestTokens = 0 // Exhaust tokens

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	err := rl.WaitForRequest(ctx)

	assert.Error(t, err)
	assert.Equal(t, context.DeadlineExceeded, err)
}

func TestRateLimiter_RecordTokens_ValidAmount(t *testing.T) {
	rl := NewRateLimiter(10, 1000)
	initialTokens := rl.aiTokens

	rl.RecordTokens(100)

	assert.Equal(t, initialTokens-100, rl.aiTokens)
}

func TestRateLimiter_RecordTokens_ExceedsAvailable(t *testing.T) {
	rl := NewRateLimiter(10, 100)

	rl.RecordTokens(200) // More than available

	// Should clamp to 0, not go negative
	assert.Equal(t, 0, rl.aiTokens)
}

func TestRateLimiter_RecordTokens_ZeroTokens(t *testing.T) {
	rl := NewRateLimiter(10, 1000)
	initialTokens := rl.aiTokens

	rl.RecordTokens(0)

	assert.Equal(t, initialTokens, rl.aiTokens)
}

func TestRateLimiter_GetStats_InitialState(t *testing.T) {
	rl := NewRateLimiter(60, 4000)

	requestTokens, aiTokens := rl.GetStats()

	assert.Equal(t, 60, requestTokens)
	assert.Equal(t, 4000, aiTokens)
}

func TestRateLimiter_GetStats_AfterWait(t *testing.T) {
	rl := NewRateLimiter(10, 1000)

	ctx := context.Background()
	err := rl.WaitForRequest(ctx)
	require.NoError(t, err)

	requestTokens, aiTokens := rl.GetStats()

	assert.Equal(t, 9, requestTokens)
	assert.Equal(t, 1000, aiTokens)
}

func TestRateLimiter_GetStats_AfterRecordTokens(t *testing.T) {
	rl := NewRateLimiter(10, 1000)

	rl.RecordTokens(100)

	requestTokens, aiTokens := rl.GetStats()

	assert.Equal(t, 10, requestTokens)
	assert.Equal(t, 900, aiTokens)
}

func TestRateLimiter_TokenRefill_AfterTime(t *testing.T) {
	rl := NewRateLimiter(60, 1000)
	rl.requestTokens = 0
	rl.lastRefill = time.Now().Add(-2 * time.Second)

	requestTokens, _ := rl.GetStats()

	// Should have refilled approximately 2 tokens (60 per minute / 60 seconds = 1 per second * 2)
	assert.Greater(t, requestTokens, 0)
}

func TestRateLimiter_TokenRefill_NoRefillIfLessThanSecond(t *testing.T) {
	rl := NewRateLimiter(60, 1000)
	initialTokens := rl.requestTokens
	rl.lastRefill = time.Now().Add(-100 * time.Millisecond)

	requestTokens, _ := rl.GetStats()

	// Should not refill if less than a second has elapsed
	assert.Equal(t, initialTokens, requestTokens)
}

func TestRateLimiter_TokenRefill_CapsAtMaximum(t *testing.T) {
	rl := NewRateLimiter(100, 2000)
	// Simulate significant time passage
	rl.lastRefill = time.Now().Add(-1 * time.Hour)

	requestTokens, aiTokens := rl.GetStats()

	// Should not exceed the maximum
	assert.Equal(t, 100, requestTokens)
	assert.Equal(t, 2000, aiTokens)
}

func TestRateLimiter_ConcurrentRequests(t *testing.T) {
	rl := NewRateLimiter(10, 1000)

	ctx := context.Background()
	successCount := 0
	errorCount := 0

	// Try to make more requests concurrently than available tokens
	for i := 0; i < 10; i++ {
		err := rl.WaitForRequest(ctx)
		if err == nil {
			successCount++
		} else {
			errorCount++
		}
	}

	assert.Equal(t, 10, successCount)
	assert.Equal(t, 0, rl.requestTokens)
}

func TestRateLimiter_CalculateWaitTime(t *testing.T) {
	rl := NewRateLimiter(60, 1000)

	waitTime := rl.calculateWaitTime()

	assert.Equal(t, time.Second, waitTime)
}

func TestRateLimiter_RefillTokens_Proportional(t *testing.T) {
	rl := NewRateLimiter(120, 4800) // 2 per second, 80 per second
	rl.requestTokens = 0
	rl.aiTokens = 0

	// Simulate 5 seconds elapsed
	rl.lastRefill = time.Now().Add(-5 * time.Second)

	requestTokens, aiTokens := rl.GetStats()

	// Should have 2*5 = 10 request tokens
	assert.Greater(t, requestTokens, 0)
	assert.Greater(t, aiTokens, 0)
}

func TestRateLimiter_RecordTokens_NegativeClampsToZero(t *testing.T) {
	rl := NewRateLimiter(10, 100)
	rl.aiTokens = 50

	rl.RecordTokens(100)

	// Should be clamped to 0, not negative
	assert.Equal(t, 0, rl.aiTokens)
}

func TestRateLimiter_MutexLocking_RecordTokens(t *testing.T) {
	rl := NewRateLimiter(10, 1000)

	// Should complete without deadlock
	rl.RecordTokens(100)
	rl.RecordTokens(200)

	assert.Equal(t, 700, rl.aiTokens)
}

func TestRateLimiter_MutexLocking_GetStats(t *testing.T) {
	rl := NewRateLimiter(10, 1000)

	// Should complete without deadlock
	rt1, at1 := rl.GetStats()
	rt2, at2 := rl.GetStats()

	assert.Equal(t, rt1, rt2)
	assert.Equal(t, at1, at2)
}

func TestRateLimiter_ZeroRequestsPerMinute(t *testing.T) {
	rl := NewRateLimiter(0, 1000)

	assert.NotNil(t, rl)
	assert.Equal(t, 0, rl.requestTokens)
}

func TestRateLimiter_ZeroTokensPerMinute(t *testing.T) {
	rl := NewRateLimiter(60, 0)

	assert.NotNil(t, rl)
	assert.Equal(t, 0, rl.aiTokens)
}

func TestRateLimiter_HighValues(t *testing.T) {
	rl := NewRateLimiter(100000, 1000000)

	assert.Equal(t, 100000, rl.requestTokens)
	assert.Equal(t, 1000000, rl.aiTokens)

	ctx := context.Background()
	err := rl.WaitForRequest(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 99999, rl.requestTokens)
}
