import { renderHook, act } from '@testing-library/react';
import { useGoals, Goal } from '@/store/useGoals';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  }),
}));

const { createAt: mockCreateAt, updateAt: mockUpdateAt, deleteAt: mockDeleteAt } = require('@/lib/data/gateway') as {
  createAt: jest.Mock;
  updateAt: jest.Mock;
  deleteAt: jest.Mock;
};

const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe') as {
  subscribeCol: jest.Mock;
};

const resetStore = () => {
  useGoals.setState({
    goals: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
  });
};

describe('useGoals store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    // Mock Date.now() to return consistent values
    jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useGoals());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useGoals());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should update goals from subscription callback', () => {
      const testGoals: Goal[] = [
        {
          id: 'goal-1',
          title: 'Learn TypeScript',
          objective: 'Master TypeScript for web development',
          timeframe: 'short-term',
          status: 'active',
          priority: 'high',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testGoals, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useGoals());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.goals).toEqual(testGoals);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('add', () => {
    it('should add a new goal with defaults', async () => {
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.add({
          title: 'New Goal',
          objective: 'Achieve something great',
          timeframe: 'short-term',
          status: 'active',
          priority: 'medium',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.stringMatching(/users\/test-user-id\/goals\/.+/),
        expect.objectContaining({
          title: 'New Goal',
          objective: 'Achieve something great',
          timeframe: 'short-term',
          status: 'active',
          priority: 'medium',
          progress: 0,
          createdAt: expect.any(String),
        })
      );
    });

    it('should use default values for optional fields', async () => {
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.add({
          title: 'Goal without defaults',
          objective: 'Test objective',
          timeframe: 'immediate',
        } as any);
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'active',
          priority: 'medium',
          progress: 0,
        })
      );
    });

    it('should return goal ID', async () => {
      const { result } = renderHook(() => useGoals());

      let goalId: string = '';
      await act(async () => {
        goalId = await result.current.add({
          title: 'Test Goal',
          objective: 'Test',
          timeframe: 'short-term',
          status: 'active',
          priority: 'medium',
        });
      });

      expect(goalId).toBe('1234567890000');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useGoals());

      await expect(
        act(async () => {
          await result.current.add({
            title: 'Test',
            objective: 'Test',
            timeframe: 'short-term',
            status: 'active',
            priority: 'medium',
          });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('updateGoal', () => {
    it('should update goal with timestamp', async () => {
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.updateGoal('goal-1', {
          title: 'Updated Title',
          progress: 50,
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/goals/goal-1', {
        title: 'Updated Title',
        progress: 50,
        updatedAt: 1234567890000,
      });
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useGoals());

      await expect(
        act(async () => {
          await result.current.updateGoal('goal-1', { title: 'New Title' });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('deleteGoal', () => {
    it('should delete a goal', async () => {
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.deleteGoal('goal-1');
      });

      expect(mockDeleteAt).toHaveBeenCalledWith('users/test-user-id/goals/goal-1');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useGoals());

      await expect(
        act(async () => {
          await result.current.deleteGoal('goal-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('toggleStatus', () => {
    it('should toggle active goal to completed', async () => {
      const goal: Goal = {
        id: 'goal-1',
        title: 'Test Goal',
        objective: 'Test',
        timeframe: 'short-term',
        status: 'active',
        priority: 'medium',
        progress: 50,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      useGoals.setState({ goals: [goal] });
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.toggleStatus('goal-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/goals/goal-1', {
        status: 'completed',
        completedAt: expect.any(String),
        progress: 100,
        updatedAt: 1234567890000,
      });
    });

    it('should toggle completed goal to active', async () => {
      const goal: Goal = {
        id: 'goal-1',
        title: 'Test Goal',
        objective: 'Test',
        timeframe: 'short-term',
        status: 'completed',
        priority: 'medium',
        progress: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-15T00:00:00.000Z',
      };

      useGoals.setState({ goals: [goal] });
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.toggleStatus('goal-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/goals/goal-1', {
        status: 'active',
        completedAt: undefined,
        updatedAt: 1234567890000,
      });
    });

    it('should handle missing goal gracefully', async () => {
      useGoals.setState({ goals: [] });
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.toggleStatus('nonexistent-goal');
      });

      expect(mockUpdateAt).not.toHaveBeenCalled();
    });

    it('should handle goals with other statuses', async () => {
      const goal: Goal = {
        id: 'goal-1',
        title: 'Test Goal',
        objective: 'Test',
        timeframe: 'short-term',
        status: 'paused',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      useGoals.setState({ goals: [goal] });
      const { result } = renderHook(() => useGoals());

      await act(async () => {
        await result.current.toggleStatus('goal-1');
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/goals/goal-1', {
        status: 'completed',
        completedAt: expect.any(String),
        progress: 100,
        updatedAt: 1234567890000,
      });
    });
  });
});
