/**
 * Time duration constants used throughout the application
 * All durations are in minutes unless otherwise specified
 */

/**
 * Predefined focus session durations in minutes
 */
export const FOCUS_DURATIONS = {
  /** 5-minute break session */
  BREAK: 5,
  /** 25-minute Pomodoro session */
  POMODORO: 25,
  /** 50-minute deep work session */
  DEEP_WORK: 50,
  /** 60-minute standard session */
  STANDARD: 60,
  /** 90-minute extended session */
  EXTENDED: 90,
} as const

/**
 * Timer update intervals in milliseconds
 */
export const TIMER_INTERVALS = {
  /** How often to update the timer display (1 second) */
  UPDATE: 1000,
  /** How often to sync session state to Firestore (5 seconds) */
  SYNC: 5000,
} as const

/**
 * Auto-save delays in milliseconds
 */
export const AUTO_SAVE_DELAYS = {
  /** Delay before auto-saving notes */
  NOTES: 2000,
  /** Delay before auto-saving session state */
  SESSION: 3000,
} as const

/**
 * Time window constants for analytics
 */
export const TIME_WINDOWS = {
  /** 7 days in days */
  WEEK: 7,
  /** 30 days in days */
  MONTH: 30,
  /** 90 days in days */
  QUARTER: 90,
} as const

/**
 * Convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000
}

/**
 * Convert minutes to seconds
 */
export function minutesToSeconds(minutes: number): number {
  return minutes * 60
}

/**
 * Convert seconds to minutes (rounded)
 */
export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60)
}
