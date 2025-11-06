/**
 * Connections Manager Component
 * View and manage all connected bank accounts
 */

'use client';

import { Building, CreditCard, RefreshCw, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSpendingTool } from '@/store/useSpendingTool';
import PlaidLinkButton from './PlaidLinkButton';
import type { ItemStatus } from '@/types/spending-tool';

export default function ConnectionsManager() {
  const { getConnectionStatuses, accounts, items, triggerSync } = useSpendingTool();
  const connections = getConnectionStatuses();

  const getStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'needs_relink':
      case 'pending_expiration':
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ItemStatus) => {
    const badges: Record<ItemStatus, { text: string; className: string }> = {
      ok: { text: 'Connected', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      needs_relink: { text: 'Needs Relink', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      pending_expiration: { text: 'Expiring Soon', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      institution_down: { text: 'Bank Down', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
      paused: { text: 'Paused', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
      error: { text: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  if (connections.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
        <Building className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
          No banks connected
        </h3>
        <p className="text-gray-500 dark:text-gray-500 mb-6 max-w-md mx-auto">
          Connect your bank accounts to automatically track transactions and get spending insights.
        </p>
        <PlaidLinkButton mode="new" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => {
        const item = items[connection.itemId];
        const itemAccounts = Object.values(accounts).filter(
          (acc) => acc.itemId === connection.itemId
        );

        return (
          <div
            key={connection.itemId}
            className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {connection.institutionName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {connection.accountCount} account{connection.accountCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(connection.status)}
                {getStatusBadge(connection.status)}
              </div>
            </div>

            {/* Accounts */}
            <div className="space-y-2 mb-4">
              {itemAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {account.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account.subtype} • ••••{account.mask}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      ${account.balances.current?.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-xs text-gray-500">{account.balances.isoCurrency}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500">
                Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
              </div>
              <div className="flex-1" />
              {connection.status === 'ok' && (
                <button
                  onClick={() => triggerSync(connection.itemId)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </button>
              )}
              {(connection.status === 'needs_relink' ||
                connection.status === 'pending_expiration' ||
                connection.status === 'error') && (
                <PlaidLinkButton mode="relink" itemId={connection.itemId} />
              )}
            </div>

            {/* Error message */}
            {connection.error && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {connection.error.message}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Add new connection */}
      <div className="p-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-center">
        <PlaidLinkButton mode="new" />
      </div>
    </div>
  );
}
