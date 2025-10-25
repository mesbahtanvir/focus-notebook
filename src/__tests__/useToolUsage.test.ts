import { renderHook, act } from '@testing-library/react';
import { useToolUsage, ToolName } from '@/store/useToolUsage';

// Mock Firebase
jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123' } }
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    // Immediately call with empty data
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn(); // Return unsubscribe function
  }),
}));

describe('useToolUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Zustand store to initial state
    useToolUsage.setState({
      usageRecords: [],
      isLoading: false,
      fromCache: false,
      hasPendingWrites: false,
      unsubscribe: null,
    });
  });

  it('initializes with empty usage records', () => {
    const { result } = renderHook(() => useToolUsage());

    expect(result.current.usageRecords).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('tracks tool click for new tool', async () => {
    const { result } = renderHook(() => useToolUsage());
    const { createAt } = require('@/lib/data/gateway');

    await act(async () => {
      await result.current.trackToolClick('tasks');
    });

    expect(createAt).toHaveBeenCalled();
    const createCall = createAt.mock.calls[0];
    expect(createCall[0]).toContain('toolUsage');
    expect(createCall[1]).toMatchObject({
      toolName: 'tasks',
      clickCount: 1,
    });
  });

  it('increments click count for existing tool', async () => {
    const { result } = renderHook(() => useToolUsage());
    const { updateAt } = require('@/lib/data/gateway');

    // Set up existing record using setState
    act(() => {
      useToolUsage.setState({
        usageRecords: [{
          id: 'tasks-123',
          toolName: 'tasks',
          clickCount: 5,
          lastAccessed: '2025-01-01T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
        }],
      });
    });

    await act(async () => {
      await result.current.trackToolClick('tasks');
    });

    expect(updateAt).toHaveBeenCalled();
    const updateCall = updateAt.mock.calls[0];
    expect(updateCall[1]).toMatchObject({
      clickCount: 6,
    });
  });

  it('returns most used tools sorted by click count', () => {
    const { result } = renderHook(() => useToolUsage());

    act(() => {
      useToolUsage.setState({
        usageRecords: [
          {
            id: 'tasks-1',
            toolName: 'tasks',
            clickCount: 50,
            lastAccessed: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'thoughts-1',
            toolName: 'thoughts',
            clickCount: 30,
            lastAccessed: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'goals-1',
            toolName: 'goals',
            clickCount: 70,
            lastAccessed: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'projects-1',
            toolName: 'projects',
            clickCount: 20,
            lastAccessed: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'focus-1',
            toolName: 'focus',
            clickCount: 40,
            lastAccessed: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          }
        ],
      });
    });

    const mostUsed = result.current.getMostUsedTools(3);

    expect(mostUsed).toHaveLength(3);
    expect(mostUsed[0].toolName).toBe('goals');
    expect(mostUsed[0].clickCount).toBe(70);
    expect(mostUsed[1].toolName).toBe('tasks');
    expect(mostUsed[1].clickCount).toBe(50);
    expect(mostUsed[2].toolName).toBe('focus');
    expect(mostUsed[2].clickCount).toBe(40);
  });

  it('limits most used tools to specified count', () => {
    const { result } = renderHook(() => useToolUsage());

    const toolNames = ['tasks', 'thoughts', 'goals', 'projects', 'focus', 'brainstorming', 'notes', 'friends', 'moodtracker', 'cbt'] as const;

    act(() => {
      // Add 10 different tools using setState
      const records = toolNames.map((toolName, i) => ({
        id: `tool-${i}`,
        toolName,
        clickCount: i * 10,
        lastAccessed: '2025-01-01T00:00:00.000Z',
        createdAt: '2025-01-01T00:00:00.000Z',
      }));
      useToolUsage.setState({ usageRecords: records });
    });

    const mostUsed = result.current.getMostUsedTools(5);
    expect(mostUsed).toHaveLength(5);
  });

  it('handles empty usage records', () => {
    const { result } = renderHook(() => useToolUsage());

    const mostUsed = result.current.getMostUsedTools(5);
    expect(mostUsed).toEqual([]);
  });

  it('updates lastAccessed timestamp on track', async () => {
    const { result } = renderHook(() => useToolUsage());
    const { updateAt } = require('@/lib/data/gateway');

    act(() => {
      useToolUsage.setState({
        usageRecords: [{
          id: 'tasks-123',
          toolName: 'tasks',
          clickCount: 5,
          lastAccessed: '2025-01-01T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
        }],
      });
    });

    const beforeTime = new Date().toISOString();

    await act(async () => {
      await result.current.trackToolClick('tasks');
    });

    expect(updateAt).toHaveBeenCalled();
    const updateCall = updateAt.mock.calls[0];
    expect(updateCall[1]).toHaveProperty('lastAccessed');
    expect(new Date(updateCall[1].lastAccessed).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeTime).getTime()
    );
  });

  it('subscribes to Firebase collection for user', () => {
    const { result } = renderHook(() => useToolUsage());
    const { subscribeCol } = require('@/lib/data/subscribe');

    act(() => {
      result.current.subscribe('test-user-123');
    });

    expect(subscribeCol).toHaveBeenCalled();
  });

  it('unsubscribes on new subscription', () => {
    const { result } = renderHook(() => useToolUsage());
    const mockUnsubscribe = jest.fn();
    const { subscribeCol } = require('@/lib/data/subscribe');

    subscribeCol.mockReturnValue(mockUnsubscribe);

    act(() => {
      result.current.subscribe('user-1');
    });

    act(() => {
      result.current.subscribe('user-2');
    });

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('supports all tool names', async () => {
    const { result } = renderHook(() => useToolUsage());
    const { createAt } = require('@/lib/data/gateway');

    const toolNames: ToolName[] = [
      'tasks', 'thoughts', 'goals', 'projects', 'focus',
      'brainstorming', 'notes', 'friends', 'moodtracker',
      'cbt', 'errands', 'deepthought'
    ];

    for (const toolName of toolNames) {
      await act(async () => {
        await result.current.trackToolClick(toolName);
      });
    }

    expect(createAt).toHaveBeenCalledTimes(toolNames.length);
  });
});
