/**
 * Application-wide constants and configuration values
 */

/**
 * Application metadata
 */
export const APP = {
  NAME: 'Focus Notebook',
  VERSION: '0.1.0',
  DESCRIPTION: 'Privacy-first mental health and productivity app',
} as const

/**
 * Content length limits
 */
export const LIMITS = {
  /** Maximum characters for task title */
  TASK_TITLE: 200,
  /** Maximum characters for thought text */
  THOUGHT_TEXT: 2000,
  /** Maximum characters for notes */
  NOTE: 5000,
  /** Maximum characters for goal title */
  GOAL_TITLE: 150,
  /** Maximum characters for project name */
  PROJECT_NAME: 150,
  /** Maximum tags per item */
  MAX_TAGS: 10,
  /** Maximum tag length */
  TAG_LENGTH: 30,
} as const

/**
 * Pagination defaults
 */
export const PAGINATION = {
  /** Default number of items per page */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum items per page */
  MAX_PAGE_SIZE: 100,
  /** Number of recent items to show in previews */
  RECENT_COUNT: 3,
} as const

/**
 * Animation durations in milliseconds
 */
export const ANIMATION = {
  /** Quick transitions (hover, click) */
  QUICK: 150,
  /** Standard transitions (fade, slide) */
  STANDARD: 300,
  /** Slow transitions (page transitions) */
  SLOW: 500,
} as const

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  /** Theme preference */
  THEME: 'theme',
  /** Onboarding completion status */
  ONBOARDING_COMPLETE: 'onboardingComplete',
  /** Last active session ID */
  LAST_SESSION: 'lastActiveSession',
  /** User preferences */
  PREFERENCES: 'userPreferences',
} as const

/**
 * Priority levels and their display order
 */
export const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'] as const

/**
 * Mood scale values
 */
export const MOOD_SCALE = {
  MIN: 1,
  MAX: 10,
  DEFAULT: 5,
} as const

/**
 * Feature flags for development
 */
export const FEATURES = {
  /** Enable debug logging */
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  /** Enable experimental features */
  EXPERIMENTAL: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL === 'true',
} as const
