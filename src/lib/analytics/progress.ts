import type { Task } from "@/store/useTasks";
import type { Goal } from "@/store/useGoals";
import type { Project } from "@/store/useProjects";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  filterByDateRange,
  startOfMonth,
  startOfWeek,
  startOfDay,
  sum,
  type DateRange,
} from "./utils";

export type ProgressPeriod = "week" | "month" | "all-time";

interface ProgressInput {
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  period: ProgressPeriod;
  referenceDate?: Date;
}

export interface ProgressAnalytics {
  goals: {
    total: number;
    active: number;
    completed: number;
    progress: number;
    recentCompleted: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    progress: number;
    recentCompleted: number;
  };
  tasks: {
    total: number;
    active: number;
    completed: number;
    progress: number;
    recentCompleted: number;
    timeSpent: number;
  };
  milestones: {
    goalsCompleted: number;
    projectsCompleted: number;
    tasksCompleted: number;
  };
  period: ProgressPeriod;
  range: DateRange;
}

export function computeProgressAnalytics({
  tasks,
  goals,
  projects,
  period,
  referenceDate = new Date(),
}: ProgressInput): ProgressAnalytics {
  const range = resolveProgressRange(period, referenceDate);

  const goalStats = buildGoalStats(goals, range);
  const projectStats = buildProjectStats(projects, range);
  const taskStats = buildTaskStats(tasks, range);

  return {
    goals: goalStats,
    projects: projectStats,
    tasks: taskStats,
    milestones: {
      goalsCompleted: goalStats.recentCompleted,
      projectsCompleted: projectStats.recentCompleted,
      tasksCompleted: taskStats.recentCompleted,
    },
    period,
    range,
  };
}

function resolveProgressRange(period: ProgressPeriod, referenceDate: Date): DateRange {
  const now = new Date(referenceDate);

  if (period === "week") {
    return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
  }

  if (period === "month") {
    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }

  return { startDate: startOfDay(new Date(0)), endDate: endOfDay(now) };
}

function buildGoalStats(goals: Goal[], range: DateRange) {
  const total = goals.length;
  const active = goals.filter((goal) => goal.status === "active").length;
  const completed = goals.filter((goal) => goal.status === "completed").length;
  const recentCompleted = filterByDateRange(
    goals,
    range,
    (goal) => goal.completedAt
  ).length;

  return {
    total,
    active,
    completed,
    progress: percentage(completed, total),
    recentCompleted,
  };
}

function buildProjectStats(projects: Project[], range: DateRange) {
  const total = projects.length;
  const active = projects.filter(
    (project) => project.status === "active" || project.status === "on-hold"
  ).length;
  const completed = projects.filter((project) => project.status === "completed").length;
  const recentCompleted = filterByDateRange(
    projects,
    range,
    (project) => project.completedAt
  ).length;

  return {
    total,
    active,
    completed,
    progress: percentage(completed, total),
    recentCompleted,
  };
}

function buildTaskStats(tasks: Task[], range: DateRange) {
  const total = tasks.length;
  const completedTasks = tasks.filter((task) => task.done);
  const active = tasks.filter((task) => !task.done && task.status === "active").length;
  const recentCompleted = filterByDateRange(
    completedTasks,
    range,
    (task) => task.completedAt
  );

  const timeSpent = sum(
    recentCompleted.map(
      (task) => task.actualMinutes ?? task.estimatedMinutes ?? 0
    )
  );

  return {
    total,
    active,
    completed: completedTasks.length,
    progress: percentage(completedTasks.length, total),
    recentCompleted: recentCompleted.length,
    timeSpent,
  };
}

function percentage(part: number, whole: number): number {
  if (whole === 0) {
    return 0;
  }

  return (part / whole) * 100;
}
