import { renderHook, act } from '@testing-library/react';
import { useMoods, MoodEntry } from '@/store/useMoods';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  }),
}));

const { createAt: mockCreateAt, deleteAt: mockDeleteAt } = require('@/lib/data/gateway') as {
  createAt: jest.Mock;
  deleteAt: jest.Mock;
};

const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe') as {
  subscribeCol: jest.Mock;
};

const resetStore = () => {
  useMoods.setState({
    moods: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
  });
};

describe('useMoods store', () => {
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
      const { result } = renderHook(() => useMoods());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useMoods());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should update moods from subscription callback', () => {
      const testMoods: MoodEntry[] = [
        {
          id: 'mood-1',
          value: 8,
          note: 'Feeling great!',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testMoods, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useMoods());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.moods).toEqual(testMoods);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle cached data', () => {
      mockSubscribeCol.mockImplementation((query, callback) => {
        callback([], { fromCache: true, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useMoods());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.fromCache).toBe(true);
    });
  });

  describe('add', () => {
    it('should add a new mood entry', async () => {
      const { result } = renderHook(() => useMoods());

      await act(async () => {
        await result.current.add({
          value: 7,
          note: 'Had a productive day',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        'users/test-user-id/moods/1234567890000',
        expect.objectContaining({
          value: 7,
          note: 'Had a productive day',
          createdAt: expect.any(String),
        })
      );
    });

    it('should clamp mood value to 1-10 range', async () => {
      const { result } = renderHook(() => useMoods());

      // Test upper bound
      await act(async () => {
        await result.current.add({ value: 15 });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: 10 })
      );

      // Test lower bound
      await act(async () => {
        await result.current.add({ value: -5 });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: 1 })
      );
    });

    it('should round decimal mood values', async () => {
      const { result } = renderHook(() => useMoods());

      await act(async () => {
        await result.current.add({ value: 7.8 });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: 8 })
      );
    });

    it('should include metadata when provided', async () => {
      const { result } = renderHook(() => useMoods());
      const metadata = {
        sourceThoughtId: 'thought-123',
        createdBy: 'ai',
        dimensions: {
          joy: 8,
          anxiety: 2,
        },
      };

      await act(async () => {
        await result.current.add({
          value: 8,
          note: 'Generated from thought',
          metadata,
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ metadata })
      );
    });

    it('should handle mood without note', async () => {
      const { result } = renderHook(() => useMoods());

      await act(async () => {
        await result.current.add({ value: 5 });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          value: 5,
          note: undefined,
        })
      );
    });

    it('should return mood ID', async () => {
      const { result } = renderHook(() => useMoods());

      let moodId: string = '';
      await act(async () => {
        moodId = await result.current.add({ value: 7 });
      });

      expect(moodId).toBe('1234567890000');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useMoods());

      await expect(
        act(async () => {
          await result.current.add({ value: 7 });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('delete', () => {
    it('should delete a mood entry', async () => {
      const { result } = renderHook(() => useMoods());

      await act(async () => {
        await result.current.delete('mood-1');
      });

      expect(mockDeleteAt).toHaveBeenCalledWith('users/test-user-id/moods/mood-1');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useMoods());

      await expect(
        act(async () => {
          await result.current.delete('mood-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('edge cases', () => {
    it('should handle mood value at exact boundaries', async () => {
      const { result } = renderHook(() => useMoods());

      // Test exact minimum
      await act(async () => {
        await result.current.add({ value: 1 });
      });
      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: 1 })
      );

      // Test exact maximum
      await act(async () => {
        await result.current.add({ value: 10 });
      });
      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: 10 })
      );
    });

    it('should handle rounding edge cases', async () => {
      const { result } = renderHook(() => useMoods());

      // 7.4 should round to 7
      await act(async () => {
        await result.current.add({ value: 7.4 });
      });
      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: 7 })
      );

      // 7.5 should round to 8
      await act(async () => {
        await result.current.add({ value: 7.5 });
      });
      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ value: 8 })
      );
    });

    it('should handle empty metadata', async () => {
      const { result } = renderHook(() => useMoods());

      await act(async () => {
        await result.current.add({
          value: 6,
          metadata: {},
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {},
        })
      );
    });
  });
});
