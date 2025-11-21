import { renderHook, act } from '@testing-library/react';
import { useSubscriptionStatus } from '@/store/useSubscriptionStatus';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeDoc: jest.fn((ref, callback) => {
    callback(null, { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  }),
}));

jest.mock('../../../shared/subscription', () => ({
  evaluateAiEntitlement: jest.fn((subscription) => {
    if (!subscription) return { allowed: false, code: 'no-record' };
    if (subscription.status === 'active') return { allowed: true, code: 'allowed' };
    if (subscription.status === 'trialing') return { allowed: true, code: 'allowed' };
    return { allowed: false, code: 'inactive' };
  }),
  hasActivePro: jest.fn((subscription) => {
    return subscription?.status === 'active' || subscription?.status === 'trialing';
  }),
  SUBSCRIPTION_STATUS_COLLECTION: 'subscriptionStatus',
  SUBSCRIPTION_STATUS_DOC_ID: 'current',
}));

const { subscribeDoc: mockSubscribeDoc } = require('@/lib/data/subscribe') as {
  subscribeDoc: jest.Mock;
};

const {
  evaluateAiEntitlement: mockEvaluateAiEntitlement,
  hasActivePro: mockHasActivePro,
} = require('../../../shared/subscription');

const resetStore = () => {
  useSubscriptionStatus.setState({
    subscription: null,
    entitlement: { allowed: false, code: 'no-record' },
    hasProAccess: false,
    isLoading: false,
    fromCache: false,
    lastUpdatedAt: null,
    unsubscribe: null,
  });
};

describe('useSubscriptionStatus store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeDoc).toHaveBeenCalled();
    });

    it('should set loading state before subscription', () => {
      let callbackRef: any = null;
      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callbackRef = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      // Should be set to loading when callback hasn't fired yet
      expect(result.current.isLoading).toBe(true);
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeDoc.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should handle active subscription', () => {
      const subscriptionData = {
        status: 'active',
        currentPeriodEnd: '2024-12-31T23:59:59.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription).toEqual(expect.objectContaining({
        status: 'active',
      }));
      expect(result.current.entitlement.allowed).toBe(true);
      expect(result.current.hasProAccess).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle trialing subscription', () => {
      const subscriptionData = {
        status: 'trialing',
        trialEndsAt: '2024-02-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription).toEqual(expect.objectContaining({
        status: 'trialing',
      }));
      expect(result.current.entitlement.allowed).toBe(true);
      expect(result.current.hasProAccess).toBe(true);
    });

    it('should handle null subscription (no record)', () => {
      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(null, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.entitlement.allowed).toBe(false);
      expect(result.current.entitlement.code).toBe('no-record');
      expect(result.current.hasProAccess).toBe(false);
    });

    it('should handle canceled subscription', () => {
      const subscriptionData = {
        status: 'canceled',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription).toEqual(expect.objectContaining({
        status: 'canceled',
      }));
      expect(result.current.entitlement.allowed).toBe(false);
      expect(result.current.hasProAccess).toBe(false);
    });

    it('should handle cached data', () => {
      const subscriptionData = {
        status: 'active',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData, { fromCache: true, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.fromCache).toBe(true);
    });

    it('should normalize Firebase Timestamp in updatedAt', () => {
      const subscriptionData = {
        status: 'active',
        updatedAt: {
          toDate: () => new Date('2024-01-01T00:00:00.000Z'),
        },
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData as any, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription?.updatedAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.current.lastUpdatedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should normalize Firebase Timestamp in currentPeriodEnd', () => {
      const subscriptionData = {
        status: 'active',
        currentPeriodEnd: {
          toMillis: () => new Date('2024-12-31T23:59:59.000Z').getTime(),
        },
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData as any, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription?.currentPeriodEnd).toBe('2024-12-31T23:59:59.000Z');
    });

    it('should handle Date objects in timestamps', () => {
      const subscriptionData = {
        status: 'active',
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2024-12-31T23:59:59.000Z'),
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData as any, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription?.updatedAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.current.subscription?.currentPeriodEnd).toBe('2024-12-31T23:59:59.000Z');
    });

    it('should handle number timestamps (milliseconds)', () => {
      const subscriptionData = {
        status: 'active',
        updatedAt: new Date('2024-01-01T00:00:00.000Z').getTime(),
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData as any, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription?.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle null/undefined timestamps', () => {
      const subscriptionData = {
        status: 'active',
        updatedAt: null,
        currentPeriodEnd: undefined,
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData as any, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription?.updatedAt).toBeNull();
      expect(result.current.subscription?.currentPeriodEnd).toBeNull();
      expect(result.current.lastUpdatedAt).toBeNull();
    });

    it('should handle invalid timestamp values', () => {
      const subscriptionData = {
        status: 'active',
        updatedAt: Infinity,
        currentPeriodEnd: { invalid: 'object' },
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData as any, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(result.current.subscription?.updatedAt).toBeNull();
      expect(result.current.subscription?.currentPeriodEnd).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear subscription and reset state', () => {
      const subscriptionData = {
        status: 'active',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      useSubscriptionStatus.setState({
        subscription: subscriptionData as any,
        entitlement: { allowed: true, code: 'allowed' },
        hasProAccess: true,
        isLoading: false,
        fromCache: false,
        lastUpdatedAt: '2024-01-01T00:00:00.000Z',
        unsubscribe: null,
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.clear();
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.entitlement.allowed).toBe(false);
      expect(result.current.entitlement.code).toBe('no-record');
      expect(result.current.hasProAccess).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fromCache).toBe(false);
      expect(result.current.lastUpdatedAt).toBeNull();
      expect(result.current.unsubscribe).toBeNull();
    });

    it('should unsubscribe when clearing', () => {
      const unsubscribeMock = jest.fn();

      useSubscriptionStatus.setState({
        subscription: null,
        entitlement: { allowed: false, code: 'no-record' },
        hasProAccess: false,
        isLoading: false,
        fromCache: false,
        lastUpdatedAt: null,
        unsubscribe: unsubscribeMock,
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.clear();
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should handle clear when no subscription exists', () => {
      useSubscriptionStatus.setState({
        subscription: null,
        entitlement: { allowed: false, code: 'no-record' },
        hasProAccess: false,
        isLoading: false,
        fromCache: false,
        lastUpdatedAt: null,
        unsubscribe: null,
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      expect(() => {
        act(() => {
          result.current.clear();
        });
      }).not.toThrow();
    });
  });

  describe('state transitions', () => {
    it('should transition from loading to loaded', () => {
      let callbackRef: any = null;
      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callbackRef = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      // Initially set to loading by subscribe
      expect(result.current.isLoading).toBe(true);

      // Fire the callback to simulate data loading
      act(() => {
        callbackRef(null, { fromCache: false, hasPendingWrites: false });
      });

      // Should be set to false after callback fires
      expect(result.current.isLoading).toBe(false);
    });

    it('should maintain state between re-subscriptions', () => {
      const subscriptionData = {
        status: 'active',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSubscribeDoc.mockImplementation((ref, callback) => {
        callback(subscriptionData, { fromCache: false, hasPendingWrites: false });
        return jest.fn();
      });

      const { result } = renderHook(() => useSubscriptionStatus());

      act(() => {
        result.current.subscribe('user-1');
      });

      expect(result.current.hasProAccess).toBe(true);

      // Re-subscribe should reset and reload
      act(() => {
        result.current.subscribe('user-2');
      });

      expect(result.current.hasProAccess).toBe(true);
    });
  });
});
