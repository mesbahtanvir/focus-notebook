/**
 * LLM Prompt Builder - Relationship-Based Framework
 * For use with GitHub Models tab or other LLM interfaces
 *
 * This module uses YAML prompts as the single source of truth.
 * All prompts support creating relationships between thoughts and entities.
 */

import {
  loadPrompt,
  buildMessages,
  exportPromptForGitHubModels as exportFromLoader,
  buildCompletePrompt,
  getPromptMetadata,
} from '../prompts/promptLoader';

/**
 * Entity with ID for relationship linking
 */
export interface Entity {
  id: string;
  title?: string;
  name?: string;
  [key: string]: any;
}

/**
 * Thought context for processing
 */
export interface ThoughtContext {
  text: string;
  type?: string;
  tags?: string[];
  createdAt: string;
  id: string;
}

/**
 * User context with entity IDs for relationship creation
 */
export interface UserContext {
  goals?: Array<Entity & { status: string; objective?: string }>;
  projects?: Array<Entity & { status: string; description?: string }>;
  tasks?: Array<Entity & { category?: string; priority?: string }>;
  moods?: Array<{ value?: number; mood?: number; note?: string }>;
  relationships?: Array<Entity & { relationshipType?: string; connectionStrength?: number }>;
  notes?: Array<Entity & { content?: string }>;
  errands?: Array<Entity & { category?: string }>;
}

/**
 * Action types for relationship-based processing
 */
export type ActionType =
  // Entity creation
  | 'createTask'
  | 'createProject'
  | 'createGoal'
  | 'createMood'
  | 'createNote'
  | 'createErrand'
  | 'createRelationship'
  // Entity linking (relationships)
  | 'linkToTask'
  | 'linkToProject'
  | 'linkToGoal'
  | 'linkToRelationship'
  | 'linkToNote'
  // Entity enhancement
  | 'enhanceTask'
  | 'enhanceProject'
  | 'enhanceGoal'
  | 'enhanceRelationship';

/**
 * Action response from thought processing
 */
export interface ProcessedAction {
  type: ActionType;
  confidence: number;
  data: Record<string, any>;
  reasoning: string;
  relationship: string; // Explanation of how thought relates to entity
}

/**
 * Response from thought processing
 */
export interface ProcessedThought {
  actions: ProcessedAction[];
}

/**
 * Build prompt messages for thought processing
 * @param thought - The thought to process
 * @param context - User's current data context with entity IDs
 * @param toolReference - Optional tool reference guidance
 */
export function buildThoughtProcessingMessages(
  thought: ThoughtContext,
  context: UserContext = {},
  toolReference: string = '(Tool reference not provided)'
) {
  const variables = {
    thought: {
      text: thought.text,
      type: thought.type || 'neutral',
      tags: thought.tags?.join(', ') || 'none',
      createdAt: thought.createdAt,
    },
    toolReference,
  };

  const promptConfig = loadPrompt('process-thought');
  return buildMessages(promptConfig, variables, context);
}

/**
 * Generate test values with entity IDs for relationships
 */
export function getTestPromptValues() {
  return {
    thought: {
      id: 'test-thought-123',
      text: 'I need to learn React hooks and build a personal portfolio website. Also feeling stressed about the upcoming deadline.',
      type: 'mixed',
      tags: ['tool-tasks', 'tool-mood'],
      createdAt: new Date().toISOString(),
    },
    context: {
      goals: [
        { id: 'goal-react-dev', title: 'Master React Development', status: 'active', objective: 'Become proficient in React and modern web development' },
        { id: 'goal-personal-brand', title: 'Launch Personal Brand', status: 'active', objective: 'Build online presence through portfolio and content' },
      ],
      projects: [
        { id: 'project-portfolio-v2', title: 'Portfolio Website v2', status: 'active', description: 'Redesign portfolio with React and showcase recent projects' },
        { id: 'project-typescript', title: 'Learn Advanced TypeScript', status: 'active', description: 'Deep dive into TypeScript patterns and best practices' },
      ],
      tasks: [
        { id: 'task-react-hooks', title: 'Complete React hooks tutorial', category: 'mastery', priority: 'high' },
        { id: 'task-portfolio-mockup', title: 'Design portfolio mockup', category: 'mastery', priority: 'medium' },
        { id: 'task-hosting-research', title: 'Research hosting options', category: 'mastery', priority: 'low' },
      ],
      moods: [
        { value: 6, note: 'Feeling motivated but a bit overwhelmed' },
        { value: 7, note: 'Good progress on learning today' },
      ],
      relationships: [
        { id: 'rel-sarah-mentor', name: 'Sarah (Mentor)', relationshipType: 'professional', connectionStrength: 8 },
        { id: 'rel-alex-friend', name: 'Alex (Study Buddy)', relationshipType: 'friend', connectionStrength: 7 },
      ],
      notes: [
        { id: 'note-react-hooks', title: 'React Hooks Best Practices', content: 'Key points from documentation: useState, useEffect, custom hooks...' },
        { id: 'note-portfolio-inspiration', title: 'Portfolio Design Inspiration', content: 'Collection of great developer portfolios for reference' },
      ],
      errands: [
        { id: 'errand-laptop-charger', title: 'Buy new laptop charger', category: 'shopping' },
        { id: 'errand-dentist', title: 'Schedule dentist appointment', category: 'health' },
      ],
    },
    toolReference: '(Tool specs would be dynamically loaded based on enrolled tools)',
  };
}

/**
 * Export the thought processing prompt for GitHub Models with test data
 */
export function exportPromptForGitHubModels(): string {
  const testParams = getTestPromptValues();

  const variables = {
    thought: {
      text: testParams.thought.text,
      type: testParams.thought.type || 'neutral',
      tags: testParams.thought.tags?.join(', ') || 'none',
      createdAt: testParams.thought.createdAt,
    },
    toolReference: testParams.toolReference,
  };

  return exportFromLoader('process-thought', variables, testParams.context);
}

/**
 * Export any prompt by name for GitHub Models
 * @param promptName - Name of the YAML prompt file
 * @param variables - Test variables
 * @param context - Test context with entity IDs
 */
export function exportPromptByName(
  promptName: string,
  variables: Record<string, any> = {},
  context: Record<string, any> = {}
): string {
  return exportFromLoader(promptName, variables, context);
}

// Re-export core prompt functions for convenience
export {
  loadPrompt,
  buildMessages,
  buildCompletePrompt,
  getPromptMetadata,
  listPrompts,
} from '../prompts/promptLoader';
