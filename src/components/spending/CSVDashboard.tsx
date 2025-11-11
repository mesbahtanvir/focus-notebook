/**
 * CSV Dashboard Components
 * Dashboard views for CSV-uploaded transaction data
 */

'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Repeat,
  PieChart,
  LineChart,
  BarChart,
  Calendar,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { useSpending, type Transaction as CsvTransaction } from '@/store/useSpending';
import {
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';

const COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function CSVDashboardSummary() {
  const { transactions } = useSpending();

  const summary = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    let monthlySpending = 0;
    let monthlyIncome = 0;
    const subscriptionTags = new Set<string>();

    transactions.forEach((txn) => {
      const txnDate = new Date(txn.date);
      if (txnDate >= thirtyDaysAgo && txnDate <= now) {
        if (txn.amount > 0) {
          monthlySpending += txn.amount;
        } else {
          monthlyIncome += Math.abs(txn.amount);
        }

        if (txn.tags?.includes('subscription')) {
          subscriptionTags.add(txn.id);
        }
      }
    });

    const subscriptions = Array.from(subscriptionTags);
    const subscriptionTotal = transactions
      .filter((txn) => subscriptions.includes(txn.id))
      .reduce((sum, txn) => sum + txn.amount, 0);

    return {
      totalTransactions: transactions.length,
      monthlySpending,
      monthlyIncome,
      activeSubscriptions: subscriptions.length,
      subscriptionTotal,
    };
  }, [transactions]);

  const cards = [
    {
      title: 'Total Transactions',
      value: summary.totalTransactions.toLocaleString(),
      subtitle: 'From CSV uploads',
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
      title: 'Subscriptions',
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

export function CSVSpendingTrends() {
  const { transactions } = useSpending();

  // Calculate monthly cashflow (last 6 months)
  const cashflowData = useMemo(() => {
    const months: Record<string, { inflow: number; outflow: number }> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[monthKey] = { inflow: 0, outflow: 0 };
    }

    // Aggregate transactions
    transactions.forEach((txn) => {
      const monthKey = txn.date.substring(0, 7); // YYYY-MM
      if (months[monthKey]) {
        if (txn.amount < 0) {
          months[monthKey].inflow += Math.abs(txn.amount);
        } else {
          months[monthKey].outflow += txn.amount;
        }
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      inflow: Math.round(data.inflow),
      outflow: Math.round(data.outflow),
    }));
  }, [transactions]);

  // Calculate category breakdown (current month)
  const categoryData = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const categories: Record<string, number> = {};

    transactions.forEach((txn) => {
      if (!txn.date.startsWith(currentMonth) || txn.amount < 0) return;
      const cat = txn.category || 'Other';
      categories[cat] = (categories[cat] || 0) + txn.amount;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }, [transactions]);

  // Calculate top merchants (current month)
  const merchantData = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const merchants: Record<string, number> = {};

    transactions.forEach((txn) => {
      if (!txn.date.startsWith(currentMonth) || txn.amount < 0) return;
      const merchant = txn.merchant || 'Unknown';
      merchants[merchant] = (merchants[merchant] || 0) + txn.amount;
    });

    return Object.entries(merchants)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 merchants
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Cashflow Chart */}
      <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Cashflow Trend (Last 6 Months)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={cashflowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="inflow"
              stroke="#10b981"
              strokeWidth={2}
              name="Income"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="outflow"
              stroke="#ef4444"
              strokeWidth={2}
              name="Spending"
              dot={{ r: 4 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Category Breakdown (This Month)
          </h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f3f4f6',
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-1 text-sm">
                {categoryData.map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      ${cat.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-8">No spending data for this month</p>
          )}
        </div>

        {/* Top Merchants */}
        <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Top Merchants (This Month)
          </h3>
          {merchantData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <RechartsBarChart data={merchantData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" width={100} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                  }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-8">No spending data for this month</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CSVTransactionsList() {
  const { transactions } = useSpending();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<CsvTransaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const pageSize = 20;

  const handleOpenDetails = useCallback((txn: CsvTransaction) => {
    setSelectedTransaction(txn);
    setShowDetails(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedTransaction(null);
    setShowDetails(false);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, transactions.length]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return transactions;
    }

    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((txn) => {
      const merchant = txn.merchant?.toLowerCase() || '';
      const description = txn.description?.toLowerCase() || '';
      const category = txn.category?.toLowerCase() || '';
      const notes = txn.notes?.toLowerCase() || '';

      return (
        merchant.includes(query) ||
        description.includes(query) ||
        category.includes(query) ||
        notes.includes(query)
      );
    });
  }, [transactions, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(start, start + pageSize);
  }, [filteredTransactions, page]);

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>No transactions yet. Upload a CSV file to get started.</p>
      </div>
    );
  }

  const startIndex = filteredTransactions.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(filteredTransactions.length, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by merchant, description, category, or notes"
          className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
        />
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <p>No transactions match your search.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {startIndex}-{endIndex} of {filteredTransactions.length.toLocaleString()} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Previous
              </button>
              <span className="font-medium">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {paginatedTransactions.map((txn) => (
              <div
                key={txn.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenDetails(txn)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOpenDetails(txn);
                  }
                }}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow cursor-pointer focus-visible:ring-2 focus-visible:ring-green-500/70 focus:outline-none"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {txn.merchant}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        {txn.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{txn.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{new Date(txn.date).toLocaleDateString()}</span>
                      {txn.tags && txn.tags.length > 0 && (
                        <span className="text-purple-600 dark:text-purple-400">
                          {txn.tags.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${
                        txn.amount < 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {txn.amount < 0 ? '+' : '-'}${Math.abs(txn.amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
                {txn.notes && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                    {txn.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          <CSVTransactionDetailModal
            transaction={selectedTransaction}
            isOpen={showDetails && Boolean(selectedTransaction)}
            onClose={handleCloseDetails}
          />
        </>
      )}
    </div>
  );
}

interface CSVTransactionDetailModalProps {
  transaction: CsvTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

function CSVTransactionDetailModal({ transaction, isOpen, onClose }: CSVTransactionDetailModalProps) {
  if (!transaction || !isOpen) return null;

  const isIncome = transaction.amount < 0;
  const amount = Math.abs(transaction.amount);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Transaction Details
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{transaction.merchant}</h2>
            <div className="mt-2 text-lg font-semibold">
              <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                {isIncome ? '+' : '-'}
                {formatCurrency(amount)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-6">
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Calendar className="h-4 w-4" />
              <span>{new Date(transaction.date).toLocaleDateString()}</span>
              <span className="text-gray-400">•</span>
              <span>{transaction.category}</span>
            </div>
            <p className="text-base text-gray-700 dark:text-gray-200">{transaction.description}</p>
            {transaction.notes && (
              <p className="text-sm italic text-gray-500 dark:text-gray-400">{transaction.notes}</p>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Source
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200 capitalize">
                {transaction.source || 'csv-upload'}
              </p>
              {transaction.csvFileName && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  File: {transaction.csvFileName}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tags
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {transaction.tags && transaction.tags.length > 0 ? (
                  transaction.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">No tags</span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
