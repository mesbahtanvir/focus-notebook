/**
 * Integration tests for Firestore subscription loading behavior
 * Ensures subscriptions work correctly with both memory and persistent cache
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useTasks } from '@/store/useTasks';
import { useThoughts } from '@/store/useThoughts';
import { onSnapshot } from 'firebase/firestore';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ _path: path })),
  query: jest.fn((ref, ...queryConstraints) => ({ ref, queryConstraints })),
  orderBy: jest.fn((field, direction) => ({ field, direction })),
  onSnapshot: jest.fn(),
  getFirestore: jest.fn(() => ({})),
  initializeFirestore: jest.fn(() => ({})),
  persistentLocalCache: jest.fn(() => ({ type: 'persistent' })),
  persistentMultipleTabManager: jest.fn(() => ({ type: 'multiTab' })),
  memoryLocalCache: jest.fn(() => ({ type: 'memory' })),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-123' },
  })),
  GoogleAuthProvider: jest.fn(),
  EmailAuthProvider: jest.fn(),
}));

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
  functionsClient: {},
  googleProvider: {},
  emailProvider: {},
}));

describe('Firestore Subscription Loading - Integration Tests', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
  });

  describe('Tasks Store Subscription', () => {
    test('should transition from loading to loaded when snapshot received', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'task-1',
            data: () => ({ title: 'Test Task', done: false, status: 'active', priority: 'medium', createdAt: new Date().toISOString() }),
          },
        ],
        metadata: {
          fromCache: false,
          hasPendingWrites: false,
        },
      };

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        // Simulate async snapshot delivery
        setTimeout(() => {
          onNext(mockSnapshot);
        }, 100);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useTasks());

      // Subscribe to tasks
      result.current.subscribe('test-user-123');

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSubscribed).toBe(true);

      // Wait for snapshot to be received
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      // Should have received tasks
      expect(result.current.tasks.length).toBeGreaterThan(0);
      expect(result.current.fromCache).toBe(false);
    });

    test('should handle cached data correctly', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'task-1',
            data: () => ({ title: 'Cached Task', done: false, status: 'active', priority: 'medium', createdAt: new Date().toISOString() }),
          },
        ],
        metadata: {
          fromCache: true, // Data from cache
          hasPendingWrites: false,
        },
      };

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        setTimeout(() => {
          onNext(mockSnapshot);
        }, 50);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useTasks());

      result.current.subscribe('test-user-123');

      await waitFor(() => {
        expect(result.current.fromCache).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.tasks.length).toBeGreaterThan(0);
    });

    test('should handle subscription errors gracefully', async () => {
      const mockError = new Error('Network error');

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext, onError) => {
        setTimeout(() => {
          onError(mockError);
        }, 50);
        return mockUnsubscribe;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useTasks());

      result.current.subscribe('test-user-123');

      await waitFor(() => {
        expect(result.current.syncError).toBeTruthy();
      });

      expect(result.current.isLoading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('should not get stuck in loading state', async () => {
      // Simulate a slow subscription that eventually resolves
      const mockSnapshot = {
        docs: [],
        metadata: {
          fromCache: false,
          hasPendingWrites: false,
        },
      };

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        // Delay snapshot delivery
        setTimeout(() => {
          onNext(mockSnapshot);
        }, 2000);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useTasks());

      result.current.subscribe('test-user-123');

      expect(result.current.isLoading).toBe(true);

      // Should eventually load even if slow
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Thoughts Store Subscription', () => {
    test('should transition from loading to loaded when snapshot received', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'thought-1',
            data: () => ({ text: 'Test Thought', createdAt: new Date().toISOString() }),
          },
        ],
        metadata: {
          fromCache: false,
          hasPendingWrites: false,
        },
      };

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        setTimeout(() => {
          onNext(mockSnapshot);
        }, 100);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useThoughts());

      result.current.subscribe('test-user-123');

      expect(result.current.isLoading).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      expect(result.current.thoughts.length).toBeGreaterThan(0);
    });

    test('should handle cached data from memory cache (Safari)', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'thought-1',
            data: () => ({ text: 'Cached Thought', createdAt: new Date().toISOString() }),
          },
        ],
        metadata: {
          fromCache: true,
          hasPendingWrites: false,
        },
      };

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        setTimeout(() => {
          onNext(mockSnapshot);
        }, 50);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useThoughts());

      result.current.subscribe('test-user-123');

      await waitFor(() => {
        expect(result.current.fromCache).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Subscription Lifecycle', () => {
    test('should cleanup previous subscription when resubscribing', async () => {
      const mockSnapshot = {
        docs: [],
        metadata: { fromCache: false, hasPendingWrites: false },
      };

      const firstUnsubscribe = jest.fn();
      const secondUnsubscribe = jest.fn();

      let callCount = 0;
      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        setTimeout(() => onNext(mockSnapshot), 50);
        callCount++;
        return callCount === 1 ? firstUnsubscribe : secondUnsubscribe;
      });

      const { result } = renderHook(() => useTasks());

      // First subscription
      result.current.subscribe('user-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Second subscription should cleanup first
      result.current.subscribe('user-2');

      await waitFor(() => {
        expect(firstUnsubscribe).toHaveBeenCalled();
      });
    });

    test('should handle rapid resubscriptions', async () => {
      const mockSnapshot = {
        docs: [],
        metadata: { fromCache: false, hasPendingWrites: false },
      };

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        setTimeout(() => onNext(mockSnapshot), 50);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useTasks());

      // Rapid subscriptions
      result.current.subscribe('user-1');
      result.current.subscribe('user-2');
      result.current.subscribe('user-3');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should be subscribed to the latest user
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  describe('Loading State Edge Cases', () => {
    test('should handle empty snapshots without hanging', async () => {
      const mockSnapshot = {
        docs: [],
        metadata: { fromCache: false, hasPendingWrites: false },
      };

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        setTimeout(() => onNext(mockSnapshot), 100);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useTasks());

      result.current.subscribe('test-user-123');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
    });

    test('should handle pending writes correctly', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'task-1',
            data: () => ({ title: 'New Task', done: false, status: 'active', priority: 'medium', createdAt: new Date().toISOString() }),
          },
        ],
        metadata: {
          fromCache: false,
          hasPendingWrites: true, // Local write not yet synced
        },
      };

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        setTimeout(() => onNext(mockSnapshot), 100);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useTasks());

      result.current.subscribe('test-user-123');

      await waitFor(() => {
        expect(result.current.hasPendingWrites).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.tasks.length).toBeGreaterThan(0);
    });

    test('should handle network reconnection', async () => {
      let snapshotCallback: any;

      (onSnapshot as jest.Mock).mockImplementation((query, options, onNext) => {
        snapshotCallback = onNext;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useTasks());

      result.current.subscribe('test-user-123');

      // Initial cached data
      snapshotCallback({
        docs: [{ id: '1', data: () => ({ title: 'Task 1', done: false, status: 'active', priority: 'medium', createdAt: new Date().toISOString() }) }],
        metadata: { fromCache: true, hasPendingWrites: false },
      });

      await waitFor(() => {
        expect(result.current.fromCache).toBe(true);
      });

      // Network data arrives
      snapshotCallback({
        docs: [
          { id: '1', data: () => ({ title: 'Task 1', done: false, status: 'active', priority: 'medium', createdAt: new Date().toISOString() }) },
          { id: '2', data: () => ({ title: 'Task 2', done: false, status: 'active', priority: 'medium', createdAt: new Date().toISOString() }) },
        ],
        metadata: { fromCache: false, hasPendingWrites: false },
      });

      await waitFor(() => {
        expect(result.current.fromCache).toBe(false);
      });

      expect(result.current.tasks.length).toBe(2);
    });
  });
});
