import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export interface TimelineEvent {
  date: string;
  event: string;
  type: 'milestone' | 'failure' | 'pivot' | 'personal';
  description?: string;
}

export interface Quote {
  text: string;
  context?: string;
  source?: string;
  favorite?: boolean;
}

export interface Resource {
  type: 'book' | 'video' | 'podcast' | 'article' | 'interview' | 'other';
  title: string;
  url: string;
  notes?: string;
  favorite?: boolean;
}

export interface JournalEntry {
  date: string;
  content: string;
}

export interface AdmiredPerson {
  id: string;
  name: string;
  category?: string; // e.g., entrepreneur, artist, scientist, athlete

  // Basic info
  bio?: string;
  imageUrl?: string;
  birthYear?: number;
  birthPlace?: string;
  currentLocation?: string;

  // Personal life & drive (FOCUS AREA)
  earlyLife?: string; // childhood, upbringing, family background
  personalStory?: string; // their personal journey and struggles
  whatDrivesThem?: string; // core motivations and what pushes them
  struggles?: string[]; // challenges they faced and overcame
  failures?: string[]; // major failures and what they learned
  personalPhilosophy?: string; // their life philosophy and mindset
  coreValues?: string[]; // what they stand for
  dailyHabits?: string[]; // routines and practices

  // Why you admire them
  whyAdmire?: string;
  personalConnection?: string; // how they resonate with you

  // Lessons & insights
  keyLessons?: string;
  mentalModels?: string[]; // frameworks they use
  adviceTheyGive?: string[]; // common advice they share

  // Journey & timeline
  timeline?: TimelineEvent[];
  careerJourney?: string; // their professional path
  pivotalMoments?: string[]; // key turning points

  // Content & resources
  quotes?: Quote[];
  resources?: Resource[];
  links?: string[]; // websites, social media

  // Network
  mentors?: string[]; // who influenced them
  influences?: string[]; // people/books/ideas that shaped them

  // Your notes
  notes?: string;
  journalEntries?: JournalEntry[];

  // Meta
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
