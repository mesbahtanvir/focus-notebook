import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';
import type { TransactionCategory } from '@/types/transactions';
import type { TripLinkInfo, TripLinkSuggestion } from '@/types/spending-tool';

export interface BankAccount {
  id: string;
  name: string;
  accountType: 'checking' | 'savings' | 'credit';
  institution: string;
  lastFourDigits?: string;
  currency: string;
  createdAt: string;
  updatedAt?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO date string
  description: string;
  merchant: string;
  amount: number;
  category: TransactionCategory;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt?: number;
  source?: string; // 'csv-upload' or 'plaid'
  csvFileName?: string; // For CSV uploads, track which file this came from
  tripLinkStatus?: 'pending' | 'processing' | 'linked' | 'suggested' | 'skipped' | 'error';
  tripLinkError?: string;
  tripLink?: TripLinkInfo;
  tripLinkSuggestion?: TripLinkSuggestion;
}

export interface SpendingInsight {
  id: string;
  month: string; // YYYY-MM format
  accountIds: string[]; // Accounts included in this analysis
  totalSpent: number;
  categoryBreakdown: Record<TransactionCategory, number>;
  topMerchants: Array<{ merchant: string; amount: number; count: number }>;
  aiSummary?: string; // AI-generated summary of spending patterns
  recommendations?: string[]; // AI-generated recommendations
  createdAt: string;
  updatedAt?: number;
}

interface SpendingStore {
  accounts: BankAccount[];
  transactions: Transaction[];
  insights: SpendingInsight[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;

  // Subscriptions
  subscribe: (userId: string) => void;

  // Account management
  addAccount: (account: Omit<BankAccount, 'id' | 'createdAt'>) => Promise<string>;
  updateAccount: (id: string, updates: Partial<BankAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Transaction management
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<string>;
  addTransactions: (transactions: Array<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<string[]>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Insight management
  saveInsight: (insight: Omit<SpendingInsight, 'id' | 'createdAt'>) => Promise<string>;
  getInsight: (month: string) => SpendingInsight | undefined;

  // Helper methods
  getTransactionsByAccount: (accountId: string) => Transaction[];
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getTransactionsByCategory: (category: TransactionCategory) => Transaction[];
  getTotalSpentByMonth: (month: string) => number;
  getCategoryBreakdown: (startDate: string, endDate: string) => Record<TransactionCategory, number>;
}

export const useSpending = create<SpendingStore>((set, get) => ({
  accounts: [],
  transactions: [],
  insights: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    // Unsubscribe from previous subscription if any
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    // Subscribe to accounts
    const accountsQuery = query(
      collection(db, `users/${userId}/bankAccounts`),
      orderBy('createdAt', 'desc')
    );

    const unsubAccounts = subscribeCol<BankAccount>(accountsQuery, (accounts, meta) => {
      set({
        accounts,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
        isLoading: false,
      });
    });

    // Subscribe to transactions
    const transactionsQuery = query(
      collection(db, `users/${userId}/transactions`),
      orderBy('date', 'desc')
    );

    const unsubTransactions = subscribeCol<Transaction>(transactionsQuery, (transactions, meta) => {
      set({
        transactions,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
        isLoading: false,
      });
    });

    // Subscribe to insights
    const insightsQuery = query(
      collection(db, `users/${userId}/spendingInsights`),
      orderBy('month', 'desc')
    );

    const unsubInsights = subscribeCol<SpendingInsight>(insightsQuery, (insights, meta) => {
      set({
        insights,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
        isLoading: false,
      });
    });

    // Combined unsubscribe function
    const combinedUnsub = () => {
      unsubAccounts();
      unsubTransactions();
      unsubInsights();
    };

    set({ unsubscribe: combinedUnsub });
  },

  addAccount: async (account) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const id = crypto.randomUUID();
    await createAt(`users/${userId}/bankAccounts/${id}`, {
      ...account,
      createdAt: new Date().toISOString(),
    });

    return id;
  },

  updateAccount: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateAt(`users/${userId}/bankAccounts/${id}`, updates);
  },

  deleteAccount: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await deleteAt(`users/${userId}/bankAccounts/${id}`);
  },

  addTransaction: async (transaction) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const id = crypto.randomUUID();
    await createAt(`users/${userId}/transactions/${id}`, {
      ...transaction,
      createdAt: new Date().toISOString(),
    });

    return id;
  },

  addTransactions: async (transactions) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const ids: string[] = [];

    for (const transaction of transactions) {
      const id = crypto.randomUUID();
      await createAt(`users/${userId}/transactions/${id}`, {
        ...transaction,
        createdAt: new Date().toISOString(),
      });
      ids.push(id);
    }

    return ids;
  },

  updateTransaction: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateAt(`users/${userId}/transactions/${id}`, updates);
  },

  deleteTransaction: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await deleteAt(`users/${userId}/transactions/${id}`);
  },

  saveInsight: async (insight) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const id = crypto.randomUUID();
    await createAt(`users/${userId}/spendingInsights/${id}`, {
      ...insight,
      createdAt: new Date().toISOString(),
    });

    return id;
  },

  getInsight: (month) => {
    return get().insights.find(i => i.month === month);
  },

  getTransactionsByAccount: (accountId) => {
    return get().transactions.filter(t => t.accountId === accountId);
  },

  getTransactionsByDateRange: (startDate, endDate) => {
    return get().transactions.filter(t => {
      return t.date >= startDate && t.date <= endDate;
    });
  },

  getTransactionsByCategory: (category) => {
    return get().transactions.filter(t => t.category === category);
  },

  getTotalSpentByMonth: (month) => {
    const transactions = get().transactions.filter(t => t.date.startsWith(month));
    return transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  },

  getCategoryBreakdown: (startDate, endDate) => {
    const transactions = get().getTransactionsByDateRange(startDate, endDate);
    const breakdown: Record<string, number> = {};

    transactions.forEach(t => {
      if (!breakdown[t.category]) {
        breakdown[t.category] = 0;
      }
      breakdown[t.category] += Math.abs(t.amount);
    });

    return breakdown as Record<TransactionCategory, number>;
  },
}));
