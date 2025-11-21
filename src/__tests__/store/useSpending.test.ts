import { renderHook, act } from '@testing-library/react';
import { useSpending, BankAccount, Transaction, SpendingInsight } from '@/store/useSpending';

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

const { createAt: mockCreateAt, updateAt: mockUpdateAt, deleteAt: mockDeleteAt } = require('@/lib/data/gateway') as {
  createAt: jest.Mock;
  updateAt: jest.Mock;
  deleteAt: jest.Mock;
};

const { subscribeCol: mockSubscribeCol } = require('@/lib/data/subscribe') as {
  subscribeCol: jest.Mock;
};

const originalCrypto = global.crypto;
const randomUUIDMock = jest.fn(() => 'test-uuid');

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
  useSpending.setState({
    accounts: [],
    transactions: [],
    insights: [],
    isLoading: true,
    fromCache: false,
    hasPendingWrites: false,
    unsubscribe: null,
  });
};

describe('useSpending store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    randomUUIDMock.mockReturnValue('test-uuid');
    resetStore();
  });

  describe('subscribe', () => {
    it('should initialize subscriptions', () => {
      const { result } = renderHook(() => useSpending());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(mockSubscribeCol).toHaveBeenCalledTimes(3); // accounts, transactions, insights
    });

    it('should unsubscribe from previous subscription', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribeCol.mockReturnValue(unsubscribeMock);

      const { result } = renderHook(() => useSpending());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        result.current.subscribe('test-user-id');
      });

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should update accounts from subscription callback', () => {
      const testAccounts: BankAccount[] = [
        {
          id: 'account-1',
          name: 'Checking',
          accountType: 'checking',
          institution: 'Test Bank',
          currency: 'USD',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      let accountCallback: ((accounts: BankAccount[], meta: any) => void) | null = null;
      mockSubscribeCol.mockImplementation((query, callback) => {
        const queryStr = JSON.stringify(query);
        if (queryStr.includes('bankAccounts')) {
          accountCallback = callback;
        }
        return jest.fn();
      });

      const { result } = renderHook(() => useSpending());

      act(() => {
        result.current.subscribe('test-user-id');
      });

      act(() => {
        accountCallback?.(testAccounts, { fromCache: false, hasPendingWrites: false });
      });

      expect(result.current.accounts).toEqual(testAccounts);
    });
  });

  describe('addAccount', () => {
    it('should add a new account', async () => {
      const { result } = renderHook(() => useSpending());

      await act(async () => {
        await result.current.addAccount({
          name: 'Savings Account',
          accountType: 'savings',
          institution: 'Test Bank',
          currency: 'USD',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        'users/test-user-id/bankAccounts/test-uuid',
        expect.objectContaining({
          name: 'Savings Account',
          accountType: 'savings',
          institution: 'Test Bank',
          currency: 'USD',
          createdAt: expect.any(String),
        })
      );
    });

    it('should return account ID', async () => {
      const { result } = renderHook(() => useSpending());

      let accountId: string = '';
      await act(async () => {
        accountId = await result.current.addAccount({
          name: 'Test Account',
          accountType: 'checking',
          institution: 'Bank',
          currency: 'USD',
        });
      });

      expect(accountId).toBe('test-uuid');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useSpending());

      await expect(
        act(async () => {
          await result.current.addAccount({
            name: 'Test',
            accountType: 'checking',
            institution: 'Bank',
            currency: 'USD',
          });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('updateAccount', () => {
    it('should update an account', async () => {
      const { result } = renderHook(() => useSpending());

      await act(async () => {
        await result.current.updateAccount('account-1', {
          name: 'Updated Account Name',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/bankAccounts/account-1', {
        name: 'Updated Account Name',
      });
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useSpending());

      await expect(
        act(async () => {
          await result.current.updateAccount('account-1', { name: 'New Name' });
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('deleteAccount', () => {
    it('should delete an account', async () => {
      const { result } = renderHook(() => useSpending());

      await act(async () => {
        await result.current.deleteAccount('account-1');
      });

      expect(mockDeleteAt).toHaveBeenCalledWith('users/test-user-id/bankAccounts/account-1');
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useSpending());

      await expect(
        act(async () => {
          await result.current.deleteAccount('account-1');
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('addTransaction', () => {
    it('should add a new transaction', async () => {
      const { result } = renderHook(() => useSpending());

      await act(async () => {
        await result.current.addTransaction({
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Grocery shopping',
          merchant: 'Whole Foods',
          amount: -125.50,
          category: 'groceries',
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        'users/test-user-id/transactions/test-uuid',
        expect.objectContaining({
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Grocery shopping',
          merchant: 'Whole Foods',
          amount: -125.50,
          category: 'groceries',
          createdAt: expect.any(String),
        })
      );
    });

    it('should return transaction ID', async () => {
      const { result } = renderHook(() => useSpending());

      let transactionId: string = '';
      await act(async () => {
        transactionId = await result.current.addTransaction({
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Test',
          merchant: 'Test',
          amount: -50,
          category: 'other',
        });
      });

      expect(transactionId).toBe('test-uuid');
    });
  });

  describe('addTransactions', () => {
    it('should add multiple transactions', async () => {
      const transactions = [
        {
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Transaction 1',
          merchant: 'Merchant 1',
          amount: -100,
          category: 'groceries' as const,
        },
        {
          accountId: 'account-1',
          date: '2024-01-16',
          description: 'Transaction 2',
          merchant: 'Merchant 2',
          amount: -50,
          category: 'dining' as const,
        },
      ];

      randomUUIDMock
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');

      const { result } = renderHook(() => useSpending());

      let ids: string[] = [];
      await act(async () => {
        ids = await result.current.addTransactions(transactions);
      });

      expect(mockCreateAt).toHaveBeenCalledTimes(2);
      expect(ids).toEqual(['uuid-1', 'uuid-2']);
    });

    it('should throw error if not authenticated', async () => {
      const { auth } = require('@/lib/firebaseClient');
      auth.currentUser = null;

      const { result } = renderHook(() => useSpending());

      await expect(
        act(async () => {
          await result.current.addTransactions([]);
        })
      ).rejects.toThrow('Not authenticated');

      auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction', async () => {
      const { result } = renderHook(() => useSpending());

      await act(async () => {
        await result.current.updateTransaction('transaction-1', {
          category: 'dining',
          notes: 'Updated notes',
        });
      });

      expect(mockUpdateAt).toHaveBeenCalledWith('users/test-user-id/transactions/transaction-1', {
        category: 'dining',
        notes: 'Updated notes',
      });
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction', async () => {
      const { result } = renderHook(() => useSpending());

      await act(async () => {
        await result.current.deleteTransaction('transaction-1');
      });

      expect(mockDeleteAt).toHaveBeenCalledWith('users/test-user-id/transactions/transaction-1');
    });
  });

  describe('saveInsight', () => {
    it('should save a spending insight', async () => {
      const { result } = renderHook(() => useSpending());

      await act(async () => {
        await result.current.saveInsight({
          month: '2024-01',
          accountIds: ['account-1'],
          totalSpent: 1500,
          categoryBreakdown: {
            groceries: 500,
            dining: 300,
            transportation: 200,
            entertainment: 150,
            shopping: 200,
            utilities: 100,
            health: 50,
            travel: 0,
            subscriptions: 0,
            other: 0,
          },
          topMerchants: [
            { merchant: 'Whole Foods', amount: 500, count: 10 },
          ],
        });
      });

      expect(mockCreateAt).toHaveBeenCalledWith(
        'users/test-user-id/spendingInsights/test-uuid',
        expect.objectContaining({
          month: '2024-01',
          totalSpent: 1500,
          createdAt: expect.any(String),
        })
      );
    });

    it('should return insight ID', async () => {
      const { result } = renderHook(() => useSpending());

      let insightId: string = '';
      await act(async () => {
        insightId = await result.current.saveInsight({
          month: '2024-01',
          accountIds: [],
          totalSpent: 0,
          categoryBreakdown: {
            groceries: 0,
            dining: 0,
            transportation: 0,
            entertainment: 0,
            shopping: 0,
            utilities: 0,
            health: 0,
            travel: 0,
            subscriptions: 0,
            other: 0,
          },
          topMerchants: [],
        });
      });

      expect(insightId).toBe('test-uuid');
    });
  });

  describe('getInsight', () => {
    it('should find insight by month', () => {
      const insights: SpendingInsight[] = [
        {
          id: 'insight-1',
          month: '2024-01',
          accountIds: ['account-1'],
          totalSpent: 1500,
          categoryBreakdown: {} as any,
          topMerchants: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'insight-2',
          month: '2024-02',
          accountIds: ['account-1'],
          totalSpent: 1200,
          categoryBreakdown: {} as any,
          topMerchants: [],
          createdAt: '2024-02-01T00:00:00.000Z',
        },
      ];

      useSpending.setState({ insights });
      const { result } = renderHook(() => useSpending());

      const insight = result.current.getInsight('2024-01');
      expect(insight?.id).toBe('insight-1');
    });

    it('should return undefined for non-existent month', () => {
      useSpending.setState({ insights: [] });
      const { result } = renderHook(() => useSpending());

      const insight = result.current.getInsight('2024-01');
      expect(insight).toBeUndefined();
    });
  });

  describe('getTransactionsByAccount', () => {
    it('should filter transactions by account ID', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Transaction 1',
          merchant: 'Merchant 1',
          amount: -100,
          category: 'groceries',
          createdAt: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 't2',
          accountId: 'account-2',
          date: '2024-01-16',
          description: 'Transaction 2',
          merchant: 'Merchant 2',
          amount: -50,
          category: 'dining',
          createdAt: '2024-01-16T00:00:00.000Z',
        },
        {
          id: 't3',
          accountId: 'account-1',
          date: '2024-01-17',
          description: 'Transaction 3',
          merchant: 'Merchant 3',
          amount: -75,
          category: 'shopping',
          createdAt: '2024-01-17T00:00:00.000Z',
        },
      ];

      useSpending.setState({ transactions });
      const { result } = renderHook(() => useSpending());

      const accountTransactions = result.current.getTransactionsByAccount('account-1');
      expect(accountTransactions).toHaveLength(2);
      expect(accountTransactions[0].id).toBe('t1');
      expect(accountTransactions[1].id).toBe('t3');
    });
  });

  describe('getTransactionsByDateRange', () => {
    it('should filter transactions by date range', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          accountId: 'account-1',
          date: '2024-01-10',
          description: 'Transaction 1',
          merchant: 'Merchant 1',
          amount: -100,
          category: 'groceries',
          createdAt: '2024-01-10T00:00:00.000Z',
        },
        {
          id: 't2',
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Transaction 2',
          merchant: 'Merchant 2',
          amount: -50,
          category: 'dining',
          createdAt: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 't3',
          accountId: 'account-1',
          date: '2024-01-20',
          description: 'Transaction 3',
          merchant: 'Merchant 3',
          amount: -75,
          category: 'shopping',
          createdAt: '2024-01-20T00:00:00.000Z',
        },
      ];

      useSpending.setState({ transactions });
      const { result } = renderHook(() => useSpending());

      const rangeTransactions = result.current.getTransactionsByDateRange('2024-01-12', '2024-01-18');
      expect(rangeTransactions).toHaveLength(1);
      expect(rangeTransactions[0].id).toBe('t2');
    });

    it('should include start and end dates', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          accountId: 'account-1',
          date: '2024-01-10',
          description: 'Start',
          merchant: 'Merchant',
          amount: -100,
          category: 'groceries',
          createdAt: '2024-01-10T00:00:00.000Z',
        },
        {
          id: 't2',
          accountId: 'account-1',
          date: '2024-01-20',
          description: 'End',
          merchant: 'Merchant',
          amount: -50,
          category: 'dining',
          createdAt: '2024-01-20T00:00:00.000Z',
        },
      ];

      useSpending.setState({ transactions });
      const { result } = renderHook(() => useSpending());

      const rangeTransactions = result.current.getTransactionsByDateRange('2024-01-10', '2024-01-20');
      expect(rangeTransactions).toHaveLength(2);
    });
  });

  describe('getTransactionsByCategory', () => {
    it('should filter transactions by category', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Grocery 1',
          merchant: 'Store 1',
          amount: -100,
          category: 'groceries',
          createdAt: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 't2',
          accountId: 'account-1',
          date: '2024-01-16',
          description: 'Restaurant',
          merchant: 'Restaurant',
          amount: -50,
          category: 'dining',
          createdAt: '2024-01-16T00:00:00.000Z',
        },
        {
          id: 't3',
          accountId: 'account-1',
          date: '2024-01-17',
          description: 'Grocery 2',
          merchant: 'Store 2',
          amount: -75,
          category: 'groceries',
          createdAt: '2024-01-17T00:00:00.000Z',
        },
      ];

      useSpending.setState({ transactions });
      const { result } = renderHook(() => useSpending());

      const groceryTransactions = result.current.getTransactionsByCategory('groceries');
      expect(groceryTransactions).toHaveLength(2);
      expect(groceryTransactions[0].id).toBe('t1');
      expect(groceryTransactions[1].id).toBe('t3');
    });
  });

  describe('getTotalSpentByMonth', () => {
    it('should calculate total spent for a month', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Transaction 1',
          merchant: 'Merchant 1',
          amount: -100,
          category: 'groceries',
          createdAt: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 't2',
          accountId: 'account-1',
          date: '2024-01-20',
          description: 'Transaction 2',
          merchant: 'Merchant 2',
          amount: -50,
          category: 'dining',
          createdAt: '2024-01-20T00:00:00.000Z',
        },
        {
          id: 't3',
          accountId: 'account-1',
          date: '2024-02-05',
          description: 'Transaction 3',
          merchant: 'Merchant 3',
          amount: -75,
          category: 'shopping',
          createdAt: '2024-02-05T00:00:00.000Z',
        },
      ];

      useSpending.setState({ transactions });
      const { result } = renderHook(() => useSpending());

      const totalJan = result.current.getTotalSpentByMonth('2024-01');
      expect(totalJan).toBe(150);

      const totalFeb = result.current.getTotalSpentByMonth('2024-02');
      expect(totalFeb).toBe(75);
    });

    it('should handle positive amounts (income)', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Refund',
          merchant: 'Store',
          amount: 50,
          category: 'other',
          createdAt: '2024-01-15T00:00:00.000Z',
        },
      ];

      useSpending.setState({ transactions });
      const { result } = renderHook(() => useSpending());

      const total = result.current.getTotalSpentByMonth('2024-01');
      expect(total).toBe(50);
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should calculate category breakdown for date range', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          accountId: 'account-1',
          date: '2024-01-15',
          description: 'Grocery 1',
          merchant: 'Store 1',
          amount: -100,
          category: 'groceries',
          createdAt: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 't2',
          accountId: 'account-1',
          date: '2024-01-16',
          description: 'Grocery 2',
          merchant: 'Store 2',
          amount: -50,
          category: 'groceries',
          createdAt: '2024-01-16T00:00:00.000Z',
        },
        {
          id: 't3',
          accountId: 'account-1',
          date: '2024-01-17',
          description: 'Restaurant',
          merchant: 'Restaurant',
          amount: -75,
          category: 'dining',
          createdAt: '2024-01-17T00:00:00.000Z',
        },
      ];

      useSpending.setState({ transactions });
      const { result } = renderHook(() => useSpending());

      const breakdown = result.current.getCategoryBreakdown('2024-01-01', '2024-01-31');
      expect(breakdown.groceries).toBe(150);
      expect(breakdown.dining).toBe(75);
    });

    it('should handle empty transaction list', () => {
      useSpending.setState({ transactions: [] });
      const { result } = renderHook(() => useSpending());

      const breakdown = result.current.getCategoryBreakdown('2024-01-01', '2024-01-31');
      expect(breakdown).toEqual({});
    });
  });
});
