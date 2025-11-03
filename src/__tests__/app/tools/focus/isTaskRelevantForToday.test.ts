import { isTaskRelevantForToday } from '@/app/tools/focus/isTaskRelevantForToday';
import { TaskBuilder } from '@/__tests__/utils/builders/TaskBuilder';
import type { TaskCompletion } from '@/store/useTasks';

describe('isTaskRelevantForToday', () => {
  const today = '2025-01-14';

  const completion = (date: string): TaskCompletion => ({
    date,
    completedAt: `${date}T12:00:00.000Z`,
  });

  it('hides an on-time task due next Wednesday when focusing on today', () => {
    const task = new TaskBuilder()
      .withTitle('Prepare status report')
      .withDueDate('2025-01-22')
      .build();

    expect(isTaskRelevantForToday(task, today)).toBe(false);
  });

  it('keeps a daily recurring task completed yesterday visible today', () => {
    const task = new TaskBuilder()
      .withTitle('Daily meditation')
      .withRecurrence('daily')
      .withDone(true)
      .withCompletionHistory([completion('2025-01-13')])
      .withCompletedAt('2025-01-13T18:00:00.000Z')
      .build();

    expect(isTaskRelevantForToday(task, today)).toBe(true);
  });

  it('keeps a workweek recurring task completed on Monday visible on Tuesday', () => {
    const task = new TaskBuilder()
      .withTitle('Standup notes')
      .withRecurrence('workweek')
      .withDone(true)
      .withCompletionHistory([completion('2025-01-13')])
      .withCompletedAt('2025-01-13T16:30:00.000Z')
      .build();

    expect(isTaskRelevantForToday(task, today)).toBe(true);
  });

  it('hides a weekly task after it was completed earlier this week', () => {
    const task = new TaskBuilder()
      .withTitle('Weekly planning')
      .withRecurrence('weekly')
      .withDone(true)
      .withCompletionHistory([completion('2025-01-13')])
      .withCompletedAt('2025-01-13T09:30:00.000Z')
      .build();

    expect(isTaskRelevantForToday(task, today)).toBe(false);
  });

  it('keeps a task without a due date visible by default', () => {
    const task = new TaskBuilder()
      .withTitle('Someday maybe idea')
      .build();

    expect(isTaskRelevantForToday(task, today)).toBe(true);
  });

  it('keeps a daily recurring task without completion history visible', () => {
    const task = new TaskBuilder()
      .withTitle('Daily journaling')
      .withRecurrence('daily')
      .withDone(false)
      .build();

    expect(isTaskRelevantForToday(task, today)).toBe(true);
  });

  it('keeps a weekly recurring task without any completions visible', () => {
    const task = new TaskBuilder()
      .withTitle('Weekly planning draft')
      .withRecurrence('weekly')
      .withDone(false)
      .withCompletionHistory([])
      .withCompletedAt(undefined)
      .build();

    expect(isTaskRelevantForToday(task, today)).toBe(true);
  });

  it('keeps a non-recurring task due today visible', () => {
    const task = new TaskBuilder()
      .withTitle('Pay utilities')
      .withDueDate(today)
      .build();

    expect(isTaskRelevantForToday(task, today)).toBe(true);
  });
});
