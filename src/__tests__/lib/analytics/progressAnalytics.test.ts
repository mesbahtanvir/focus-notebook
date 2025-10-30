import { computeProgressAnalytics } from "@/lib/analytics/progress";
import type { Task } from "@/store/useTasks";
import type { Goal } from "@/store/useGoals";
import type { Project } from "@/store/useProjects";

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? `task-${Math.random()}`,
    title: overrides.title ?? "Task",
    done: overrides.done ?? false,
    status: overrides.status ?? "active",
    priority: overrides.priority ?? "medium",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    completedAt: overrides.completedAt,
    estimatedMinutes: overrides.estimatedMinutes,
    actualMinutes: overrides.actualMinutes,
    ...overrides,
  } as Task;
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: overrides.id ?? `goal-${Math.random()}`,
    title: overrides.title ?? "Goal",
    objective: overrides.objective ?? "Objective",
    timeframe: overrides.timeframe ?? "short-term",
    status: overrides.status ?? "active",
    priority: overrides.priority ?? "medium",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    completedAt: overrides.completedAt,
    ...overrides,
  } as Goal;
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? `project-${Math.random()}`,
    title: overrides.title ?? "Project",
    objective: overrides.objective ?? "Objective",
    actionPlan: overrides.actionPlan ?? [],
    timeframe: overrides.timeframe ?? "short-term",
    status: overrides.status ?? "active",
    priority: overrides.priority ?? "medium",
    category: overrides.category ?? "mastery",
    linkedThoughtIds: overrides.linkedThoughtIds ?? [],
    linkedTaskIds: overrides.linkedTaskIds ?? [],
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    completedAt: overrides.completedAt,
    ...overrides,
  } as Project;
}

describe("computeProgressAnalytics", () => {
  const referenceDate = new Date("2024-06-15T12:00:00.000Z");

  it("derives weekly stats and recent completion counts", () => {
    const tasks: Task[] = [
      createTask({
        id: "recent-task",
        done: true,
        status: "completed",
        completedAt: "2024-06-13T10:00:00.000Z",
        actualMinutes: 40,
      }),
      createTask({
        id: "old-task",
        done: true,
        status: "completed",
        completedAt: "2024-05-10T10:00:00.000Z",
        estimatedMinutes: 20,
      }),
      createTask({ id: "active-task", done: false, status: "active" }),
    ];

    const goals: Goal[] = [
      createGoal({ id: "active-goal", status: "active" }),
      createGoal({
        id: "recent-goal",
        status: "completed",
        completedAt: "2024-06-12T12:00:00.000Z",
      }),
      createGoal({
        id: "older-goal",
        status: "completed",
        completedAt: "2024-03-01T12:00:00.000Z",
      }),
    ];

    const projects: Project[] = [
      createProject({ id: "active-project", status: "active" }),
      createProject({
        id: "recent-project",
        status: "completed",
        completedAt: "2024-06-10T09:00:00.000Z",
      }),
      createProject({
        id: "older-project",
        status: "completed",
        completedAt: "2024-02-01T09:00:00.000Z",
      }),
    ];

    const analytics = computeProgressAnalytics({
      tasks,
      goals,
      projects,
      period: "week",
      referenceDate,
    });

    expect(analytics.goals.total).toBe(3);
    expect(analytics.goals.active).toBe(1);
    expect(analytics.goals.recentCompleted).toBe(1);
    expect(analytics.projects.recentCompleted).toBe(1);
    expect(analytics.tasks.recentCompleted).toBe(1);
    expect(analytics.tasks.timeSpent).toBe(40);
    expect(analytics.tasks.progress).toBeCloseTo((2 / 3) * 100);
    expect(analytics.milestones.tasksCompleted).toBe(1);
  });

  it("treats all time as an unbounded range", () => {
    const tasks: Task[] = [
      createTask({
        id: "historic-task",
        done: true,
        status: "completed",
        completedAt: "2020-01-01T10:00:00.000Z",
        estimatedMinutes: 50,
      }),
    ];

    const goals: Goal[] = [
      createGoal({
        id: "historic-goal",
        status: "completed",
        completedAt: "2020-01-01T10:00:00.000Z",
      }),
    ];

    const projects: Project[] = [
      createProject({
        id: "historic-project",
        status: "completed",
        completedAt: "2020-01-01T10:00:00.000Z",
      }),
    ];

    const analytics = computeProgressAnalytics({
      tasks,
      goals,
      projects,
      period: "all-time",
      referenceDate,
    });

    expect(analytics.goals.recentCompleted).toBe(1);
    expect(analytics.projects.recentCompleted).toBe(1);
    expect(analytics.tasks.recentCompleted).toBe(1);
    expect(analytics.tasks.timeSpent).toBe(50);
  });
});
