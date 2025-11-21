import { renderHook, act } from '@testing-library/react';
import { useToolUsage, ToolUsageRecord } from '@/store/useToolUsage';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn((...args) => args),
  orderBy: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query: any, callback: any) => {
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  }),
}));

const { createAt: mockCreateAt, updateAt: mockUpdateAt } = require('@/lib/data/gateway');
const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe');

const createMockRecord = (toolName: string, clickCount: number = 1): ToolUsageRecord => ({
  id: `${toolName}-123`,
  toolName: toolName as any,
  clickCount,
  lastAccessed: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
});

const resetStore = () => {
  useToolUsage.setState({
    usageRecords: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
  });
};

describe('useToolUsage store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useToolUsage());

      expect(result.current.usageRecords).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.fromCache).toBe(false);
      expect(result.current.hasPendingWrites).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useToolUsage());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useToolUsage());

      act(() => {
        result.current.subscribe('user-1');
      });

      act(() => {
        result.current.subscribe('user-2');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should load usage records from subscription', () => {
      const mockRecords = [
        createMockRecord('tasks', 5),
        createMockRecord('thoughts', 3),
      ];

      mockSubscribeCol.mockImplementation((query: any, callback: any) => {
        callback(mockRecords, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useToolUsage());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.usageRecords).toHaveLength(2);
      expect(result.current.usageRecords[0].toolName).toBe('tasks');
      expect(result.current.usageRecords[1].toolName).toBe('thoughts');
    });

    it('should normalize vacation-packing to packing-list', () => {
      const mockRecords = [
        {
          id: 'vacation-1',
          toolName: 'vacation-packing',
          clickCount: 2,
          lastAccessed: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query: any, callback: any) => {
        callback(mockRecords, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useToolUsage());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.usageRecords[0].toolName).toBe('packing-list');
    });

    it('should set fromCache and hasPendingWrites from meta', () => {
      mockSubscribeCol.mockImplementation((query: any, callback: any) => {
        callback([], { fromCache: true, hasPendingWrites: true });
        return jest.fn();
      });

      const { result } = renderHook(() => useToolUsage());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.fromCache).toBe(true);
      expect(result.current.hasPendingWrites).toBe(true);
    });
  });

  describe('trackToolClick', () => {
    it('should create new record for first click', async () => {
      const { result } = renderHook(() => useToolUsage());

      await act(async () => {
        await result.current.trackToolClick('tasks');
      });

      expect(mockCreateAt).toHaveBeenCalled();
      const createCall = mockCreateAt.mock.calls[0];
      expect(createCall[0]).toContain('toolUsage');
      expect(createCall[1]).toMatchObject({
        toolName: 'tasks',
        clickCount: 1,
      });
    });

    it('should update existing record on subsequent click', async () => {
      const { result } = renderHook(() => useToolUsage());

      // Set up existing record
      useToolUsage.setState({
        usageRecords: [createMockRecord('tasks', 5)],
      });

      await act(async () => {
        await result.current.trackToolClick('tasks');
      });

      expect(mockUpdateAt).toHaveBeenCalled();
      const updateCall = mockUpdateAt.mock.calls[0];
      expect(updateCall[0]).toContain('toolUsage');
      expect(updateCall[1]).toMatchObject({
        clickCount: 6,
      });
    });

    it('should handle tracking different tools', async () => {
      const { result } = renderHook(() => useToolUsage());

      await act(async () => {
        await result.current.trackToolClick('tasks');
      });

      await act(async () => {
        await result.current.trackToolClick('thoughts');
      });

      expect(mockCreateAt).toHaveBeenCalledTimes(2);
    });

    it('should not track when user is not authenticated', async () => {
      const authMock = require('@/lib/firebaseClient');
      authMock.auth.currentUser = null;

      const { result } = renderHook(() => useToolUsage());

      await act(async () => {
        await result.current.trackToolClick('tasks');
      });

      expect(mockCreateAt).not.toHaveBeenCalled();
      expect(mockUpdateAt).not.toHaveBeenCalled();

      // Restore
      authMock.auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('getMostUsedTools', () => {
    it('should return empty array when no records', () => {
      const { result } = renderHook(() => useToolUsage());

      const mostUsed = result.current.getMostUsedTools();

      expect(mostUsed).toEqual([]);
    });

    it('should return tools sorted by click count', () => {
      const { result } = renderHook(() => useToolUsage());

      useToolUsage.setState({
        usageRecords: [
          createMockRecord('tasks', 10),
          createMockRecord('thoughts', 5),
          createMockRecord('goals', 15),
        ],
      });

      const mostUsed = result.current.getMostUsedTools();

      expect(mostUsed).toHaveLength(3);
      expect(mostUsed[0].toolName).toBe('goals');
      expect(mostUsed[0].clickCount).toBe(15);
      expect(mostUsed[1].toolName).toBe('tasks');
      expect(mostUsed[1].clickCount).toBe(10);
      expect(mostUsed[2].toolName).toBe('thoughts');
      expect(mostUsed[2].clickCount).toBe(5);
    });

    it('should limit results to specified number', () => {
      const { result } = renderHook(() => useToolUsage());

      useToolUsage.setState({
        usageRecords: [
          createMockRecord('tasks', 10),
          createMockRecord('thoughts', 8),
          createMockRecord('goals', 6),
          createMockRecord('focus', 4),
          createMockRecord('spending', 2),
        ],
      });

      const mostUsed = result.current.getMostUsedTools(3);

      expect(mostUsed).toHaveLength(3);
      expect(mostUsed[0].toolName).toBe('tasks');
      expect(mostUsed[1].toolName).toBe('thoughts');
      expect(mostUsed[2].toolName).toBe('goals');
    });

    it('should use default limit of 5', () => {
      const { result } = renderHook(() => useToolUsage());

      useToolUsage.setState({
        usageRecords: Array.from({ length: 10 }, (_, i) =>
          createMockRecord(`tool-${i}` as any, 10 - i)
        ),
      });

      const mostUsed = result.current.getMostUsedTools();

      expect(mostUsed).toHaveLength(5);
    });

    it('should deduplicate by toolName keeping highest click count', () => {
      const { result } = renderHook(() => useToolUsage());

      useToolUsage.setState({
        usageRecords: [
          { ...createMockRecord('tasks', 5), id: 'tasks-1' },
          { ...createMockRecord('tasks', 10), id: 'tasks-2' },
          { ...createMockRecord('thoughts', 3), id: 'thoughts-1' },
        ],
      });

      const mostUsed = result.current.getMostUsedTools();

      expect(mostUsed).toHaveLength(2);
      const tasksRecord = mostUsed.find(r => r.toolName === 'tasks');
      expect(tasksRecord?.clickCount).toBe(10);
    });

    it('should include lastAccessed in results', () => {
      const { result } = renderHook(() => useToolUsage());

      const testDate = '2024-05-15T10:30:00.000Z';
      useToolUsage.setState({
        usageRecords: [
          { ...createMockRecord('tasks', 5), lastAccessed: testDate },
        ],
      });

      const mostUsed = result.current.getMostUsedTools();

      expect(mostUsed[0].lastAccessed).toBe(testDate);
    });

    it('should handle limit larger than number of records', () => {
      const { result } = renderHook(() => useToolUsage());

      useToolUsage.setState({
        usageRecords: [
          createMockRecord('tasks', 5),
          createMockRecord('thoughts', 3),
        ],
      });

      const mostUsed = result.current.getMostUsedTools(10);

      expect(mostUsed).toHaveLength(2);
    });

    it('should handle zero limit', () => {
      const { result } = renderHook(() => useToolUsage());

      useToolUsage.setState({
        usageRecords: [createMockRecord('tasks', 5)],
      });

      const mostUsed = result.current.getMostUsedTools(0);

      expect(mostUsed).toHaveLength(0);
    });
  });

  describe('tool name variations', () => {
    it('should track all standard tool types', async () => {
      const { result } = renderHook(() => useToolUsage());

      const tools = ['tasks', 'thoughts', 'goals', 'focus', 'spending'];

      for (const tool of tools) {
        await act(async () => {
          await result.current.trackToolClick(tool as any);
        });
      }

      expect(mockCreateAt).toHaveBeenCalledTimes(5);
    });
  });
});
