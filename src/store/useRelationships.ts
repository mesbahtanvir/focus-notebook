import { createEntityStore, BaseEntity } from './createEntityStore';

export type RelationshipType =
  | 'friend'
  | 'family'
  | 'colleague'
  | 'romantic'
  | 'mentor'
  | 'mentee'
  | 'acquaintance'
  | 'other';

export interface ImportantDate {
  type: string;
  date: string;
  notes?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export interface InteractionLog {
  id: string;
  date: string;
  type: 'call' | 'meeting' | 'message' | 'other';
  summary: string;
  mood?: number;
  notes?: string;
}

export interface Person extends BaseEntity {
  name: string;
  relationshipType: RelationshipType;
  avatar?: string;
  contactInfo?: ContactInfo;
  importantDates?: ImportantDate[];
  connectionStrength: number;
  trustLevel: number;
  linkedThoughtIds: string[];
  interactionLogs?: InteractionLog[];
  lastInteraction?: string;
  communicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'rarely';
  notes?: string;
  tags?: string[];
  updatedBy?: string;
  version?: number;
}

export const useRelationships = createEntityStore<Person>(
  {
    collectionName: 'people',
    defaultValues: {
      linkedThoughtIds: [],
      version: 1,
    } as Partial<Person>,
    beforeCreate: (data) => ({
      updatedBy: (async () => {
        const { auth } = await import('@/lib/firebaseClient');
        return auth.currentUser?.uid;
      })() as any,
    }),
  },
  (set, get) => ({
    // Backward compatibility
    get people() {
      return get().items;
    },

    loading: false,
    error: null,

    linkThought: async (personId: string, thoughtId: string) => {
      const person = get().items.find(p => p.id === personId);
      if (!person) return;

      const linkedThoughtIds = [...(person.linkedThoughtIds || []), thoughtId];
      await get().update(personId, { linkedThoughtIds });
    },

    unlinkThought: async (personId: string, thoughtId: string) => {
      const person = get().items.find(p => p.id === personId);
      if (!person) return;

      const linkedThoughtIds = (person.linkedThoughtIds || []).filter(id => id !== thoughtId);
      await get().update(personId, { linkedThoughtIds });
    },

    addInteractionLog: async (personId: string, log: Omit<InteractionLog, 'id'>) => {
      const person = get().items.find(p => p.id === personId);
      if (!person) return;

      const newLog: InteractionLog = {
        ...log,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const interactionLogs = [...(person.interactionLogs || []), newLog];
      await get().update(personId, {
        interactionLogs,
        lastInteraction: log.date
      });
    },
  })
);
