/**
 * Spending Trends Component
 * Visualizations for cashflow, categories, and merchants
 */

'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { useSpendingTool } from '@/store/useSpendingTool';

const COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export default function SpendingTrends() {
  const { transactions } = useSpendingTool();

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
      if (txn.pending) return;
      const monthKey = txn.postedAt.substring(0, 7); // YYYY-MM
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
      if (txn.pending || !txn.postedAt.startsWith(currentMonth) || txn.amount < 0) return;
      const cat = txn.category_premium?.[0] || txn.category_base?.[0] || 'Other';
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
      if (txn.pending || !txn.postedAt.startsWith(currentMonth) || txn.amount < 0) return;
      const merchant = txn.merchant?.normalized || txn.merchant?.name || 'Unknown';
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
          <LineChart data={cashflowData}>
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
          </LineChart>
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
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                </PieChart>
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
              <BarChart data={merchantData} layout="vertical">
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
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-8">No spending data for this month</p>
          )}
        </div>
      </div>
    </div>
  );
}
