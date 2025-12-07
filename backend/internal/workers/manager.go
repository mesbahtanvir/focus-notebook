package workers

import (
	"context"
	"sync"
	"time"

	"cloud.google.com/go/storage"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/config"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/services"
)

// Manager coordinates all background workers
type Manager struct {
	workers []Worker
	logger  *zap.Logger
	wg      sync.WaitGroup
	ctx     context.Context
	cancel  context.CancelFunc
	running bool
	mu      sync.RWMutex
}

// ManagerConfig holds configuration for the worker manager
type ManagerConfig struct {
	Enabled bool
	Workers config.WorkersConfig
}

// Dependencies holds all dependencies needed by workers
type Dependencies struct {
	Repo             *repository.FirestoreRepository
	StorageClient    *storage.Client
	OpenAIClient     *clients.OpenAIClient
	CSVProcessingSvc *services.CSVProcessingService
	BucketName       string
}

// NewManager creates a new worker manager
func NewManager(cfg *ManagerConfig, deps *Dependencies, logger *zap.Logger) *Manager {
	if !cfg.Enabled {
		logger.Info("Worker manager disabled")
		return &Manager{
			logger: logger,
		}
	}

	ctx, cancel := context.WithCancel(context.Background())

	manager := &Manager{
		workers: make([]Worker, 0),
		logger:  logger,
		ctx:     ctx,
		cancel:  cancel,
	}

	// Initialize CSV worker
	if cfg.Workers.ThoughtQueue.Enabled && deps.CSVProcessingSvc != nil {
		interval := cfg.Workers.ThoughtQueue.Interval
		if interval == 0 {
			interval = 30 * time.Second
		}
		batchSize := cfg.Workers.ThoughtQueue.BatchSize
		if batchSize == 0 {
			batchSize = 10
		}

		csvWorker := NewCSVWorker(
			deps.Repo,
			deps.CSVProcessingSvc,
			interval,
			batchSize,
			logger.With(zap.String("worker", "csv")),
		)
		manager.workers = append(manager.workers, csvWorker)
		logger.Info("CSV worker initialized",
			zap.Duration("interval", interval),
			zap.Int("batchSize", batchSize),
		)
	}

	// Initialize DEXA worker
	if deps.OpenAIClient != nil && deps.StorageClient != nil {
		interval := 30 * time.Second // Default interval
		batchSize := 5               // Process 5 at a time

		dexaWorker := NewDexaWorker(
			deps.Repo,
			deps.StorageClient,
			deps.OpenAIClient,
			deps.BucketName,
			interval,
			batchSize,
			logger.With(zap.String("worker", "dexa")),
		)
		manager.workers = append(manager.workers, dexaWorker)
		logger.Info("DEXA worker initialized",
			zap.Duration("interval", interval),
			zap.Int("batchSize", batchSize),
		)
	}

	logger.Info("Worker manager initialized",
		zap.Int("workerCount", len(manager.workers)),
	)

	return manager
}

// Start starts all workers
func (m *Manager) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.running {
		return nil
	}

	m.logger.Info("Starting worker manager")

	for _, worker := range m.workers {
		m.wg.Add(1)
		go func(w Worker) {
			defer m.wg.Done()
			if err := w.Start(m.ctx); err != nil {
				m.logger.Error("Worker failed to start",
					zap.String("worker", w.Name()),
					zap.Error(err),
				)
			}
		}(worker)
	}

	m.running = true
	m.logger.Info("Worker manager started",
		zap.Int("workerCount", len(m.workers)),
	)

	return nil
}

// Stop gracefully stops all workers
func (m *Manager) Stop() error {
	m.mu.Lock()
	if !m.running {
		m.mu.Unlock()
		return nil
	}
	m.mu.Unlock()

	m.logger.Info("Stopping worker manager")

	// Cancel context to signal all workers to stop
	if m.cancel != nil {
		m.cancel()
	}

	// Stop each worker individually
	for _, worker := range m.workers {
		if err := worker.Stop(); err != nil {
			m.logger.Error("Failed to stop worker",
				zap.String("worker", worker.Name()),
				zap.Error(err),
			)
		}
	}

	// Wait for all workers to finish
	done := make(chan struct{})
	go func() {
		m.wg.Wait()
		close(done)
	}()

	// Wait with timeout
	select {
	case <-done:
		m.logger.Info("All workers stopped")
	case <-time.After(30 * time.Second):
		m.logger.Warn("Timeout waiting for workers to stop")
	}

	m.mu.Lock()
	m.running = false
	m.mu.Unlock()

	m.logger.Info("Worker manager stopped")
	return nil
}

// IsRunning returns whether the manager is running
func (m *Manager) IsRunning() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.running
}

// GetWorkerStatus returns the status of all workers
func (m *Manager) GetWorkerStatus() map[string]bool {
	status := make(map[string]bool)
	for _, worker := range m.workers {
		status[worker.Name()] = worker.IsRunning()
	}
	return status
}

// WorkerCount returns the number of registered workers
func (m *Manager) WorkerCount() int {
	return len(m.workers)
}
