/**
 * Focus session constants
 */

// Duration constants (in minutes)
export const FOCUS_DURATION = {
  DEFAULT: 60,
  MIN: 15,
  MAX: 240,
} as const;

// Task selection constants
export const TASK_SELECTION = {
  /** Estimated time per task in minutes */
  ESTIMATED_MINUTES_PER_TASK: 15,
} as const;

// Time conversion constants
export const TIME_CONVERSION = {
  MILLISECONDS_PER_DAY: 1000 * 60 * 60 * 24,
  MINUTES_PER_HOUR: 60,
} as const;

// Priority score for overdue tasks
export const OVERDUE_PRIORITY_SCORE = 5;
