/**
 * Unit tests for Action Processor
 */

import { processActions, buildThoughtUpdate, countChanges } from '../../utils/actionProcessor';

describe('Action Processor', () => {
  describe('processActions', () => {
    it('should auto-apply high confidence actions (95%+)', () => {
      const actions = [
        {
          type: 'enhanceThought',
          confidence: 99,
          data: {
            improvedText: 'Had coffee with Sarah',
            changes: [
              { type: 'grammar', from: 'had', to: 'Had' },
              { type: 'completion', from: 'sar', to: 'Sarah' }
            ]
          },
          reasoning: 'Fixed grammar and completed name'
        },
        {
          type: 'addTag',
          confidence: 98,
          data: { tag: 'tool-cbt' },
          reasoning: 'Negative tone'
        }
      ];

      const currentThought = {
        text: 'had coffee w/ sar',
        tags: []
      };

      const result = processActions(actions, currentThought);

      expect(result.autoApply.text).toBe('Had coffee with Sarah');
      expect(result.autoApply.tagsToAdd).toContain('tool-cbt');
      expect(result.suggestions).toHaveLength(0);
    });

    it('should create suggestions for medium confidence actions (70-94%)', () => {
      const actions = [
        {
          type: 'createTask',
          confidence: 85,
          data: {
            title: 'Follow up with Sarah',
            focusEligible: true,
            priority: 'medium'
          },
          reasoning: 'Discussion may need follow-up'
        }
      ];

      const currentThought = { text: 'test', tags: [] };
      const result = processActions(actions, currentThought);

      expect(result.autoApply.tagsToAdd).toHaveLength(0);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('createTask');
      expect(result.suggestions[0].confidence).toBe(85);
      expect(result.suggestions[0].status).toBe('pending');
    });

    it('should ignore low confidence actions (<70%)', () => {
      const actions = [
        {
          type: 'createTask',
          confidence: 65,
          data: { title: 'Maybe do something' },
          reasoning: 'Vague mention'
        }
      ];

      const currentThought = { text: 'test', tags: [] };
      const result = processActions(actions, currentThought);

      expect(result.autoApply.tagsToAdd).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should not add duplicate tags', () => {
      const actions = [
        {
          type: 'addTag',
          confidence: 98,
          data: { tag: 'tool-cbt' },
          reasoning: 'Negative thought'
        }
      ];

      const currentThought = {
        text: 'test',
        tags: ['tool-cbt'] // Already has this tag
      };

      const result = processActions(actions, currentThought);

      expect(result.autoApply.tagsToAdd).toHaveLength(0);
    });

    it('should handle entity tag linking for goals/projects and queue person links', () => {
      const actions = [
        {
          type: 'linkToGoal',
          confidence: 96,
          data: { goalId: 'goal123' },
          reasoning: 'References goal'
        },
        {
          type: 'linkToProject',
          confidence: 97,
          data: { projectId: 'proj456' },
          reasoning: 'References project'
        },
        {
          type: 'linkToPerson',
          confidence: 98,
          data: { shortName: 'sarah' },
          reasoning: 'Mentions person'
        }
      ];

      const currentThought = { text: 'test', tags: [] };
      const result = processActions(actions, currentThought);

      expect(result.autoApply.tagsToAdd).not.toContain('goal-goal123');
      expect(result.autoApply.tagsToAdd).not.toContain('project-proj456');
      expect(result.autoApply.tagsToAdd).not.toContain('person-sarah');
      expect(result.linksToCreate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ targetType: 'goal', targetId: 'goal123' }),
          expect.objectContaining({ targetType: 'project', targetId: 'proj456' }),
        ])
      );
      expect(result.suggestions.map((s) => s.type)).toContain('linkToPerson');
    });
  });

  describe('buildThoughtUpdate', () => {
    it('should build complete update object with all fields', () => {
      const processedActions = {
        autoApply: {
          text: 'Enhanced text',
          textChanges: [
            { type: 'grammar', from: 'test', to: 'Test' }
          ],
          tagsToAdd: ['tool-cbt']
        },
        suggestions: [
          {
            id: 'sug1',
            type: 'createTask',
            confidence: 85,
            data: {},
            reasoning: 'test',
            createdAt: new Date().toISOString(),
            status: 'pending' as const
          }
        ],
        linksToCreate: [
          { targetType: 'goal' as const, targetId: 'goal123', relationshipType: 'linked-to' as const },
          { targetType: 'project' as const, targetId: 'proj456', relationshipType: 'linked-to' as const },
        ],
      };

      const currentThought = {
        text: 'test',
        tags: [],
        processingHistory: []
      };

      const { update, historyEntry } = buildThoughtUpdate(
        processedActions,
        currentThought,
        500,
        'manual'
      );

      expect(update.text).toBe('Enhanced text');
      expect(update.tags).toContain('tool-cbt');
      expect(update.tags).toContain('processed');
      expect(update.aiAppliedChanges).toBeDefined();
      expect(update.aiAppliedChanges.textEnhanced).toBe(true);
      expect(update.aiAppliedChanges.tagsAdded).toHaveLength(1);
      expect(update.aiAppliedChanges.linksCreated).toBe(2);
      expect(update.aiSuggestions).toHaveLength(1);
      expect(update.originalText).toBe('test');
      expect(update.originalTags).toEqual([]);
      expect(historyEntry.tokensUsed).toBe(500);
      expect(historyEntry.trigger).toBe('manual');
      expect(historyEntry.changesApplied).toBe(4); // 1 text + 1 tag + 2 links
      expect(historyEntry.suggestionsCount).toBe(1);
    });

    it('should add "processed" tag automatically when changes applied', () => {
      const processedActions = {
        autoApply: {
          tagsToAdd: ['tool-cbt']
        },
        suggestions: [],
        linksToCreate: [],
      };

      const currentThought = {
        text: 'test',
        tags: []
      };

      const { update } = buildThoughtUpdate(
        processedActions,
        currentThought,
        100,
        'auto'
      );

      expect(update.tags).toContain('processed');
    });

    it('should preserve existing tags while adding new ones', () => {
      const processedActions = {
        autoApply: {
          tagsToAdd: ['tool-cbt']
        },
        suggestions: [],
        linksToCreate: [],
      };

      const currentThought = {
        text: 'test',
        tags: ['existing-tag', 'another-tag']
      };

      const { update } = buildThoughtUpdate(
        processedActions,
        currentThought,
        100,
        'auto'
      );

      expect(update.tags).toContain('existing-tag');
      expect(update.tags).toContain('another-tag');
      expect(update.tags).toContain('tool-cbt');
      expect(update.tags).toContain('processed');
    });
  });

  describe('countChanges', () => {
    it('should count text change as 1', () => {
      const processedActions = {
        autoApply: {
          text: 'Enhanced',
          tagsToAdd: []
        },
        suggestions: [],
        linksToCreate: [],
      };

      expect(countChanges(processedActions)).toBe(1);
    });

    it('should count each tag addition', () => {
      const processedActions = {
        autoApply: {
          tagsToAdd: ['tag1', 'tag2', 'tag3']
        },
        suggestions: [],
        linksToCreate: [],
      };

      expect(countChanges(processedActions)).toBe(3);
    });

    it('should count text + tags combined', () => {
      const processedActions = {
        autoApply: {
          text: 'Enhanced',
          tagsToAdd: ['tag1', 'tag2']
        },
        suggestions: [],
        linksToCreate: [],
      };

      expect(countChanges(processedActions)).toBe(3);
    });

    it('should include relationship links in change count', () => {
      const processedActions = {
        autoApply: {
          tagsToAdd: [],
        },
        suggestions: [],
        linksToCreate: [
          { targetType: 'goal' as const, targetId: 'goal123', relationshipType: 'linked-to' as const },
          { targetType: 'project' as const, targetId: 'proj456', relationshipType: 'linked-to' as const },
        ],
      };

      expect(countChanges(processedActions)).toBe(2);
    });
  });
});
