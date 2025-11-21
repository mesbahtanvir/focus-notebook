package clients

import (
	"context"
	"sync"
	"time"
)

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	requestsPerMinute int
	tokensPerMinute   int

	requestTokens     int
	aiTokens          int
	lastRefill        time.Time

	mu sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(requestsPerMinute, tokensPerMinute int) *RateLimiter {
	return &RateLimiter{
		requestsPerMinute: requestsPerMinute,
		tokensPerMinute:   tokensPerMinute,
		requestTokens:     requestsPerMinute,
		aiTokens:          tokensPerMinute,
		lastRefill:        time.Now(),
	}
}

// WaitForRequest waits until a request can be made
func (r *RateLimiter) WaitForRequest(ctx context.Context) error {
	for {
		r.mu.Lock()

		// Refill tokens based on time elapsed
		r.refillTokens()

		// Check if we have request tokens available
		if r.requestTokens > 0 {
			r.requestTokens--
			r.mu.Unlock()
			return nil
		}

		// Calculate wait time
		waitTime := r.calculateWaitTime()
		r.mu.Unlock()

		// Wait for tokens to refill
		select {
		case <-time.After(waitTime):
			continue
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

// RecordTokens records AI tokens used
func (r *RateLimiter) RecordTokens(tokens int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.aiTokens -= tokens
	if r.aiTokens < 0 {
		r.aiTokens = 0
	}
}

// refillTokens refills the token buckets based on elapsed time
func (r *RateLimiter) refillTokens() {
	now := time.Now()
	elapsed := now.Sub(r.lastRefill)

	if elapsed < time.Second {
		return
	}

	// Calculate tokens to add (proportional to time elapsed)
	secondsElapsed := elapsed.Seconds()

	// Refill request tokens
	requestTokensToAdd := int(secondsElapsed * float64(r.requestsPerMinute) / 60.0)
	r.requestTokens += requestTokensToAdd
	if r.requestTokens > r.requestsPerMinute {
		r.requestTokens = r.requestsPerMinute
	}

	// Refill AI tokens
	aiTokensToAdd := int(secondsElapsed * float64(r.tokensPerMinute) / 60.0)
	r.aiTokens += aiTokensToAdd
	if r.aiTokens > r.tokensPerMinute {
		r.aiTokens = r.tokensPerMinute
	}

	r.lastRefill = now
}

// calculateWaitTime calculates how long to wait for tokens
func (r *RateLimiter) calculateWaitTime() time.Duration {
	// Wait for 1 second worth of tokens
	return time.Second
}

// GetStats returns current rate limiter stats
func (r *RateLimiter) GetStats() (requestTokens, aiTokens int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.refillTokens()
	return r.requestTokens, r.aiTokens
}
