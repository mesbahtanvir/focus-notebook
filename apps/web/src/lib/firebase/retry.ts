/**
 * Retry Utility with Exponential Backoff
 *
 * Provides robust retry logic for Firebase operations that may fail due to:
 * - Transient network errors
 * - Rate limiting
 * - Temporary service unavailability
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable max attempts
 * - Error classification (retryable vs non-retryable)
 * - Timeout support
 * - Detailed logging
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * Default: 3
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds before first retry
   * Default: 1000 (1 second)
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds between retries
   * Default: 30000 (30 seconds)
   */
  maxDelay?: number;

  /**
   * Multiplier for exponential backoff
   * Default: 2
   */
  backoffMultiplier?: number;

  /**
   * Whether to add random jitter to delay (prevents thundering herd)
   * Default: true
   */
  enableJitter?: boolean;

  /**
   * Custom function to determine if error is retryable
   * If not provided, uses built-in error classification
   */
  shouldRetry?: (error: Error, attemptNumber: number) => boolean;

  /**
   * Callback invoked before each retry attempt
   */
  onRetry?: (error: Error, attemptNumber: number, delayMs: number) => void;

  /**
   * Enable debug logging
   * Default: false
   */
  enableLogging?: boolean;

  /**
   * Operation timeout in milliseconds (0 = no timeout)
   * Default: 0
   */
  timeout?: number;
}

export interface RetryResult<T> {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * Result data (if successful)
   */
  data?: T;

  /**
   * Final error (if failed)
   */
  error?: Error;

  /**
   * Number of attempts made
   */
  attempts: number;

  /**
   * Total time taken in milliseconds
   */
  totalTime: number;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  enableJitter: true,
  enableLogging: false,
  timeout: 0,
};

/**
 * Determines if an error is retryable based on common Firebase error patterns
 */
export function isRetryableError(error: Error): boolean {
  // Handle non-Error objects
  if (!error || typeof error !== 'object') {
    return true; // Retry by default for unknown errors
  }

  const errorMessage = (error.message || String(error)).toLowerCase();
  const errorCode = (error as any).code?.toLowerCase() || '';

  // Network errors - always retryable
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorCode === 'unavailable'
  ) {
    return true;
  }

  // Rate limiting - retryable with backoff
  if (
    errorCode === 'resource-exhausted' ||
    errorCode === 'too-many-requests' ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('quota')
  ) {
    return true;
  }

  // Transient server errors - retryable
  if (
    errorCode === 'internal' ||
    errorCode === 'unknown' ||
    errorMessage.includes('internal error') ||
    errorMessage.includes('service unavailable')
  ) {
    return true;
  }

  // Firestore specific errors
  if (
    errorCode === 'aborted' ||
    errorCode === 'cancelled' ||
    errorCode === 'deadline-exceeded'
  ) {
    return true;
  }

  // Non-retryable errors
  if (
    errorCode === 'permission-denied' ||
    errorCode === 'unauthenticated' ||
    errorCode === 'not-found' ||
    errorCode === 'already-exists' ||
    errorCode === 'invalid-argument' ||
    errorCode === 'failed-precondition'
  ) {
    return false;
  }

  // Default: retry for unknown errors (conservative approach)
  return true;
}

/**
 * Calculate delay for next retry with exponential backoff and optional jitter
 */
function calculateDelay(
  attemptNumber: number,
  options: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>>
): number {
  // Calculate exponential backoff
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attemptNumber - 1);

  // Cap at maxDelay
  let delay = Math.min(exponentialDelay, options.maxDelay);

  // Add jitter to prevent thundering herd problem
  if (options.enableJitter) {
    // Add random jitter of ±25%
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitter);
  }

  return Math.round(delay);
}

/**
 * Execute an async operation with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> & Pick<RetryOptions, 'shouldRetry' | 'onRetry'> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const startTime = Date.now();
  let lastError: Error | undefined;
  let attemptNumber = 0;

  while (attemptNumber < opts.maxAttempts) {
    attemptNumber++;

    try {
      if (opts.enableLogging) {
        console.log(`[Retry] Attempt ${attemptNumber}/${opts.maxAttempts}`);
      }

      // Execute operation with timeout if specified
      let result: T;
      if (opts.timeout > 0) {
        result = await withTimeout(operation(), opts.timeout);
      } else {
        result = await operation();
      }

      // Success!
      const totalTime = Date.now() - startTime;

      if (opts.enableLogging) {
        console.log(`[Retry] Success after ${attemptNumber} attempt(s), ${totalTime}ms`);
      }

      return {
        success: true,
        data: result,
        attempts: attemptNumber,
        totalTime,
      };
    } catch (error) {
      lastError = error as Error;

      if (opts.enableLogging) {
        console.error(`[Retry] Attempt ${attemptNumber} failed:`, error);
      }

      // Check if we should retry
      const shouldRetryFn = opts.shouldRetry || isRetryableError;
      const shouldRetry = attemptNumber < opts.maxAttempts && shouldRetryFn(lastError, attemptNumber);

      if (!shouldRetry) {
        if (opts.enableLogging) {
          console.log(`[Retry] Not retrying (retryable=${shouldRetryFn(lastError, attemptNumber)}, attemptsLeft=${opts.maxAttempts - attemptNumber})`);
        }
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attemptNumber, opts);

      if (opts.enableLogging) {
        console.log(`[Retry] Retrying in ${delay}ms...`);
      }

      // Invoke retry callback
      if (opts.onRetry) {
        opts.onRetry(lastError, attemptNumber, delay);
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  // All attempts failed
  const totalTime = Date.now() - startTime;

  if (opts.enableLogging) {
    console.error(`[Retry] All ${attemptNumber} attempts failed after ${totalTime}ms`, lastError);
  }

  return {
    success: false,
    error: lastError,
    attempts: attemptNumber,
    totalTime,
  };
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff (simplified API)
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  const result = await withRetry(operation, { maxAttempts });

  if (result.success && result.data !== undefined) {
    return result.data;
  }

  throw result.error || new Error('Operation failed after retries');
}

/**
 * Create a retryable version of a function
 */
export function retryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const result = await withRetry(() => fn(...args), options);

    if (result.success && result.data !== undefined) {
      return result.data;
    }

    throw result.error || new Error('Operation failed after retries');
  };
}

/**
 * Error classification utilities
 */
export const ErrorClassification = {
  /**
   * Check if error is a network error
   */
  isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const code = (error as any).code?.toLowerCase() || '';
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      code === 'unavailable'
    );
  },

  /**
   * Check if error is a rate limiting error
   */
  isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const code = (error as any).code?.toLowerCase() || '';
    return (
      code === 'resource-exhausted' ||
      code === 'too-many-requests' ||
      message.includes('rate limit') ||
      message.includes('quota')
    );
  },

  /**
   * Check if error is an authentication error
   */
  isAuthError(error: Error): boolean {
    const code = (error as any).code?.toLowerCase() || '';
    return (
      code === 'permission-denied' ||
      code === 'unauthenticated' ||
      code === 'auth/user-token-expired'
    );
  },

  /**
   * Check if error is a timeout error
   */
  isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const code = (error as any).code?.toLowerCase() || '';
    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      code === 'deadline-exceeded'
    );
  },

  /**
   * Check if error is a transient error (should retry)
   */
  isTransientError(error: Error): boolean {
    return isRetryableError(error);
  },

  /**
   * Check if error is a permanent error (should not retry)
   */
  isPermanentError(error: Error): boolean {
    return !isRetryableError(error);
  },
};
