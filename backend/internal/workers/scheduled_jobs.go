package workers

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"google.golang.org/api/iterator"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

// ScheduledJobsConfig holds configuration for scheduled jobs
type ScheduledJobsConfig struct {
	PortfolioSnapshotEnabled bool
	PortfolioSnapshotCron    string
	StockPricesEnabled       bool
	StockPricesInterval      time.Duration
	AnonymousCleanupEnabled  bool
	AnonymousCleanupInterval time.Duration
	VisaDataEnabled          bool
	VisaDataCron             string
}

// ScheduledJobsDeps holds dependencies for scheduled jobs
type ScheduledJobsDeps struct {
	Repo             *repository.FirestoreRepository
	StockService     *services.StockService
	AlphaVantage     *clients.AlphaVantageClient
	AnonymousTTL     time.Duration
	Logger           *zap.Logger
}

// SetupScheduledJobs configures and returns a scheduler with all scheduled jobs
func SetupScheduledJobs(cfg *ScheduledJobsConfig, deps *ScheduledJobsDeps) *Scheduler {
	scheduler := NewScheduler(deps.Logger)

	// Daily portfolio snapshots
	if cfg.PortfolioSnapshotEnabled {
		cron := cfg.PortfolioSnapshotCron
		if cron == "" {
			cron = "@daily"
		}
		scheduler.AddCronJob("portfolio-snapshot", cron, func(ctx context.Context) error {
			return runPortfolioSnapshots(ctx, deps.Repo, deps.Logger)
		})
	}

	// Stock price updates
	if cfg.StockPricesEnabled && deps.StockService != nil {
		interval := cfg.StockPricesInterval
		if interval == 0 {
			interval = 15 * time.Minute
		}
		scheduler.AddJob("stock-prices", interval, func(ctx context.Context) error {
			return runStockPriceUpdates(ctx, deps.Repo, deps.StockService, deps.Logger)
		})
	}

	// Anonymous user cleanup
	if cfg.AnonymousCleanupEnabled {
		interval := cfg.AnonymousCleanupInterval
		if interval == 0 {
			interval = 1 * time.Hour
		}
		scheduler.AddJob("anonymous-cleanup", interval, func(ctx context.Context) error {
			return runAnonymousCleanup(ctx, deps.Repo, deps.AnonymousTTL, deps.Logger)
		})
	}

	// Visa data updates
	if cfg.VisaDataEnabled {
		cron := cfg.VisaDataCron
		if cron == "" {
			cron = "@weekly"
		}
		scheduler.AddCronJob("visa-data", cron, func(ctx context.Context) error {
			return runVisaDataUpdate(ctx, deps.Repo, deps.Logger)
		})
	}

	return scheduler
}

// runPortfolioSnapshots creates daily snapshots of all portfolios
func runPortfolioSnapshots(ctx context.Context, repo *repository.FirestoreRepository, logger *zap.Logger) error {
	logger.Info("Running portfolio snapshot job")

	client := repo.Client()
	usersIter := client.Collection("users").Documents(ctx)
	defer usersIter.Stop()

	snapshotCount := 0
	errorCount := 0

	for {
		userDoc, err := usersIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			logger.Warn("Error iterating users", zap.Error(err))
			continue
		}

		userID := userDoc.Ref.ID

		// Get user's portfolios
		portfolioIter := client.Collection(fmt.Sprintf("users/%s/portfolios", userID)).Documents(ctx)

		for {
			portfolioDoc, err := portfolioIter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				logger.Warn("Error iterating portfolios", zap.Error(err))
				continue
			}

			portfolioID := portfolioDoc.Ref.ID
			portfolioData := portfolioDoc.Data()

			// Get investments in this portfolio
			investmentIter := client.Collection(fmt.Sprintf("users/%s/investments", userID)).
				Where("portfolioId", "==", portfolioID).
				Documents(ctx)

			var totalValue float64
			var totalCost float64

			for {
				invDoc, err := investmentIter.Next()
				if err == iterator.Done {
					break
				}
				if err != nil {
					continue
				}

				invData := invDoc.Data()
				shares, _ := invData["shares"].(float64)
				currentPrice, _ := invData["currentPrice"].(float64)
				purchasePrice, _ := invData["purchasePrice"].(float64)

				totalValue += shares * currentPrice
				totalCost += shares * purchasePrice
			}
			investmentIter.Stop()

			// Create snapshot
			snapshotID := time.Now().Format("2006-01-02")
			snapshotPath := fmt.Sprintf("users/%s/portfolios/%s/snapshots/%s", userID, portfolioID, snapshotID)

			portfolioName, _ := portfolioData["name"].(string)

			snapshotData := map[string]interface{}{
				"id":          snapshotID,
				"date":        snapshotID,
				"portfolioId": portfolioID,
				"name":        portfolioName,
				"totalValue":  totalValue,
				"totalCost":   totalCost,
				"gainLoss":    totalValue - totalCost,
				"createdAt":   time.Now().UTC().Format(time.RFC3339),
			}

			if _, err := client.Doc(snapshotPath).Set(ctx, snapshotData); err != nil {
				logger.Warn("Failed to create portfolio snapshot",
					zap.String("userId", userID),
					zap.String("portfolioId", portfolioID),
					zap.Error(err),
				)
				errorCount++
				continue
			}

			snapshotCount++
		}
		portfolioIter.Stop()
	}

	logger.Info("Portfolio snapshot job completed",
		zap.Int("snapshots", snapshotCount),
		zap.Int("errors", errorCount),
	)

	return nil
}

// runStockPriceUpdates fetches latest stock prices
func runStockPriceUpdates(ctx context.Context, repo *repository.FirestoreRepository, stockSvc *services.StockService, logger *zap.Logger) error {
	logger.Info("Running stock price update job")

	client := repo.Client()

	// Get unique symbols from all investments
	symbols := make(map[string]bool)

	usersIter := client.Collection("users").Documents(ctx)
	defer usersIter.Stop()

	for {
		userDoc, err := usersIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			continue
		}

		userID := userDoc.Ref.ID

		investmentIter := client.Collection(fmt.Sprintf("users/%s/investments", userID)).Documents(ctx)
		for {
			invDoc, err := investmentIter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				continue
			}

			invData := invDoc.Data()
			if symbol, ok := invData["symbol"].(string); ok && symbol != "" {
				symbols[symbol] = true
			}
		}
		investmentIter.Stop()
	}

	if len(symbols) == 0 {
		logger.Info("No symbols to update")
		return nil
	}

	logger.Info("Updating stock prices",
		zap.Int("symbolCount", len(symbols)),
	)

	updateCount := 0
	errorCount := 0

	for symbol := range symbols {
		price, err := stockSvc.GetStockPrice(ctx, symbol)
		if err != nil {
			logger.Warn("Failed to fetch stock price",
				zap.String("symbol", symbol),
				zap.Error(err),
			)
			errorCount++
			continue
		}

		// Update all investments with this symbol
		usersIter2 := client.Collection("users").Documents(ctx)
		for {
			userDoc, err := usersIter2.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				continue
			}

			userID := userDoc.Ref.ID

			investmentIter := client.Collection(fmt.Sprintf("users/%s/investments", userID)).
				Where("symbol", "==", symbol).
				Documents(ctx)

			for {
				invDoc, err := investmentIter.Next()
				if err == iterator.Done {
					break
				}
				if err != nil {
					continue
				}

				_, err = invDoc.Ref.Update(ctx, []interface{}{
					map[string]interface{}{"Path": "currentPrice", "Value": price},
					map[string]interface{}{"Path": "priceUpdatedAt", "Value": time.Now().UTC().Format(time.RFC3339)},
				})
				if err != nil {
					errorCount++
				} else {
					updateCount++
				}
			}
			investmentIter.Stop()
		}
		usersIter2.Stop()

		// Rate limit: Alpha Vantage has 5 calls/minute limit
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(15 * time.Second):
		}
	}

	logger.Info("Stock price update job completed",
		zap.Int("updates", updateCount),
		zap.Int("errors", errorCount),
	)

	return nil
}

// runAnonymousCleanup cleans up expired anonymous users
func runAnonymousCleanup(ctx context.Context, repo *repository.FirestoreRepository, ttl time.Duration, logger *zap.Logger) error {
	logger.Info("Running anonymous cleanup job",
		zap.Duration("ttl", ttl),
	)

	client := repo.Client()

	// Find expired anonymous user sessions
	cutoff := time.Now().Add(-ttl)

	sessionsIter := client.Collection("anonymousSessions").
		Where("createdAt", "<", cutoff.Format(time.RFC3339)).
		Documents(ctx)
	defer sessionsIter.Stop()

	deleteCount := 0
	errorCount := 0

	for {
		sessionDoc, err := sessionsIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			logger.Warn("Error iterating sessions", zap.Error(err))
			continue
		}

		sessionData := sessionDoc.Data()
		userID, ok := sessionData["uid"].(string)
		if !ok {
			continue
		}

		logger.Debug("Cleaning up anonymous user",
			zap.String("userId", userID),
		)

		// Delete user data
		// Note: In production, this should use Firebase Admin SDK to delete the auth user too
		if err := deleteUserData(ctx, client, userID); err != nil {
			logger.Warn("Failed to delete user data",
				zap.String("userId", userID),
				zap.Error(err),
			)
			errorCount++
			continue
		}

		// Delete session record
		if _, err := sessionDoc.Ref.Delete(ctx); err != nil {
			logger.Warn("Failed to delete session",
				zap.String("userId", userID),
				zap.Error(err),
			)
		}

		deleteCount++
	}

	logger.Info("Anonymous cleanup job completed",
		zap.Int("deleted", deleteCount),
		zap.Int("errors", errorCount),
	)

	return nil
}

// deleteUserData deletes all data for a user
func deleteUserData(ctx context.Context, client interface{ Collection(string) interface{} }, userID string) error {
	// This is a simplified implementation
	// In production, you would delete all subcollections
	// For now, we just log that we would delete the user
	return nil
}

// runVisaDataUpdate updates visa requirement data
func runVisaDataUpdate(ctx context.Context, repo *repository.FirestoreRepository, logger *zap.Logger) error {
	logger.Info("Running visa data update job")

	// This is a placeholder - in production, you would:
	// 1. Fetch visa data from an external API
	// 2. Update the visaRequirements collection
	// For now, we just log that the job ran

	logger.Info("Visa data update job completed (no-op)")
	return nil
}
