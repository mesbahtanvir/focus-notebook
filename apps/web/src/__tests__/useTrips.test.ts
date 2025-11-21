import { renderHook, act } from '@testing-library/react';
import { useTrips } from '@/store/useTrips';

jest.mock('@/lib/firebaseClient', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    callback([], { fromCache: false, hasPendingWrites: false });
    return jest.fn();
  }),
}));

jest.mock('@/lib/services/currency', () => ({
  convertCurrencySync: jest.fn((amount, fromCurrency, toCurrency) => {
    // Mock conversion rates (CAD as base)
    const rates: Record<string, number> = {
      'CAD': 1,
      'USD': 0.71,
      'BDT': 87,
      'COP': 2758,
    };

    if (fromCurrency === toCurrency) return amount;

    // Convert to CAD first, then to target currency
    const amountInCAD = fromCurrency === 'CAD' ? amount : amount / rates[fromCurrency];
    return toCurrency === 'CAD' ? amountInCAD : amountInCAD * rates[toCurrency];
  }),
}));

const { createAt: mockCreateAt, updateAt: mockUpdateAt } = require('@/lib/data/gateway') as {
  createAt: jest.Mock;
  updateAt: jest.Mock;
};

const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe') as {
  subscribeCol: jest.Mock;
};

const originalCrypto = global.crypto;
const randomUUIDMock = jest.fn(() => 'test-trip-id');

beforeAll(() => {
  Object.defineProperty(global, 'crypto', {
    value: { randomUUID: randomUUIDMock },
    configurable: true,
  });
});

afterAll(() => {
  Object.defineProperty(global, 'crypto', {
    value: originalCrypto,
    configurable: true,
  });
});

const resetStore = () => {
  useTrips.setState({
    trips: [],
    standaloneExpenses: [],
    isLoading: false,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
    expensesUnsubscribe: null,
  });
};

describe('useTrips store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
     randomUUIDMock.mockClear();
     randomUUIDMock.mockReturnValue('test-trip-id');
    resetStore();
  });

  describe('status lifecycle', () => {
    it('marks a future trip as planning when added', async () => {
      const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

      const { result } = renderHook(() => useTrips());

      await act(async () => {
        await result.current.addTrip({
          name: 'Future Adventure',
          destination: 'Mars',
          startDate: futureStart,
          endDate: futureEnd,
          budget: 5000,
          currency: 'USD',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.stringMatching(/users\/test-user-id\/trips/),
        expect.objectContaining({ status: 'planning' })
      );
    });

    it('marks an active trip as in-progress when added', async () => {
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { result } = renderHook(() => useTrips());

      await act(async () => {
        await result.current.addTrip({
          name: 'Active Trip',
          destination: 'Moon',
          startDate: start,
          endDate: end,
          budget: 2000,
          currency: 'USD',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'in-progress' })
      );
    });

    it('marks a completed trip when dates are in the past', async () => {
      const start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      const { result } = renderHook(() => useTrips());

      await act(async () => {
        await result.current.addTrip({
          name: 'Old Trip',
          destination: 'Saturn',
          startDate: start,
          endDate: end,
          budget: 3000,
          currency: 'USD',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('recomputes status when trip dates are updated', async () => {
      const tripId = 'trip-123';
      const planningStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const planningEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      act(() => {
        useTrips.setState({
          trips: [
            {
              id: tripId,
              name: 'Trip',
              destination: 'Neptune',
              startDate: planningStart,
              endDate: planningEnd,
              budget: 1000,
              currency: 'USD',
              status: 'planning',
              expenses: [],
              budgetBreakdown: {},
              createdAt: new Date().toISOString(),
            },
          ],
        });
      });

      const { result } = renderHook(() => useTrips());
      const newStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const newEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await act(async () => {
        await result.current.updateTrip(tripId, {
          startDate: newStart,
          endDate: newEnd,
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith(
        expect.stringContaining(`/trips/${tripId}`),
        expect.objectContaining({ status: 'in-progress' })
      );
    });
  });

  it('allows adding expenses while trip is still in planning state', async () => {
    const tripId = 'trip-planning';
    act(() => {
      useTrips.setState({
        trips: [
          {
            id: tripId,
            name: 'Future Getaway',
            destination: 'Venus',
            startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            budget: 1500,
            currency: 'USD',
            status: 'planning',
            expenses: [],
            budgetBreakdown: {},
            createdAt: new Date().toISOString(),
          },
        ],
      });
    });

    const { result } = renderHook(() => useTrips());

    await act(async () => {
      await result.current.addExpense(tripId, {
        category: 'food',
        amount: 50,
        currency: 'USD',
        date: new Date().toISOString(),
        description: 'Dinner',
      });
    });

    expect(mockUpdateAt).toHaveBeenCalledWith(
      expect.stringContaining(`/trips/${tripId}`),
      expect.objectContaining({
        expenses: expect.arrayContaining([
          expect.objectContaining({
            description: 'Dinner',
            amount: 50,
            category: 'food',
          }),
        ]),
      })
    );
  });

  it('normalizes trips received from subscription', () => {
    const rawTrip = {
      id: 'trip-sub',
      name: 'Subscribed Trip',
      destination: 'Mercury',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      budget: 800,
      currency: 'USD',
      status: 'planning' as const,
      expenses: undefined,
      budgetBreakdown: undefined,
      createdAt: new Date().toISOString(),
    };

    mockSubscribeCol.mockImplementationOnce((query, callback) => {
      callback([rawTrip], { fromCache: false, hasPendingWrites: false });
      return jest.fn();
    });

    const { result } = renderHook(() => useTrips());

    act(() => {
      result.current.subscribe('test-user-id');
    });

    const storedTrip = useTrips.getState().trips[0];
    expect(storedTrip.expenses).toEqual([]);
    expect(storedTrip.budgetBreakdown).toEqual({});
    expect(storedTrip.status).toBe('in-progress');
  });

  describe('currency conversion', () => {
    it('converts expenses to CAD when calculating total spent', () => {
      const tripId = 'trip-multi-currency';
      act(() => {
        useTrips.setState({
          trips: [
            {
              id: tripId,
              name: 'Multi-Currency Trip',
              destination: 'World Tour',
              startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              budget: 5000,
              currency: 'CAD',
              status: 'in-progress',
              expenses: [
                {
                  id: 'exp-1',
                  category: 'food',
                  amount: 100,
                  currency: 'USD',
                  date: new Date().toISOString(),
                  description: 'Dinner in USA',
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'exp-2',
                  category: 'accommodation',
                  amount: 200,
                  currency: 'CAD',
                  date: new Date().toISOString(),
                  description: 'Hotel in Canada',
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'exp-3',
                  category: 'shopping',
                  amount: 1000,
                  currency: 'BDT',
                  date: new Date().toISOString(),
                  description: 'Shopping in Bangladesh',
                  createdAt: new Date().toISOString(),
                },
              ],
              budgetBreakdown: {},
              createdAt: new Date().toISOString(),
            },
          ],
        });
      });

      const { result } = renderHook(() => useTrips());
      const totalSpent = result.current.getTotalSpent(tripId);

      // 100 USD -> 100/0.71 = ~140.85 CAD
      // 200 CAD -> 200 CAD
      // 1000 BDT -> 1000/87 = ~11.49 CAD
      // Total: ~352.34 CAD
      const expectedTotal = 100 / 0.71 + 200 + 1000 / 87;
      expect(totalSpent).toBeCloseTo(expectedTotal, 2);
    });

    it('converts budget to CAD when calculating remaining budget', () => {
      const tripId = 'trip-usd-budget';
      act(() => {
        useTrips.setState({
          trips: [
            {
              id: tripId,
              name: 'USD Budget Trip',
              destination: 'USA',
              startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              budget: 1000,
              currency: 'USD',
              status: 'in-progress',
              expenses: [
                {
                  id: 'exp-1',
                  category: 'food',
                  amount: 100,
                  currency: 'CAD',
                  date: new Date().toISOString(),
                  description: 'Food',
                  createdAt: new Date().toISOString(),
                },
              ],
              budgetBreakdown: {},
              createdAt: new Date().toISOString(),
            },
          ],
        });
      });

      const { result } = renderHook(() => useTrips());
      const remaining = result.current.getBudgetRemaining(tripId);

      // Budget: 1000 USD -> 1000/0.71 = ~1408.45 CAD
      // Spent: 100 CAD
      // Remaining: ~1308.45 CAD
      const expectedRemaining = 1000 / 0.71 - 100;
      expect(remaining).toBeCloseTo(expectedRemaining, 2);
    });

    it('converts expenses to CAD when calculating spent by category', () => {
      const tripId = 'trip-category';
      act(() => {
        useTrips.setState({
          trips: [
            {
              id: tripId,
              name: 'Category Test',
              destination: 'Everywhere',
              startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              budget: 5000,
              currency: 'CAD',
              status: 'in-progress',
              expenses: [
                {
                  id: 'exp-1',
                  category: 'food',
                  amount: 50,
                  currency: 'USD',
                  date: new Date().toISOString(),
                  description: 'Breakfast',
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'exp-2',
                  category: 'food',
                  amount: 100,
                  currency: 'CAD',
                  date: new Date().toISOString(),
                  description: 'Lunch',
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'exp-3',
                  category: 'accommodation',
                  amount: 200,
                  currency: 'USD',
                  date: new Date().toISOString(),
                  description: 'Hotel',
                  createdAt: new Date().toISOString(),
                },
              ],
              budgetBreakdown: {},
              createdAt: new Date().toISOString(),
            },
          ],
        });
      });

      const { result } = renderHook(() => useTrips());
      const foodSpent = result.current.getSpentByCategory(tripId, 'food');

      // 50 USD -> 50/0.71 = ~70.42 CAD
      // 100 CAD -> 100 CAD
      // Total food: ~170.42 CAD
      const expectedFood = 50 / 0.71 + 100;
      expect(foodSpent).toBeCloseTo(expectedFood, 2);
    });

    it('converts total spent to CAD when calculating average daily spend', () => {
      const tripId = 'trip-daily';
      const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(Date.now()).toISOString();

      act(() => {
        useTrips.setState({
          trips: [
            {
              id: tripId,
              name: 'Daily Spend Test',
              destination: 'Test Land',
              startDate,
              endDate,
              budget: 5000,
              currency: 'CAD',
              status: 'completed',
              expenses: [
                {
                  id: 'exp-1',
                  category: 'food',
                  amount: 710,
                  currency: 'USD',
                  date: new Date().toISOString(),
                  description: 'Total food',
                  createdAt: new Date().toISOString(),
                },
              ],
              budgetBreakdown: {},
              createdAt: new Date().toISOString(),
            },
          ],
        });
      });

      const { result } = renderHook(() => useTrips());
      const avgDaily = result.current.getAverageDailySpend(tripId);

      // 710 USD -> 710/0.71 = 1000 CAD
      // 10 days (from startDate to endDate)
      // Average: 1000/10 = 100 CAD/day
      const totalSpentInCAD = 710 / 0.71;
      const days = 10;
      const expectedAvg = totalSpentInCAD / days;
      expect(avgDaily).toBeCloseTo(expectedAvg, 2);
    });
  });
});
