import { createEntityStore, BaseEntity, BaseState, BaseActions } from './createEntityStore';

export type SubscriptionCategory = 'entertainment' | 'productivity' | 'health' | 'utilities' | 'education' | 'other';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type SubscriptionStatus = 'active' | 'cancelled' | 'paused';

export interface Subscription extends BaseEntity {
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
}

// Helper to calculate monthly cost
const getMonthlyCost = (sub: Subscription): number => {
  switch (sub.billingCycle) {
    case 'monthly': return sub.cost;
    case 'quarterly': return sub.cost / 3;
    case 'yearly': return sub.cost / 12;
    case 'one-time': return 0;
    default: return 0;
  }
};

// Helper to calculate yearly cost
const getYearlyCost = (sub: Subscription): number => {
  switch (sub.billingCycle) {
    case 'monthly': return sub.cost * 12;
    case 'quarterly': return sub.cost * 4;
    case 'yearly': return sub.cost;
    case 'one-time': return sub.cost;
    default: return 0;
  }
};

// Extra actions specific to subscriptions
interface SubscriptionExtraActions {
  subscriptions: Subscription[];
  // Backward compatible methods (legacy signatures with userId)
  addSubscription: (userId: string, subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSubscription: (userId: string, id: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSubscription: (userId: string, id: string) => Promise<void>;
  // Utility methods
  getSubscription: (id: string) => Subscription | undefined;
  getActiveSubscriptions: () => Subscription[];
  getTotalMonthlyCost: () => number;
  getTotalYearlyCost: () => number;
  getCostByCategory: (category: SubscriptionCategory) => number;
  getUpcomingBillings: (days: number) => Subscription[];
  getMostExpensive: () => Subscription | undefined;
}

export const useSubscriptions = createEntityStore<Subscription, Omit<Subscription, 'id' | 'createdAt'>, SubscriptionExtraActions>(
  {
    collectionName: 'subscriptions',
  },
  (set, get) => ({
    // Backward compatibility
    get subscriptions() {
      return get().items;
    },

    // Backward compatible methods (legacy signatures - userId is ignored)
    addSubscription: async (_userId: string, subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await get().add(subscription);
    },

    updateSubscription: async (_userId: string, id: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => {
      await get().update(id, updates);
    },

    deleteSubscription: async (_userId: string, id: string) => {
      await get().delete(id);
    },

    getSubscription: (id: string) => {
      return get().items.find(s => s.id === id);
    },

    getActiveSubscriptions: () => {
      return get().items.filter(s => s.status === 'active');
    },

    getTotalMonthlyCost: () => {
      return get().items
        .filter(s => s.status === 'active')
        .reduce((total, sub) => total + getMonthlyCost(sub), 0);
    },

    getTotalYearlyCost: () => {
      return get().items
        .filter(s => s.status === 'active')
        .reduce((total, sub) => total + getYearlyCost(sub), 0);
    },

    getCostByCategory: (category: SubscriptionCategory) => {
      return get().items
        .filter(s => s.status === 'active' && s.category === category)
        .reduce((total, sub) => total + getMonthlyCost(sub), 0);
    },

    getUpcomingBillings: (days: number) => {
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);

      return get().items
        .filter(s => {
          if (s.status !== 'active') return false;
          const billingDate = new Date(s.nextBillingDate);
          return billingDate >= now && billingDate <= futureDate;
        })
        .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime());
    },

    getMostExpensive: () => {
      const active = get().items.filter(s => s.status === 'active');
      if (active.length === 0) return undefined;

      return active.reduce((max, sub) => {
        const subMonthlyCost = getMonthlyCost(sub);
        const maxMonthlyCost = getMonthlyCost(max);
        return subMonthlyCost > maxMonthlyCost ? sub : max;
      });
    },
  })
);
