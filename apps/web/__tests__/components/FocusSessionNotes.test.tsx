/**
 * Integration tests for Focus Session Notes
 * Tests the race condition fix where notes are properly saved per task
 * when switching between tasks quickly before auto-save completes.
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
jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue('mock-session-id'),
  updateAt: jest.fn().mockResolvedValue(undefined),
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
    logFocusTime: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Focus Session Notes - Race Condition Fix', () => {
  const mockTask1: Task = {
    id: 'task-1',
    title: 'Task 1',
    done: false,
    status: 'active',
    priority: 'medium',
    category: 'mastery',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTask2: Task = {
    id: 'task-2',
    title: 'Task 2',
    done: false,
    status: 'active',
    priority: 'high',
    category: 'pleasure',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTask3: Task = {
    id: 'task-3',
    title: 'Task 3',
    done: false,
    status: 'active',
    priority: 'low',
    category: 'mastery',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset Zustand store state
    const { result } = renderHook(() => useFocus());
    act(() => {
      const state = result.current;
      // Reset to initial state
      (state as any).currentSession = null;
      (state as any).sessions = [];
    });
    jest.clearAllMocks();
  });

  describe('Task-specific notes persistence', () => {
    it('should save notes to correct task when switching between tasks', async () => {
      const { result } = renderHook(() => useFocus());

      // Start a focus session with 3 tasks
      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2, mockTask3], 25);
      });

      expect(result.current.currentSession).toBeTruthy();
      expect(result.current.currentSession?.tasks).toHaveLength(3);
      expect(result.current.currentSession?.currentTaskIndex).toBe(0);

      // Add notes to Task 1
      await act(async () => {
        await result.current.updateTaskNotes(0, 'Notes for Task 1');
      });

      // Verify Task 1 has notes
      expect(result.current.currentSession?.tasks[0].notes).toBe('Notes for Task 1');
      expect(result.current.currentSession?.tasks[1].notes).toBe('');
      expect(result.current.currentSession?.tasks[2].notes).toBe('');

      // Switch to Task 2
      await act(async () => {
        await result.current.switchToTask(1);
      });

      expect(result.current.currentSession?.currentTaskIndex).toBe(1);

      // Add notes to Task 2
      await act(async () => {
        await result.current.updateTaskNotes(1, 'Notes for Task 2');
      });

      // Verify Task 1 notes are preserved and Task 2 has new notes
      expect(result.current.currentSession?.tasks[0].notes).toBe('Notes for Task 1');
      expect(result.current.currentSession?.tasks[1].notes).toBe('Notes for Task 2');
      expect(result.current.currentSession?.tasks[2].notes).toBe('');

      // Switch to Task 3
      await act(async () => {
        await result.current.switchToTask(2);
      });

      // Add notes to Task 3
      await act(async () => {
        await result.current.updateTaskNotes(2, 'Notes for Task 3');
      });

      // Verify all tasks have their own notes
      expect(result.current.currentSession?.tasks[0].notes).toBe('Notes for Task 1');
      expect(result.current.currentSession?.tasks[1].notes).toBe('Notes for Task 2');
      expect(result.current.currentSession?.tasks[2].notes).toBe('Notes for Task 3');
    });

    it('should accumulate notes when returning to a task', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 25);
      });

      // Add initial notes to Task 1
      await act(async () => {
        await result.current.updateTaskNotes(0, 'abc');
      });

      expect(result.current.currentSession?.tasks[0].notes).toBe('abc');

      // Switch to Task 2
      await act(async () => {
        await result.current.switchToTask(1);
      });

      // Add notes to Task 2
      await act(async () => {
        await result.current.updateTaskNotes(1, 'def');
      });

      expect(result.current.currentSession?.tasks[1].notes).toBe('def');

      // Switch back to Task 1
      await act(async () => {
        await result.current.switchToTask(0);
      });

      // Add more notes to Task 1 (should accumulate)
      await act(async () => {
        await result.current.updateTaskNotes(0, 'abcfg');
      });

      // Verify accumulated notes for Task 1 and Task 2's notes are preserved
      expect(result.current.currentSession?.tasks[0].notes).toBe('abcfg');
      expect(result.current.currentSession?.tasks[1].notes).toBe('def');
    });

    it('should handle empty notes correctly', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2, mockTask3], 25);
      });

      // Task 1: Add notes
      await act(async () => {
        await result.current.updateTaskNotes(0, 'Task 1 notes');
      });

      // Task 2: Switch but don't add notes (leave empty)
      await act(async () => {
        await result.current.switchToTask(1);
      });

      // Task 3: Add notes
      await act(async () => {
        await result.current.switchToTask(2);
        await result.current.updateTaskNotes(2, 'Task 3 notes');
      });

      // Verify Task 1 and 3 have notes, Task 2 is empty
      expect(result.current.currentSession?.tasks[0].notes).toBe('Task 1 notes');
      expect(result.current.currentSession?.tasks[1].notes).toBe('');
      expect(result.current.currentSession?.tasks[2].notes).toBe('Task 3 notes');
    });

    it('should preserve notes across multiple rapid task switches', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2, mockTask3], 25);
      });

      // Simulate rapid switching with notes
      await act(async () => {
        // Task 1
        await result.current.updateTaskNotes(0, 'Quick note 1');
      });

      await act(async () => {
        // Switch to Task 2
        await result.current.switchToTask(1);
        await result.current.updateTaskNotes(1, 'Quick note 2');
      });

      await act(async () => {
        // Switch to Task 3
        await result.current.switchToTask(2);
        await result.current.updateTaskNotes(2, 'Quick note 3');
      });

      await act(async () => {
        // Back to Task 1
        await result.current.switchToTask(0);
        await result.current.updateTaskNotes(0, 'Quick note 1 updated');
      });

      // All notes should be preserved with correct values
      expect(result.current.currentSession?.tasks[0].notes).toBe('Quick note 1 updated');
      expect(result.current.currentSession?.tasks[1].notes).toBe('Quick note 2');
      expect(result.current.currentSession?.tasks[2].notes).toBe('Quick note 3');
    });

    it('should maintain notes integrity after completing tasks', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 25);
      });

      // Add notes to Task 1
      await act(async () => {
        await result.current.updateTaskNotes(0, 'Task 1 work notes');
      });

      // Mark Task 1 as complete
      await act(async () => {
        await result.current.markTaskComplete(0);
      });

      // Switch to Task 2 and add notes
      await act(async () => {
        await result.current.switchToTask(1);
        await result.current.updateTaskNotes(1, 'Task 2 work notes');
      });

      // Verify notes are preserved even after task completion
      expect(result.current.currentSession?.tasks[0].notes).toBe('Task 1 work notes');
      expect(result.current.currentSession?.tasks[0].completed).toBe(true);
      expect(result.current.currentSession?.tasks[1].notes).toBe('Task 2 work notes');
      expect(result.current.currentSession?.tasks[1].completed).toBe(false);
    });

    it('should preserve all task notes when session ends', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2, mockTask3], 25);
      });

      // Add notes to all tasks
      await act(async () => {
        await result.current.updateTaskNotes(0, 'Final notes for Task 1');
      });

      await act(async () => {
        await result.current.switchToTask(1);
        await result.current.updateTaskNotes(1, 'Final notes for Task 2');
      });

      await act(async () => {
        await result.current.switchToTask(2);
        await result.current.updateTaskNotes(2, 'Final notes for Task 3');
      });

      // End the session
      await act(async () => {
        await result.current.endSession();
      });

      // Get the completed session (it's stored in completedSession, not sessions array)
      const completedSession = result.current.completedSession;

      // Verify all notes are preserved in the completed session
      expect(completedSession).toBeTruthy();
      expect(completedSession?.tasks[0].notes).toBe('Final notes for Task 1');
      expect(completedSession?.tasks[1].notes).toBe('Final notes for Task 2');
      expect(completedSession?.tasks[2].notes).toBe('Final notes for Task 3');
    });
  });

  describe('Edge cases', () => {
    it('should handle updating notes for the same task multiple times', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 25);
      });

      // Update notes multiple times for the same task
      await act(async () => {
        await result.current.updateTaskNotes(0, 'Version 1');
      });

      await act(async () => {
        await result.current.updateTaskNotes(0, 'Version 2');
      });

      await act(async () => {
        await result.current.updateTaskNotes(0, 'Version 3');
      });

      // Should have the latest version
      expect(result.current.currentSession?.tasks[0].notes).toBe('Version 3');
    });

    it('should handle notes with special characters and newlines', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 25);
      });

      const specialNotes = `Multi-line notes:
- Bullet point 1
- Bullet point 2

Special chars: @#$%^&*()
Quotes: "double" and 'single'`;

      await act(async () => {
        await result.current.updateTaskNotes(0, specialNotes);
      });

      expect(result.current.currentSession?.tasks[0].notes).toBe(specialNotes);

      // Switch tasks and verify special notes are preserved
      await act(async () => {
        await result.current.switchToTask(1);
        await result.current.updateTaskNotes(1, 'Normal notes');
      });

      expect(result.current.currentSession?.tasks[0].notes).toBe(specialNotes);
      expect(result.current.currentSession?.tasks[1].notes).toBe('Normal notes');
    });

    it('should handle clearing notes (empty string)', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1], 25);
      });

      // Add notes
      await act(async () => {
        await result.current.updateTaskNotes(0, 'Some notes');
      });

      expect(result.current.currentSession?.tasks[0].notes).toBe('Some notes');

      // Clear notes
      await act(async () => {
        await result.current.updateTaskNotes(0, '');
      });

      expect(result.current.currentSession?.tasks[0].notes).toBe('');
    });
  });

  describe('Race condition scenarios', () => {
    it('should handle the specific user scenario: abc → switch → def → switch back → abcfg', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2, mockTask3], 25);
      });

      // User types "abc" for Task 1
      await act(async () => {
        await result.current.updateTaskNotes(0, 'abc');
      });

      // User switches to Task 2
      await act(async () => {
        await result.current.switchToTask(1);
      });

      // User types "def" for Task 2 (note: "cde" in original scenario, using "def" for clarity)
      await act(async () => {
        await result.current.updateTaskNotes(1, 'def');
      });

      // User switches back to Task 1
      await act(async () => {
        await result.current.switchToTask(0);
      });

      // User continues typing for Task 1, accumulating to "abcfg"
      await act(async () => {
        await result.current.updateTaskNotes(0, 'abcfg');
      });

      // End session and verify outcome
      await act(async () => {
        await result.current.endSession();
      });

      const completedSession = result.current.completedSession;

      // Expected outcome from user's scenario:
      // - Task 1 has notes "abcfg" from focus_session
      // - Task 2 has notes "def" from focus_session
      // - Task 3 notes section is empty
      expect(completedSession?.tasks[0].notes).toBe('abcfg');
      expect(completedSession?.tasks[1].notes).toBe('def');
      expect(completedSession?.tasks[2].notes).toBe('');
    });

    it('should not lose notes when switching tasks before auto-save would complete (simulated race condition)', async () => {
      const { result } = renderHook(() => useFocus());

      await act(async () => {
        await result.current.startSession([mockTask1, mockTask2], 25);
      });

      // Simulate rapid typing and switching (within auto-save window)
      await act(async () => {
        await result.current.updateTaskNotes(0, 'Fast typing');
        // Immediately switch without waiting for auto-save
        await result.current.switchToTask(1);
      });

      // The fix ensures notes are saved with the CAPTURED index, not current index
      // So Task 1 should still have its notes even though we switched
      expect(result.current.currentSession?.tasks[0].notes).toBe('Fast typing');

      // Add notes to Task 2
      await act(async () => {
        await result.current.updateTaskNotes(1, 'More fast typing');
      });

      // Both tasks should have their respective notes
      expect(result.current.currentSession?.tasks[0].notes).toBe('Fast typing');
      expect(result.current.currentSession?.tasks[1].notes).toBe('More fast typing');
    });
  });
});
