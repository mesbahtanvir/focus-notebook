import { renderHook, waitFor } from '@testing-library/react';
import { useAuthUserId } from '@/hooks/useAuthUserId';

// Mock Firebase auth
const mockOnAuthStateChanged = jest.fn();
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
}));

jest.mock('@/lib/firebaseClient', () => ({
  auth: {},
}));

describe('useAuthUserId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null initially', () => {
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());

    const { result } = renderHook(() => useAuthUserId());

    expect(result.current).toBeNull();
  });

  it('should return user ID when user is authenticated', async () => {
    const mockUser = { uid: 'test-user-123' };

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    const { result } = renderHook(() => useAuthUserId());

    await waitFor(() => {
      expect(result.current).toBe('test-user-123');
    });
  });

  it('should return null when user is not authenticated', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });

    const { result } = renderHook(() => useAuthUserId());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('should update when auth state changes', async () => {
    let authCallback: any;

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authCallback = callback;
      callback(null); // Start unauthenticated
      return jest.fn();
    });

    const { result } = renderHook(() => useAuthUserId());

    // Initially null
    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    // User signs in
    if (authCallback) {
      authCallback({ uid: 'new-user-456' });
    }

    await waitFor(() => {
      expect(result.current).toBe('new-user-456');
    });

    // User signs out
    if (authCallback) {
      authCallback(null);
    }

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = jest.fn();

    mockOnAuthStateChanged.mockImplementation(() => mockUnsubscribe);

    const { unmount } = renderHook(() => useAuthUserId());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle user object without uid', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback({});  // User object without uid
      return jest.fn();
    });

    const { result } = renderHook(() => useAuthUserId());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('should handle multiple rapid auth changes', async () => {
    let authCallback: any;

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authCallback = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useAuthUserId());

    // Rapid changes
    authCallback({ uid: 'user-1' });
    authCallback({ uid: 'user-2' });
    authCallback({ uid: 'user-3' });

    await waitFor(() => {
      expect(result.current).toBe('user-3');
    });
  });
});
