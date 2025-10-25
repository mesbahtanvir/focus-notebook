/**
 * Refactored Tasks Store using Repository Pattern
 * This is the new implementation - will replace useTasks.ts once tested
 */

import { create } from 'zustand';
import type { IRepository } from '@/repositories/interfaces/IRepository';
import type { RecurringTaskService } from '@/services/RecurringTaskService';
import type { Task, TaskStatus } from './useTasks';

type State = {
  tasks: Task[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;
  
  // Actions
  subscribe: (userId: string) => void;
  add: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>) => Promise<string>;
  toggle: (id: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'version'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTasksByStatus: (status: TaskStatus) => Task[];
  resetDailyTasks: () => Promise<void>;
  resetWeeklyTasks: () => Promise<void>;
};

/**
 * Create tasks store with dependency injection
 */
export function createTaskStore(
  taskRepository: IRepository<Task>,
  recurringTaskService: RecurringTaskService
) {
  return create<State>((set, get) => ({
    tasks: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,

    subscribe: (userId: string) => {
      // Unsubscribe from previous subscription if any
      const currentUnsub = get().unsubscribe;
      if (currentUnsub) {
        currentUnsub();
      }

      // Subscribe to tasks collection
      const unsub = taskRepository.subscribe(async (tasks, meta) => {
        set({
          tasks,
          isLoading: false,
          fromCache: meta.fromCache,
          hasPendingWrites: meta.hasPendingWrites,
        });

        // Generate missing recurring tasks (only on first load, not from cache)
        if (!meta.fromCache && tasks.length > 0) {
          await recurringTaskService.generateMissingRecurringTasks(tasks);
        }
      });

      set({ unsubscribe: unsub });
    },

    add: async (task) => {
      return await taskRepository.create(task);
    },

    toggle: async (id) => {
      const task = get().tasks.find(t => t.id === id);
      if (!task) return;

      const isRecurring = task.recurrence && task.recurrence.type !== 'none';
      const nowDone = !task.done;

      const updates: Partial<Task> = {
        done: nowDone,
        status: (nowDone && !isRecurring) ? 'completed' : 'active',
        completedAt: nowDone ? new Date().toISOString() : undefined,
        completionCount: nowDone && isRecurring
          ? (task.completionCount || 0) + 1
          : task.completionCount,
      };

      await taskRepository.update(id, updates);
    },

    updateTask: async (id, updates) => {
      await taskRepository.update(id, updates);
    },

    deleteTask: async (id) => {
      await taskRepository.delete(id);
    },

    getTasksByStatus: (status) => {
      return get().tasks.filter(t => t.status === status);
    },

    resetDailyTasks: async () => {
      const tasks = get().tasks;
      const dailyTasks = tasks.filter(t => t.recurrence?.type === 'daily' && t.done);

      for (const task of dailyTasks) {
        await taskRepository.update(task.id, {
          done: false,
          status: 'active',
          completedAt: undefined,
        });
      }
    },

    resetWeeklyTasks: async () => {
      const tasks = get().tasks;
      const weeklyTasks = tasks.filter(t => t.recurrence?.type === 'weekly' && t.done);

      for (const task of weeklyTasks) {
        await taskRepository.update(task.id, {
          done: false,
          status: 'active',
          completedAt: undefined,
          completionCount: 0,
        });
      }
    },
  }));
}

// Store instance will be created and exported from a separate file that uses DI

