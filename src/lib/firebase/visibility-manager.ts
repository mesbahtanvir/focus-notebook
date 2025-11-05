/**
 * VisibilityManager - Handles tab visibility state and coordinates refresh actions
 *
 * This service solves the background tab problem by:
 * - Detecting when tab goes to background/foreground
 * - Tracking how long the tab was in background
 * - Triggering appropriate refresh actions when returning to foreground
 * - Coordinating with subscriptions and auth to prevent stale data
 */

type VisibilityListener = (isBackground: boolean, backgroundDuration?: number) => void;

interface VisibilityConfig {
  staleThreshold: number;      // Time in ms before data is considered stale (default: 5 min)
  authRefreshThreshold: number; // Time in ms before forcing auth token refresh (default: 50 min)
  enableLogging: boolean;       // Enable debug logging
}

const DEFAULT_CONFIG: VisibilityConfig = {
  staleThreshold: 5 * 60 * 1000,      // 5 minutes
  authRefreshThreshold: 50 * 60 * 1000, // 50 minutes
  enableLogging: true,
};

class VisibilityManager {
  private static instance: VisibilityManager;

  private config: VisibilityConfig;
  private isBackground: boolean = false;
  private lastActiveTime: number = Date.now();
  private backgroundStartTime: number | null = null;
  private listeners: Set<VisibilityListener> = new Set();

  private constructor(config: Partial<VisibilityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<VisibilityConfig>): VisibilityManager {
    if (!VisibilityManager.instance) {
      VisibilityManager.instance = new VisibilityManager(config);
    }
    return VisibilityManager.instance;
  }

  /**
   * Initialize visibility tracking
   */
  private initialize(): void {
    if (typeof document === 'undefined') {
      // SSR environment, skip initialization
      return;
    }

    // Set initial state
    this.isBackground = document.hidden;

    // Listen for visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Listen for page focus/blur as fallback
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);

    this.log('VisibilityManager initialized');
  }

  /**
   * Handle visibility state change
   */
  private handleVisibilityChange = (): void => {
    const isNowBackground = document.hidden;

    if (isNowBackground !== this.isBackground) {
      this.isBackground = isNowBackground;

      if (isNowBackground) {
        this.handleBackgroundTransition();
      } else {
        this.handleForegroundTransition();
      }
    }
  };

  /**
   * Handle focus event (tab became active)
   */
  private handleFocus = (): void => {
    if (this.isBackground) {
      this.isBackground = false;
      this.handleForegroundTransition();
    }
  };

  /**
   * Handle blur event (tab became inactive)
   */
  private handleBlur = (): void => {
    if (!this.isBackground) {
      this.isBackground = true;
      this.handleBackgroundTransition();
    }
  };

  /**
   * Tab went to background
   */
  private handleBackgroundTransition(): void {
    this.backgroundStartTime = Date.now();
    this.log('Tab went to background');

    // Notify listeners
    this.notifyListeners(true, 0);
  }

  /**
   * Tab returned to foreground
   */
  private handleForegroundTransition(): void {
    const backgroundDuration = this.backgroundStartTime
      ? Date.now() - this.backgroundStartTime
      : 0;

    this.lastActiveTime = Date.now();
    this.backgroundStartTime = null;

    this.log(`Tab returned to foreground after ${Math.round(backgroundDuration / 1000)}s`);

    // Notify listeners with background duration
    this.notifyListeners(false, backgroundDuration);
  }

  /**
   * Notify all registered listeners
   */
  private notifyListeners(isBackground: boolean, backgroundDuration?: number): void {
    this.listeners.forEach(listener => {
      try {
        listener(isBackground, backgroundDuration);
      } catch (error) {
        console.error('Error in visibility listener:', error);
      }
    });
  }

  /**
   * Register a listener for visibility changes
   *
   * @param listener - Callback function called on visibility change
   * @returns Unsubscribe function
   */
  public onVisibilityChange(listener: VisibilityListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if data should be considered stale based on background duration
   */
  public isDataStale(backgroundDuration: number): boolean {
    return backgroundDuration > this.config.staleThreshold;
  }

  /**
   * Check if auth token should be refreshed based on background duration
   */
  public shouldRefreshAuth(backgroundDuration: number): boolean {
    return backgroundDuration > this.config.authRefreshThreshold;
  }

  /**
   * Get current visibility state
   */
  public getIsBackground(): boolean {
    return this.isBackground;
  }

  /**
   * Get current background duration in milliseconds
   */
  public getBackgroundDuration(): number {
    if (!this.backgroundStartTime) {
      return 0;
    }
    return Date.now() - this.backgroundStartTime;
  }

  /**
   * Get time since last active (in foreground)
   */
  public getTimeSinceActive(): number {
    return Date.now() - this.lastActiveTime;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<VisibilityConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('Config updated:', this.config);
  }

  /**
   * Log messages if logging is enabled
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[VisibilityManager]', ...args);
    }
  }

  /**
   * Cleanup - remove event listeners
   */
  public destroy(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);

    this.listeners.clear();
    this.log('VisibilityManager destroyed');
  }
}

// Export singleton instance
export const visibilityManager = VisibilityManager.getInstance();

// Export class for testing
export { VisibilityManager };
export type { VisibilityListener, VisibilityConfig };
