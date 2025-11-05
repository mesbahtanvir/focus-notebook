import { create } from 'zustand';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export type ToolName =
  | 'tasks'
  | 'thoughts'
  | 'goals'
  | 'projects'
  | 'focus'
  | 'brainstorming'
  | 'notes'
  | 'relationships'
  | 'moodtracker'
  | 'cbt'
  | 'errands'
  | 'deepreflect'
  | 'packing-list'
  | 'trips'
  | 'spending'
  | 'investments'
  | 'subscriptions'
  | 'asset-horizon';

type FirestoreToolName = ToolName | 'vacation-packing';

type RawToolUsageRecord = {
  id: string;
  toolName: FirestoreToolName;
  clickCount: number;
  lastAccessed: string;
  createdAt: string;
};

export interface ToolUsageRecord {
  id: string;
  toolName: ToolName;
  clickCount: number;
  lastAccessed: string;
  createdAt: string;
}

interface ToolUsageStats {
  toolName: ToolName;
  clickCount: number;
  lastAccessed: string;
}

type State = {
  usageRecords: ToolUsageRecord[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;
  subscribe: (userId: string) => void;
  trackToolClick: (toolName: ToolName) => Promise<void>;
  getMostUsedTools: (limit?: number) => ToolUsageStats[];
};

export const useToolUsage = create<State>((set, get) => ({
  usageRecords: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    const usageQuery = query(
      collection(db, `users/${userId}/toolUsage`),
      orderBy('clickCount', 'desc')
    );

    const unsub = subscribeCol<RawToolUsageRecord>(usageQuery, (records, meta) => {
      const normalizedRecords: ToolUsageRecord[] = records.map(record => {
        const normalizedToolName: ToolName =
          record.toolName === 'vacation-packing' ? 'packing-list' : record.toolName;

        return {
          ...record,
          toolName: normalizedToolName,
        };
      });

      set({
        usageRecords: normalizedRecords,
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      });
    });

    set({ unsubscribe: unsub });
  },

  trackToolClick: async (toolName: ToolName) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const existingRecords = get().usageRecords;
    const existingRecord = existingRecords.find(r => r.toolName === toolName);

    const now = new Date().toISOString();

    if (existingRecord) {
      // Update existing record
      await updateAt(`users/${userId}/toolUsage/${existingRecord.id}`, {
        clickCount: existingRecord.clickCount + 1,
        lastAccessed: now,
      });
    } else {
      // Create new record
      const recordId = `${toolName}-${Date.now()}`;
      const newRecord: ToolUsageRecord = {
        id: recordId,
        toolName,
        clickCount: 1,
        lastAccessed: now,
        createdAt: now,
      };
      await createAt(`users/${userId}/toolUsage/${recordId}`, newRecord);
    }
  },

  getMostUsedTools: (limit = 5) => {
    const records = get().usageRecords;

    // Deduplicate by toolName, keeping the highest click count
    const deduped = new Map<ToolName, ToolUsageStats>();
    records.forEach(r => {
      const existing = deduped.get(r.toolName);
      if (!existing || r.clickCount > existing.clickCount) {
        deduped.set(r.toolName, {
          toolName: r.toolName,
          clickCount: r.clickCount,
          lastAccessed: r.lastAccessed,
        });
      }
    });

    return Array.from(deduped.values())
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, limit);
  },
}));
