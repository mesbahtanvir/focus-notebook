/**
 * AI Processing Constants
 *
 * Defines tag types, entity prefixes, and confidence thresholds
 * for the AI thought processing system.
 */

// TOOL TAGS - Tools that can process a thought
export const TOOL_TAGS = {
  CBT: 'tool-cbt',           // CBT page processes negative thoughts
  BRAINSTORM: 'tool-brainstorm',  // Brainstorm page for idea exploration
  DEEP_REFLECT: 'tool-deepreflect', // Deep reflection page for philosophical thinking
} as const;

export type ToolTag = typeof TOOL_TAGS[keyof typeof TOOL_TAGS];

// ENTITY TAG PREFIXES - Link to existing entities (require matching)
export const ENTITY_TAG_PREFIXES = {
  GOAL: 'goal-',      // goal-{goalId}
  PROJECT: 'project-', // project-{projectId}
} as const;

export type EntityTagPrefix = typeof ENTITY_TAG_PREFIXES[keyof typeof ENTITY_TAG_PREFIXES];

// CONFIDENCE THRESHOLDS
export const CONFIDENCE = {
  AUTO_APPLY: 95,     // Auto-apply tool tags, text enhancements, entity links
  SUGGEST: 70,        // Show as suggestion for user approval
  CREATE_THRESHOLD: 90, // Minimum for creating tasks/errands (with explicit mention)
  IGNORE: 69,         // Ignore actions below this
} as const;

// RATE LIMITS
export const RATE_LIMITS = {
  MAX_PROCESSING_PER_DAY_PER_USER: 50,
  MAX_REPROCESS_COUNT: 5,
} as const;

// ACTION TYPES
export const ACTION_TYPES = {
  ENHANCE_THOUGHT: 'enhanceThought',
  ADD_TAG: 'addTag',
  CREATE_TASK: 'createTask',
  CREATE_CALENDAR_EVENT: 'createCalendarEvent',
  CREATE_PROJECT: 'createProject',
  CREATE_GOAL: 'createGoal',
  LINK_TO_GOAL: 'linkToGoal',
  LINK_TO_PROJECT: 'linkToProject',
  LINK_TO_PERSON: 'linkToPerson',
} as const;

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];

// TEXT CHANGE TYPES
export const TEXT_CHANGE_TYPES = {
  GRAMMAR: 'grammar',
  SPELLING: 'spelling',
  COMPLETION: 'completion',
  CAPITALIZATION: 'capitalization',
} as const;

export type TextChangeType = typeof TEXT_CHANGE_TYPES[keyof typeof TEXT_CHANGE_TYPES];

// Helper functions
export function isToolTag(tag: string): tag is ToolTag {
  return Object.values(TOOL_TAGS).includes(tag as ToolTag);
}

export function getEntityType(tag: string): 'goal' | 'project' | null {
  if (tag.startsWith(ENTITY_TAG_PREFIXES.GOAL)) return 'goal';
  if (tag.startsWith(ENTITY_TAG_PREFIXES.PROJECT)) return 'project';
  return null;
}

export function getEntityId(tag: string): string | null {
  const type = getEntityType(tag);
  if (!type) return null;

  const prefix = ENTITY_TAG_PREFIXES[type.toUpperCase() as keyof typeof ENTITY_TAG_PREFIXES];
  return tag.replace(prefix, '');
}

export function createEntityTag(type: 'goal' | 'project', id: string): string {
  const prefix = ENTITY_TAG_PREFIXES[type.toUpperCase() as keyof typeof ENTITY_TAG_PREFIXES];
  return `${prefix}${id}`;
}
