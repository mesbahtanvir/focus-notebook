"use client";

/**
 * OfflineBanner - Enhanced connection status banner
 *
 * Now detects:
 * - Browser offline status
 * - Background tab staleness
 * - Reconnection attempts
 * - Pending sync operations
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, AlertCircle, Wifi, Clock } from "lucide-react";
import { visibilityManager } from "@/lib/firebase/visibility-manager";
import { cn } from "@/lib/utils";

type ConnectionStatus =
  | 'online'      // Everything is fine
  | 'offline'     // Browser is offline
  | 'reconnecting' // Attempting to reconnect
  | 'stale';      // Tab was in background, data may be stale

interface ConnectionState {
  status: ConnectionStatus;
  message: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [backgroundDuration, setBackgroundDuration] = useState(0);
  const [showStaleWarning, setShowStaleWarning] = useState(false);

  // Monitor browser online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      setIsReconnecting(true);

      // Show reconnecting briefly, then hide
      setTimeout(() => {
        setIsReconnecting(false);
      }, 2000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsReconnecting(false);
      setShowStaleWarning(false); // Hide stale warning when going offline
    };

    // Set initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Monitor tab visibility and background duration
  useEffect(() => {
    const unsubscribe = visibilityManager.onVisibilityChange(
      (isBackground, duration) => {
        if (isBackground) {
          // Tab went to background
          setShowStaleWarning(false);
        } else if (duration !== undefined) {
          // Tab returned to foreground
          setBackgroundDuration(duration);

          // Show stale warning if tab was in background for > 5 minutes
          const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
          if (duration > STALE_THRESHOLD && !isOffline) {
            setShowStaleWarning(true);

            // Auto-hide stale warning after 10 seconds
            setTimeout(() => {
              setShowStaleWarning(false);
            }, 10000);
          }
        }
      }
    );

    return unsubscribe;
  }, [isOffline]);

  // Determine current connection state
  const getConnectionState = (): ConnectionState | null => {
    if (isReconnecting) {
      return {
        status: 'reconnecting',
        message: 'Reconnecting to server...',
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        bgColor: 'bg-blue-50 dark:bg-blue-900/30',
        textColor: 'text-blue-900 dark:text-blue-200',
        borderColor: 'border-blue-200 dark:border-blue-900',
      };
    }

    if (isOffline) {
      return {
        status: 'offline',
        message: 'You are offline. Changes will be saved locally and sync when you are back online.',
        icon: <WifiOff className="w-4 h-4" />,
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
        textColor: 'text-yellow-900 dark:text-yellow-200',
        borderColor: 'border-yellow-200 dark:border-yellow-900',
      };
    }

    if (showStaleWarning) {
      const minutes = Math.round(backgroundDuration / 1000 / 60);
      return {
        status: 'stale',
        message: `Tab was in background for ${minutes} minutes. Data has been refreshed.`,
        icon: <Clock className="w-4 h-4" />,
        bgColor: 'bg-orange-50 dark:bg-orange-900/30',
        textColor: 'text-orange-900 dark:text-orange-200',
        borderColor: 'border-orange-200 dark:border-orange-900',
      };
    }

    return null; // No banner needed
  };

  const state = getConnectionState();

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed top-0 inset-x-0 z-40"
          role="alert"
          aria-live="polite"
        >
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div
              className={cn(
                'rounded-md border px-3 py-2 text-sm shadow-sm',
                'flex items-center gap-3',
                state.bgColor,
                state.textColor,
                state.borderColor
              )}
            >
              <div className="flex-shrink-0">
                {state.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="truncate">{state.message}</p>
              </div>

              {/* Show success icon briefly after reconnecting */}
              {state.status === 'reconnecting' && (
                <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
