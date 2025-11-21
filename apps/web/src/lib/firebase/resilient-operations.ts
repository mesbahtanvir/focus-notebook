/**
 * Resilient Firebase Operations
 *
 * Wrapper functions that combine all resilience features:
 * - Circuit breaker protection
 * - Automatic retry with exponential backoff
 * - Offline queue support
 * - Metrics collection
 */

import {
  getCircuitBreaker,
  getMetricsCollector,
  getOfflineQueue,
  resilientGetDoc,
  resilientSetDoc,
  resilientUpdateDoc,
  resilientDeleteDoc,
} from '@/lib/data/subscribe';
import type { DocumentReference, DocumentData, DocumentSnapshot } from 'firebase/firestore';

/**
 * Read operation with full resilience
 */
export async function resilientRead<T = DocumentData>(
  ref: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const startTime = Date.now();
  const path = ref.path;
  const breaker = getCircuitBreaker('firebase-read');
  const metrics = getMetricsCollector();

  try {
    // Execute through circuit breaker
    const result = await breaker.execute(async () => {
      return await resilientGetDoc(ref as DocumentReference<DocumentData>);
    });

    // Record success metrics
    metrics.recordOperation({
      operationType: 'read',
      path,
      duration: Date.now() - startTime,
      success: true,
      retryCount: 0,
      timestamp: Date.now(),
      fromCache: false,
    });

    return result as DocumentSnapshot<T>;
  } catch (error) {
    // Record failure metrics
    metrics.recordOperation({
      operationType: 'read',
      path,
      duration: Date.now() - startTime,
      success: false,
      error: (error as Error).message,
      retryCount: 0,
      timestamp: Date.now(),
      fromCache: false,
    });

    throw error;
  }
}

/**
 * Write operation with full resilience (create)
 */
export async function resilientCreate<T = DocumentData>(
  ref: DocumentReference<T>,
  data: T
): Promise<void> {
  const startTime = Date.now();
  const path = ref.path;
  const breaker = getCircuitBreaker('firebase-write');
  const metrics = getMetricsCollector();
  const queue = getOfflineQueue();

  // If offline, queue the operation
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queue.enqueue({
      type: 'create',
      priority: 'normal',
      path,
      data,
    });
    return;
  }

  try {
    // Execute through circuit breaker
    await breaker.execute(async () => {
      return await resilientSetDoc(ref as DocumentReference<DocumentData>, data as DocumentData);
    });

    // Record success metrics
    metrics.recordOperation({
      operationType: 'create',
      path,
      duration: Date.now() - startTime,
      success: true,
      retryCount: 0,
      timestamp: Date.now(),
      fromCache: false,
    });
  } catch (error) {
    // Record failure metrics
    metrics.recordOperation({
      operationType: 'create',
      path,
      duration: Date.now() - startTime,
      success: false,
      error: (error as Error).message,
      retryCount: 0,
      timestamp: Date.now(),
      fromCache: false,
    });

    throw error;
  }
}

/**
 * Write operation with full resilience (update)
 */
export async function resilientUpdate<T = DocumentData>(
  ref: DocumentReference<T>,
  data: Partial<T>
): Promise<void> {
  const startTime = Date.now();
  const path = ref.path;
  const breaker = getCircuitBreaker('firebase-write');
  const metrics = getMetricsCollector();
  const queue = getOfflineQueue();

  // If offline, queue the operation
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queue.enqueue({
      type: 'update',
      priority: 'normal',
      path,
      data,
    });
    return;
  }

  try {
    // Execute through circuit breaker
    await breaker.execute(async () => {
      return await resilientUpdateDoc(ref as DocumentReference<DocumentData>, data as Partial<DocumentData>);
    });

    // Record success metrics
    metrics.recordOperation({
      operationType: 'update',
      path,
      duration: Date.now() - startTime,
      success: true,
      retryCount: 0,
      timestamp: Date.now(),
      fromCache: false,
    });
  } catch (error) {
    // Record failure metrics
    metrics.recordOperation({
      operationType: 'update',
      path,
      duration: Date.now() - startTime,
      success: false,
      error: (error as Error).message,
      retryCount: 0,
      timestamp: Date.now(),
      fromCache: false,
    });

    throw error;
  }
}

/**
 * Delete operation with full resilience
 */
export async function resilientRemove<T = DocumentData>(
  ref: DocumentReference<T>
): Promise<void> {
  const startTime = Date.now();
  const path = ref.path;
  const breaker = getCircuitBreaker('firebase-write');
  const metrics = getMetricsCollector();
  const queue = getOfflineQueue();

  // If offline, queue the operation
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queue.enqueue({
      type: 'delete',
      priority: 'normal',
      path,
      data: {},
    });
    return;
  }

  try {
    // Execute through circuit breaker
    await breaker.execute(async () => {
      return await resilientDeleteDoc(ref as DocumentReference<DocumentData>);
    });

    // Record success metrics
    metrics.recordOperation({
      operationType: 'delete',
      path,
      duration: Date.now() - startTime,
      success: true,
      retryCount: 0,
      timestamp: Date.now(),
      fromCache: false,
    });
  } catch (error) {
    // Record failure metrics
    metrics.recordOperation({
      operationType: 'delete',
      path,
      duration: Date.now() - startTime,
      success: false,
      error: (error as Error).message,
      retryCount: 0,
      timestamp: Date.now(),
      fromCache: false,
    });

    throw error;
  }
}
