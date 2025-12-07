package workers

import (
	"context"
	"sync"
	"time"

	"go.uber.org/zap"
)

// ScheduledJob represents a job that runs on a schedule
type ScheduledJob struct {
	Name     string
	Schedule string // cron expression or interval
	Handler  func(ctx context.Context) error
	Interval time.Duration // if using interval-based scheduling
	LastRun  time.Time
	Running  bool
	mu       sync.Mutex
}

// Scheduler manages scheduled jobs
type Scheduler struct {
	jobs     []*ScheduledJob
	logger   *zap.Logger
	ctx      context.Context
	cancel   context.CancelFunc
	wg       sync.WaitGroup
	running  bool
	mu       sync.RWMutex
}

// NewScheduler creates a new job scheduler
func NewScheduler(logger *zap.Logger) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	return &Scheduler{
		jobs:   make([]*ScheduledJob, 0),
		logger: logger,
		ctx:    ctx,
		cancel: cancel,
	}
}

// AddJob adds a scheduled job with an interval
func (s *Scheduler) AddJob(name string, interval time.Duration, handler func(ctx context.Context) error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	job := &ScheduledJob{
		Name:     name,
		Interval: interval,
		Handler:  handler,
	}
	s.jobs = append(s.jobs, job)

	s.logger.Info("Scheduled job added",
		zap.String("name", name),
		zap.Duration("interval", interval),
	)
}

// AddCronJob adds a scheduled job with a cron expression
func (s *Scheduler) AddCronJob(name string, cronExpr string, handler func(ctx context.Context) error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Parse cron expression to interval
	interval := parseCronToInterval(cronExpr)

	job := &ScheduledJob{
		Name:     name,
		Schedule: cronExpr,
		Interval: interval,
		Handler:  handler,
	}
	s.jobs = append(s.jobs, job)

	s.logger.Info("Cron job added",
		zap.String("name", name),
		zap.String("schedule", cronExpr),
		zap.Duration("interval", interval),
	)
}

// parseCronToInterval converts simple cron expressions to intervals
// Supports: @hourly, @daily, @weekly, or explicit intervals like "30m", "1h", "24h"
func parseCronToInterval(expr string) time.Duration {
	switch expr {
	case "@hourly":
		return time.Hour
	case "@daily":
		return 24 * time.Hour
	case "@weekly":
		return 7 * 24 * time.Hour
	case "@midnight":
		return 24 * time.Hour
	default:
		// Try to parse as duration
		if d, err := time.ParseDuration(expr); err == nil {
			return d
		}
		// Default to daily
		return 24 * time.Hour
	}
}

// Start begins running all scheduled jobs
func (s *Scheduler) Start() error {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return nil
	}
	s.running = true
	s.mu.Unlock()

	s.logger.Info("Starting scheduler",
		zap.Int("jobCount", len(s.jobs)),
	)

	for _, job := range s.jobs {
		s.wg.Add(1)
		go s.runJob(job)
	}

	return nil
}

// Stop stops all scheduled jobs
func (s *Scheduler) Stop() error {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return nil
	}
	s.mu.Unlock()

	s.logger.Info("Stopping scheduler")
	s.cancel()

	// Wait for all jobs to finish with timeout
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		s.logger.Info("All scheduled jobs stopped")
	case <-time.After(30 * time.Second):
		s.logger.Warn("Timeout waiting for scheduled jobs to stop")
	}

	s.mu.Lock()
	s.running = false
	s.mu.Unlock()

	return nil
}

// runJob runs a single scheduled job on its interval
func (s *Scheduler) runJob(job *ScheduledJob) {
	defer s.wg.Done()

	s.logger.Info("Starting scheduled job",
		zap.String("name", job.Name),
		zap.Duration("interval", job.Interval),
	)

	// Calculate initial delay to spread out job starts
	initialDelay := time.Duration(len(s.jobs)) * time.Second
	select {
	case <-time.After(initialDelay):
	case <-s.ctx.Done():
		return
	}

	// Run immediately on start
	s.executeJob(job)

	ticker := time.NewTicker(job.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			s.logger.Info("Scheduled job stopping",
				zap.String("name", job.Name),
			)
			return
		case <-ticker.C:
			s.executeJob(job)
		}
	}
}

// executeJob executes a single job with error handling
func (s *Scheduler) executeJob(job *ScheduledJob) {
	job.mu.Lock()
	if job.Running {
		job.mu.Unlock()
		s.logger.Warn("Job already running, skipping",
			zap.String("name", job.Name),
		)
		return
	}
	job.Running = true
	job.mu.Unlock()

	defer func() {
		job.mu.Lock()
		job.Running = false
		job.LastRun = time.Now()
		job.mu.Unlock()
	}()

	s.logger.Debug("Executing scheduled job",
		zap.String("name", job.Name),
	)

	startTime := time.Now()

	if err := job.Handler(s.ctx); err != nil {
		s.logger.Error("Scheduled job failed",
			zap.String("name", job.Name),
			zap.Error(err),
			zap.Duration("duration", time.Since(startTime)),
		)
		return
	}

	s.logger.Info("Scheduled job completed",
		zap.String("name", job.Name),
		zap.Duration("duration", time.Since(startTime)),
	)
}

// IsRunning returns whether the scheduler is running
func (s *Scheduler) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

// JobCount returns the number of registered jobs
func (s *Scheduler) JobCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.jobs)
}

// GetJobStatus returns status of all scheduled jobs
func (s *Scheduler) GetJobStatus() []map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := make([]map[string]interface{}, len(s.jobs))
	for i, job := range s.jobs {
		job.mu.Lock()
		status[i] = map[string]interface{}{
			"name":     job.Name,
			"schedule": job.Schedule,
			"interval": job.Interval.String(),
			"running":  job.Running,
			"lastRun":  job.LastRun,
		}
		job.mu.Unlock()
	}
	return status
}
