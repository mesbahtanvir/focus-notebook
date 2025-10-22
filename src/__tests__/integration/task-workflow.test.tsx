/**
 * Integration Tests: Task Management Workflow
 * 
 * Tests the complete task lifecycle:
 * 1. Creating tasks
 * 2. Organizing tasks (status, priority, category)
 * 3. Completing tasks
 * 4. Recurring task behavior
 * 5. Task filtering and search
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from '@/store/useTasks';

// Mock dependencies
jest.mock('@/db');
jest.mock('@/lib/syncEngine');
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user' }, loading: false }),
}));

describe.skip('Task Management Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Task Creation and Completion Flow', () => {
    it('should create, update, and complete a task', async () => {
      const { result } = renderHook(() => useTasks());

      // Step 1: Create a new task
      await act(async () => {
        await result.current.add({
          title: 'Complete project documentation',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 60,
          notes: 'Include API documentation and usage examples',
          status: 'active'
        });
      });

      expect(result.current.tasks).toHaveLength(1);
      const task = result.current.tasks[0];
      expect(task.title).toBe('Complete project documentation');
      expect(task.done).toBe(false);
      expect(task.status).toBe('active');

      // Step 2: Update task details
      await act(async () => {
        await result.current.updateTask(task.id, {
          priority: 'urgent',
          dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        });
      });

      expect(result.current.tasks[0].priority).toBe('urgent');
      expect(result.current.tasks[0].dueDate).toBeDefined();

      // Step 3: Complete the task
      await act(async () => {
        await result.current.toggle(task.id);
      });

      expect(result.current.tasks[0].done).toBe(true);
      expect(result.current.tasks[0].completedAt).toBeDefined();
      expect(result.current.tasks[0].status).toBe('completed');

      // Step 4: Uncomplete the task
      await act(async () => {
        await result.current.toggle(task.id);
      });

      expect(result.current.tasks[0].done).toBe(false);
      expect(result.current.tasks[0].completedAt).toBeUndefined();
      expect(result.current.tasks[0].status).toBe('active');
    });
  });

  describe('Recurring Task Workflow', () => {
    it('should handle daily recurring task lifecycle', async () => {
      const { result } = renderHook(() => useTasks());

      // Create a daily recurring task
      await act(async () => {
        await result.current.add({
          title: 'Morning meditation',
          category: 'pleasure',
          priority: 'high',
          recurrence: { type: 'daily', frequency: 30 },
          estimatedMinutes: 15,
          status: 'active',
        });
      });

      const taskId = result.current.tasks[0].id;

      // Complete it for day 1
      await act(async () => {
        await result.current.toggle(taskId);
      });

      expect(result.current.tasks[0].done).toBe(true);
      expect(result.current.tasks[0].status).toBe('active'); // Still active for recurring
      expect(result.current.tasks[0].completionCount).toBe(1);

      // Simulate next day reset
      await act(async () => {
        await result.current.resetDailyTasks();
      });

      expect(result.current.tasks[0].done).toBe(false);
      expect(result.current.tasks[0].completionCount).toBe(1); // Count persists

      // Complete it for day 2
      await act(async () => {
        await result.current.toggle(taskId);
      });

      expect(result.current.tasks[0].completionCount).toBe(2);
    });

    it('should handle weekly recurring task with frequency limit', async () => {
      const { result } = renderHook(() => useTasks());

      // Create a weekly recurring task (3 times per week)
      await act(async () => {
        await result.current.add({
          title: 'Gym workout',
          category: 'pleasure',
          priority: 'medium',
          recurrence: { type: 'weekly', frequency: 3 },
          estimatedMinutes: 45,
          status: 'active'
        });
      });

      const taskId = result.current.tasks[0].id;

      // Complete it 3 times
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.toggle(taskId);
          await result.current.toggle(taskId); // Toggle back to incomplete
        });
      }

      expect(result.current.tasks[0].completionCount).toBe(3);

      // Simulate week reset
      await act(async () => {
        await result.current.resetWeeklyTasks();
      });

      expect(result.current.tasks[0].completionCount).toBe(0);
    });
  });

  describe('Task Organization Workflow', () => {
    it('should organize tasks by status progression', async () => {
      const { result } = renderHook(() => useTasks());

      // Create a task in backlog
      await act(async () => {
        await result.current.add({
          title: 'Future feature idea',
          category: 'mastery',
          priority: 'low',
          status: 'backlog',
        });
      });

      const taskId = result.current.tasks[0].id;
      expect(result.current.tasks[0].status).toBe('backlog');

      // Move to active
      await act(async () => {
        await result.current.updateTask(taskId, { status: 'active' });
      });

      expect(result.current.tasks[0].status).toBe('active');

      // Complete it
      await act(async () => {
        await result.current.toggle(taskId);
      });

      expect(result.current.tasks[0].status).toBe('completed');
    });

    it('should filter tasks by multiple criteria', async () => {
      const { result } = renderHook(() => useTasks());

      // Create diverse set of tasks
      await act(async () => {
        await result.current.add({
          title: 'Urgent mastery task',
          category: 'mastery',
          priority: 'urgent',
          status: 'active'
        });
        await result.current.add({
          title: 'High mastery task',
          category: 'mastery',
          priority: 'high',
          status: 'active'
        });
        await result.current.add({
          title: 'Pleasure task',
          category: 'pleasure',
          priority: 'medium',
          status: 'active'
        });
        await result.current.add({
          title: 'Backlog task',
          category: 'mastery',
          priority: 'low',
          status: 'backlog'
        });
      });

      // Filter: Active mastery tasks
      const activeMastery = result.current.tasks.filter(
        (t) => t.status === 'active' && t.category === 'mastery'
      );
      expect(activeMastery).toHaveLength(2);

      // Filter: High priority or urgent tasks
      const highPriority = result.current.tasks.filter(
        (t) => t.priority === 'urgent' || t.priority === 'high'
      );
      expect(highPriority).toHaveLength(2);

      // Filter: Focus eligible tasks (not errands)
      const focusEligible = result.current.tasks.filter(
        (t) => t.focusEligible !== false
      );
      expect(focusEligible).toHaveLength(4);
    });
  });

  describe('Errand Task Workflow', () => {
    it('should handle errand tasks separately from focus tasks', async () => {
      const { result } = renderHook(() => useTasks());

      // Create mix of focus and errand tasks
      await act(async () => {
        await result.current.add({
          title: 'Write code',
          category: 'mastery',
          priority: 'high',
          focusEligible: true,
          status: 'active'
        });
        await result.current.add({
          title: 'Go shopping',
          category: 'pleasure',
          priority: 'medium',
          focusEligible: false,
          status: 'active'
        });
        await result.current.add({
          title: 'Mail package',
          category: 'mastery',
          priority: 'low',
          focusEligible: false,
          status: 'active'
        });
      });

      // Filter focus-eligible tasks
      const focusTasks = result.current.tasks.filter((t) => t.focusEligible !== false);
      expect(focusTasks).toHaveLength(1);

      // Filter errands
      const errands = result.current.tasks.filter((t) => t.focusEligible === false);
      expect(errands).toHaveLength(2);
    });

    it('should allow converting between focus and errand tasks', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Meeting prep',
          category: 'mastery',
          priority: 'high',
          focusEligible: true,
          status: 'active'
        });
      });

      const taskId = result.current.tasks[0].id;

      // Convert to errand (meeting moved to in-person)
      await act(async () => {
        await result.current.updateTask(taskId, { focusEligible: false });
      });

      expect(result.current.tasks[0].focusEligible).toBe(false);

      // Convert back to focus task (meeting back to virtual)
      await act(async () => {
        await result.current.updateTask(taskId, { focusEligible: true });
      });

      expect(result.current.tasks[0].focusEligible).toBe(true);
    });
  });

  describe('Task Time Management', () => {
    it('should track estimated vs actual time', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Write blog post',
          category: 'mastery',
          priority: 'high',
          estimatedMinutes: 60,
          status: 'active'
        });
      });

      const taskId = result.current.tasks[0].id;
      expect(result.current.tasks[0].estimatedMinutes).toBe(60);

      // Update with actual time after completion
      await act(async () => {
        await result.current.toggle(taskId); // Complete
        await result.current.updateTask(taskId, {
          actualMinutes: 75, // Took longer than expected
        });
      });

      expect(result.current.tasks[0].actualMinutes).toBe(75);
    });
  });

  describe('Task Dependencies and Relationships', () => {
    it('should handle tasks with due dates', async () => {
      const { result } = renderHook(() => useTasks());

      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

      await act(async () => {
        await result.current.add({
          title: 'Urgent deadline',
          category: 'mastery',
          priority: 'urgent',
          dueDate: tomorrow,
          status: 'active'
        });
        await result.current.add({
          title: 'Future task',
          category: 'mastery',
          priority: 'medium',
          dueDate: nextWeek,
          status: 'active'
        });
      });

      // Sort by due date
      const sortedByDueDate = [...result.current.tasks].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      expect(sortedByDueDate[0].title).toBe('Urgent deadline');
    });

    it('should support task tags for organization', async () => {
      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.add({
          title: 'Project Alpha - Design',
          category: 'mastery',
          priority: 'high',
          tags: ['project-alpha', 'design', 'ui'],
          status: 'active'
        });
        await result.current.add({
          title: 'Project Alpha - Implementation',
          category: 'mastery',
          priority: 'high',
          tags: ['project-alpha', 'development'],
          status: 'active'
        });
        await result.current.add({
          title: 'Project Beta - Planning',
          category: 'mastery',
          priority: 'medium',
          tags: ['project-beta', 'planning'],
          status: 'active'
        });
      });

      // Filter by tag
      const projectAlphaTasks = result.current.tasks.filter((t) =>
        t.tags?.includes('project-alpha')
      );
      expect(projectAlphaTasks).toHaveLength(2);

      const designTasks = result.current.tasks.filter((t) => t.tags?.includes('design'));
      expect(designTasks).toHaveLength(1);
    });
  });
});
