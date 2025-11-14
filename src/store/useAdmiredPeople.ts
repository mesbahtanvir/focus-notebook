import { createEntityStore, BaseEntity, BaseState, BaseActions } from './createEntityStore';

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

export interface AdmiredPerson extends BaseEntity {
  name: string;
  category?: string;
  bio?: string;
  imageUrl?: string;
  birthYear?: number;
  birthPlace?: string;
  currentLocation?: string;
  earlyLife?: string;
  personalStory?: string;
  whatDrivesThem?: string;
  struggles?: string[];
  failures?: string[];
  personalPhilosophy?: string;
  coreValues?: string[];
  dailyHabits?: string[];
  whyAdmire?: string;
  personalConnection?: string;
  keyLessons?: string;
  mentalModels?: string[];
  adviceTheyGive?: string[];
  timeline?: TimelineEvent[];
  careerJourney?: string;
  pivotalMoments?: string[];
  quotes?: Quote[];
  resources?: Resource[];
  links?: string[];
  mentors?: string[];
  influences?: string[];
  notes?: string;
  journalEntries?: JournalEntry[];
  tags?: string[];
  aiEnriched?: boolean;
}

// Extra actions specific to admired people
interface AdmiredPeopleExtraActions {
  people: AdmiredPerson[];
  getByCategory: (category: string) => AdmiredPerson[];
  getByTag: (tag: string) => AdmiredPerson[];
}

export const useAdmiredPeople = createEntityStore<AdmiredPerson, Omit<AdmiredPerson, 'id' | 'createdAt'>, AdmiredPeopleExtraActions>(
  {
    collectionName: 'admiredPeople',
    defaultValues: {
      aiEnriched: false,
    } as Partial<AdmiredPerson>,
  },
  (set, get) => ({
    // Backward compatibility
    get people() {
      return get().items;
    },

    getByCategory: (category: string) => {
      return get().items.filter(p => p.category === category);
    },

    getByTag: (tag: string) => {
      return get().items.filter(p => p.tags?.includes(tag));
    },
  })
);
