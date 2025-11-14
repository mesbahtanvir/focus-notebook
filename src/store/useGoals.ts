import { createEntityStore, BaseEntity, BaseState, BaseActions } from './createEntityStore';

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
interface GoalExtraActions {
  goals: Goal[];
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
}

// Full store type
export type GoalsStore = BaseState<Goal> & BaseActions<Goal> & GoalExtraActions;

// Create the base store
export const useGoals = createEntityStore<Goal, Omit<Goal, 'id' | 'createdAt'>, GoalExtraActions>(
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

    // Backward compatible method names
    updateGoal: async (id: string, updates: Partial<Goal>) => {
      await get().update(id, updates);
    },

    deleteGoal: async (id: string) => {
      await get().delete(id);
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
