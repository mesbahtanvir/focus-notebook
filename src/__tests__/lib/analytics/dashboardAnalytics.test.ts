import { computeDashboardAnalytics } from "@/lib/analytics/dashboard";
import type { Task } from "@/store/useTasks";
import type { FocusSession } from "@/store/useFocus";
import type { Goal } from "@/store/useGoals";
import type { Project } from "@/store/useProjects";

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

function createGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: overrides.id ?? `goal-${Math.random()}`,
    title: overrides.title ?? "Goal",
    status: overrides.status ?? "active",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  } as Goal;
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? `project-${Math.random()}`,
    title: overrides.title ?? "Project",
    objective: overrides.objective ?? "Project objective",
    actionPlan: overrides.actionPlan ?? [],
    timeframe: overrides.timeframe ?? "short-term",
    status: overrides.status ?? "active",
    priority: overrides.priority ?? "medium",
    category: overrides.category ?? "mastery",
    linkedThoughtIds: overrides.linkedThoughtIds ?? [],
    linkedTaskIds: overrides.linkedTaskIds ?? [],
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  } as Project;
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

    const goals: Goal[] = [
      createGoal({ id: "goal-1", status: "active" }),
      createGoal({ id: "goal-2", status: "completed" }),
    ];

    const projects: Project[] = [
      createProject({ id: "project-1", status: "active" }),
      createProject({ id: "project-2", status: "completed" }),
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
      sessions,
      goals,
      projects,
      period: "week",
      referenceDate,
    });

    expect(analytics.stats.completedTasks).toBe(1);
    expect(analytics.stats.totalFocusTime).toBe(45);
    expect(analytics.stats.masteryTasks).toBe(1);
    expect(analytics.stats.pleasureTasks).toBe(0);
    expect(analytics.focusData).toHaveLength(7);
    expect(analytics.focusData[6].minutes).toBeCloseTo(45);
    expect(analytics.timeOfDayData.morning.sessions).toBe(1);
    expect(analytics.timeOfDayData.night.sessions).toBe(1);
    expect(analytics.goals.total).toBe(2);
    expect(analytics.goals.active).toBe(1);
    expect(analytics.goals.completed).toBe(1);
    expect(analytics.projects.total).toBe(2);
    expect(analytics.projects.active).toBe(1);
    expect(analytics.projects.completed).toBe(1);
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
      sessions: [],
      goals: [],
      projects: [],
      period: "month",
      referenceDate,
    });

    expect(analytics.days).toBeGreaterThanOrEqual(30);
    expect(analytics.stats.completedTasks).toBe(2);
    expect(analytics.stats.masteryTasks).toBe(1);
    expect(analytics.stats.pleasureTasks).toBe(1);
  });
});
