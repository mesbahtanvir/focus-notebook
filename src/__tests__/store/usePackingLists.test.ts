import { renderHook, act, waitFor } from '@testing-library/react';
import { usePackingLists } from '@/store/usePackingLists';
import type { PackingList } from '@/types/packing-list';

// Mock Firebase client
jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
  functionsClient: {},
}));

// Mock Firebase Functions
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  onSnapshot: jest.fn(),
}));

// Get mocked functions
const { httpsCallable: mockHttpsCallable } = require('firebase/functions') as {
  httpsCallable: jest.Mock;
};

const { onSnapshot: mockOnSnapshot } = require('firebase/firestore') as {
  onSnapshot: jest.Mock;
};

const mockPackingList: PackingList = {
  id: 'test-packing-list',
  tripId: 'test-trip-id',
  userId: 'test-user-id',
  sections: [
    {
      id: 'essentials',
      title: 'Travel Essentials',
      emoji: '🧳',
      summary: 'Documents and basics',
      groups: [
        {
          id: 'documents',
          title: 'Documents',
          icon: '📄',
          items: [
            {
              id: 'passport',
              name: 'Passport',
              description: 'Valid passport',
            },
            {
              id: 'tickets',
              name: 'Tickets',
              description: 'Flight tickets',
            },
          ],
        },
      ],
    },
    {
      id: 'clothing',
      title: 'Clothing',
      emoji: '👕',
      summary: 'What to wear',
      groups: [
        {
          id: 'tops',
          title: 'Tops',
          icon: '👕',
          items: [
            {
              id: 'tshirt',
              name: 'T-Shirts',
              quantity: '3-5',
            },
          ],
        },
      ],
    },
  ],
  packedItemIds: ['passport'],
  customItems: {},
  timelinePhases: [
    {
      id: 'week-before',
      title: '1 Week Before',
      emoji: '📅',
      summary: 'Start preparing',
      tasks: [
        {
          id: 'task-1',
          title: 'Check passport expiry',
          description: 'Ensure passport is valid',
        },
      ],
    },
  ],
  timelineCompleted: [],
  aiSuggestions: [],
  createdAt: new Date().toISOString(),
};

const resetStore = () => {
  usePackingLists.setState({
    packingLists: new Map(),
    isLoading: new Map(),
    subscriptions: new Map(),
  });
};

describe('usePackingLists store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('subscription management', () => {
    it('subscribes to a packing list and loads data', async () => {
      let snapshotCallback: ((snapshot: any) => void) | null = null;

      mockOnSnapshot.mockImplementation((ref, callback) => {
        snapshotCallback = callback;
        // Simulate initial snapshot
        setTimeout(() => {
          callback({
            exists: () => true,
            data: () => mockPackingList,
          });
        }, 0);
        return jest.fn(); // Return unsubscribe function
      });

      const { result } = renderHook(() => usePackingLists());

      act(() => {
        result.current.subscribe('test-user-id', 'test-trip-id');
      });

      // Should set loading state initially
      expect(result.current.isLoadingList('test-trip-id')).toBe(true);

      // Wait for snapshot callback
      await waitFor(() => {
        expect(result.current.isLoadingList('test-trip-id')).toBe(false);
      });

      // Should have packing list data
      const packingList = result.current.getPackingList('test-trip-id');
      expect(packingList).toEqual(mockPackingList);
    });

    it('handles non-existent packing list', async () => {
      mockOnSnapshot.mockImplementation((ref, callback) => {
        setTimeout(() => {
          callback({
            exists: () => false,
          });
        }, 0);
        return jest.fn();
      });

      const { result } = renderHook(() => usePackingLists());

      act(() => {
        result.current.subscribe('test-user-id', 'test-trip-id');
      });

      await waitFor(() => {
        expect(result.current.isLoadingList('test-trip-id')).toBe(false);
      });

      const packingList = result.current.getPackingList('test-trip-id');
      expect(packingList).toBeUndefined();
    });

    it('prevents duplicate subscriptions', () => {
      mockOnSnapshot.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePackingLists());

      act(() => {
        result.current.subscribe('test-user-id', 'test-trip-id');
        result.current.subscribe('test-user-id', 'test-trip-id');
      });

      // Should only call onSnapshot once
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes and cleans up', () => {
      const mockUnsubscribe = jest.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => usePackingLists());

      act(() => {
        result.current.subscribe('test-user-id', 'test-trip-id');
      });

      act(() => {
        result.current.unsubscribe('test-trip-id');
      });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(result.current.getPackingList('test-trip-id')).toBeUndefined();
    });
  });

  describe('createPackingList', () => {
    it('creates a new packing list', async () => {
      const mockCreateFn = jest.fn().mockResolvedValue({
        data: { packingList: mockPackingList },
      });

      mockHttpsCallable.mockReturnValue(mockCreateFn);

      const { result } = renderHook(() => usePackingLists());

      let createdList: PackingList | undefined;

      await act(async () => {
        createdList = await result.current.createPackingList('test-trip-id');
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'createPackingList'
      );
      expect(mockCreateFn).toHaveBeenCalledWith({ tripId: 'test-trip-id' });
      expect(createdList).toEqual(mockPackingList);
    });

    it('handles creation errors', async () => {
      const mockCreateFn = jest.fn().mockRejectedValue(new Error('Creation failed'));
      mockHttpsCallable.mockReturnValue(mockCreateFn);

      const { result } = renderHook(() => usePackingLists());

      await expect(
        act(async () => {
          await result.current.createPackingList('test-trip-id');
        })
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('togglePacked', () => {
    it('toggles an item as packed', async () => {
      const mockToggleFn = jest.fn().mockResolvedValue({});
      mockHttpsCallable.mockReturnValue(mockToggleFn);

      const { result } = renderHook(() => usePackingLists());

      await act(async () => {
        await result.current.togglePacked('test-trip-id', 'passport', true);
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'togglePackedItem'
      );
      expect(mockToggleFn).toHaveBeenCalledWith({
        tripId: 'test-trip-id',
        itemId: 'passport',
        packed: true,
      });
    });

    it('toggles an item as unpacked', async () => {
      const mockToggleFn = jest.fn().mockResolvedValue({});
      mockHttpsCallable.mockReturnValue(mockToggleFn);

      const { result } = renderHook(() => usePackingLists());

      await act(async () => {
        await result.current.togglePacked('test-trip-id', 'passport', false);
      });

      expect(mockToggleFn).toHaveBeenCalledWith({
        tripId: 'test-trip-id',
        itemId: 'passport',
        packed: false,
      });
    });
  });

  describe('addCustomItem', () => {
    it('adds a custom item to a section', async () => {
      const mockAddFn = jest.fn().mockResolvedValue({
        data: { itemId: 'custom-item-id' },
      });
      mockHttpsCallable.mockReturnValue(mockAddFn);

      const { result } = renderHook(() => usePackingLists());

      let itemId: string | undefined;

      await act(async () => {
        itemId = await result.current.addCustomItem('test-trip-id', 'essentials', {
          name: 'Custom Item',
          quantity: '2',
          custom: true,
        });
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'addCustomPackingItem'
      );
      expect(mockAddFn).toHaveBeenCalledWith({
        tripId: 'test-trip-id',
        sectionId: 'essentials',
        item: {
          name: 'Custom Item',
          quantity: '2',
          custom: true,
        },
      });
      expect(itemId).toBe('custom-item-id');
    });
  });

  describe('deleteCustomItem', () => {
    it('deletes a custom item from a section', async () => {
      const mockDeleteFn = jest.fn().mockResolvedValue({});
      mockHttpsCallable.mockReturnValue(mockDeleteFn);

      const { result } = renderHook(() => usePackingLists());

      await act(async () => {
        await result.current.deleteCustomItem('test-trip-id', 'essentials', 'custom-item-id');
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'deleteCustomPackingItem'
      );
      expect(mockDeleteFn).toHaveBeenCalledWith({
        tripId: 'test-trip-id',
        sectionId: 'essentials',
        itemId: 'custom-item-id',
      });
    });
  });

  describe('getProgress', () => {
    it('calculates progress correctly', () => {
      const { result } = renderHook(() => usePackingLists());

      // Setup packing list in store
      act(() => {
        usePackingLists.setState({
          packingLists: new Map([['test-trip-id', mockPackingList]]),
        });
      });

      const progress = result.current.getProgress('test-trip-id');

      // mockPackingList has 3 items total (passport, tickets, tshirt)
      // and 1 packed (passport)
      expect(progress.total).toBe(3);
      expect(progress.packed).toBe(1);
      expect(progress.percentage).toBe(33); // Math.round((1/3) * 100)
    });

    it('returns zero progress for non-existent list', () => {
      const { result } = renderHook(() => usePackingLists());

      const progress = result.current.getProgress('non-existent-trip');

      expect(progress.total).toBe(0);
      expect(progress.packed).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('handles 100% completion', () => {
      const { result } = renderHook(() => usePackingLists());

      const completePackingList = {
        ...mockPackingList,
        packedItemIds: ['passport', 'tickets', 'tshirt'],
      };

      act(() => {
        usePackingLists.setState({
          packingLists: new Map([['test-trip-id', completePackingList]]),
        });
      });

      const progress = result.current.getProgress('test-trip-id');

      expect(progress.total).toBe(3);
      expect(progress.packed).toBe(3);
      expect(progress.percentage).toBe(100);
    });
  });

  describe('toggleTimelineTask', () => {
    it('toggles a timeline task as completed', async () => {
      const mockUpdateFn = jest.fn().mockResolvedValue({});
      mockHttpsCallable.mockReturnValue(mockUpdateFn);

      const { result } = renderHook(() => usePackingLists());

      // Setup packing list in store
      act(() => {
        usePackingLists.setState({
          packingLists: new Map([['test-trip-id', mockPackingList]]),
        });
      });

      await act(async () => {
        await result.current.toggleTimelineTask('test-trip-id', 'task-1');
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'updatePackingList'
      );
      expect(mockUpdateFn).toHaveBeenCalledWith({
        tripId: 'test-trip-id',
        updates: {
          timelineCompleted: ['task-1'],
        },
      });
    });

    it('toggles a timeline task as incomplete', async () => {
      const mockUpdateFn = jest.fn().mockResolvedValue({});
      mockHttpsCallable.mockReturnValue(mockUpdateFn);

      const { result } = renderHook(() => usePackingLists());

      // Setup packing list with task already completed
      const packingListWithCompletedTask = {
        ...mockPackingList,
        timelineCompleted: ['task-1'],
      };

      act(() => {
        usePackingLists.setState({
          packingLists: new Map([['test-trip-id', packingListWithCompletedTask]]),
        });
      });

      await act(async () => {
        await result.current.toggleTimelineTask('test-trip-id', 'task-1');
      });

      expect(mockUpdateFn).toHaveBeenCalledWith({
        tripId: 'test-trip-id',
        updates: {
          timelineCompleted: [],
        },
      });
    });

    it('throws error if packing list not found', async () => {
      const { result } = renderHook(() => usePackingLists());

      await expect(
        act(async () => {
          await result.current.toggleTimelineTask('non-existent-trip', 'task-1');
        })
      ).rejects.toThrow('Packing list not found');
    });
  });

  describe('updateCustomItems', () => {
    it('updates custom items state', async () => {
      const mockUpdateFn = jest.fn().mockResolvedValue({});
      mockHttpsCallable.mockReturnValue(mockUpdateFn);

      const { result } = renderHook(() => usePackingLists());

      const customItems = {
        essentials: [
          {
            id: 'custom-1',
            name: 'Custom Item',
            custom: true,
          },
        ],
      };

      await act(async () => {
        await result.current.updateCustomItems('test-trip-id', customItems);
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'updatePackingList'
      );
      expect(mockUpdateFn).toHaveBeenCalledWith({
        tripId: 'test-trip-id',
        updates: {
          customItems,
        },
      });
    });
  });

  describe('getPackingList', () => {
    it('returns packing list for given tripId', () => {
      const { result } = renderHook(() => usePackingLists());

      act(() => {
        usePackingLists.setState({
          packingLists: new Map([['test-trip-id', mockPackingList]]),
        });
      });

      const packingList = result.current.getPackingList('test-trip-id');
      expect(packingList).toEqual(mockPackingList);
    });

    it('returns undefined for non-existent tripId', () => {
      const { result } = renderHook(() => usePackingLists());

      const packingList = result.current.getPackingList('non-existent-trip');
      expect(packingList).toBeUndefined();
    });
  });

  describe('isLoadingList', () => {
    it('returns loading state for a trip', () => {
      const { result } = renderHook(() => usePackingLists());

      act(() => {
        const newLoading = new Map();
        newLoading.set('test-trip-id', true);
        usePackingLists.setState({ isLoading: newLoading });
      });

      expect(result.current.isLoadingList('test-trip-id')).toBe(true);
    });

    it('returns false for non-existent trip', () => {
      const { result } = renderHook(() => usePackingLists());

      expect(result.current.isLoadingList('non-existent-trip')).toBe(false);
    });
  });
});
