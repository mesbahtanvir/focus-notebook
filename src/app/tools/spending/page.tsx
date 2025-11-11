/**
 * Unified Spending Tool Page
 * Privacy-first financial aggregation with Plaid integration and CSV upload
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useSpendingTool } from '@/store/useSpendingTool';
import { useSpending } from '@/store/useSpending';
import { useTrackToolUsage } from '@/hooks/useTrackToolUsage';
import {
  DollarSign,
  TrendingUp,
  Repeat,
  List,
  Building,
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlaidLinkButton from '@/components/spending/PlaidLinkButton';
import ConnectionStatusBanner from '@/components/spending/ConnectionStatusBanner';
import DashboardSummary from '@/components/spending/DashboardSummary';
import TransactionsList from '@/components/spending/TransactionsList';
import SubscriptionsList from '@/components/spending/SubscriptionsList';
import SpendingTrends from '@/components/spending/SpendingTrends';
import ConnectionsManager from '@/components/spending/ConnectionsManager';
import CSVUploadSection from '@/components/spending/CSVUploadSection';
import { CSVTransactionsList } from '@/components/spending/CSVDashboard';
import CSVFileManager from '@/components/spending/CSVFileManager';
import { EnhancedSpendingDashboard, DateRange, NormalizedSpendingTransaction } from '@/components/spending/EnhancedSpendingDashboard';
import { cn } from '@/lib/utils';

const getDefaultDateRange = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

export default function SpendingPage() {
  useTrackToolUsage('spending');

  const { user } = useAuth();
  const router = useRouter();
  const { initialize: initializePlaid, cleanup: cleanupPlaid, loading: plaidLoading, error: plaidError, getConnectionStatuses } = useSpendingTool();
  const plaidTransactions = useSpendingTool((state) => state.transactions);
  const plaidAccounts = useSpendingTool((state) => state.accounts);

  const subscribeSpending = useSpending((state) => state.subscribe);
  const csvTransactions = useSpending((state) => state.transactions);
  const csvAccounts = useSpending((state) => state.accounts);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);

  useEffect(() => {
    if (user?.uid) {
      // Subscribe to both data sources
      initializePlaid(user.uid);
      subscribeSpending(user.uid);
    }

    return () => {
      cleanupPlaid();
    };
  }, [user?.uid, initializePlaid, subscribeSpending, cleanupPlaid]);

  const connections = getConnectionStatuses();
  const hasPlaidConnections = connections.length > 0;

  // Check for CSV-uploaded transactions
  const hasCSVData = csvTransactions.length > 0;

  const normalizedPlaidTransactions = useMemo<NormalizedSpendingTransaction[]>(() => {
    return plaidTransactions.map((txn) => {
      const account = plaidAccounts[txn.accountId];
      const signedAmount = txn.amount;
      return {
        id: txn.id ?? txn.plaidTransactionId,
        date: txn.postedAt,
        signedAmount,
        amount: Math.abs(signedAmount),
        isIncome: signedAmount < 0,
        category: txn.category_premium?.[0] || txn.category_base?.[0] || 'Other',
        accountId: txn.accountId,
        accountName: account?.name || 'Connected Account',
        accountMask: account?.mask,
        merchant: txn.merchant?.normalized || txn.merchant?.name || 'Unknown',
        description: txn.originalDescription,
        subscription: txn.isSubscription,
        source: 'plaid',
      } satisfies NormalizedSpendingTransaction;
    });
  }, [plaidTransactions, plaidAccounts]);

  const normalizedCsvTransactions = useMemo<NormalizedSpendingTransaction[]>(() => {
    return csvTransactions.map((txn) => {
      const account = csvAccounts.find((acc) => acc.id === txn.accountId);
      const signedAmount = txn.amount;
      return {
        id: txn.id,
        date: txn.date,
        signedAmount,
        amount: Math.abs(signedAmount),
        isIncome: signedAmount < 0,
        category: txn.category ? String(txn.category) : 'Other',
        accountId: txn.accountId,
        accountName: account?.name || 'Manual Account',
        accountMask: account?.lastFourDigits,
        merchant: txn.merchant || txn.description || 'Unknown',
        description: txn.description,
        subscription: txn.tags?.includes('subscription'),
        source: 'csv',
      } satisfies NormalizedSpendingTransaction;
    });
  }, [csvTransactions, csvAccounts]);

  const plaidAccountList = useMemo(() => {
    return Object.values(plaidAccounts).map((account) => ({
      id: account.id ?? account.itemId,
      name: account.name,
      mask: account.mask,
    }));
  }, [plaidAccounts]);

  const csvAccountList = useMemo(() => {
    return csvAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      mask: account.lastFourDigits,
    }));
  }, [csvAccounts]);

  const hasAnyDataSources = hasPlaidConnections || hasCSVData;
  
  const combinedTransactions = useMemo<NormalizedSpendingTransaction[]>(
    () => [...normalizedPlaidTransactions, ...normalizedCsvTransactions],
    [normalizedPlaidTransactions, normalizedCsvTransactions]
  );

  const combinedAccounts = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; mask?: string }>();
    [...plaidAccountList, ...csvAccountList].forEach((account) => {
      const key = account.id || account.name;
      if (key && !map.has(key)) {
        map.set(key, account);
      }
    });
    return Array.from(map.values());
  }, [plaidAccountList, csvAccountList]);

  const unifiedSourceLabel = 'All sources';

  if (plaidLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading your financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              Spending Tracker
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track spending with automatic bank sync or manual CSV upload
            </p>
          </div>
      </div>
      {hasPlaidConnections && (
        <PlaidLinkButton mode="new" className="hidden md:inline-flex" />
      )}
    </div>

      {/* Connection Status Banners */}
      {hasPlaidConnections && (
        <div className="mb-6">
          <ConnectionStatusBanner />
        </div>
      )}

      {/* Error Message */}
      {plaidError && (
        <div className="mb-6 p-4 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-400">{plaidError}</p>
        </div>
      )}

      {/* Main Content with Plaid or CSV */}
      {hasAnyDataSources && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              <span className="hidden sm:inline">Subscriptions</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Data Sources</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <EnhancedSpendingDashboard
              transactions={combinedTransactions}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              accounts={combinedAccounts}
              sourceLabel={unifiedSourceLabel}
            />
            <DashboardSummary />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Recent Transactions
                </h2>
                <TransactionsList />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Active Subscriptions
                </h2>
                <SubscriptionsList />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            {hasPlaidConnections && (
              <div>
                {hasCSVData && (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Connected Accounts
                  </h2>
                )}
                <TransactionsList />
              </div>
            )}

            {hasCSVData && (
              <div className={cn(hasPlaidConnections ? 'pt-4 border-t border-gray-200 dark:border-gray-700' : '')}>
                {hasPlaidConnections && (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Manual CSV Transactions
                  </h2>
                )}
                <CSVTransactionsList />
              </div>
            )}

            {!hasPlaidConnections && !hasCSVData && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>No transactions found. Connect a bank account or upload a CSV statement to get started.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsList />
          </TabsContent>

          <TabsContent value="trends">
            <SpendingTrends />
          </TabsContent>

          <TabsContent value="connections">
            <div className="space-y-6">
              {/* Data Sources Overview */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Data Sources
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Connect your banks automatically or upload statements manually
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Plaid Connection Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                        <Building className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          Bank Connections
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {hasPlaidConnections ? `${connections.length} connected` : 'Not connected'}
                        </p>
                      </div>
                      {!hasPlaidConnections && (
                        <PlaidLinkButton mode="new" className="text-sm py-2 px-4" />
                      )}
                    </div>
                    {hasPlaidConnections && (
                      <div className="space-y-2">
                        <ConnectionsManager />
                        <PlaidLinkButton mode="new" className="w-full text-sm" />
                      </div>
                    )}
                  </div>

                  {/* CSV Upload Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          CSV Statements
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {hasCSVData ? `${csvTransactions.length} transactions` : 'No uploads yet'}
                        </p>
                      </div>
                    </div>
                    <CSVUploadSection />
                  </div>
                </div>
              </div>

              {/* Statement History - Always show to display processing/failed uploads */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Statement History
                </h3>

                {/* CSV Uploads - Always shown, handles empty state internally */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV Uploads
                  </h4>
                  <CSVFileManager enableManualProcessing />
                </div>

                {hasPlaidConnections && (
                  <>
                    <div className="my-6 border-t border-gray-200 dark:border-gray-700" />
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Connected Accounts
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <ConnectionsManager />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

        </Tabs>
      )}
    </div>
  );
}
