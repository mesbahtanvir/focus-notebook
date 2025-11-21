import { create } from 'zustand';
import { createAt, deleteAt, updateAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { Unsubscribe } from 'firebase/firestore';

export type SubscriptionCategory = 'entertainment' | 'productivity' | 'health' | 'utilities' | 'education' | 'other';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type SubscriptionStatus = 'active' | 'cancelled' | 'paused';

export interface Subscription {
  id: string;
  name: string;
  category: SubscriptionCategory;
  cost: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  startDate: string;
  endDate?: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: number;
}

interface SubscriptionsState {
  subscriptions: Subscription[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: Unsubscribe | null;

  // CRUD methods
  subscribe: (userId: string) => void;
  add: (userId: string, subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (userId: string, id: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => Promise<void>;
  delete: (userId: string, id: string) => Promise<void>;

  // Utility methods
  getSubscription: (id: string) => Subscription | undefined;
  getActiveSubscriptions: () => Subscription[];
  getTotalMonthlyCost: () => number;
  getTotalYearlyCost: () => number;
  getCostByCategory: (category: SubscriptionCategory) => number;
  getUpcomingBillings: (days: number) => Subscription[];
  getMostExpensive: () => Subscription | undefined;
}

export const useSubscriptions = create<SubscriptionsState>((set, get) => ({
  subscriptions: [],
  isLoading: false,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    set({ isLoading: true });

    const subscriptionsQuery = query(
      collection(db, `users/${userId}/subscriptions`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = subscribeCol<Subscription>(
      subscriptionsQuery,
      (data, metadata) => {
        set({
          subscriptions: data,
          isLoading: false,
          fromCache: metadata.fromCache,
          hasPendingWrites: metadata.hasPendingWrites,
        });
      }
    );

    set({ unsubscribe });
  },

  add: async (userId, subscription) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newSubscription: Subscription = {
      ...subscription,
      id,
      createdAt: now,
    };

    await createAt(`users/${userId}/subscriptions/${id}`, newSubscription);
    return id;
  },

  update: async (userId, id, updates) => {
    await updateAt(`users/${userId}/subscriptions/${id}`, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  delete: async (userId, id) => {
    await deleteAt(`users/${userId}/subscriptions/${id}`);
  },

  getSubscription: (id) => {
    return get().subscriptions.find(s => s.id === id);
  },

  getActiveSubscriptions: () => {
    return get().subscriptions.filter(s => s.status === 'active');
  },

  getTotalMonthlyCost: () => {
    return get().subscriptions
      .filter(s => s.status === 'active')
      .reduce((total, sub) => {
        switch (sub.billingCycle) {
          case 'monthly':
            return total + sub.cost;
          case 'quarterly':
            return total + (sub.cost / 3);
          case 'yearly':
            return total + (sub.cost / 12);
          case 'one-time':
            return total;
          default:
            return total;
        }
      }, 0);
  },

  getTotalYearlyCost: () => {
    return get().subscriptions
      .filter(s => s.status === 'active')
      .reduce((total, sub) => {
        switch (sub.billingCycle) {
          case 'monthly':
            return total + (sub.cost * 12);
          case 'quarterly':
            return total + (sub.cost * 4);
          case 'yearly':
            return total + sub.cost;
          case 'one-time':
            return total + sub.cost;
          default:
            return total;
        }
      }, 0);
  },

  getCostByCategory: (category) => {
    return get().subscriptions
      .filter(s => s.status === 'active' && s.category === category)
      .reduce((total, sub) => {
        switch (sub.billingCycle) {
          case 'monthly':
            return total + sub.cost;
          case 'quarterly':
            return total + (sub.cost / 3);
          case 'yearly':
            return total + (sub.cost / 12);
          case 'one-time':
            return total;
          default:
            return total;
        }
      }, 0);
  },

  getUpcomingBillings: (days) => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    return get().subscriptions
      .filter(s => {
        if (s.status !== 'active') return false;
        const billingDate = new Date(s.nextBillingDate);
        return billingDate >= now && billingDate <= futureDate;
      })
      .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime());
  },

  getMostExpensive: () => {
    const active = get().getActiveSubscriptions();
    if (active.length === 0) return undefined;

    return active.reduce((max, sub) => {
      const subMonthlyCost = (() => {
        switch (sub.billingCycle) {
          case 'monthly': return sub.cost;
          case 'quarterly': return sub.cost / 3;
          case 'yearly': return sub.cost / 12;
          case 'one-time': return sub.cost;
          default: return 0;
        }
      })();

      const maxMonthlyCost = (() => {
        switch (max.billingCycle) {
          case 'monthly': return max.cost;
          case 'quarterly': return max.cost / 3;
          case 'yearly': return max.cost / 12;
          case 'one-time': return max.cost;
          default: return 0;
        }
      })();

      return subMonthlyCost > maxMonthlyCost ? sub : max;
    });
  },
}));
