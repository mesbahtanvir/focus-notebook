/**
 * Connection Health Monitor
 *
 * Comprehensive monitoring of Firebase connection health,
 * integrating visibility tracking, circuit breakers, metrics,
 * and offline queue.
 */

import { visibilityManager } from './visibility-manager';
import { getCircuitBreaker, CircuitState } from './circuit-breaker';
import { getMetricsCollector } from './metrics';
import { getOfflineQueue } from './offline-queue';

export interface ConnectionHealth {
  /**
   * Overall health status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /**
   * Is browser online
   */
  isOnline: boolean;

  /**
   * Is tab in background
   */
  isBackground: boolean;

  /**
   * Background duration (if currently in background)
   */
  backgroundDuration?: number;

  /**
   * Circuit breaker states
   */
  circuitBreakers: Record<string, {
    state: CircuitState;
    healthy: boolean;
  }>;

  /**
   * Offline queue status
   */
  offlineQueue: {
    size: number;
    processing: boolean;
    oldestQueuedAt?: number;
  };

  /**
   * Performance indicators
   */
  performance: {
    averageDuration: number;
    successRate: number;
    retryRate: number;
  };

  /**
   * Recent issues
   */
  issues: Array<{
    type: 'circuit_breaker' | 'offline' | 'performance' | 'errors';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: number;
  }>;
}

export interface ConnectionMonitorConfig {
  /**
   * Check interval in milliseconds
   */
  checkInterval?: number;

  /**
   * Performance degradation threshold (average duration in ms)
   */
  performanceThreshold?: number;

  /**
   * Success rate threshold (0-1)
   */
  successRateThreshold?: number;

  /**
   * Enable auto-monitoring
   */
  autoStart?: boolean;

  /**
   * Enable debug logging
   */
  enableLogging?: boolean;
}

const DEFAULT_CONFIG: Required<ConnectionMonitorConfig> = {
  checkInterval: 30000, // 30 seconds
  performanceThreshold: 5000, // 5 seconds
  successRateThreshold: 0.9, // 90%
  autoStart: true,
  enableLogging: false,
};

/**
 * Connection Monitor
 */
export class ConnectionMonitor {
  private config: Required<ConnectionMonitorConfig>;
  private checkTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(health: ConnectionHealth) => void> = new Set();
  private lastHealth: ConnectionHealth | null = null;

  constructor(config: ConnectionMonitorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.checkTimer) {
      this.log('Monitor already running');
      return;
    }

    this.log('Starting connection monitor...');

    // Perform initial check
    this.check();

    // Schedule periodic checks
    this.checkTimer = setInterval(() => {
      this.check();
    }, this.config.checkInterval);

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }

    // Listen for visibility changes
    visibilityManager.onVisibilityChange((isBackground) => {
      this.log(`Visibility changed: background=${isBackground}`);
      this.check();
    });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      this.log('Stopped connection monitor');
    }
  }

  /**
   * Perform health check
   */
  check(): ConnectionHealth {
    const health = this.calculateHealth();
    this.lastHealth = health;

    // Notify listeners
    this.notifyListeners(health);

    this.log(`Health check: ${health.status}`);

    return health;
  }

  /**
   * Calculate connection health
   */
  private calculateHealth(): ConnectionHealth {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const isBackground = visibilityManager.getIsBackground();
    const backgroundDuration = visibilityManager.getBackgroundDuration() || undefined;

    // Get metrics
    const metrics = getMetricsCollector().getSnapshot();

    // Get offline queue stats
    const queueStats = getOfflineQueue().getStats();

    // Get circuit breaker states
    const circuitBreakers: Record<string, { state: CircuitState; healthy: boolean }> = {};
    for (const [name, state] of Object.entries(metrics.circuitBreakerState)) {
      circuitBreakers[name] = {
        state,
        healthy: state === 'CLOSED',
      };
    }

    // Calculate performance indicators
    const successRate = metrics.totalOperations > 0
      ? metrics.successfulOperations / metrics.totalOperations
      : 1;

    const retryRate = metrics.totalOperations > 0
      ? metrics.operationsRequiringRetry / metrics.totalOperations
      : 0;

    const performance = {
      averageDuration: Math.round(metrics.averageDuration),
      successRate: Math.round(successRate * 100) / 100,
      retryRate: Math.round(retryRate * 100) / 100,
    };

    // Identify issues
    const issues: ConnectionHealth['issues'] = [];

    // Check if offline
    if (!isOnline) {
      issues.push({
        type: 'offline',
        severity: 'high',
        message: 'Browser is offline',
        timestamp: Date.now(),
      });
    }

    // Check circuit breakers
    for (const [name, breaker] of Object.entries(circuitBreakers)) {
      if (breaker.state === 'OPEN') {
        issues.push({
          type: 'circuit_breaker',
          severity: 'high',
          message: `Circuit breaker '${name}' is OPEN`,
          timestamp: Date.now(),
        });
      } else if (breaker.state === 'HALF_OPEN') {
        issues.push({
          type: 'circuit_breaker',
          severity: 'medium',
          message: `Circuit breaker '${name}' is testing recovery`,
          timestamp: Date.now(),
        });
      }
    }

    // Check performance
    if (metrics.averageDuration > this.config.performanceThreshold) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        message: `Average operation duration is ${Math.round(metrics.averageDuration)}ms (threshold: ${this.config.performanceThreshold}ms)`,
        timestamp: Date.now(),
      });
    }

    // Check success rate
    if (successRate < this.config.successRateThreshold) {
      issues.push({
        type: 'errors',
        severity: 'high',
        message: `Success rate is ${Math.round(successRate * 100)}% (threshold: ${Math.round(this.config.successRateThreshold * 100)}%)`,
        timestamp: Date.now(),
      });
    }

    // Check offline queue
    if (queueStats.queued > 50) {
      issues.push({
        type: 'offline',
        severity: 'medium',
        message: `${queueStats.queued} operations queued`,
        timestamp: Date.now(),
      });
    }

    // Determine overall status
    let status: ConnectionHealth['status'] = 'healthy';

    if (issues.some(i => i.severity === 'high')) {
      status = 'unhealthy';
    } else if (issues.some(i => i.severity === 'medium')) {
      status = 'degraded';
    }

    return {
      status,
      isOnline,
      isBackground,
      backgroundDuration,
      circuitBreakers,
      offlineQueue: {
        size: queueStats.total,
        processing: queueStats.processing > 0,
        oldestQueuedAt: queueStats.oldestQueuedAt,
      },
      performance,
      issues,
    };
  }

  /**
   * Get last health check result
   */
  getHealth(): ConnectionHealth | null {
    return this.lastHealth;
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.log('Connection restored');
    getMetricsCollector().recordConnectionEvent({
      isOnline: true,
      isBackground: visibilityManager.getIsBackground(),
      timestamp: Date.now(),
    });
    this.check();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.log('Connection lost');
    getMetricsCollector().recordConnectionEvent({
      isOnline: false,
      isBackground: visibilityManager.getIsBackground(),
      timestamp: Date.now(),
    });
    this.check();
  }

  /**
   * Subscribe to health changes
   */
  subscribe(listener: (health: ConnectionHealth) => void): () => void {
    this.listeners.add(listener);

    // Immediately call with current health
    if (this.lastHealth) {
      listener(this.lastHealth);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(health: ConnectionHealth): void {
    for (const listener of this.listeners) {
      try {
        listener(health);
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
      console.log('[ConnectionMonitor]', ...args);
    }
  }

  /**
   * Destroy monitor (cleanup)
   */
  destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

// Singleton instance
let connectionMonitorInstance: ConnectionMonitor | null = null;

/**
 * Get the singleton connection monitor instance
 */
export function getConnectionMonitor(config?: ConnectionMonitorConfig): ConnectionMonitor {
  if (!connectionMonitorInstance) {
    connectionMonitorInstance = new ConnectionMonitor(config);
  }
  return connectionMonitorInstance;
}

/**
 * Reset the connection monitor (mainly for testing)
 */
export function resetConnectionMonitor(): void {
  if (connectionMonitorInstance) {
    connectionMonitorInstance.destroy();
  }
  connectionMonitorInstance = null;
}
