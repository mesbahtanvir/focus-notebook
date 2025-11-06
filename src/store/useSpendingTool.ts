/**
 * Spending Tool Store (Zustand)
 * Manages state for Plaid-connected accounts, transactions, and insights
 */

import { create } from 'zustand';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import {
  Account,
  PlaidItem,
  PlaidTransaction,
  RecurringStream,
  MonthlyRollup,
  LLMAnalysis,
  ConnectionStatus,
  DashboardSummary,
  ItemStatus,
} from '@/types/spending-tool';
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// ============================================================================
// State Interface
// ============================================================================

interface SpendingToolState {
  // Data
  items: Record<string, PlaidItem>;
  accounts: Record<string, Account>;
  transactions: PlaidTransaction[];
  subscriptions: RecurringStream[];
  rollups: Record<string, MonthlyRollup>;
  insights: Record<string, LLMAnalysis>;

  // UI State
  loading: boolean;
  error: string | null;
  linkToken: string | null;
  linkLoading: boolean;

  // Filters
  selectedAccountId: string | null;
  dateRange: { start: string; end: string } | null;

  // Actions
  initialize: (uid: string) => Promise<void>;
  cleanup: () => void;

  // Plaid Link
  createLinkToken: (platform?: 'web' | 'ios' | 'android') => Promise<string>;
  exchangePublicToken: (publicToken: string) => Promise<void>;
  createRelinkToken: (itemId: string) => Promise<string>;
  markRelinking: (itemId: string) => Promise<void>;
  triggerSync: (itemId: string) => Promise<void>;

  // Data fetching
  fetchTransactions: (filters?: any) => Promise<void>;
  fetchRollup: (month: string) => Promise<void>;
  runInsights: (month: string, force?: boolean) => Promise<void>;

  // Subscription detection
  detectSubscriptions: () => Promise<void>;

  // Dashboard summary
  getDashboardSummary: () => DashboardSummary;
  getConnectionStatuses: () => ConnectionStatus[];

  // Filters
  setSelectedAccount: (accountId: string | null) => void;
  setDateRange: (start: string, end: string) => void;
}

// ============================================================================
// Create Store
// ============================================================================

export const useSpendingTool = create<SpendingToolState>((set, get) => ({
  // Initial state
  items: {},
  accounts: {},
  transactions: [],
  subscriptions: [],
  rollups: {},
  insights: {},
  loading: false,
  error: null,
  linkToken: null,
  linkLoading: false,
  selectedAccountId: null,
  dateRange: null,

  // ============================================================================
  // Initialize
  // ============================================================================

  initialize: async (uid: string) => {
    set({ loading: true, error: null });

    try {
      // Set up real-time listeners
      const unsubscribers: Array<() => void> = [];

      // Listen to items
      const itemsQuery = query(
        collection(db, 'plaidItems'),
        where('uid', '==', uid)
      );
      const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
        const items: Record<string, PlaidItem> = {};
        snapshot.forEach((doc) => {
          items[doc.id] = { ...doc.data() } as PlaidItem;
        });
        set({ items });
      });
      unsubscribers.push(unsubItems);

      // Listen to accounts
      const accountsQuery = query(
        collection(db, 'accounts'),
        where('uid', '==', uid)
      );
      const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
        const accounts: Record<string, Account> = {};
        snapshot.forEach((doc) => {
          accounts[doc.id] = { ...doc.data() } as Account;
        });
        set({ accounts });
      });
      unsubscribers.push(unsubAccounts);

      // Listen to transactions (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

      const txnsQuery = query(
        collection(db, 'transactions'),
        where('uid', '==', uid),
        where('postedAt', '>=', ninetyDaysAgoStr),
        orderBy('postedAt', 'desc'),
        firestoreLimit(500)
      );
      const unsubTxns = onSnapshot(txnsQuery, (snapshot) => {
        const transactions: PlaidTransaction[] = [];
        snapshot.forEach((doc) => {
          transactions.push({ ...doc.data(), id: doc.id } as PlaidTransaction);
        });
        set({ transactions });
      });
      unsubscribers.push(unsubTxns);

      // Listen to subscriptions
      const subsQuery = query(
        collection(db, 'recurringStreams'),
        where('uid', '==', uid),
        where('active', '==', true)
      );
      const unsubSubs = onSnapshot(subsQuery, (snapshot) => {
        const subscriptions: RecurringStream[] = [];
        snapshot.forEach((doc) => {
          subscriptions.push({ ...doc.data(), id: doc.id } as RecurringStream);
        });
        set({ subscriptions });
      });
      unsubscribers.push(unsubSubs);

      // Store unsubscribers for cleanup
      (set as any)._unsubscribers = unsubscribers;

      set({ loading: false });
    } catch (error: any) {
      console.error('Error initializing spending tool:', error);
      set({ error: error.message, loading: false });
    }
  },

  cleanup: () => {
    const unsubscribers = (get as any)._unsubscribers || [];
    unsubscribers.forEach((unsub: () => void) => unsub());
    set({
      items: {},
      accounts: {},
      transactions: [],
      subscriptions: [],
      rollups: {},
      insights: {},
      loading: false,
      error: null,
    });
  },

  // ============================================================================
  // Plaid Link Actions
  // ============================================================================

  createLinkToken: async (platform = 'web') => {
    set({ linkLoading: true, error: null });

    try {
      const createLinkTokenFn = httpsCallable(functions, 'createLinkToken');
      const result = await createLinkTokenFn({ platform }) as any;
      const linkToken = result.data.link_token;

      set({ linkToken, linkLoading: false });
      return linkToken;
    } catch (error: any) {
      console.error('Error creating link token:', error);
      set({ error: error.message, linkLoading: false });
      throw error;
    }
  },

  exchangePublicToken: async (publicToken: string) => {
    set({ loading: true, error: null });

    try {
      const exchangeFn = httpsCallable(functions, 'exchangePublicToken');
      await exchangeFn({ public_token: publicToken });

      set({ loading: false });
    } catch (error: any) {
      console.error('Error exchanging public token:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createRelinkToken: async (itemId: string) => {
    set({ linkLoading: true, error: null });

    try {
      const createRelinkFn = httpsCallable(functions, 'createRelinkToken');
      const result = await createRelinkFn({ itemId }) as any;
      const linkToken = result.data.link_token;

      set({ linkToken, linkLoading: false });
      return linkToken;
    } catch (error: any) {
      console.error('Error creating relink token:', error);
      set({ error: error.message, linkLoading: false });
      throw error;
    }
  },

  markRelinking: async (itemId: string) => {
    set({ loading: true, error: null });

    try {
      const markRelinkingFn = httpsCallable(functions, 'markRelinking');
      await markRelinkingFn({ itemId });

      set({ loading: false });
    } catch (error: any) {
      console.error('Error marking relinking:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  triggerSync: async (itemId: string) => {
    set({ loading: true, error: null });

    try {
      const triggerSyncFn = httpsCallable(functions, 'triggerSync');
      await triggerSyncFn({ itemId });

      set({ loading: false });
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ============================================================================
  // Data Fetching
  // ============================================================================

  fetchTransactions: async (filters = {}) => {
    // Transactions are already being synced via real-time listener
    // This method can be used for additional filtering if needed
  },

  fetchRollup: async (month: string) => {
    set({ loading: true, error: null });

    try {
      // TODO: Implement API call to fetch rollup
      // For now, rollups are computed server-side and can be fetched via Firestore

      set({ loading: false });
    } catch (error: any) {
      console.error('Error fetching rollup:', error);
      set({ error: error.message, loading: false });
    }
  },

  runInsights: async (month: string, force = false) => {
    set({ loading: true, error: null });

    try {
      // TODO: Implement Cloud Function call
      // const runInsightsFn = httpsCallable(functions, 'runInsights');
      // await runInsightsFn({ month, force });

      set({ loading: false });
    } catch (error: any) {
      console.error('Error running insights:', error);
      set({ error: error.message, loading: false });
    }
  },

  detectSubscriptions: async () => {
    set({ loading: true, error: null });

    try {
      // TODO: Implement Cloud Function call
      // const detectSubsFn = httpsCallable(functions, 'detectSubscriptions');
      // await detectSubsFn();

      set({ loading: false });
    } catch (error: any) {
      console.error('Error detecting subscriptions:', error);
      set({ error: error.message, loading: false });
    }
  },

  // ============================================================================
  // Dashboard Summary
  // ============================================================================

  getDashboardSummary: () => {
    const { accounts, transactions, subscriptions, items } = get();

    const accountList = Object.values(accounts);
    const totalBalance = accountList.reduce(
      (sum, acc) => sum + (acc.balances.current || 0),
      0
    );

    // Calculate monthly spending (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const recentTxns = transactions.filter(
      (txn) => txn.postedAt >= thirtyDaysAgoStr && !txn.pending
    );

    const monthlySpending = recentTxns
      .filter((txn) => txn.amount > 0)
      .reduce((sum, txn) => sum + txn.amount, 0);

    const monthlyIncome = recentTxns
      .filter((txn) => txn.amount < 0)
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

    const subscriptionTotal = subscriptions.reduce(
      (sum, sub) => sum + sub.meanAmount,
      0
    );

    const needsAttention = Object.values(items).filter(
      (item) =>
        item.status === 'needs_relink' || item.status === 'pending_expiration'
    ).length;

    return {
      totalBalance,
      currency: 'USD', // TODO: Get from user settings
      monthlySpending,
      monthlyIncome,
      activeSubscriptions: subscriptions.length,
      subscriptionTotal,
      connectedAccounts: accountList.length,
      needsAttention,
    };
  },

  getConnectionStatuses: () => {
    const { items, accounts } = get();

    return Object.entries(items).map(([itemId, item]) => {
      const itemAccounts = Object.values(accounts).filter(
        (acc) => acc.itemId === itemId
      );

      return {
        itemId,
        institutionName: item.institutionName || 'Unknown Institution',
        status: item.status,
        error: item.error,
        lastSyncAt: item.lastSyncAt,
        accountCount: itemAccounts.length,
      };
    });
  },

  // ============================================================================
  // Filters
  // ============================================================================

  setSelectedAccount: (accountId) => {
    set({ selectedAccountId: accountId });
  },

  setDateRange: (start, end) => {
    set({ dateRange: { start, end } });
  },
}));
