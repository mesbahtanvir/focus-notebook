import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export type RelationshipType = 'close-friend' | 'friend' | 'acquaintance' | 'family' | 'colleague' | 'mentor';
export type EnergyLevel = 'energizing' | 'neutral' | 'draining';
export type InteractionFrequency = 'daily' | 'weekly' | 'monthly' | 'rarely';

export interface Friend {
  id: string;
  name: string;
  relationshipType: RelationshipType;
  energyLevel: EnergyLevel; // How you feel after interactions
  interactionFrequency: InteractionFrequency;
  lastInteraction?: string; // ISO date
  
  // Reflection fields
  positiveTraits: string[]; // What you appreciate
  concerns: string[]; // Red flags or concerns
  sharedValues: string[]; // Common values/interests
  notes: string; // General observations and reflections
  
  // Priority & Growth
  priority: 'high' | 'medium' | 'low'; // Who to invest time in
  growthAlignment: number; // 1-10: How much they support your growth
  trustLevel: number; // 1-10: How much you trust them
  
  // Metadata
  createdAt: string;
  updatedAt?: number;
  tags?: string[];
}

type State = {
  friends: Friend[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;
  subscribe: (userId: string) => void;
  add: (friend: Omit<Friend, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, updates: Partial<Omit<Friend, 'id'>>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  getFriendsByPriority: (priority: 'high' | 'medium' | 'low') => Friend[];
  getFriendsByEnergy: (energy: EnergyLevel) => Friend[];
  getHighGrowthFriends: () => Friend[]; // Growth alignment >= 7
};

export const useFriends = create<State>((set, get) => ({
  friends: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    const friendsQuery = query(
      collection(db, `users/${userId}/friends`),
      orderBy('createdAt', 'desc')
    );

    const unsub = subscribeCol<Friend>(friendsQuery, (friends, meta) => {
      set({
        friends,
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      });
    });

    set({ unsubscribe: unsub });
  },

  add: async (friendData) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const friendId = Date.now().toString();
    const newFriend: Friend = {
      ...friendData,
      id: friendId,
      createdAt: new Date().toISOString(),
    };

    await createAt(`users/${userId}/friends/${friendId}`, newFriend);
    return friendId;
  },

  update: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateAt(`users/${userId}/friends/${id}`, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  delete: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await deleteAt(`users/${userId}/friends/${id}`);
  },

  getFriendsByPriority: (priority) => {
    return get().friends.filter(f => f.priority === priority);
  },

  getFriendsByEnergy: (energy) => {
    return get().friends.filter(f => f.energyLevel === energy);
  },

  getHighGrowthFriends: () => {
    return get().friends.filter(f => f.growthAlignment >= 7);
  },
}));
