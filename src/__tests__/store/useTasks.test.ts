import { renderHook, act } from '@testing-library/react';
import { useTasks, Task, TaskStatus, TaskPriority } from '@/store/useTasks';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  }),
}));

const { createAt: mockCreateAt, updateAt: mockUpdateAt, deleteAt: mockDeleteAt } = require('@/lib/data/gateway') as {
  createAt: jest.Mock;
  updateAt: jest.Mock;
  deleteAt: jest.Mock;
};

const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe') as {
  subscribeCol: jest.Mock;
};

const resetStore = () => {
  useTasks.setState({
    tasks: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    syncError: null,
    isSubscribed: false,
    unsubscribe: null,
  });
};

describe('useTasks store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(true);
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should update tasks from subscription callback', () => {
      const testTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Test Task',
          done: false,
          status: 'active',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testTasks, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.tasks).toEqual(testTasks);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle sync errors', () => {
      const testError = new Error('Sync failed');

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback([], { fromCache: false, hasPendingWrites: false, error: testError });
        return jest.fn();
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.syncError).toBe(testError);
      expect(consoleSpy).toHaveBeenCalledWith('[useTasks] Sync error:', testError);
      consoleSpy.mockRestore();
    });

    it('should handle subscription errors', () => {
      mockSubscribeCol.mockImplementation(() => {
        throw new Error('Failed to subscribe');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.syncError).toBeInstanceOf(Error);
      consoleSpy.mockRestore();
    });
  });

  describe('add', () => {
    it('should add a new task with default values', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'New Task',
          status: 'active',
          priority: 'medium',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.stringMatching(/users\/test-user-id\/tasks\/.+/),
        expect.objectContaining({
          title: 'New Task',
          done: false,
          status: 'active',
          priority: 'medium',
          focusEligible: true,
          createdAt: expect.any(String),
        })
      );
    });

    it('should add a task with custom focusEligible', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Non-focus Task',
          status: 'active',
          priority: 'medium',
          focusEligible: false,
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          focusEligible: false,
        })
      );
    });

    it('should default to "Untitled Task" if no title', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: '',
          status: 'active',
          priority: 'medium',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'Untitled Task',
        })
      );
    });

    it('should return task ID', async () => {
      const { result } = renderHook(() => useTasks());

      let taskId: string = '';
      await act(async () => {
        taskId = await result.current.add({
          title: 'Test Task',
          status: 'active',
          priority: 'medium',
        });
      });

      expect(taskId).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useTasks());

      await expect(
        act(async () => {
          await result.current.add({
            title: 'Test Task',
            status: 'active',
            priority: 'medium',
          });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('toggle', () => {
    it('should toggle one-time task to completed', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'One-time Task',
        done: false,
        status: 'active',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      useTasks.setState({ tasks: [task] });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.toggle('task-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith(
        'users/test-user-id/tasks/task-1',
        expect.objectContaining({
          done: true,
          status: 'completed',
          completedAt: expect.any(String),
        })
      );
    });

    it('should toggle one-time task from completed to active', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Completed Task',
        done: true,
        status: 'completed',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-02T00:00:00.000Z',
      };

      useTasks.setState({ tasks: [task] });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.toggle('task-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith(
        'users/test-user-id/tasks/task-1',
        expect.objectContaining({
          done: false,
          status: 'active',
          completedAt: undefined,
        })
      );
    });

    it('should toggle recurring task and add completion history', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Daily Task',
        done: false,
        status: 'active',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00.000Z',
        recurrence: { type: 'daily' },
        completionHistory: [],
      };

      useTasks.setState({ tasks: [task] });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.toggle('task-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith(
        'users/test-user-id/tasks/task-1',
        expect.objectContaining({
          done: true,
          completedAt: expect.any(String),
          completionHistory: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              completedAt: expect.any(String),
            }),
          ]),
          completionCount: 1,
        })
      );
    });

    it('should toggle recurring task and remove completion history', async () => {
      const today = new Date().toISOString().split('T')[0];
      const task: Task = {
        id: 'task-1',
        title: 'Daily Task',
        done: true,
        status: 'active',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00.000Z',
        recurrence: { type: 'daily' },
        completionHistory: [
          {
            date: today,
            completedAt: new Date().toISOString(),
          },
        ],
        completionCount: 1,
      };

      useTasks.setState({ tasks: [task] });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.toggle('task-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith(
        'users/test-user-id/tasks/task-1',
        expect.objectContaining({
          done: false,
          completedAt: undefined,
          completionHistory: [],
          completionCount: 0,
        })
      );
    });

    it('should handle missing task gracefully', async () => {
      useTasks.setState({ tasks: [] });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.toggle('nonexistent-task');
      });

      expect(mockUpdateAt).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('should update task with partial fields', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.updateTask('task-1', {
          title: 'Updated Title',
          priority: 'high',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/tasks/task-1', {
        title: 'Updated Title',
        priority: 'high',
      });
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useTasks());

      await expect(
        act(async () => {
          await result.current.updateTask('task-1', { title: 'New Title' });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.deleteTask('task-1');
      });

      expect(mockDeleteAt).toHaveBeenCalledWith('users/test-user-id/tasks/task-1');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useTasks());

      await expect(
        act(async () => {
          await result.current.deleteTask('task-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('archiveTask', () => {
    it('should archive a task', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.archiveTask('task-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/tasks/task-1', {
        status: 'archived',
        archivedAt: expect.any(String),
      });
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useTasks());

      await expect(
        act(async () => {
          await result.current.archiveTask('task-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('unarchiveTask', () => {
    it('should unarchive a task', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.unarchiveTask('task-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/tasks/task-1', {
        status: 'active',
        archivedAt: undefined,
      });
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useTasks());

      await expect(
        act(async () => {
          await result.current.unarchiveTask('task-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('getTasksByStatus', () => {
    it('should filter tasks by status', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Active Task',
          done: false,
          status: 'active',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'task-2',
          title: 'Completed Task',
          done: true,
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'task-3',
          title: 'Backlog Task',
          done: false,
          status: 'backlog',
          priority: 'low',
          createdAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      useTasks.setState({ tasks });
      const { result } = renderHook(() => useTasks());

      const activeTasks = result.current.getTasksByStatus('active');
      expect(activeTasks).toHaveLength(1);
      expect(activeTasks[0].id).toBe('task-1');

      const completedTasks = result.current.getTasksByStatus('completed');
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].id).toBe('task-2');

      const backlogTasks = result.current.getTasksByStatus('backlog');
      expect(backlogTasks).toHaveLength(1);
      expect(backlogTasks[0].id).toBe('task-3');
    });

    it('should return empty array for status with no tasks', () => {
      useTasks.setState({ tasks: [] });
      const { result } = renderHook(() => useTasks());

      const archivedTasks = result.current.getTasksByStatus('archived');
      expect(archivedTasks).toHaveLength(0);
    });
  });

  describe('resetDailyTasks', () => {
    it('should reset completed daily tasks', async () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Daily Task 1',
          done: true,
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
          recurrence: { type: 'daily' },
        },
        {
          id: 'task-2',
          title: 'Daily Task 2',
          done: true,
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-02T00:00:00.000Z',
          recurrence: { type: 'daily' },
        },
        {
          id: 'task-3',
          title: 'Weekly Task',
          done: true,
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-03T00:00:00.000Z',
          recurrence: { type: 'weekly' },
        },
      ];

      useTasks.setState({ tasks });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.resetDailyTasks();
      });

      expect(mockUpdateAt).toHaveBeenCalledTimes(2);
      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/tasks/task-1', {
        done: false,
        status: 'active',
        completedAt: undefined,
      });
      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/tasks/task-2', {
        done: false,
        status: 'active',
        completedAt: undefined,
      });
    });

    it('should not reset non-daily tasks', async () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Weekly Task',
          done: true,
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
          recurrence: { type: 'weekly' },
        },
      ];

      useTasks.setState({ tasks });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.resetDailyTasks();
      });

      expect(mockUpdateAt).not.toHaveBeenCalled();
    });
  });

  describe('resetWeeklyTasks', () => {
    it('should reset completed weekly tasks', async () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Weekly Task 1',
          done: true,
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
          recurrence: { type: 'weekly' },
        },
        {
          id: 'task-2',
          title: 'Daily Task',
          done: true,
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-02T00:00:00.000Z',
          recurrence: { type: 'daily' },
        },
      ];

      useTasks.setState({ tasks });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.resetWeeklyTasks();
      });

      expect(mockUpdateAt).toHaveBeenCalledTimes(1);
      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/tasks/task-1', {
        done: false,
        status: 'active',
        completedAt: undefined,
        completionCount: 0,
      });
    });

    it('should not reset non-weekly tasks', async () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Daily Task',
          done: true,
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
          recurrence: { type: 'daily' },
        },
      ];

      useTasks.setState({ tasks });
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.resetWeeklyTasks();
      });

      expect(mockUpdateAt).not.toHaveBeenCalled();
    });
  });
});
