package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestCORS_Disabled(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: false,
		AllowedOrigins: []string{"http://localhost:3000"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_AllowedOrigin(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000", "https://example.com"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
		MaxAge:         3600,
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, "http://localhost:3000", w.Header().Get("Access-Control-Allow-Origin"))
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "GET")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "POST")
}

func TestCORS_DisallowedOrigin(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://evil.com")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_Wildcard(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"*"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://any-domain.com")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, "https://any-domain.com", w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_PreflightRequest(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("This should not be called for OPTIONS"))
	}))

	req := httptest.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "http://localhost:3000", w.Header().Get("Access-Control-Allow-Origin"))
	assert.NotContains(t, w.Body.String(), "This should not be called")
}

func TestCORS_AllowCredentials(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowCredentials: true,
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORS_ExposeHeaders(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000"},
		ExposeHeaders: []string{"X-Total-Count", "X-Page-Number"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	exposeHeader := w.Header().Get("Access-Control-Expose-Headers")
	assert.Contains(t, exposeHeader, "X-Total-Count")
	assert.Contains(t, exposeHeader, "X-Page-Number")
}

func TestCORS_MaxAge(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000"},
		MaxAge: 7200,
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, "7200", w.Header().Get("Access-Control-Max-Age"))
}

func TestCORS_NoOriginHeader(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	// No Origin header set
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_EmptyAllowedOrigins(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_RequestPassthrough(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000"},
	}

	middleware := CORS(cfg)
	handlerCalled := false
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Handler was called"))
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.True(t, handlerCalled)
	assert.Contains(t, w.Body.String(), "Handler was called")
}

func TestCORS_MultipleHeaders(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "PATCH"},
		AllowedHeaders: []string{"Content-Type", "Authorization", "X-Custom-Header"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	methods := w.Header().Get("Access-Control-Allow-Methods")
	headers := w.Header().Get("Access-Control-Allow-Headers")

	assert.Contains(t, methods, "POST")
	assert.Contains(t, methods, "PUT")
	assert.Contains(t, methods, "DELETE")
	assert.Contains(t, headers, "Authorization")
	assert.Contains(t, headers, "X-Custom-Header")
}

func TestIsOriginAllowed_ExactMatch(t *testing.T) {
	allowed := []string{"http://localhost:3000", "https://example.com"}

	assert.True(t, isOriginAllowed("http://localhost:3000", allowed))
	assert.True(t, isOriginAllowed("https://example.com", allowed))
	assert.False(t, isOriginAllowed("https://other.com", allowed))
}

func TestIsOriginAllowed_Wildcard(t *testing.T) {
	allowed := []string{"*"}

	assert.True(t, isOriginAllowed("http://localhost:3000", allowed))
	assert.True(t, isOriginAllowed("https://any-domain.com", allowed))
	assert.True(t, isOriginAllowed("http://example.com:8080", allowed))
}

func TestIsOriginAllowed_Empty(t *testing.T) {
	allowed := []string{}

	assert.False(t, isOriginAllowed("http://localhost:3000", allowed))
}

func TestIsOriginAllowed_CaseSensitive(t *testing.T) {
	allowed := []string{"http://localhost:3000"}

	assert.True(t, isOriginAllowed("http://localhost:3000", allowed))
	// Origins should be case sensitive
	assert.False(t, isOriginAllowed("HTTP://LOCALHOST:3000", allowed))
}

func TestCORS_GetRequest(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestCORS_PostRequest(t *testing.T) {
	cfg := &config.CORSConfig{
		Enabled: true,
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST"},
	}

	middleware := CORS(cfg)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		w.WriteHeader(http.StatusCreated)
	}))

	req := httptest.NewRequest("POST", "/test", strings.NewReader("{}"))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}
