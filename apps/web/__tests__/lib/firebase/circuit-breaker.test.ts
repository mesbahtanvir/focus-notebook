/**
 * Tests for Circuit Breaker pattern
 */

import {
  CircuitBreaker,
  CircuitBreakerError,
  getCircuitBreaker,
  circuitBreakerRegistry,
} from '@/lib/firebase/circuit-breaker';

describe('Circuit Breaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      failureWindow: 1000,
      resetTimeout: 1000,
      successThreshold: 2,
      enableLogging: false,
    });
  });

  afterEach(() => {
    breaker.destroy();
  });

  describe('CLOSED state', () => {
    it('should allow requests to pass through', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Transition to OPEN
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch (e) {
          // Expected
        }
      }
    });

    it('should reject requests immediately', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(breaker.execute(operation)).rejects.toThrow(CircuitBreakerError);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      const operation = jest.fn().mockResolvedValue('success');
      await breaker.execute(operation);

      expect(breaker.getState()).toBe('HALF_OPEN');
    }, 2000);
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Transition to OPEN
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failOp);
        } catch (e) {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
    }, 2000);

    it('should allow limited requests through', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should transition to CLOSED after successful requests', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // Need 2 successes (threshold)
      await breaker.execute(operation);
      await breaker.execute(operation);

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should transition back to OPEN on failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await breaker.execute(operation);
      } catch (e) {
        // Expected
      }

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('metrics', () => {
    it('should track successful requests', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await breaker.execute(operation);
      await breaker.execute(operation);

      const metrics = breaker.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
    });

    it('should track failed requests', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await breaker.execute(operation);
      } catch (e) {
        // Expected
      }

      const metrics = breaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
    });

    it('should track rejected requests', async () => {
      // Open circuit
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failOp);
        } catch (e) {
          // Expected
        }
      }

      // Try request when open
      const operation = jest.fn().mockResolvedValue('success');
      try {
        await breaker.execute(operation);
      } catch (e) {
        // Expected
      }

      const metrics = breaker.getMetrics();
      expect(metrics.rejectedRequests).toBe(1);
    });
  });

  describe('wrap', () => {
    it('should wrap a function with circuit breaker', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const wrapped = breaker.wrap(fn);

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should apply circuit breaker logic to wrapped function', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const wrapped = breaker.wrap(fn);

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await wrapped();
        } catch (e) {
          // Expected
        }
      }

      // Should reject now
      await expect(wrapped()).rejects.toThrow(CircuitBreakerError);
      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('manual control', () => {
    it('should allow forcing circuit open', () => {
      breaker.forceOpen();
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should allow forcing circuit closed', async () => {
      // Open circuit first
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch (e) {
          // Expected
        }
      }

      breaker.forceClose();
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should reset all metrics', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      await breaker.execute(operation);

      breaker.reset();

      const metrics = breaker.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('subscription', () => {
    it('should notify listeners on state change', async () => {
      const listener = jest.fn();
      breaker.subscribe(listener);

      // Should be called immediately with current state
      expect(listener).toHaveBeenCalledWith('CLOSED', expect.any(Object));

      // Open circuit
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch (e) {
          // Expected
        }
      }

      // Should be notified of state change
      expect(listener).toHaveBeenCalledWith('OPEN', expect.any(Object));
    });

    it('should allow unsubscribing', async () => {
      const listener = jest.fn();
      const unsubscribe = breaker.subscribe(listener);

      listener.mockClear();
      unsubscribe();

      // Open circuit
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch (e) {
          // Expected
        }
      }

      // Should not be notified after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('Circuit Breaker Registry', () => {
  beforeEach(() => {
    circuitBreakerRegistry.clear();
  });

  it('should create and retrieve circuit breakers', () => {
    const breaker1 = getCircuitBreaker('service1');
    const breaker2 = getCircuitBreaker('service1');

    expect(breaker1).toBe(breaker2); // Same instance
  });

  it('should manage multiple circuit breakers', () => {
    const breaker1 = getCircuitBreaker('service1');
    const breaker2 = getCircuitBreaker('service2');

    expect(breaker1).not.toBe(breaker2);
  });

  it('should provide aggregated metrics', async () => {
    const breaker1 = getCircuitBreaker('service1');
    const breaker2 = getCircuitBreaker('service2');

    await breaker1.execute(() => Promise.resolve('ok'));
    await breaker2.execute(() => Promise.resolve('ok'));

    const metrics = circuitBreakerRegistry.getAggregatedMetrics();

    expect(metrics.service1).toBeDefined();
    expect(metrics.service2).toBeDefined();
    expect(metrics.service1.totalRequests).toBe(1);
    expect(metrics.service2.totalRequests).toBe(1);
  });
});
