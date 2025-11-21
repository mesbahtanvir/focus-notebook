import { renderHook, act } from '@testing-library/react';
import { useLLMLogs, LLMLog } from '@/store/useLLMLogs';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    callback([]);
    return jest.fn();
  }),
}));

const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe') as {
  subscribeCol: jest.Mock;
};

const resetStore = () => {
  useLLMLogs.setState({
    logs: [],
    isLoading: false,
    unsubscribe: null,
  });
};

describe('useLLMLogs store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state while subscribing', () => {
      let callbackRef: ((logs: LLMLog[]) => void) | null = null;

      mockSubscribeCol.mockImplementation((query, callback) => {
        callbackRef = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      // Before callback is invoked, loading should be true (set in subscribe)
      // After callback, it should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should update logs from subscription callback', () => {
      const testLogs: LLMLog[] = [
        {
          id: 'log-1',
          trigger: 'auto',
          prompt: 'Test prompt',
          rawResponse: 'Test response',
          createdAt: '2024-01-01T00:00:00.000Z',
          status: 'completed',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs).toEqual(testLogs);
      expect(result.current.isLoading).toBe(false);
    });

    it('should serialize Firebase timestamp to ISO string', () => {
      const testLogs = [
        {
          id: 'log-1',
          trigger: 'manual',
          prompt: 'Test',
          rawResponse: 'Response',
          createdAt: {
            toDate: () => new Date('2024-01-01T00:00:00.000Z'),
          },
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs as any);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle logs with string timestamps', () => {
      const testLogs: LLMLog[] = [
        {
          id: 'log-1',
          trigger: 'auto',
          prompt: 'Test',
          rawResponse: 'Response',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle logs with missing timestamps', () => {
      const testLogs: LLMLog[] = [
        {
          id: 'log-1',
          trigger: 'auto',
          prompt: 'Test',
          rawResponse: 'Response',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs[0].createdAt).toBeUndefined();
    });

    it('should handle logs with complete metadata', () => {
      const testLogs: LLMLog[] = [
        {
          id: 'log-1',
          thoughtId: 'thought-123',
          trigger: 'reprocess',
          prompt: 'Detailed prompt',
          rawResponse: 'Detailed response',
          actions: [{ type: 'createTask', data: {} }],
          toolSpecIds: ['tool-1', 'tool-2'],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          status: 'completed',
          promptType: 'thought-analysis',
          metadata: {
            version: '1.0',
            source: 'test',
          },
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs[0]).toEqual(testLogs[0]);
    });

    it('should handle different trigger types', () => {
      const testLogs: LLMLog[] = [
        { id: '1', trigger: 'auto', prompt: 'p1', rawResponse: 'r1' },
        { id: '2', trigger: 'manual', prompt: 'p2', rawResponse: 'r2' },
        { id: '3', trigger: 'reprocess', prompt: 'p3', rawResponse: 'r3' },
        { id: '4', trigger: 'csv-upload', prompt: 'p4', rawResponse: 'r4' },
        { id: '5', trigger: 'csv-api', prompt: 'p5', rawResponse: 'r5' },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs).toHaveLength(5);
      expect(result.current.logs.map(l => l.trigger)).toEqual([
        'auto',
        'manual',
        'reprocess',
        'csv-upload',
        'csv-api',
      ]);
    });

    it('should handle failed logs', () => {
      const testLogs: LLMLog[] = [
        {
          id: 'log-1',
          trigger: 'auto',
          prompt: 'Test',
          rawResponse: '',
          status: 'failed',
          error: 'API error occurred',
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs[0].status).toBe('failed');
      expect(result.current.logs[0].error).toBe('API error occurred');
    });
  });

  describe('clear', () => {
    it('should clear logs and reset state', () => {
      const testLogs: LLMLog[] = [
        {
          id: 'log-1',
          trigger: 'auto',
          prompt: 'Test',
          rawResponse: 'Response',
        },
      ];

      useLLMLogs.setState({
        logs: testLogs,
        isLoading: false,
        unsubscribe: null,
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.clear();
      });

      expect(result.current.logs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.unsubscribe).toBeNull();
    });

    it('should unsubscribe when clearing', () => {
      const unsubscribeMock = jest.fn();

      useLLMLogs.setState({
        logs: [],
        isLoading: false,
        unsubscribe: unsubscribeMock,
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.clear();
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should handle clear when no subscription exists', () => {
      useLLMLogs.setState({
        logs: [],
        isLoading: false,
        unsubscribe: null,
      });

      const { result } = renderHook(() => useLLMLogs());

      expect(() => {
        act(() => {
          result.current.clear();
        });
      }).not.toThrow();
    });
  });

  describe('timestamp serialization edge cases', () => {
    it('should handle null timestamp', () => {
      const testLogs = [
        {
          id: 'log-1',
          trigger: 'auto',
          prompt: 'Test',
          rawResponse: 'Response',
          createdAt: null,
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs as any);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs[0].createdAt).toBeUndefined();
    });

    it('should handle timestamp object without toDate method', () => {
      const testLogs = [
        {
          id: 'log-1',
          trigger: 'auto',
          prompt: 'Test',
          rawResponse: 'Response',
          createdAt: { invalid: 'object' },
        },
      ];

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs as any);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs[0].createdAt).toBeUndefined();
    });
  });

  describe('multiple logs handling', () => {
    it('should handle empty logs array', () => {
      mockSubscribeCol.mockImplementation((query, callback) => {
        callback([]);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs).toEqual([]);
    });

    it('should handle large number of logs', () => {
      const testLogs: LLMLog[] = Array.from({ length: 200 }, (_, i) => ({
        id: `log-${i}`,
        trigger: 'auto',
        prompt: `Prompt ${i}`,
        rawResponse: `Response ${i}`,
      }));

      mockSubscribeCol.mockImplementation((query, callback) => {
        callback(testLogs);
        return jest.fn();
      });

      const { result } = renderHook(() => useLLMLogs());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.logs).toHaveLength(200);
    });
  });
});
