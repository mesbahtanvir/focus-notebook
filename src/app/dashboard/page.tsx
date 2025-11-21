"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Target, Zap, Flame, BookOpen, Heart, BarChart3, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import DashboardCharts from "@/components/dashboard/DashboardCharts";
import ProductivityInsights from "@/components/dashboard/ProductivityInsights";
import StatsCard from "@/components/dashboard/StatsCard";
import CurrentFocusGoal from "@/components/dashboard/CurrentFocusGoal";
import TodaysAgenda from "@/components/dashboard/TodaysAgenda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import type { DashboardAnalytics, SummaryPeriod } from "@/lib/analytics/dashboard";
import { computeDashboardAnalytics } from "@/lib/analytics/dashboard";
import { useFocus } from "@/store/useFocus";
import { useTasks } from "@/store/useTasks";
import { useGoals } from "@/store/useGoals";
import { useProjects } from "@/store/useProjects";

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
  comparison?: (analytics: DashboardAnalytics) => number | null;
  comparisonContext?: (analytics: DashboardAnalytics) => string;
}> = [
  {
    key: "focus-time",
    title: "Focus Time",
    gradient: "from-purple-500 to-pink-500",
    icon: <Zap className="h-6 w-6" />,
    value: (analytics) => {
      const hours = Math.floor(analytics.stats.totalFocusTime / 60);
      const mins = analytics.stats.totalFocusTime % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    },
    subtitle: (analytics) => `${analytics.stats.totalSessions} sessions`,
    comparison: (analytics) => analytics.comparison?.focusTime ?? null,
    comparisonContext: (analytics) => {
      if (analytics.period === "today") return "vs. yesterday";
      if (analytics.period === "week") return "vs. last week";
      return "vs. last month";
    },
  },
  {
    key: "tasks-completed",
    title: "Tasks Completed",
    gradient: "from-green-500 to-emerald-500",
    icon: <Target className="h-6 w-6" />,
    value: (analytics) => analytics.stats.completedTasks.toString(),
    subtitle: (analytics) => getPeriodLabel(analytics.period),
    comparison: (analytics) => analytics.comparison?.tasks ?? null,
    comparisonContext: (analytics) => {
      if (analytics.period === "today") return "vs. yesterday";
      if (analytics.period === "week") return "vs. last week";
      return "vs. last month";
    },
  },
  {
    key: "streak",
    title: "Streak",
    gradient: "from-orange-500 to-red-500",
    icon: <Flame className="h-6 w-6" />,
    value: (analytics) => analytics.stats.currentStreak.toString(),
    subtitle: () => "consecutive days",
  },
  {
    key: "mastery",
    title: "Mastery Tasks",
    gradient: "from-blue-500 to-cyan-500",
    icon: <BookOpen className="h-6 w-6" />,
    value: (analytics) => analytics.stats.masteryTasks.toString(),
    subtitle: (analytics) => getPeriodLabel(analytics.period),
  },
  {
    key: "pleasure",
    title: "Pleasure Tasks",
    gradient: "from-pink-500 to-purple-500",
    icon: <Heart className="h-6 w-6" />,
    value: (analytics) => analytics.stats.pleasureTasks.toString(),
    subtitle: (analytics) => getPeriodLabel(analytics.period),
  },
] as const;

function getPeriodLabel(period: SummaryPeriod): string {
  const option = [...SUMMARY_PERIOD_OPTIONS].find((item) => item.value === period);
  return option?.label ?? period;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const tasks = useTasks((state) => state.tasks);
  const sessions = useFocus((state) => state.sessions);
  const goals = useGoals((state) => state.goals);
  const projects = useProjects((state) => state.projects);

  // Get loading and error states
  const isLoadingTasks = useTasks((state) => state.isLoading);
  const isLoadingFocus = useFocus((state) => state.isLoading);
  const isLoadingGoals = useGoals((state) => state.isLoading);
  const isLoadingProjects = useProjects((state) => state.isLoading);

  const tasksSyncError = useTasks((state) => state.syncError);
  // Note: Only useTasks has syncError field currently. Other stores may add it in the future.

  const subscribeFocus = useFocus((state) => state.subscribe);
  const subscribeTasks = useTasks((state) => state.subscribe);
  const subscribeGoals = useGoals((state) => state.subscribe);
  const subscribeProjects = useProjects((state) => state.subscribe);

  const isLoading = isLoadingTasks || isLoadingFocus || isLoadingGoals || isLoadingProjects;
  const hasErrors = !!tasksSyncError;

  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("today");

  useEffect(() => {
    if (user?.uid) {
      subscribeFocus(user.uid);
      subscribeTasks(user.uid);
      subscribeGoals(user.uid);
      subscribeProjects(user.uid);
    }

    // Cleanup function - unsubscribe from all stores
    return () => {
      const unsubFocus = useFocus.getState().unsubscribe;
      const unsubTasks = useTasks.getState().unsubscribe;
      const unsubGoals = useGoals.getState().unsubscribe;
      const unsubProjects = useProjects.getState().unsubscribe;

      if (unsubFocus) unsubFocus();
      if (unsubTasks) unsubTasks();
      if (unsubGoals) unsubGoals();
      if (unsubProjects) unsubProjects();
    };
  }, [user?.uid, subscribeFocus, subscribeTasks, subscribeGoals, subscribeProjects]);

  const analytics = useMemo(
    () =>
      computeDashboardAnalytics({
        tasks,
        sessions,
        goals,
        projects,
        period: summaryPeriod,
      }),
    [tasks, sessions, goals, projects, summaryPeriod]
  );

  return (
    <div className="container mx-auto py-6 md:py-8 lg:py-10 px-4 md:px-6 lg:px-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Focus Notebook Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your productivity, goals, and progress
          </p>
        </motion.div>

        {/* Error Banner */}
        {hasErrors && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Sync Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Some data may be out of sync. Please check your connection and refresh the page.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading dashboard data...</span>
          </div>
        )}

        {/* Period Selector */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-4">
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

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {STAT_CARD_DEFINITIONS.map(({ key, icon, title, gradient, value, subtitle, comparison, comparisonContext }) => (
            <StatsCard
              key={key}
              icon={icon}
              title={title}
              value={value(analytics)}
              subtitle={subtitle(analytics)}
              gradient={gradient}
              comparison={comparison ? comparison(analytics) : undefined}
              comparisonContext={comparisonContext ? comparisonContext(analytics) : undefined}
            />
          ))}
        </div>

        {/* Current Focus Goal */}
        {analytics.goals.topGoal && (
          <CurrentFocusGoal
            goal={analytics.goals.topGoal}
            projectsCompleted={analytics.projects.completed}
            projectsTotal={analytics.projects.total}
            tasksCompleted={analytics.stats.completedTasks}
            tasksTotal={tasks.length}
          />
        )}

        {/* Today's Agenda (only show when period is "today") */}
        {summaryPeriod === "today" && <TodaysAgenda tasks={tasks} />}

        {/* Charts */}
        <DashboardCharts focusData={analytics.focusData} taskData={analytics.taskData} />

        {/* Productivity by Time of Day */}
        <ProductivityInsights timeOfDayData={analytics.timeOfDayData} />

        {/* Goals & Projects Progress */}
        <Card className="border-4 border-indigo-200 shadow-xl bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
          <CardHeader className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 border-b-4 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                Goals & Projects Progress
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Goals */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Goals</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {analytics.goals.progress.toFixed(1)}% Complete
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {analytics.goals.completed}/{analytics.goals.total}
                    </span>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${analytics.goals.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="text-gray-600 dark:text-gray-400">Active</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {analytics.goals.active}
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-gray-600 dark:text-gray-400">Completed</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {analytics.goals.completed}
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Projects</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {analytics.projects.progress.toFixed(1)}% Complete
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {analytics.projects.completed}/{analytics.projects.total}
                    </span>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${analytics.projects.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex-1 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <div className="text-gray-600 dark:text-gray-400">Active</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {analytics.projects.active}
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-gray-600 dark:text-gray-400">Completed</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {analytics.projects.completed}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
