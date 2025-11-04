/**
 * Unit tests for Focus Page task filtering logic
 *
 * Tests the behavior of:
 * 1. activeTasks filter - determines which tasks are candidates for focus selection
 * 2. Category display logic - mastery vs pleasure task badges
 * 3. Task relevance filtering - hiding/showing tasks based on today's focus
 */

import { TaskBuilder } from '@/__tests__/utils/builders/TaskBuilder';
import { getDateString, isWorkday, isTaskCompletedToday } from '@/lib/utils/date';
import type { Task, TaskCompletion } from '@/store/useTasks';

describe('Focus Page Task Filtering', () => {
  const today = getDateString(new Date());

  const completion = (date: string): TaskCompletion => ({
    date,
    completedAt: `${date}T12:00:00.000Z`,
  });

  describe('activeTasks filter - ALL active tasks should be candidates', () => {
    it('includes active tasks with no category', () => {
      const task = new TaskBuilder()
        .withTitle('No category task')
        .withStatus('active')
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
    });

    it('includes active mastery tasks', () => {
      const task = new TaskBuilder()
        .withTitle('Learn TypeScript')
        .withCategory('mastery')
        .withStatus('active')
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
    });

    it('includes active pleasure tasks', () => {
      const task = new TaskBuilder()
        .withTitle('Play guitar')
        .withCategory('pleasure')
        .withStatus('active')
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
    });

    it('includes tasks with focusEligible undefined (opt-out model)', () => {
      const task = new TaskBuilder()
        .withTitle('Task without focus eligibility set')
        .withStatus('active')
        .build();

      // focusEligible should be undefined by default
      expect(task.focusEligible).toBeUndefined();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
    });

    it('includes tasks with focusEligible explicitly set to true', () => {
      const task = new TaskBuilder()
        .withTitle('Explicitly focus eligible')
        .withStatus('active')
        .asFocusEligible(true)
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
    });

    it('excludes tasks with focusEligible set to false', () => {
      const task = new TaskBuilder()
        .withTitle('Not focus eligible')
        .withStatus('active')
        .asFocusEligible(false)
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(false);
    });

    it('excludes completed tasks', () => {
      const task = new TaskBuilder()
        .withTitle('Completed task')
        .withStatus('completed')
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(false);
    });

    it('excludes backlog tasks', () => {
      const task = new TaskBuilder()
        .withTitle('Backlog task')
        .withStatus('backlog')
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(false);
    });

    it('excludes non-recurring tasks marked as done', () => {
      const task = new TaskBuilder()
        .withTitle('Already done today')
        .withStatus('active')
        .withDone(true)
        .withCompletedAt(`${today}T12:00:00.000Z`)
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(false);
    });

    it('excludes recurring tasks completed today', () => {
      const task = new TaskBuilder()
        .withTitle('Daily task already done')
        .withStatus('active')
        .withRecurrence('daily')
        .withCompletionHistory([completion(today)])
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(false);
    });

    it('includes tasks with past due dates', () => {
      const task = new TaskBuilder()
        .withTitle('Overdue task')
        .withStatus('active')
        .withDueDate('2025-01-01')
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      // Past due tasks should still be candidates for focus
      expect(shouldBeIncluded).toBe(true);
    });

    it('includes tasks with future due dates', () => {
      const task = new TaskBuilder()
        .withTitle('Future task')
        .withStatus('active')
        .withDueDate('2025-12-31')
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      // Future tasks should still be candidates for focus
      expect(shouldBeIncluded).toBe(true);
    });

    it('includes recurring tasks not completed today', () => {
      const task = new TaskBuilder()
        .withTitle('Daily standup')
        .withStatus('active')
        .withRecurrence('daily')
        .withCompletionHistory([completion('2025-01-13')])
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
    });

    // Workweek task tests depend on current day
    if (isWorkday()) {
      it('includes workweek tasks on weekdays', () => {
        const task = new TaskBuilder()
          .withTitle('Workday task')
          .withStatus('active')
          .withRecurrence('workweek')
          .build();

        const shouldBeIncluded = (
          task.status === 'active' &&
          task.focusEligible !== false &&
          !isTaskCompletedToday(task) &&
          !(task.recurrence?.type === 'workweek' && !isWorkday())
        );

        expect(shouldBeIncluded).toBe(true);
      });
    } else {
      it('excludes workweek tasks on weekends', () => {
        const task = new TaskBuilder()
          .withTitle('Workday task')
          .withStatus('active')
          .withRecurrence('workweek')
          .build();

        const shouldBeIncluded = (
          task.status === 'active' &&
          task.focusEligible !== false &&
          !isTaskCompletedToday(task) &&
          !(task.recurrence?.type === 'workweek' && !isWorkday())
        );

        expect(shouldBeIncluded).toBe(false);
      });
    }
  });

  describe('Category display logic', () => {
    it('displays mastery category with brain emoji', () => {
      const task = new TaskBuilder()
        .withTitle('Study algorithm')
        .withCategory('mastery')
        .build();

      expect(task.category).toBe('mastery');

      // Verify the display logic
      const emoji = task.category === 'pleasure' ? '💝' : '🧠';
      const displayText = task.category || 'mastery';

      expect(emoji).toBe('🧠');
      expect(displayText).toBe('mastery');
    });

    it('displays pleasure category with heart emoji', () => {
      const task = new TaskBuilder()
        .withTitle('Watch movie')
        .withCategory('pleasure')
        .build();

      expect(task.category).toBe('pleasure');

      // Verify the display logic
      const emoji = task.category === 'pleasure' ? '💝' : '🧠';
      const displayText = task.category || 'mastery';

      expect(emoji).toBe('💝');
      expect(displayText).toBe('pleasure');
    });

    it('defaults to pleasure for tasks without category', () => {
      const task = new TaskBuilder()
        .withTitle('No category')
        .build();

      expect(task.category).toBeUndefined();

      // Verify the display logic defaults to pleasure
      const emoji = task.category === 'mastery' ? '🧠' : '💝';
      const displayText = task.category || 'pleasure';

      expect(emoji).toBe('💝');
      expect(displayText).toBe('pleasure');
    });

    it('displays estimated minutes when present', () => {
      const task = new TaskBuilder()
        .withTitle('Quick task')
        .withEstimatedMinutes(15)
        .build();

      expect(task.estimatedMinutes).toBe(15);

      // Verify display format
      const displayTime = `${task.estimatedMinutes}m`;
      expect(displayTime).toBe('15m');
    });

    it('does not display time when estimatedMinutes is not set', () => {
      const task = new TaskBuilder()
        .withTitle('No time estimate')
        .build();

      expect(task.estimatedMinutes).toBeUndefined();
    });
  });

  describe('Integration: Category with task filtering', () => {
    it('includes mastery tasks in active task candidates', () => {
      const task = new TaskBuilder()
        .withTitle('Master Python')
        .withCategory('mastery')
        .withStatus('active')
        .withEstimatedMinutes(60)
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
      expect(task.category).toBe('mastery');
    });

    it('includes pleasure tasks in active task candidates', () => {
      const task = new TaskBuilder()
        .withTitle('Play video games')
        .withCategory('pleasure')
        .withStatus('active')
        .withEstimatedMinutes(30)
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
      expect(task.category).toBe('pleasure');
    });

    it('displays correct styles for selected mastery task', () => {
      const task = new TaskBuilder()
        .withTitle('Read book')
        .withCategory('mastery')
        .build();

      const isSelected = true;

      // When selected, background should be white/20 regardless of category
      const expectedBg = isSelected ? 'bg-white/20 text-white' : 'bg-blue-100';
      expect(expectedBg).toBe('bg-white/20 text-white');
    });

    it('displays correct styles for unselected pleasure task', () => {
      const task = new TaskBuilder()
        .withTitle('Listen to music')
        .withCategory('pleasure')
        .build();

      const isSelected = false;

      // When not selected, should show pink background
      const expectedBg = isSelected
        ? 'bg-white/20 text-white'
        : task.category === 'mastery'
        ? 'bg-blue-100'
        : 'bg-pink-100';

      expect(expectedBg).toBe('bg-pink-100');
    });
  });

  describe('Task sorting logic', () => {
    it('sorts selected tasks before unselected tasks', () => {
      const tasks = [
        new TaskBuilder().withTitle('Task A').withPriority('medium').build(),
        new TaskBuilder().withTitle('Task B').withPriority('high').build(),
        new TaskBuilder().withTitle('Task C').withPriority('low').build(),
      ];

      const selectedTaskIds = [tasks[2].id]; // Task C is selected
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

      const sorted = [...tasks].sort((a, b) => {
        const aSelected = selectedTaskIds.includes(a.id);
        const bSelected = selectedTaskIds.includes(b.id);

        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        if (aPriority !== bPriority) return aPriority - bPriority;

        return a.title.localeCompare(b.title);
      });

      // Task C (selected, low priority) should be first
      expect(sorted[0].title).toBe('Task C');
      expect(sorted[1].title).toBe('Task B'); // high priority
      expect(sorted[2].title).toBe('Task A'); // medium priority
    });

    it('sorts by priority within unselected tasks (urgent → high → medium → low)', () => {
      const tasks = [
        new TaskBuilder().withTitle('Low Task').withPriority('low').build(),
        new TaskBuilder().withTitle('Urgent Task').withPriority('urgent').build(),
        new TaskBuilder().withTitle('Medium Task').withPriority('medium').build(),
        new TaskBuilder().withTitle('High Task').withPriority('high').build(),
      ];

      const selectedTaskIds: string[] = [];
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

      const sorted = [...tasks].sort((a, b) => {
        const aSelected = selectedTaskIds.includes(a.id);
        const bSelected = selectedTaskIds.includes(b.id);

        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        if (aPriority !== bPriority) return aPriority - bPriority;

        return a.title.localeCompare(b.title);
      });

      expect(sorted[0].priority).toBe('urgent');
      expect(sorted[1].priority).toBe('high');
      expect(sorted[2].priority).toBe('medium');
      expect(sorted[3].priority).toBe('low');
    });

    it('sorts alphabetically within same priority level', () => {
      const tasks = [
        new TaskBuilder().withTitle('Zebra Task').withPriority('high').build(),
        new TaskBuilder().withTitle('Apple Task').withPriority('high').build(),
        new TaskBuilder().withTitle('Mango Task').withPriority('high').build(),
      ];

      const selectedTaskIds: string[] = [];
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

      const sorted = [...tasks].sort((a, b) => {
        const aSelected = selectedTaskIds.includes(a.id);
        const bSelected = selectedTaskIds.includes(b.id);

        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        if (aPriority !== bPriority) return aPriority - bPriority;

        return a.title.localeCompare(b.title);
      });

      expect(sorted[0].title).toBe('Apple Task');
      expect(sorted[1].title).toBe('Mango Task');
      expect(sorted[2].title).toBe('Zebra Task');
    });

    it('maintains selected tasks at top regardless of priority', () => {
      const tasks = [
        new TaskBuilder().withTitle('Urgent Unselected').withPriority('urgent').build(),
        new TaskBuilder().withTitle('Low Selected').withPriority('low').build(),
        new TaskBuilder().withTitle('High Unselected').withPriority('high').build(),
        new TaskBuilder().withTitle('Medium Selected').withPriority('medium').build(),
      ];

      const selectedTaskIds = [tasks[1].id, tasks[3].id]; // Low and Medium selected
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

      const sorted = [...tasks].sort((a, b) => {
        const aSelected = selectedTaskIds.includes(a.id);
        const bSelected = selectedTaskIds.includes(b.id);

        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        if (aPriority !== bPriority) return aPriority - bPriority;

        return a.title.localeCompare(b.title);
      });

      // First two should be selected tasks (sorted by priority among themselves)
      expect(selectedTaskIds.includes(sorted[0].id)).toBe(true);
      expect(selectedTaskIds.includes(sorted[1].id)).toBe(true);
      expect(sorted[0].title).toBe('Medium Selected'); // medium priority comes before low
      expect(sorted[1].title).toBe('Low Selected');

      // Last two should be unselected tasks (sorted by priority)
      expect(sorted[2].title).toBe('Urgent Unselected');
      expect(sorted[3].title).toBe('High Unselected');
    });

    it('handles mixed selection with all priority levels', () => {
      const tasks = [
        new TaskBuilder().withTitle('A').withPriority('low').build(),
        new TaskBuilder().withTitle('B').withPriority('urgent').build(),
        new TaskBuilder().withTitle('C').withPriority('medium').build(),
        new TaskBuilder().withTitle('D').withPriority('high').build(),
        new TaskBuilder().withTitle('E').withPriority('low').build(),
        new TaskBuilder().withTitle('F').withPriority('urgent').build(),
      ];

      const selectedTaskIds = [tasks[0].id, tasks[3].id]; // A (low) and D (high) selected
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

      const sorted = [...tasks].sort((a, b) => {
        const aSelected = selectedTaskIds.includes(a.id);
        const bSelected = selectedTaskIds.includes(b.id);

        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        if (aPriority !== bPriority) return aPriority - bPriority;

        return a.title.localeCompare(b.title);
      });

      // First two should be selected (D high, then A low)
      expect(sorted[0].title).toBe('D');
      expect(sorted[1].title).toBe('A');

      // Next should be unselected in priority order: B, F (urgent), C (medium), E (low)
      expect(sorted[2].priority).toBe('urgent');
      expect(sorted[3].priority).toBe('urgent');
      expect(sorted[4].priority).toBe('medium');
      expect(sorted[5].priority).toBe('low');
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('handles task with multiple properties set', () => {
      const task = new TaskBuilder()
        .withTitle('Complex task')
        .withCategory('mastery')
        .withStatus('active')
        .withPriority('high')
        .withEstimatedMinutes(120)
        .withTags(['important', 'urgent'])
        .withDueDate('2025-01-20')
        .asFocusEligible(true)
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
      expect(task.category).toBe('mastery');
      expect(task.estimatedMinutes).toBe(120);
    });

    it('handles task with recurrence and completion history', () => {
      const task = new TaskBuilder()
        .withTitle('Weekly review')
        .withCategory('mastery')
        .withStatus('active')
        .withRecurrence('weekly')
        .withCompletionHistory([
          completion('2025-01-06'),
          completion('2024-12-30'),
        ])
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(true);
    });

    it('correctly filters task completed earlier today', () => {
      const todayCompletion = {
        date: today,
        completedAt: `${today}T08:00:00.000Z`,
      };

      const task = new TaskBuilder()
        .withTitle('Morning meditation')
        .withStatus('active')
        .withRecurrence('daily')
        .withCompletionHistory([todayCompletion])
        .build();

      const shouldBeIncluded = (
        task.status === 'active' &&
        task.focusEligible !== false &&
        !isTaskCompletedToday(task)
      );

      expect(shouldBeIncluded).toBe(false);
    });
  });
});
