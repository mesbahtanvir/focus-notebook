/**
 * LLM Prompt Builder with parameterized values
 * For use with GitHub Models tab or other LLM interfaces
 *
 * This module provides backward compatibility and test data generation
 * for the YAML-based prompt system. YAML prompts are the source of truth.
 */

import {
  loadPrompt,
  buildMessages,
  exportPromptForGitHubModels as exportFromLoader,
  buildCompletePrompt,
  getPromptMetadata,
} from '../prompts/promptLoader';

export interface ThoughtContext {
  text: string;
  type?: string;
  tags?: string[];
  createdAt: string;
  id: string;
}

export interface UserContext {
  goals?: Array<{ title: string; status: string; objective?: string }>;
  projects?: Array<{ title: string; status: string; description?: string }>;
  tasks?: Array<{ title: string; category?: string; priority?: string }>;
  moods?: Array<{ value?: number; mood?: number; note?: string }>;
  relationships?: Array<{ name: string; relationshipType?: string; connectionStrength?: number }>;
  notes?: Array<{ title?: string; content?: string }>;
  errands?: Array<{ title?: string; category?: string }>;
}

export interface PromptParams {
  thought: ThoughtContext;
  context?: UserContext;
  toolReference?: string;
}

/**
 * Build the complete thought processing prompt using YAML-based system
 * @deprecated Use loadPrompt('process-thought') and buildMessages() instead
 */
export function buildThoughtProcessingPrompt(params: PromptParams): string {
  const { thought, context, toolReference = '(Tool reference not provided)' } = params;

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
  const messages = buildMessages(promptConfig, variables, context || {});

  // Return combined system + user message for backward compatibility
  return messages.map(m => m.content).join('\n\n');
}

/**
 * Build the user context section from provided data
 * @deprecated This is now handled by the YAML contextTemplate
 */
export function buildUserContextSection(context?: UserContext): string {
  // This function is kept for backward compatibility
  // The actual context rendering is now done by the YAML system
  if (!context) return '';

  const promptConfig = loadPrompt('process-thought');
  const { renderContext } = require('../prompts/promptLoader');

  return promptConfig.contextTemplate
    ? renderContext(promptConfig.contextTemplate, context)
    : '';
}

/**
 * Generate test values for GitHub Models tab
 */
export function getTestPromptValues(): PromptParams {
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
        { title: 'Master React Development', status: 'active', objective: 'Become proficient in React and modern web development' },
        { title: 'Launch Personal Brand', status: 'active', objective: 'Build online presence through portfolio and content' },
      ],
      projects: [
        { title: 'Portfolio Website v2', status: 'active', description: 'Redesign portfolio with React and showcase recent projects' },
        { title: 'Learn Advanced TypeScript', status: 'active', description: 'Deep dive into TypeScript patterns and best practices' },
      ],
      tasks: [
        { title: 'Complete React hooks tutorial', category: 'mastery', priority: 'high' },
        { title: 'Design portfolio mockup', category: 'mastery', priority: 'medium' },
        { title: 'Research hosting options', category: 'mastery', priority: 'low' },
      ],
      moods: [
        { value: 6, note: 'Feeling motivated but a bit overwhelmed' },
        { value: 7, note: 'Good progress on learning today' },
      ],
      relationships: [
        { name: 'Sarah (Mentor)', relationshipType: 'professional', connectionStrength: 8 },
        { name: 'Alex (Study Buddy)', relationshipType: 'friend', connectionStrength: 7 },
      ],
      notes: [
        { title: 'React Hooks Best Practices', content: 'Key points from documentation: useState, useEffect, custom hooks...' },
        { title: 'Portfolio Design Inspiration', content: 'Collection of great developer portfolios for reference' },
      ],
      errands: [
        { title: 'Buy new laptop charger', category: 'shopping' },
        { title: 'Schedule dentist appointment', category: 'health' },
      ],
    },
    toolReference: '(Tool specs would be dynamically loaded based on enrolled tools)',
  };
}

/**
 * Export the prompt as a ready-to-use string for GitHub Models
 * Uses YAML-based prompt system
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
    toolReference: testParams.toolReference || '(Tool reference not provided)',
  };

  return exportFromLoader('process-thought', variables, testParams.context || {});
}

/**
 * Export any prompt by name for GitHub Models
 * @param promptName - Name of the YAML prompt file
 * @param variables - Test variables
 * @param context - Test context
 */
export function exportPromptByName(
  promptName: string,
  variables: Record<string, any> = {},
  context: Record<string, any> = {}
): string {
  return exportFromLoader(promptName, variables, context);
}

// Re-export useful functions from promptLoader for convenience
export { loadPrompt, buildMessages, buildCompletePrompt, getPromptMetadata } from '../prompts/promptLoader';
