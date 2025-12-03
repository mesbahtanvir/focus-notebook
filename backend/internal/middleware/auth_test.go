package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"firebase.google.com/go/v4/auth"
	"github.com/stretchr/testify/assert"
)

func TestNewAuthMiddleware(t *testing.T) {
	// Test middleware creation with nil clients
	middleware := NewAuthMiddleware(nil, nil, "")
	assert.NotNil(t, middleware)
}

func TestAuthMiddleware_Authenticate_NoToken(t *testing.T) {
	middleware := NewAuthMiddleware(nil, nil, "")

	handler := middleware.Authenticate(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Missing authorization token")
}

func TestAuthMiddleware_Authenticate_InvalidBearerFormat(t *testing.T) {
	middleware := NewAuthMiddleware(nil, nil, "")

	handler := middleware.Authenticate(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "NotBearer token")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_Authenticate_EmptyToken(t *testing.T) {
	middleware := NewAuthMiddleware(nil, nil, "")

	handler := middleware.Authenticate(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer ")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_RequireAI_NoUID(t *testing.T) {
	middleware := NewAuthMiddleware(nil, nil, "")

	handler := middleware.RequireAI(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_RequireSubscription_NoUID(t *testing.T) {
	middleware := NewAuthMiddleware(nil, nil, "")

	handler := middleware.RequireSubscription(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_OptionalAuth_NoToken(t *testing.T) {
	middleware := NewAuthMiddleware(nil, nil, "")

	handlerCalled := false
	handler := middleware.OptionalAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.True(t, handlerCalled)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetSignInProvider_NoProvider(t *testing.T) {
	token := &auth.Token{
		Claims: make(map[string]interface{}),
	}

	provider := getSignInProvider(token)
	assert.Equal(t, "unknown", provider)
}

func TestGetSignInProvider_FirebaseProvider(t *testing.T) {
	token := &auth.Token{
		Claims: map[string]interface{}{
			"firebase": map[string]interface{}{
				"sign_in_provider": "google.com",
			},
		},
	}

	provider := getSignInProvider(token)
	assert.Equal(t, "google.com", provider)
}

func TestGetSignInProvider_AnonymousProvider(t *testing.T) {
	token := &auth.Token{
		Claims: map[string]interface{}{
			"firebase": map[string]interface{}{
				"sign_in_provider": "anonymous",
			},
		},
	}

	provider := getSignInProvider(token)
	assert.Equal(t, "anonymous", provider)
}

func TestGetSignInProvider_MissingFirebaseClaims(t *testing.T) {
	token := &auth.Token{
		Claims: map[string]interface{}{
			"sub": "user-123",
		},
	}

	provider := getSignInProvider(token)
	assert.Equal(t, "unknown", provider)
}

func TestAuthMiddleware_OverrideKey(t *testing.T) {
	middleware := NewAuthMiddleware(nil, nil, "secret-override-key")

	assert.NotNil(t, middleware)
	assert.Equal(t, "secret-override-key", middleware.overrideKey)
}

func TestAuthMiddleware_AnonymousSessionCollection(t *testing.T) {
	// Verify the constant exists and has expected value
	assert.Equal(t, "anonymousSessions", AnonymousSessionCollection)
}
