/**
 * useVisibilityRefresh - React hook for automatic data refresh on tab visibility changes
 *
 * This hook solves the background tab problem by automatically refreshing data
 * when the user returns to the tab after it's been in the background for a while.
 *
 * Usage:
 *   const { isRefreshing, timeSinceRefresh, manualRefresh } = useVisibilityRefresh(
 *     async () => {
 *       await refetchData();
 *     },
 *     { staleThreshold: 5 * 60 * 1000 } // 5 minutes
 *   );
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { visibilityManager } from '@/lib/firebase/visibility-manager';

interface UseVisibilityRefreshOptions {
  /**
   * Time in milliseconds before data is considered stale
   * Default: 5 minutes
   */
  staleThreshold?: number;

  /**
   * Whether to automatically refresh on visibility change
   * Default: true
   */
  autoRefresh?: boolean;

  /**
   * Whether to enable debug logging
   * Default: false
   */
  enableLogging?: boolean;

  /**
   * Callback when refresh starts
   */
  onRefreshStart?: () => void;

  /**
   * Callback when refresh completes successfully
   */
  onRefreshSuccess?: () => void;

  /**
   * Callback when refresh fails
   */
  onRefreshError?: (error: Error) => void;
}

interface UseVisibilityRefreshReturn {
  /**
   * Whether a refresh is currently in progress
   */
  isRefreshing: boolean;

  /**
   * Timestamp of last successful refresh
   */
  lastRefreshTime: number;

  /**
   * Time in milliseconds since last refresh
   */
  timeSinceRefresh: number;

  /**
   * Whether the data is considered stale
   */
  isStale: boolean;

  /**
   * Manually trigger a refresh
   */
  manualRefresh: () => Promise<void>;

  /**
   * Last error from refresh attempt
   */
  error: Error | null;
}

const DEFAULT_OPTIONS: Required<Omit<UseVisibilityRefreshOptions, 'onRefreshStart' | 'onRefreshSuccess' | 'onRefreshError'>> = {
  staleThreshold: 5 * 60 * 1000, // 5 minutes
  autoRefresh: true,
  enableLogging: false,
};

export function useVisibilityRefresh(
  refreshFn: () => Promise<void>,
  options: UseVisibilityRefreshOptions = {}
): UseVisibilityRefreshReturn {
  // Memoize options to prevent unnecessary re-renders
  const {
    staleThreshold = DEFAULT_OPTIONS.staleThreshold,
    autoRefresh = DEFAULT_OPTIONS.autoRefresh,
    enableLogging = DEFAULT_OPTIONS.enableLogging,
    onRefreshStart,
    onRefreshSuccess,
    onRefreshError,
  } = options;

  const opts = useMemo(
    () => ({
      staleThreshold,
      autoRefresh,
      enableLogging,
      onRefreshStart,
      onRefreshSuccess,
      onRefreshError,
    }),
    [staleThreshold, autoRefresh, enableLogging, onRefreshStart, onRefreshSuccess, onRefreshError]
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [timeSinceRefresh, setTimeSinceRefresh] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Use ref to avoid stale closure issues
  const refreshFnRef = useRef(refreshFn);
  const optionsRef = useRef(opts);

  // Update refs when dependencies change
  useEffect(() => {
    refreshFnRef.current = refreshFn;
    optionsRef.current = opts;
  }, [refreshFn, opts]);

  /**
   * Perform the refresh operation
   */
  const performRefresh = useCallback(async (reason: string): Promise<void> => {
    const { enableLogging, onRefreshStart, onRefreshSuccess, onRefreshError } = optionsRef.current;

    if (enableLogging) {
      console.log(`[useVisibilityRefresh] Refreshing: ${reason}`);
    }

    setIsRefreshing(true);
    setError(null);

    try {
      onRefreshStart?.();
      await refreshFnRef.current();
      setLastRefreshTime(Date.now());
      setTimeSinceRefresh(0);
      onRefreshSuccess?.();

      if (enableLogging) {
        console.log('[useVisibilityRefresh] Refresh successful');
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      onRefreshError?.(error);

      if (enableLogging) {
        console.error('[useVisibilityRefresh] Refresh failed:', error);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Manual refresh trigger
   */
  const manualRefresh = useCallback(async (): Promise<void> => {
    await performRefresh('manual trigger');
  }, [performRefresh]);

  /**
   * Handle visibility changes
   */
  useEffect(() => {
    if (!opts.autoRefresh) {
      return;
    }

    const unsubscribe = visibilityManager.onVisibilityChange((isBackground, backgroundDuration) => {
      // Only refresh when returning to foreground
      if (isBackground || backgroundDuration === undefined) {
        return;
      }

      const { staleThreshold, enableLogging } = optionsRef.current;

      // Check if data should be refreshed based on background duration
      if (backgroundDuration > staleThreshold) {
        if (enableLogging) {
          console.log(
            `[useVisibilityRefresh] Tab was background for ${Math.round(backgroundDuration / 1000)}s, refreshing...`
          );
        }
        performRefresh(`tab was background for ${Math.round(backgroundDuration / 1000)}s`);
      } else if (enableLogging) {
        console.log(
          `[useVisibilityRefresh] Tab was background for ${Math.round(backgroundDuration / 1000)}s, no refresh needed`
        );
      }
    });

    return unsubscribe;
  }, [opts.autoRefresh, performRefresh]);

  /**
   * Update time since refresh periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceRefresh(Date.now() - lastRefreshTime);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [lastRefreshTime]);

  /**
   * Calculate if data is stale
   */
  const isStale = timeSinceRefresh > opts.staleThreshold;

  return {
    isRefreshing,
    lastRefreshTime,
    timeSinceRefresh,
    isStale,
    manualRefresh,
    error,
  };
}

/**
 * Simple version that just returns refresh trigger and loading state
 */
export function useSimpleVisibilityRefresh(
  refreshFn: () => Promise<void>,
  staleThreshold: number = 5 * 60 * 1000
): { isRefreshing: boolean; refresh: () => Promise<void> } {
  const { isRefreshing, manualRefresh } = useVisibilityRefresh(refreshFn, {
    staleThreshold,
    autoRefresh: true,
  });

  return {
    isRefreshing,
    refresh: manualRefresh,
  };
}
