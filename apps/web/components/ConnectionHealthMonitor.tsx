/**
 * Connection Health Monitor Dashboard
 *
 * Displays real-time connection health, offline queue status,
 * circuit breaker states, and performance metrics.
 */

'use client';

import { useConnectionHealth } from '@/hooks/useConnectionHealth';

export function ConnectionHealthMonitor() {
  const health = useConnectionHealth();

  if (!health) {
    return null;
  }

  // Only show if there are issues or degraded/unhealthy status
  if (health.status === 'healthy' && health.issues.length === 0 && health.offlineQueue.size === 0) {
    return null;
  }

  const statusColors = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    unhealthy: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusColor = statusColors[health.status];

  return (
    <div className={`fixed bottom-4 right-4 max-w-md border-2 rounded-lg shadow-lg p-4 ${statusColor} z-50`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="font-semibold">
            Connection: {health.status.toUpperCase()}
          </div>
          <div className="text-sm">
            {health.isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>

        {/* Offline Queue */}
        {health.offlineQueue.size > 0 && (
          <div className="text-sm">
            <div className="font-medium">Offline Queue</div>
            <div className="ml-2">
              {health.offlineQueue.size} operation{health.offlineQueue.size !== 1 ? 's' : ''} queued
              {health.offlineQueue.processing && ' (processing...)'}
            </div>
          </div>
        )}

        {/* Circuit Breakers */}
        {Object.entries(health.circuitBreakers).some(([_, cb]) => cb.state !== 'CLOSED') && (
          <div className="text-sm">
            <div className="font-medium">Circuit Breakers</div>
            <div className="ml-2 space-y-1">
              {Object.entries(health.circuitBreakers).map(([name, cb]) => {
                if (cb.state === 'CLOSED') return null;

                const stateEmoji = {
                  OPEN: '🔴',
                  HALF_OPEN: '🟡',
                  CLOSED: '🟢',
                };

                return (
                  <div key={name}>
                    {stateEmoji[cb.state]} {name}: {cb.state}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance */}
        {health.performance.successRate < 1 && (
          <div className="text-sm">
            <div className="font-medium">Performance</div>
            <div className="ml-2">
              Success rate: {Math.round(health.performance.successRate * 100)}%
              {health.performance.averageDuration > 0 && (
                <> • Avg: {health.performance.averageDuration}ms</>
              )}
            </div>
          </div>
        )}

        {/* Issues */}
        {health.issues.length > 0 && (
          <div className="text-sm">
            <div className="font-medium">Issues</div>
            <div className="ml-2 space-y-1">
              {health.issues.slice(0, 3).map((issue, i) => {
                const severityEmoji = {
                  low: 'ℹ️',
                  medium: '⚠️',
                  high: '🚨',
                };

                return (
                  <div key={i}>
                    {severityEmoji[issue.severity]} {issue.message}
                  </div>
                );
              })}
              {health.issues.length > 3 && (
                <div className="text-xs opacity-75">
                  +{health.issues.length - 3} more issue{health.issues.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal connection status indicator (always visible)
 */
export function ConnectionStatusIndicator() {
  const health = useConnectionHealth();

  if (!health) {
    return null;
  }

  const statusEmoji = {
    healthy: '🟢',
    degraded: '🟡',
    unhealthy: '🔴',
  };

  const hasIssues = health.issues.length > 0 || health.offlineQueue.size > 0;

  if (!hasIssues && health.status === 'healthy') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 text-sm bg-white border rounded-lg px-3 py-2 shadow-sm z-40">
      <span>{statusEmoji[health.status]}</span>
      <span className="font-medium">
        {health.status === 'healthy' ? 'Connected' : health.status}
      </span>
      {health.offlineQueue.size > 0 && (
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          {health.offlineQueue.size} queued
        </span>
      )}
    </div>
  );
}
