/**
 * Builder pattern for creating test Task objects
 * Makes tests more readable and maintainable
 */

import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  RecurrenceType,
  TaskCompletion,
} from '@/store/useTasks';

export class TaskBuilder {
  private task: Partial<Task> = {
    title: 'Test Task',
    done: false,
    status: 'active',
    priority: 'medium',
    createdAt: new Date().toISOString(),
  };

  /**
   * Set task title
   */
  withTitle(title: string): this {
    this.task.title = title;
    return this;
  }

  /**
   * Set task status
   */
  withStatus(status: TaskStatus): this {
    this.task.status = status;
    return this;
  }

  /**
   * Set task priority
   */
  withPriority(priority: TaskPriority): this {
    this.task.priority = priority;
    return this;
  }

  /**
   * Set task category
   */
  withCategory(category: TaskCategory): this {
    this.task.category = category;
    return this;
  }

  /**
   * Mark task as done
   */
  asDone(): this {
    this.task.done = true;
    this.task.completedAt = new Date().toISOString();
    return this;
  }

  /**
   * Set completion status explicitly
   */
  withDone(done: boolean): this {
    this.task.done = done;
    return this;
  }

  /**
   * Set completed at timestamp
   */
  withCompletedAt(date?: string | Date): this {
    if (!date) {
      this.task.completedAt = undefined;
      return this;
    }

    this.task.completedAt = typeof date === 'string' ? date : date.toISOString();
    return this;
  }

  /**
   * Set completion history entries
   */
  withCompletionHistory(history: TaskCompletion[]): this {
    this.task.completionHistory = history;
    return this;
  }

  /**
   * Mark task as not done
   */
  asNotDone(): this {
    this.task.done = false;
    this.task.completedAt = undefined;
    return this;
  }

  /**
   * Add recurrence
   */
  withRecurrence(type: RecurrenceType, frequency?: number): this {
    this.task.recurrence = {
      type,
      frequency,
    };
    return this;
  }

  /**
   * Set as daily recurring task
   */
  asDaily(): this {
    return this.withRecurrence('daily');
  }

  /**
   * Set as weekly recurring task
   */
  asWeekly(): this {
    return this.withRecurrence('weekly');
  }

  /**
   * Set due date
   */
  withDueDate(date: string | Date): this {
    this.task.dueDate = typeof date === 'string' ? date : date.toISOString();
    return this;
  }

  /**
   * Set notes
   */
  withNotes(notes: string): this {
    this.task.notes = notes;
    return this;
  }

  /**
   * Set tags
   */
  withTags(tags: string[]): this {
    this.task.tags = tags;
    return this;
  }

  /**
   * Set estimated minutes
   */
  withEstimatedMinutes(minutes: number): this {
    this.task.estimatedMinutes = minutes;
    return this;
  }

  /**
   * Set parent task ID (for recurring instances)
   */
  withParentTaskId(parentTaskId: string): this {
    this.task.parentTaskId = parentTaskId;
    return this;
  }

  /**
   * Set project ID
   */
  withProjectId(projectId: string): this {
    this.task.projectId = projectId;
    return this;
  }

  /**
   * Set thought ID
   */
  withThoughtId(thoughtId: string): this {
    this.task.thoughtId = thoughtId;
    return this;
  }

  /**
   * Set focus eligibility
   */
  asFocusEligible(eligible: boolean = true): this {
    this.task.focusEligible = eligible;
    return this;
  }

  /**
   * Set creation date
   */
  withCreatedAt(date: string | Date): this {
    this.task.createdAt = typeof date === 'string' ? date : date.toISOString();
    return this;
  }

  /**
   * Build the final Task object
   */
  build(): Task {
    const id = this.task.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      title: this.task.title || 'Test Task',
      done: this.task.done ?? false,
      status: this.task.status || 'active',
      priority: this.task.priority || 'medium',
      createdAt: this.task.createdAt || new Date().toISOString(),
      ...this.task,
    } as Task;
  }

  /**
   * Build multiple tasks with sequential IDs
   */
  buildMany(count: number): Task[] {
    const tasks: Task[] = [];
    for (let i = 0; i < count; i++) {
      tasks.push(this.build());
    }
    return tasks;
  }

  /**
   * Reset the builder to default state
   */
  reset(): this {
    this.task = {
      title: 'Test Task',
      done: false,
      status: 'active',
      priority: 'medium',
      createdAt: new Date().toISOString(),
    };
    return this;
  }
}

/**
 * Convenience function to create a TaskBuilder
 */
export function aTask(): TaskBuilder {
  return new TaskBuilder();
}

