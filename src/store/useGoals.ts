import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export interface Goal {
  id: string;
  title: string;
  objective: string;
  actionPlan: string[];
  status: 'active' | 'completed' | 'paused' | 'archived';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  targetDate?: string;
  progress?: number; // 0-100
  tags?: string[];
  createdAt: string;
  updatedAt?: number;
  completedAt?: string;
  source?: 'manual' | 'ai' | 'thought';
}

type State = {
  goals: Goal[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;
  subscribe: (userId: string) => void;
  add: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
};

export const useGoals = create<State>((set, get) => ({
  goals: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    const goalsQuery = query(
      collection(db, `users/${userId}/goals`),
      orderBy('createdAt', 'desc')
    );

    const unsub = subscribeCol<Goal>(goalsQuery, (goals, meta) => {
      set({
        goals,
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      });
    });

    set({ unsubscribe: unsub });
  },

  add: async (goal) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const goalId = Date.now().toString();
    const newGoal: Goal = {
      ...goal,
      id: goalId,
      createdAt: new Date().toISOString(),
      status: goal.status || 'active',
      priority: goal.priority || 'medium',
      progress: goal.progress || 0,
    };

    await createAt(`users/${userId}/goals/${goalId}`, newGoal);
  },

  updateGoal: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateAt(`users/${userId}/goals/${id}`, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  deleteGoal: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await deleteAt(`users/${userId}/goals/${id}`);
  },

  toggleStatus: async (id) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;

    const newStatus = goal.status === 'completed' ? 'active' : 'completed';
    const updates: Partial<Goal> = {
      status: newStatus,
      updatedAt: Date.now(),
    };

    if (newStatus === 'completed') {
      updates.completedAt = new Date().toISOString();
      updates.progress = 100;
    } else {
      updates.completedAt = undefined;
    }

    await get().updateGoal(id, updates);
  },
}));
