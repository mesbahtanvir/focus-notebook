/**
 * Unified Spending Tool Page
 * Privacy-first financial aggregation with Plaid integration
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useSpendingTool } from '@/store/useSpendingTool';
import { useTrackToolUsage } from '@/hooks/useTrackToolUsage';
import {
  DollarSign,
  TrendingUp,
  Repeat,
  List,
  Building,
  Lightbulb,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlaidLinkButton from '@/components/spending/PlaidLinkButton';
import ConnectionStatusBanner from '@/components/spending/ConnectionStatusBanner';
import DashboardSummary from '@/components/spending/DashboardSummary';
import TransactionsList from '@/components/spending/TransactionsList';
import SubscriptionsList from '@/components/spending/SubscriptionsList';
import SpendingTrends from '@/components/spending/SpendingTrends';
import ConnectionsManager from '@/components/spending/ConnectionsManager';

export default function UnifiedSpendingPage() {
  useTrackToolUsage('spending-unified');

  const { user } = useAuth();
  const router = useRouter();
  const { initialize, cleanup, loading, error, getConnectionStatuses } = useSpendingTool();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (user?.uid) {
      initialize(user.uid);
    }

    return () => {
      cleanup();
    };
  }, [user?.uid, initialize, cleanup]);

  const connections = getConnectionStatuses();
  const hasConnections = connections.length > 0;

  if (loading) {
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
              Unified Spending Tool
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Privacy-first financial tracking with automatic insights
            </p>
          </div>
        </div>
        {hasConnections && (
          <PlaidLinkButton mode="new" className="hidden md:inline-flex" />
        )}
      </div>

      {/* Connection Status Banners */}
      <div className="mb-6">
        <ConnectionStatusBanner />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!hasConnections && !loading && (
        <div className="text-center py-16 border-2 border-dashed border-green-200 dark:border-green-800 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
          <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Building className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Connect Your First Bank Account
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Securely connect your bank accounts to automatically track transactions, detect
            subscriptions, and get AI-powered spending insights.
          </p>
          <PlaidLinkButton mode="new" />
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-semibold text-sm">Bank-Level Security</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                All connections use OAuth and tokens are encrypted at rest
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-semibold text-sm">Privacy-First</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Your data stays with you. No PII sent to AI models
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="font-semibold text-sm">Auto-Categorization</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Premium merchant taxonomy with subscription detection
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {hasConnections && (
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

          <TabsContent value="transactions">
            <TransactionsList />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsList />
          </TabsContent>

          <TabsContent value="trends">
            <SpendingTrends />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionsManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
