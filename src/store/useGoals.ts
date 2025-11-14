import { createEntityStore, BaseEntity } from './createEntityStore';

export type GoalTimeframe = 'immediate' | 'short-term' | 'long-term';

export interface Goal extends BaseEntity {
  title: string;
  objective: string;
  timeframe: GoalTimeframe;
  status: 'active' | 'completed' | 'paused' | 'archived';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  progress?: number; // 0-100
  tags?: string[];
  completedAt?: string;
  source?: 'manual' | 'ai' | 'thought';
  // Legacy fields (kept for backward compatibility)
  actionPlan?: string[];
  targetDate?: string;
}

// Extra actions specific to goals
interface GoalActions {
  goals: Goal[];
  toggleStatus: (id: string) => Promise<void>;
}

// Create the base store
const baseStore = createEntityStore<Goal>(
  {
    collectionName: 'goals',
    defaultValues: {
      status: 'active',
      priority: 'medium',
      progress: 0,
    } as Partial<Goal>,
  },
  (set, get) => ({
    // Computed property for backward compatibility
    get goals() {
      return get().items;
    },

    // Goal-specific action: toggle between active and completed
    toggleStatus: async (id: string) => {
      const goal = get().items.find((g) => g.id === id);
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

      await get().update(id, updates);
    },
  })
);

export const useGoals = baseStore;

// Convenience methods for backward compatibility
export const useGoalsActions = () => {
  const store = useGoals();
  return {
    subscribe: store.subscribe,
    add: store.add,
    updateGoal: store.update,
    deleteGoal: store.delete,
    toggleStatus: store.toggleStatus,
  };
};
