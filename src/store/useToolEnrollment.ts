import { create } from 'zustand';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { subscribeCol } from '@/lib/data/subscribe';
import type { ToolSpecId } from '../../shared/toolSpecs';
import { CORE_TOOL_IDS } from '../../shared/toolSpecs';

export interface ToolEnrollment {
  id: ToolSpecId | string;
  status: 'active' | 'inactive';
  enrolledAt?: string;
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
}));
