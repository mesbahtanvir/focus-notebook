/**
 * Initialize Firebase Resilience Infrastructure
 *
 * Sets up offline queue, circuit breakers, metrics collection,
 * and connection monitoring with appropriate configurations.
 */

import {
  getOfflineQueue,
  getCircuitBreaker,
  getMetricsCollector,
  getConnectionMonitor,
  circuitBreakerRegistry,
} from '@/lib/data/subscribe';
import { db } from './client';
import { setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Initialize all resilience features
 */
export function initializeFirebaseResilience() {
  // 1. Initialize offline queue
  const queue = getOfflineQueue({
    maxQueueSize: IS_PRODUCTION ? 2000 : 500,
    maxRetries: IS_PRODUCTION ? 5 : 3,
    persistToStorage: true,
    autoProcess: true,
    enableLogging: !IS_PRODUCTION,
  });

  // Register operation executors
  queue.registerExecutor('create', async (op) => {
    await setDoc(doc(db, op.path), op.data);
  });

  queue.registerExecutor('update', async (op) => {
    await updateDoc(doc(db, op.path), op.data);
  });

  queue.registerExecutor('delete', async (op) => {
    await deleteDoc(doc(db, op.path));
  });

  // 2. Configure circuit breaker defaults
  circuitBreakerRegistry.setDefaultConfig({
    failureThreshold: IS_PRODUCTION ? 5 : 3,
    failureWindow: IS_PRODUCTION ? 60000 : 30000,
    resetTimeout: IS_PRODUCTION ? 30000 : 15000,
    successThreshold: IS_PRODUCTION ? 3 : 2,
    enableLogging: !IS_PRODUCTION,
  });

  // 3. Create circuit breakers for specific services
  getCircuitBreaker('firebase-read');
  getCircuitBreaker('firebase-write');
  getCircuitBreaker('firebase-auth');

  // 4. Initialize metrics collector
  getMetricsCollector({
    maxOperations: IS_PRODUCTION ? 5000 : 1000,
    maxErrors: IS_PRODUCTION ? 500 : 100,
    enableAutoCleanup: true,
    enableLogging: !IS_PRODUCTION,
  });

  // 5. Start connection monitor
  getConnectionMonitor({
    checkInterval: IS_PRODUCTION ? 60000 : 30000,
    performanceThreshold: IS_PRODUCTION ? 5000 : 3000,
    successRateThreshold: IS_PRODUCTION ? 0.95 : 0.85,
    autoStart: true,
    enableLogging: !IS_PRODUCTION,
  });

  if (!IS_PRODUCTION) {
    console.log('[Resilience] Firebase resilience infrastructure initialized');
  }
}
