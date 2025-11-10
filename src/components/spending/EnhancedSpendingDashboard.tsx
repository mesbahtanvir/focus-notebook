"use client";

import { useMemo } from "react";
import {
  CalendarRange,
  PieChart as PieChartIcon,
  CreditCard,
  Repeat,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#facc15",
  "#0ea5e9",
];

export type NormalizedSpendingTransaction = {
  id: string;
  date: string; // YYYY-MM-DD
  signedAmount: number; // positive = spend, negative = income
  amount: number; // absolute value
  isIncome: boolean;
  category: string;
  accountId?: string;
  accountName?: string;
  accountMask?: string;
  merchant: string;
  description?: string;
  subscription?: boolean;
  source: "plaid" | "csv";
};

export interface DateRange {
  start: string;
  end: string;
}

interface AccountSummary {
  id?: string;
  name: string;
  mask?: string;
}

interface EnhancedSpendingDashboardProps {
  transactions: NormalizedSpendingTransaction[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  accounts?: AccountSummary[];
  sourceLabel: string;
}

const RANGE_PRESETS = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "YTD", days: null },
];

function getPresetRange(days: number | null): DateRange {
  const end = new Date();
  const start = new Date();

  if (days === null) {
    start.setMonth(0, 1);
  } else {
    start.setDate(end.getDate() - (days - 1));
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EnhancedSpendingDashboard({
  transactions,
  dateRange,
  onDateRangeChange,
  accounts = [],
  sourceLabel,
}: EnhancedSpendingDashboardProps) {
  const filteredTransactions = useMemo(() => {
    if (!dateRange.start || !dateRange.end) {
      return transactions;
    }

    return transactions.filter((txn) => {
      const date = txn.date;
      return date >= dateRange.start && date <= dateRange.end;
    });
  }, [transactions, dateRange]);

  const stats = useMemo(() => {
    let spending = 0;
    let income = 0;
    let subscriptionSpend = 0;
    let subscriptionCount = 0;

    filteredTransactions.forEach((txn) => {
      if (txn.signedAmount >= 0) {
        spending += txn.signedAmount;
        if (txn.subscription) {
          subscriptionSpend += txn.signedAmount;
          subscriptionCount += 1;
        }
      } else {
        income += Math.abs(txn.signedAmount);
      }
    });

    const dayCount = Math.max(
      1,
      Math.round(
        (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    );

    return {
      totalSpend: spending,
      totalIncome: income,
      avgDailySpend: spending / dayCount,
      subscriptionSpend,
      subscriptionCount,
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions, dateRange]);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredTransactions.forEach((txn) => {
      if (txn.signedAmount <= 0) return;
      const key = txn.category || "Uncategorized";
      totals[key] = (totals[key] || 0) + txn.signedAmount;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTransactions]);

  const accountBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredTransactions.forEach((txn) => {
      if (txn.signedAmount <= 0) return;
      const key = txn.accountName || "Unknown Account";
      totals[key] = (totals[key] || 0) + txn.signedAmount;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const trendData = useMemo(() => {
    const daily: Record<string, { spend: number; income: number }> = {};
    filteredTransactions.forEach((txn) => {
      if (!daily[txn.date]) {
        daily[txn.date] = { spend: 0, income: 0 };
      }
      if (txn.signedAmount >= 0) {
        daily[txn.date].spend += txn.signedAmount;
      } else {
        daily[txn.date].income += Math.abs(txn.signedAmount);
      }
    });

    return Object.entries(daily)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        date,
        spend: Math.round(value.spend),
        income: Math.round(value.income),
      }));
  }, [filteredTransactions]);

  const topMerchants = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredTransactions.forEach((txn) => {
      if (txn.signedAmount <= 0) return;
      const merchant = txn.merchant || "Unknown";
      totals[merchant] = (totals[merchant] || 0) + txn.signedAmount;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredTransactions]);

  const handleInputChange = (field: keyof DateRange, value: string) => {
    if (!value) return;
    const updated = { ...dateRange, [field]: value };
    if (updated.start <= updated.end) {
      onDateRangeChange(updated);
    }
  };

  const formatRangeLabel = () => {
    const start = new Date(dateRange.start).toLocaleDateString();
    const end = new Date(dateRange.end).toLocaleDateString();
    return `${start} → ${end}`;
  };

  const accountSummaryLabel = accounts.length > 0 ? `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}` : '';

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">Analyzing</p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-green-600" />
            {formatRangeLabel()} • {sourceLabel}
            {accountSummaryLabel && <span className="text-sm text-gray-500">• {accountSummaryLabel}</span>}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onDateRangeChange(getPresetRange(preset.days))}
              className="px-3 py-1.5 rounded-full border text-sm font-medium border-gray-300 dark:border-gray-600 hover:border-green-500"
            >
              {preset.label}
            </button>
          ))}
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleInputChange("start", e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
            <span>—</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleInputChange("end", e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={TrendingUp}
          title="Total Spending"
          value={formatCurrency(Math.round(stats.totalSpend))}
          subtitle={`${stats.transactionCount} transactions`}
          gradient="from-rose-500 to-orange-500"
        />
        <SummaryCard
          icon={Wallet}
          title="Total Income"
          value={formatCurrency(Math.round(stats.totalIncome))}
          subtitle="Captured inflows"
          gradient="from-emerald-500 to-teal-500"
        />
        <SummaryCard
          icon={CalendarRange}
          title="Avg Daily Spend"
          value={formatCurrency(Math.round(stats.avgDailySpend))}
          subtitle="Per day"
          gradient="from-blue-500 to-indigo-500"
        />
        <SummaryCard
          icon={Repeat}
          title="Subscriptions"
          value={formatCurrency(Math.round(stats.subscriptionSpend))}
          subtitle={`${stats.subscriptionCount} recurring charges`}
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Spending vs Income Trend</h3>
          </div>
          {trendData.length === 0 ? (
            <EmptyState message="No transactions for this range" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", borderRadius: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} name="Spending" />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Top Categories</h3>
          </div>
          {categoryBreakdown.length === 0 ? (
            <EmptyState message="No spending in this range" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" labelLine={false} outerRadius={90}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-sky-500" />
            <h3 className="text-lg font-semibold">Spending by Account</h3>
          </div>
          {accountBreakdown.length === 0 ? (
            <EmptyState message="No spending in this range" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={accountBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" stroke="#9ca3af" hide={accountBreakdown.length > 4} />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", borderRadius: 12 }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Repeat className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Top Merchants</h3>
          </div>
          {topMerchants.length === 0 ? (
            <EmptyState message="No merchants to show" />
          ) : (
            <ul className="space-y-3">
              {topMerchants.map((merchant, index) => (
                <li key={merchant.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{merchant.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(Math.round(merchant.value))}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  subtitle,
  gradient,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg bg-gradient-to-r ${gradient} text-white shadow`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-gray-500">
      {message}
    </div>
  );
}
