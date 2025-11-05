/**
 * Application-Level Offline Queue
 *
 * Queues Firebase operations when offline and automatically executes them
 * when the connection is restored.
 *
 * Features:
 * - Persistent queue (survives page reload using localStorage)
 * - Priority-based execution
 * - Automatic retry on failure
 * - Operation deduplication
 * - Progress tracking
 * - Conflict resolution
 */

import { withRetry, RetryOptions } from './retry';

export type OperationType = 'create' | 'update' | 'delete' | 'batch';
export type OperationPriority = 'high' | 'normal' | 'low';
export type OperationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface QueuedOperation {
  /**
   * Unique operation ID
   */
  id: string;

  /**
   * Type of operation
   */
  type: OperationType;

  /**
   * Priority (high priority operations execute first)
   */
  priority: OperationPriority;

  /**
   * Target resource path (e.g., "users/123/tasks/456")
   */
  path: string;

  /**
   * Operation data/payload
   */
  data: any;

  /**
   * Current status
   */
  status: OperationStatus;

  /**
   * Timestamp when operation was queued
   */
  queuedAt: number;

  /**
   * Timestamp when operation started processing
   */
  startedAt?: number;

  /**
   * Timestamp when operation completed/failed
   */
  completedAt?: number;

  /**
   * Number of retry attempts
   */
  retryCount: number;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Metadata for conflict resolution
   */
  metadata?: {
    version?: number;
    etag?: string;
    userId?: string;
  };
}

export interface OfflineQueueConfig {
  /**
   * Maximum number of operations to keep in queue
   */
  maxQueueSize?: number;

  /**
   * Maximum retry attempts per operation
   */
  maxRetries?: number;

  /**
   * Enable persistent storage (localStorage)
   */
  persistToStorage?: boolean;

  /**
   * Storage key prefix
   */
  storageKeyPrefix?: string;

  /**
   * Enable debug logging
   */
  enableLogging?: boolean;

  /**
   * Retry options for operations
   */
  retryOptions?: RetryOptions;

  /**
   * Auto-process queue when online
   */
  autoProcess?: boolean;
}

export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  byType: Record<OperationType, number>;
  byPriority: Record<OperationPriority, number>;
  oldestQueuedAt?: number;
}

const DEFAULT_CONFIG: Required<Omit<OfflineQueueConfig, 'retryOptions'>> & Pick<OfflineQueueConfig, 'retryOptions'> = {
  maxQueueSize: 1000,
  maxRetries: 5,
  persistToStorage: true,
  storageKeyPrefix: 'firebase_offline_queue',
  enableLogging: false,
  autoProcess: true,
  retryOptions: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    enableJitter: true,
  },
};

/**
 * Offline Queue Manager
 */
class OfflineQueue {
  private config: Required<Omit<OfflineQueueConfig, 'retryOptions'>> & Pick<OfflineQueueConfig, 'retryOptions'>;
  private queue: Map<string, QueuedOperation> = new Map();
  private executors: Map<OperationType, (op: QueuedOperation) => Promise<void>> = new Map();
  private isProcessing = false;
  private listeners: Set<(stats: QueueStats) => void> = new Set();

  constructor(config: OfflineQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Load from storage if enabled
    if (this.config.persistToStorage) {
      this.loadFromStorage();
    }

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  /**
   * Register an executor for a specific operation type
   */
  registerExecutor(type: OperationType, executor: (op: QueuedOperation) => Promise<void>): void {
    this.executors.set(type, executor);
    this.log(`Registered executor for type: ${type}`);
  }

  /**
   * Add operation to queue
   */
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'status' | 'queuedAt' | 'retryCount'>): Promise<string> {
    // Check queue size
    if (this.queue.size >= this.config.maxQueueSize) {
      throw new Error(`Queue size limit reached (${this.config.maxQueueSize})`);
    }

    // Check for duplicate operation
    const duplicateId = this.findDuplicate(operation);
    if (duplicateId) {
      this.log(`Duplicate operation found: ${duplicateId}`);
      return duplicateId;
    }

    // Create queued operation
    const queuedOp: QueuedOperation = {
      ...operation,
      id: this.generateId(),
      status: 'queued',
      queuedAt: Date.now(),
      retryCount: 0,
    };

    // Add to queue
    this.queue.set(queuedOp.id, queuedOp);
    this.log(`Enqueued operation: ${queuedOp.id} (${queuedOp.type} ${queuedOp.path})`);

    // Persist to storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    // Notify listeners
    this.notifyListeners();

    // Auto-process if online
    if (this.config.autoProcess && navigator.onLine && !this.isProcessing) {
      this.processQueue().catch(err => this.log('Auto-process error:', err));
    }

    return queuedOp.id;
  }

  /**
   * Remove operation from queue
   */
  remove(operationId: string): boolean {
    const removed = this.queue.delete(operationId);

    if (removed) {
      this.log(`Removed operation: ${operationId}`);

      if (this.config.persistToStorage) {
        this.saveToStorage();
      }

      this.notifyListeners();
    }

    return removed;
  }

  /**
   * Clear all operations
   */
  clear(status?: OperationStatus): void {
    if (status) {
      // Clear specific status
      for (const [id, op] of this.queue.entries()) {
        if (op.status === status) {
          this.queue.delete(id);
        }
      }
      this.log(`Cleared operations with status: ${status}`);
    } else {
      // Clear all
      this.queue.clear();
      this.log('Cleared all operations');
    }

    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    this.notifyListeners();
  }

  /**
   * Get operation by ID
   */
  get(operationId: string): QueuedOperation | undefined {
    return this.queue.get(operationId);
  }

  /**
   * Get all operations
   */
  getAll(status?: OperationStatus): QueuedOperation[] {
    const operations = Array.from(this.queue.values());

    if (status) {
      return operations.filter(op => op.status === status);
    }

    return operations;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const operations = Array.from(this.queue.values());

    const stats: QueueStats = {
      total: operations.length,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      byType: { create: 0, update: 0, delete: 0, batch: 0 },
      byPriority: { high: 0, normal: 0, low: 0 },
    };

    let oldestQueuedAt: number | undefined;

    for (const op of operations) {
      // Count by status
      stats[op.status]++;

      // Count by type
      stats.byType[op.type]++;

      // Count by priority
      stats.byPriority[op.priority]++;

      // Track oldest
      if (op.status === 'queued' && (!oldestQueuedAt || op.queuedAt < oldestQueuedAt)) {
        oldestQueuedAt = op.queuedAt;
      }
    }

    stats.oldestQueuedAt = oldestQueuedAt;

    return stats;
  }

  /**
   * Process queue (execute all queued operations)
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      this.log('Queue is already being processed');
      return;
    }

    if (!navigator.onLine) {
      this.log('Cannot process queue: offline');
      return;
    }

    this.isProcessing = true;
    this.log('Starting queue processing...');

    try {
      // Get queued operations sorted by priority then timestamp
      const queuedOps = Array.from(this.queue.values())
        .filter(op => op.status === 'queued')
        .sort((a, b) => {
          // Sort by priority first
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;

          // Then by timestamp (FIFO within same priority)
          return a.queuedAt - b.queuedAt;
        });

      this.log(`Processing ${queuedOps.length} operations...`);

      for (const op of queuedOps) {
        await this.processOperation(op);
      }

      this.log('Queue processing completed');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(op: QueuedOperation): Promise<void> {
    this.log(`Processing operation: ${op.id} (${op.type} ${op.path})`);

    // Get executor
    const executor = this.executors.get(op.type);
    if (!executor) {
      this.log(`No executor registered for type: ${op.type}`);
      this.markFailed(op, `No executor registered for type: ${op.type}`);
      return;
    }

    // Update status
    op.status = 'processing';
    op.startedAt = Date.now();
    this.notifyListeners();

    try {
      // Execute with retry
      await withRetry(
        () => executor(op),
        {
          ...this.config.retryOptions,
          maxAttempts: this.config.maxRetries,
          onRetry: (error, attempt) => {
            op.retryCount = attempt;
            this.log(`Retry ${attempt} for operation ${op.id}: ${error.message}`);
            this.notifyListeners();
          },
        }
      );

      // Mark as completed
      this.markCompleted(op);
    } catch (error) {
      // Mark as failed
      this.markFailed(op, (error as Error).message);
    }
  }

  /**
   * Mark operation as completed
   */
  private markCompleted(op: QueuedOperation): void {
    op.status = 'completed';
    op.completedAt = Date.now();

    this.log(`Operation completed: ${op.id} (took ${op.completedAt - op.queuedAt}ms)`);

    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    this.notifyListeners();
  }

  /**
   * Mark operation as failed
   */
  private markFailed(op: QueuedOperation, error: string): void {
    op.status = 'failed';
    op.completedAt = Date.now();
    op.error = error;

    this.log(`Operation failed: ${op.id} - ${error}`);

    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    this.notifyListeners();
  }

  /**
   * Find duplicate operation
   */
  private findDuplicate(operation: Omit<QueuedOperation, 'id' | 'status' | 'queuedAt' | 'retryCount'>): string | null {
    for (const [id, op] of this.queue.entries()) {
      if (
        op.status === 'queued' &&
        op.type === operation.type &&
        op.path === operation.path &&
        JSON.stringify(op.data) === JSON.stringify(operation.data)
      ) {
        return id;
      }
    }
    return null;
  }

  /**
   * Generate unique operation ID
   */
  private generateId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.log('Connection restored - processing queue');
    if (this.config.autoProcess) {
      this.processQueue().catch(err => this.log('Process error:', err));
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.log('Connection lost');
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = JSON.stringify(Array.from(this.queue.entries()));
      localStorage.setItem(this.config.storageKeyPrefix, data);
    } catch (error) {
      this.log('Failed to save to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem(this.config.storageKeyPrefix);
      if (data) {
        const entries = JSON.parse(data) as Array<[string, QueuedOperation]>;
        this.queue = new Map(entries);
        this.log(`Loaded ${this.queue.size} operations from storage`);
      }
    } catch (error) {
      this.log('Failed to load from storage:', error);
    }
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.add(listener);

    // Immediately call with current stats
    listener(this.getStats());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    for (const listener of this.listeners) {
      try {
        listener(stats);
      } catch (error) {
        this.log('Listener error:', error);
      }
    }
  }

  /**
   * Log message if logging enabled
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[OfflineQueue]', ...args);
    }
  }
}

// Singleton instance
let offlineQueueInstance: OfflineQueue | null = null;

/**
 * Get the singleton offline queue instance
 */
export function getOfflineQueue(config?: OfflineQueueConfig): OfflineQueue {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineQueue(config);
  }
  return offlineQueueInstance;
}

/**
 * Reset the offline queue (mainly for testing)
 */
export function resetOfflineQueue(): void {
  offlineQueueInstance = null;
}
