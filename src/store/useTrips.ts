import { create } from 'zustand';
import { createAt, deleteAt, updateAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';
import { collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import type { Unsubscribe } from 'firebase/firestore';

export type TripStatus = 'planning' | 'in-progress' | 'completed';
export type ExpenseCategory =
  | 'airfare'
  | 'accommodation'
  | 'food'
  | 'transportation'
  | 'activities'
  | 'shopping'
  | 'misc'
  | 'other';

export interface Expense {
  id: string;
  tripId?: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string;
  description: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: number;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  status: TripStatus;
  expenses: Expense[];
  budgetBreakdown?: Partial<Record<ExpenseCategory, number>>; // Planned budgets per category
  notes?: string;
  createdAt: string;
  updatedAt?: number;
}

interface TripsState {
  trips: Trip[];
  standaloneExpenses: Expense[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: Unsubscribe | null;
  expensesUnsubscribe: Unsubscribe | null;

  // Trip methods
  subscribe: (userId: string) => void;
  addTrip: (
    trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'expenses' | 'status'>
  ) => Promise<string>;
  updateTrip: (id: string, updates: Partial<Omit<Trip, 'id' | 'createdAt' | 'expenses'>>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  updateBudgetBreakdown: (
    id: string,
    budgetBreakdown: Partial<Record<ExpenseCategory, number>>
  ) => Promise<void>;

  // Expense methods (trip-specific)
  addExpense: (tripId: string, expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'tripId'>) => Promise<string>;
  updateExpense: (tripId: string, expenseId: string, updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'tripId'>>) => Promise<void>;
  deleteExpense: (tripId: string, expenseId: string) => Promise<void>;

  // Standalone expense methods
  addStandaloneExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'tripId'>) => Promise<string>;
  updateStandaloneExpense: (expenseId: string, updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'tripId'>>) => Promise<void>;
  deleteStandaloneExpense: (expenseId: string) => Promise<void>;

  // Utility methods
  getTrip: (id: string) => Trip | undefined;
  getTotalSpent: (tripId: string) => number;
  getBudgetRemaining: (tripId: string) => number;
  getSpentByCategory: (tripId: string, category: ExpenseCategory) => number;
  getAverageDailySpend: (tripId: string) => number;
  getAllExpenses: () => Expense[];
  getTotalPlannedBudget: (tripId: string) => number;
  getPlannedBudgetByCategory: (tripId: string, category: ExpenseCategory) => number;
}

export const useTrips = create<TripsState>((set, get) => ({
  trips: [],
  standaloneExpenses: [],
  isLoading: false,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,
  expensesUnsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    const currentExpensesUnsub = get().expensesUnsubscribe;
    if (currentExpensesUnsub) {
      currentExpensesUnsub();
    }

    set({ isLoading: true });

    // Subscribe to trips
    const tripsQuery = query(
      collection(db, `users/${userId}/trips`),
      orderBy('createdAt', 'desc')
    );

  const tripsUnsubscribe = subscribeCol<Trip>(
      tripsQuery,
      (data, metadata) => {
        set({
          trips: data.map((trip) => normalizeTrip(trip)),
          isLoading: false,
          fromCache: metadata.fromCache,
          hasPendingWrites: metadata.hasPendingWrites,
        });
      }
    );

    // Subscribe to standalone expenses
    const expensesQuery = query(
      collection(db, `users/${userId}/expenses`),
      orderBy('createdAt', 'desc')
    );

    const expensesUnsubscribe = subscribeCol<Expense>(
      expensesQuery,
      (data, metadata) => {
        set({
          standaloneExpenses: data,
        });
      }
    );

    set({
      unsubscribe: tripsUnsubscribe,
      expensesUnsubscribe
    });
  },

  addTrip: async (trip) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = determineStatus(trip.startDate, trip.endDate);

    const newTrip: Trip = {
      ...trip,
      id,
      status,
      expenses: [],
      budgetBreakdown: trip.budgetBreakdown ?? {},
      createdAt: now,
    };

    const userId = requireUserId();
    await createAt(`users/${userId}/trips/${id}`, newTrip);
    return id;
  },

  updateTrip: async (id, updates) => {
    const userId = requireUserId();
    const status =
      updates.startDate || updates.endDate
        ? determineStatus(updates.startDate ?? get().getTrip(id)?.startDate, updates.endDate ?? get().getTrip(id)?.endDate)
        : undefined;

    await updateAt(`users/${userId}/trips/${id}`, {
      ...updates,
      ...(status ? { status } : {}),
      updatedAt: Date.now(),
    });
  },

  deleteTrip: async (id) => {
    const userId = requireUserId();
    await deleteAt(`users/${userId}/trips/${id}`);
  },

  updateBudgetBreakdown: async (id, budgetBreakdown) => {
    const userId = requireUserId();
    await updateAt(`users/${userId}/trips/${id}`, {
      budgetBreakdown,
      updatedAt: Date.now(),
    });
  },

  addExpense: async (tripId, expense) => {
    const trip = get().getTrip(tripId);
    if (!trip) throw new Error('Trip not found');
    if (trip.status === 'planning') {
      throw new Error('Cannot add expenses to a planning trip');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newExpense: Expense = {
      ...expense,
      id,
      tripId,
      createdAt: now,
    };

    const updatedExpenses = [...trip.expenses, newExpense];
    const userId = requireUserId();
    await updateAt(`users/${userId}/trips/${tripId}`, {
      expenses: updatedExpenses,
      updatedAt: Date.now(),
    });

    return id;
  },

  updateExpense: async (tripId, expenseId, updates) => {
    const trip = get().getTrip(tripId);
    if (!trip) throw new Error('Trip not found');

    const updatedExpenses = trip.expenses.map(exp =>
      exp.id === expenseId ? { ...exp, ...updates, updatedAt: Date.now() } : exp
    );

    const userId = requireUserId();
    await updateAt(`users/${userId}/trips/${tripId}`, {
      expenses: updatedExpenses,
      updatedAt: Date.now(),
    });
  },

  deleteExpense: async (tripId, expenseId) => {
    const trip = get().getTrip(tripId);
    if (!trip) throw new Error('Trip not found');

    const updatedExpenses = trip.expenses.filter(exp => exp.id !== expenseId);
    const userId = requireUserId();
    await updateAt(`users/${userId}/trips/${tripId}`, {
      expenses: updatedExpenses,
      updatedAt: Date.now(),
    });
  },

  addStandaloneExpense: async (expense) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newExpense: Expense = {
      ...expense,
      id,
      createdAt: now,
    };

    const userId = requireUserId();
    await createAt(`users/${userId}/expenses/${id}`, newExpense);
    return id;
  },

  updateStandaloneExpense: async (expenseId, updates) => {
    const userId = requireUserId();
    await updateAt(`users/${userId}/expenses/${expenseId}`, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  deleteStandaloneExpense: async (expenseId) => {
    const userId = requireUserId();
    await deleteAt(`users/${userId}/expenses/${expenseId}`);
  },

  getTrip: (id) => {
    return get().trips.find(t => t.id === id);
  },

  getTotalSpent: (tripId) => {
    const trip = get().getTrip(tripId);
    if (!trip) return 0;
    return trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  },

  getBudgetRemaining: (tripId) => {
    const trip = get().getTrip(tripId);
    if (!trip) return 0;
    const spent = get().getTotalSpent(tripId);
    return trip.budget - spent;
  },

  getSpentByCategory: (tripId, category) => {
    const trip = get().getTrip(tripId);
    if (!trip) return 0;
    return trip.expenses
      .filter(exp => exp.category === category)
      .reduce((sum, exp) => sum + exp.amount, 0);
  },

  getAverageDailySpend: (tripId) => {
    const trip = get().getTrip(tripId);
    if (!trip) return 0;

    const start = new Date(trip.startDate);
    const end = trip.status === 'completed' ? new Date(trip.endDate) : new Date();
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const totalSpent = get().getTotalSpent(tripId);
    return totalSpent / days;
  },

  getAllExpenses: () => {
    const tripExpenses = get().trips.flatMap(trip => trip.expenses);
    const standalone = get().standaloneExpenses;
    return [...tripExpenses, ...standalone];
  },

  getTotalPlannedBudget: (tripId) => {
    const trip = get().getTrip(tripId);
    if (!trip || !trip.budgetBreakdown) return 0;
    return Object.values(trip.budgetBreakdown).reduce((sum, amount) => sum + (amount || 0), 0);
  },

  getPlannedBudgetByCategory: (tripId, category) => {
    const trip = get().getTrip(tripId);
    if (!trip || !trip.budgetBreakdown) return 0;
    return trip.budgetBreakdown[category] || 0;
  },
}));

function requireUserId(): string {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

function determineStatus(startDate?: string, endDate?: string): TripStatus {
  if (!startDate && !endDate) {
    return 'planning';
  }

  const now = new Date();
  const start = startDate ? new Date(startDate) : now;
  const end = endDate ? new Date(endDate) : start;

  if (now < start) {
    return 'planning';
  }

  if (now > end) {
    return 'completed';
  }

  return 'in-progress';
}

function normalizeTrip(trip: Trip): Trip {
  return {
    ...trip,
    status: determineStatus(trip.startDate, trip.endDate),
    expenses: Array.isArray(trip.expenses) ? trip.expenses : [],
    budgetBreakdown: trip.budgetBreakdown ?? {},
  };
}
