package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"firebase.google.com/go/v4/auth"
	"cloud.google.com/go/firestore"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/models"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
)

const (
	AnonymousSessionCollection = "anonymousSessions"
)

// AuthMiddleware verifies Firebase ID tokens
// Matches verifyAiRequest from src/lib/server/verifyAiRequest.ts
type AuthMiddleware struct {
	authClient      *auth.Client
	firestoreClient *firestore.Client
	overrideKey     string
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(authClient *auth.Client, firestoreClient *firestore.Client, overrideKey string) *AuthMiddleware {
	return &AuthMiddleware{
		authClient:      authClient,
		firestoreClient: firestoreClient,
		overrideKey:     overrideKey,
	}
}

// Authenticate middleware verifies the Firebase ID token
func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			utils.RespondError(w, "Missing authorization token", http.StatusUnauthorized)
			return
		}

		// Extract token
		token := strings.TrimPrefix(authHeader, "Bearer ")
		token = strings.TrimSpace(token)
		if token == "" {
			utils.RespondError(w, "Missing authorization token", http.StatusUnauthorized)
			return
		}

		// Verify token with Firebase
		decodedToken, err := m.authClient.VerifyIDToken(r.Context(), token)
		if err != nil {
			utils.RespondError(w, fmt.Sprintf("Invalid authentication token: %v", err), http.StatusUnauthorized)
			return
		}

		// Extract user info
		uid := decodedToken.UID
		signInProvider := getSignInProvider(decodedToken)
		isAnonymous := signInProvider == "anonymous"

		// Add to context
		ctx := context.WithValue(r.Context(), "uid", uid)
		ctx = context.WithValue(ctx, "isAnonymous", isAnonymous)
		ctx = context.WithValue(ctx, "decodedToken", decodedToken)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAI middleware checks if user has AI access
func (m *AuthMiddleware) RequireAI(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid := r.Context().Value("uid").(string)
		isAnonymous := r.Context().Value("isAnonymous").(bool)

		// Non-anonymous users always have access (checked by subscription middleware)
		if !isAnonymous {
			next.ServeHTTP(w, r)
			return
		}

		// Check anonymous AI access
		allowed, err := m.checkAnonymousAIAccess(r.Context(), uid)
		if err != nil {
			utils.RespondError(w, fmt.Sprintf("Failed to check AI access: %v", err), http.StatusInternalServerError)
			return
		}

		if !allowed {
			utils.RespondError(w, "Anonymous sessions cannot access AI features", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequireSubscription middleware checks if user has active Pro subscription
func (m *AuthMiddleware) RequireSubscription(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid := r.Context().Value("uid").(string)
		isAnonymous := r.Context().Value("isAnonymous").(bool)

		// Anonymous users are handled by RequireAI middleware
		if isAnonymous {
			next.ServeHTTP(w, r)
			return
		}

		// Check subscription status
		statusPath := fmt.Sprintf("users/%s/subscriptionStatus/current", uid)
		doc, err := m.firestoreClient.Doc(statusPath).Get(r.Context())
		if err != nil {
			utils.RespondError(w, "Pro subscription required", http.StatusForbidden)
			return
		}

		var status models.SubscriptionStatus
		if err := doc.DataTo(&status); err != nil {
			utils.RespondError(w, "Failed to read subscription status", http.StatusInternalServerError)
			return
		}

		// Check tier and entitlements
		if status.Tier != "pro" {
			utils.RespondError(w, "Pro subscription required", http.StatusForbidden)
			return
		}

		if status.Entitlements == nil || !status.Entitlements.AiProcessing {
			utils.RespondError(w, "AI processing not enabled in subscription", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// checkAnonymousAIAccess checks if anonymous user has AI access
// Matches logic from src/lib/server/verifyAiRequest.ts:48-72
func (m *AuthMiddleware) checkAnonymousAIAccess(ctx context.Context, uid string) (bool, error) {
	sessionPath := fmt.Sprintf("%s/%s", AnonymousSessionCollection, uid)
	doc, err := m.firestoreClient.Doc(sessionPath).Get(ctx)
	if err != nil {
		return false, nil // Session doesn't exist
	}

	var session models.AnonymousSession
	if err := doc.DataTo(&session); err != nil {
		return false, err
	}

	// Check allowAi flag
	if !session.AllowAi {
		// Check override key
		if m.overrideKey != "" && session.CiOverrideKey != nil && *session.CiOverrideKey == m.overrideKey {
			// Override allows access
		} else {
			return false, nil
		}
	}

	// Check cleanup pending
	if session.CleanupPending {
		return false, nil
	}

	// Check expiry
	if session.ExpiresAt.Before(time.Now()) {
		// Mark as expired
		_, err := m.firestoreClient.Doc(sessionPath).Set(ctx, map[string]interface{}{
			"status":         "expired",
			"cleanupPending": true,
			"expiredAt":      time.Now(),
			"updatedAt":      time.Now(),
		}, firestore.MergeAll)
		if err != nil {
			return false, err
		}
		return false, nil
	}

	return true, nil
}

// getSignInProvider extracts the sign-in provider from the token
func getSignInProvider(token *auth.Token) string {
	if firebase, ok := token.Claims["firebase"].(map[string]interface{}); ok {
		if provider, ok := firebase["sign_in_provider"].(string); ok {
			return provider
		}
	}
	return "unknown"
}

// OptionalAuth is like Authenticate but doesn't fail if no token present
func (m *AuthMiddleware) OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			// No auth, continue with empty context
			next.ServeHTTP(w, r)
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		token = strings.TrimSpace(token)
		if token == "" {
			next.ServeHTTP(w, r)
			return
		}

		decodedToken, err := m.authClient.VerifyIDToken(r.Context(), token)
		if err != nil {
			// Invalid token, but don't fail - just continue without auth
			next.ServeHTTP(w, r)
			return
		}

		uid := decodedToken.UID
		signInProvider := getSignInProvider(decodedToken)
		isAnonymous := signInProvider == "anonymous"

		ctx := context.WithValue(r.Context(), "uid", uid)
		ctx = context.WithValue(ctx, "isAnonymous", isAnonymous)
		ctx = context.WithValue(ctx, "decodedToken", decodedToken)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
