import { create } from 'zustand';

export interface AnonymousSessionState {
  uid: string | null;
  expiresAt: string | null;
  allowAi: boolean;
  cleanupPending: boolean;
  expired: boolean;
  ciOverrideKey?: string | null;
  setSession: (session: {
    uid: string;
    expiresAt: string | null;
    allowAi: boolean;
    cleanupPending?: boolean;
    ciOverrideKey?: string | null;
  }) => void;
  markExpired: () => void;
  updateCleanupPending: (cleanupPending: boolean) => void;
  clearSession: () => void;
}

export const useAnonymousSession = create<AnonymousSessionState>((set) => ({
  uid: null,
  expiresAt: null,
  allowAi: false,
  cleanupPending: false,
  expired: false,
  ciOverrideKey: null,
  setSession: ({ uid, expiresAt, allowAi, cleanupPending = false, ciOverrideKey = null }) =>
    set({
      uid,
      expiresAt,
      allowAi,
      cleanupPending,
      ciOverrideKey,
      expired: false,
    }),
  markExpired: () =>
    set((state) => ({
      expired: true,
      cleanupPending: true,
      allowAi: state.allowAi,
    })),
  updateCleanupPending: (cleanupPending) =>
    set((state) => ({
      cleanupPending,
      expired: cleanupPending ? state.expired : state.expired,
    })),
  clearSession: () =>
    set({
      uid: null,
      expiresAt: null,
      allowAi: false,
      cleanupPending: false,
      expired: false,
      ciOverrideKey: null,
    }),
}));
