import { ThoughtProcessingService } from '@/services/thoughtProcessingService';
import { useThoughts } from '@/store/useThoughts';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';
import { useAnonymousSession } from '@/store/useAnonymousSession';
import { useSubscriptionStatus } from '@/store/useSubscriptionStatus';
import { Thought, AISuggestion } from '@/store/useThoughts';
import { httpsCallable } from 'firebase/functions';

// Mock the stores
jest.mock('@/store/useThoughts');
jest.mock('@/store/useTasks');
jest.mock('@/store/useProjects');
jest.mock('@/store/useGoals');
jest.mock('@/store/useMoods');
jest.mock('@/store/useAnonymousSession');
jest.mock('@/store/useSubscriptionStatus');
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));
jest.mock('@/lib/firebaseClient', () => ({
  auth: { currentUser: { uid: 'user-123', isAnonymous: false } },
  db: {} as any,
  functionsClient: {},
}));

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

    (useAnonymousSession as any).getState = jest.fn(() => ({
      allowAi: true,
    }));

    (useSubscriptionStatus as any).getState = jest.fn(() => ({
      subscription: { tier: 'pro', status: 'active' },
      entitlement: { allowed: true, code: 'allowed' },
      hasProAccess: true,
      isLoading: false,
      fromCache: false,
      lastUpdatedAt: new Date().toISOString(),
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
          // NOTE: thoughtId no longer in task data - linking via relationships store
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
        // NOTE: sourceThoughtId no longer in metadata - linking via relationships store
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

      await ThoughtProcessingService.applySuggestion('thought-1', 'suggestion-1');

      // Should create the task (with high confidence it executes)
      expect(addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Suggested task',
          category: 'mastery',
          priority: 'medium',
          status: 'active',
          focusEligible: true,
          // NOTE: thoughtId no longer in task data - linking via relationships store
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

  describe('processThought scheduling', () => {
    it('should enqueue thought for processing via callable', async () => {
      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [mockThought],
        updateThought,
      }));

      const callableResponse = { data: { success: true, jobId: 'job-123', queued: true } };
      const callable = jest.fn().mockResolvedValue(callableResponse);
      (httpsCallable as jest.Mock).mockReturnValue(callable);

      const result = await ThoughtProcessingService.processThought('thought-1');

      expect(httpsCallable).toHaveBeenCalledWith(expect.any(Object), 'manualProcessThought');
      expect(callable).toHaveBeenCalledWith({
        thoughtId: 'thought-1',
        toolSpecIds: expect.arrayContaining(['thoughts']),
      });
      expect(updateThought).toHaveBeenCalledWith('thought-1', expect.objectContaining({
        aiProcessingStatus: 'pending',
        aiError: undefined,
      }));
      expect(result).toEqual({ success: true, queued: true, jobId: 'job-123' });
    });

    it('should surface callable errors', async () => {
      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [mockThought],
        updateThought,
      }));

      const callableError = new Error('call failed');
      const callable = jest.fn().mockRejectedValue(callableError);
      (httpsCallable as jest.Mock).mockReturnValue(callable);

      const result = await ThoughtProcessingService.processThought('thought-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('call failed');
    });

    it('should block processing when subscription is inactive', async () => {
      const updateThought = jest.fn();
      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [mockThought],
        updateThought,
      }));

      (useSubscriptionStatus as any).getState = jest.fn(() => ({
        subscription: { tier: 'pro', status: 'past_due' },
        entitlement: { allowed: false, code: 'inactive' },
        hasProAccess: false,
        isLoading: false,
        fromCache: false,
        lastUpdatedAt: null,
      }));

      const result = await ThoughtProcessingService.processThought('thought-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
      expect(httpsCallable).not.toHaveBeenCalled();
      expect(updateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          aiProcessingStatus: 'blocked',
          aiError: expect.stringContaining('inactive'),
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
