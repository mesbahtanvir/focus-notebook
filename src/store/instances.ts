/**
 * Store Instances
 * Creates store instances using dependency injection
 * This file bridges the DI container with Zustand stores
 */

import { appContainer } from '@/di/Container';
import { ServiceKeys } from '@/di/ServiceKeys';
import { createTaskStore } from './useTasksV2';
import type { IRepository } from '@/repositories/interfaces/IRepository';
import type { Task } from './useTasks';
import type { RecurringTaskService } from '@/services/RecurringTaskService';

/**
 * Get the task store instance with injected dependencies
 */
export function getTaskStore() {
  const taskRepository = appContainer.resolve<IRepository<Task>>(ServiceKeys.TASK_REPOSITORY);
  const recurringTaskService = appContainer.resolve<RecurringTaskService>(ServiceKeys.RECURRING_TASK_SERVICE);
  
  return createTaskStore(taskRepository, recurringTaskService);
}

// Export a singleton instance for the app
// This will be lazily created when first imported
let taskStoreInstance: ReturnType<typeof createTaskStore> | null = null;

export function useTasksV2() {
  if (!taskStoreInstance) {
    taskStoreInstance = getTaskStore();
  }
  return taskStoreInstance;
}

// TODO: Add other stores as they are migrated
// export function getMoodStore() { ... }
// export function getThoughtStore() { ... }

