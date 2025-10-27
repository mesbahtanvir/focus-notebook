import { ThoughtProcessingService } from '@/services/thoughtProcessingService';
import { useThoughts } from '@/store/useThoughts';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';
import { useRelationships } from '@/store/useRelationships';
import { useLLMQueue } from '@/store/useLLMQueue';
import { useSettings } from '@/store/useSettings';
import { Thought, AISuggestion } from '@/store/useThoughts';

// Mock stores
jest.mock('@/store/useThoughts');
jest.mock('@/store/useTasks');
jest.mock('@/store/useProjects');
jest.mock('@/store/useGoals');
jest.mock('@/store/useMoods');
jest.mock('@/store/useRelationships');
jest.mock('@/store/useLLMQueue');
jest.mock('@/store/useSettings');
jest.mock('@/store/useFriends');

describe('Full Thought Suggestion Flow', () => {
  let mockThought: Thought;
  let mockUpdateThought: ReturnType<typeof jest.fn>;
  let mockAddTask: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockThought = {
      id: 'thought-1',
      text: 'I need to remember to buy groceries and also I feel anxious about the presentation tomorrow',
      createdAt: new Date().toISOString(),
      tags: [],
    };

    mockUpdateThought = jest.fn();
    mockAddTask = jest.fn();

    // Setup mock stores
    (useThoughts as any).getState = jest.fn(() => ({
      thoughts: [mockThought],
      updateThought: mockUpdateThought,
      deleteThought: jest.fn(),
    }));

    (useTasks as any).getState = jest.fn(() => ({
      tasks: [],
      add: mockAddTask,
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    }));

    (useProjects as any).getState = jest.fn(() => ({
      projects: [],
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }));

    (useGoals as any).getState = jest.fn(() => ({
      goals: [],
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }));

    (useMoods as any).getState = jest.fn(() => ({
      moods: [],
      add: jest.fn(),
      delete: jest.fn(),
    }));

    (useRelationships as any).getState = jest.fn(() => ({
      people: [],
    }));

    (useLLMQueue as any).getState = jest.fn(() => ({
      addRequest: jest.fn(() => 'request-1'),
      getRequest: jest.fn(() => null),
    }));

    (useSettings as any).getState = jest.fn(() => ({
      hasApiKey: jest.fn(() => true),
      settings: {
        openaiApiKey: 'sk-test',
      },
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('End-to-end flow: Thought creation → AI processing → Suggestions', () => {
    it('should process thought and auto-apply high confidence actions', async () => {
      const aiResult = {
        actions: [
          {
            type: 'createMood',
            confidence: 99,
            data: { value: 4, note: 'Feeling anxious' },
            reasoning: 'Clear emotional expression about anxiety',
          },
          {
            type: 'addTag',
            confidence: 95,
            data: { tag: 'tool-mood' },
            reasoning: 'Contains mood information',
          },
        ],
      };

      // Mock LLM queue response
      (useLLMQueue as any).getState = jest.fn((fn) => {
        const state = {
          addRequest: jest.fn(() => 'request-1'),
          getRequest: jest.fn((id: string) => {
            if (id === 'request-1') {
              return {
                id: 'request-1',
                status: 'completed',
                output: { result: aiResult },
              };
            }
            return null;
          }),
        };
        return fn ? fn(state) : state;
      });

      const addMood = jest.fn();
      (useMoods as any).getState = jest.fn(() => ({
        moods: [],
        add: addMood,
      }));

      // Simulate processing the thought
      const result = await ThoughtProcessingService.processThought('thought-1');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have completed
      expect(result.success).toBe(true);

      // Should have created mood entry
      expect(addMood).toHaveBeenCalledWith({
        value: 4,
        note: 'Feeling anxious',
      });

      // Should have updated thought with processed tag
      expect(mockUpdateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          tags: expect.arrayContaining(['processed']),
        })
      );
    });

    it('should save medium confidence actions as suggestions', async () => {
      const aiResult = {
        actions: [
          {
            type: 'createTask',
            confidence: 85,
            data: { title: 'Buy groceries', category: 'mastery', priority: 'medium' },
            reasoning: 'Thought contains actionable item for buying groceries',
          },
          {
            type: 'createProject',
            confidence: 75,
            data: { title: 'Prepare for presentation', description: 'Get ready for tomorrow' },
            reasoning: 'Thought suggests a project for presentation preparation',
          },
        ],
      };

      (useLLMQueue as any).getState = jest.fn((fn) => {
        const state = {
          addRequest: jest.fn(() => 'request-1'),
          getRequest: jest.fn((id: string) => {
            if (id === 'request-1') {
              return {
                id: 'request-1',
                status: 'completed',
                output: { result: aiResult },
              };
            }
            return null;
          }),
        };
        return fn ? fn(state) : state;
      });

      await ThoughtProcessingService.processThought('thought-1');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have saved suggestions
      expect(mockUpdateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          aiSuggestions: expect.arrayContaining([
            expect.objectContaining({
              type: 'createTask',
              confidence: 85,
              status: 'pending',
            }),
            expect.objectContaining({
              type: 'createProject',
              confidence: 75,
              status: 'pending',
            }),
          ]),
        })
      );
    });

    it('should handle mixed confidence levels correctly', async () => {
      const aiResult = {
        actions: [
          {
            type: 'createMood',
            confidence: 99,
            data: { value: 6, note: 'Mixed feelings' },
            reasoning: 'High confidence mood',
          },
          {
            type: 'createTask',
            confidence: 80,
            data: { title: 'Task suggestion', category: 'mastery', priority: 'medium' },
            reasoning: 'Medium confidence task',
          },
          {
            type: 'createGoal',
            confidence: 50,
            data: { title: 'Vague goal' },
            reasoning: 'Low confidence goal',
          },
        ],
      };

      (useLLMQueue as any).getState = jest.fn((fn) => {
        const state = {
          addRequest: jest.fn(() => 'request-1'),
          getRequest: jest.fn((id: string) => {
            if (id === 'request-1') {
              return {
                id: 'request-1',
                status: 'completed',
                output: { result: aiResult },
              };
            }
            return null;
          }),
        };
        return fn ? fn(state) : state;
      });

      const addMood = jest.fn();
      (useMoods as any).getState = jest.fn(() => ({
        moods: [],
        add: addMood,
      }));

      await ThoughtProcessingService.processThought('thought-1');

      await new Promise(resolve => setTimeout(resolve, 100));

      // High confidence action should be auto-applied
      expect(addMood).toHaveBeenCalled();

      // Medium confidence action should be saved as suggestion
      expect(mockUpdateThought).toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          aiSuggestions: expect.arrayContaining([
            expect.objectContaining({
              type: 'createTask',
              confidence: 80,
              status: 'pending',
            }),
          ]),
        })
      );

      // Low confidence action should be ignored
      expect(mockUpdateThought).not.toHaveBeenCalledWith(
        'thought-1',
        expect.objectContaining({
          aiSuggestions: expect.arrayContaining([
            expect.objectContaining({
              type: 'createGoal',
            }),
          ]),
        })
      );
    });
  });

  describe('Suggestion acceptance flow', () => {
    it('should apply suggestion when user accepts', async () => {
      const thoughtWithSuggestions: Thought = {
        ...mockThought,
        aiSuggestions: [
          {
            id: 'suggestion-1',
            type: 'createTask',
            confidence: 85,
            data: { title: 'Buy groceries', category: 'mastery', priority: 'medium' },
            reasoning: 'Thought contains actionable item for buying groceries',
            createdAt: new Date().toISOString(),
            status: 'pending',
          },
        ],
      };

      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [thoughtWithSuggestions],
        updateThought: mockUpdateThought,
      }));

      await ThoughtProcessingService.applySuggestion('thought-1', 'suggestion-1');

      // Should create the task
      expect(mockAddTask).toHaveBeenCalledWith({
        title: 'Buy groceries',
        category: 'mastery',
        priority: 'medium',
        status: 'active',
        focusEligible: true,
      });

      // Should update suggestion status to accepted
      expect(mockUpdateThought).toHaveBeenCalledWith(
        'thought-1',
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
      const thoughtWithSuggestions: Thought = {
        ...mockThought,
        aiSuggestions: [
          {
            id: 'suggestion-1',
            type: 'createTask',
            confidence: 85,
            data: { title: 'Suggested task', category: 'mastery', priority: 'medium' },
            reasoning: 'This is a good task',
            createdAt: new Date().toISOString(),
            status: 'pending',
          },
        ],
      };

      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [thoughtWithSuggestions],
        updateThought: mockUpdateThought,
      }));

      await ThoughtProcessingService.rejectSuggestion('thought-1', 'suggestion-1');

      // Should not create the task
      expect(mockAddTask).not.toHaveBeenCalled();

      // Should update suggestion status to rejected
      expect(mockUpdateThought).toHaveBeenCalledWith(
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

  describe('Error handling', () => {
    it('should handle processing failure gracefully', async () => {
      (useLLMQueue as any).getState = jest.fn((fn) => {
        const state = {
          addRequest: jest.fn(() => 'request-1'),
          getRequest: jest.fn((id: string) => {
            if (id === 'request-1') {
              return {
                id: 'request-1',
                status: 'failed',
                error: 'API error',
              };
            }
            return null;
          }),
        };
        return fn ? fn(state) : state;
      });

      const result = await ThoughtProcessingService.processThought('thought-1');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });

    it('should handle missing API key', async () => {
      (useSettings as any).getState = jest.fn(() => ({
        hasApiKey: jest.fn(() => false),
        settings: {},
      }));

      const result = await ThoughtProcessingService.processThought('thought-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI API key not configured');
    });

    it('should handle already processed thoughts', async () => {
      const processedThought = {
        ...mockThought,
        tags: ['processed'],
      };

      (useThoughts as any).getState = jest.fn(() => ({
        thoughts: [processedThought],
        updateThought: jest.fn(),
      }));

      const result = await ThoughtProcessingService.processThought('thought-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Thought already processed');
    });
  });

  describe('Comprehensive context gathering', () => {
    it('should include all relevant user data in context', async () => {
      const mockGoals = [{ id: 'goal-1', title: 'Test Goal', status: 'active' }];
      const mockProjects = [{ id: 'project-1', title: 'Test Project', status: 'active' }];
      const mockTasks = [{ id: 'task-1', title: 'Test Task', done: false }];
      const mockMoods = [{ id: 'mood-1', value: 7 }];
      const mockPeople = [{ id: 'person-1', name: 'Test Person', relationshipType: 'friend' }];

      (useGoals as any).getState = jest.fn(() => ({ goals: mockGoals }));
      (useProjects as any).getState = jest.fn(() => ({ projects: mockProjects }));
      (useTasks as any).getState = jest.fn(() => ({ tasks: mockTasks }));
      (useMoods as any).getState = jest.fn(() => ({ moods: mockMoods }));
      (useRelationships as any).getState = jest.fn(() => ({ people: mockPeople }));

      let capturedContext: any;

      (useLLMQueue as any).getState = jest.fn((fn) => {
        const state = {
          addRequest: jest.fn((request: any) => {
            capturedContext = request.input.context;
            return 'request-1';
          }),
          getRequest: jest.fn(() => null),
        };
        return fn ? fn(state) : state;
      });

      await ThoughtProcessingService.processThought('thought-1');

      expect(capturedContext).toBeDefined();
      expect(capturedContext.goals).toEqual(mockGoals);
      expect(capturedContext.projects).toEqual(mockProjects);
      expect(capturedContext.tasks).toEqual(mockTasks);
      expect(capturedContext.moods).toEqual(mockMoods);
      expect(capturedContext.relationships).toEqual(mockPeople);
    });
  });
});

