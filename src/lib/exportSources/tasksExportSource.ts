/**
 * Tasks Export Source
 * Registers tasks data for export/import
 */

import { registerExportSource } from '../exportRegistry';
import { useTasks } from '@/store/useTasks';
import type { Task } from '@/store/useTasks';

// Register tasks export source
registerExportSource<Task>({
  id: 'tasks',
  name: 'Tasks',
  description: 'All your tasks including recurring tasks and completion history',
  priority: 100, // High priority - tasks often depend on projects/goals

  export: async (userId: string) => {
    const tasks = useTasks.getState().tasks;
    return tasks;
  },

  import: async (userId: string, data: Task[]) => {
    const { add } = useTasks.getState();
    const imported: string[] = [];

    for (const task of data) {
      try {
        // Create new task without the ID to generate a new one
        const { id, createdAt, updatedAt, ...taskData } = task;
        const newTaskId = await add(taskData);
        if (newTaskId) {
          imported.push(newTaskId);
        }
      } catch (error) {
        console.error('Failed to import task:', error);
      }
    }

    return imported;
  },

  validate: (data: Task[]) => {
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const task = data[i];

      if (!task.title || typeof task.title !== 'string') {
        errors.push(`Task at index ${i} has invalid title`);
      }

      if (!task.status || !['active', 'completed', 'backlog'].includes(task.status)) {
        errors.push(`Task at index ${i} has invalid status`);
      }

      if (!task.priority || !['low', 'medium', 'high', 'urgent'].includes(task.priority)) {
        errors.push(`Task at index ${i} has invalid priority`);
      }
    }

    return errors;
  },

  transformExport: (data: Task[]) => {
    // Remove any sensitive or temporary data
    return data.map(task => ({
      ...task,
      // Could add transformations here if needed
    }));
  },
});

// Export a marker to ensure this module is imported
export const tasksExportSourceRegistered = true;
