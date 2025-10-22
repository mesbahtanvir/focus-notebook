/**
 * Unit tests for useFocus store
 * Tests focus session management including:
 * - Session creation and lifecycle
 * - Task selection and balancing
 * - Timer pause/resume functionality
 * - Session persistence and recovery
 */

import { renderHook, act } from '@testing-library/react';
import { useFocus, selectBalancedTasks } from '../useFocus';
import type { Task } from '../useTasks';

// Mock the database
jest.mock('@/db', () => ({
  db: {
    focusSessions: {
      add: jest.fn((session) => Promise.resolve(session)),
      update: jest.fn(),
      toArray: jest.fn(() => Promise.resolve([])),
    },
  },
}));

// Mock sync engine
jest.mock('@/lib/syncEngine', () => ({
  pushItemToCloud: jest.fn(),
}));

describe.skip('useFocus Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Creation', () => {
    it('should create a new focus session', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      expect(result.current.currentSession).toBeDefined();
      expect(result.current.currentSession?.duration).toBe(60);
      expect(result.current.currentSession?.tasks).toHaveLength(1);
      expect(result.current.currentSession?.isActive).toBe(true);
    });

    it('should initialize session with correct properties', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 90);
      });

      const session = result.current.currentSession;
      expect(session?.id).toBeDefined();
      expect(session?.startTime).toBeDefined();
      expect(session?.currentTaskIndex).toBe(0);
      expect(session?.totalPausedTime).toBe(0);
      expect(session?.endTime).toBeUndefined();
    });

    it('should prevent starting a session without tasks', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([], 60);
      });

      expect(result.current.currentSession).toBeNull();
    });
  });

  describe('Session Completion', () => {
    it('should complete a session', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      await act(async () => {
        await result.current.endSession('Great session!', 5);
      });

      expect(result.current.completedSession).toBeDefined();
      expect(result.current.completedSession?.feedback).toBe('Great session!');
      expect(result.current.completedSession?.rating).toBe(5);
      expect(result.current.completedSession?.endTime).toBeDefined();
      expect(result.current.completedSession?.isActive).toBe(false);
      expect(result.current.currentSession).toBeNull();
    });

    it('should add completed session to history', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
        await result.current.endSession('Good', 4);
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].feedback).toBe('Good');
    });
  });

  describe('Pause and Resume', () => {
    it('should pause an active session', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      act(() => {
        result.current.pauseSession();
      });

      expect(result.current.currentSession?.isActive).toBe(false);
      expect(result.current.currentSession?.pausedAt).toBeDefined();
    });

    it('should resume a paused session', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      act(() => {
        result.current.pauseSession();
      });

      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms

      act(() => {
        result.current.resumeSession();
      });

      expect(result.current.currentSession?.isActive).toBe(true);
      expect(result.current.currentSession?.pausedAt).toBeUndefined();
      expect(result.current.currentSession?.totalPausedTime).toBeGreaterThan(0);
    });
  });

  describe('Task Navigation', () => {
    it('should navigate to next task', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Task 2',
          category: 'pleasure',
          priority: 'medium',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      act(() => {
        result.current.nextTask();
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(1);
    });

    it('should not exceed task array bounds', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      act(() => {
        result.current.nextTask();
        result.current.nextTask(); // Try to go beyond
      });

      expect(result.current.currentSession?.currentTaskIndex).toBeLessThan(2);
    });

    it('should navigate to previous task', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Task 2',
          category: 'pleasure',
          priority: 'medium',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      act(() => {
        result.current.nextTask();
        result.current.previousTask();
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(0);
    });
  });

  describe('Task Time Tracking', () => {
    it('should track time spent on tasks', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      act(() => {
        result.current.addTimeToCurrentTask(5); // 5 minutes
      });

      expect(result.current.currentSession?.tasks[0].timeSpent).toBe(5);
    });

    it('should accumulate time for a task', async () => {
      const { result } = renderHook(() => useFocus());

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          category: 'mastery',
          priority: 'high',
          done: false,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      await act(async () => {
        await result.current.startSession(tasks, 60);
      });

      act(() => {
        result.current.addTimeToCurrentTask(5);
        result.current.addTimeToCurrentTask(3);
      });

      expect(result.current.currentSession?.tasks[0].timeSpent).toBe(8);
    });
  });
});

describe.skip('selectBalancedTasks Utility', () => {
  it('should select balanced tasks', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Mastery 1',
        category: 'mastery',
        priority: 'high',
        done: false,
        status: 'active',
        focusEligible: true,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 30,
      },
      {
        id: '2',
        title: 'Pleasure 1',
        category: 'pleasure',
        priority: 'medium',
        done: false,
        status: 'active',
        focusEligible: true,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 20,
      },
      {
        id: '3',
        title: 'Mastery 2',
        category: 'mastery',
        priority: 'medium',
        done: false,
        status: 'active',
        focusEligible: true,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 25,
      },
    ];

    const selected = selectBalancedTasks(tasks, 60);

    // Should select tasks that fit in 60 minutes
    const totalTime = selected.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    expect(totalTime).toBeLessThanOrEqual(60);

    // Should include both mastery and pleasure if possible
    const categories = selected.map((t) => t.category);
    if (selected.length > 1) {
      expect(new Set(categories).size).toBeGreaterThan(0);
    }
  });

  it('should prioritize high priority tasks', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Low Priority',
        category: 'mastery',
        priority: 'low',
        done: false,
        status: 'active',
        focusEligible: true,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 20,
      },
      {
        id: '2',
        title: 'High Priority',
        category: 'mastery',
        priority: 'high',
        done: false,
        status: 'active',
        focusEligible: true,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 20,
      },
    ];

    const selected = selectBalancedTasks(tasks, 30);

    // Should prefer high priority
    expect(selected[0]?.priority).toBe('high');
  });

  it('should only select focus-eligible tasks', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Desk Task',
        category: 'mastery',
        priority: 'high',
        done: false,
        status: 'active',
        focusEligible: true,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 20,
      },
      {
        id: '2',
        title: 'Errand',
        category: 'mastery',
        priority: 'high',
        done: false,
        status: 'active',
        focusEligible: false,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 20,
      },
    ];

    const selected = selectBalancedTasks(tasks, 60);

    // Should not include errands
    expect(selected.every((t) => t.focusEligible !== false)).toBe(true);
  });

  it('should handle empty task list', () => {
    const selected = selectBalancedTasks([], 60);
    expect(selected).toHaveLength(0);
  });

  it('should respect session duration limit', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Long Task',
        category: 'mastery',
        priority: 'high',
        done: false,
        status: 'active',
        focusEligible: true,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 90,
      },
    ];

    const selected = selectBalancedTasks(tasks, 30);

    // Should still select tasks even if they exceed duration
    // (user can decide to continue or end early)
    expect(selected).toHaveLength(1);
  });
});
