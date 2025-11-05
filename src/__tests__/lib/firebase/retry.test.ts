/**
 * Tests for retry utility with exponential backoff
 */

import {
  withRetry,
  retry,
  retryable,
  withTimeout,
  isRetryableError,
  ErrorClassification,
  RetryOptions,
} from '@/lib/firebase/retry';

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, { maxAttempts: 3 });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('network error'));

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error?.message).toBe('network error');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable error', async () => {
      const error = new Error('permission denied');
      (error as any).code = 'permission-denied';
      const operation = jest.fn().mockRejectedValue(error);

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        enableJitter: false,
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      // Should have waited at least 100ms + 200ms = 300ms
      expect(duration).toBeGreaterThanOrEqual(300);
    });

    it('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn();

      await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        expect.any(Number)
      );
    });

    it('should respect custom shouldRetry function', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('custom error'));
      const shouldRetry = jest.fn().mockReturnValue(false);

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should handle timeout', async () => {
      const operation = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const result = await withRetry(operation, {
        maxAttempts: 1,
        timeout: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('retry', () => {
    it('should return data on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retry(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw error on failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failed'));

      await expect(retry(operation, 2)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryable', () => {
    it('should create retryable function', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const retryableFn = retryable(fn, { maxAttempts: 3 });

      const result = await retryableFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should retry on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const retryableFn = retryable(fn, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      const result = await retryableFn();

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if promise completes in time', async () => {
      const promise = Promise.resolve('success');

      const result = await withTimeout(promise, 1000);

      expect(result).toBe('success');
    });

    it('should reject if promise times out', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 1000));

      await expect(withTimeout(promise, 100)).rejects.toThrow('timed out');
    });

    it('should use custom timeout error', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 1000));
      const customError = new Error('Custom timeout');

      await expect(withTimeout(promise, 100, customError)).rejects.toThrow('Custom timeout');
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError(new Error('network error'))).toBe(true);
      expect(isRetryableError(new Error('connection failed'))).toBe(true);
      expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    });

    it('should identify rate limit errors as retryable', () => {
      const error = new Error('rate limit');
      (error as any).code = 'resource-exhausted';
      expect(isRetryableError(error)).toBe(true);

      const error2 = new Error('quota exceeded');
      expect(isRetryableError(error2)).toBe(true);
    });

    it('should identify transient errors as retryable', () => {
      const error = new Error('internal error');
      (error as any).code = 'internal';
      expect(isRetryableError(error)).toBe(true);

      const error2 = new Error('service unavailable');
      expect(isRetryableError(error2)).toBe(true);
    });

    it('should identify permission errors as non-retryable', () => {
      const error = new Error('permission denied');
      (error as any).code = 'permission-denied';
      expect(isRetryableError(error)).toBe(false);

      const error2 = new Error('unauthenticated');
      (error2 as any).code = 'unauthenticated';
      expect(isRetryableError(error2)).toBe(false);
    });

    it('should identify not found errors as non-retryable', () => {
      const error = new Error('not found');
      (error as any).code = 'not-found';
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('ErrorClassification', () => {
    it('should classify network errors', () => {
      const error = new Error('network error');
      expect(ErrorClassification.isNetworkError(error)).toBe(true);
      expect(ErrorClassification.isTransientError(error)).toBe(true);
    });

    it('should classify rate limit errors', () => {
      const error = new Error('rate limit');
      (error as any).code = 'resource-exhausted';
      expect(ErrorClassification.isRateLimitError(error)).toBe(true);
      expect(ErrorClassification.isTransientError(error)).toBe(true);
    });

    it('should classify auth errors', () => {
      const error = new Error('permission denied');
      (error as any).code = 'permission-denied';
      expect(ErrorClassification.isAuthError(error)).toBe(true);
      expect(ErrorClassification.isPermanentError(error)).toBe(true);
    });

    it('should classify timeout errors', () => {
      const error = new Error('timeout');
      expect(ErrorClassification.isTimeoutError(error)).toBe(true);
      expect(ErrorClassification.isTransientError(error)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero maxAttempts', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, { maxAttempts: 0 });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(0);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should cap delay at maxDelay', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockRejectedValueOnce(new Error('error'))
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      const result = await withRetry(operation, {
        maxAttempts: 4,
        initialDelay: 1000,
        maxDelay: 2000,
        backoffMultiplier: 10,
        enableJitter: false,
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      // Should be capped: 1000 + 2000 + 2000 = 5000ms (not 1000 + 10000 + 100000)
      expect(duration).toBeLessThan(7000);
    }, 10000); // 10 second timeout

    it('should handle operation that throws non-Error', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      const result = await withRetry(operation, {
        maxAttempts: 2,
        initialDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Jitter', () => {
    it('should add jitter to delay when enabled', async () => {
      const delays: number[] = [];
      const operation = jest.fn().mockRejectedValue(new Error('network error'));

      await withRetry(operation, {
        maxAttempts: 5,
        initialDelay: 1000,
        enableJitter: true,
        enableLogging: false,
        onRetry: (_, __, delay) => delays.push(delay),
      });

      // With jitter, delays should not be exact multiples
      expect(delays.length).toBe(4);
      // All delays should be somewhat different (with 25% jitter range)
      const uniqueDelays = new Set(delays.map(d => Math.round(d / 100)));
      expect(uniqueDelays.size).toBeGreaterThan(1);
    }, 20000); // 20 second timeout for multiple retries

    it('should have consistent delays when jitter disabled', async () => {
      const delays: number[] = [];
      const operation = jest.fn().mockRejectedValue(new Error('network error'));

      await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        enableJitter: false,
        enableLogging: false,
        onRetry: (_, __, delay) => delays.push(delay),
      });

      expect(delays).toEqual([100, 200]);
    });
  });
});
