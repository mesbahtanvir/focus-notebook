import { renderHook, act } from '@testing-library/react';
import { useFriends, Friend } from '@/store/useFriends';

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
  useFriends.setState({
    friends: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
  });
};

describe('useFriends store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useFriends());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useFriends());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should update friends from subscription callback', () => {
      const testFriends: Friend[] = [
        {
          id: 'friend-1',
          name: 'Alice',
          relationshipType: 'close-friend',
          energyLevel: 'energizing',
          interactionFrequency: 'weekly',
          positiveTraits: ['supportive', 'funny'],
          concerns: [],
          sharedValues: ['growth', 'learning'],
          notes: 'Great friend',
          priority: 'high',
          growthAlignment: 9,
          trustLevel: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testFriends, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useFriends());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.friends).toEqual(testFriends);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('add', () => {
    it('should add a new friend', async () => {
      const { result } = renderHook(() => useFriends());

      await act(async () => {
        await result.current.add({
          name: 'Bob',
          relationshipType: 'friend',
          energyLevel: 'neutral',
          interactionFrequency: 'monthly',
          positiveTraits: ['kind'],
          concerns: [],
          sharedValues: ['music'],
          notes: 'Met at concert',
          priority: 'medium',
          growthAlignment: 6,
          trustLevel: 7,
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        'users/test-user-id/friends/1234567890000',
        expect.objectContaining({
          name: 'Bob',
          relationshipType: 'friend',
          energyLevel: 'neutral',
          interactionFrequency: 'monthly',
          priority: 'medium',
          growthAlignment: 6,
          trustLevel: 7,
          createdAt: expect.any(String),
        })
      );
    });

    it('should return friend ID', async () => {
      const { result } = renderHook(() => useFriends());

      let friendId: string = '';
      await act(async () => {
        friendId = await result.current.add({
          name: 'Test Friend',
          relationshipType: 'acquaintance',
          energyLevel: 'neutral',
          interactionFrequency: 'rarely',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'low',
          growthAlignment: 5,
          trustLevel: 5,
        });
      });

      expect(friendId).toBe('1234567890000');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useFriends());

      await expect(
        act(async () => {
          await result.current.add({
            name: 'Test',
            relationshipType: 'friend',
            energyLevel: 'neutral',
            interactionFrequency: 'weekly',
            positiveTraits: [],
            concerns: [],
            sharedValues: [],
            notes: '',
            priority: 'medium',
            growthAlignment: 5,
            trustLevel: 5,
          });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('update', () => {
    it('should update a friend with timestamp', async () => {
      const { result } = renderHook(() => useFriends());

      await act(async () => {
        await result.current.update('friend-1', {
          name: 'Updated Name',
          growthAlignment: 8,
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/friends/friend-1', {
        name: 'Updated Name',
        growthAlignment: 8,
        updatedAt: 1234567890000,
      });
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useFriends());

      await expect(
        act(async () => {
          await result.current.update('friend-1', { name: 'New Name' });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('delete', () => {
    it('should delete a friend', async () => {
      const { result } = renderHook(() => useFriends());

      await act(async () => {
        await result.current.delete('friend-1');
      });

      expect(mockDeleteAt).toHaveBeenCalledWith('users/test-user-id/friends/friend-1');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useFriends());

      await expect(
        act(async () => {
          await result.current.delete('friend-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('getFriendsByPriority', () => {
    it('should filter friends by priority', () => {
      const friends: Friend[] = [
        {
          id: 'f1',
          name: 'High Priority Friend',
          relationshipType: 'close-friend',
          energyLevel: 'energizing',
          interactionFrequency: 'daily',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'high',
          growthAlignment: 9,
          trustLevel: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'f2',
          name: 'Medium Priority Friend',
          relationshipType: 'friend',
          energyLevel: 'neutral',
          interactionFrequency: 'weekly',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'medium',
          growthAlignment: 6,
          trustLevel: 7,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'f3',
          name: 'Low Priority Friend',
          relationshipType: 'acquaintance',
          energyLevel: 'neutral',
          interactionFrequency: 'rarely',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'low',
          growthAlignment: 3,
          trustLevel: 5,
          createdAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      useFriends.setState({ friends });
      const { result } = renderHook(() => useFriends());

      const highPriority = result.current.getFriendsByPriority('high');
      expect(highPriority).toHaveLength(1);
      expect(highPriority[0].id).toBe('f1');

      const mediumPriority = result.current.getFriendsByPriority('medium');
      expect(mediumPriority).toHaveLength(1);
      expect(mediumPriority[0].id).toBe('f2');

      const lowPriority = result.current.getFriendsByPriority('low');
      expect(lowPriority).toHaveLength(1);
      expect(lowPriority[0].id).toBe('f3');
    });

    it('should return empty array when no matches', () => {
      useFriends.setState({ friends: [] });
      const { result } = renderHook(() => useFriends());

      const highPriority = result.current.getFriendsByPriority('high');
      expect(highPriority).toHaveLength(0);
    });
  });

  describe('getFriendsByEnergy', () => {
    it('should filter friends by energy level', () => {
      const friends: Friend[] = [
        {
          id: 'f1',
          name: 'Energizing Friend',
          relationshipType: 'close-friend',
          energyLevel: 'energizing',
          interactionFrequency: 'weekly',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'high',
          growthAlignment: 8,
          trustLevel: 9,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'f2',
          name: 'Neutral Friend',
          relationshipType: 'friend',
          energyLevel: 'neutral',
          interactionFrequency: 'monthly',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'medium',
          growthAlignment: 5,
          trustLevel: 6,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'f3',
          name: 'Draining Friend',
          relationshipType: 'acquaintance',
          energyLevel: 'draining',
          interactionFrequency: 'rarely',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'low',
          growthAlignment: 2,
          trustLevel: 4,
          createdAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      useFriends.setState({ friends });
      const { result } = renderHook(() => useFriends());

      const energizing = result.current.getFriendsByEnergy('energizing');
      expect(energizing).toHaveLength(1);
      expect(energizing[0].id).toBe('f1');

      const neutral = result.current.getFriendsByEnergy('neutral');
      expect(neutral).toHaveLength(1);
      expect(neutral[0].id).toBe('f2');

      const draining = result.current.getFriendsByEnergy('draining');
      expect(draining).toHaveLength(1);
      expect(draining[0].id).toBe('f3');
    });
  });

  describe('getHighGrowthFriends', () => {
    it('should return friends with growth alignment >= 7', () => {
      const friends: Friend[] = [
        {
          id: 'f1',
          name: 'High Growth 1',
          relationshipType: 'mentor',
          energyLevel: 'energizing',
          interactionFrequency: 'weekly',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'high',
          growthAlignment: 9,
          trustLevel: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'f2',
          name: 'High Growth 2',
          relationshipType: 'close-friend',
          energyLevel: 'energizing',
          interactionFrequency: 'daily',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'high',
          growthAlignment: 7,
          trustLevel: 9,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'f3',
          name: 'Medium Growth',
          relationshipType: 'friend',
          energyLevel: 'neutral',
          interactionFrequency: 'monthly',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'medium',
          growthAlignment: 6,
          trustLevel: 7,
          createdAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      useFriends.setState({ friends });
      const { result } = renderHook(() => useFriends());

      const highGrowth = result.current.getHighGrowthFriends();
      expect(highGrowth).toHaveLength(2);
      expect(highGrowth[0].id).toBe('f1');
      expect(highGrowth[1].id).toBe('f2');
    });

    it('should return empty array when no high growth friends', () => {
      const friends: Friend[] = [
        {
          id: 'f1',
          name: 'Low Growth',
          relationshipType: 'acquaintance',
          energyLevel: 'neutral',
          interactionFrequency: 'rarely',
          positiveTraits: [],
          concerns: [],
          sharedValues: [],
          notes: '',
          priority: 'low',
          growthAlignment: 3,
          trustLevel: 5,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      useFriends.setState({ friends });
      const { result } = renderHook(() => useFriends());

      const highGrowth = result.current.getHighGrowthFriends();
      expect(highGrowth).toHaveLength(0);
    });
  });
});
