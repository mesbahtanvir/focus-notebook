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

  it('prevents adding expenses while trip is in planning state', async () => {
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

    await expect(
      result.current.addExpense(tripId, {
        category: 'food',
        amount: 50,
        currency: 'USD',
        date: new Date().toISOString(),
        description: 'Dinner',
      })
    ).rejects.toThrow('Cannot add expenses to a planning trip');
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
});
