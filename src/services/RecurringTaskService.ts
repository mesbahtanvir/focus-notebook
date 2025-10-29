import type { IRepository } from '@/repositories/interfaces/IRepository';
import type { Task } from '@/store/useTasks';
import { isWorkday, getDateString } from '@/lib/utils/date';

/**
 * Service for handling recurring task logic
 * Extracted from store for better testability
 */
export class RecurringTaskService {
  constructor(private taskRepository: IRepository<Task>) {}

  /**
   * Generate missing recurring task instances
   */
  async generateMissingRecurringTasks(tasks: Task[]): Promise<void> {
    const recurringTemplates = this.getRecurringTemplates(tasks);

    for (const template of recurringTemplates) {
      if (this.shouldCreateTaskForToday(template, tasks)) {
        const newTask = this.createTaskForToday(template);
        await this.taskRepository.create(newTask);
      }
    }
  }

  /**
   * Get all recurring task templates (parent tasks with recurrence)
   */
  private getRecurringTemplates(tasks: Task[]): Task[] {
    return tasks.filter(t =>
      t.recurrence &&
      t.recurrence.type !== 'none' &&
      !t.parentTaskId // Only look at parent tasks, not instances
    );
  }

  /**
   * Check if we need to create a recurring task instance for today
   */
  shouldCreateTaskForToday(task: Task, existingTasks: Task[]): boolean {
    if (!task.recurrence || task.recurrence.type === 'none') return false;

    const today = getDateString(new Date());
    const todayDate = new Date();
    const { type } = task.recurrence;

    // For workweek tasks, only create on weekdays
    if (type === 'workweek' && !isWorkday()) return false;

    // Check if there's already a task for today (completed or active)
    const hasTaskForToday = existingTasks.some(t =>
      (t.id === task.id || t.parentTaskId === task.id || t.parentTaskId === task.parentTaskId) &&
      t.dueDate === today
    );

    if (hasTaskForToday) return false;

    // Check if this task should have an instance for today based on recurrence pattern
    const taskDueDate = task.dueDate;
    if (!taskDueDate) return true; // No due date, create for today

    const taskDate = new Date(taskDueDate);
    taskDate.setHours(0, 0, 0, 0); // Normalize to start of day
    todayDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // Task must be completed to generate a new instance
    if (!task.done) return false;

    // Task's due date must be in the past or today to generate next instance
    if (taskDate > todayDate) return false;

    // Check if today matches the recurrence pattern
    return this.matchesRecurrencePattern(type, taskDate, todayDate);
  }

  /**
   * Check if today matches the recurrence pattern from the last instance
   */
  private matchesRecurrencePattern(
    recurrenceType: string,
    lastDueDate: Date,
    today: Date
  ): boolean {
    const daysDiff = Math.floor((today.getTime() - lastDueDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (recurrenceType) {
      case 'daily':
        // If task is completed on its due date (daysDiff = 0), create tomorrow's instance
        return daysDiff >= 0;

      case 'workweek':
        // Already handled in shouldCreateTaskForToday
        return daysDiff >= 0;

      case 'weekly':
        return daysDiff >= 7;

      case 'biweekly':
        return daysDiff >= 14;

      case 'monthly':
        // Check if it's been at least a month
        const monthsDiff = (today.getFullYear() - lastDueDate.getFullYear()) * 12 +
                          (today.getMonth() - lastDueDate.getMonth());
        return monthsDiff >= 1;

      case 'bimonthly':
        // Check if it's been at least 2 months
        const bimonthsDiff = (today.getFullYear() - lastDueDate.getFullYear()) * 12 +
                             (today.getMonth() - lastDueDate.getMonth());
        return bimonthsDiff >= 2;

      case 'halfyearly':
        // Check if it's been at least 6 months
        const halfYearDiff = (today.getFullYear() - lastDueDate.getFullYear()) * 12 +
                             (today.getMonth() - lastDueDate.getMonth());
        return halfYearDiff >= 6;

      case 'yearly':
        // Check if it's been at least a year
        const yearsDiff = today.getFullYear() - lastDueDate.getFullYear();
        return yearsDiff >= 1;

      default:
        return false;
    }
  }

  /**
   * Create a task instance for today
   */
  createTaskForToday(task: Task): Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'> {
    const today = getDateString(new Date());

    return {
      title: task.title,
      done: false,
      status: 'active',
      priority: task.priority,
      category: task.category,
      completedAt: undefined,
      completionCount: 0,
      dueDate: today,
      notes: task.notes,
      tags: task.tags,
      estimatedMinutes: task.estimatedMinutes,
      recurrence: task.recurrence,
      parentTaskId: task.parentTaskId || task.id,
      projectId: task.projectId,
      focusEligible: task.focusEligible,
    };
  }
}

