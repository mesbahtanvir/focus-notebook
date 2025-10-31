/**
 * Configuration for AI Processing Cloud Functions
 */

export const CONFIG = {
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // Confidence Thresholds (must match frontend constants)
  CONFIDENCE_THRESHOLDS: {
    AUTO_APPLY: 95,     // Auto-apply actions with 95%+ confidence
    SUGGEST: 70,        // Show as suggestion for 70-94% confidence
    CREATE_THRESHOLD: 90, // Minimum for creating tasks/errands (with explicit mention)
    IGNORE: 69,         // Ignore actions below this
  },

  // Rate Limits
  RATE_LIMITS: {
    MAX_PROCESSING_PER_DAY_PER_USER: 50,
    MAX_REPROCESS_COUNT: 5,
  },

  // OpenAI Models
  MODELS: {
    DEFAULT: process.env.OPENAI_MODEL || 'gpt-4o',
    FALLBACK: 'gpt-4o',
  },

  // Processing Options
  MAX_CONTEXT_ITEMS: {
    GOALS: 20,
    PROJECTS: 30,
    PEOPLE: 50,
    TASKS: 50,
    MOODS: 10,
  },
} as const;
