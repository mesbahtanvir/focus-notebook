import { renderHook, act, waitFor } from '@testing-library/react';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { ConnectionHealth } from '@/lib/data/subscribe';

// Mock ConnectionMonitor
const mockSubscribe = jest.fn();
const mockGetHealth = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/data/subscribe', () => ({
  getConnectionMonitor: jest.fn(() => ({
    subscribe: mockSubscribe,
    getHealth: mockGetHealth,
  })),
}));

const createMockHealth = (overrides: Partial<ConnectionHealth> = {}): ConnectionHealth => ({
  status: 'healthy',
  isOnline: true,
  isBackground: false,
  circuitBreakers: {},
  offlineQueue: {
    size: 0,
    processing: false,
  },
  performance: {
    averageDuration: 50,
    successRate: 1.0,
    retryRate: 0,
  },
  issues: [],
  ...overrides,
});

describe('useConnectionHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue(mockUnsubscribe);
  });

  it('should return null initially when no health available', () => {
    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation(() => mockUnsubscribe);

    const { result } = renderHook(() => useConnectionHealth());

    expect(result.current).toBeNull();
  });

  it('should return initial health when available', async () => {
    const initialHealth = createMockHealth();

    mockGetHealth.mockReturnValue(initialHealth);
    mockSubscribe.mockImplementation(() => mockUnsubscribe);

    const { result } = renderHook(() => useConnectionHealth());

    await waitFor(() => {
      expect(result.current).toEqual(initialHealth);
    });
  });

  it('should subscribe to health updates', () => {
    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation(() => mockUnsubscribe);

    renderHook(() => useConnectionHealth());

    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('should update when health changes', async () => {
    let healthCallback: any;

    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    const newHealth = createMockHealth({
      performance: {
        averageDuration: 100,
        successRate: 0.95,
        retryRate: 0.05,
      },
    });

    act(() => {
      if (healthCallback) {
        healthCallback(newHealth);
      }
    });

    await waitFor(() => {
      expect(result.current).toEqual(newHealth);
    });
  });

  it('should handle offline status', async () => {
    let healthCallback: any;

    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    const offlineHealth = createMockHealth({
      status: 'unhealthy',
      isOnline: false,
    });

    act(() => {
      if (healthCallback) {
        healthCallback(offlineHealth);
      }
    });

    await waitFor(() => {
      expect(result.current?.isOnline).toBe(false);
      expect(result.current?.status).toBe('unhealthy');
    });
  });

  it('should handle degraded performance', async () => {
    let healthCallback: any;

    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    const degradedHealth = createMockHealth({
      status: 'degraded',
      performance: {
        averageDuration: 5000,
        successRate: 0.8,
        retryRate: 0.2,
      },
    });

    act(() => {
      if (healthCallback) {
        healthCallback(degradedHealth);
      }
    });

    await waitFor(() => {
      expect(result.current?.status).toBe('degraded');
      expect(result.current?.performance.averageDuration).toBe(5000);
    });
  });

  it('should unsubscribe on unmount', () => {
    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation(() => mockUnsubscribe);

    const { unmount } = renderHook(() => useConnectionHealth());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle multiple health updates', async () => {
    let healthCallback: any;

    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    const health1 = createMockHealth({
      performance: { averageDuration: 50, successRate: 1.0, retryRate: 0 },
    });

    act(() => {
      if (healthCallback) {
        healthCallback(health1);
      }
    });

    await waitFor(() => {
      expect(result.current?.performance.averageDuration).toBe(50);
    });

    const health2 = createMockHealth({
      performance: { averageDuration: 150, successRate: 0.9, retryRate: 0.1 },
    });

    act(() => {
      if (healthCallback) {
        healthCallback(health2);
      }
    });

    await waitFor(() => {
      expect(result.current?.performance.averageDuration).toBe(150);
    });
  });

  it('should handle transition from online to offline', async () => {
    let healthCallback: any;

    const initialHealth = createMockHealth();

    mockGetHealth.mockReturnValue(initialHealth);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    await waitFor(() => {
      expect(result.current?.isOnline).toBe(true);
    });

    const offlineHealth = createMockHealth({
      status: 'unhealthy',
      isOnline: false,
    });

    act(() => {
      if (healthCallback) {
        healthCallback(offlineHealth);
      }
    });

    await waitFor(() => {
      expect(result.current?.isOnline).toBe(false);
    });
  });

  it('should call subscribe only once on mount', () => {
    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation(() => mockUnsubscribe);

    const { rerender } = renderHook(() => useConnectionHealth());

    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    rerender();

    // Should still be 1 (not called again)
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('should handle background state', async () => {
    let healthCallback: any;

    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    const backgroundHealth = createMockHealth({
      isBackground: true,
      backgroundDuration: 60000,
    });

    act(() => {
      if (healthCallback) {
        healthCallback(backgroundHealth);
      }
    });

    await waitFor(() => {
      expect(result.current?.isBackground).toBe(true);
      expect(result.current?.backgroundDuration).toBe(60000);
    });
  });

  it('should handle offline queue status', async () => {
    let healthCallback: any;

    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    const queuedHealth = createMockHealth({
      offlineQueue: {
        size: 10,
        processing: true,
        oldestQueuedAt: Date.now() - 5000,
      },
    });

    act(() => {
      if (healthCallback) {
        healthCallback(queuedHealth);
      }
    });

    await waitFor(() => {
      expect(result.current?.offlineQueue.size).toBe(10);
      expect(result.current?.offlineQueue.processing).toBe(true);
    });
  });
});
