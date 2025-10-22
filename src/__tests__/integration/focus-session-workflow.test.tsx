/**
 * Integration Tests: Focus Session Workflow
 * 
 * Tests the complete focus session lifecycle:
 * 1. Session creation with task selection
 * 2. Timer management (pause/resume)
 * 3. Task switching during session
 * 4. Task completion during session
 * 5. Session persistence and recovery
 * 6. Session completion and statistics
 */

import { renderHook, act } from '@testing-library/react';
import { useTasks } from '@/store/useTasks';
import { useFocus } from '@/store/useFocus';

jest.mock('@/db');
jest.mock('@/lib/syncEngine');

describe('Focus Session Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.skip('Complete Focus Session Flow', () => {
    it('should complete a full focus session from start to finish', async () => {
      const tasksHook = renderHook(() => useTasks());
      const focusHook = renderHook(() => useFocus());

      // Step 1: Create tasks
      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Implement authentication',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 45,
          focusEligible: true,
          status: 'active'
        });
        await tasksHook.result.current.add({
          title: 'Read technical article',
          category: 'pleasure',
          priority: 'medium',
          estimatedMinutes: 15,
          focusEligible: true,
          status: 'active'
        });
      });

      const tasks = tasksHook.result.current.tasks;
      expect(tasks).toHaveLength(2);

      // Step 2: Start focus session
      await act(async () => {
        await focusHook.result.current.startSession(tasks, 60);
      });

      expect(focusHook.result.current.currentSession).toBeDefined();
      expect(focusHook.result.current.currentSession?.duration).toBe(60);
      expect(focusHook.result.current.currentSession?.tasks).toHaveLength(2);
      expect(focusHook.result.current.currentSession?.isActive).toBe(true);

      // Step 3: Work on first task for 20 minutes
      act(() => {
        focusHook.result.current.addTimeToCurrentTask(20);
      });

      expect(focusHook.result.current.currentSession?.tasks[0].timeSpent).toBe(20);

      // Step 4: Complete first task
      const firstTaskId = focusHook.result.current.currentSession?.tasks[0].id;
      if (firstTaskId) {
        await act(async () => {
          await tasksHook.result.current.toggle(firstTaskId);
        });
      }

      // Step 5: Move to second task
      act(() => {
        focusHook.result.current.nextTask();
      });

      expect(focusHook.result.current.currentSession?.currentTaskIndex).toBe(1);

      // Step 6: Work on second task for 15 minutes
      act(() => {
        focusHook.result.current.addTimeToCurrentTask(15);
      });

      // Step 7: Complete second task
      const secondTaskId = focusHook.result.current.currentSession?.tasks[1].id;
      if (secondTaskId) {
        await act(async () => {
          await tasksHook.result.current.toggle(secondTaskId);
        });
      }

      // Step 8: End session with feedback
      await act(async () => {
        await focusHook.result.current.endSession('Very productive session!', 5);
      });

      // Verify session completion
      expect(focusHook.result.current.completedSession).toBeDefined();
      expect(focusHook.result.current.completedSession?.feedback).toBe('Very productive session!');
      expect(focusHook.result.current.completedSession?.rating).toBe(5);
      expect(focusHook.result.current.completedSession?.endTime).toBeDefined();
      expect(focusHook.result.current.currentSession).toBeNull();

      // Verify tasks were completed
      const completedTasks = tasksHook.result.current.tasks.filter((t) => t.done);
      expect(completedTasks).toHaveLength(2);
    });
  });

  describe.skip('Session Interruption and Recovery', () => {
    it('should handle session pause and resume', async () => {
      const tasksHook = renderHook(() => useTasks());
      const focusHook = renderHook(() => useFocus());

      // Create and start session
      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Write documentation',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 30,
          focusEligible: true,
          status: 'active'
        });
      });

      const tasks = tasksHook.result.current.tasks;

      await act(async () => {
        await focusHook.result.current.startSession(tasks, 60);
      });

      // Work for some time
      act(() => {
        focusHook.result.current.addTimeToCurrentTask(10);
      });

      // Pause session
      act(() => {
        focusHook.result.current.pauseSession();
      });

      expect(focusHook.result.current.currentSession?.isActive).toBe(false);
      expect(focusHook.result.current.currentSession?.pausedAt).toBeDefined();

      // Simulate waiting (break)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Resume session
      act(() => {
        focusHook.result.current.resumeSession();
      });

      expect(focusHook.result.current.currentSession?.isActive).toBe(true);
      expect(focusHook.result.current.currentSession?.pausedAt).toBeUndefined();
      expect(focusHook.result.current.currentSession?.totalPausedTime).toBeGreaterThan(0);

      // Continue working
      act(() => {
        focusHook.result.current.addTimeToCurrentTask(20);
      });

      expect(focusHook.result.current.currentSession?.tasks[0].timeSpent).toBe(30);
    });

    it('should persist session state for recovery after reload', async () => {
      const tasksHook = renderHook(() => useTasks());
      const focusHook1 = renderHook(() => useFocus());

      // Create session
      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Debug issue',
          category: 'mastery',
          priority: 'urgent',
          estimatedMinutes: 45,
          focusEligible: true,
          status: 'active'
        });
      });

      const tasks = tasksHook.result.current.tasks;

      await act(async () => {
        await focusHook1.result.current.startSession(tasks, 60);
      });

      // Work for a bit
      act(() => {
        focusHook1.result.current.addTimeToCurrentTask(15);
      });

      const sessionId = focusHook1.result.current.currentSession?.id;

      // Simulate app reload - create new hook instance
      const focusHook2 = renderHook(() => useFocus());

      // Load active session
      await act(async () => {
        await focusHook2.result.current.loadActiveSession();
      });

      // Verify session was recovered
      expect(focusHook2.result.current.currentSession?.id).toBe(sessionId);
      expect(focusHook2.result.current.currentSession?.tasks[0].timeSpent).toBe(15);
    });
  });

  describe.skip('Task Switching During Session', () => {
    it('should allow flexible task switching during session', async () => {
      const tasksHook = renderHook(() => useTasks());
      const focusHook = renderHook(() => useFocus());

      // Create multiple tasks
      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Task A',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 20,
          focusEligible: true,
          status: 'active'
        });
        await tasksHook.result.current.add({
          title: 'Task B',
          category: 'pleasure',
          priority: 'medium',
          estimatedMinutes: 15,
          focusEligible: true,
          status: 'active'
        });
        await tasksHook.result.current.add({
          title: 'Task C',
          category: 'mastery',
          priority: 'medium',
          estimatedMinutes: 25,
          focusEligible: true,
          status: 'active'
        });
      });

      const tasks = tasksHook.result.current.tasks;

      await act(async () => {
        await focusHook.result.current.startSession(tasks, 60);
      });

      // Work on Task A
      act(() => {
        focusHook.result.current.addTimeToCurrentTask(5);
      });

      // Switch to Task B
      act(() => {
        focusHook.result.current.nextTask();
      });

      expect(focusHook.result.current.currentSession?.currentTaskIndex).toBe(1);

      // Work on Task B
      act(() => {
        focusHook.result.current.addTimeToCurrentTask(10);
      });

      // Switch to Task C
      act(() => {
        focusHook.result.current.nextTask();
      });

      expect(focusHook.result.current.currentSession?.currentTaskIndex).toBe(2);

      // Switch back to Task A
      act(() => {
        focusHook.result.current.previousTask();
        focusHook.result.current.previousTask();
      });

      expect(focusHook.result.current.currentSession?.currentTaskIndex).toBe(0);

      // Continue working on Task A
      act(() => {
        focusHook.result.current.addTimeToCurrentTask(5);
      });

      // Verify time was accumulated for Task A
      expect(focusHook.result.current.currentSession?.tasks[0].timeSpent).toBe(10);
    });
  });

  describe.skip('Focus Session with Mixed Task Types', () => {
    it('should only include focus-eligible tasks in session', async () => {
      const tasksHook = renderHook(() => useTasks());
      const focusHook = renderHook(() => useFocus());

      // Create mix of focus and errand tasks
      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Code review',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 30,
          focusEligible: true,
          status: 'active'
        });
        await tasksHook.result.current.add({
          title: 'Go to post office',
          category: 'mastery',
          priority: 'medium',
          estimatedMinutes: 20,
          focusEligible: false,
          status: 'active'
        });
        await tasksHook.result.current.add({
          title: 'Write tests',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 45,
          focusEligible: true,
          status: 'active'
        });
      });

      // Filter focus-eligible tasks
      const focusTasks = tasksHook.result.current.tasks.filter(
        (t) => t.focusEligible !== false
      );

      await act(async () => {
        await focusHook.result.current.startSession(focusTasks, 60);
      });

      // Verify only focus tasks in session
      expect(focusHook.result.current.currentSession?.tasks).toHaveLength(2);
      expect(
        focusHook.result.current.currentSession?.tasks.every((t) => t.task.focusEligible !== false)
      ).toBe(true);
    });
  });

  describe.skip('Session Statistics and History', () => {
    it('should track session statistics over time', async () => {
      const tasksHook = renderHook(() => useTasks());
      const focusHook = renderHook(() => useFocus());

      // Session 1
      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Session 1 Task',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 30,
          focusEligible: true,
          status: 'active'
        });
      });

      let tasks = tasksHook.result.current.tasks;

      await act(async () => {
        await focusHook.result.current.startSession(tasks, 60);
        focusHook.result.current.addTimeToCurrentTask(30);
        await focusHook.result.current.endSession('Good session', 4);
      });

      // Session 2
      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Session 2 Task',
          category: 'pleasure',
          priority: 'medium',
          estimatedMinutes: 20,
          focusEligible: true,
          status: 'active'
        });
      });

      tasks = tasksHook.result.current.tasks.filter((t) => !t.done);

      await act(async () => {
        await focusHook.result.current.startSession(tasks, 45);
        focusHook.result.current.addTimeToCurrentTask(20);
        await focusHook.result.current.endSession('Great session!', 5);
      });

      // Verify session history
      expect(focusHook.result.current.sessions).toHaveLength(2);
      expect(focusHook.result.current.sessions[0].rating).toBe(4);
      expect(focusHook.result.current.sessions[1].rating).toBe(5);
    });
  });

  describe.skip('Session Edge Cases', () => {
    it('should handle session with no tasks', async () => {
      const focusHook = renderHook(() => useFocus());

      await act(async () => {
        await focusHook.result.current.startSession([], 60);
      });

      // Should not create a session
      expect(focusHook.result.current.currentSession).toBeNull();
    });

    it('should handle very short session duration', async () => {
      const tasksHook = renderHook(() => useTasks());
      const focusHook = renderHook(() => useFocus());

      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Quick task',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 5,
          focusEligible: true,
          status: 'active'
        });
      });

      const tasks = tasksHook.result.current.tasks;

      await act(async () => {
        await focusHook.result.current.startSession(tasks, 15);
      });

      expect(focusHook.result.current.currentSession?.duration).toBe(15);
    });

    it('should handle very long session duration', async () => {
      const tasksHook = renderHook(() => useTasks());
      const focusHook = renderHook(() => useFocus());

      await act(async () => {
        await tasksHook.result.current.add({
          title: 'Deep work task',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 180,
          focusEligible: true,
          status: 'active'
        });
      });

      const tasks = tasksHook.result.current.tasks;

      await act(async () => {
        await focusHook.result.current.startSession(tasks, 240); // 4 hours
      });

      expect(focusHook.result.current.currentSession?.duration).toBe(240);
    });
  });
});
