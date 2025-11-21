import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export type PlaceType = 'live' | 'visit' | 'short-term';

export type QuarterLabel = 'Jan-Mar' | 'Apr-Jun' | 'Jul-Sep' | 'Oct-Dec';

export interface PlaceInsights {
  dating?: {
    genderRatio?: {
      male?: number | 'unknown';
      female?: number | 'unknown';
      notes?: string;
    };
    sexPositivity?: string;
    datingCulture?: string;
    safetyTips?: string[];
  };
  culturalContext?: string;
  legalNotes?: string;
  safetyHealth?: {
    personalSafety?: string;
    healthcareAccess?: string;
    commonScams?: string;
    emergencyNumbers?: string;
    healthAdvisories?: string;
  };
  costAndLogistics?: {
    budgetTips?: string;
    transport?: string;
    tipping?: string;
    lateNightOptions?: string;
  };
  socialScene?: {
    nightlifeAreas?: string;
    events?: string;
    weeknights?: string;
    universityImpact?: string;
  };
  connectivity?: {
    mobileData?: string;
    wifi?: string;
    coworking?: string;
    noiseLevels?: string;
  };
  seasonalComfort?: {
    aqi?: string;
    heatIndex?: string;
    pollen?: string;
    weatherImpact?: string;
  };
  demographicsLanguage?: {
    ageDistribution?: string;
    language?: string;
    expatDensity?: string;
    touristVsLocal?: string;
  };
  topEthnicities?: { group: string; share: string }[];
  weatherByQuarter?: {
    quarter: QuarterLabel;
    avgTempC?: number | 'unknown';
    avgHumidity?: number | 'unknown';
    avgRainfallMm?: number | 'unknown';
    avgSunshineHours?: number | 'unknown';
    notes?: string;
  }[];
  sources?: string[];
  freshnessNote?: string;
  disclaimer?: string;
}

export interface PlaceScores {
  overall?: number;
  dating?: number;
  cost?: number;
  safety?: number;
  weather?: number;
  culture?: number;
  logistics?: number;
  connectivity?: number;
  inclusivity?: number;
}

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
  insights?: PlaceInsights;
  insightScores?: PlaceScores;

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
