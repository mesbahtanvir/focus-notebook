"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Calendar, Award, CheckCircle2, Circle, Clock, BarChart3 } from "lucide-react";
import { useTasks } from "@/store/useTasks";
import { useGoals } from "@/store/useGoals";
import { useProjects } from "@/store/useProjects";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

type ProgressPeriod = 'week' | 'month' | 'all-time';

export default function ProgressDashboard() {
  const { user } = useAuth();
  const tasks = useTasks((s) => s.tasks);
  const goals = useGoals((s) => s.goals);
  const projects = useProjects((s) => s.projects);
  const subscribeTasks = useTasks((s) => s.subscribe);
  const subscribeGoals = useGoals((s) => s.subscribe);
  const subscribeProjects = useProjects((s) => s.subscribe);
  const [progressPeriod, setProgressPeriod] = useState<ProgressPeriod>('all-time');

  useEffect(() => {
    if (user?.uid) {
      subscribeTasks(user.uid);
      subscribeGoals(user.uid);
      subscribeProjects(user.uid);
    }
  }, [user?.uid, subscribeTasks, subscribeGoals, subscribeProjects]);

  const progress = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0); // All time by default

    if (progressPeriod === 'week') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (progressPeriod === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Goals Progress
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const totalGoals = goals.length;
    
    const goalsProgress = totalGoals > 0 ? (completedGoals.length / totalGoals) * 100 : 0;

    // Projects Progress
    const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'on-hold');
    const completedProjects = projects.filter(p => p.status === 'completed');
    const totalProjects = projects.length;

    const projectsProgress = totalProjects > 0 ? (completedProjects.length / totalProjects) * 100 : 0;

    // Tasks Progress
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.done).length;
    const activeTasks = tasks.filter(t => !t.done && t.status === 'active').length;

    const tasksProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Filter by date if needed
    const filteredCompletedGoals = completedGoals.filter(g => {
      if (!g.completedAt) return false;
      return new Date(g.completedAt) >= startDate;
    });

    const filteredCompletedProjects = completedProjects.filter(p => {
      if (!p.completedAt) return false;
      return new Date(p.completedAt) >= startDate;
    });

    const filteredCompletedTasks = tasks.filter(t => {
      if (!t.completedAt) return false;
      return new Date(t.completedAt) >= startDate;
    });

    // Calculate time spent on completed items
    const totalTimeSpent = filteredCompletedTasks.reduce((sum, t) => {
      return sum + (t.actualMinutes || t.estimatedMinutes || 0);
    }, 0);

    return {
      goals: {
        total: totalGoals,
        active: activeGoals.length,
        completed: completedGoals.length,
        progress: goalsProgress,
        recentCompleted: filteredCompletedGoals.length,
      },
      projects: {
        total: totalProjects,
        active: activeProjects.length,
        completed: completedProjects.length,
        progress: projectsProgress,
        recentCompleted: filteredCompletedProjects.length,
      },
      tasks: {
        total: totalTasks,
        active: activeTasks.length,
        completed: completedTasks.length,
        progress: tasksProgress,
        recentCompleted: filteredCompletedTasks.length,
        timeSpent: totalTimeSpent,
      },
      milestones: {
        goalsCompleted: filteredCompletedGoals.length,
        projectsCompleted: filteredCompletedProjects.length,
        tasksCompleted: filteredCompletedTasks.length,
      },
    };
  }, [goals, projects, tasks, progressPeriod]);

  return (
    <div className="container mx-auto py-6 md:py-8 px-4 md:px-0 max-w-7xl">
      {/* Period Selector */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-4 mb-6">
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-md">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Period:</span>
          {(['week', 'month', 'all-time'] as ProgressPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setProgressPeriod(period)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                progressPeriod === period
                  ? 'bg-green-600 text-white shadow-lg scale-105'
                  : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            icon={<Target className="h-8 w-8" />}
            title="Goals"
            value={progress.goals.completed}
            subtitle={`${progress.goals.total} total`}
            progress={progress.goals.progress}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatsCard
            icon={<BarChart3 className="h-8 w-8" />}
            title="Projects"
            value={progress.projects.completed}
            subtitle={`${progress.projects.total} total`}
            progress={progress.projects.progress}
            gradient="from-purple-500 to-pink-500"
          />
          <StatsCard
            icon={<CheckCircle2 className="h-8 w-8" />}
            title="Tasks"
            value={progress.tasks.completed}
            subtitle={`${progress.tasks.total} total`}
            progress={progress.tasks.progress}
            gradient="from-green-500 to-emerald-500"
          />
        </div>

        {/* Main Progress Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Goals Progress */}
          <Card className="border-4 border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 border-b-4 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    Goals Progress
                  </CardTitle>
                  <CardDescription className="text-sm font-medium">
                    Active: {progress.goals.active} • Completed: {progress.goals.completed}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ProgressBar
                value={progress.goals.progress}
                color="from-blue-500 to-cyan-500"
                label={`${progress.goals.progress.toFixed(1)}% Complete`}
              />
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{progress.goals.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Active</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{progress.goals.active}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects Progress */}
          <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950">
            <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border-b-4 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-md">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    Projects Progress
                  </CardTitle>
                  <CardDescription className="text-sm font-medium">
                    Active: {progress.projects.active} • Completed: {progress.projects.completed}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ProgressBar
                value={progress.projects.progress}
                color="from-purple-500 to-pink-500"
                label={`${progress.projects.progress.toFixed(1)}% Complete`}
              />
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{progress.projects.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Active</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{progress.projects.active}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Progress */}
        <Card className="border-4 border-green-200 shadow-xl bg-gradient-to-br from-white to-green-50 dark:from-gray-900 dark:to-green-950">
          <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 border-b-4 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-md">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-green-700 dark:text-green-300">
                  Tasks Progress
                </CardTitle>
                <CardDescription className="text-sm font-medium">
                  Active: {progress.tasks.active} • Completed: {progress.tasks.completed}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ProgressBar
              value={progress.tasks.progress}
              color="from-green-500 to-emerald-500"
              label={`${progress.tasks.progress.toFixed(1)}% Complete`}
            />
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{progress.tasks.completed}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{progress.tasks.active}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time Spent</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(progress.tasks.timeSpent / 60)}h
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Milestones */}
        <Card className="border-4 border-yellow-200 shadow-xl bg-gradient-to-br from-white to-yellow-50 dark:from-gray-900 dark:to-yellow-950">
          <CardHeader className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 border-b-4 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-md">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                  Recent Achievements
                </CardTitle>
                <CardDescription className="text-sm font-medium">
                  What you&apos;ve accomplished {progressPeriod === 'week' ? 'this week' : progressPeriod === 'month' ? 'this month' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <MilestoneCard
                icon={<Target className="h-6 w-6" />}
                value={progress.milestones.goalsCompleted}
                label="Goals Completed"
                color="from-blue-500 to-cyan-500"
              />
              <MilestoneCard
                icon={<BarChart3 className="h-6 w-6" />}
                value={progress.milestones.projectsCompleted}
                label="Projects Completed"
                color="from-purple-500 to-pink-500"
              />
              <MilestoneCard
                icon={<CheckCircle2 className="h-6 w-6" />}
                value={progress.milestones.tasksCompleted}
                label="Tasks Completed"
                color="from-green-500 to-emerald-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ icon, title, value, subtitle, progress, gradient }: {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
  progress: number;
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
      <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${gradient}`}
        />
      </div>
    </motion.div>
  );
}

function ProgressBar({ value, color, label }: {
  value: number;
  color: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">100%</span>
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${color}`}
        />
      </div>
    </div>
  );
}

function MilestoneCard({ icon, value, label, color }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${color} text-white mb-3 shadow-lg`}>
        {icon}
      </div>
      <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </motion.div>
  );
}

