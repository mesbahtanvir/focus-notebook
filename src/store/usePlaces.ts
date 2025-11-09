import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export type PlaceType = 'live' | 'visit' | 'short-term';

export interface Place {
  id: string;
  name: string;
  type: PlaceType; // 'live', 'visit', 'short-term'

  // AI-enriched fields
  country?: string;
  city?: string;
  description?: string;
  climate?: string;
  costOfLiving?: string; // e.g., "High", "Medium", "Low"
  safety?: string;
  culture?: string;
  bestTimeToVisit?: string;
  averageStayDuration?: string;
  pros?: string[];
  cons?: string[];
  links?: string[]; // travel guides, resources
  notes?: string;
  tags?: string[];
  comparisonScores?: {
    cost?: number; // 1-10
    weather?: number;
    safety?: number;
    culture?: number;
    infrastructure?: number;
    nature?: number;
    foodScene?: number;
  };

  aiEnriched?: boolean;
  createdAt: string;
  updatedAt?: number;
}

type State = {
  places: Place[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;

  subscribe: (userId: string) => void;
  add: (place: Omit<Place, 'id' | 'createdAt'>) => Promise<string>;
  update: (id: string, updates: Partial<Place>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  getByType: (type: PlaceType) => Place[];
  getByTag: (tag: string) => Place[];
};

export const usePlaces = create<State>((set, get) => ({
  places: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    const q = query(
      collection(db, `users/${userId}/places`),
      orderBy('createdAt', 'desc')
    );

    const unsub = subscribeCol<Place>(q, (items, meta) => {
      set({
        places: items,
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      });
    });

    set({ unsubscribe: unsub });
  },

  add: async (place) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const id = Date.now().toString();
    const newPlace: Place = {
      ...place,
      id,
      createdAt: new Date().toISOString(),
      aiEnriched: false,
    };

    await createAt(`users/${userId}/places/${id}`, newPlace);
    return id;
  },

  update: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateAt(`users/${userId}/places/${id}`, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  delete: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await deleteAt(`users/${userId}/places/${id}`);
  },

  getByType: (type: PlaceType) => {
    return get().places.filter(p => p.type === type);
  },

  getByTag: (tag: string) => {
    return get().places.filter(p => p.tags?.includes(tag));
  },
}));
