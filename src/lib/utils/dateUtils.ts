/**
 * Time-related constants for date calculations
 */
const DAYS_IN_YEAR = 365;
const DAYS_IN_MONTH = 30;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates the time difference between a target date and today
 * @param targetDate - The target date as a string
 * @returns An object containing the value, unit, and whether the date is overdue
 */
export function formatTimeUntil(targetDate: string): {
  value: number;
  unit: string;
  isOverdue: boolean;
} {
  const target = new Date(targetDate);
  const today = new Date();
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / MILLISECONDS_PER_DAY);

  const isOverdue = diffDays < 0;
  const absDays = Math.abs(diffDays);

  if (absDays >= DAYS_IN_YEAR) {
    const years = Math.floor(absDays / DAYS_IN_YEAR);
    return { value: years, unit: years === 1 ? 'year' : 'years', isOverdue };
  } else if (absDays >= DAYS_IN_MONTH) {
    const months = Math.floor(absDays / DAYS_IN_MONTH);
    return { value: months, unit: months === 1 ? 'month' : 'months', isOverdue };
  } else {
    return { value: absDays, unit: absDays === 1 ? 'day' : 'days', isOverdue };
  }
}
