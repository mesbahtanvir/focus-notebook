'use client';

/**
 * StaleDataWarning Component
 *
 * Displays a warning banner when data may be stale due to prolonged background tab time.
 * Provides a manual refresh button for users to sync data immediately.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaleDataWarningProps {
  /**
   * Whether data is currently stale
   */
  isStale: boolean;

  /**
   * Time in milliseconds since last data refresh
   */
  timeSinceRefresh?: number;

  /**
   * Whether a refresh is currently in progress
   */
  isRefreshing?: boolean;

  /**
   * Callback to trigger manual refresh
   */
  onRefresh?: () => void | Promise<void>;

  /**
   * Whether to allow users to dismiss the warning
   * Default: true
   */
  dismissible?: boolean;

  /**
   * Custom message to display
   */
  message?: string;

  /**
   * Position of the banner
   * Default: 'top'
   */
  position?: 'top' | 'bottom';

  /**
   * Whether to auto-dismiss after refresh
   * Default: true
   */
  autoDismissAfterRefresh?: boolean;
}

export function StaleDataWarning({
  isStale,
  timeSinceRefresh,
  isRefreshing = false,
  onRefresh,
  dismissible = true,
  message,
  position = 'top',
  autoDismissAfterRefresh = true,
}: StaleDataWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [wasRefreshing, setWasRefreshing] = useState(false);

  // Reset dismissed state when stale state changes
  useEffect(() => {
    if (isStale && !isRefreshing) {
      setIsDismissed(false);
    }
  }, [isStale, isRefreshing]);

  // Auto-dismiss after refresh completes
  useEffect(() => {
    if (wasRefreshing && !isRefreshing && autoDismissAfterRefresh) {
      // Refresh just completed, auto-dismiss after a short delay
      const timeout = setTimeout(() => {
        setIsDismissed(true);
      }, 2000); // 2 second delay to show success

      return () => clearTimeout(timeout);
    }
    setWasRefreshing(isRefreshing);
  }, [isRefreshing, wasRefreshing, autoDismissAfterRefresh]);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      await onRefresh();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Format time since refresh for display
  const formatTimeSinceRefresh = (ms?: number): string => {
    if (!ms) return '';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  // Don't show if not stale or dismissed
  if (!isStale || isDismissed) {
    return null;
  }

  const defaultMessage = timeSinceRefresh
    ? `Data may be outdated (last synced ${formatTimeSinceRefresh(timeSinceRefresh)})`
    : 'Data may be outdated';

  const positionClasses = position === 'top'
    ? 'top-0 inset-x-0'
    : 'bottom-0 inset-x-0';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={cn(
          'fixed z-50',
          positionClasses
        )}
      >
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Icon and Message */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                <span className="text-sm text-yellow-900 dark:text-yellow-200 truncate">
                  {message || defaultMessage}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Refresh Button */}
                {onRefresh && (
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
                      'bg-yellow-600 dark:bg-yellow-700 text-white',
                      'hover:bg-yellow-700 dark:hover:bg-yellow-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
                    )}
                  >
                    <RefreshCw
                      className={cn(
                        'w-4 h-4',
                        isRefreshing && 'animate-spin'
                      )}
                    />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
                  </button>
                )}

                {/* Dismiss Button */}
                {dismissible && (
                  <button
                    onClick={handleDismiss}
                    className={cn(
                      'p-1.5 rounded-md',
                      'text-yellow-600 dark:text-yellow-500',
                      'hover:bg-yellow-100 dark:hover:bg-yellow-800/30',
                      'transition-colors duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
                    )}
                    aria-label="Dismiss warning"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact version without animation for smaller spaces
 */
export function StaleDataWarningCompact({
  isStale,
  onRefresh,
  isRefreshing = false,
}: {
  isStale: boolean;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
}) {
  if (!isStale) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
      <span className="text-xs text-yellow-900 dark:text-yellow-200">
        Data may be outdated
      </span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="ml-auto text-xs text-yellow-700 dark:text-yellow-400 hover:underline disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      )}
    </div>
  );
}
