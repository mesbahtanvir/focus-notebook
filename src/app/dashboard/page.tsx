"use client";

import { useState, useMemo, useEffect } from "react";
import SummaryPanel from "@/components/SummaryPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, Zap, Target, Smile, Calendar } from "lucide-react";
import { useTasks } from "@/store/useTasks";
import { useMoods } from "@/store/useMoods";
import { useFocus } from "@/store/useFocus";
import { motion } from "framer-motion";

type TimeRange = '7d' | '30d' | '90d';

export default function DashboardPage() {
  const tasks = useTasks((s) => s.tasks);
  const moods = useMoods((s) => s.moods);
  const sessions = useFocus((s) => s.sessions);
  const loadSessions = useFocus((s) => s.loadSessions);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  // Generate analytics data
  const analytics = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Mood trends
    const moodData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayMoods = moods.filter(m => {
        const moodDate = new Date(m.createdAt);
        return moodDate.toDateString() === date.toDateString();
      });
      const avgMood = dayMoods.length > 0
        ? dayMoods.reduce((sum, m) => sum + m.value, 0) / dayMoods.length
        : null;
      moodData.push({ date, value: avgMood });
    }

    // Focus session time trends
    const focusData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.startTime);
        return sessionDate.toDateString() === date.toDateString();
      });
      const totalMinutes = daySessions.reduce((sum, s) => {
        const sessionTime = s.tasks.reduce((t, task) => t + task.timeSpent, 0) / 60;
        return sum + sessionTime;
      }, 0);
      focusData.push({ date, minutes: totalMinutes });
    }

    // Task completion trends by category
    const taskData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const completedTasks = tasks.filter(t => {
        if (!t.completedAt) return false;
        const taskDate = new Date(t.completedAt);
        return taskDate.toDateString() === date.toDateString();
      });
      const mastery = completedTasks.filter(t => t.category === 'mastery').length;
      const pleasure = completedTasks.filter(t => t.category === 'pleasure').length;
      taskData.push({ date, mastery, pleasure, total: mastery + pleasure });
    }

    // Overall statistics
    const totalFocusTime = sessions.reduce((sum, s) => {
      return sum + s.tasks.reduce((t, task) => t + task.timeSpent, 0);
    }, 0);

    const completedTasks = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= startDate);
    const masteryTasks = completedTasks.filter(t => t.category === 'mastery');
    const pleasureTasks = completedTasks.filter(t => t.category === 'pleasure');

    const avgMood = moods.filter(m => new Date(m.createdAt) >= startDate)
      .reduce((sum, m, i, arr) => sum + m.value / arr.length, 0);

    const totalTaskTime = completedTasks.reduce((sum, t) => {
      return sum + (t.estimatedMinutes || 0);
    }, 0);

    return {
      moodData,
      focusData,
      taskData,
      stats: {
        totalFocusTime: Math.round(totalFocusTime / 60),
        totalSessions: sessions.filter(s => new Date(s.startTime) >= startDate).length,
        completedTasks: completedTasks.length,
        masteryTasks: masteryTasks.length,
        pleasureTasks: pleasureTasks.length,
        avgMood: avgMood || 0,
        totalTaskTime,
      }
    };
  }, [tasks, moods, sessions, days]);

  return (
    <div className="container mx-auto py-6 md:py-8 space-y-6 px-4 md:px-0 max-w-7xl">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full">
            <BarChart3 className="h-10 w-10 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
          📊 Dashboard
        </h1>
        <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
          Comprehensive analytics and insights
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-center gap-2">
        {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              timeRange === range
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Today's Summary */}
      <Card className="border-4 border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950">
        <CardHeader className="bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 border-b-4 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                📈 Today&apos;s Summary
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 font-medium text-sm md:text-base">
                Your activity at a glance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <SummaryPanel />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<Zap className="h-6 w-6" />}
          title="Focus Time"
          value={`${analytics.stats.totalFocusTime}m`}
          subtitle={`${analytics.stats.totalSessions} sessions`}
          gradient="from-purple-500 to-pink-500"
        />
        <StatsCard
          icon={<Target className="h-6 w-6" />}
          title="Tasks Completed"
          value={analytics.stats.completedTasks.toString()}
          subtitle={`${analytics.stats.masteryTasks}M / ${analytics.stats.pleasureTasks}P`}
          gradient="from-green-500 to-emerald-500"
        />
        <StatsCard
          icon={<Smile className="h-6 w-6" />}
          title="Average Mood"
          value={analytics.stats.avgMood.toFixed(1)}
          subtitle="out of 10"
          gradient="from-yellow-500 to-orange-500"
        />
        <StatsCard
          icon={<Clock className="h-6 w-6" />}
          title="Estimated Time"
          value={`${Math.round(analytics.stats.totalTaskTime / 60)}h`}
          subtitle={`${analytics.stats.totalTaskTime % 60}m`}
          gradient="from-blue-500 to-cyan-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mood Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smile className="h-5 w-5 text-yellow-500" />
              Mood Trends
            </CardTitle>
            <CardDescription>Average daily mood over time</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={analytics.moodData} color="#f59e0b" maxValue={10} />
          </CardContent>
        </Card>

        {/* Focus Time Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              Focus Session Time
            </CardTitle>
            <CardDescription>Minutes spent in focus mode</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart data={analytics.focusData.map(d => ({ date: d.date, value: d.minutes }))} color="#a855f7" />
          </CardContent>
        </Card>

        {/* Task Completion Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Task Completion by Category
            </CardTitle>
            <CardDescription>Daily tasks completed (Mastery vs Pleasure)</CardDescription>
          </CardHeader>
          <CardContent>
            <StackedAreaChart data={analytics.taskData} />
          </CardContent>
        </Card>
      </div>

      {/* Task Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Category Breakdown
          </CardTitle>
          <CardDescription>Time distribution across task categories</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryBreakdown
            mastery={analytics.stats.masteryTasks}
            pleasure={analytics.stats.pleasureTasks}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ icon, title, value, subtitle, gradient }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${gradient} text-white mb-4`}>
        {icon}
      </div>
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
    </motion.div>
  );
}

function LineChart({ data, color, maxValue }: {
  data: { date: Date; value: number | null }[];
  color: string;
  maxValue?: number;
}) {
  const width = 600;
  const height = 200;
  const padding = 40;

  const validData = data.filter(d => d.value !== null) as { date: Date; value: number }[];
  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data available
      </div>
    );
  }

  const max = maxValue || Math.max(...validData.map(d => d.value));
  const min = 0;

  const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding);
  const yScale = (value: number) => height - padding - ((value - min) / (max - min)) * (height - 2 * padding);

  const points = data.map((d, i) => {
    if (d.value === null) return null;
    return `${xScale(i)},${yScale(d.value)}`;
  }).filter(Boolean).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = height - padding - ratio * (height - 2 * padding);
        return (
          <g key={ratio}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.1"
            />
            <text
              x={padding - 10}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-muted-foreground"
            >
              {(min + ratio * (max - min)).toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {data.map((d, i) => {
        if (d.value === null) return null;
        return (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.value)}
            r="4"
            fill={color}
          />
        );
      })}
    </svg>
  );
}

function StackedAreaChart({ data }: {
  data: { date: Date; mastery: number; pleasure: number; total: number }[];
}) {
  const width = 800;
  const height = 200;
  const padding = 40;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data available
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.total), 1);

  const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding);
  const yScale = (value: number) => height - padding - (value / max) * (height - 2 * padding);

  // Create path for mastery area
  const masteryPath = [
    `M ${xScale(0)} ${height - padding}`,
    ...data.map((d, i) => `L ${xScale(i)} ${yScale(d.mastery)}`),
    `L ${xScale(data.length - 1)} ${height - padding}`,
    'Z'
  ].join(' ');

  // Create path for pleasure area (stacked on top)
  const pleasurePath = [
    `M ${xScale(0)} ${yScale(data[0].mastery)}`,
    ...data.map((d, i) => `L ${xScale(i)} ${yScale(d.mastery + d.pleasure)}`),
    `L ${xScale(data.length - 1)} ${yScale(data[data.length - 1].mastery)}`,
    ...data.slice().reverse().map((d, i) => {
      const index = data.length - 1 - i;
      return `L ${xScale(index)} ${yScale(d.mastery)}`;
    }),
    'Z'
  ].join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Grid */}
        {[0, 0.5, 1].map((ratio) => {
          const y = height - padding - ratio * (height - 2 * padding);
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              <text
                x={padding - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-muted-foreground"
              >
                {Math.round(ratio * max)}
              </text>
            </g>
          );
        })}

        {/* Areas */}
        <path d={masteryPath} fill="#3b82f6" opacity="0.6" />
        <path d={pleasurePath} fill="#ec4899" opacity="0.6" />
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-sm">Mastery</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-pink-500" />
          <span className="text-sm">Pleasure</span>
        </div>
      </div>
    </div>
  );
}

function CategoryBreakdown({ mastery, pleasure }: { mastery: number; pleasure: number }) {
  const total = mastery + pleasure || 1;
  const masteryPct = (mastery / total) * 100;
  const pleasurePct = (pleasure / total) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Mastery Tasks</span>
            <span className="text-sm text-muted-foreground">{mastery} ({masteryPct.toFixed(1)}%)</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${masteryPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pleasure Tasks</span>
            <span className="text-sm text-muted-foreground">{pleasure} ({pleasurePct.toFixed(1)}%)</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pleasurePct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-pink-500 to-pink-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
