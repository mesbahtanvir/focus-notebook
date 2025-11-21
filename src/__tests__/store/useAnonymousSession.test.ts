import { renderHook, act } from '@testing-library/react';
import { useAnonymousSession } from '@/store/useAnonymousSession';

const resetStore = () => {
  useAnonymousSession.setState({
    uid: null,
    expiresAt: null,
    allowAi: false,
    cleanupPending: false,
    expired: false,
    ciOverrideKey: null,
  });
};

describe('useAnonymousSession store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useAnonymousSession());

      expect(result.current.uid).toBeNull();
      expect(result.current.expiresAt).toBeNull();
      expect(result.current.allowAi).toBe(false);
      expect(result.current.cleanupPending).toBe(false);
      expect(result.current.expired).toBe(false);
      expect(result.current.ciOverrideKey).toBeNull();
    });
  });

  describe('setSession', () => {
    it('should set session with required fields', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'anonymous-user-123',
          expiresAt: '2024-12-31T23:59:59.000Z',
          allowAi: true,
        });
      });

      expect(result.current.uid).toBe('anonymous-user-123');
      expect(result.current.expiresAt).toBe('2024-12-31T23:59:59.000Z');
      expect(result.current.allowAi).toBe(true);
      expect(result.current.expired).toBe(false);
    });

    it('should set session with all fields', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'anon-456',
          expiresAt: '2024-12-31T23:59:59.000Z',
          allowAi: false,
          cleanupPending: true,
          ciOverrideKey: 'test-override-key',
        });
      });

      expect(result.current.uid).toBe('anon-456');
      expect(result.current.expiresAt).toBe('2024-12-31T23:59:59.000Z');
      expect(result.current.allowAi).toBe(false);
      expect(result.current.cleanupPending).toBe(true);
      expect(result.current.ciOverrideKey).toBe('test-override-key');
      expect(result.current.expired).toBe(false);
    });

    it('should default cleanupPending to false', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: null,
          allowAi: true,
        });
      });

      expect(result.current.cleanupPending).toBe(false);
    });

    it('should default ciOverrideKey to null', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: null,
          allowAi: true,
        });
      });

      expect(result.current.ciOverrideKey).toBeNull();
    });

    it('should reset expired flag when setting new session', () => {
      const { result } = renderHook(() => useAnonymousSession());

      // First mark as expired
      act(() => {
        result.current.setSession({
          uid: 'old-session',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
        });
        result.current.markExpired();
      });

      expect(result.current.expired).toBe(true);

      // Set new session should reset expired
      act(() => {
        result.current.setSession({
          uid: 'new-session',
          expiresAt: '2024-12-31T23:59:59.000Z',
          allowAi: true,
        });
      });

      expect(result.current.expired).toBe(false);
    });

    it('should handle null expiresAt', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: null,
          allowAi: true,
        });
      });

      expect(result.current.expiresAt).toBeNull();
    });

    it('should allow AI when allowAi is true', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-12-31T23:59:59.000Z',
          allowAi: true,
        });
      });

      expect(result.current.allowAi).toBe(true);
    });

    it('should not allow AI when allowAi is false', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-12-31T23:59:59.000Z',
          allowAi: false,
        });
      });

      expect(result.current.allowAi).toBe(false);
    });
  });

  describe('markExpired', () => {
    it('should mark session as expired', () => {
      const { result } = renderHook(() => useAnonymousSession());

      // Set up a session first
      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
        });
      });

      expect(result.current.expired).toBe(false);

      act(() => {
        result.current.markExpired();
      });

      expect(result.current.expired).toBe(true);
    });

    it('should set cleanupPending to true when marked expired', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
        });
      });

      expect(result.current.cleanupPending).toBe(false);

      act(() => {
        result.current.markExpired();
      });

      expect(result.current.cleanupPending).toBe(true);
    });

    it('should preserve allowAi value when marked expired', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
        });
      });

      act(() => {
        result.current.markExpired();
      });

      expect(result.current.allowAi).toBe(true);

      // Try with allowAi false
      act(() => {
        result.current.setSession({
          uid: 'test-uid-2',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: false,
        });
      });

      act(() => {
        result.current.markExpired();
      });

      expect(result.current.allowAi).toBe(false);
    });

    it('should work when called on default state', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.markExpired();
      });

      expect(result.current.expired).toBe(true);
      expect(result.current.cleanupPending).toBe(true);
    });
  });

  describe('updateCleanupPending', () => {
    it('should update cleanupPending to true', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
        });
      });

      expect(result.current.cleanupPending).toBe(false);

      act(() => {
        result.current.updateCleanupPending(true);
      });

      expect(result.current.cleanupPending).toBe(true);
    });

    it('should update cleanupPending to false', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
          cleanupPending: true,
        });
      });

      expect(result.current.cleanupPending).toBe(true);

      act(() => {
        result.current.updateCleanupPending(false);
      });

      expect(result.current.cleanupPending).toBe(false);
    });

    it('should preserve expired status when updating cleanupPending', () => {
      const { result } = renderHook(() => useAnonymousSession());

      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
        });
        result.current.markExpired();
      });

      expect(result.current.expired).toBe(true);

      act(() => {
        result.current.updateCleanupPending(true);
      });

      expect(result.current.expired).toBe(true);

      act(() => {
        result.current.updateCleanupPending(false);
      });

      expect(result.current.expired).toBe(true);
    });
  });

  describe('clearSession', () => {
    it('should reset all fields to initial state', () => {
      const { result } = renderHook(() => useAnonymousSession());

      // Set up a complete session
      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-12-31T23:59:59.000Z',
          allowAi: true,
          cleanupPending: true,
          ciOverrideKey: 'test-key',
        });
        result.current.markExpired();
      });

      // Verify session is set
      expect(result.current.uid).toBe('test-uid');
      expect(result.current.expiresAt).toBe('2024-12-31T23:59:59.000Z');
      expect(result.current.allowAi).toBe(true);
      expect(result.current.cleanupPending).toBe(true);
      expect(result.current.expired).toBe(true);
      expect(result.current.ciOverrideKey).toBe('test-key');

      // Clear session
      act(() => {
        result.current.clearSession();
      });

      // Verify all fields are reset
      expect(result.current.uid).toBeNull();
      expect(result.current.expiresAt).toBeNull();
      expect(result.current.allowAi).toBe(false);
      expect(result.current.cleanupPending).toBe(false);
      expect(result.current.expired).toBe(false);
      expect(result.current.ciOverrideKey).toBeNull();
    });

    it('should work when called on default state', () => {
      const { result } = renderHook(() => useAnonymousSession());

      expect(() => {
        act(() => {
          result.current.clearSession();
        });
      }).not.toThrow();

      expect(result.current.uid).toBeNull();
      expect(result.current.expiresAt).toBeNull();
    });
  });

  describe('state transitions', () => {
    it('should support setting multiple sessions', () => {
      const { result } = renderHook(() => useAnonymousSession());

      // First session
      act(() => {
        result.current.setSession({
          uid: 'session-1',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
        });
      });

      expect(result.current.uid).toBe('session-1');

      // Second session
      act(() => {
        result.current.setSession({
          uid: 'session-2',
          expiresAt: '2024-02-01T00:00:00.000Z',
          allowAi: false,
        });
      });

      expect(result.current.uid).toBe('session-2');
      expect(result.current.allowAi).toBe(false);
    });

    it('should support session lifecycle: set -> expire -> clear', () => {
      const { result } = renderHook(() => useAnonymousSession());

      // Set session
      act(() => {
        result.current.setSession({
          uid: 'test-uid',
          expiresAt: '2024-01-01T00:00:00.000Z',
          allowAi: true,
        });
      });

      expect(result.current.uid).toBe('test-uid');
      expect(result.current.expired).toBe(false);

      // Mark expired
      act(() => {
        result.current.markExpired();
      });

      expect(result.current.expired).toBe(true);
      expect(result.current.cleanupPending).toBe(true);

      // Clear
      act(() => {
        result.current.clearSession();
      });

      expect(result.current.uid).toBeNull();
      expect(result.current.expired).toBe(false);
      expect(result.current.cleanupPending).toBe(false);
    });
  });
});
