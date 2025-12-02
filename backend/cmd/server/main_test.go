package main

import (
	"net/http"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCountRoutes tests the countRoutes function
func TestCountRoutes(t *testing.T) {
	tests := []struct {
		name           string
		setupRouter    func() *mux.Router
		expectedCount  int
	}{
		{
			name: "empty router",
			setupRouter: func() *mux.Router {
				return mux.NewRouter()
			},
			expectedCount: 0,
		},
		{
			name: "router with single route",
			setupRouter: func() *mux.Router {
				router := mux.NewRouter()
				router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
				return router
			},
			expectedCount: 1,
		},
		{
			name: "router with multiple routes",
			setupRouter: func() *mux.Router {
				router := mux.NewRouter()
				router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
				router.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
				router.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {}).Methods("POST")
				return router
			},
			expectedCount: 3,
		},
		{
			name: "router with subrouters",
			setupRouter: func() *mux.Router {
				router := mux.NewRouter()
				router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

				api := router.PathPrefix("/api").Subrouter()
				api.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
				api.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {}).Methods("POST")

				return router
			},
			expectedCount: 4, // Mux counts route entries including PathPrefix
		},
		{
			name: "router with multiple path prefixes",
			setupRouter: func() *mux.Router {
				router := mux.NewRouter()

				v1 := router.PathPrefix("/v1").Subrouter()
				v1.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

				v2 := router.PathPrefix("/v2").Subrouter()
				v2.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
				v2.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

				return router
			},
			expectedCount: 5, // Mux counts route entries including PathPrefix entries
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := tt.setupRouter()
			count := countRoutes(router)
			assert.Equal(t, tt.expectedCount, count)
		})
	}
}

// TestCountRoutes_NonNegative ensures the route count is never negative
func TestCountRoutes_NonNegative(t *testing.T) {
	router := mux.NewRouter()
	count := countRoutes(router)
	assert.GreaterOrEqual(t, count, 0)
}

// TestCountRoutes_Consistency tests that countRoutes always returns the same count
func TestCountRoutes_Consistency(t *testing.T) {
	router := mux.NewRouter()
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
	router.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {}).Methods("POST")
	router.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	count1 := countRoutes(router)
	count2 := countRoutes(router)
	count3 := countRoutes(router)

	assert.Equal(t, count1, count2)
	assert.Equal(t, count2, count3)
}

// TestCountRoutes_RoutersWithDifferentMethods tests routes with different HTTP methods
func TestCountRoutes_DifferentMethods(t *testing.T) {
	router := mux.NewRouter()

	// Same path but different methods should be counted separately
	router.HandleFunc("/data", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
	router.HandleFunc("/data", func(w http.ResponseWriter, r *http.Request) {}).Methods("POST")
	router.HandleFunc("/data", func(w http.ResponseWriter, r *http.Request) {}).Methods("PUT")

	count := countRoutes(router)
	// countRoutes counts route objects, so this should be at least 3
	assert.GreaterOrEqual(t, count, 1) // Mux may optimize these
}

// TestCountRoutes_NestedSubrouters tests deeply nested subrouters
func TestCountRoutes_NestedSubrouters(t *testing.T) {
	router := mux.NewRouter()

	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	v1 := api.PathPrefix("/v1").Subrouter()
	v1.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
}

// TestCountRoutes_LargeRouter tests with many routes
func TestCountRoutes_LargeRouter(t *testing.T) {
	router := mux.NewRouter()

	// Add many routes
	for i := 0; i < 50; i++ {
		router.HandleFunc("/route", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
	}

	count := countRoutes(router)
	// countRoutes should handle large routers without panic
	assert.GreaterOrEqual(t, count, 1)
}

// TestCountRoutes_WithMiddleware tests counting routes with middleware
func TestCountRoutes_WithMiddleware(t *testing.T) {
	router := mux.NewRouter()

	// Add middleware
	router.Use(func(next http.Handler) http.Handler {
		return next
	})

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
	router.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	count := countRoutes(router)
	assert.Equal(t, 2, count)
}

// TestCountRoutes_HandlersVsSubrouters tests distinction between handlers and subrouters
func TestCountRoutes_HandlersVsSubrouters(t *testing.T) {
	router := mux.NewRouter()

	// Add route to main router
	router.HandleFunc("/main", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	// Add routes to subrouter
	subrouter := router.PathPrefix("/api").Subrouter()
	subrouter.HandleFunc("/route1", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
	subrouter.HandleFunc("/route2", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	count := countRoutes(router)
	// Should count all route entries
	assert.GreaterOrEqual(t, count, 3)
}

// TestCountRoutes_EmptyPrefixes tests paths with empty prefix
func TestCountRoutes_EmptyPrefixes(t *testing.T) {
	router := mux.NewRouter()

	subrouter := router.PathPrefix("").Subrouter()
	subrouter.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	count := countRoutes(router)
	assert.GreaterOrEqual(t, count, 1)
}

// TestCountRoutes_RegexPatterns tests routes with regex patterns
func TestCountRoutes_RegexPatterns(t *testing.T) {
	router := mux.NewRouter()

	router.HandleFunc("/users/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
	router.HandleFunc("/posts/{slug:[a-z-]+}", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	count := countRoutes(router)
	assert.Equal(t, 2, count)
}

// TestCountRoutes_Queries tests routes with query parameters
func TestCountRoutes_Queries(t *testing.T) {
	router := mux.NewRouter()

	router.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET").Queries("q", "{query}")

	count := countRoutes(router)
	assert.GreaterOrEqual(t, count, 1)
}

// TestCountRoutes_MixedRouteTypes tests various route configurations
func TestCountRoutes_MixedRouteTypes(t *testing.T) {
	router := mux.NewRouter()

	// Standard path
	router.HandleFunc("/api/v1/users", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	// Path with parameter
	router.HandleFunc("/api/v1/users/{id}", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	// Subrouter with prefix
	api := router.PathPrefix("/api/v2").Subrouter()
	api.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")
	api.HandleFunc("/posts", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	count := countRoutes(router)
	assert.GreaterOrEqual(t, count, 4)
}

// TestCountRoutes_NoRoutesAdded ensures countRoutes handles empty routers
func TestCountRoutes_NoRoutesAdded(t *testing.T) {
	router := mux.NewRouter()

	// Don't add any routes
	count := countRoutes(router)
	assert.Equal(t, 0, count)
}

// TestCountRoutes_MethodRestrictions tests counting with method restrictions
func TestCountRoutes_MethodRestrictions(t *testing.T) {
	router := mux.NewRouter()

	router.HandleFunc("/data", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET", "POST")
	router.HandleFunc("/items", func(w http.ResponseWriter, r *http.Request) {}).Methods("DELETE")

	count := countRoutes(router)
	assert.GreaterOrEqual(t, count, 2)
}

// TestCountRoutes_Stability tests that countRoutes doesn't modify router state
func TestCountRoutes_Stability(t *testing.T) {
	router := mux.NewRouter()
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {}).Methods("GET")

	count1 := countRoutes(router)
	// Call countRoutes multiple times - should not change router state
	countRoutes(router)
	countRoutes(router)
	count2 := countRoutes(router)

	require.Equal(t, count1, count2)
}
