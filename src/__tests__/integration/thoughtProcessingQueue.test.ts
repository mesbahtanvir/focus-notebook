import { ThoughtProcessingService } from '@/services/thoughtProcessingService';
import { useThoughts } from '@/store/useThoughts';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';
import { useAnonymousSession } from '@/store/useAnonymousSession';
import { Thought } from '@/store/useThoughts';
import { useToolEnrollment } from '@/store/useToolEnrollment';
import { httpsCallable } from 'firebase/functions';

jest.mock('@/store/useThoughts');
jest.mock('@/store/useTasks');
jest.mock('@/store/useProjects');
jest.mock('@/store/useGoals');
jest.mock('@/store/useMoods');
jest.mock('@/store/useAnonymousSession');
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));
jest.mock('@/lib/firebaseClient', () => ({
  auth: { currentUser: { uid: 'user-abc', isAnonymous: false } },
  db: {} as any,
  functionsClient: {},
}));
jest.mock('@/store/useToolEnrollment');

describe('Thought processing queue integration', () => {
  const baseThought: Thought = {
    id: 'thought-1',
    text: 'Need to follow up with Priya and I am feeling anxious about the presentation',
    createdAt: new Date().toISOString(),
    tags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useAnonymousSession as any).getState = jest.fn(() => ({ allowAi: true }));

    (useThoughts as any).getState = jest.fn(() => ({
      thoughts: [baseThought],
      updateThought: jest.fn(),
    }));

    (useTasks as any).getState = jest.fn(() => ({
      tasks: [],
      add: jest.fn(),
      updateTask: jest.fn(),
    }));

    (useProjects as any).getState = jest.fn(() => ({
      projects: [],
      add: jest.fn(),
    }));

    (useGoals as any).getState = jest.fn(() => ({
      goals: [],
      add: jest.fn(),
    }));

    (useMoods as any).getState = jest.fn(() => ({
      moods: [],
      add: jest.fn(),
    }));

    (useToolEnrollment as any).getState = jest.fn(() => ({
      enrolledToolIds: ['thoughts', 'cbt'],
      isToolEnrolled: (id: string) => ['thoughts', 'cbt'].includes(id),
    }));
  });

  it('queues processing via callable without applying changes locally', async () => {
    const updateThought = jest.fn();
    (useThoughts as any).getState = jest.fn(() => ({
      thoughts: [baseThought],
      updateThought,
    }));

    const callable = jest.fn().mockResolvedValue({
      data: { success: true, jobId: 'job-xyz', queued: true },
    });
    (httpsCallable as jest.Mock).mockReturnValue(callable);

    const result = await ThoughtProcessingService.processThought(baseThought.id);

    expect(httpsCallable).toHaveBeenCalledWith(expect.any(Object), 'manualProcessThought');
    expect(callable).toHaveBeenCalledWith({
      thoughtId: baseThought.id,
      toolSpecIds: expect.arrayContaining(['thoughts']),
    });
    expect(updateThought).toHaveBeenCalledWith(baseThought.id, expect.objectContaining({
      aiProcessingStatus: 'pending',
      aiError: undefined,
    }));
    expect(result).toEqual({ success: true, queued: true, jobId: 'job-xyz' });

    const taskAdd = (useTasks as any).getState().add;
    expect(taskAdd).not.toHaveBeenCalled();
  });

  it('auto-applies high confidence actions and stores medium confidence suggestions', async () => {
    const updateThought = jest.fn();
    const addTask = jest.fn();
    const addMood = jest.fn();

    (useThoughts as any).getState = jest.fn(() => ({
      thoughts: [baseThought],
      updateThought,
    }));

    (useTasks as any).getState = jest.fn(() => ({
      tasks: [],
      add: addTask,
      updateTask: jest.fn(),
    }));

    (useMoods as any).getState = jest.fn(() => ({
      moods: [],
      add: addMood,
    }));

    const actions = [
      {
        type: 'createTask',
        confidence: 99,
        data: { title: 'Follow up with Priya', category: 'mastery', priority: 'high' },
        reasoning: 'Clear next action',
      },
      {
        type: 'createMood',
        confidence: 99,
        data: { value: 4, note: 'Feeling anxious about presentation' },
        reasoning: 'Emotional state expressed',
      },
      {
        type: 'addTag',
        confidence: 72,
        data: { tag: 'tool-mood' },
        reasoning: 'Likely mood related',
      },
    ];

    await ThoughtProcessingService.executeActions(baseThought.id, actions as any);

    expect(addTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Follow up with Priya',
        category: 'mastery',
        priority: 'high',
        thoughtId: baseThought.id,
        createdBy: 'ai',
      })
    );

    expect(addMood).toHaveBeenCalledWith({
      value: 4,
      note: 'Feeling anxious about presentation',
      metadata: { sourceThoughtId: baseThought.id },
    });

    const suggestionCall = updateThought.mock.calls
      .map((call: any) => call[1])
      .find((payload: any) => Array.isArray(payload?.aiSuggestions));
    expect(suggestionCall?.aiSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'addTag',
          confidence: 72,
          status: 'pending',
        }),
      ])
    );

    const finalCall = updateThought.mock.calls[updateThought.mock.calls.length - 1][1];
    expect(finalCall.tags).toContain('processed');
  });
});
