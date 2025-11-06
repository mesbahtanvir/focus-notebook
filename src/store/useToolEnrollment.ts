import { create } from 'zustand';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { subscribeCol } from '@/lib/data/subscribe';
import type { ToolSpecId } from '../../shared/toolSpecs';
import { CORE_TOOL_IDS } from '../../shared/toolSpecs';

export interface ToolEnrollmentStats {
  totalThoughtsProcessed: number;
  lastUsed?: string; // ISO timestamp
  averageConfidence?: number; // 0-100
  successRate?: number; // Percentage of successful processings
}

export interface ToolEnrollmentConfig {
  autoProcessThreshold?: number; // Auto-process if AI confidence >= this (default: 95)
  enableSuggestions?: boolean; // Show AI suggestions for this tool (default: true)
  enableAutoProcess?: boolean; // Enable auto-processing (default: true)
}

export interface ToolEnrollment {
  id: ToolSpecId | string;
  status: 'active' | 'inactive';
  enrolledAt?: string;

  // Usage statistics
  stats?: ToolEnrollmentStats;

  // Per-tool configuration
  config?: ToolEnrollmentConfig;
}

type State = {
  enrollments: ToolEnrollment[];
  enrolledToolIds: ToolSpecId[];
  isLoading: boolean;
  hasInitializedDefaults: boolean;
  unsubscribe: (() => void) | null;
  subscribe: (userId: string) => void;
  enroll: (toolId: ToolSpecId) => Promise<void>;
  unenroll: (toolId: ToolSpecId) => Promise<void>;
  isToolEnrolled: (toolId: ToolSpecId) => boolean;

  // Stats management
  updateToolStats: (toolId: ToolSpecId, stats: Partial<ToolEnrollmentStats>) => Promise<void>;
  incrementProcessingCount: (toolId: ToolSpecId, confidence?: number) => Promise<void>;
  getToolStats: (toolId: ToolSpecId) => ToolEnrollmentStats | undefined;

  // Config management
  updateToolConfig: (toolId: ToolSpecId, config: Partial<ToolEnrollmentConfig>) => Promise<void>;
  getToolConfig: (toolId: ToolSpecId) => ToolEnrollmentConfig | undefined;
};

async function initializeAllToolEnrollments(userId: string) {
  const writes = CORE_TOOL_IDS.map((toolId) =>
    setDoc(
      doc(db, `users/${userId}/toolEnrollments/${toolId}`),
      {
        status: 'active',
        enrolledAt: serverTimestamp(),
      },
      { merge: true }
    )
  );
  await Promise.all(writes);
}

export const useToolEnrollment = create<State>((set, get) => ({
  enrollments: [],
  enrolledToolIds: [],
  isLoading: false,
  hasInitializedDefaults: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const current = get().unsubscribe;
    if (current) current();

    set({ isLoading: true });

    const enrollmentsRef = collection(db, `users/${userId}/toolEnrollments`);

    const unsub = subscribeCol<ToolEnrollment>(enrollmentsRef as any, (rows) => {
      const active = rows.filter((row) => row.status !== 'inactive');
      set({
        enrollments: rows,
        enrolledToolIds: active.map((row) => row.id as ToolSpecId),
        isLoading: false,
      });

      const missing = CORE_TOOL_IDS.filter(
        (toolId) => !rows.some((row) => row.id === toolId)
      );

      if (missing.length > 0 && !get().hasInitializedDefaults) {
        set({ hasInitializedDefaults: true, isLoading: true });
        initializeAllToolEnrollments(userId)
          .catch((error) => console.error('Failed to initialize tool enrollments:', error))
          .finally(() => {
            set({ isLoading: false });
          });
      } else if (missing.length === 0 && !get().hasInitializedDefaults) {
        set({ hasInitializedDefaults: true });
      }
    });

    set({ unsubscribe: unsub });
  },

  enroll: async (toolId) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const ref = doc(db, `users/${userId}/toolEnrollments/${toolId}`);
    await setDoc(
      ref,
      {
        status: 'active',
        enrolledAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  unenroll: async (toolId) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const ref = doc(db, `users/${userId}/toolEnrollments/${toolId}`);
    await deleteDoc(ref);
  },

  isToolEnrolled: (toolId) => {
    return get().enrolledToolIds.includes(toolId);
  },

  // ----- Stats Management -----
  updateToolStats: async (toolId, stats) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const enrollment = get().enrollments.find((e) => e.id === toolId);
    if (!enrollment) throw new Error(`Tool ${toolId} not enrolled`);

    const ref = doc(db, `users/${userId}/toolEnrollments/${toolId}`);
    await setDoc(
      ref,
      {
        stats: {
          ...enrollment.stats,
          ...stats,
        },
      },
      { merge: true }
    );
  },

  incrementProcessingCount: async (toolId, confidence) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const enrollment = get().enrollments.find((e) => e.id === toolId);
    if (!enrollment) return; // Silently skip if not enrolled

    const currentStats = enrollment.stats || {
      totalThoughtsProcessed: 0,
      averageConfidence: 0,
    };

    const newCount = currentStats.totalThoughtsProcessed + 1;

    // Calculate new average confidence if provided
    let newAvgConfidence = currentStats.averageConfidence;
    if (confidence !== undefined) {
      const oldSum = (currentStats.averageConfidence || 0) * currentStats.totalThoughtsProcessed;
      newAvgConfidence = (oldSum + confidence) / newCount;
    }

    await get().updateToolStats(toolId, {
      totalThoughtsProcessed: newCount,
      lastUsed: new Date().toISOString(),
      averageConfidence: newAvgConfidence,
    });
  },

  getToolStats: (toolId) => {
    const enrollment = get().enrollments.find((e) => e.id === toolId);
    return enrollment?.stats;
  },

  // ----- Config Management -----
  updateToolConfig: async (toolId, config) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const enrollment = get().enrollments.find((e) => e.id === toolId);
    if (!enrollment) throw new Error(`Tool ${toolId} not enrolled`);

    const ref = doc(db, `users/${userId}/toolEnrollments/${toolId}`);
    await setDoc(
      ref,
      {
        config: {
          ...enrollment.config,
          ...config,
        },
      },
      { merge: true }
    );
  },

  getToolConfig: (toolId) => {
    const enrollment = get().enrollments.find((e) => e.id === toolId);
    return enrollment?.config;
  },
}));
