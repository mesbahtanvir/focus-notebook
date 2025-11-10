"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/store/useTasks";
import { useProjects } from "@/store/useProjects";
import { useGoals } from "@/store/useGoals";
import { useFocus } from "@/store/useFocus";
import { ToolHeader, ToolPageLayout, ToolGroupNav } from "@/components/tools";
import { toolThemes } from "@/components/tools/themes";
import { CheckSquare, Target, Folder, Clock, Plus, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

export default function WorkGoalsPage() {
  const { user } = useAuth();
  const tasks = useTasks((s) => s.tasks);
  const projects = useProjects((s) => s.projects);
  const goals = useGoals((s) => s.goals);
  const focusSessions = useFocus((s) => s.sessions);

  const { subscribe: subscribeTasks } = useTasks();
  const { subscribe: subscribeProjects } = useProjects();
  const { subscribe: subscribeGoals } = useGoals();
  const { subscribe: subscribeFocus } = useFocus();

  useEffect(() => {
    if (user?.uid) {
      subscribeTasks(user.uid);
      subscribeProjects(user.uid);
      subscribeGoals(user.uid);
      subscribeFocus(user.uid);
    }
  }, [user?.uid, subscribeTasks, subscribeProjects, subscribeGoals, subscribeFocus]);

  const stats = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status === "active").length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const recentFocus = focusSessions.filter((s) => {
      const sessionDate = new Date(s.startTime);
      const today = new Date();
      return sessionDate.toDateString() === today.toDateString();
    }).length;

    return { activeTasks, activeProjects, activeGoals, recentFocus };
  }, [tasks, projects, goals, focusSessions]);

  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === "active")
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
      .slice(0, 5);
  }, [tasks]);

  const dailyStaples = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          task.status === "active" &&
          task.recurrence?.type === "daily"
      )
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
      .slice(0, 4);
  }, [tasks]);

  const activeProjectsList = useMemo(() => {
    return projects.filter((p) => p.status === "active").slice(0, 3);
  }, [projects]);

  const theme = toolThemes.purple;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Productivity"
        emoji="🎯"
        showBackButton
        stats={[
          { label: "tasks", value: stats.activeTasks, variant: "info" },
          { label: "projects", value: stats.activeProjects, variant: "default" },
          { label: "goals", value: stats.activeGoals, variant: "success" },
        ]}
        theme={theme}
      />

      <ToolGroupNav currentToolId="productivity" />

      {/* Quick Actions */}
      <div className="card p-3 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          <Link
            href="/tools/tasks"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 transition-all"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            <div>
              <div className="font-semibold text-sm sm:text-base">Add Task</div>
              <div className="text-xs text-gray-500">Quick capture</div>
            </div>
          </Link>

          <Link
            href="/tools/focus"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 transition-all"
          >
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
            <div>
              <div className="font-semibold text-sm sm:text-base">Start Focus</div>
              <div className="text-xs text-gray-500">Deep work session</div>
            </div>
          </Link>

          <Link
            href="/tools/notes"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <div>
              <div className="font-semibold text-sm sm:text-base">New Note</div>
              <div className="text-xs text-gray-500">Capture knowledge</div>
            </div>
          </Link>
      </div>
    </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Link
          href="/tools/tasks"
          className="card p-3 sm:p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <CheckSquare className="h-5 w-5 sm:h-8 sm:w-8 text-green-500" />
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          </div>
          <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.activeTasks}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Tasks</div>
        </Link>

        <Link
          href="/tools/projects"
          className="card p-3 sm:p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <Folder className="h-5 w-5 sm:h-8 sm:w-8 text-blue-500" />
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          </div>
          <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.activeProjects}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Projects</div>
        </Link>

        <Link
          href="/tools/goals"
          className="card p-3 sm:p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <Target className="h-5 w-5 sm:h-8 sm:w-8 text-purple-500" />
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          </div>
          <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.activeGoals}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Goals</div>
        </Link>

        <Link
          href="/tools/focus"
          className="card p-3 sm:p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <Clock className="h-5 w-5 sm:h-8 sm:w-8 text-orange-500" />
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          </div>
          <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.recentFocus}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Focus Today</div>
        </Link>
      </div>

      {dailyStaples.length > 0 && (
        <div className="card p-3 sm:p-5 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-bold">🔁 Daily Staples</h3>
            <Link href="/tools/tasks" className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:underline">
              Manage Tasks →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dailyStaples.map((task) => (
              <Link
                key={task.id}
                href={`/tools/tasks?id=${task.id}`}
                className="flex flex-col gap-1 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{task.title}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold">
                    Daily
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 capitalize">
                    {task.priority}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Today's Priorities */}
      <div className="card p-3 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold">📋 Today&apos;s Priorities</h3>
          <Link href="/tools/tasks" className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:underline">
            View All →
          </Link>
        </div>
        {todayTasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No active tasks. You&apos;re all caught up! 🎉</p>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tools/tasks?id=${task.id}`}
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <div
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    task.priority === "urgent"
                      ? "bg-red-500"
                      : task.priority === "high"
                      ? "bg-orange-500"
                      : task.priority === "medium"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs sm:text-sm truncate">{task.title}</div>
                  {task.dueDate && (
                    <div className="text-xs text-gray-500">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Active Projects */}
      <div className="card p-3 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold">📊 Active Projects</h3>
          <Link href="/tools/projects" className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:underline">
            View All →
          </Link>
        </div>
        {activeProjectsList.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No active projects. Start something new!</p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {activeProjectsList.map((project) => (
              <Link
                key={project.id}
                href={`/tools/projects/${project.id}`}
                className="block p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="font-semibold text-sm sm:text-base">{project.title}</div>
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                </div>
                {project.description && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">{project.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{project.status}</span>
                  {project.targetDate && (
                    <>
                      <span>•</span>
                      <span>Due: {new Date(project.targetDate).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
