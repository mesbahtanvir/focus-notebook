import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export interface DexaScan {
  id: string;
  scanDate: string; // ISO date string
  fileName: string;
  storagePath: string;

  // Body composition data (parsed by LLM)
  weight?: number; // in lbs or kg
  bodyFatPercentage?: number;
  leanMass?: number; // in lbs or kg
  fatMass?: number; // in lbs or kg
  boneMineralDensity?: number;
  visceralFat?: number; // area in cm²

  // Regional breakdown (optional)
  regions?: {
    trunk?: { fat: number; lean: number };
    arms?: { fat: number; lean: number };
    legs?: { fat: number; lean: number };
  };

  // AI-generated insights
  aiSummary?: string;
  aiInsights?: string[];
  comparisonToPrevious?: string;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt?: number;
}

export interface ProcessingStatus {
  status: 'processing' | 'completed' | 'error';
  fileName: string;
  storagePath?: string;
  error?: string;
  scanId?: string;
  createdAt: string;
  updatedAt: string;
}

interface BodyProgressStore {
  scans: DexaScan[];
  processingStatuses: ProcessingStatus[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;

  // Subscriptions
  subscribe: (userId: string) => void;

  // Scan management
  addScan: (scan: Omit<DexaScan, 'id' | 'createdAt'>) => Promise<string>;
  updateScan: (id: string, updates: Partial<DexaScan>) => Promise<void>;
  deleteScan: (id: string) => Promise<void>;

  // Helper methods
  getLatestScan: () => DexaScan | undefined;
  getScansByDateRange: (startDate: string, endDate: string) => DexaScan[];
  getProgressData: () => Array<{
    date: string;
    weight?: number;
    bodyFatPercentage?: number;
    leanMass?: number;
    fatMass?: number;
  }>;
}

export const useBodyProgress = create<BodyProgressStore>((set, get) => ({
  scans: [],
  processingStatuses: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    // Unsubscribe from previous subscription if any
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    // Subscribe to scans
    const scansQuery = query(
      collection(db, `users/${userId}/dexaScans`),
      orderBy('scanDate', 'desc')
    );

    const unsubScans = subscribeCol<DexaScan>(scansQuery, (scans, meta) => {
      set({
        scans,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
        isLoading: false,
      });
    });

    // Subscribe to processing statuses
    const statusQuery = query(
      collection(db, `users/${userId}/dexaScanProcessingStatus`),
      orderBy('updatedAt', 'desc')
    );

    const unsubStatus = subscribeCol<ProcessingStatus>(statusQuery, (processingStatuses, meta) => {
      set({
        processingStatuses,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
        isLoading: false,
      });
    });

    // Combined unsubscribe function
    const combinedUnsub = () => {
      unsubScans();
      unsubStatus();
    };

    set({ unsubscribe: combinedUnsub });
  },

  addScan: async (scan) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const id = crypto.randomUUID();
    await createAt(`users/${userId}/dexaScans/${id}`, {
      ...scan,
      id,
      createdAt: new Date().toISOString(),
    });

    return id;
  },

  updateScan: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateAt(`users/${userId}/dexaScans/${id}`, updates);
  },

  deleteScan: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await deleteAt(`users/${userId}/dexaScans/${id}`);
  },

  getLatestScan: () => {
    const scans = get().scans;
    return scans.length > 0 ? scans[0] : undefined;
  },

  getScansByDateRange: (startDate, endDate) => {
    return get().scans.filter(s => {
      return s.scanDate >= startDate && s.scanDate <= endDate;
    });
  },

  getProgressData: () => {
    return get().scans.map(scan => ({
      date: scan.scanDate,
      weight: scan.weight,
      bodyFatPercentage: scan.bodyFatPercentage,
      leanMass: scan.leanMass,
      fatMass: scan.fatMass,
    })).reverse(); // Oldest to newest for charts
  },
}));
