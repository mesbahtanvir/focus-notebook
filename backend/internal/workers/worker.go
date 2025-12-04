// Package workers provides background worker infrastructure for async processing
package workers

import (
	"context"
	"sync"
	"time"

	"go.uber.org/zap"
)

// JobStatus represents the status of a background job
type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusProcessing JobStatus = "processing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
)

// Job represents a unit of work for a background worker
type Job struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	UserID    string                 `json:"userId"`
	Payload   map[string]interface{} `json:"payload"`
	Status    JobStatus              `json:"status"`
	Error     string                 `json:"error,omitempty"`
	Attempts  int                    `json:"attempts"`
	CreatedAt time.Time              `json:"createdAt"`
	UpdatedAt time.Time              `json:"updatedAt"`
}

// Worker defines the interface for background workers
type Worker interface {
	// Name returns the worker name for logging
	Name() string
	// Start begins the worker's processing loop
	Start(ctx context.Context) error
	// Stop gracefully shuts down the worker
	Stop() error
	// IsRunning returns whether the worker is currently running
	IsRunning() bool
}

// BaseWorker provides common functionality for all workers
type BaseWorker struct {
	name      string
	logger    *zap.Logger
	running   bool
	mu        sync.RWMutex
	stopChan  chan struct{}
	doneChan  chan struct{}
	interval  time.Duration
	batchSize int
}

// NewBaseWorker creates a new base worker
func NewBaseWorker(name string, interval time.Duration, batchSize int, logger *zap.Logger) *BaseWorker {
	return &BaseWorker{
		name:      name,
		logger:    logger,
		interval:  interval,
		batchSize: batchSize,
		stopChan:  make(chan struct{}),
		doneChan:  make(chan struct{}),
	}
}

// Name returns the worker name
func (w *BaseWorker) Name() string {
	return w.name
}

// IsRunning returns whether the worker is running
func (w *BaseWorker) IsRunning() bool {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.running
}

// SetRunning sets the running state
func (w *BaseWorker) SetRunning(running bool) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.running = running
}

// GetStopChan returns the stop channel
func (w *BaseWorker) GetStopChan() <-chan struct{} {
	return w.stopChan
}

// SignalDone signals that the worker has stopped
func (w *BaseWorker) SignalDone() {
	close(w.doneChan)
}

// WaitDone waits for the worker to finish
func (w *BaseWorker) WaitDone() {
	<-w.doneChan
}

// Interval returns the worker's polling interval
func (w *BaseWorker) Interval() time.Duration {
	return w.interval
}

// BatchSize returns the worker's batch size
func (w *BaseWorker) BatchSize() int {
	return w.batchSize
}

// Logger returns the worker's logger
func (w *BaseWorker) Logger() *zap.Logger {
	return w.logger
}

// Stop gracefully shuts down the worker
func (w *BaseWorker) Stop() error {
	w.mu.Lock()
	if !w.running {
		w.mu.Unlock()
		return nil
	}
	w.mu.Unlock()

	close(w.stopChan)
	w.WaitDone()

	w.SetRunning(false)
	w.logger.Info("Worker stopped", zap.String("name", w.name))
	return nil
}

// ProcessFunc is a function that processes jobs
type ProcessFunc func(ctx context.Context) (int, error)

// RunLoop runs the worker's main processing loop
func (w *BaseWorker) RunLoop(ctx context.Context, process ProcessFunc) {
	defer w.SignalDone()

	w.SetRunning(true)
	w.logger.Info("Worker started",
		zap.String("name", w.name),
		zap.Duration("interval", w.interval),
		zap.Int("batchSize", w.batchSize),
	)

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	// Initial run
	if processed, err := process(ctx); err != nil {
		w.logger.Error("Worker processing error",
			zap.String("name", w.name),
			zap.Error(err),
		)
	} else if processed > 0 {
		w.logger.Info("Worker processed jobs",
			zap.String("name", w.name),
			zap.Int("count", processed),
		)
	}

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Worker context cancelled", zap.String("name", w.name))
			return
		case <-w.stopChan:
			w.logger.Info("Worker received stop signal", zap.String("name", w.name))
			return
		case <-ticker.C:
			if processed, err := process(ctx); err != nil {
				w.logger.Error("Worker processing error",
					zap.String("name", w.name),
					zap.Error(err),
				)
			} else if processed > 0 {
				w.logger.Info("Worker processed jobs",
					zap.String("name", w.name),
					zap.Int("count", processed),
				)
			}
		}
	}
}

// JobQueue represents a queue of jobs for processing
type JobQueue struct {
	jobs     []Job
	mu       sync.Mutex
	maxSize  int
	logger   *zap.Logger
}

// NewJobQueue creates a new job queue
func NewJobQueue(maxSize int, logger *zap.Logger) *JobQueue {
	return &JobQueue{
		jobs:    make([]Job, 0, maxSize),
		maxSize: maxSize,
		logger:  logger,
	}
}

// Enqueue adds a job to the queue
func (q *JobQueue) Enqueue(job Job) bool {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.jobs) >= q.maxSize {
		q.logger.Warn("Job queue full, dropping job",
			zap.String("jobId", job.ID),
			zap.String("jobType", job.Type),
		)
		return false
	}

	q.jobs = append(q.jobs, job)
	return true
}

// Dequeue removes and returns jobs from the queue
func (q *JobQueue) Dequeue(count int) []Job {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.jobs) == 0 {
		return nil
	}

	if count > len(q.jobs) {
		count = len(q.jobs)
	}

	jobs := make([]Job, count)
	copy(jobs, q.jobs[:count])
	q.jobs = q.jobs[count:]

	return jobs
}

// Size returns the current queue size
func (q *JobQueue) Size() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.jobs)
}
