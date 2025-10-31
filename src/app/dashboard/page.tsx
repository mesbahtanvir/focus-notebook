"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, Smile, Target, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";

import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardLink from "@/components/dashboard/DashboardLink";
import DashboardSummary from "@/components/dashboard/DashboardSummary";
import ProductivityInsights from "@/components/dashboard/ProductivityInsights";
import StatsCard from "@/components/dashboard/StatsCard";
import { TokenUsageDashboard } from "@/components/TokenUsageDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import type { DashboardAnalytics, SummaryPeriod } from "@/lib/analytics/dashboard";
import { computeDashboardAnalytics } from "@/lib/analytics/dashboard";
import { useFocus } from "@/store/useFocus";
import { useMoods } from "@/store/useMoods";
import { useTasks } from "@/store/useTasks";

const SUMMARY_PERIOD_OPTIONS: ReadonlyArray<{ value: SummaryPeriod; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

const STAT_CARD_DEFINITIONS: ReadonlyArray<{
  key: string;
  title: string;
  gradient: string;
  icon: ReactNode;
  value: (analytics: DashboardAnalytics) => string;
  subtitle: (analytics: DashboardAnalytics) => string;
}> = [
  {
    key: "focus-time",
    title: "Focus Time",
    gradient: "from-purple-500 to-pink-500",
    icon: <Zap className="h-6 w-6" />,
    value: (analytics) => `${analytics.stats.totalFocusTime}m`,
    subtitle: (analytics) => `${analytics.stats.totalSessions} sessions`,
  },
  {
    key: "tasks-completed",
    title: "Tasks Completed",
    gradient: "from-green-500 to-emerald-500",
    icon: <Target className="h-6 w-6" />,
    value: (analytics) => analytics.stats.completedTasks.toString(),
    subtitle: (analytics) => getPeriodLabel(analytics.period),
  },
  {
    key: "average-mood",
    title: "Average Mood",
    gradient: "from-yellow-500 to-orange-500",
    icon: <Smile className="h-6 w-6" />,
    value: (analytics) => analytics.stats.avgMood.toFixed(1),
    subtitle: () => "out of 10",
  },
  {
    key: "estimated-time",
    title: "Estimated Time",
    gradient: "from-blue-500 to-cyan-500",
    icon: <Clock className="h-6 w-6" />,
    value: (analytics) => `${Math.round(analytics.stats.totalTaskTime / 60)}h`,
    subtitle: (analytics) => `${analytics.stats.totalTaskTime % 60}m`,
  },
] as const;

function getPeriodLabel(period: SummaryPeriod): string {
  const option = SUMMARY_PERIOD_OPTIONS.find((item) => item.value === period);
  return option?.label ?? period;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const tasks = useTasks((state) => state.tasks);
  const moods = useMoods((state) => state.moods);
  const sessions = useFocus((state) => state.sessions);
  const subscribe = useFocus((state) => state.subscribe);
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("today");

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const analytics = useMemo(
    () =>
      computeDashboardAnalytics({
        tasks,
        moods,
        sessions,
        period: summaryPeriod,
      }),
    [tasks, moods, sessions, summaryPeriod]
  );

  return (
    <div className="container mx-auto py-6 md:py-8 lg:py-10 px-4 md:px-6 lg:px-8 max-w-7xl">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div className="mb-6 xl:col-span-2">
          <Card className="border-4 border-indigo-200 shadow-xl bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                Select Dashboard
              </CardTitle>
              <CardDescription>View your analytics or progress tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <DashboardLink
                  title="Analytics Dashboard"
                  description="View charts, trends, and detailed analytics"
                  icon={<TrendingUp className="h-8 w-8" />}
                  href="/dashboard"
                  gradient="from-blue-500 to-cyan-500"
                />
                <DashboardLink
                  title="Progress Dashboard"
                  description="Track your goals, projects, and task progress"
                  icon={<Target className="h-8 w-8" />}
                  href="/dashboard/progress"
                  gradient="from-green-500 to-emerald-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-4 mb-2 xl:col-span-2">
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 shadow-md">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Period:</span>
            {SUMMARY_PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSummaryPeriod(value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  summaryPeriod === value
                    ? "bg-blue-600 text-white shadow-lg scale-105"
                    : "bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <DashboardSummary summary={analytics.summary} />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STAT_CARD_DEFINITIONS.map(({ key, icon, title, gradient, value, subtitle }) => (
              <StatsCard
                key={key}
                icon={icon}
                title={title}
                value={value(analytics)}
                subtitle={subtitle(analytics)}
                gradient={gradient}
              />
            ))}
          </div>

          <DashboardCharts
            moodData={analytics.moodData}
            focusData={analytics.focusData}
            taskData={analytics.taskData}
          />

          <ProductivityInsights timeOfDayData={analytics.timeOfDayData} />

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <TokenUsageDashboard />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
