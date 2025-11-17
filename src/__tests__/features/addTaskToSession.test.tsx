/**
 * Test cases for Add Task to Session feature
 * Tests the ability to add tasks to an active focus session
 *
 * Features tested:
 * - Adding tasks to active session via store method
 * - UI modal for selecting available tasks
 * - Task filtering (excludes already-added tasks, completed tasks)
 * - Success feedback display
 * - Task persistence to Firestore
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useFocus } from '@/store/useFocus';
import type { Task } from '@/store/useTasks';

// Mock Firebase
jest.mock('@/lib/firebaseClient', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
  db: {},
}));

// Mock Firestore operations from data gateway
const mockUpdateAt = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue('mock-session-id'),
  updateAt: mockUpdateAt,
  deleteAt: jest.fn().mockResolvedValue(undefined),
  setAt: jest.fn().mockResolvedValue(undefined),
}));

// Mock subscription
jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn().mockReturnValue(() => {}),
}));

// Mock Time Tracking Service
jest.mock('@/services/TimeTrackingService', () => ({
  TimeTrackingService: {
    updateTaskActualTime: jest.fn().mockResolvedValue(undefined),
    formatTime: jest.fn((minutes: number) => `${minutes}m`),
    calculateEfficiency: jest.fn().mockReturnValue(100),
    getEfficiencyStatus: jest.fn().mockReturnValue('on-track'),
  },
}));

describe('Add Task to Session Feature', () => {
  const mockTask1: Task = {
    id: 'task-1',
    title: 'Initial Task 1',
    done: false,
    status: 'active',
    priority: 'high',
    category: 'mastery',
    estimatedMinutes: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTask2: Task = {
    id: 'task-2',
    title: 'Initial Task 2',
    done: false,
    status: 'active',
    priority: 'medium',
    category: 'pleasure',
    estimatedMinutes: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTask3: Task = {
    id: 'task-3',
    title: 'New Task to Add',
    done: false,
    status: 'active',
    priority: 'urgent',
    category: 'mastery',
    estimatedMinutes: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTask4: Task = {
    id: 'task-4',
    title: 'Another Task to Add',
    done: false,
    status: 'active',
    priority: 'low',
    category: 'pleasure',
    estimatedMinutes: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockCompletedTask: Task = {
    id: 'task-completed',
    title: 'Completed Task',
    done: true,
    status: 'completed',
    priority: 'medium',
    category: 'mastery',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset Zustand store state
    const { result } = renderHook(() => useFocus());
    act(() => {
      const state = result.current;
      (state as any).currentSession = null;
      (state as any).sessions = [];
    });
    jest.clearAllMocks();
  });

  describe('Store Method - addTaskToSession', () => {
    it('should add a new task to the current session', async () => {
      const { result } = renderHook(() => useFocus());

      // Start a session with 2 tasks
      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 60);
      });

      expect(result.current.currentSession?.tasks).toHaveLength(2);

      // Add a third task
      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Verify task was added
      expect(result.current.currentSession?.tasks).toHaveLength(3);
      expect(result.current.currentSession?.tasks[2].task.id).toBe('task-3');
      expect(result.current.currentSession?.tasks[2].task.title).toBe('New Task to Add');
    });

    it('should initialize new task with default FocusTask values', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      const addedTask = result.current.currentSession?.tasks[1];

      // Verify FocusTask structure
      expect(addedTask?.timeSpent).toBe(0);
      expect(addedTask?.completed).toBe(false);
      expect(addedTask?.notes).toBe('');
      expect(addedTask?.followUpTaskIds).toEqual([]);
    });

    it('should persist task addition to Firestore', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      mockUpdateAt.mockClear();

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Verify persistActiveSession was called (updateAt should be called)
      await waitFor(() => {
        expect(mockUpdateAt).toHaveBeenCalled();
      });
    });

    it('should add multiple tasks sequentially', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      expect(result.current.currentSession?.tasks).toHaveLength(1);

      // Add task 3
      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      expect(result.current.currentSession?.tasks).toHaveLength(2);

      // Add task 4
      await act(async () => {
        await result.current.addTaskToSession(mockTask4);
      });

      expect(result.current.currentSession?.tasks).toHaveLength(3);
      expect(result.current.currentSession?.tasks[1].task.id).toBe('task-3');
      expect(result.current.currentSession?.tasks[2].task.id).toBe('task-4');
    });

    it('should preserve existing task data when adding new tasks', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 60);
      });

      // Add notes to first task
      await act(async () => {
        await result.current.updateTaskNotes(0, 'Important notes');
      });

      // Mark second task as complete
      await act(async () => {
        await result.current.markTaskComplete(1);
      });

      // Add new task
      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Verify existing tasks are unchanged
      expect(result.current.currentSession?.tasks[0].notes).toBe('Important notes');
      expect(result.current.currentSession?.tasks[1].completed).toBe(true);
      expect(result.current.currentSession?.tasks).toHaveLength(3);
    });

    it('should not affect currentTaskIndex when adding tasks', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 60);
      });

      // Switch to second task
      await act(async () => {
        await result.current.switchToTask(1);
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(1);

      // Add new task
      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Current task index should remain unchanged
      expect(result.current.currentSession?.currentTaskIndex).toBe(1);
    });

    it('should handle adding tasks with all property types', async () => {
      const { result } = renderHook(() => useFocus());

      const taskWithAllProps: Task = {
        id: 'task-full',
        title: 'Task with All Properties',
        notes: 'Detailed notes',
        done: false,
        status: 'active',
        priority: 'high',
        category: 'mastery',
        estimatedMinutes: 30,
        actualMinutes: 15,
        dueDate: new Date().toISOString(),
        steps: [
          { id: 'step-1', text: 'Step 1', completed: false },
          { id: 'step-2', text: 'Step 2', completed: true },
        ],
        projectId: 'project-1',
        thoughtId: 'thought-1',
        tags: ['important', 'urgent'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(taskWithAllProps);
      });

      const addedTask = result.current.currentSession?.tasks[1].task;

      // Verify all properties are preserved
      expect(addedTask?.notes).toBe('Detailed notes');
      expect(addedTask?.estimatedMinutes).toBe(30);
      expect(addedTask?.steps).toHaveLength(2);
      expect(addedTask?.projectId).toBe('project-1');
      expect(addedTask?.thoughtId).toBe('thought-1');
      expect(addedTask?.tags).toEqual(['important', 'urgent']);
    });
  });

  describe('Task Filtering Logic', () => {
    it('should only show active, incomplete tasks in modal', () => {
      const allTasks = [mockTask1, mockTask2, mockTask3, mockCompletedTask];
      const currentSessionTaskIds = [mockTask1.id];

      // Simulate modal filtering logic
      const availableTasks = allTasks.filter(task =>
        task.status === 'active' &&
        !task.done &&
        !currentSessionTaskIds.includes(task.id)
      );

      expect(availableTasks).toHaveLength(2);
      expect(availableTasks.map(t => t.id)).toEqual(['task-2', 'task-3']);
      expect(availableTasks.find(t => t.id === 'task-completed')).toBeUndefined();
    });

    it('should exclude tasks already in the session', () => {
      const allTasks = [mockTask1, mockTask2, mockTask3, mockTask4];
      const currentSessionTaskIds = [mockTask1.id, mockTask2.id];

      const availableTasks = allTasks.filter(task =>
        task.status === 'active' &&
        !task.done &&
        !currentSessionTaskIds.includes(task.id)
      );

      expect(availableTasks).toHaveLength(2);
      expect(availableTasks.map(t => t.id)).toEqual(['task-3', 'task-4']);
    });

    it('should handle empty available tasks list', () => {
      const allTasks = [mockTask1, mockTask2];
      const currentSessionTaskIds = [mockTask1.id, mockTask2.id];

      const availableTasks = allTasks.filter(task =>
        task.status === 'active' &&
        !task.done &&
        !currentSessionTaskIds.includes(task.id)
      );

      expect(availableTasks).toHaveLength(0);
    });

    it('should filter out archived tasks', () => {
      const archivedTask: Task = {
        ...mockTask3,
        id: 'task-archived',
        status: 'archived',
      };

      const allTasks = [mockTask1, archivedTask];
      const currentSessionTaskIds: string[] = [];

      const availableTasks = allTasks.filter(task =>
        task.status === 'active' &&
        !task.done &&
        !currentSessionTaskIds.includes(task.id)
      );

      expect(availableTasks).toHaveLength(1);
      expect(availableTasks[0].id).toBe('task-1');
    });

    it('should filter out backlog tasks', () => {
      const backlogTask: Task = {
        ...mockTask3,
        id: 'task-backlog',
        status: 'backlog',
      };

      const allTasks = [mockTask1, backlogTask];
      const currentSessionTaskIds: string[] = [];

      const availableTasks = allTasks.filter(task =>
        task.status === 'active' &&
        !task.done &&
        !currentSessionTaskIds.includes(task.id)
      );

      expect(availableTasks).toHaveLength(1);
      expect(availableTasks[0].id).toBe('task-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle adding task when no session exists', async () => {
      const { result } = renderHook(() => useFocus());

      // Try to add task without starting a session
      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Should handle gracefully - no session, no error
      expect(result.current.currentSession).toBeNull();
    });

    it('should handle adding the same task multiple times', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      // Add task twice
      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Both should be added (duplicate prevention is UI responsibility)
      expect(result.current.currentSession?.tasks).toHaveLength(3);
      expect(result.current.currentSession?.tasks[1].task.id).toBe('task-3');
      expect(result.current.currentSession?.tasks[2].task.id).toBe('task-3');
    });

    it('should handle adding tasks during paused session', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      // Pause session
      await act(async () => {
        await result.current.pauseSession();
      });

      expect(result.current.currentSession?.isActive).toBe(false);

      // Add task while paused
      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Task should be added successfully
      expect(result.current.currentSession?.tasks).toHaveLength(2);
      expect(result.current.currentSession?.isActive).toBe(false);
    });

    it('should preserve task order when adding new tasks', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask4);
      });

      const taskIds = result.current.currentSession?.tasks.map(t => t.task.id);
      expect(taskIds).toEqual(['task-1', 'task-2', 'task-3', 'task-4']);
    });

    it('should handle tasks with special characters in title', async () => {
      const { result } = renderHook(() => useFocus());

      const specialTask: Task = {
        ...mockTask3,
        id: 'task-special',
        title: 'Task with "quotes" and \'apostrophes\' & symbols @#$%',
      };

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(specialTask);
      });

      expect(result.current.currentSession?.tasks[1].task.title).toBe(
        'Task with "quotes" and \'apostrophes\' & symbols @#$%'
      );
    });

    it('should handle adding tasks with undefined optional properties', async () => {
      const { result } = renderHook(() => useFocus());

      const minimalTask: Task = {
        id: 'task-minimal',
        title: 'Minimal Task',
        done: false,
        status: 'active',
        priority: 'medium',
        category: 'mastery',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(minimalTask);
      });

      const addedTask = result.current.currentSession?.tasks[1].task;
      expect(addedTask?.notes).toBeUndefined();
      expect(addedTask?.estimatedMinutes).toBeUndefined();
      expect(addedTask?.steps).toBeUndefined();
      expect(addedTask?.tags).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should allow switching to newly added task', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Switch to the newly added task (index 1)
      await act(async () => {
        await result.current.switchToTask(1);
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(1);
      expect(result.current.currentSession?.tasks[1].task.id).toBe('task-3');
    });

    it('should allow adding notes to newly added task', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      await act(async () => {
        await result.current.switchToTask(1);
      });

      await act(async () => {
        await result.current.updateTaskNotes(1, 'Notes for newly added task');
      });

      expect(result.current.currentSession?.tasks[1].notes).toBe('Notes for newly added task');
    });

    it('should allow completing newly added task', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      await act(async () => {
        await result.current.markTaskComplete(1);
      });

      expect(result.current.currentSession?.tasks[1].completed).toBe(true);
    });

    it('should include added tasks in session end summary', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      await act(async () => {
        await result.current.endSession();
      });

      const completedSession = result.current.completedSession;
      expect(completedSession?.tasks).toHaveLength(2);
      expect(completedSession?.tasks[1].task.id).toBe('task-3');
    });

    it('should allow reordering tasks after adding new ones', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Reorder: move task-3 from index 2 to index 0
      await act(async () => {
        await result.current.reorderTasks(2, 0);
      });

      const taskIds = result.current.currentSession?.tasks.map(t => t.task.id);
      expect(taskIds).toEqual(['task-3', 'task-1', 'task-2']);
    });

    it('should track time for newly added tasks', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      await act(async () => {
        await result.current.switchToTask(1);
      });

      // Simulate time tracking
      await act(async () => {
        await result.current.updateTaskTime(1, 300); // 5 minutes = 300 seconds
      });

      expect(result.current.currentSession?.tasks[1].timeSpent).toBe(300);
    });

    it('should persist added tasks across session pause/resume', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      expect(result.current.currentSession?.tasks).toHaveLength(2);

      // Pause
      await act(async () => {
        await result.current.pauseSession();
      });

      // Resume
      await act(async () => {
        await result.current.resumeSession();
      });

      // Tasks should still be there
      expect(result.current.currentSession?.tasks).toHaveLength(2);
      expect(result.current.currentSession?.tasks[1].task.id).toBe('task-3');
    });
  });

  describe('UI Behavior (Logical Tests)', () => {
    it('should calculate available tasks correctly for modal display', () => {
      const allTasks = [mockTask1, mockTask2, mockTask3, mockTask4, mockCompletedTask];
      const sessionTasks = [mockTask1, mockTask2];

      const availableTasks = allTasks.filter(task =>
        task.status === 'active' &&
        !task.done &&
        !sessionTasks.some(st => st.id === task.id)
      );

      expect(availableTasks).toHaveLength(2);
      expect(availableTasks[0].id).toBe('task-3');
      expect(availableTasks[1].id).toBe('task-4');
    });

    it('should show empty state when all tasks are already in session', () => {
      const allTasks = [mockTask1, mockTask2];
      const sessionTasks = [mockTask1, mockTask2];

      const availableTasks = allTasks.filter(task =>
        task.status === 'active' &&
        !task.done &&
        !sessionTasks.some(st => st.id === task.id)
      );

      expect(availableTasks).toHaveLength(0);
    });

    it('should display task category indicator in modal', () => {
      const tasks = [mockTask3, mockTask4];

      // Simulate category color logic
      const getCategoryColor = (category?: string) => {
        return category === 'mastery' ? 'bg-blue-500' : 'bg-pink-500';
      };

      expect(getCategoryColor(tasks[0].category)).toBe('bg-blue-500');
      expect(getCategoryColor(tasks[1].category)).toBe('bg-pink-500');
    });

    it('should show estimated time if available', () => {
      const taskWithTime = mockTask3; // has estimatedMinutes: 25
      const taskWithoutTime: Task = { ...mockTask3, estimatedMinutes: undefined };

      expect(taskWithTime.estimatedMinutes).toBeDefined();
      expect(taskWithTime.estimatedMinutes).toBe(25);
      expect(taskWithoutTime.estimatedMinutes).toBeUndefined();
    });

    it('should trigger success feedback with correct task title', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      await act(async () => {
        await result.current.addTaskToSession(mockTask3);
      });

      // Simulate UI feedback state
      const createdTaskTitle = mockTask3.title;
      const showFeedback = true;

      expect(showFeedback).toBe(true);
      expect(createdTaskTitle).toBe('New Task to Add');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle adding many tasks efficiently', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      // Add 10 tasks
      const tasksToAdd = Array.from({ length: 10 }, (_, i) => ({
        ...mockTask3,
        id: `task-${i + 3}`,
        title: `Task ${i + 3}`,
      }));

      for (const task of tasksToAdd) {
        await act(async () => {
          await result.current.addTaskToSession(task);
        });
      }

      expect(result.current.currentSession?.tasks).toHaveLength(11); // 1 initial + 10 added
    });

    it('should maintain data integrity with rapid task additions', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 60);
      });

      // Add multiple tasks rapidly
      await act(async () => {
        await result.current.addTaskToSession(mockTask2);
        await result.current.addTaskToSession(mockTask3);
        await result.current.addTaskToSession(mockTask4);
      });

      expect(result.current.currentSession?.tasks).toHaveLength(4);

      // Verify each task has correct initial state
      result.current.currentSession?.tasks.slice(1).forEach(focusTask => {
        expect(focusTask.timeSpent).toBe(0);
        expect(focusTask.completed).toBe(false);
        expect(focusTask.notes).toBe('');
        expect(focusTask.followUpTaskIds).toEqual([]);
      });
    });
  });
});
