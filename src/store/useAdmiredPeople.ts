import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export interface AdmiredPerson {
  id: string;
  name: string;
  category?: string; // e.g., entrepreneur, artist, scientist, athlete
  bio?: string;
  whyAdmire?: string;
  keyLessons?: string;
  links?: string[]; // websites, social media, books, interviews
  notes?: string;
  tags?: string[];
  aiEnriched?: boolean; // flag to indicate if AI has enriched this entry
  createdAt: string;
  updatedAt?: number;
}

type State = {
  people: AdmiredPerson[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;

  subscribe: (userId: string) => void;
  add: (person: Omit<AdmiredPerson, 'id' | 'createdAt'>) => Promise<string>;
  update: (id: string, updates: Partial<AdmiredPerson>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  getByCategory: (category: string) => AdmiredPerson[];
  getByTag: (tag: string) => AdmiredPerson[];
};

export const useAdmiredPeople = create<State>((set, get) => ({
  people: [],
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
      collection(db, `users/${userId}/admiredPeople`),
      orderBy('createdAt', 'desc')
    );

    const unsub = subscribeCol<AdmiredPerson>(q, (items, meta) => {
      set({
        people: items,
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      });
    });

    set({ unsubscribe: unsub });
  },

  add: async (person) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const id = Date.now().toString();
    const newPerson: AdmiredPerson = {
      ...person,
      id,
      createdAt: new Date().toISOString(),
      aiEnriched: false,
    };

    await createAt(`users/${userId}/admiredPeople/${id}`, newPerson);
    return id;
  },

  update: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateAt(`users/${userId}/admiredPeople/${id}`, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  delete: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await deleteAt(`users/${userId}/admiredPeople/${id}`);
  },

  getByCategory: (category: string) => {
    return get().people.filter(p => p.category === category);
  },

  getByTag: (tag: string) => {
    return get().people.filter(p => p.tags?.includes(tag));
  },
}));
