import { create } from 'zustand';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { subscribeDoc, type SnapshotMeta } from '@/lib/data/subscribe';
import {
  evaluateAiEntitlement,
  hasActivePro,
  type AiEntitlement,
  type SubscriptionSnapshot,
} from '../../shared/subscription';

type State = {
  subscription: SubscriptionSnapshot | null;
  entitlement: AiEntitlement;
  hasProAccess: boolean;
  isLoading: boolean;
  fromCache: boolean;
  lastUpdatedAt: string | null;
  unsubscribe: (() => void) | null;
  subscribe: (userId: string) => void;
  clear: () => void;
};

function toIsoString(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Date(value).toISOString() : null;
  }

  if (typeof value === 'object') {
    const candidate = value as { toDate?: () => Date; toMillis?: () => number };
    if (typeof candidate.toDate === 'function') {
      const date = candidate.toDate();
      return date instanceof Date ? date.toISOString() : null;
    }
    if (typeof candidate.toMillis === 'function') {
      const millis = candidate.toMillis();
      return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
    }
  }

  return null;
}

function handleSnapshot(
  data: SubscriptionSnapshot | null,
  meta: SnapshotMeta
): Pick<State, 'subscription' | 'entitlement' | 'hasProAccess' | 'isLoading' | 'fromCache' | 'lastUpdatedAt'> {
  const normalized = data
    ? ({
        ...data,
        updatedAt: toIsoString(data.updatedAt),
        currentPeriodEnd: toIsoString(data.currentPeriodEnd),
        trialEndsAt: toIsoString(data.trialEndsAt),
      } satisfies SubscriptionSnapshot)
    : null;

  const entitlement = evaluateAiEntitlement(normalized);

  return {
    subscription: normalized,
    entitlement,
    hasProAccess: hasActivePro(normalized),
    isLoading: false,
    fromCache: meta.fromCache,
    lastUpdatedAt: normalized?.updatedAt ?? null,
  };
}

export const useSubscriptionStatus = create<State>((set, get) => ({
  subscription: null,
  entitlement: { allowed: false, code: 'no-record' },
  hasProAccess: false,
  isLoading: false,
  fromCache: false,
  lastUpdatedAt: null,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    set({
      subscription: null,
      entitlement: { allowed: false, code: 'no-record' },
      hasProAccess: false,
      isLoading: true,
      fromCache: false,
      lastUpdatedAt: null,
    });

    const ref = doc(db, `users/${userId}/subscriptionStatus`);
    const unsubscribe = subscribeDoc<SubscriptionSnapshot>(ref, (docData, meta) => {
      set(handleSnapshot(docData, meta));
    });

    set({ unsubscribe });
  },

  clear: () => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    set({
      subscription: null,
      entitlement: { allowed: false, code: 'no-record' },
      hasProAccess: false,
      isLoading: false,
      fromCache: false,
      lastUpdatedAt: null,
      unsubscribe: null,
    });
  },
}));
