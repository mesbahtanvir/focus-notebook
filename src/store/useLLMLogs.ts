import { create } from 'zustand';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { subscribeCol } from '@/lib/data/subscribe';

export interface LLMLog {
  id: string;
  thoughtId?: string;
  trigger: 'auto' | 'manual' | 'reprocess' | 'csv-upload' | 'csv-api';
  prompt: string;
  rawResponse: string;
  actions?: any[];
  toolSpecIds?: string[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  createdAt?: string;
  status?: 'completed' | 'failed';
  error?: string;
  promptType?: string;
  metadata?: Record<string, any>;
}

interface State {
  logs: LLMLog[];
  isLoading: boolean;
  unsubscribe: (() => void) | null;
  subscribe: (userId: string) => void;
  clear: () => void;
}

function serializeTimestamp(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return undefined;
}

export const useLLMLogs = create<State>((set, get) => ({
  logs: [],
  isLoading: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const current = get().unsubscribe;
    if (current) current();

    set({ isLoading: true });

    const logsQuery = query(
      collection(db, `users/${userId}/llmLogs`),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsub = subscribeCol<LLMLog>(logsQuery as any, (rows) => {
      const mapped = rows.map((row) => ({
        ...row,
        createdAt: serializeTimestamp((row as any).createdAt) ?? undefined,
      }));
      set({
        logs: mapped,
        isLoading: false,
      });
    });

    set({ unsubscribe: unsub });
  },

  clear: () => {
    const current = get().unsubscribe;
    if (current) current();
    set({ logs: [], isLoading: false, unsubscribe: null });
  },
}));
