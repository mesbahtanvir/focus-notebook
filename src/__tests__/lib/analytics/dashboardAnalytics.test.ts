import { computeDashboardAnalytics } from "@/lib/analytics/dashboard";
import type { Task } from "@/store/useTasks";
import type { MoodEntry } from "@/store/useMoods";
import type { FocusSession } from "@/store/useFocus";

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? `task-${Math.random()}`,
    title: overrides.title ?? "Task",
    done: overrides.done ?? true,
    status: overrides.status ?? "completed",
    priority: overrides.priority ?? "medium",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    completedAt: overrides.completedAt,
    category: overrides.category,
    estimatedMinutes: overrides.estimatedMinutes,
    actualMinutes: overrides.actualMinutes,
    ...overrides,
  } as Task;
}

function createMood(overrides: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: overrides.id ?? `mood-${Math.random()}`,
    value: overrides.value ?? 5,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  } as MoodEntry;
}

function createSession(overrides: Partial<FocusSession> = {}): FocusSession {
  const baseTask = createTask({ id: "session-task", done: true });

  return {
    id: overrides.id ?? `session-${Math.random()}`,
    duration: overrides.duration ?? 60,
    tasks:
      overrides.tasks ??
      [
        {
          task: baseTask,
          timeSpent: 1800,
          completed: true,
        },
      ],
    startTime: overrides.startTime ?? new Date().toISOString(),
    endTime: overrides.endTime,
    currentTaskIndex: overrides.currentTaskIndex ?? 0,
    isActive: overrides.isActive ?? false,
    isOnBreak: overrides.isOnBreak ?? false,
    breaks: overrides.breaks ?? [],
    ...overrides,
  } as FocusSession;
}

describe("computeDashboardAnalytics", () => {
  const referenceDate = new Date("2024-06-15T12:00:00.000Z");

  it("aggregates data within the requested date range", () => {
    const tasks: Task[] = [
      createTask({
        id: "recent-task",
        completedAt: "2024-06-14T10:00:00.000Z",
        category: "mastery",
        estimatedMinutes: 30,
      }),
      createTask({
        id: "older-task",
        completedAt: "2024-05-01T10:00:00.000Z",
        category: "pleasure",
        estimatedMinutes: 45,
      }),
    ];

    const moods: MoodEntry[] = [
      createMood({ id: "recent-mood", createdAt: "2024-06-13T15:00:00.000Z", value: 8 }),
      createMood({ id: "older-mood", createdAt: "2024-04-10T12:00:00.000Z", value: 3 }),
    ];

    const sessions: FocusSession[] = [
      createSession({
        id: "morning-session",
        startTime: "2024-06-15T09:00:00.000Z",
        tasks: [
          {
            task: createTask({ id: "s-task-1" }),
            timeSpent: 1800,
            completed: true,
          },
        ],
      }),
      createSession({
        id: "night-session",
        startTime: "2024-06-15T22:00:00.000Z",
        tasks: [
          {
            task: createTask({ id: "s-task-2" }),
            timeSpent: 900,
            completed: false,
          },
        ],
      }),
    ];

    const analytics = computeDashboardAnalytics({
      tasks,
      moods,
      sessions,
      period: "week",
      referenceDate,
    });

    expect(analytics.stats.completedTasks).toBe(1);
    expect(analytics.stats.totalFocusTime).toBe(45);
    expect(analytics.summary.mastery).toBe(1);
    expect(analytics.summary.pleasure).toBe(0);
    expect(analytics.moodData).toHaveLength(7);
    expect(analytics.moodData.filter((point) => point.value !== null)).toHaveLength(1);
    expect(analytics.focusData[6].minutes).toBeCloseTo(45);
    expect(analytics.timeOfDayData.morning.sessions).toBe(1);
    expect(analytics.timeOfDayData.night.sessions).toBe(1);
  });

  it("returns month length and aggregates categories across the range", () => {
    const tasks: Task[] = [
      createTask({
        id: "mastery-task",
        completedAt: "2024-06-01T10:00:00.000Z",
        category: "mastery",
      }),
      createTask({
        id: "pleasure-task",
        completedAt: "2024-06-02T10:00:00.000Z",
        category: "pleasure",
      }),
    ];

    const analytics = computeDashboardAnalytics({
      tasks,
      moods: [],
      sessions: [],
      period: "month",
      referenceDate,
    });

    expect(analytics.days).toBeGreaterThanOrEqual(30);
    expect(analytics.summary.tasksCompleted).toBe(2);
    expect(analytics.summary.mastery).toBe(1);
    expect(analytics.summary.pleasure).toBe(1);
  });
});
