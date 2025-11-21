package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/config"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/handlers"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/middleware"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/services"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
	"github.com/mesbahtanvir/focus-notebook/backend-go/pkg/firebase"
)

func main() {
	// Load configuration
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	logger, err := utils.NewLogger(&cfg.Logging)
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	logger.Info("Starting Focus Notebook Backend",
		zap.String("version", "1.0.0"),
		zap.String("port", fmt.Sprintf("%d", cfg.Server.Port)),
	)

	// Initialize Firebase
	ctx := context.Background()
	fbAdmin, err := firebase.Initialize(ctx, &firebase.Config{
		ProjectID:       cfg.Firebase.ProjectID,
		CredentialsPath: cfg.Firebase.CredentialsPath,
		StorageBucket:   cfg.Firebase.StorageBucket,
		DatabaseID:      cfg.Firebase.DatabaseID,
	})
	if err != nil {
		logger.Fatal("Failed to initialize Firebase", zap.Error(err))
	}
	defer fbAdmin.Close()

	logger.Info("Firebase initialized successfully")

	// Initialize AI clients
	var openaiClient *clients.OpenAIClient
	if cfg.OpenAI.APIKey != "" {
		openaiClient, err = clients.NewOpenAIClient(&cfg.OpenAI, logger)
		if err != nil {
			logger.Warn("Failed to initialize OpenAI client", zap.Error(err))
		} else {
			logger.Info("OpenAI client initialized")
		}
	}

	var anthropicClient *clients.AnthropicClient
	if cfg.Anthropic.APIKey != "" {
		anthropicClient, err = clients.NewAnthropicClient(&cfg.Anthropic, logger)
		if err != nil {
			logger.Warn("Failed to initialize Anthropic client", zap.Error(err))
		} else {
			logger.Info("Anthropic client initialized")
		}
	}

	// Check if at least one AI client is available
	if openaiClient == nil && anthropicClient == nil {
		logger.Warn("No AI clients configured - thought processing will not work")
	}

	// Initialize Stripe client
	var stripeClient *clients.StripeClient
	if cfg.Stripe.SecretKey != "" {
		stripeClient = clients.NewStripeClient(&cfg.Stripe, logger)
		logger.Info("Stripe client initialized")
	} else {
		logger.Warn("Stripe not configured - billing features will not work")
	}

	// Initialize Plaid client
	var plaidClient *clients.PlaidClient
	if cfg.Plaid.ClientID != "" && cfg.Plaid.Secret != "" {
		var err error
		plaidClient, err = clients.NewPlaidClient(&cfg.Plaid, logger)
		if err != nil {
			logger.Error("Failed to initialize Plaid client", zap.Error(err))
		} else {
			logger.Info("Plaid client initialized")
		}
	} else {
		logger.Warn("Plaid not configured - banking features will not work")
	}

	// Initialize repository
	repo := repository.NewFirestoreRepository(fbAdmin.Firestore)

	// Initialize services
	contextGatherer := services.NewContextGathererService(repo, logger)
	subscriptionSvc := services.NewSubscriptionService(repo, logger, cfg.Anonymous.AIOverrideKey)
	actionProcessor := services.NewActionProcessor(repo, logger)

	// Initialize thought processing service
	var thoughtProcessingSvc *services.ThoughtProcessingService
	if openaiClient != nil || anthropicClient != nil {
		thoughtProcessingSvc = services.NewThoughtProcessingService(
			repo,
			openaiClient,
			anthropicClient,
			contextGatherer,
			subscriptionSvc,
			actionProcessor,
			logger,
		)
		logger.Info("Thought processing service initialized")
	}

	// Initialize Stripe billing service
	var stripeBillingSvc *services.StripeBillingService
	if stripeClient != nil {
		stripeBillingSvc = services.NewStripeBillingService(stripeClient, repo, logger)
		logger.Info("Stripe billing service initialized")
	}

	// Initialize Plaid service
	var plaidService *services.PlaidService
	if plaidClient != nil {
		plaidService = services.NewPlaidService(plaidClient, repo, logger)
		logger.Info("Plaid service initialized")
	}

	// Initialize analytics services
	dashboardAnalyticsSvc := services.NewDashboardAnalyticsService(repo, logger)
	logger.Info("Dashboard analytics service initialized")
	spendingAnalyticsSvc := services.NewSpendingAnalyticsService(repo, logger)
	logger.Info("Spending analytics service initialized")

	// Initialize import/export service
	importExportSvc := services.NewImportExportService(repo, logger)
	logger.Info("Import/export service initialized")

	// Initialize investment calculation service
	investmentCalcSvc := services.NewInvestmentCalculationService(repo, logger)
	logger.Info("Investment calculation service initialized")

	// Initialize entity graph service
	entityGraphSvc := services.NewEntityGraphService(repo, logger)
	logger.Info("Entity graph service initialized")

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(
		fbAdmin.Auth,
		fbAdmin.Firestore,
		cfg.Anonymous.AIOverrideKey,
	)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(fbAdmin)

	var thoughtHandler *handlers.ThoughtHandler
	if thoughtProcessingSvc != nil {
		thoughtHandler = handlers.NewThoughtHandler(thoughtProcessingSvc, logger)
	}

	var stripeHandler *handlers.StripeHandler
	if stripeBillingSvc != nil {
		stripeHandler = handlers.NewStripeHandler(stripeClient, stripeBillingSvc, logger)
	}

	var plaidHandler *handlers.PlaidHandler
	if plaidService != nil {
		plaidHandler = handlers.NewPlaidHandler(plaidService, logger)
	}

	// Analytics handler (always available)
	analyticsHandler := handlers.NewAnalyticsHandler(dashboardAnalyticsSvc, spendingAnalyticsSvc, logger)

	// Import/export handler (always available)
	importExportHandler := handlers.NewImportExportHandler(importExportSvc, logger)

	// Investment calculation handler (always available)
	investmentHandler := handlers.NewInvestmentHandler(investmentCalcSvc, logger)

	// Entity graph handler (always available)
	entityGraphHandler := handlers.NewEntityGraphHandler(entityGraphSvc, logger)

	// Create router
	router := mux.NewRouter()

	// Apply global middleware
	router.Use(middleware.Recovery(logger))
	router.Use(middleware.Logging(logger))
	router.Use(middleware.CORS(&cfg.Server.CORS))

	// Health and metrics (no auth required)
	router.HandleFunc("/health", healthHandler.Handle).Methods("GET")
	if cfg.Metrics.Enabled {
		router.Handle("/metrics", promhttp.Handler()).Methods("GET")
	}

	// API routes (require authentication)
	api := router.PathPrefix("/api").Subrouter()
	api.Use(authMiddleware.Authenticate)

	// Thought processing routes (requires AI access)
	if thoughtHandler != nil {
		thoughtRoutes := api.PathPrefix("/").Subrouter()
		thoughtRoutes.Use(authMiddleware.RequireAI)
		thoughtRoutes.Use(authMiddleware.RequireSubscription)
		thoughtRoutes.HandleFunc("/process-thought", thoughtHandler.ProcessThought).Methods("POST")
		thoughtRoutes.HandleFunc("/reprocess-thought", thoughtHandler.ReprocessThought).Methods("POST")
		thoughtRoutes.HandleFunc("/revert-thought-processing", thoughtHandler.RevertThoughtProcessing).Methods("POST")
	} else {
		logger.Warn("Thought processing endpoints disabled (no AI clients configured)")
	}

	// Stripe billing routes
	if stripeHandler != nil {
		// Webhook endpoint (no auth - uses Stripe signature verification)
		router.HandleFunc("/api/stripe/webhook", stripeHandler.HandleWebhook).Methods("POST")

		// Authenticated Stripe endpoints
		stripeRoutes := api.PathPrefix("/stripe").Subrouter()
		stripeRoutes.HandleFunc("/create-checkout-session", stripeHandler.CreateCheckoutSession).Methods("POST")
		stripeRoutes.HandleFunc("/create-portal-session", stripeHandler.CreatePortalSession).Methods("POST")
		stripeRoutes.HandleFunc("/invoices", stripeHandler.GetInvoices).Methods("GET")
		stripeRoutes.HandleFunc("/payment-method", stripeHandler.GetPaymentMethod).Methods("GET")
		stripeRoutes.HandleFunc("/reactivate-subscription", stripeHandler.ReactivateSubscription).Methods("POST")
		stripeRoutes.HandleFunc("/usage-stats", stripeHandler.GetUsageStats).Methods("GET")

		logger.Info("Stripe endpoints registered")
	} else {
		logger.Warn("Stripe endpoints disabled (Stripe not configured)")
	}

	// Plaid banking routes
	if plaidHandler != nil {
		// Webhook endpoint (no auth - Plaid webhooks)
		router.HandleFunc("/api/plaid/webhook", plaidHandler.HandleWebhook).Methods("POST")

		// Authenticated Plaid endpoints
		plaidRoutes := api.PathPrefix("/plaid").Subrouter()
		plaidRoutes.HandleFunc("/create-link-token", plaidHandler.CreateLinkToken).Methods("POST")
		plaidRoutes.HandleFunc("/exchange-public-token", plaidHandler.ExchangePublicToken).Methods("POST")
		plaidRoutes.HandleFunc("/create-relink-token", plaidHandler.CreateRelinkToken).Methods("POST")
		plaidRoutes.HandleFunc("/mark-relinking", plaidHandler.MarkRelinking).Methods("POST")
		plaidRoutes.HandleFunc("/trigger-sync", plaidHandler.TriggerSync).Methods("POST")

		logger.Info("Plaid endpoints registered")
	} else {
		logger.Warn("Plaid endpoints disabled (Plaid not configured)")
	}

	// Analytics routes (authenticated)
	analyticsRoutes := api.PathPrefix("/analytics").Subrouter()
	analyticsRoutes.HandleFunc("/dashboard", analyticsHandler.GetDashboardAnalytics).Methods("GET")
	analyticsRoutes.HandleFunc("/spending", analyticsHandler.GetSpendingAnalytics).Methods("GET")
	logger.Info("Analytics endpoints registered")

	// Import/export routes (authenticated)
	importRoutes := api.PathPrefix("/import").Subrouter()
	importRoutes.HandleFunc("/validate", importExportHandler.ValidateImport).Methods("POST")
	importRoutes.HandleFunc("/execute", importExportHandler.ExecuteImport).Methods("POST")

	exportRoutes := api.PathPrefix("/export").Subrouter()
	exportRoutes.HandleFunc("", importExportHandler.ExportData).Methods("GET")
	exportRoutes.HandleFunc("/summary", importExportHandler.GetExportSummary).Methods("GET")
	logger.Info("Import/export endpoints registered")

	// Investment calculation routes (authenticated)
	portfolioRoutes := api.PathPrefix("/portfolio").Subrouter()
	portfolioRoutes.HandleFunc("/{portfolioId}/metrics", investmentHandler.GetPortfolioMetrics).Methods("GET")
	portfolioRoutes.HandleFunc("/{portfolioId}/snapshots", investmentHandler.GetPortfolioSnapshots).Methods("GET")
	portfolioRoutes.HandleFunc("/projection", investmentHandler.GenerateProjection).Methods("POST")
	portfolioRoutes.HandleFunc("/summary", investmentHandler.GetDashboardSummary).Methods("GET")
	logger.Info("Investment calculation endpoints registered")

	// Entity graph routes (authenticated)
	entityGraphRoutes := api.PathPrefix("/entity-graph").Subrouter()
	entityGraphRoutes.HandleFunc("/relationships", entityGraphHandler.QueryRelationships).Methods("GET", "POST")
	entityGraphRoutes.HandleFunc("/linked/{entityType}/{entityId}", entityGraphHandler.GetLinkedEntities).Methods("GET")
	entityGraphRoutes.HandleFunc("/tools", entityGraphHandler.GetToolRelationships).Methods("GET")
	entityGraphRoutes.HandleFunc("/stats", entityGraphHandler.GetRelationshipStats).Methods("GET")
	logger.Info("Entity graph endpoints registered")

	// TODO: Add more routes here as we implement handlers
	// - /api/chat
	// - /api/predict-investment
	// - /api/spending/*
	// - /api/photo/*
	// etc.

	// Log registered routes
	logger.Info("Routes registered",
		zap.Int("count", countRoutes(router)),
	)

	// Create HTTP server
	server := &http.Server{
		Addr:           cfg.GetServerAddr(),
		Handler:        router,
		ReadTimeout:    cfg.Server.ReadTimeout,
		WriteTimeout:   cfg.Server.WriteTimeout,
		IdleTimeout:    cfg.Server.IdleTimeout,
		MaxHeaderBytes: cfg.Server.MaxHeaderBytes,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Server listening",
			zap.String("addr", server.Addr),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Give server 30 seconds to finish processing requests
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server stopped")
}

// countRoutes counts the number of registered routes
func countRoutes(router *mux.Router) int {
	count := 0
	router.Walk(func(route *mux.Route, router *mux.Router, ancestors []*mux.Route) error {
		count++
		return nil
	})
	return count
}
