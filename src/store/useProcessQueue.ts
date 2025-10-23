import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProcessingMode = 'auto' | 'safe' | 'manual';
export type QueueStatus = 'pending' | 'processing' | 'awaiting-approval' | 'completed' | 'reverted' | 'failed' | 'cancelled';
export type ActionType = 'createTask' | 'addTag' | 'enhanceThought' | 'changeType' | 'setIntensity' | 'createMoodEntry' | 'createProject' | 'linkToProject';

export interface ProcessAction {
  id: string;
  type: ActionType;
  thoughtId: string;
  data: any;
  status: 'pending' | 'approved' | 'executed' | 'reverted' | 'failed';
  createdItems?: {
    taskIds?: string[];
    noteIds?: string[];
    projectIds?: string[];
  };
  aiReasoning?: string;
  error?: string;
  timestamp: string;
}

export interface RevertData {
  originalThought: {
    text: string;
    type?: string;
    tags?: string[];
    intensity?: number;
  };
  createdItems: {
    taskIds: string[];
    noteIds: string[];
    projectIds: string[];
  };
  thoughtChanges: {
    textChanged: boolean;
    originalText?: string;
    typeChanged: boolean;
    originalType?: string;
  };
  addedTags: string[];
  canRevert: boolean;
}

export interface ProcessQueueItem {
  id: string;
  thoughtId: string;
  timestamp: string;
  mode: ProcessingMode;
  status: QueueStatus;
  actions: ProcessAction[];
  approvedActions: string[];
  executedActions: string[];
  revertible: boolean;
  revertData: RevertData;
  completedAt?: string;
  revertedAt?: string;
  error?: string;
  aiResponse?: any;
}

interface ProcessQueueStore {
  queue: ProcessQueueItem[];
  
  // Queue management
  addToQueue: (item: Omit<ProcessQueueItem, 'id' | 'timestamp'>) => string;
  updateQueueItem: (id: string, updates: Partial<ProcessQueueItem>) => void;
  removeFromQueue: (id: string) => void;
  getQueueItem: (id: string) => ProcessQueueItem | undefined;
  
  // Action management
  addAction: (queueId: string, action: Omit<ProcessAction, 'id' | 'timestamp'>) => string;
  updateAction: (queueId: string, actionId: string, updates: Partial<ProcessAction>) => void;
  
  // Status queries
  getPendingItems: () => ProcessQueueItem[];
  getAwaitingApproval: () => ProcessQueueItem[];
  getCompletedItems: () => ProcessQueueItem[];
  getRevertedItems: () => ProcessQueueItem[];
  
  // Cleanup
  clearCompleted: () => void;
  clearAll: () => void;
}

export const useProcessQueue = create<ProcessQueueStore>()(
  persist(
    (set, get) => ({
      queue: [],
      
      addToQueue: (item) => {
        const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const queueItem: ProcessQueueItem = {
          ...item,
          id,
          timestamp: new Date().toISOString(),
        };
        
        set((state) => ({
          queue: [queueItem, ...state.queue]
        }));
        
        return id;
      },
      
      updateQueueItem: (id, updates) => {
        set((state) => ({
          queue: state.queue.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        }));
      },
      
      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter(item => item.id !== id)
        }));
      },
      
      getQueueItem: (id) => {
        return get().queue.find(item => item.id === id);
      },
      
      addAction: (queueId, action) => {
        const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newAction: ProcessAction = {
          ...action,
          id: actionId,
          timestamp: new Date().toISOString(),
        };
        
        set((state) => ({
          queue: state.queue.map(item =>
            item.id === queueId
              ? { ...item, actions: [...item.actions, newAction] }
              : item
          )
        }));
        
        return actionId;
      },
      
      updateAction: (queueId, actionId, updates) => {
        set((state) => ({
          queue: state.queue.map(item =>
            item.id === queueId
              ? {
                  ...item,
                  actions: item.actions.map(action =>
                    action.id === actionId ? { ...action, ...updates } : action
                  )
                }
              : item
          )
        }));
      },
      
      getPendingItems: () => {
        return get().queue.filter(item => item.status === 'pending');
      },
      
      getAwaitingApproval: () => {
        return get().queue.filter(item => item.status === 'awaiting-approval');
      },
      
      getCompletedItems: () => {
        return get().queue.filter(item => item.status === 'completed')
          .slice(0, 50); // Keep last 50
      },
      
      getRevertedItems: () => {
        return get().queue.filter(item => item.status === 'reverted')
          .slice(0, 20); // Keep last 20
      },
      
      clearCompleted: () => {
        set((state) => ({
          queue: state.queue.filter(item => 
            item.status !== 'completed' || 
            new Date(item.completedAt!).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
          )
        }));
      },
      
      clearAll: () => {
        set({ queue: [] });
      },
    }),
    {
      name: 'process-queue-storage',
      version: 1,
    }
  )
);
