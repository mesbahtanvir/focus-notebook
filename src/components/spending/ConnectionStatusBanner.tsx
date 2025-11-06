/**
 * Connection Status Banner Component
 * Shows alerts for items that need attention (relink, expiration, etc.)
 */

'use client';

import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';
import { useSpendingTool } from '@/store/useSpendingTool';
import PlaidLinkButton from './PlaidLinkButton';
import type { ItemStatus } from '@/types/spending-tool';

export default function ConnectionStatusBanner() {
  const { getConnectionStatuses } = useSpendingTool();
  const connections = getConnectionStatuses();

  // Filter connections that need attention
  const problemConnections = connections.filter(
    (conn) =>
      conn.status === 'needs_relink' ||
      conn.status === 'pending_expiration' ||
      conn.status === 'error'
  );

  if (problemConnections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {problemConnections.map((conn) => (
        <ConnectionBanner
          key={conn.itemId}
          itemId={conn.itemId}
          institutionName={conn.institutionName}
          status={conn.status}
          error={conn.error}
        />
      ))}
    </div>
  );
}

function ConnectionBanner({
  itemId,
  institutionName,
  status,
  error,
}: {
  itemId: string;
  institutionName: string;
  status: ItemStatus;
  error?: { code: string; message: string; at: number };
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'needs_relink':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          iconColor: 'text-amber-600',
          title: 'Connection needs your attention',
          message: `We can't refresh ${institutionName} until you reconnect this connection.`,
          showCTA: true,
        };
      case 'pending_expiration':
        return {
          icon: Info,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600',
          title: 'Connection expiring soon',
          message: `Your ${institutionName} connection will expire soon. Reconnect to keep data up to date.`,
          showCTA: true,
        };
      case 'institution_down':
        return {
          icon: AlertCircle,
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          iconColor: 'text-gray-600',
          title: 'Bank temporarily unavailable',
          message: `${institutionName} is currently down. We'll automatically retry when it's back online.`,
          showCTA: false,
        };
      case 'error':
      default:
        return {
          icon: XCircle,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-600',
          title: 'Connection error',
          message: error?.message || `There was an error with your ${institutionName} connection.`,
          showCTA: true,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`p-4 rounded-xl border-2 ${config.borderColor} ${config.bgColor} flex items-start gap-4`}
    >
      <Icon className={`h-6 w-6 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold ${config.iconColor} mb-1`}>{config.title}</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{config.message}</p>
        {config.showCTA && (
          <div className="flex items-center gap-3">
            <PlaidLinkButton mode="relink" itemId={itemId} className="text-sm" />
            <p className="text-xs text-gray-500">
              You'll be taken to your bank to confirm access. This won't change your accounts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
