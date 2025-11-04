/**
 * Test cases for LLM Prompt Builder feature (#33)
 * Tests parameterization of LLM prompts for GitHub Models
 */

import { describe, it, expect } from '@jest/globals';
import {
  buildThoughtProcessingPrompt,
  buildUserContextSection,
  getTestPromptValues,
  exportPromptForGitHubModels,
  type ThoughtContext,
  type UserContext,
  type PromptParams,
} from '@/lib/llm/promptBuilder';

describe('LLM Prompt Builder (#33)', () => {
  describe('buildUserContextSection', () => {
    it('should return empty string for undefined context', () => {
      const result = buildUserContextSection(undefined);
      expect(result).toBe('');
    });

    it('should build context with goals', () => {
      const context: UserContext = {
        goals: [
          { title: 'Learn React', status: 'active', objective: 'Master React' },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('Goals (1)');
      expect(result).toContain('Learn React');
      expect(result).toContain('Master React');
    });

    it('should build context with projects', () => {
      const context: UserContext = {
        projects: [
          { title: 'Portfolio Website', status: 'active', description: 'Build portfolio' },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('Projects (1)');
      expect(result).toContain('Portfolio Website');
    });

    it('should build context with tasks', () => {
      const context: UserContext = {
        tasks: [
          { title: 'Complete tutorial', category: 'mastery', priority: 'high' },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('Active Tasks (1)');
      expect(result).toContain('Complete tutorial');
    });

    it('should build context with moods', () => {
      const context: UserContext = {
        moods: [
          { value: 7, note: 'Feeling productive' },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('Recent Moods (1)');
      expect(result).toContain('7/10');
      expect(result).toContain('Feeling productive');
    });

    it('should build context with relationships', () => {
      const context: UserContext = {
        relationships: [
          { name: 'John', relationshipType: 'mentor', connectionStrength: 8 },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('Relationships (1)');
      expect(result).toContain('John');
      expect(result).toContain('mentor');
    });

    it('should build context with notes', () => {
      const context: UserContext = {
        notes: [
          { title: 'React Notes', content: 'Key concepts about React hooks' },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('Recent Notes (1)');
      expect(result).toContain('React Notes');
    });

    it('should build context with errands', () => {
      const context: UserContext = {
        errands: [
          { title: 'Buy groceries', category: 'shopping' },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('Active Errands (1)');
      expect(result).toContain('Buy groceries');
    });

    it('should handle multiple items in each category', () => {
      const context: UserContext = {
        goals: [
          { title: 'Goal 1', status: 'active' },
          { title: 'Goal 2', status: 'active' },
        ],
        tasks: [
          { title: 'Task 1' },
          { title: 'Task 2' },
          { title: 'Task 3' },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('Goals (2)');
      expect(result).toContain('Tasks (3)');
    });

    it('should omit empty categories', () => {
      const context: UserContext = {
        goals: [],
        tasks: [{ title: 'Task 1' }],
      };

      const result = buildUserContextSection(context);
      expect(result).not.toContain('Goals (0)');
      expect(result).toContain('Tasks (1)');
    });
  });

  describe('buildThoughtProcessingPrompt', () => {
    it('should build complete prompt with all sections', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'I need to learn TypeScript',
          type: 'task',
          tags: ['tool-tasks'],
          createdAt: new Date().toISOString(),
        },
        context: {
          tasks: [{ title: 'Learn React' }],
        },
        toolReference: 'Test tool reference',
      };

      const result = buildThoughtProcessingPrompt(params);

      expect(result).toContain('You are an intelligent thought processor');
      expect(result).toContain('Tool Reference Guidance');
      expect(result).toContain('Available Tool Tags');
      expect(result).toContain('Available Actions');
      expect(result).toContain('User Thought');
      expect(result).toContain('I need to learn TypeScript');
    });

    it('should include thought text in prompt', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Specific thought text here',
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('Specific thought text here');
    });

    it('should include thought type', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          type: 'mixed',
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('Type: mixed');
    });

    it('should include thought tags', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          tags: ['tool-tasks', 'tool-mood'],
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('tool-tasks, tool-mood');
    });

    it('should handle missing optional fields', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('Type: neutral');
      expect(result).toContain('Current Tags: none');
    });

    it('should include tool reference when provided', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          createdAt: new Date().toISOString(),
        },
        toolReference: 'Custom tool reference data',
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('Custom tool reference data');
    });

    it('should use default tool reference when not provided', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('(Tool reference not provided)');
    });

    it('should include all action types', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('createTask');
      expect(result).toContain('enhanceTask');
      expect(result).toContain('createProject');
      expect(result).toContain('createGoal');
      expect(result).toContain('createMood');
      expect(result).toContain('addTag');
      expect(result).toContain('linkToProject');
    });

    it('should include confidence scoring guidelines', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('99-100');
      expect(result).toContain('70-98');
      expect(result).toContain('0-69');
    });

    it('should include response format example', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('"actions"');
      expect(result).toContain('"type"');
      expect(result).toContain('"confidence"');
      expect(result).toContain('"reasoning"');
    });

    it('should include rules section', () => {
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: 'Test',
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain('Rules:');
      expect(result).toContain('Only suggest actions that are truly helpful');
    });
  });

  describe('getTestPromptValues', () => {
    it('should return complete test data structure', () => {
      const testData = getTestPromptValues();

      expect(testData.thought).toBeDefined();
      expect(testData.context).toBeDefined();
      expect(testData.toolReference).toBeDefined();
    });

    it('should include realistic thought data', () => {
      const testData = getTestPromptValues();

      expect(testData.thought.text).toContain('React hooks');
      expect(testData.thought.type).toBe('mixed');
      expect(testData.thought.tags).toContain('tool-tasks');
    });

    it('should include sample goals', () => {
      const testData = getTestPromptValues();

      expect(testData.context?.goals).toBeDefined();
      expect(testData.context!.goals!.length).toBeGreaterThan(0);
      expect(testData.context!.goals![0].title).toBeTruthy();
    });

    it('should include sample projects', () => {
      const testData = getTestPromptValues();

      expect(testData.context?.projects).toBeDefined();
      expect(testData.context!.projects!.length).toBeGreaterThan(0);
    });

    it('should include sample tasks', () => {
      const testData = getTestPromptValues();

      expect(testData.context?.tasks).toBeDefined();
      expect(testData.context!.tasks!.length).toBeGreaterThan(0);
    });

    it('should include sample moods', () => {
      const testData = getTestPromptValues();

      expect(testData.context?.moods).toBeDefined();
      expect(testData.context!.moods!.length).toBeGreaterThan(0);
    });

    it('should include sample relationships', () => {
      const testData = getTestPromptValues();

      expect(testData.context?.relationships).toBeDefined();
      expect(testData.context!.relationships!.length).toBeGreaterThan(0);
    });

    it('should include sample notes', () => {
      const testData = getTestPromptValues();

      expect(testData.context?.notes).toBeDefined();
      expect(testData.context!.notes!.length).toBeGreaterThan(0);
    });

    it('should include sample errands', () => {
      const testData = getTestPromptValues();

      expect(testData.context?.errands).toBeDefined();
      expect(testData.context!.errands!.length).toBeGreaterThan(0);
    });

    it('should have valid ISO timestamp', () => {
      const testData = getTestPromptValues();

      const isValidISO = !isNaN(new Date(testData.thought.createdAt).getTime());
      expect(isValidISO).toBe(true);
    });
  });

  describe('exportPromptForGitHubModels', () => {
    it('should return markdown formatted output', () => {
      const result = exportPromptForGitHubModels();

      expect(result).toContain('# Thought Processing Prompt for GitHub Models');
      expect(result).toContain('## System Message:');
      expect(result).toContain('## User Prompt:');
      expect(result).toContain('## Test Instructions:');
    });

    it('should include usage instructions', () => {
      const result = exportPromptForGitHubModels();

      expect(result).toContain('Copy the User Prompt');
      expect(result).toContain('Paste into GitHub Models');
      expect(result).toContain('temperature to 0.7');
      expect(result).toContain('max_tokens to 1500');
    });

    it('should include complete prompt', () => {
      const result = exportPromptForGitHubModels();

      expect(result).toContain('You are an intelligent thought processor');
      expect(result).toContain('Available Actions');
    });

    it('should include customization notes', () => {
      const result = exportPromptForGitHubModels();

      expect(result).toContain('Customization:');
      expect(result).toContain('Goals:');
      expect(result).toContain('Projects:');
      expect(result).toContain('Tasks:');
    });

    it('should count sample data items', () => {
      const result = exportPromptForGitHubModels();

      expect(result).toMatch(/Goals: \d+ sample goals/);
      expect(result).toMatch(/Projects: \d+ sample projects/);
    });
  });

  describe('Integration with API', () => {
    it('should match structure used in process-thought API', () => {
      const params = getTestPromptValues();
      const prompt = buildThoughtProcessingPrompt(params);

      // Should include all sections that API uses
      expect(prompt).toContain('Available Tool Tags');
      expect(prompt).toContain('Available Actions');
      expect(prompt).toContain('User Thought');
      expect(prompt).toContain('Confidence Scoring');
    });

    it('should be compatible with OpenAI API format', () => {
      const prompt = buildThoughtProcessingPrompt(getTestPromptValues());

      // Should be a string suitable for messages array
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty context arrays', () => {
      const context: UserContext = {
        goals: [],
        tasks: [],
        moods: [],
      };

      const result = buildUserContextSection(context);
      expect(result).toBe(''); // No sections added
    });

    it('should handle missing optional fields in context items', () => {
      const context: UserContext = {
        goals: [
          { title: 'Goal without objective', status: 'active' },
        ],
      };

      const result = buildUserContextSection(context);
      expect(result).toContain('No objective');
    });

    it('should handle very long thought text', () => {
      const longText = 'A'.repeat(5000);
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: longText,
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain(longText);
    });

    it('should handle special characters in thought text', () => {
      const specialText = 'Task with "quotes" & <symbols> and newlines\n\n';
      const params: PromptParams = {
        thought: {
          id: 'test-1',
          text: specialText,
          createdAt: new Date().toISOString(),
        },
      };

      const result = buildThoughtProcessingPrompt(params);
      expect(result).toContain(specialText);
    });
  });
});
