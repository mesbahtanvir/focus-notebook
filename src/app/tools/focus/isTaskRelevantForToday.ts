import type { Task, TaskCompletion } from '@/store/useTasks';
import { getDateString } from '@/lib/utils/date';

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  // Parse date strings as UTC to avoid timezone issues
  const dateStr = value.includes('T') ? value : `${value}T00:00:00.000Z`;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return normalizeDate(parsed);
}

function getLatestCompletionDate(task: Task): Date | null {
  const completionHistory = task.completionHistory;
  if (completionHistory && completionHistory.length > 0) {
    const sorted = [...completionHistory].sort((a: TaskCompletion, b: TaskCompletion) => {
      if (a.date === b.date) {
        return 0;
      }
      return a.date > b.date ? -1 : 1;
    });

    const latest = parseDate(sorted[0]?.date);
    if (latest) {
      return latest;
    }
  }

  if (task.completedAt) {
    const completedAt = parseDate(task.completedAt);
    if (completedAt) {
      return completedAt;
    }
  }

  return null;
}

function hasCompletionOnDate(task: Task, date: string): boolean {
  if (task.completionHistory?.some((completion) => completion.date === date)) {
    return true;
  }

  if (task.completedAt) {
    const completedDate = parseDate(task.completedAt);
    if (completedDate && getDateString(completedDate) === date) {
      return true;
    }
  }

  return false;
}

function isSameWeek(target: Date, reference: Date): boolean {
  const referenceStart = normalizeDate(reference);
  const day = referenceStart.getUTCDay();
  const daysFromMonday = (day + 6) % 7;

  const startOfWeek = new Date(referenceStart);
  startOfWeek.setUTCDate(referenceStart.getUTCDate() - daysFromMonday);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);

  return target >= startOfWeek && target <= endOfWeek;
}

export function isTaskRelevantForToday(task: Task, today: string): boolean {
  const recurrenceType = task.recurrence?.type;
  const todayDate = parseDate(today) ?? normalizeDate(new Date(today));

  if (!recurrenceType) {
    if (!task.dueDate) {
      return true;
    }

    const dueDate = parseDate(task.dueDate);
    if (!dueDate) {
      return true;
    }

    return dueDate <= todayDate;
  }

  if (recurrenceType === 'daily' || recurrenceType === 'workweek') {
    return !hasCompletionOnDate(task, today);
  }

  if (recurrenceType === 'weekly') {
    const latestCompletion = getLatestCompletionDate(task);
    if (!latestCompletion) {
      return true;
    }

    return !isSameWeek(latestCompletion, todayDate);
  }

  return true;
}
