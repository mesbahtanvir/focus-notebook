"use client";

import { useState, useMemo, useEffect } from "react";
import SummaryPanel from "@/components/SummaryPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, Zap, Target, Smile, Calendar } from "lucide-react";
import Link from "next/link";
import { useTasks } from "@/store/useTasks";
import { useMoods } from "@/store/useMoods";
import { useFocus } from "@/store/useFocus";
import { motion } from "framer-motion";
import { getTimeOfDayCategory } from "@/lib/formatDateTime";
import { useAuth } from "@/contexts/AuthContext";
import { TokenUsageDashboard } from "@/components/TokenUsageDashboard";

type SummaryPeriod = 'today' | 'week' | 'month';

export default function DashboardPage() {
  const { user } = useAuth();
  const tasks = useTasks((s) => s.tasks);
  const moods = useMoods((s) => s.moods);
  const sessions = useFocus((s) => s.sessions);
  const subscribe = useFocus((s) => s.subscribe);
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('today');

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  // Generate analytics data
  const analytics = useMemo(() => {
    const now = new Date();

    // Use summaryPeriod for all date range calculations
    let startDate = new Date();
    let days = 1;

    if (summaryPeriod === 'today') {
      startDate.setHours(0, 0, 0, 0);
      days = 1;
    } else if (summaryPeriod === 'week') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      days = 7;
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      // Calculate days in current month
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      days = lastDay.getDate();
    }

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
        const sessionTime = (s.tasks || []).reduce((t, task) => t + task.timeSpent, 0) / 60;
        return sum + sessionTime;
      }, 0);
      focusData.push({ date, minutes: totalMinutes });
    }

    // Overall statistics - filter all data by startDate
    const completedTasks = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= startDate);

    const recentMoods = moods.filter(m => new Date(m.createdAt) >= startDate);
    const avgMood = recentMoods.length > 0
      ? recentMoods.reduce((sum, m) => sum + m.value, 0) / recentMoods.length
      : 0;

    const totalFocusTime = sessions
      .filter(s => new Date(s.startTime) >= startDate)
      .reduce((sum, s) => {
        return sum + (s.tasks || []).reduce((t, task) => t + task.timeSpent, 0);
      }, 0);

    const totalTaskTime = completedTasks.reduce((sum, t) => {
      return sum + (t.estimatedMinutes || 0);
    }, 0);

    // Task completion trends by category
    const taskData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayCompletedTasks = tasks.filter(t => {
        if (!t.completedAt) return false;
        const taskDate = new Date(t.completedAt);
        return taskDate.toDateString() === date.toDateString();
      });
      taskData.push({ date, total: dayCompletedTasks.length });
    }

    // Summary stats (same as overall stats since we're using unified date range)
    const summaryTasks = completedTasks;
    const summaryMastery = summaryTasks.filter(t => t.category === 'mastery').length;
    const summaryPleasure = summaryTasks.filter(t => t.category === 'pleasure').length;
    const summaryAvgMood = avgMood;
    const summaryFocusTime = totalFocusTime;

    // Mastery vs Pleasure trends
    const categoryData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayTasks = tasks.filter(t => {
        if (!t.completedAt) return false;
        const taskDate = new Date(t.completedAt);
        return taskDate.toDateString() === date.toDateString();
      });
      const mastery = dayTasks.filter(t => t.category === 'mastery').length;
      const pleasure = dayTasks.filter(t => t.category === 'pleasure').length;
      categoryData.push({ date, mastery, pleasure });
    }

    // Productivity by time of day
    const timeOfDayData = {
      morning: { sessions: 0, totalTime: 0, completedTasks: 0, avgCompletion: 0 },
      afternoon: { sessions: 0, totalTime: 0, completedTasks: 0, avgCompletion: 0 },
      evening: { sessions: 0, totalTime: 0, completedTasks: 0, avgCompletion: 0 },
      night: { sessions: 0, totalTime: 0, completedTasks: 0, avgCompletion: 0 },
      lateNight: { sessions: 0, totalTime: 0, completedTasks: 0, avgCompletion: 0 },
    };

    sessions.filter(s => new Date(s.startTime) >= startDate).forEach(session => {
      const hour = new Date(session.startTime).getHours();
      let timeOfDay: keyof typeof timeOfDayData;
      
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else if (hour >= 21 || hour < 2) timeOfDay = 'night';
      else timeOfDay = 'lateNight'; // 2am - 5am

      const sessionTime = (session.tasks || []).reduce((sum, t) => sum + t.timeSpent, 0);
      const completed = (session.tasks || []).filter(t => t.completed).length;
      
      timeOfDayData[timeOfDay].sessions++;
      timeOfDayData[timeOfDay].totalTime += sessionTime;
      timeOfDayData[timeOfDay].completedTasks += completed;
    });

    // Calculate average completion rates
    Object.keys(timeOfDayData).forEach(key => {
      const data = timeOfDayData[key as keyof typeof timeOfDayData];
      if (data.sessions > 0) {
        const totalPossibleTasks = sessions
          .filter(s => getTimeOfDayCategory(s.startTime) === key)
          .reduce((sum, s) => sum + (s.tasks || []).length, 0);
        data.avgCompletion = totalPossibleTasks > 0 ? (data.completedTasks / totalPossibleTasks) * 100 : 0;
      }
    });

    return {
      moodData,
      focusData,
      taskData,
      categoryData,
      timeOfDayData,
      stats: {
        totalFocusTime: Math.round(totalFocusTime / 60),
        totalSessions: sessions.filter(s => new Date(s.startTime) >= startDate).length,
        completedTasks: completedTasks.length,
        avgMood: avgMood || 0,
        totalTaskTime,
      },
      summary: {
        tasksCompleted: summaryTasks.length,
        mastery: summaryMastery,
        pleasure: summaryPleasure,
        avgMood: summaryAvgMood,
        focusTime: Math.round(summaryFocusTime / 60),
      },
      period: summaryPeriod,
      days,
    };
  }, [tasks, moods, sessions, summaryPeriod]);

  return (
    <div className="container mx-auto py-6 md:py-8 px-4 md:px-0 max-w-7xl">
      {/* Dashboard Selection */}
      <div className="mb-6">
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

      {/* Sticky Period Selector */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-4 mb-2">
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 shadow-md">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Period:</span>
          {(['today', 'week', 'month'] as SummaryPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setSummaryPeriod(period)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                summaryPeriod === period
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Section */}
        <Card className="border-4 border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950">
          <CardHeader className="bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 border-b-4 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  📈 Summary
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 font-medium text-sm md:text-base">
                  Your activity at a glance
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasks Completed</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.summary.tasksCompleted}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mastery 🧠</div>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{analytics.summary.mastery}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pleasure 💝</div>
              <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{analytics.summary.pleasure}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Mood</div>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.summary.avgMood.toFixed(1)}</div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800">
            <div className="text-center">
              <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">Focus Time</div>
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">{analytics.summary.focusTime}m</div>
            </div>
          </div>
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
          subtitle={analytics.period === 'today' ? 'Today' : analytics.period === 'week' ? 'This Week' : 'This Month'}
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
              <TrendingUp className="h-5 w-5 text-green-500" />
              Task Completion Trend
            </CardTitle>
            <CardDescription>Daily tasks completed over time</CardDescription>
          </CardHeader>
          <CardContent>
            <StackedAreaChart data={analytics.taskData} />
          </CardContent>
        </Card>
      </div>

      {/* Productivity by Time of Day */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-500" />
            Productivity by Time of Day
          </CardTitle>
          <CardDescription>When are you most productive?</CardDescription>
        </CardHeader>
        <CardContent>
          <TimeOfDayProductivity data={analytics.timeOfDayData} />
        </CardContent>
      </Card>

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
          <div className="text-center py-8 text-muted-foreground">
            <p>Task categories removed - use tags instead</p>
          </div>
        </CardContent>
      </Card>
      {/* Token Usage Dashboard */}
      <div className="mt-6">
        <TokenUsageDashboard />
      </div>
      </div>
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

  const validData = data.filter(d => d.value !== null && !isNaN(d.value)) as { date: Date; value: number }[];
  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data available
      </div>
    );
  }

  const max = maxValue || Math.max(...validData.map(d => d.value));
  const min = 0;
  const range = max - min;

  // Handle edge cases
  const xScale = (index: number) => {
    if (data.length === 1) return width / 2;
    return padding + (index / (data.length - 1)) * (width - 2 * padding);
  };
  
  const yScale = (value: number) => {
    if (range === 0) return height / 2; // If all values are the same
    const normalized = (value - min) / range;
    if (isNaN(normalized)) return height / 2;
    return height - padding - normalized * (height - 2 * padding);
  };

  const points = data.map((d, i) => {
    if (d.value === null) return null;
    const x = xScale(i);
    const y = yScale(d.value);
    // Skip if either coordinate is NaN or invalid
    if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return null;
    return `${x},${y}`;
  }).filter(Boolean).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = height - padding - ratio * (height - 2 * padding);
        const labelValue = min + ratio * (max - min);
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
              {isFinite(labelValue) ? labelValue.toFixed(1) : '0'}
            </text>
          </g>
        );
      })}

      {/* Line */}
      {points && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Points */}
      {data.map((d, i) => {
        if (d.value === null) return null;
        const cx = xScale(i);
        const cy = yScale(d.value);
        // Only render if coordinates are valid numbers
        if (isNaN(cx) || isNaN(cy) || !isFinite(cx) || !isFinite(cy)) return null;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="4"
            fill={color}
          />
        );
      })}
    </svg>
  );
}

function StackedAreaChart({ data }: {
  data: { date: Date; total: number }[];
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

  // Create path for total area
  const totalPath = [
    `M ${xScale(0)} ${height - padding}`,
    ...data.map((d, i) => `L ${xScale(i)} ${yScale(d.total)}`),
    `L ${xScale(data.length - 1)} ${height - padding}`,
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

        {/* Area */}
        <path d={totalPath} fill="#3b82f6" opacity="0.6" />
      </svg>
    </div>
  );
}

function TimeOfDayProductivity({ data }: {
  data: {
    morning: { sessions: number; totalTime: number; completedTasks: number; avgCompletion: number };
    afternoon: { sessions: number; totalTime: number; completedTasks: number; avgCompletion: number };
    evening: { sessions: number; totalTime: number; completedTasks: number; avgCompletion: number };
    night: { sessions: number; totalTime: number; completedTasks: number; avgCompletion: number };
  }
}) {
  const periods = [
    { key: 'morning', label: 'Morning', emoji: '🌅', time: '5am-12pm', color: 'from-amber-400 to-yellow-500' },
    { key: 'afternoon', label: 'Afternoon', emoji: '☀️', time: '12pm-5pm', color: 'from-orange-400 to-amber-500' },
    { key: 'evening', label: 'Evening', emoji: '🌆', time: '5pm-9pm', color: 'from-purple-400 to-pink-500' },
    { key: 'night', label: 'Night', emoji: '🌙', time: '9pm-5am', color: 'from-indigo-500 to-purple-600' },
  ];

  // Find most productive time
  const maxCompletion = Math.max(...periods.map(p => data[p.key as keyof typeof data].avgCompletion));
  
  return (
    <div className="space-y-4">
      {periods.map((period) => {
        const periodData = data[period.key as keyof typeof data];
        const isMostProductive = periodData.avgCompletion === maxCompletion && maxCompletion > 0;
        
        return (
          <motion.div
            key={period.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-lg border-2 transition-all ${
              isMostProductive
                ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{period.emoji}</span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {period.label}
                    {isMostProductive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white">Most Productive</span>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{period.time}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {periodData.avgCompletion.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">completion</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Sessions</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{periodData.sessions}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Focus Time</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(periodData.totalTime / 60)}m</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Tasks Done</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{periodData.completedTasks}</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${periodData.avgCompletion}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${period.color}`}
              />
            </div>
          </motion.div>
        );
      })}

      {/* Summary */}
      {maxCompletion === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No focus sessions yet. Start tracking to see when you&apos;re most productive!</p>
        </div>
      )}
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

function DashboardLink({ title, description, icon, href, gradient }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer`}
      >
        <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${gradient} text-white mb-4 shadow-lg`}>
          {icon}
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
      </motion.div>
    </Link>
  );
}
