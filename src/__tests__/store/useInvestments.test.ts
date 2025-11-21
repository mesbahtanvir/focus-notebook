// Mock crypto.randomUUID globally
let idCounter = 0;
const mockRandomUUID = () => `test-uuid-${idCounter++}`;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
  writable: true,
});

import { renderHook, act } from '@testing-library/react';
import { useInvestments, Portfolio, Investment } from '@/store/useInvestments';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn((...args) => args),
  orderBy: jest.fn(() => ({})),
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
  setAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  }),
}));

jest.mock('@/lib/services/currency', () => ({
  convertCurrency: jest.fn().mockResolvedValue(100),
  convertCurrencySync: jest.fn((amount) => amount),
  convertAmountsToCurrency: jest.fn().mockResolvedValue([100, 200]),
  normalizeCurrencyCode: jest.fn((currency) => currency || 'CAD'),
}));

const { createAt: mockCreateAt, updateAt: mockUpdateAt, deleteAt: mockDeleteAt } = require('@/lib/data/gateway');
const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe');

const createMockPortfolio = (overrides: Partial<Portfolio> = {}): Portfolio => ({
  id: 'portfolio-1',
  name: 'Test Portfolio',
  status: 'active',
  investments: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockInvestment = (overrides: Partial<Investment> = {}): Investment => ({
  id: 'investment-1',
  portfolioId: 'portfolio-1',
  name: 'Test Investment',
  type: 'stocks',
  assetType: 'manual',
  initialAmount: 1000,
  currentValue: 1200,
  contributions: [],
  currency: 'CAD',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const resetStore = () => {
  useInvestments.setState({
    portfolios: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
    currentUserId: null,
  });
};

describe('useInvestments store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useInvestments());

      expect(result.current.portfolios).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('should initialize subscription', () => {
      const { result } = renderHook(() => useInvestments());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should unsubscribe from previous subscriptions', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useInvestments());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('portfolio management', () => {
    it('should add a new portfolio', async () => {
      const { result } = renderHook(() => useInvestments());

      await act(async () => {
        await result.current.addPortfolio({
          name: 'My Portfolio',
          description: 'Test description',
          status: 'active',
        });
      });

      expect(mockCreateAt).toHaveBeenCalled();
    });

    it('should update a portfolio', async () => {
      const { result } = renderHook(() => useInvestments());

      act(() => {
        useInvestments.setState({
          portfolios: [createMockPortfolio()],
        });
      });

      await act(async () => {
        await result.current.updatePortfolio('portfolio-1', {
          name: 'Updated Portfolio',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalled();
    });

    it('should delete a portfolio', async () => {
      const { result } = renderHook(() => useInvestments());

      act(() => {
        useInvestments.setState({
          portfolios: [createMockPortfolio()],
        });
      });

      await act(async () => {
        await result.current.deletePortfolio('portfolio-1');
      });

      expect(mockDeleteAt).toHaveBeenCalled();
    });
  });

  describe('investment management', () => {
    beforeEach(() => {
      useInvestments.setState({
        portfolios: [createMockPortfolio()],
      });
    });

    it('should add a new investment to portfolio', async () => {
      const { result } = renderHook(() => useInvestments());

      await act(async () => {
        await result.current.addInvestment('portfolio-1', {
          name: 'New Investment',
          type: 'stocks',
          assetType: 'manual',
          initialAmount: 5000,
          currentValue: 5500,
          currency: 'CAD',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalled();
    });

    it('should update an investment', async () => {
      const { result } = renderHook(() => useInvestments());

      act(() => {
        useInvestments.setState({
          portfolios: [
            createMockPortfolio({
              investments: [createMockInvestment()],
            }),
          ],
        });
      });

      await act(async () => {
        await result.current.updateInvestment('portfolio-1', 'investment-1', {
          currentValue: 1500,
        });
      });

      expect(mockUpdateAt).toHaveBeenCalled();
    });

    it('should delete an investment', async () => {
      const { result } = renderHook(() => useInvestments());

      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [createMockInvestment()],
          }),
        ],
      });

      await act(async () => {
        await result.current.deleteInvestment('portfolio-1', 'investment-1');
      });

      expect(mockUpdateAt).toHaveBeenCalled();
    });

    it('should handle different investment types', async () => {
      const { result } = renderHook(() => useInvestments());

      const types = ['stocks', 'bonds', 'crypto', 'real-estate', 'retirement', 'mutual-funds', 'other'];

      for (const type of types.slice(0, 3)) { // Test first 3 types
        await act(async () => {
          await result.current.addInvestment('portfolio-1', {
            name: `${type} Investment`,
            type: type as any,
            assetType: 'manual',
            initialAmount: 1000,
            currentValue: 1100,
            currency: 'CAD',
          });
        });
      }

      expect(mockUpdateAt).toHaveBeenCalled();
    });
  });

  describe('portfolio status', () => {
    beforeEach(() => {
      useInvestments.setState({
        portfolios: [createMockPortfolio()],
      });
    });

    it('should handle different portfolio statuses', async () => {
      const { result } = renderHook(() => useInvestments());

      // Test archiving
      await act(async () => {
        await result.current.updatePortfolio('portfolio-1', {
          status: 'archived',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalled();

      // Test closing
      await act(async () => {
        await result.current.updatePortfolio('portfolio-1', {
          status: 'closed',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledTimes(2);
    });
  });
});
