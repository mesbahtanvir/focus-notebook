/**
 * Dashboard Summary Component
 * Shows overview cards with key financial metrics
 */

'use client';

import { DollarSign, TrendingUp, TrendingDown, CreditCard, Repeat } from 'lucide-react';
import { useSpendingTool } from '@/store/useSpendingTool';

export default function DashboardSummary() {
  const { getDashboardSummary } = useSpendingTool();
  const summary = getDashboardSummary();

  const cards = [
    {
      title: 'Total Balance',
      value: `$${summary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${summary.connectedAccounts} connected account${summary.connectedAccounts !== 1 ? 's' : ''}`,
      icon: DollarSign,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Monthly Spending',
      value: `$${summary.monthlySpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Last 30 days',
      icon: TrendingDown,
      gradient: 'from-red-500 to-pink-500',
      bgGradient: 'from-red-50 to-pink-50',
    },
    {
      title: 'Monthly Income',
      value: `$${summary.monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Last 30 days',
      icon: TrendingUp,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
    },
    {
      title: 'Active Subscriptions',
      value: summary.activeSubscriptions.toString(),
      subtitle: `$${summary.subscriptionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month`,
      icon: Repeat,
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br ${card.bgGradient} dark:from-gray-800 dark:to-gray-900 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${card.gradient} shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
