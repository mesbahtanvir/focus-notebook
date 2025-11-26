/**
 * Enhanced Firebase Gateway Layer
 *
 * Provides resilient wrappers around common Firebase operations with:
 * - Automatic retry with exponential backoff
 * - Timeout handling
 * - Error classification and handling
 * - Standardized error reporting
 *
 * This layer sits between your application code and Firebase, providing
 * automatic resilience without requiring changes to existing code.
 */

import {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentSnapshot,
  QuerySnapshot,
  SetOptions,
  UpdateData,
} from 'firebase/firestore';
import { withRetry, RetryOptions, ErrorClassification } from './retry';

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  /**
   * Default retry options for all operations
   */
  defaultRetryOptions?: RetryOptions;

  /**
   * Operation-specific timeout in milliseconds
   */
  timeouts?: {
    read?: number;
    write?: number;
    delete?: number;
  };

  /**
   * Enable debug logging
   */
  enableLogging?: boolean;
}

const DEFAULT_CONFIG: GatewayConfig = {
  defaultRetryOptions: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    enableJitter: true,
    enableLogging: false,
  },
  timeouts: {
    read: 10000,  // 10 seconds for reads
    write: 15000, // 15 seconds for writes
    delete: 10000, // 10 seconds for deletes
  },
  enableLogging: false,
};

let gatewayConfig: GatewayConfig = { ...DEFAULT_CONFIG };

/**
 * Configure the gateway with custom options
 */
export function configureGateway(config: Partial<GatewayConfig>): void {
  gatewayConfig = {
    ...gatewayConfig,
    ...config,
    defaultRetryOptions: {
      ...gatewayConfig.defaultRetryOptions,
      ...config.defaultRetryOptions,
    },
    timeouts: {
      ...gatewayConfig.timeouts,
      ...config.timeouts,
    },
  };
}

/**
 * Get current gateway configuration
 */
export function getGatewayConfig(): GatewayConfig {
  return { ...gatewayConfig };
}

/**
 * Enhanced getDoc with retry and timeout
 */
export async function resilientGetDoc(
  reference: DocumentReference,
  options?: RetryOptions
): Promise<DocumentSnapshot> {
  const opts = {
    ...gatewayConfig.defaultRetryOptions,
    ...options,
    timeout: options?.timeout || gatewayConfig.timeouts?.read || 0,
  };

  if (gatewayConfig.enableLogging) {
    console.log('[Gateway] resilientGetDoc:', reference.path);
  }

  const result = await withRetry(
    () => getDoc(reference),
    opts
  );

  if (!result.success) {
    const error = result.error || new Error('Failed to get document');
    if (gatewayConfig.enableLogging) {
      console.error('[Gateway] resilientGetDoc failed:', error);
    }
    throw error;
  }

  return result.data!;
}

/**
 * Enhanced getDocs with retry and timeout
 */
export async function resilientGetDocs(
  query: Query,
  options?: RetryOptions
): Promise<QuerySnapshot> {
  const opts = {
    ...gatewayConfig.defaultRetryOptions,
    ...options,
    timeout: options?.timeout || gatewayConfig.timeouts?.read || 0,
  };

  if (gatewayConfig.enableLogging) {
    console.log('[Gateway] resilientGetDocs');
  }

  const result = await withRetry(
    () => getDocs(query),
    opts
  );

  if (!result.success) {
    const error = result.error || new Error('Failed to get documents');
    if (gatewayConfig.enableLogging) {
      console.error('[Gateway] resilientGetDocs failed:', error);
    }
    throw error;
  }

  return result.data!;
}

/**
 * Enhanced setDoc with retry and timeout
 */
export async function resilientSetDoc(
  reference: DocumentReference,
  data: any,
  options?: SetOptions & { retryOptions?: RetryOptions }
): Promise<void> {
  const { retryOptions, ...setOptions } = options || {};

  const opts = {
    ...gatewayConfig.defaultRetryOptions,
    ...retryOptions,
    timeout: retryOptions?.timeout || gatewayConfig.timeouts?.write || 0,
  };

  if (gatewayConfig.enableLogging) {
    console.log('[Gateway] resilientSetDoc:', reference.path);
  }

  const result = await withRetry(
    () => setDoc(reference, data, setOptions),
    opts
  );

  if (!result.success) {
    const error = result.error || new Error('Failed to set document');
    if (gatewayConfig.enableLogging) {
      console.error('[Gateway] resilientSetDoc failed:', error);
    }
    throw error;
  }
}

/**
 * Enhanced updateDoc with retry and timeout
 */
export async function resilientUpdateDoc(
  reference: DocumentReference,
  data: UpdateData<any>,
  options?: RetryOptions
): Promise<void> {
  const opts = {
    ...gatewayConfig.defaultRetryOptions,
    ...options,
    timeout: options?.timeout || gatewayConfig.timeouts?.write || 0,
  };

  if (gatewayConfig.enableLogging) {
    console.log('[Gateway] resilientUpdateDoc:', reference.path);
  }

  const result = await withRetry(
    () => updateDoc(reference, data),
    opts
  );

  if (!result.success) {
    const error = result.error || new Error('Failed to update document');
    if (gatewayConfig.enableLogging) {
      console.error('[Gateway] resilientUpdateDoc failed:', error);
    }
    throw error;
  }
}

/**
 * Enhanced deleteDoc with retry and timeout
 */
export async function resilientDeleteDoc(
  reference: DocumentReference,
  options?: RetryOptions
): Promise<void> {
  const opts = {
    ...gatewayConfig.defaultRetryOptions,
    ...options,
    timeout: options?.timeout || gatewayConfig.timeouts?.delete || 0,
  };

  if (gatewayConfig.enableLogging) {
    console.log('[Gateway] resilientDeleteDoc:', reference.path);
  }

  const result = await withRetry(
    () => deleteDoc(reference),
    opts
  );

  if (!result.success) {
    const error = result.error || new Error('Failed to delete document');
    if (gatewayConfig.enableLogging) {
      console.error('[Gateway] resilientDeleteDoc failed:', error);
    }
    throw error;
  }
}

/**
 * Enhanced addDoc with retry and timeout
 */
export async function resilientAddDoc(
  reference: CollectionReference,
  data: any,
  options?: RetryOptions
): Promise<DocumentReference> {
  const opts = {
    ...gatewayConfig.defaultRetryOptions,
    ...options,
    timeout: options?.timeout || gatewayConfig.timeouts?.write || 0,
  };

  if (gatewayConfig.enableLogging) {
    console.log('[Gateway] resilientAddDoc:', reference.path);
  }

  const result = await withRetry(
    () => addDoc(reference, data),
    opts
  );

  if (!result.success) {
    const error = result.error || new Error('Failed to add document');
    if (gatewayConfig.enableLogging) {
      console.error('[Gateway] resilientAddDoc failed:', error);
    }
    throw error;
  }

  return result.data!;
}

/**
 * Batch operation wrapper with retry
 * Executes multiple operations and retries the entire batch on failure
 */
export async function resilientBatch<T>(
  operations: Array<() => Promise<T>>,
  options?: RetryOptions
): Promise<T[]> {
  const opts = {
    ...gatewayConfig.defaultRetryOptions,
    ...options,
  };

  if (gatewayConfig.enableLogging) {
    console.log(`[Gateway] resilientBatch: ${operations.length} operations`);
  }

  const result = await withRetry(
    async () => {
      return Promise.all(operations.map(op => op()));
    },
    opts
  );

  if (!result.success) {
    const error = result.error || new Error('Batch operation failed');
    if (gatewayConfig.enableLogging) {
      console.error('[Gateway] resilientBatch failed:', error);
    }
    throw error;
  }

  return result.data!;
}

/**
 * Execute operation with automatic retry based on error type
 */
export async function resilientOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'operation',
  options?: RetryOptions
): Promise<T> {
  const opts = {
    ...gatewayConfig.defaultRetryOptions,
    ...options,
  };

  if (gatewayConfig.enableLogging) {
    console.log(`[Gateway] ${operationName}`);
  }

  const result = await withRetry(operation, opts);

  if (!result.success) {
    const error = result.error || new Error(`${operationName} failed`);
    if (gatewayConfig.enableLogging) {
      console.error(`[Gateway] ${operationName} failed:`, error);
    }
    throw error;
  }

  return result.data!;
}

/**
 * Safe operation wrapper that catches and classifies errors
 */
export async function safeOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<{ success: boolean; data?: T; error?: Error; errorType?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const err = error as Error;

    // Classify error
    let errorType = 'unknown';
    if (ErrorClassification.isNetworkError(err)) {
      errorType = 'network';
    } else if (ErrorClassification.isRateLimitError(err)) {
      errorType = 'rate-limit';
    } else if (ErrorClassification.isAuthError(err)) {
      errorType = 'auth';
    } else if (ErrorClassification.isTimeoutError(err)) {
      errorType = 'timeout';
    } else if (ErrorClassification.isTransientError(err)) {
      errorType = 'transient';
    } else {
      errorType = 'permanent';
    }

    if (gatewayConfig.enableLogging) {
      console.error(`[Gateway] safeOperation failed (${errorType}):`, err);
    }

    return {
      success: false,
      data: fallback,
      error: err,
      errorType,
    };
  }
}

/**
 * Re-export error classification utilities for convenience
 */
export { ErrorClassification } from './retry';
