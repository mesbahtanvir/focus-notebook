import { ThoughtProcessingService } from '@/services/thoughtProcessingService';
import { useThoughts } from '@/store/useThoughts';
import { useTasks } from '@/store/useTasks';
import { useLLMQueue } from '@/store/useLLMQueue';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';
import { useRelationships } from '@/store/useRelationships';
import { Thought, AISuggestion } from '@/store/useThoughts';

// Mock the stores
jest.mock('@/store/useThoughts');
jest.mock('@/store/useTasks');
jest.mock('@/store/useProjects');
jest.mock('@/store/useGoals');
jest.mock('@/store/useMoods');
jest.mock('@/store/useRelationships');
jest.mock('@/store/useLLMQueue');
jest.mock('@/store/useSettings');

describe('ThoughtProcessingService', () => {
  const mockThought: Thought = {
    id: 'thought-1',
    text: 'Test thought about creating a task',
    createdAt: new Date().toISOString(),
    tags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (useThoughts as any).getState = jest.fn(() => ({
      thoughts: [mockThought],
      updateThought: jest.fn(),
    }));

    (useTasks as any).getState = jest.fn(() => ({
      tasks: [],
      add: jest.fn(),
      updateTask: jest.fn(),
    }));

    (useProjects as any).getState = jest.fn(() => ({
      projects: [],
    }));

    (useGoals as any).getState = jest.fn(() => ({
      goals: [],
    }));

    (useMoods as any).getState = jest.fn(() => ({
      moods: [],
      add: jest.fn(),
    }));

    (useRelationships as any).getState = jest.fn(() => ({
      people: [],
    }));

    (useLLMQueue as any).getState = jest.fn(() => ({
      addRequest: jest.fn(() => 'request-1'),
      getRequest: jest.fn(() => ({
        id: 'request-1',
        status: 'pending',
      })),
    }));
  });

  describe('Confidence-based action execution', () => {
    it('should auto-apply actions with confidence >= 99%', async () => {
      const highConfidenceActions = [
        {
          type: 'createTask',
          data: { title: 'High confidence task', category: 'mastery', priority: 'high' },
          reasoning: 'Very clear task',
          confidence: 99,
        },
        {
          type: 'createMood',
          data: { value: 8, note: 'Feeling great' },
          reasoning: 'Clear emotion',
          confidence: 100,
        },
      ];

      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [mockThought],
        updateThought,
      }));

      await ThoughtProcessingService.executeActions('thought-1', highConfidenceActions);

      // Should update thought tags to mark as processed
      expect(updateThought).toHaveBeenCalledWith('thought-1', { tags: ['processed'] });
    });

    it('should save actions with confidence 70-98% as suggestions', async () => {
      const mediumConfidenceActions = [
        {
          type: 'createTask',
          data: { title: 'Medium confidence task', category: 'mastery', priority: 'medium' },
          reasoning: 'Possible task',
          confidence: 85,
        },
        {
          type: 'addTag',
          data: { tag: 'tool-tasks' },
          reasoning: 'Contains actionable items',
          confidence: 70,
        },
      ];

      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [mockThought],
        updateThought,
      }));

      await ThoughtProcessingService.executeActions('thought-1', mediumConfidenceActions);

      // Should save suggestions
      expect(updateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          aiSuggestions: expect.arrayContaining([
            expect.objectContaining({
              type: 'createTask',
              confidence: 85,
              status: 'pending',
            }),
            expect.objectContaining({
              type: 'addTag',
              confidence: 70,
              status: 'pending',
            }),
          ]),
        })
      );
    });

    it('should ignore actions with confidence < 70%', async () => {
      const lowConfidenceActions = [
        {
          type: 'createTask',
          data: { title: 'Low confidence task', category: 'mastery', priority: 'low' },
          reasoning: 'Uncertain',
          confidence: 50,
        },
      ];

      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [mockThought],
        updateThought,
      }));

      await ThoughtProcessingService.executeActions('thought-1', lowConfidenceActions);

      // Should not save suggestions
      expect(updateThought).not.toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({ aiSuggestions: expect.anything() })
      );
    });
  });

  describe('Action execution', () => {
    it('should create task for createTask action', async () => {
      const addTask = jest.fn();
      (useTasks as any).getState = jest.fn(() => ({
        add: addTask,
      }));

      const actions = [
        {
          type: 'createTask',
          data: { title: 'New task', category: 'mastery', priority: 'high' },
          reasoning: 'Create task',
          confidence: 99,
        },
      ];

      await ThoughtProcessingService.executeActions('thought-1', actions);

      expect(addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New task',
          category: 'mastery',
          priority: 'high',
          status: 'active',
          focusEligible: true,
          thoughtId: 'thought-1', // Bug 4 fix
          createdBy: 'ai', // Bug 1 fix
        })
      );
    });

    it('should enhance existing task for enhanceTask action', async () => {
      const updateTask = jest.fn();
      (useTasks as any).getState = jest.fn(() => ({
        updateTask,
      }));

      const actions = [
        {
          type: 'enhanceTask',
          data: { 
            taskId: 'task-1', 
            updates: { notes: 'Enhanced with more context' } 
          },
          reasoning: 'Enhance task',
          confidence: 99,
        },
      ];

      await ThoughtProcessingService.executeActions('thought-1', actions);

      expect(updateTask).toHaveBeenCalledWith('task-1', { notes: 'Enhanced with more context' });
    });

    it('should create mood entry for createMood action', async () => {
      const addMood = jest.fn();
      (useMoods as any).getState = jest.fn(() => ({
        add: addMood,
      }));

      const actions = [
        {
          type: 'createMood',
          data: { value: 7, note: 'Feeling good' },
          reasoning: 'Create mood',
          confidence: 99,
        },
      ];

      await ThoughtProcessingService.executeActions('thought-1', actions);

      expect(addMood).toHaveBeenCalledWith({
        value: 7,
        note: 'Feeling good',
        metadata: { sourceThoughtId: 'thought-1' }, // Bug 4 fix
      });
    });

    it('should add tags to thought for addTag action', async () => {
      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [{ ...mockThought, tags: [] }],
        updateThought,
      }));

      const actions = [
        {
          type: 'addTag',
          data: { tag: 'tool-tasks' },
          reasoning: 'Add tag',
          confidence: 99,
        },
      ];

      await ThoughtProcessingService.executeActions('thought-1', actions);

      expect(updateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          tags: ['tool-tasks'],
        })
      );
    });
  });

  describe('Suggestion management', () => {
    it('should apply suggestion when accepted', async () => {
      const thoughtWithSuggestions = {
        ...mockThought,
        aiSuggestions: [
          {
            id: 'suggestion-1',
            type: 'createTask' as const,
            confidence: 99, // Use high confidence so it gets executed
            data: { title: 'Suggested task', category: 'mastery', priority: 'medium' },
            reasoning: 'This is a good task',
            createdAt: new Date().toISOString(),
            status: 'pending' as const,
          },
        ],
      };

      const updateThought = jest.fn();
      const addTask = jest.fn();

      let mockGetStateCallCount = 0;
      (useThoughts as any).getState = jest.fn(() => {
        mockGetStateCallCount++;
        return {
          thoughts: [thoughtWithSuggestions],
          updateThought,
        };
      });

      (useTasks as any).getState = jest.fn(() => ({
        add: addTask,
        updateTask: jest.fn(),
      }));

      (useMoods as any).getState = jest.fn(() => ({
        moods: [],
        add: jest.fn(),
      }));

      (useProjects as any).getState = jest.fn(() => ({
        projects: [],
      }));

      (useGoals as any).getState = jest.fn(() => ({
        goals: [],
      }));

      (useRelationships as any).getState = jest.fn(() => ({
        people: [],
      }));

      await ThoughtProcessingService.applySuggestion('thought-1', 'suggestion-1');

      // Should create the task (with high confidence it executes)
      expect(addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Suggested task',
          category: 'mastery',
          priority: 'medium',
          status: 'active',
          focusEligible: true,
          thoughtId: 'thought-1', // Bug 4 fix
          createdBy: 'ai', // Bug 1 fix
        })
      );

      // Should update suggestion status to accepted
      expect(updateThought).toHaveBeenCalled();
      
      // Verify that the last call updates the suggestion status
      const lastCall = updateThought.mock.calls[updateThought.mock.calls.length - 1];
      expect(lastCall[1]).toEqual(
        expect.objectContaining({
          aiSuggestions: expect.arrayContaining([
            expect.objectContaining({
              id: 'suggestion-1',
              status: 'accepted',
            }),
          ]),
        })
      );
    });

    it('should reject suggestion and update status', async () => {
      const thoughtWithSuggestions = {
        ...mockThought,
        aiSuggestions: [
          {
            id: 'suggestion-1',
            type: 'createTask' as const,
            confidence: 85,
            data: { title: 'Suggested task', category: 'mastery', priority: 'medium' },
            reasoning: 'This is a good task',
            createdAt: new Date().toISOString(),
            status: 'pending' as const,
          },
        ],
      };

      const updateThought = jest.fn();

      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [thoughtWithSuggestions],
        updateThought,
      }));

      await ThoughtProcessingService.rejectSuggestion('thought-1', 'suggestion-1');

      // Should update suggestion status to rejected
      expect(updateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          aiSuggestions: expect.arrayContaining([
            expect.objectContaining({
              id: 'suggestion-1',
              status: 'rejected',
            }),
          ]),
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle mixed confidence levels correctly', async () => {
      const mixedActions = [
        { type: 'createTask', data: {}, reasoning: '', confidence: 99 }, // Auto-apply
        { type: 'createProject', data: {}, reasoning: '', confidence: 85 }, // Save as suggestion
        { type: 'createGoal', data: {}, reasoning: '', confidence: 50 }, // Ignore
      ];

      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [mockThought],
        updateThought,
      }));

      await ThoughtProcessingService.executeActions('thought-1', mixedActions);

      // Should save only the medium confidence action as suggestion
      expect(updateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          aiSuggestions: expect.arrayContaining([
            expect.objectContaining({
              type: 'createProject',
              confidence: 85,
            }),
          ]),
        })
      );
    });

    it('should not add duplicate tags', async () => {
      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [{ ...mockThought, tags: ['tool-tasks'] }],
        updateThought,
      }));

      const actions = [
        {
          type: 'addTag',
          data: { tag: 'tool-tasks' },
          reasoning: 'Add existing tag',
          confidence: 99,
        },
      ];

      await ThoughtProcessingService.executeActions('thought-1', actions);

      // Should not add duplicate tag, only add 'processed' tag
      const calls = updateThought.mock.calls;
      const tagsUpdateCall = calls.find(call => call[1].tags);
      
      expect(tagsUpdateCall).toBeDefined();
      expect(tagsUpdateCall![1].tags).toEqual(expect.arrayContaining(['processed']));
      // The 'tool-tasks' tag should not be duplicated
      expect(tagsUpdateCall![1].tags.filter((t: string) => t === 'tool-tasks')).toHaveLength(1);
    });

    it('should handle empty actions array', async () => {
      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [mockThought],
        updateThought,
      }));

      await ThoughtProcessingService.executeActions('thought-1', []);

      // Should still mark as processed
      expect(updateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          tags: expect.arrayContaining(['processed']),
        })
      );
    });
  });
});

