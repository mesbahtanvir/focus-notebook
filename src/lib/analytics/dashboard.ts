import { getTimeOfDayCategory } from "@/lib/formatDateTime";
import type { Task } from "@/store/useTasks";
import type { FocusSession } from "@/store/useFocus";
import type { Goal } from "@/store/useGoals";
import type { Project } from "@/store/useProjects";
import {
  buildDateOffsets,
  DAY_IN_MS,
  endOfDay,
  endOfMonth,
  endOfWeek,
  filterByDateRange,
  groupByDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
  sum,
  type DateRange,
} from "./utils";

export type SummaryPeriod = "today" | "week" | "month";

const TIME_OF_DAY_KEYS = ["morning", "afternoon", "evening", "night"] as const;

type TimeOfDayKey = (typeof TIME_OF_DAY_KEYS)[number];

export interface TimeOfDayStats {
  sessions: number;
  totalTime: number;
  completedTasks: number;
  avgCompletion: number;
}

export type TimeOfDayData = Record<TimeOfDayKey, TimeOfDayStats>;

export interface DashboardAnalytics {
  focusData: { date: Date; minutes: number }[];
  taskData: { date: Date; total: number; mastery: number; pleasure: number }[];
  categoryData: { date: Date; mastery: number; pleasure: number }[];
  timeOfDayData: TimeOfDayData;
  stats: {
    totalFocusTime: number;
    totalSessions: number;
    completedTasks: number;
    masteryTasks: number;
    pleasureTasks: number;
    currentStreak: number;
    completionRate: number;
  };
  comparison: {
    focusTime: number | null;
    tasks: number | null;
  } | null;
  goals: {
    total: number;
    active: number;
    completed: number;
    progress: number;
    topGoal: Goal | null;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    progress: number;
  };
  period: SummaryPeriod;
  days: number;
}

interface AnalyticsInput {
  tasks: Task[];
  sessions: FocusSession[];
  goals: Goal[];
  projects: Project[];
  period: SummaryPeriod;
  referenceDate?: Date;
}

export function computeDashboardAnalytics({
  tasks,
  sessions,
  goals,
  projects,
  period,
  referenceDate = new Date(),
}: AnalyticsInput): DashboardAnalytics {
  const range = resolveSummaryRange(period, referenceDate);
  const dateOffsets = buildDateOffsets(range.startDate, range.days);

  const completedTasks = filterByDateRange(tasks, range, (task) => task.completedAt);
  const sessionsInRange = filterByDateRange(
    sessions,
    range,
    (session) => session.startTime
  );

  const tasksByDate = groupByDate(completedTasks, (task) => task.completedAt!);
  const sessionsByDate = groupByDate(sessionsInRange, (session) => session.startTime);

  const focusData = dateOffsets.map((date) => {
    const daySessions = sessionsByDate.get(date.toDateString()) ?? [];
    const totalMinutes = sum(daySessions.map((session) => sumSessionTime(session) / 60));

    return { date, minutes: totalMinutes };
  });

  const taskData = dateOffsets.map((date) => {
    const dayTasks = tasksByDate.get(date.toDateString()) ?? [];
    const categories = countTasksByCategory(dayTasks);
    return {
      date,
      total: dayTasks.length,
      mastery: categories.mastery,
      pleasure: categories.pleasure
    };
  });

  const categoryData = dateOffsets.map((date) => {
    const dayTasks = tasksByDate.get(date.toDateString()) ?? [];
    const categories = countTasksByCategory(dayTasks);

    return { date, mastery: categories.mastery, pleasure: categories.pleasure };
  });

  const totalFocusSeconds = sum(sessionsInRange.map((session) => sumSessionTime(session)));
  const categoryTotals = countTasksByCategory(completedTasks);
  const timeOfDayData = buildTimeOfDayData(sessionsInRange);

  // Calculate streak (consecutive days with at least 1 focus session)
  const currentStreak = calculateStreak(sessions, referenceDate);

  // Calculate completion rate for the selected period
  // Get all tasks that were due or completed in this period
  const tasksInPeriod = tasks.filter(task => {
    // Include tasks completed in this period
    if (task.completedAt) {
      const completedDate = new Date(task.completedAt);
      if (completedDate >= range.startDate && completedDate <= range.endDate) {
        return true;
      }
    }
    // Include tasks that were due in this period (whether completed or not)
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      if (dueDate >= range.startDate && dueDate <= range.endDate) {
        return true;
      }
    }
    return false;
  });

  const completedInPeriod = tasksInPeriod.filter(task => task.done).length;
  const completionRate = tasksInPeriod.length > 0 ? (completedInPeriod / tasksInPeriod.length) * 100 : 0;

  // Calculate comparison with previous period
  const comparison = calculateComparison(tasks, sessions, period, referenceDate, range);

  // Calculate goal and project stats
  const goalStats = calculateGoalStats(goals);
  const projectStats = calculateProjectStats(projects);

  return {
    focusData,
    taskData,
    categoryData,
    timeOfDayData,
    stats: {
      totalFocusTime: Math.round(totalFocusSeconds / 60),
      totalSessions: sessionsInRange.length,
      completedTasks: completedTasks.length,
      masteryTasks: categoryTotals.mastery,
      pleasureTasks: categoryTotals.pleasure,
      currentStreak,
      completionRate,
    },
    comparison,
    goals: goalStats,
    projects: projectStats,
    period,
    days: range.days,
  };
}

function resolveSummaryRange(period: SummaryPeriod, referenceDate: Date): DateRange & {
  days: number;
} {
  const now = new Date(referenceDate);

  if (period === "today") {
    const startDate = startOfDay(now);
    return { startDate, endDate: endOfDay(now), days: 1 };
  }

  if (period === "week") {
    const startDate = startOfWeek(now);
    return { startDate, endDate: endOfWeek(now), days: 7 };
  }

  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / DAY_IN_MS) + 1;

  return { startDate, endDate, days };
}

function sumSessionTime(session: FocusSession): number {
  return (session.tasks ?? []).reduce(
    (taskSum, task) => taskSum + (task.timeSpent ?? 0),
    0
  );
}

function countTasksByCategory(tasks: Task[]): { mastery: number; pleasure: number } {
  return tasks.reduce(
    (totals, task) => {
      // Default to 'mastery' if category is undefined
      const category = task.category || "mastery";
      if (category === "mastery") {
        totals.mastery += 1;
      } else if (category === "pleasure") {
        totals.pleasure += 1;
      }
      return totals;
    },
    { mastery: 0, pleasure: 0 }
  );
}

function buildTimeOfDayData(sessions: FocusSession[]): TimeOfDayData {
  const base: Record<TimeOfDayKey, TimeOfDayStats> = TIME_OF_DAY_KEYS.reduce(
    (acc, key) => {
      acc[key] = { sessions: 0, totalTime: 0, completedTasks: 0, avgCompletion: 0 };
      return acc;
    },
    {} as Record<TimeOfDayKey, TimeOfDayStats>
  );

  const totalTasksByPeriod: Record<TimeOfDayKey, number> = TIME_OF_DAY_KEYS.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<TimeOfDayKey, number>
  );

  sessions.forEach((session) => {
    const period = getTimeOfDayCategory(session.startTime) as TimeOfDayKey;
    const tasks = session.tasks ?? [];
    const sessionSeconds = sumSessionTime(session);
    const completed = tasks.filter((task) => task.completed).length;

    base[period].sessions += 1;
    base[period].totalTime += sessionSeconds;
    base[period].completedTasks += completed;
    totalTasksByPeriod[period] += tasks.length;
  });

  TIME_OF_DAY_KEYS.forEach((key) => {
    const totalTasks = totalTasksByPeriod[key];
    const completedTasks = base[key].completedTasks;
    base[key].avgCompletion = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  });

  return base;
}

function calculateStreak(sessions: FocusSession[], referenceDate: Date): number {
  // Calculate consecutive days with at least 1 focus session
  const sessionsByDate = new Map<string, FocusSession[]>();

  sessions.forEach((session) => {
    const sessionDate = new Date(session.startTime);
    const dateStr = startOfDay(sessionDate).toDateString();
    if (!sessionsByDate.has(dateStr)) {
      sessionsByDate.set(dateStr, []);
    }
    sessionsByDate.get(dateStr)!.push(session);
  });

  let streak = 0;
  let currentDate = startOfDay(referenceDate);

  // Count backwards from today
  while (true) {
    const dateStr = currentDate.toDateString();
    if (sessionsByDate.has(dateStr) && sessionsByDate.get(dateStr)!.length > 0) {
      streak++;
      currentDate = new Date(currentDate.getTime() - DAY_IN_MS);
    } else {
      break;
    }
  }

  return streak;
}

function calculateComparison(
  tasks: Task[],
  sessions: FocusSession[],
  period: SummaryPeriod,
  referenceDate: Date,
  currentRange: DateRange
): { focusTime: number | null; tasks: number | null } | null {
  // Helper to calculate percentage change, handling division by zero
  const calcPercentChange = (prev: number, curr: number): number | null => {
    if (prev > 0) {
      return ((curr - prev) / prev) * 100;
    }
    // If prev is 0 and curr > 0, return null to indicate "new activity"
    // If both are 0, return 0 to indicate "no change"
    return curr > 0 ? null : 0;
  };

  if (period === "today") {
    // Compare with yesterday
    const previousRange = {
      startDate: new Date(currentRange.startDate.getTime() - DAY_IN_MS),
      endDate: new Date(currentRange.endDate.getTime() - DAY_IN_MS)
    };

    const prevTasks = filterByDateRange(tasks, previousRange, (task) => task.completedAt);
    const prevSessions = filterByDateRange(sessions, previousRange, (session) => session.startTime);

    const prevFocusTime = Math.round(sum(prevSessions.map((s) => sumSessionTime(s))) / 60);
    const currFocusTime = Math.round(sum(
      filterByDateRange(sessions, currentRange, (s) => s.startTime).map((s) => sumSessionTime(s))
    ) / 60);

    const prevTaskCount = prevTasks.length;
    const currTaskCount = filterByDateRange(tasks, currentRange, (task) => task.completedAt).length;

    return {
      focusTime: calcPercentChange(prevFocusTime, currFocusTime),
      tasks: calcPercentChange(prevTaskCount, currTaskCount)
    };
  }

  if (period === "week") {
    // Compare with last week
    const previousRange = {
      startDate: new Date(currentRange.startDate.getTime() - (7 * DAY_IN_MS)),
      endDate: new Date(currentRange.endDate.getTime() - (7 * DAY_IN_MS))
    };

    const prevTasks = filterByDateRange(tasks, previousRange, (task) => task.completedAt);
    const prevSessions = filterByDateRange(sessions, previousRange, (session) => session.startTime);

    const prevFocusTime = Math.round(sum(prevSessions.map((s) => sumSessionTime(s))) / 60);
    const currFocusTime = Math.round(sum(
      filterByDateRange(sessions, currentRange, (s) => s.startTime).map((s) => sumSessionTime(s))
    ) / 60);

    const prevTaskCount = prevTasks.length;
    const currTaskCount = filterByDateRange(tasks, currentRange, (task) => task.completedAt).length;

    return {
      focusTime: calcPercentChange(prevFocusTime, currFocusTime),
      tasks: calcPercentChange(prevTaskCount, currTaskCount)
    };
  }

  if (period === "month") {
    // Compare with last month
    const refDate = new Date(referenceDate);
    const lastMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
    const previousRange = {
      startDate: startOfMonth(lastMonth),
      endDate: endOfMonth(lastMonth)
    };

    const prevTasks = filterByDateRange(tasks, previousRange, (task) => task.completedAt);
    const prevSessions = filterByDateRange(sessions, previousRange, (session) => session.startTime);

    const prevFocusTime = Math.round(sum(prevSessions.map((s) => sumSessionTime(s))) / 60);
    const currFocusTime = Math.round(sum(
      filterByDateRange(sessions, currentRange, (s) => s.startTime).map((s) => sumSessionTime(s))
    ) / 60);

    const prevTaskCount = prevTasks.length;
    const currTaskCount = filterByDateRange(tasks, currentRange, (task) => task.completedAt).length;

    return {
      focusTime: calcPercentChange(prevFocusTime, currFocusTime),
      tasks: calcPercentChange(prevTaskCount, currTaskCount)
    };
  }

  return null;
}

function calculateGoalStats(goals: Goal[]): {
  total: number;
  active: number;
  completed: number;
  progress: number;
  topGoal: Goal | null;
} {
  const total = goals.length;
  const activeGoals = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed").length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  // Select top goal based on priority and recency
  // Priority order: urgent > high > medium > low
  const priorityWeight: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  const sortedActiveGoals = [...activeGoals].sort((a, b) => {
    // First, sort by priority
    const aPriority = priorityWeight[a.priority] || 0;
    const bPriority = priorityWeight[b.priority] || 0;
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    // If same priority, prefer higher progress
    const aProgress = a.progress || 0;
    const bProgress = b.progress || 0;
    if (aProgress !== bProgress) {
      return bProgress - aProgress; // Higher progress first
    }

    // If same progress, sort by most recent update
    const aTime = a.updatedAt || new Date(a.createdAt).getTime();
    const bTime = b.updatedAt || new Date(b.createdAt).getTime();
    return bTime - aTime; // Most recent first
  });

  const topGoal = sortedActiveGoals.length > 0 ? sortedActiveGoals[0] : null;

  return {
    total,
    active: activeGoals.length,
    completed,
    progress,
    topGoal
  };
}

function calculateProjectStats(projects: Project[]): {
  total: number;
  active: number;
  completed: number;
  progress: number;
} {
  const total = projects.length;
  const active = projects.filter(
    (p) => p.status === "active" || p.status === "on-hold"
  ).length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    active,
    completed,
    progress
  };
}
