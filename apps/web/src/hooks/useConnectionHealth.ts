/**
 * React hook for connection health monitoring
 *
 * Provides real-time connection health status from the ConnectionMonitor
 */

import { useEffect, useState } from 'react';
import { getConnectionMonitor, ConnectionHealth } from '@/lib/data/subscribe';

/**
 * Hook to monitor connection health
 */
export function useConnectionHealth(): ConnectionHealth | null {
  const [health, setHealth] = useState<ConnectionHealth | null>(null);

  useEffect(() => {
    const monitor = getConnectionMonitor();

    // Subscribe to health updates
    const unsubscribe = monitor.subscribe((newHealth) => {
      setHealth(newHealth);
    });

    // Get initial health
    const initialHealth = monitor.getHealth();
    if (initialHealth) {
      setHealth(initialHealth);
    }

    return unsubscribe;
  }, []);

  return health;
}
