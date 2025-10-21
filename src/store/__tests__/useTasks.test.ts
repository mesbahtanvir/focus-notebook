/**
 * Unit tests for useTasks store
 * Tests task management functionality including CRUD operations,
 * filtering, recurring tasks, and cloud sync integration
 */

import { renderHook, act } from '@testing-library/react';
import { useTasks } from '../useTasks';

// Mock the database
jest.mock('@/db', () => ({
  db: {
    tasks: {
      add: jest.fn(),
      put: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      toArray: jest.fn(),
    },
  },
  toTaskRow: jest.fn((task) => task),
  toTask: jest.fn((row) => row),
}));

// Mock the sync engine
jest.mock('@/lib/syncEngine', () => ({
  pushItemToCloud: jest.fn(),
  deleteItemFromCloud: jest.fn(),
}));

describe('useTasks Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.tasks = [];
    });
    jest.clearAllMocks();
  });

  describe('Task Creation', () => {
    it('should add a new task with default values', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Test Task',
          category: 'mastery',
          priority: 'medium',
        });
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toMatchObject({
        title: 'Test Task',
        category: 'mastery',
        priority: 'medium',
        done: false,
        status: 'active',
      });
    });

    it('should generate unique IDs for tasks', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({ title: 'Task 1', category: 'mastery', priority: 'medium' });
        await result.current.add({ title: 'Task 2', category: 'mastery', priority: 'medium' });
      });

      const ids = result.current.tasks.map((t) => t.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('should set createdAt timestamp', async () => {
      const { result } = renderHook(() => useTasks());
      const beforeTime = new Date().toISOString();

      await act(async () => {
        await result.current.add({ title: 'Test', category: 'mastery', priority: 'medium' });
      });

      const afterTime = new Date().toISOString();
      const task = result.current.tasks[0];

      expect(task.createdAt).toBeDefined();
      expect(task.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(task.createdAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Task Completion', () => {
    it('should toggle task completion status', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({ title: 'Test', category: 'mastery', priority: 'medium' });
      });

      const taskId = result.current.tasks[0].id;

      await act(async () => {
        await result.current.toggle(taskId);
      });

      expect(result.current.tasks[0].done).toBe(true);
      expect(result.current.tasks[0].completedAt).toBeDefined();

      await act(async () => {
        await result.current.toggle(taskId);
      });

      expect(result.current.tasks[0].done).toBe(false);
      expect(result.current.tasks[0].completedAt).toBeUndefined();
    });

    it('should move completed tasks to completed status', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Test',
          category: 'mastery',
          priority: 'medium',
          status: 'active',
        });
      });

      const taskId = result.current.tasks[0].id;

      await act(async () => {
        await result.current.toggle(taskId);
      });

      expect(result.current.tasks[0].status).toBe('completed');
    });
  });

  describe('Recurring Tasks', () => {
    it('should handle daily recurring tasks', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Daily Task',
          category: 'mastery',
          priority: 'medium',
          recurrence: { type: 'daily', frequency: 30 },
        });
      });

      const taskId = result.current.tasks[0].id;

      await act(async () => {
        await result.current.toggle(taskId);
      });

      // Should be marked done but remain active
      expect(result.current.tasks[0].done).toBe(true);
      expect(result.current.tasks[0].status).toBe('active');
      expect(result.current.tasks[0].completionCount).toBe(1);
    });

    it('should reset daily tasks at midnight', async () => {
      const { result } = renderHook(() => useTasks());

      // Create a task completed yesterday
      await act(async () => {
        await result.current.add({
          title: 'Daily Task',
          category: 'mastery',
          priority: 'medium',
          recurrence: { type: 'daily' },
          done: true,
          completedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        });
      });

      await act(async () => {
        await result.current.resetDailyTasks();
      });

      expect(result.current.tasks[0].done).toBe(false);
      expect(result.current.tasks[0].completedAt).toBeUndefined();
    });

    it('should track completion count for recurring tasks', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Recurring Task',
          category: 'mastery',
          priority: 'medium',
          recurrence: { type: 'daily', frequency: 30 },
        });
      });

      const taskId = result.current.tasks[0].id;

      // Complete 3 times
      await act(async () => {
        await result.current.toggle(taskId);
        await result.current.toggle(taskId);
        await result.current.toggle(taskId);
      });

      expect(result.current.tasks[0].completionCount).toBe(3);
    });
  });

  describe('Task Updates', () => {
    it('should update task properties', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Original Title',
          category: 'mastery',
          priority: 'medium',
        });
      });

      const taskId = result.current.tasks[0].id;

      await act(async () => {
        await result.current.updateTask(taskId, {
          title: 'Updated Title',
          priority: 'high',
        });
      });

      expect(result.current.tasks[0].title).toBe('Updated Title');
      expect(result.current.tasks[0].priority).toBe('high');
      expect(result.current.tasks[0].category).toBe('mastery'); // Unchanged
    });

    it('should set updatedAt timestamp on update', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({ title: 'Test', category: 'mastery', priority: 'medium' });
      });

      const taskId = result.current.tasks[0].id;
      const originalUpdatedAt = result.current.tasks[0].updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await act(async () => {
        await result.current.updateTask(taskId, { title: 'Updated' });
      });

      expect(result.current.tasks[0].updatedAt).toBeGreaterThan(originalUpdatedAt || 0);
    });
  });

  describe('Task Deletion', () => {
    it('should delete a task', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({ title: 'Test', category: 'mastery', priority: 'medium' });
      });

      const taskId = result.current.tasks[0].id;

      await act(async () => {
        await result.current.deleteTask(taskId);
      });

      expect(result.current.tasks).toHaveLength(0);
    });

    it('should handle deleting non-existent task', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.deleteTask('non-existent-id');
      });

      // Should not throw error
      expect(result.current.tasks).toHaveLength(0);
    });
  });

  describe('Task Filtering', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        // Create various tasks
        await result.current.add({
          title: 'Active Mastery',
          category: 'mastery',
          priority: 'high',
          status: 'active',
        });
        await result.current.add({
          title: 'Active Pleasure',
          category: 'pleasure',
          priority: 'medium',
          status: 'active',
        });
        await result.current.add({
          title: 'Backlog Task',
          category: 'mastery',
          priority: 'low',
          status: 'backlog',
        });
        await result.current.add({
          title: 'Completed Task',
          category: 'mastery',
          priority: 'medium',
          status: 'completed',
          done: true,
        });
      });
    });

    it('should filter by status', () => {
      const { result } = renderHook(() => useTasks());
      const activeTasks = result.current.tasks.filter((t) => t.status === 'active');
      const backlogTasks = result.current.tasks.filter((t) => t.status === 'backlog');

      expect(activeTasks).toHaveLength(2);
      expect(backlogTasks).toHaveLength(1);
    });

    it('should filter by category', () => {
      const { result } = renderHook(() => useTasks());
      const masteryTasks = result.current.tasks.filter((t) => t.category === 'mastery');
      const pleasureTasks = result.current.tasks.filter((t) => t.category === 'pleasure');

      expect(masteryTasks).toHaveLength(3);
      expect(pleasureTasks).toHaveLength(1);
    });

    it('should filter by completion', () => {
      const { result } = renderHook(() => useTasks());
      const completedTasks = result.current.tasks.filter((t) => t.done);
      const incompleteTasks = result.current.tasks.filter((t) => !t.done);

      expect(completedTasks).toHaveLength(1);
      expect(incompleteTasks).toHaveLength(3);
    });
  });

  describe('Focus Eligible Tasks', () => {
    it('should mark tasks as focus eligible by default', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({ title: 'Test', category: 'mastery', priority: 'medium' });
      });

      expect(result.current.tasks[0].focusEligible).toBe(true);
    });

    it('should allow marking tasks as errands (not focus eligible)', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Shopping',
          category: 'mastery',
          priority: 'medium',
          focusEligible: false,
        });
      });

      expect(result.current.tasks[0].focusEligible).toBe(false);
    });
  });
});
