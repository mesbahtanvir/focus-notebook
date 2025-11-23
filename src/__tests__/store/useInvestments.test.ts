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

  describe('contribution management', () => {
    beforeEach(() => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [createMockInvestment()],
          }),
        ],
      });
    });

    it('should add a contribution to an investment', async () => {
      const { result } = renderHook(() => useInvestments());

      await act(async () => {
        await result.current.addContribution('portfolio-1', 'investment-1', {
          type: 'deposit',
          amount: 500,
          date: '2024-02-01T00:00:00.000Z',
          note: 'Monthly contribution',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalled();
    });

    it('should add a withdrawal contribution', async () => {
      const { result } = renderHook(() => useInvestments());

      await act(async () => {
        await result.current.addContribution('portfolio-1', 'investment-1', {
          type: 'withdrawal',
          amount: 200,
          date: '2024-02-15T00:00:00.000Z',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalled();
    });

    it('should delete a contribution', async () => {
      const investmentWithContribution = createMockInvestment({
        contributions: [
          {
            id: 'contribution-1',
            type: 'deposit',
            amount: 500,
            date: '2024-02-01T00:00:00.000Z',
            createdAt: '2024-02-01T00:00:00.000Z',
          },
        ],
      });

      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [investmentWithContribution],
          }),
        ],
      });

      const { result } = renderHook(() => useInvestments());

      await act(async () => {
        await result.current.deleteContribution('portfolio-1', 'investment-1', 'contribution-1');
      });

      expect(mockUpdateAt).toHaveBeenCalled();
    });
  });

  describe('portfolio getters', () => {
    beforeEach(() => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [
              createMockInvestment({
                initialAmount: 1000,
                currentValue: 1200,
                currency: 'CAD',
              }),
            ],
          }),
        ],
      });
    });

    it('should get a portfolio by id', () => {
      const { result } = renderHook(() => useInvestments());

      const portfolio = result.current.getPortfolio('portfolio-1');

      expect(portfolio).toBeDefined();
      expect(portfolio?.id).toBe('portfolio-1');
    });

    it('should return undefined for non-existent portfolio', () => {
      const { result } = renderHook(() => useInvestments());

      const portfolio = result.current.getPortfolio('non-existent');

      expect(portfolio).toBeUndefined();
    });

    it('should get an investment from a portfolio', () => {
      const { result } = renderHook(() => useInvestments());

      const investment = result.current.getInvestment('portfolio-1', 'investment-1');

      expect(investment).toBeDefined();
      expect(investment?.id).toBe('investment-1');
    });

    it('should return undefined for non-existent investment', () => {
      const { result } = renderHook(() => useInvestments());

      const investment = result.current.getInvestment('portfolio-1', 'non-existent');

      expect(investment).toBeUndefined();
    });
  });

  describe('portfolio calculations', () => {
    beforeEach(() => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [
              createMockInvestment({
                id: 'investment-1',
                initialAmount: 1000,
                currentValue: 1200,
                currency: 'CAD',
                contributions: [
                  {
                    id: 'c1',
                    type: 'deposit',
                    amount: 1000,
                    date: '2024-01-01T00:00:00.000Z',
                    createdAt: '2024-01-01T00:00:00.000Z',
                    amountInInvestmentCurrency: 1000,
                  },
                ],
              }),
              createMockInvestment({
                id: 'investment-2',
                initialAmount: 2000,
                currentValue: 2500,
                currency: 'CAD',
                contributions: [],
              }),
            ],
          }),
        ],
      });
    });

    it('should calculate total portfolio value', () => {
      const { result } = renderHook(() => useInvestments());

      const totalValue = result.current.getTotalPortfolioValue('portfolio-1');

      expect(totalValue).toBe(3700); // 1200 + 2500
    });

    it('should calculate total invested amount', () => {
      const { result } = renderHook(() => useInvestments());

      const totalInvested = result.current.getTotalInvested('portfolio-1');

      // investment-1: initialAmount (1000) + deposit (1000) = 2000
      // investment-2: initialAmount (2000) + 0 = 2000
      // Total: 4000
      expect(totalInvested).toBe(4000);
    });

    it('should calculate portfolio ROI', () => {
      const { result } = renderHook(() => useInvestments());

      const roi = result.current.getPortfolioROI('portfolio-1');

      // Total value: 3700
      // Total invested: 4000 (1000 initial + 1000 deposit + 2000 initial)
      // ROI = (3700 - 4000) / 4000 * 100 = -7.5%
      expect(roi).toBeCloseTo(-7.5, 1);
    });

    it('should return 0 ROI when total invested is 0', () => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [
              createMockInvestment({
                initialAmount: 0,
                currentValue: 100,
                contributions: [],
              }),
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useInvestments());

      const roi = result.current.getPortfolioROI('portfolio-1');

      expect(roi).toBe(0);
    });

    it('should calculate all portfolios value', () => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            id: 'portfolio-1',
            investments: [
              createMockInvestment({
                currentValue: 1000,
                currency: 'CAD',
              }),
            ],
          }),
          createMockPortfolio({
            id: 'portfolio-2',
            investments: [
              createMockInvestment({
                currentValue: 2000,
                currency: 'CAD',
              }),
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useInvestments());

      const totalValue = result.current.getAllPortfoliosValue();

      expect(totalValue).toBe(3000); // 1000 + 2000
    });
  });

  describe('currency conversion', () => {
    it('should convert amount between currencies', async () => {
      const { result } = renderHook(() => useInvestments());

      const converted = await result.current.convertAmount(100, 'USD', 'CAD');

      expect(converted).toBe(100); // Mocked to return same value
    });

    it('should get investment value in target currency', async () => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [
              createMockInvestment({
                currentValue: 1000,
                currency: 'CAD',
              }),
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useInvestments());

      const value = await result.current.getInvestmentValueInCurrency('portfolio-1', 'investment-1', 'USD');

      expect(value).toBeGreaterThan(0);
    });

    it('should get total portfolio value in target currency', async () => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [
              createMockInvestment({
                currentValue: 1000,
                currency: 'CAD',
              }),
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useInvestments());

      const value = await result.current.getTotalPortfolioValueInCurrency('portfolio-1', 'USD');

      expect(value).toBeGreaterThan(0);
    });

    it('should get total invested in target currency', async () => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [
              createMockInvestment({
                initialAmount: 1000,
                currency: 'CAD',
              }),
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useInvestments());

      const value = await result.current.getTotalInvestedInCurrency('portfolio-1', 'USD');

      expect(value).toBeGreaterThan(0);
    });
  });

  describe('export functionality', () => {
    beforeEach(() => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            id: 'portfolio-1',
            name: 'Portfolio 1',
          }),
          createMockPortfolio({
            id: 'portfolio-2',
            name: 'Portfolio 2',
          }),
        ],
      });
    });

    it('should export all portfolios when no IDs specified', () => {
      const { result } = renderHook(() => useInvestments());

      const exported = result.current.getPortfoliosForExport();

      expect(exported).toHaveLength(2);
    });

    it('should export specific portfolios by ID', () => {
      const { result } = renderHook(() => useInvestments());

      const exported = result.current.getPortfoliosForExport(['portfolio-1']);

      expect(exported).toHaveLength(1);
      expect(exported[0].id).toBe('portfolio-1');
    });

    it('should return empty array for non-existent portfolio IDs', () => {
      const { result } = renderHook(() => useInvestments());

      const exported = result.current.getPortfoliosForExport(['non-existent']);

      expect(exported).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty portfolios list', () => {
      useInvestments.setState({
        portfolios: [],
      });

      const { result } = renderHook(() => useInvestments());

      expect(result.current.getAllPortfoliosValue()).toBe(0);
      expect(result.current.getPortfolio('any-id')).toBeUndefined();
    });

    it('should handle portfolio with no investments', () => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [],
          }),
        ],
      });

      const { result } = renderHook(() => useInvestments());

      expect(result.current.getTotalPortfolioValue('portfolio-1')).toBe(0);
      expect(result.current.getTotalInvested('portfolio-1')).toBe(0);
      expect(result.current.getPortfolioROI('portfolio-1')).toBe(0);
    });

    it('should handle invalid currency values gracefully', () => {
      useInvestments.setState({
        portfolios: [
          createMockPortfolio({
            investments: [
              createMockInvestment({
                currentValue: NaN,
                initialAmount: undefined as any,
              }),
            ],
          }),
        ],
      });

      const { result } = renderHook(() => useInvestments());

      // Should not throw and should return valid numbers
      expect(() => result.current.getTotalPortfolioValue('portfolio-1')).not.toThrow();
      expect(result.current.getTotalPortfolioValue('portfolio-1')).toBe(0);
    });
  });
});
