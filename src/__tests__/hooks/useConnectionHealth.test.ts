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
    const initialHealth: ConnectionHealth = {
      isOnline: true,
      latency: 50,
      lastCheck: Date.now(),
    };

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

    const newHealth: ConnectionHealth = {
      isOnline: true,
      latency: 100,
      lastCheck: Date.now(),
    };

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

    const offlineHealth: ConnectionHealth = {
      isOnline: false,
      latency: null,
      lastCheck: Date.now(),
    };

    act(() => {
      if (healthCallback) {
        healthCallback(offlineHealth);
      }
    });

    await waitFor(() => {
      expect(result.current?.isOnline).toBe(false);
    });
  });

  it('should handle high latency', async () => {
    let healthCallback: any;

    mockGetHealth.mockReturnValue(null);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    const slowHealth: ConnectionHealth = {
      isOnline: true,
      latency: 5000,
      lastCheck: Date.now(),
    };

    act(() => {
      if (healthCallback) {
        healthCallback(slowHealth);
      }
    });

    await waitFor(() => {
      expect(result.current?.latency).toBe(5000);
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

    const health1: ConnectionHealth = {
      isOnline: true,
      latency: 50,
      lastCheck: Date.now(),
    };

    act(() => {
      if (healthCallback) {
        healthCallback(health1);
      }
    });

    await waitFor(() => {
      expect(result.current?.latency).toBe(50);
    });

    const health2: ConnectionHealth = {
      isOnline: true,
      latency: 150,
      lastCheck: Date.now(),
    };

    act(() => {
      if (healthCallback) {
        healthCallback(health2);
      }
    });

    await waitFor(() => {
      expect(result.current?.latency).toBe(150);
    });
  });

  it('should handle transition from online to offline', async () => {
    let healthCallback: any;

    const initialHealth: ConnectionHealth = {
      isOnline: true,
      latency: 50,
      lastCheck: Date.now(),
    };

    mockGetHealth.mockReturnValue(initialHealth);
    mockSubscribe.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionHealth());

    await waitFor(() => {
      expect(result.current?.isOnline).toBe(true);
    });

    const offlineHealth: ConnectionHealth = {
      isOnline: false,
      latency: null,
      lastCheck: Date.now(),
    };

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
});
