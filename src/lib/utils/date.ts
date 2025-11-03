/**
 * Date utility functions for the Focus Notebook application
 * 
 * This module provides consistent date manipulation and formatting
 * functions used throughout the application.
 */

/**
 * Check if two dates represent the same calendar day
 * 
 * @param a - First date to compare
 * @param b - Second date to compare
 * @returns True if dates are on the same day
 * 
 * @example
 * ```typescript
 * const date1 = new Date('2025-01-24T10:00:00')
 * const date2 = new Date('2025-01-24T18:30:00')
 * isSameDay(date1, date2) // true
 * ```
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Check if an ISO date string represents today
 * 
 * @param iso - ISO 8601 date string (optional)
 * @returns True if the date string is today, false if undefined or different day
 * 
 * @example
 * ```typescript
 * isTodayISO('2025-01-24T10:00:00Z') // true if today is Jan 24, 2025
 * isTodayISO(undefined) // false
 * ```
 */
export function isTodayISO(iso?: string): boolean {
  if (!iso) return false
  const date = new Date(iso)
  return isSameDay(date, new Date())
}

/**
 * Get a date string in YYYY-MM-DD format
 * 
 * @param date - Date to format (defaults to current date)
 * @returns Date string in ISO format (YYYY-MM-DD)
 * 
 * @example
 * ```typescript
 * getDateString(new Date('2025-01-24')) // '2025-01-24'
 * getDateString() // Current date in YYYY-MM-DD format
 * ```
 */
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

/**
 * Check if a date falls on a workday (Monday-Friday)
 * 
 * @param date - Date to check (defaults to current date)
 * @returns True if the date is Monday through Friday
 * 
 * @example
 * ```typescript
 * const monday = new Date('2025-01-20') // Monday
 * const saturday = new Date('2025-01-25') // Saturday
 * isWorkday(monday) // true
 * isWorkday(saturday) // false
 * ```
 */
export function isWorkday(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5 // Monday (1) to Friday (5)
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 * 
 * @param date - Date to check (defaults to current date)
 * @returns True if the date is Saturday or Sunday
 * 
 * @example
 * ```typescript
 * const saturday = new Date('2025-01-25')
 * isWeekend(saturday) // true
 * ```
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday (0) or Saturday (6)
}

/**
 * Format a time duration in seconds to a human-readable string
 * Shows only hours and minutes (gentle format, no seconds)
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted time string (e.g., "2h 30m", "45m", "Starting...")
 * 
 * @example
 * ```typescript
 * formatTimeGentle(0) // 'Starting...'
 * formatTimeGentle(120) // '2m'
 * formatTimeGentle(3600) // '1h'
 * formatTimeGentle(5400) // '1h 30m'
 * ```
 */
export function formatTimeGentle(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  
  if (hours > 0) {
    if (remainingMins === 0) {
      return `${hours}h`
    }
    return `${hours}h ${remainingMins}m`
  }
  if (mins === 0) {
    return 'Starting...'
  }
  return `${mins}m`
}

/**
 * Get the start of day for a given date (midnight)
 * 
 * @param date - Date to get start of day for (defaults to current date)
 * @returns New Date object set to midnight
 * 
 * @example
 * ```typescript
 * const date = new Date('2025-01-24T15:30:00')
 * const startOfDay = getStartOfDay(date) // 2025-01-24T00:00:00
 * ```
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the end of day for a given date (23:59:59.999)
 * 
 * @param date - Date to get end of day for (defaults to current date)
 * @returns New Date object set to end of day
 * 
 * @example
 * ```typescript
 * const date = new Date('2025-01-24T10:00:00')
 * const endOfDay = getEndOfDay(date) // 2025-01-24T23:59:59.999
 * ```
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Calculate the difference in days between two dates
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates (can be negative)
 * 
 * @example
 * ```typescript
 * const today = new Date('2025-01-24')
 * const tomorrow = new Date('2025-01-25')
 * getDaysDifference(today, tomorrow) // 1
 * getDaysDifference(tomorrow, today) // -1
 * ```
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000 // milliseconds in a day
  const diffTime = date2.getTime() - date1.getTime()
  return Math.round(diffTime / oneDay)
}

/**
 * Check if a date is in the past
 * 
 * @param date - Date to check
 * @returns True if the date is before now
 * 
 * @example
 * ```typescript
 * const yesterday = new Date('2025-01-23')
 * isPast(yesterday) // true (if today is Jan 24 or later)
 * ```
 */
export function isPast(date: Date): boolean {
  return date < new Date()
}

/**
 * Check if a date is in the future
 *
 * @param date - Date to check
 * @returns True if the date is after now
 *
 * @example
 * ```typescript
 * const tomorrow = new Date('2025-01-25')
 * isFuture(tomorrow) // true (if today is Jan 24 or earlier)
 * ```
 */
export function isFuture(date: Date): boolean {
  return date > new Date()
}

/**
 * Check if a task with completion history is completed today
 * For recurring tasks, checks if there's a completion entry for today
 * For non-recurring tasks, uses the done field
 *
 * @param task - Task object with optional completionHistory and done field
 * @returns True if task is completed today
 *
 * @example
 * ```typescript
 * const recurringTask = {
 *   done: true,
 *   recurrence: { type: 'daily' },
 *   completionHistory: [
 *     { date: '2025-01-24', completedAt: '2025-01-24T10:00:00Z' }
 *   ]
 * }
 * isTaskCompletedToday(recurringTask) // true if today is Jan 24, 2025
 * ```
 */
export function isTaskCompletedToday(task: {
  done: boolean
  recurrence?: { type: string }
  completionHistory?: Array<{ date: string; completedAt: string }>
}): boolean {
  // For non-recurring tasks, just use the done field
  if (!task.recurrence || task.recurrence.type === 'none') {
    return task.done
  }

  // For recurring tasks, check if there's a completion for today
  const today = getDateString(new Date())
  return task.completionHistory?.some(c => c.date === today) ?? false
}
