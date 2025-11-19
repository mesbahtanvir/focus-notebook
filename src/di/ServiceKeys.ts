/**
 * Service keys for dependency injection
 * Centralized constants to avoid typos
 */

export const ServiceKeys = {
  // Auth
  AUTH_SERVICE: 'AuthService',

  // Repositories
  TASK_REPOSITORY: 'TaskRepository',
  THOUGHT_REPOSITORY: 'ThoughtRepository',
  MOOD_REPOSITORY: 'MoodRepository',
  GOAL_REPOSITORY: 'GoalRepository',
  FOCUS_REPOSITORY: 'FocusRepository',
  PROJECT_REPOSITORY: 'ProjectRepository',
  FRIEND_REPOSITORY: 'FriendRepository',
  TOOL_USAGE_REPOSITORY: 'ToolUsageRepository',
} as const;

export type ServiceKey = typeof ServiceKeys[keyof typeof ServiceKeys];

