/**
 * Subscription Health Monitoring
 *
 * Tracks the health of Firestore subscriptions and automatically reconnects
 * stale subscriptions when tab returns to foreground.
 *
 * This solves the problem where Firestore listeners go dormant in background tabs
 * and don't automatically wake up when the tab returns to foreground.
 */

import { Query } from 'firebase/firestore';
import { subscribeCol, SnapshotMeta } from '@/lib/data/subscribe';
import { visibilityManager } from './visibility-manager';

interface SubscriptionHealth {
  id: string;
  lastUpdate: number;
  updateCount: number;
  isHealthy: boolean;
  reconnectAttempts: number;
  createdAt: number;
}

interface ResilientSubscriptionOptions {
  /**
   * Time in milliseconds without updates before subscription is considered stale
   * Default: 5 minutes
   */
  staleThreshold?: number;

  /**
   * Maximum number of reconnection attempts
   * Default: 3
   */
  maxReconnectAttempts?: number;

  /**
   * Whether to enable debug logging
   * Default: false
   */
  enableLogging?: boolean;

  /**
   * Callback when subscription becomes stale
   */
  onStale?: (health: SubscriptionHealth) => void;

  /**
   * Callback when reconnection succeeds
   */
  onReconnect?: (health: SubscriptionHealth) => void;

  /**
   * Callback when reconnection fails
   */
  onReconnectFailed?: (health: SubscriptionHealth, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<ResilientSubscriptionOptions, 'onStale' | 'onReconnect' | 'onReconnectFailed'>> = {
  staleThreshold: 5 * 60 * 1000, // 5 minutes
  maxReconnectAttempts: 3,
  enableLogging: false,
};

/**
 * Creates a resilient Firestore subscription that automatically recovers from staleness
 *
 * @param query - Firestore query to subscribe to
 * @param callback - Callback function to receive data updates
 * @param options - Configuration options
 * @returns Unsubscribe function
 */
export function createResilientSubscription<T>(
  query: Query,
  callback: (rows: T[], meta: SnapshotMeta) => void,
  options: ResilientSubscriptionOptions = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const subscriptionId = generateSubscriptionId();

  let unsubscribe: (() => void) | null = null;
  let health: SubscriptionHealth = {
    id: subscriptionId,
    lastUpdate: Date.now(),
    updateCount: 0,
    isHealthy: true,
    reconnectAttempts: 0,
    createdAt: Date.now(),
  };

  /**
   * Log messages if logging is enabled
   */
  const log = (...args: any[]) => {
    if (opts.enableLogging) {
      console.log(`[ResilientSubscription:${subscriptionId}]`, ...args);
    }
  };

  /**
   * Connect to Firestore
   */
  const connect = () => {
    log('Connecting...');

    unsubscribe = subscribeCol<T>(query, (rows, meta) => {
      // Update health on every callback
      health.lastUpdate = Date.now();
      health.updateCount++;
      health.isHealthy = true;

      // If this is a reconnection, reset attempts
      if (health.reconnectAttempts > 0) {
        log(`Reconnection successful after ${health.reconnectAttempts} attempts`);
        opts.onReconnect?.(health);
        health.reconnectAttempts = 0;
      }

      // Forward to callback
      callback(rows, meta);
    });
  };

  /**
   * Disconnect from Firestore
   */
  const disconnect = () => {
    if (unsubscribe) {
      log('Disconnecting...');
      unsubscribe();
      unsubscribe = null;
    }
  };

  /**
   * Reconnect to Firestore
   */
  const reconnect = (reason: string) => {
    if (health.reconnectAttempts >= opts.maxReconnectAttempts) {
      log(`Max reconnection attempts (${opts.maxReconnectAttempts}) exceeded. Giving up.`);
      health.isHealthy = false;
      return;
    }

    health.reconnectAttempts++;
    log(`Reconnecting (attempt ${health.reconnectAttempts}/${opts.maxReconnectAttempts}): ${reason}`);

    try {
      disconnect();
      connect();
    } catch (error) {
      log('Reconnection failed:', error);
      health.isHealthy = false;
      opts.onReconnectFailed?.(health, error as Error);
    }
  };

  /**
   * Check subscription health
   */
  const checkHealth = () => {
    const timeSinceUpdate = Date.now() - health.lastUpdate;

    // If stale and tab is currently visible, reconnect
    if (timeSinceUpdate > opts.staleThreshold && !visibilityManager.getIsBackground()) {
      log(`Subscription stale (no updates for ${Math.round(timeSinceUpdate / 1000)}s)`);
      health.isHealthy = false;
      opts.onStale?.(health);
      reconnect('stale subscription detected');
    }
  };

  /**
   * Handle visibility changes
   */
  const handleVisibilityChange = (isBackground: boolean, backgroundDuration?: number) => {
    if (isBackground) {
      // Tab went to background
      log('Tab went to background');
      return;
    }

    // Tab returned to foreground
    if (backgroundDuration === undefined) return;

    log(`Tab returned to foreground after ${Math.round(backgroundDuration / 1000)}s`);

    // Check if subscription is stale
    const timeSinceUpdate = Date.now() - health.lastUpdate;

    if (timeSinceUpdate > opts.staleThreshold || backgroundDuration > opts.staleThreshold) {
      log(
        `Subscription may be stale (last update: ${Math.round(timeSinceUpdate / 1000)}s ago, ` +
        `background: ${Math.round(backgroundDuration / 1000)}s)`
      );
      reconnect('foreground return after prolonged background');
    }
  };

  // Initial connection
  connect();

  // Set up health check interval (check every 30 seconds)
  const healthCheckInterval = setInterval(checkHealth, 30000);

  // Listen for visibility changes
  const unsubscribeVisibility = visibilityManager.onVisibilityChange(handleVisibilityChange);

  // Return cleanup function
  return () => {
    disconnect();
    clearInterval(healthCheckInterval);
    unsubscribeVisibility();
    log('Subscription destroyed');
  };
}

/**
 * Simple wrapper around createResilientSubscription with default options
 */
export function subscribeWithAutoReconnect<T>(
  query: Query,
  callback: (rows: T[], meta: SnapshotMeta) => void
): () => void {
  return createResilientSubscription<T>(query, callback, {
    staleThreshold: 5 * 60 * 1000,
    maxReconnectAttempts: 3,
    enableLogging: false,
  });
}

/**
 * Generate unique subscription ID
 */
function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Subscription Manager - manages multiple subscriptions
 */
class SubscriptionManager {
  private subscriptions: Map<string, () => void> = new Map();
  private healthStats: Map<string, SubscriptionHealth> = new Map();

  /**
   * Create and register a new subscription
   */
  subscribe<T>(
    key: string,
    query: Query,
    callback: (rows: T[], meta: SnapshotMeta) => void,
    options?: ResilientSubscriptionOptions
  ): () => void {
    // Unsubscribe existing subscription with same key
    this.unsubscribe(key);

    // Create new resilient subscription
    const unsubscribe = createResilientSubscription<T>(
      query,
      callback,
      {
        ...options,
        onReconnect: (health) => {
          this.healthStats.set(key, health);
          options?.onReconnect?.(health);
        },
        onStale: (health) => {
          this.healthStats.set(key, health);
          options?.onStale?.(health);
        },
      }
    );

    this.subscriptions.set(key, unsubscribe);

    // Return unsubscribe function
    return () => this.unsubscribe(key);
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(key: string): void {
    const unsubscribe = this.subscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(key);
      this.healthStats.delete(key);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
    this.healthStats.clear();
  }

  /**
   * Get number of active subscriptions
   */
  getActiveCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get health stats for a subscription
   */
  getHealth(key: string): SubscriptionHealth | undefined {
    return this.healthStats.get(key);
  }

  /**
   * Get all health stats
   */
  getAllHealth(): Map<string, SubscriptionHealth> {
    return new Map(this.healthStats);
  }

  /**
   * Check if all subscriptions are healthy
   */
  areAllHealthy(): boolean {
    return Array.from(this.healthStats.values()).every((health) => health.isHealthy);
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();

// Export types
export type { SubscriptionHealth, ResilientSubscriptionOptions };
