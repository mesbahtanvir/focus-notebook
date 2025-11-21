/**
 * Subscriptions List Component
 * Displays detected recurring payments with details
 */

'use client';

import { useState, useMemo } from 'react';
import { Repeat, Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useSpendingTool } from '@/store/useSpendingTool';
import type { RecurringStream } from '@/types/spending-tool';

export default function SubscriptionsList() {
  const { subscriptions } = useSpendingTool();
  const [sortBy, setSortBy] = useState<'amount' | 'name' | 'date'>('amount');

  // Sort subscriptions
  const sortedSubscriptions = useMemo(() => {
    const sorted = [...subscriptions];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.meanAmount - a.meanAmount;
        case 'name':
          return a.merchant.localeCompare(b.merchant);
        case 'date':
          return new Date(b.nextExpected).getTime() - new Date(a.nextExpected).getTime();
        default:
          return 0;
      }
    });
    return sorted;
  }, [subscriptions, sortBy]);

  const totalMonthly = useMemo(() => {
    return subscriptions.reduce((sum, sub) => {
      // Convert to monthly equivalent
      let monthlyAmount = sub.meanAmount;
      switch (sub.cadence) {
        case 'weekly':
          monthlyAmount = sub.meanAmount * 4.33;
          break;
        case 'biweekly':
          monthlyAmount = sub.meanAmount * 2.17;
          break;
        case 'quarterly':
          monthlyAmount = sub.meanAmount / 3;
          break;
        case 'annual':
          monthlyAmount = sub.meanAmount / 12;
          break;
      }
      return sum + monthlyAmount;
    }, 0);
  }, [subscriptions]);

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
        <Repeat className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
          No subscriptions detected yet
        </h3>
        <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto">
          As you add more transactions, we&apos;ll automatically detect recurring payments and subscriptions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Repeat className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Subscriptions</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{subscriptions.length}</div>
        </div>

        <div className="p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Total</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ${totalMonthly.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Annual Total</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ${(totalMonthly * 12).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Sort by:</span>
        <button
          onClick={() => setSortBy('amount')}
          className={`px-3 py-1 rounded-lg transition-colors ${
            sortBy === 'amount'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Amount
        </button>
        <button
          onClick={() => setSortBy('name')}
          className={`px-3 py-1 rounded-lg transition-colors ${
            sortBy === 'name'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Name
        </button>
        <button
          onClick={() => setSortBy('date')}
          className={`px-3 py-1 rounded-lg transition-colors ${
            sortBy === 'date'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Next Date
        </button>
      </div>

      {/* Subscriptions list */}
      <div className="grid gap-3 md:grid-cols-2">
        {sortedSubscriptions.map((subscription) => (
          <SubscriptionCard key={subscription.id} subscription={subscription} />
        ))}
      </div>
    </div>
  );
}

function SubscriptionCard({ subscription }: { subscription: RecurringStream }) {
  const cadenceLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Annual',
  };

  const isExpiringSoon = () => {
    const nextDate = new Date(subscription.nextExpected);
    const today = new Date();
    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  };

  const daysUntilNext = () => {
    const nextDate = new Date(subscription.nextExpected);
    const today = new Date();
    return Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const expiringSoon = isExpiringSoon();
  const days = daysUntilNext();

  return (
    <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
            {subscription.merchant}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              {cadenceLabels[subscription.cadence]}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              subscription.confidence >= 0.9
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {Math.round(subscription.confidence * 100)}% confidence
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            ${subscription.meanAmount.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>Next charge: {new Date(subscription.nextExpected).toLocaleDateString()}</span>
          {expiringSoon && <AlertCircle className="h-4 w-4 text-amber-500" />}
        </div>
        {days >= 0 && (
          <div className="text-xs text-gray-500">
            {days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`}
          </div>
        )}
        <div className="text-xs text-gray-500">
          {subscription.occurrenceCount} payments since {new Date(subscription.firstSeen).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
