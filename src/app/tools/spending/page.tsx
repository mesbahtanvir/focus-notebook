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
  Upload,
  Link as LinkIcon,
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
import { CSVDashboardSummary, CSVSpendingTrends, CSVTransactionsList } from '@/components/spending/CSVDashboard';
import CSVFileManager from '@/components/spending/CSVFileManager';
import { EnhancedSpendingDashboard, DateRange, NormalizedSpendingTransaction } from '@/components/spending/EnhancedSpendingDashboard';

const getDefaultDateRange = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};
import { EnhancedSpendingDashboard, DateRange, NormalizedSpendingTransaction } from '@/components/spending/EnhancedSpendingDashboard';

export default function SpendingPage() {
  useTrackToolUsage('spending');

  const { user } = useAuth();
  const router = useRouter();
  const { initialize: initializePlaid, cleanup: cleanupPlaid, loading: plaidLoading, error: plaidError, getConnectionStatuses } = useSpendingTool();
  const plaidTransactions = useSpendingTool((state) => state.transactions);
  const plaidAccounts = useSpendingTool((state) => state.accounts);
  const plaidSubscriptions = useSpendingTool((state) => state.subscriptions);

  const subscribeSpending = useSpending((state) => state.subscribe);
  const csvTransactions = useSpending((state) => state.transactions);
  const csvAccounts = useSpending((state) => state.accounts);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dataSource, setDataSource] = useState<'plaid' | 'csv' | null>(null);
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
        category: txn.category || 'Other',
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

  // Determine which data source is active
  useEffect(() => {
    setDataSource((prev) => {
      if (hasPlaidConnections) {
        if (prev === 'plaid') return prev;
        if (prev === 'csv' && hasCSVData) return prev;
        return 'plaid';
      }
      if (hasCSVData) {
        return 'csv';
      }
      return null;
    });
  }, [hasPlaidConnections, hasCSVData]);

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

      {/* Empty State - Choose Data Source */}
      {!hasPlaidConnections && !dataSource && !plaidLoading && (
        <div className="space-y-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Choose How to Track Your Spending
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Connect your bank account for automatic syncing or upload CSV statements for manual tracking
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Plaid Option */}
            <div className="border-2 border-green-200 dark:border-green-800 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-8">
              <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <LinkIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
                Connect Bank Account
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                Automatically sync transactions, detect subscriptions, and get AI-powered insights
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Automatic transaction sync</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Bank-level security with OAuth</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Premium merchant categorization</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Subscription detection</p>
                </div>
              </div>
              <PlaidLinkButton mode="new" className="w-full" />
            </div>

            {/* CSV Upload Option */}
            <div className="border-2 border-purple-200 dark:border-purple-800 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 p-8">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
                Upload CSV
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                Upload bank statement CSVs for manual tracking with AI-powered enhancements
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Full control over your data</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">AI-powered data cleanup</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Smart categorization</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Works with any bank</p>
                </div>
              </div>
              <button
                onClick={() => setDataSource('csv')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:shadow-lg transition-all"
              >
                <Upload className="h-4 w-4" />
                Choose CSV Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Section */}
      {dataSource === 'csv' && !hasPlaidConnections && (
        <div className="space-y-6">
          <CSVUploadSection />
          <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Prefer automatic syncing instead?
            </p>
            <button
              onClick={() => setDataSource(null)}
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              Go back to choose connection method
            </button>
          </div>
        </div>
      )}

      {/* Main Content with Plaid or CSV */}
      {(hasPlaidConnections || (dataSource === 'csv' && hasCSVData)) && (
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
              <span className="hidden sm:inline">Connections</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {dataSource === 'csv' ? (
              <>
                <CSVDashboardSummary />
                <div className="mt-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Recent Transactions
                  </h2>
                  <CSVTransactionsList />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            {dataSource === 'csv' ? <CSVTransactionsList /> : <TransactionsList />}
          </TabsContent>

          <TabsContent value="subscriptions">
            {dataSource === 'csv' ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>Subscription detection is available when using Plaid connections.</p>
                <p className="mt-2 text-sm">CSV uploads can include subscription tags manually.</p>
              </div>
            ) : (
              <SubscriptionsList />
            )}
          </TabsContent>

          <TabsContent value="trends">
            {dataSource === 'csv' ? <CSVSpendingTrends /> : <SpendingTrends />}
          </TabsContent>

          <TabsContent value="connections">
            {dataSource === 'csv' ? (
              <div className="space-y-6">
                <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    CSV Upload Connection
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    You&apos;re currently using CSV uploads to track your spending. Manage your uploaded files below.
                  </p>
                </div>
                <CSVFileManager />
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Upload More Files
                  </h3>
                  <CSVUploadSection />
                </div>
              </div>
            ) : (
              <ConnectionsManager />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
