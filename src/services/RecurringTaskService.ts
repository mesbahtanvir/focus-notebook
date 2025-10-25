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
    const { type } = task.recurrence;

    // For workweek tasks, only create on weekdays
    if (type === 'workweek' && !isWorkday()) return false;

    // Check if there's already a task for today (completed or active)
    const hasTaskForToday = existingTasks.some(t =>
      (t.id === task.id || t.parentTaskId === task.id || t.parentTaskId === task.parentTaskId) &&
      t.dueDate === today
    );

    if (hasTaskForToday) return false;

    // Check if this task should have an instance for today
    const taskDueDate = task.dueDate;
    if (!taskDueDate) return true; // No due date, create for today

    const taskDate = new Date(taskDueDate);
    const nowDate = new Date();

    // If task's due date is in the past or today, and it's completed, create new instance
    if (task.done && taskDate <= nowDate) {
      return true;
    }

    return false;
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

