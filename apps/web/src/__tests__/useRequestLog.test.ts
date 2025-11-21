import { renderHook, act } from '@testing-library/react';
import { useRequestLog } from '@/store/useRequestLog';

describe('useRequestLog', () => {
  beforeEach(() => {
    // Clear logs before each test
    const { result } = renderHook(() => useRequestLog());
    act(() => {
      result.current.clearLogs();
    });
  });

  it('initializes with empty logs and queue', () => {
    const { result } = renderHook(() => useRequestLog());
    
    expect(result.current.logs).toEqual([]);
    expect(result.current.queue).toEqual([]);
  });

  it('adds request to queue with pending status', () => {
    const { result } = renderHook(() => useRequestLog());
    
    let requestId: string = '';
    act(() => {
      requestId = result.current.addToQueue({
        type: 'sync',
        method: 'syncToCloud',
        url: 'Firebase Firestore',
      });
    });

    expect(requestId).toBeTruthy();
    expect(result.current.logs.length).toBe(1);
    expect(result.current.queue.length).toBe(1);
    expect(result.current.logs[0].requestStatus).toBe('pending');
  });

  it('updates request status to in-progress', () => {
    const { result } = renderHook(() => useRequestLog());
    
    let requestId: string = '';
    act(() => {
      requestId = result.current.addToQueue({
        type: 'sync',
        method: 'syncToCloud',
        url: 'Firebase Firestore',
      });
    });

    act(() => {
      result.current.updateRequestStatus(requestId, 'in-progress');
    });

    expect(result.current.logs[0].requestStatus).toBe('in-progress');
    expect(result.current.queue.length).toBe(1);
  });

  it('removes completed requests from queue', () => {
    const { result } = renderHook(() => useRequestLog());
    
    let requestId: string = '';
    act(() => {
      requestId = result.current.addToQueue({
        type: 'sync',
        method: 'syncToCloud',
        url: 'Firebase Firestore',
      });
    });

    act(() => {
      result.current.updateRequestStatus(requestId, 'completed', {
        response: { success: true },
        status: 200,
      });
    });

    expect(result.current.logs[0].requestStatus).toBe('completed');
    expect(result.current.logs[0].status).toBe(200);
    expect(result.current.queue.length).toBe(0); // Removed from queue
  });

  it('removes failed requests from queue', () => {
    const { result } = renderHook(() => useRequestLog());
    
    let requestId: string = '';
    act(() => {
      requestId = result.current.addToQueue({
        type: 'sync',
        method: 'syncToCloud',
        url: 'Firebase Firestore',
      });
    });

    act(() => {
      result.current.updateRequestStatus(requestId, 'failed', {
        error: 'Connection failed',
        status: 500,
      });
    });

    expect(result.current.logs[0].requestStatus).toBe('failed');
    expect(result.current.logs[0].error).toBe('Connection failed');
    expect(result.current.queue.length).toBe(0); // Removed from queue
  });

  it('calculates duration on completion', () => {
    const { result } = renderHook(() => useRequestLog());
    
    let requestId: string = '';
    act(() => {
      requestId = result.current.addToQueue({
        type: 'sync',
        method: 'syncToCloud',
        url: 'Firebase Firestore',
      });
    });

    // Wait a bit before completing
    act(() => {
      result.current.updateRequestStatus(requestId, 'completed', {
        status: 200,
      });
    });

    expect(result.current.logs[0].duration).toBeDefined();
    expect(result.current.logs[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('gets pending requests', () => {
    const { result } = renderHook(() => useRequestLog());
    
    act(() => {
      result.current.addToQueue({
        type: 'sync',
        method: 'syncToCloud',
        url: 'Firebase Firestore',
      });
      result.current.addToQueue({
        type: 'api',
        method: 'fetchData',
        url: 'API Endpoint',
      });
    });

    const pending = result.current.getPendingRequests();
    expect(pending.length).toBe(2);
    expect(pending.every(req => req.requestStatus === 'pending')).toBe(true);
  });

  it('gets in-progress requests', () => {
    const { result } = renderHook(() => useRequestLog());
    
    let requestId: string = '';
    act(() => {
      requestId = result.current.addToQueue({
        type: 'sync',
        method: 'syncToCloud',
        url: 'Firebase Firestore',
      });
    });

    act(() => {
      result.current.updateRequestStatus(requestId, 'in-progress');
    });

    const inProgress = result.current.getInProgressRequests();
    expect(inProgress.length).toBe(1);
    expect(inProgress[0].requestStatus).toBe('in-progress');
  });

  it('limits logs to 100 entries', () => {
    const { result } = renderHook(() => useRequestLog());
    
    act(() => {
      // Add 150 logs
      for (let i = 0; i < 150; i++) {
        result.current.addLog({
          type: 'sync',
          method: `request-${i}`,
          url: 'test',
        });
      }
    });

    expect(result.current.logs.length).toBe(100);
  });

  it('clears all logs and queue', () => {
    const { result } = renderHook(() => useRequestLog());
    
    act(() => {
      result.current.addToQueue({
        type: 'sync',
        method: 'syncToCloud',
        url: 'Firebase Firestore',
      });
      result.current.addLog({
        type: 'api',
        method: 'fetchData',
        url: 'API',
      });
    });

    act(() => {
      result.current.clearLogs();
    });

    expect(result.current.logs).toEqual([]);
    expect(result.current.queue).toEqual([]);
  });

  it('gets recent logs with custom count', () => {
    const { result } = renderHook(() => useRequestLog());
    
    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.addLog({
          type: 'sync',
          method: `request-${i}`,
          url: 'test',
        });
      }
    });

    const recent = result.current.getRecentLogs(10);
    expect(recent.length).toBe(10);
  });
});
