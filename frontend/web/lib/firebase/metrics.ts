/**
 * Metrics Collection System
 *
 * Collects and aggregates metrics about Firebase operations,
 * connection health, retry patterns, and performance.
 */

import { CircuitState } from './circuit-breaker';

export interface OperationMetric {
  operationType: string;
  path: string;
  duration: number;
  success: boolean;
  error?: string;
  retryCount: number;
  timestamp: number;
  fromCache: boolean;
}

export interface ConnectionMetric {
  isOnline: boolean;
  isBackground: boolean;
  backgroundDuration?: number;
  timestamp: number;
}

export interface MetricsSnapshot {
  // Operation metrics
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  operationsByType: Record<string, number>;

  // Retry metrics
  totalRetries: number;
  averageRetriesPerOperation: number;
  operationsRequiringRetry: number;

  // Connection metrics
  connectionUptime: number;
  offlineDuration: number;
  backgroundDuration: number;
  lastOnlineAt: number;
  lastOfflineAt?: number;

  // Circuit breaker metrics
  circuitBreakerState: Record<string, CircuitState>;
  circuitBreakerTrips: number;

  // Error metrics
  errorsByType: Record<string, number>;
  recentErrors: Array<{ timestamp: number; error: string; operationType: string }>;

  // Performance metrics
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  slowestOperations: Array<{ operationType: string; path: string; duration: number }>;
}

export interface MetricsConfig {
  /**
   * Maximum number of operations to keep in memory
   */
  maxOperations?: number;

  /**
   * Maximum number of recent errors to track
   */
  maxErrors?: number;

  /**
   * Enable automatic metrics cleanup
   */
  enableAutoCleanup?: boolean;

  /**
   * Cleanup interval in milliseconds
   */
  cleanupInterval?: number;

  /**
   * Enable debug logging
   */
  enableLogging?: boolean;
}

const DEFAULT_CONFIG: Required<MetricsConfig> = {
  maxOperations: 1000,
  maxErrors: 100,
  enableAutoCleanup: true,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  enableLogging: false,
};

/**
 * Metrics Collector
 */
export class MetricsCollector {
  private config: Required<MetricsConfig>;
  private operations: OperationMetric[] = [];
  private connectionEvents: ConnectionMetric[] = [];
  private circuitBreakerTrips = 0;
  private circuitBreakerStates: Map<string, CircuitState> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private startTime = Date.now();

  constructor(config: MetricsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Record an operation
   */
  recordOperation(metric: OperationMetric): void {
    this.operations.push(metric);

    // Trim if exceeds max
    if (this.operations.length > this.config.maxOperations) {
      this.operations = this.operations.slice(-this.config.maxOperations);
    }

    this.log(`Recorded operation: ${metric.operationType} ${metric.path} (${metric.duration}ms)`);
  }

  /**
   * Record connection event
   */
  recordConnectionEvent(metric: ConnectionMetric): void {
    this.connectionEvents.push(metric);
    this.log(`Connection event: online=${metric.isOnline}, background=${metric.isBackground}`);
  }

  /**
   * Record circuit breaker state change
   */
  recordCircuitBreakerState(name: string, state: CircuitState): void {
    const previousState = this.circuitBreakerStates.get(name);

    if (previousState === 'CLOSED' && state === 'OPEN') {
      this.circuitBreakerTrips++;
    }

    this.circuitBreakerStates.set(name, state);
    this.log(`Circuit breaker ${name}: ${previousState} -> ${state}`);
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    const now = Date.now();

    // Calculate operation metrics
    const totalOperations = this.operations.length;
    const successfulOperations = this.operations.filter(op => op.success).length;
    const failedOperations = totalOperations - successfulOperations;

    const totalDuration = this.operations.reduce((sum, op) => sum + op.duration, 0);
    const averageDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;

    const operationsByType: Record<string, number> = {};
    for (const op of this.operations) {
      operationsByType[op.operationType] = (operationsByType[op.operationType] || 0) + 1;
    }

    // Calculate retry metrics
    const totalRetries = this.operations.reduce((sum, op) => sum + op.retryCount, 0);
    const operationsRequiringRetry = this.operations.filter(op => op.retryCount > 0).length;
    const averageRetriesPerOperation = totalOperations > 0 ? totalRetries / totalOperations : 0;

    // Calculate connection metrics
    let lastOnlineAt = now;
    let lastOfflineAt: number | undefined;
    let totalOfflineTime = 0;
    let totalBackgroundTime = 0;

    for (let i = 0; i < this.connectionEvents.length; i++) {
      const event = this.connectionEvents[i];

      if (event.isOnline) {
        lastOnlineAt = event.timestamp;
      } else {
        lastOfflineAt = event.timestamp;

        // Calculate offline duration until next online event
        const nextOnlineEvent = this.connectionEvents
          .slice(i + 1)
          .find(e => e.isOnline);

        if (nextOnlineEvent) {
          totalOfflineTime += nextOnlineEvent.timestamp - event.timestamp;
        } else if (i === this.connectionEvents.length - 1) {
          // Still offline
          totalOfflineTime += now - event.timestamp;
        }
      }

      if (event.backgroundDuration) {
        totalBackgroundTime += event.backgroundDuration;
      }
    }

    const connectionUptime = now - this.startTime - totalOfflineTime;

    // Calculate circuit breaker metrics
    const circuitBreakerState: Record<string, CircuitState> = {};
    for (const [name, state] of this.circuitBreakerStates.entries()) {
      circuitBreakerState[name] = state;
    }

    // Calculate error metrics
    const failedOps = this.operations.filter(op => !op.success);
    const errorsByType: Record<string, number> = {};

    for (const op of failedOps) {
      const errorType = op.error || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    }

    const recentErrors = failedOps
      .slice(-this.config.maxErrors)
      .map(op => ({
        timestamp: op.timestamp,
        error: op.error || 'unknown',
        operationType: op.operationType,
      }));

    // Calculate performance metrics
    const sortedDurations = this.operations
      .map(op => op.duration)
      .sort((a, b) => a - b);

    const p50Index = Math.floor(sortedDurations.length * 0.5);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p99Index = Math.floor(sortedDurations.length * 0.99);

    const p50Duration = sortedDurations[p50Index] || 0;
    const p95Duration = sortedDurations[p95Index] || 0;
    const p99Duration = sortedDurations[p99Index] || 0;

    const slowestOperations = [...this.operations]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(op => ({
        operationType: op.operationType,
        path: op.path,
        duration: op.duration,
      }));

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageDuration,
      operationsByType,
      totalRetries,
      averageRetriesPerOperation,
      operationsRequiringRetry,
      connectionUptime,
      offlineDuration: totalOfflineTime,
      backgroundDuration: totalBackgroundTime,
      lastOnlineAt,
      lastOfflineAt,
      circuitBreakerState,
      circuitBreakerTrips: this.circuitBreakerTrips,
      errorsByType,
      recentErrors,
      p50Duration,
      p95Duration,
      p99Duration,
      slowestOperations,
    };
  }

  /**
   * Get operations within time range
   */
  getOperations(startTime?: number, endTime?: number): OperationMetric[] {
    let ops = this.operations;

    if (startTime) {
      ops = ops.filter(op => op.timestamp >= startTime);
    }

    if (endTime) {
      ops = ops.filter(op => op.timestamp <= endTime);
    }

    return ops;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.operations = [];
    this.connectionEvents = [];
    this.circuitBreakerTrips = 0;
    this.circuitBreakerStates.clear();
    this.startTime = Date.now();
    this.log('Cleared all metrics');
  }

  /**
   * Start automatic cleanup
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup old metrics
   */
  private cleanup(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    const beforeCount = this.operations.length;
    this.operations = this.operations.filter(op => op.timestamp > cutoffTime);
    this.connectionEvents = this.connectionEvents.filter(event => event.timestamp > cutoffTime);

    const removedCount = beforeCount - this.operations.length;
    if (removedCount > 0) {
      this.log(`Cleaned up ${removedCount} old metrics`);
    }
  }

  /**
   * Stop automatic cleanup and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Log message if logging enabled
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[MetricsCollector]', ...args);
    }
  }
}

// Singleton instance
let metricsCollectorInstance: MetricsCollector | null = null;

/**
 * Get the singleton metrics collector instance
 */
export function getMetricsCollector(config?: MetricsConfig): MetricsCollector {
  if (!metricsCollectorInstance) {
    metricsCollectorInstance = new MetricsCollector(config);
  }
  return metricsCollectorInstance;
}

/**
 * Reset the metrics collector (mainly for testing)
 */
export function resetMetricsCollector(): void {
  if (metricsCollectorInstance) {
    metricsCollectorInstance.destroy();
  }
  metricsCollectorInstance = null;
}
