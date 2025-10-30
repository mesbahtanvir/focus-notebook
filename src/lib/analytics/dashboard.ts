import { getTimeOfDayCategory } from "@/lib/formatDateTime";
import type { Task } from "@/store/useTasks";
import type { MoodEntry } from "@/store/useMoods";
import type { FocusSession } from "@/store/useFocus";
import {
  average,
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
  moodData: { date: Date; value: number | null }[];
  focusData: { date: Date; minutes: number }[];
  taskData: { date: Date; total: number }[];
  categoryData: { date: Date; mastery: number; pleasure: number }[];
  timeOfDayData: TimeOfDayData;
  stats: {
    totalFocusTime: number;
    totalSessions: number;
    completedTasks: number;
    avgMood: number;
    totalTaskTime: number;
  };
  summary: {
    tasksCompleted: number;
    mastery: number;
    pleasure: number;
    avgMood: number;
    focusTime: number;
  };
  period: SummaryPeriod;
  days: number;
}

interface AnalyticsInput {
  tasks: Task[];
  moods: MoodEntry[];
  sessions: FocusSession[];
  period: SummaryPeriod;
  referenceDate?: Date;
}

export function computeDashboardAnalytics({
  tasks,
  moods,
  sessions,
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
  const moodsInRange = filterByDateRange(moods, range, (mood) => mood.createdAt);

  const tasksByDate = groupByDate(completedTasks, (task) => task.completedAt!);
  const sessionsByDate = groupByDate(sessionsInRange, (session) => session.startTime);
  const moodsByDate = groupByDate(moodsInRange, (mood) => mood.createdAt);

  const moodData = dateOffsets.map((date) => {
    const entries = moodsByDate.get(date.toDateString()) ?? [];
    if (entries.length === 0) {
      return { date, value: null as number | null };
    }

    return { date, value: average(entries.map((entry) => entry.value)) };
  });

  const focusData = dateOffsets.map((date) => {
    const daySessions = sessionsByDate.get(date.toDateString()) ?? [];
    const totalMinutes = sum(daySessions.map((session) => sumSessionTime(session) / 60));

    return { date, minutes: totalMinutes };
  });

  const taskData = dateOffsets.map((date) => {
    const dayTasks = tasksByDate.get(date.toDateString()) ?? [];
    return { date, total: dayTasks.length };
  });

  const categoryData = dateOffsets.map((date) => {
    const dayTasks = tasksByDate.get(date.toDateString()) ?? [];
    const categories = countTasksByCategory(dayTasks);

    return { date, mastery: categories.mastery, pleasure: categories.pleasure };
  });

  const totalFocusSeconds = sum(sessionsInRange.map((session) => sumSessionTime(session)));
  const totalTaskTime = sum(completedTasks.map((task) => task.estimatedMinutes ?? 0));
  const averageMood = average(moodsInRange.map((mood) => mood.value));
  const categoryTotals = countTasksByCategory(completedTasks);
  const timeOfDayData = buildTimeOfDayData(sessionsInRange);

  return {
    moodData,
    focusData,
    taskData,
    categoryData,
    timeOfDayData,
    stats: {
      totalFocusTime: Math.round(totalFocusSeconds / 60),
      totalSessions: sessionsInRange.length,
      completedTasks: completedTasks.length,
      avgMood: averageMood,
      totalTaskTime,
    },
    summary: {
      tasksCompleted: completedTasks.length,
      mastery: categoryTotals.mastery,
      pleasure: categoryTotals.pleasure,
      avgMood: averageMood,
      focusTime: Math.round(totalFocusSeconds / 60),
    },
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
      if (task.category === "mastery") {
        totals.mastery += 1;
      } else if (task.category === "pleasure") {
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
