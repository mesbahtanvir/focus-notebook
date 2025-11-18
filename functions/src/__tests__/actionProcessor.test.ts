jest.mock('../config', () => ({
  CONFIG: {
    CONFIDENCE_THRESHOLDS: {
      AUTO_APPLY: 0.8,
      SUGGEST: 0.5,
    },
  },
}));

import {
  processActions,
  buildThoughtUpdate,
  countChanges,
  ProcessedActions,
} from '../utils/actionProcessor';
import { AIAction } from '../utils/openaiClient';

describe('actionProcessor', () => {
  describe('processActions', () => {
    const mockThought = {
      text: 'Original thought text',
      tags: ['existing-tag'],
    };

    it('should auto-apply high confidence actions', () => {
      const actions: AIAction[] = [
        {
          type: 'enhanceThought',
          confidence: 0.9,
          reasoning: 'Improved clarity',
          data: {
            improvedText: 'Enhanced thought text',
            changes: [{ type: 'grammar', from: 'Original', to: 'Enhanced' }],
          },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.autoApply.text).toBe('Enhanced thought text');
      expect(result.autoApply.textChanges).toHaveLength(1);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should add medium confidence actions as suggestions', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.6,
          reasoning: 'Might be relevant',
          data: { tag: 'work' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.autoApply.tagsToAdd).toHaveLength(0);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('addTag');
      expect(result.suggestions[0].confidence).toBe(0.6);
    });

    it('should ignore low confidence actions', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.3,
          reasoning: 'Low confidence',
          data: { tag: 'maybe' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.autoApply.tagsToAdd).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should skip person linking even at high confidence', () => {
      const actions: AIAction[] = [
        {
          type: 'linkToPerson',
          confidence: 0.9,
          reasoning: 'Clear mention',
          data: { personId: 'person-123' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('linkToPerson');
    });

    it('should add regular tags at high confidence', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Clear topic',
          data: { tag: 'work' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.autoApply.tagsToAdd).toContain('work');
    });

    it('should skip deprecated person tags', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Person mentioned',
          data: { tag: 'person-john' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.autoApply.tagsToAdd).toHaveLength(0);
      expect(result.linksToCreate).toHaveLength(0);
    });

    it('should skip empty tags', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Empty tag',
          data: { tag: '' },
        },
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Empty tag',
          data: { tag: '   ' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.autoApply.tagsToAdd).toHaveLength(0);
    });

    it('should convert goal tags to links', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Goal link',
          data: { tag: 'goal-fitness-2024' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(1);
      expect(result.linksToCreate[0]).toEqual({
        targetType: 'goal',
        targetId: 'fitness-2024',
        relationshipType: 'linked-to',
        confidence: 0.9,
      });
      expect(result.autoApply.tagsToAdd).toHaveLength(0);
    });

    it('should convert project tags to links', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Project link',
          data: { tag: 'project-website-redesign' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(1);
      expect(result.linksToCreate[0]).toEqual({
        targetType: 'project',
        targetId: 'website-redesign',
        relationshipType: 'linked-to',
        confidence: 0.9,
      });
    });

    it('should handle linkToGoal action', () => {
      const actions: AIAction[] = [
        {
          type: 'linkToGoal',
          confidence: 0.9,
          reasoning: 'Related to goal',
          data: { goalId: 'goal-123' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(1);
      expect(result.linksToCreate[0].targetType).toBe('goal');
      expect(result.linksToCreate[0].targetId).toBe('goal-123');
    });

    it('should handle linkToProject action', () => {
      const actions: AIAction[] = [
        {
          type: 'linkToProject',
          confidence: 0.9,
          reasoning: 'Related to project',
          data: { projectId: 'project-456' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(1);
      expect(result.linksToCreate[0].targetType).toBe('project');
      expect(result.linksToCreate[0].targetId).toBe('project-456');
    });

    it('should not add duplicate tags', () => {
      const thought = {
        ...mockThought,
        tags: ['work'],
      };

      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Add work tag',
          data: { tag: 'work' },
        },
      ];

      const result = processActions(actions, thought);

      expect(result.autoApply.tagsToAdd).toHaveLength(0);
    });

    it('should not add duplicate links', () => {
      const actions: AIAction[] = [
        {
          type: 'linkToGoal',
          confidence: 0.9,
          reasoning: 'Link to goal',
          data: { goalId: 'goal-123' },
        },
        {
          type: 'linkToGoal',
          confidence: 0.9,
          reasoning: 'Link to same goal',
          data: { goalId: 'goal-123' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(1);
    });

    it('should handle unknown action types with warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const actions: AIAction[] = [
        {
          type: 'unknownActionType' as any,
          confidence: 0.9,
          reasoning: 'Unknown',
          data: {},
        },
      ];

      processActions(actions, mockThought);

      expect(warnSpy).toHaveBeenCalledWith(
        'Unknown high-confidence action type: unknownActionType'
      );

      warnSpy.mockRestore();
    });

    it('should handle goal tags with empty ID', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Empty goal tag',
          data: { tag: 'goal-' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(0);
    });

    it('should handle project tags with empty ID', () => {
      const actions: AIAction[] = [
        {
          type: 'addTag',
          confidence: 0.9,
          reasoning: 'Empty project tag',
          data: { tag: 'project-' },
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(0);
    });

    it('should handle linkToGoal with missing goalId', () => {
      const actions: AIAction[] = [
        {
          type: 'linkToGoal',
          confidence: 0.9,
          reasoning: 'Missing goal ID',
          data: {},
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(0);
    });

    it('should handle linkToProject with missing projectId', () => {
      const actions: AIAction[] = [
        {
          type: 'linkToProject',
          confidence: 0.9,
          reasoning: 'Missing project ID',
          data: {},
        },
      ];

      const result = processActions(actions, mockThought);

      expect(result.linksToCreate).toHaveLength(0);
    });
  });

  describe('buildThoughtUpdate', () => {
    const mockThought = {
      text: 'Original text',
      tags: ['old-tag'],
    };

    it('should build update with text enhancement', () => {
      const processedActions: ProcessedActions = {
        autoApply: {
          text: 'Enhanced text',
          textChanges: [{ type: 'grammar', from: 'Original', to: 'Enhanced' }],
          tagsToAdd: ['new-tag'],
        },
        suggestions: [],
        linksToCreate: [],
      };

      const { update, historyEntry } = buildThoughtUpdate(
        processedActions,
        mockThought,
        150,
        'auto'
      );

      expect(update.text).toBe('Enhanced text');
      expect(update.tags).toContain('new-tag');
      expect(update.tags).toContain('processed');
      expect(update.aiAppliedChanges.textEnhanced).toBe(true);
      expect(historyEntry.tokensUsed).toBe(150);
      expect(historyEntry.changesApplied).toBe(2);
    });

    it('should not update text if unchanged', () => {
      const processedActions: ProcessedActions = {
        autoApply: {
          text: 'Original text',
          tagsToAdd: [],
        },
        suggestions: [],
        linksToCreate: [],
      };

      const { update } = buildThoughtUpdate(
        processedActions,
        mockThought,
        50,
        'manual'
      );

      expect(update.text).toBeUndefined();
    });

    it('should preserve original data', () => {
      const processedActions: ProcessedActions = {
        autoApply: {
          text: 'New text',
          tagsToAdd: ['tag1'],
        },
        suggestions: [],
        linksToCreate: [],
      };

      const { update } = buildThoughtUpdate(
        processedActions,
        mockThought,
        100,
        'auto'
      );

      expect(update.originalText).toBe('Original text');
      expect(update.originalTags).toEqual(['old-tag']);
    });

    it('should add processed tag only if changes were made', () => {
      const processedActionsWithChanges: ProcessedActions = {
        autoApply: {
          tagsToAdd: ['work'],
        },
        suggestions: [],
        linksToCreate: [],
      };

      const { update } = buildThoughtUpdate(
        processedActionsWithChanges,
        mockThought,
        50,
        'auto'
      );

      expect(update.tags).toContain('processed');
    });

    it('should not add processed tag if no changes', () => {
      const processedActionsNoChanges: ProcessedActions = {
        autoApply: {
          tagsToAdd: [],
        },
        suggestions: [],
        linksToCreate: [],
      };

      const { update } = buildThoughtUpdate(
        processedActionsNoChanges,
        mockThought,
        0,
        'auto'
      );

      expect(update.tags).not.toContain('processed');
    });

    it('should count links in changes', () => {
      const processedActions: ProcessedActions = {
        autoApply: {
          tagsToAdd: [],
        },
        suggestions: [],
        linksToCreate: [
          { targetType: 'goal', targetId: 'g1', relationshipType: 'linked-to' },
          { targetType: 'project', targetId: 'p1', relationshipType: 'linked-to' },
        ],
      };

      const { update, historyEntry } = buildThoughtUpdate(
        processedActions,
        mockThought,
        75,
        'reprocess'
      );

      expect(update.aiAppliedChanges.linksCreated).toBe(2);
      expect(historyEntry.changesApplied).toBe(2);
      expect(update.tags).toContain('processed');
    });

    it('should track suggestions count', () => {
      const processedActions: ProcessedActions = {
        autoApply: {
          tagsToAdd: [],
        },
        suggestions: [
          {
            id: '1',
            type: 'addTag',
            confidence: 0.6,
            data: {},
            reasoning: 'test',
            createdAt: new Date().toISOString(),
            status: 'pending',
          },
          {
            id: '2',
            type: 'linkToPerson',
            confidence: 0.7,
            data: {},
            reasoning: 'test',
            createdAt: new Date().toISOString(),
            status: 'pending',
          },
        ],
        linksToCreate: [],
      };

      const { update, historyEntry } = buildThoughtUpdate(
        processedActions,
        mockThought,
        80,
        'manual'
      );

      expect(update.aiSuggestions).toHaveLength(2);
      expect(historyEntry.suggestionsCount).toBe(2);
    });

    it('should use correct trigger in history', () => {
      const processedActions: ProcessedActions = {
        autoApply: { tagsToAdd: ['test'] },
        suggestions: [],
        linksToCreate: [],
      };

      const { update: autoUpdate } = buildThoughtUpdate(
        processedActions,
        mockThought,
        50,
        'auto'
      );

      expect(autoUpdate.aiAppliedChanges.appliedBy).toBe('auto');

      const { update: manualUpdate } = buildThoughtUpdate(
        processedActions,
        mockThought,
        50,
        'manual'
      );

      expect(manualUpdate.aiAppliedChanges.appliedBy).toBe('manual-trigger');
    });
  });

  describe('countChanges', () => {
    it('should count all types of changes', () => {
      const processedActions: ProcessedActions = {
        autoApply: {
          text: 'New text',
          tagsToAdd: ['tag1', 'tag2'],
        },
        suggestions: [],
        linksToCreate: [
          { targetType: 'goal', targetId: 'g1', relationshipType: 'linked-to' },
        ],
      };

      const count = countChanges(processedActions);

      expect(count).toBe(4); // 1 text + 2 tags + 1 link
    });

    it('should return zero for no changes', () => {
      const processedActions: ProcessedActions = {
        autoApply: {
          tagsToAdd: [],
        },
        suggestions: [],
        linksToCreate: [],
      };

      const count = countChanges(processedActions);

      expect(count).toBe(0);
    });

    it('should count only tags if no text or links', () => {
      const processedActions: ProcessedActions = {
        autoApply: {
          tagsToAdd: ['tag1', 'tag2', 'tag3'],
        },
        suggestions: [],
        linksToCreate: [],
      };

      const count = countChanges(processedActions);

      expect(count).toBe(3);
    });
  });
});
