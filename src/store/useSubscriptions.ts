import { createEntityStore, BaseEntity } from './createEntityStore';
import { auth } from '@/lib/firebaseClient';

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

export const useSubscriptions = createEntityStore<Subscription>(
  {
    collectionName: 'subscriptions',
  },
  (set, get) => ({
    // Backward compatibility
    get subscriptions() {
      return get().items;
    },

    // Override add to accept userId parameter for backward compatibility
    add: async (userIdOrData: string | Omit<Subscription, 'id' | 'createdAt'>, subscriptionData?: Omit<Subscription, 'id' | 'createdAt'>) => {
      // Handle both old API (userId, data) and new API (data only)
      const data = typeof userIdOrData === 'string' ? subscriptionData! : userIdOrData;
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newSubscription: Subscription = {
        ...data,
        id,
        createdAt: now,
      } as Subscription;

      const { createAt } = await import('@/lib/data/gateway');
      await createAt(`users/${userId}/subscriptions/${id}`, newSubscription);
      return id;
    },

    // Override update/delete for userId parameter backward compatibility
    update: async (userIdOrId: string, idOrUpdates: string | Partial<Subscription>, updates?: Partial<Subscription>) => {
      const actualId = updates ? idOrUpdates as string : userIdOrId;
      const actualUpdates = updates || idOrUpdates as Partial<Subscription>;

      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const { updateAt } = await import('@/lib/data/gateway');
      await updateAt(`users/${userId}/subscriptions/${actualId}`, {
        ...actualUpdates,
        updatedAt: Date.now(),
      });
    },

    delete: async (userIdOrId: string, id?: string) => {
      const actualId = id || userIdOrId;
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const { deleteAt } = await import('@/lib/data/gateway');
      await deleteAt(`users/${userId}/subscriptions/${actualId}`);
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
