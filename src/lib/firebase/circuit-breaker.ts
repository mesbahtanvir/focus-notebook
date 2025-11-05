/**
 * Circuit Breaker Pattern
 *
 * Prevents cascade failures by "opening" the circuit when too many
 * operations fail, allowing the system to recover gracefully.
 *
 * States:
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Too many failures, all requests fail fast
 * - HALF_OPEN: Testing if service recovered, limited requests pass through
 *
 * Features:
 * - Configurable failure threshold and timeout
 * - Automatic state transitions
 * - Metrics collection
 * - Event notifications
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening circuit
   * Default: 5
   */
  failureThreshold?: number;

  /**
   * Time window in ms for counting failures
   * Default: 60000 (1 minute)
   */
  failureWindow?: number;

  /**
   * Time in ms before transitioning from OPEN to HALF_OPEN
   * Default: 30000 (30 seconds)
   */
  resetTimeout?: number;

  /**
   * Number of successful requests in HALF_OPEN before closing circuit
   * Default: 2
   */
  successThreshold?: number;

  /**
   * Enable debug logging
   */
  enableLogging?: boolean;
}

export interface CircuitBreakerMetrics {
  /**
   * Current circuit state
   */
  state: CircuitState;

  /**
   * Total number of requests
   */
  totalRequests: number;

  /**
   * Number of successful requests
   */
  successfulRequests: number;

  /**
   * Number of failed requests
   */
  failedRequests: number;

  /**
   * Number of rejected requests (circuit open)
   */
  rejectedRequests: number;

  /**
   * Recent failures (within window)
   */
  recentFailures: number;

  /**
   * Recent successes in HALF_OPEN state
   */
  halfOpenSuccesses: number;

  /**
   * Timestamp of last state change
   */
  lastStateChange: number;

  /**
   * Timestamp when circuit will attempt to half-open
   */
  nextAttemptAt?: number;
}

export class CircuitBreakerError extends Error {
  constructor(message: string = 'Circuit breaker is OPEN') {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  failureWindow: 60000, // 1 minute
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2,
  enableLogging: false,
};

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitState = 'CLOSED';
  private failures: number[] = []; // Timestamps of failures
  private halfOpenSuccesses = 0;
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private rejectedRequests = 0;
  private lastStateChange = Date.now();
  private resetTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: CircuitState, metrics: CircuitBreakerMetrics) => void> = new Set();

  constructor(private name: string, config: CircuitBreakerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log(`Initialized with config:`, this.config);
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check circuit state
    if (this.state === 'OPEN') {
      // Check if we should transition to HALF_OPEN
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        // Reject request
        this.rejectedRequests++;
        this.log(`Request rejected - circuit is OPEN`);
        throw new CircuitBreakerError();
      }
    }

    try {
      // Execute operation
      const result = await operation();

      // Record success
      this.recordSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.recordFailure();

      // Re-throw error
      throw error;
    }
  }

  /**
   * Wrap a function with circuit breaker
   */
  wrap<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>
  ): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
      return this.execute(() => fn(...args));
    };
  }

  /**
   * Record successful request
   */
  private recordSuccess(): void {
    this.successfulRequests++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      this.log(`HALF_OPEN success ${this.halfOpenSuccesses}/${this.config.successThreshold}`);

      // Check if we should close the circuit
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(): void {
    this.failedRequests++;

    // Add failure timestamp
    const now = Date.now();
    this.failures.push(now);

    // Remove old failures outside the window
    const windowStart = now - this.config.failureWindow;
    this.failures = this.failures.filter(ts => ts > windowStart);

    this.log(`Recorded failure (${this.failures.length}/${this.config.failureThreshold} in window)`);

    // Check if we should open the circuit
    if (this.state === 'CLOSED' && this.failures.length >= this.config.failureThreshold) {
      this.transitionTo('OPEN');
    } else if (this.state === 'HALF_OPEN') {
      // Failure in HALF_OPEN state means service hasn't recovered
      this.transitionTo('OPEN');
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;

    if (oldState === newState) {
      return;
    }

    this.state = newState;
    this.lastStateChange = Date.now();

    this.log(`State transition: ${oldState} -> ${newState}`);

    // Clear reset timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    // Handle state-specific logic
    switch (newState) {
      case 'OPEN':
        // Schedule transition to HALF_OPEN
        this.resetTimer = setTimeout(() => {
          this.transitionTo('HALF_OPEN');
        }, this.config.resetTimeout);
        break;

      case 'HALF_OPEN':
        // Reset half-open success counter
        this.halfOpenSuccesses = 0;
        break;

      case 'CLOSED':
        // Clear failures
        this.failures = [];
        break;
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Check if we should attempt to reset (transition to HALF_OPEN)
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastStateChange >= this.config.resetTimeout;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const nextAttemptAt = this.state === 'OPEN'
      ? this.lastStateChange + this.config.resetTimeout
      : undefined;

    return {
      state: this.state,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      rejectedRequests: this.rejectedRequests,
      recentFailures: this.failures.length,
      halfOpenSuccesses: this.halfOpenSuccesses,
      lastStateChange: this.lastStateChange,
      nextAttemptAt,
    };
  }

  /**
   * Force open the circuit
   */
  forceOpen(): void {
    this.log('Forcing circuit OPEN');
    this.transitionTo('OPEN');
  }

  /**
   * Force close the circuit
   */
  forceClose(): void {
    this.log('Forcing circuit CLOSED');
    this.transitionTo('CLOSED');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.log('Resetting circuit breaker');
    this.failures = [];
    this.halfOpenSuccesses = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.rejectedRequests = 0;
    this.transitionTo('CLOSED');
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: CircuitState, metrics: CircuitBreakerMetrics) => void): () => void {
    this.listeners.add(listener);

    // Immediately call with current state
    listener(this.state, this.getMetrics());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const metrics = this.getMetrics();
    for (const listener of this.listeners) {
      try {
        listener(this.state, metrics);
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
      console.log(`[CircuitBreaker:${this.name}]`, ...args);
    }
  }

  /**
   * Destroy circuit breaker (cleanup)
   */
  destroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.listeners.clear();
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig = {};

  /**
   * Set default configuration for all circuit breakers
   */
  setDefaultConfig(config: CircuitBreakerConfig): void {
    this.defaultConfig = config;
  }

  /**
   * Get or create a circuit breaker
   */
  get(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(name);

    if (!breaker) {
      breaker = new CircuitBreaker(name, {
        ...this.defaultConfig,
        ...config,
      });
      this.breakers.set(name, breaker);
    }

    return breaker;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.destroy();
      return this.breakers.delete(name);
    }
    return false;
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};

    for (const [name, breaker] of this.breakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }

    return metrics;
  }
}

// Singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Create or get a circuit breaker
 */
export function getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
  return circuitBreakerRegistry.get(name, config);
}
