'use client';

import { BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { UsageStats } from '@focus/shared';

interface UsageStatsCardProps {
  stats: UsageStats[];
  currentMonthTotal: number;
  totalAllTime: number;
  isLoading: boolean;
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function UsageStatsCard({
  stats,
  currentMonthTotal,
  totalAllTime,
  isLoading,
}: UsageStatsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data (reverse to show oldest to newest)
  const chartData = [...stats]
    .reverse()
    .map((stat) => ({
      month: formatMonth(stat.month),
      thoughts: stat.thoughtsProcessed,
    }));

  // Calculate trend
  const hasTrend = stats.length >= 2;
  const trend = hasTrend
    ? stats[0].thoughtsProcessed - stats[1].thoughtsProcessed
    : 0;
  const trendPercentage = hasTrend && stats[1].thoughtsProcessed > 0
    ? Math.round((trend / stats[1].thoughtsProcessed) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          AI Usage Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Month */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                This Month
              </span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {currentMonthTotal}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              thoughts processed
            </div>
            {hasTrend && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                <TrendingUp className={cn(
                  "h-4 w-4",
                  trend < 0 && "rotate-180"
                )} />
                {trend >= 0 ? '+' : ''}{trendPercentage}% from last month
              </div>
            )}
          </div>

          {/* All Time */}
          <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                All Time
              </span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              {totalAllTime}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              total thoughts processed
            </div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Monthly Activity
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                  fontSize={12}
                />
                <YAxis
                  tick={{ fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 600 }}
                  itemStyle={{ color: '#8b5cf6' }}
                />
                <Bar
                  dataKey="thoughts"
                  fill="url(#colorGradient)"
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Empty state */}
        {chartData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No usage data yet. Start processing thoughts to see your statistics!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
