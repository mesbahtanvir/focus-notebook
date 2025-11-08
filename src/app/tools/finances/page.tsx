"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSpending } from "@/store/useSpending";
import { useInvestments } from "@/store/useInvestments";
import { useSubscriptions } from "@/store/useSubscriptions";
import { ToolHeader, ToolPageLayout, ToolGroupNav } from "@/components/tools";
import { toolThemes } from "@/components/tools/themes";
import { DollarSign, TrendingUp, Repeat, LineChart, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FinancesPage() {
  const { user } = useAuth();
  const { transactions, subscribe: subscribeSpending, getTotalSpentByMonth } = useSpending();
  const { portfolios, subscribe: subscribeInvestments } = useInvestments();
  const { subscriptions, subscribe: subscribeSubscriptions } = useSubscriptions();

  useEffect(() => {
    if (user?.uid) {
      subscribeSpending(user.uid);
      subscribeInvestments(user.uid);
      subscribeSubscriptions(user.uid);
    }
  }, [user?.uid, subscribeSpending, subscribeInvestments, subscribeSubscriptions]);

  const stats = useMemo(() => {
    // Spending this month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthlySpending = getTotalSpentByMonth(currentMonth);

    // Total portfolio value
    const totalPortfolio = portfolios.reduce((sum, p) => {
      const portfolioValue = p.investments.reduce((invSum, inv) => {
        return invSum + (inv.currentValue || 0);
      }, 0);
      return sum + portfolioValue;
    }, 0);

    // Active subscriptions
    const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
    const monthlySubscriptionCost = activeSubscriptions.reduce((sum, s) => {
      if (s.billingCycle === "monthly") return sum + s.cost;
      if (s.billingCycle === "yearly") return sum + s.cost / 12;
      return sum;
    }, 0);

    return {
      monthlySpending,
      totalPortfolio,
      activeSubscriptions: activeSubscriptions.length,
      monthlySubscriptionCost,
    };
  }, [portfolios, subscriptions, getTotalSpentByMonth]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  const theme = toolThemes.purple;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Finances"
        emoji="💰"
        showBackButton
        stats={[
          { label: "spent", value: `$${stats.monthlySpending.toFixed(0)}`, variant: "info" },
          { label: "portfolio", value: `$${(stats.totalPortfolio / 1000).toFixed(1)}K`, variant: "success" },
          { label: "subscriptions", value: stats.activeSubscriptions, variant: "default" },
        ]}
        theme={theme}
      />

      <ToolGroupNav currentToolId="spending" />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link
          href="/tools/spending"
          className="card p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 text-green-500" />
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Spent This Month</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${stats.monthlySpending.toFixed(0)}
          </div>
        </Link>

        <Link
          href="/tools/investments"
          className="card p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Portfolio</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${(stats.totalPortfolio / 1000).toFixed(1)}K
          </div>
        </Link>

        <Link
          href="/tools/subscriptions"
          className="card p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <Repeat className="h-8 w-8 text-purple-500" />
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Subscriptions/Mo</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${stats.monthlySubscriptionCost.toFixed(0)}
          </div>
        </Link>
      </div>

      {/* Spending Overview */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Spending Overview
          </h3>
          <Link href="/tools/spending" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
            View Details →
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No transactions yet</p>
            <Link
              href="/tools/spending"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:shadow-lg transition-all"
            >
              Upload Statement
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Recent Transactions
            </div>
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{transaction.description}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${Math.abs(transaction.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Horizon */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <LineChart className="h-5 w-5 text-cyan-500" />
            Asset Horizon
          </h3>
          <Link href="/tools/asset-horizon" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
            View Scenarios →
          </Link>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Model long-term investment growth scenarios and retirement horizons
        </p>
        <Link
          href="/tools/asset-horizon"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
        >
          Run Projections
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </ToolPageLayout>
  );
}
