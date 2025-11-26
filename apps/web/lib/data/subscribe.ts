import { onSnapshot, query, CollectionReference, DocumentReference, Query } from "firebase/firestore";

// Re-export resilient subscription utilities
export {
  createResilientSubscription,
  subscribeWithAutoReconnect,
  subscriptionManager,
  type SubscriptionHealth,
  type ResilientSubscriptionOptions,
} from '../firebase/subscription-health';

// Re-export retry and gateway utilities
export {
  withRetry,
  retry,
  retryable,
  withTimeout,
  isRetryableError,
  ErrorClassification,
  type RetryOptions,
  type RetryResult,
} from '../firebase/retry';

export {
  resilientGetDoc,
  resilientGetDocs,
  resilientSetDoc,
  resilientUpdateDoc,
  resilientDeleteDoc,
  resilientAddDoc,
  resilientBatch,
  resilientOperation,
  safeOperation,
  configureGateway,
  getGatewayConfig,
  type GatewayConfig,
} from '../firebase/gateway';

// Re-export offline queue utilities
export {
  getOfflineQueue,
  resetOfflineQueue,
  type QueuedOperation,
  type OperationType,
  type OperationPriority,
  type OperationStatus,
  type OfflineQueueConfig,
  type QueueStats,
} from '../firebase/offline-queue';

// Re-export circuit breaker utilities
export {
  CircuitBreaker,
  CircuitBreakerError,
  getCircuitBreaker,
  circuitBreakerRegistry,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerMetrics,
} from '../firebase/circuit-breaker';

// Re-export metrics utilities
export {
  MetricsCollector,
  getMetricsCollector,
  resetMetricsCollector,
  type OperationMetric,
  type ConnectionMetric,
  type MetricsSnapshot,
  type MetricsConfig,
} from '../firebase/metrics';

// Re-export connection monitor utilities
export {
  ConnectionMonitor,
  getConnectionMonitor,
  resetConnectionMonitor,
  type ConnectionHealth,
  type ConnectionMonitorConfig,
} from '../firebase/connection-monitor';

export interface SnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
  error?: Error;
}

/**
 * Subscribe to a single document
 * Returns unsubscribe function
 */
export function subscribeDoc<T>(
  ref: DocumentReference,
  cb: (data: T | null, meta: SnapshotMeta) => void
): () => void {
  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      const data = snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
      const meta = {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      };
      cb(data, meta);
    },
    (error) => {
      console.error('Document subscription error:', error);
      // Notify callback about error
      cb(null, {
        fromCache: false,
        hasPendingWrites: false,
        error: error as Error,
      });
    }
  );
}

/**
 * Subscribe to a collection/query
 * Returns unsubscribe function
 */
export function subscribeCol<T>(
  q: Query,
  cb: (rows: T[], meta: SnapshotMeta) => void
): () => void {
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      const meta = {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      };
      cb(rows, meta);
    },
    (error) => {
      console.error('Collection subscription error:', error);
      // Notify callback about error
      cb([], {
        fromCache: false,
        hasPendingWrites: false,
        error: error as Error,
      });
    }
  );
}
