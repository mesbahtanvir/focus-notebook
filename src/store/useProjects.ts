import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export type ProjectTimeframe = 'short-term' | 'long-term';
export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  title: string;
  objective: string;
  actionPlan: string[];
  description?: string;
  goalId?: string; // Connected to a goal
  timeframe: ProjectTimeframe;
  status: ProjectStatus;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  targetDate?: string;
  createdAt: string;
  updatedAt?: number;
  completedAt?: string;
  category: 'health' | 'wealth' | 'mastery' | 'connection';
  linkedThoughtIds: string[]; // Thoughts attached to this project
  linkedTaskIds: string[]; // Tasks related to this project
  tags?: string[];
  progress?: number; // 0-100
  notes?: string;
  source?: 'manual' | 'ai' | 'thought';
  milestones?: {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string;
  }[];
}

type State = {
  projects: Project[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: (() => void) | null;
  subscribe: (userId: string) => void;
  add: (data: Omit<Project, 'id' | 'createdAt' | 'linkedThoughtIds' | 'linkedTaskIds' | 'updatedAt'>) => Promise<string>;
  update: (id: string, updates: Partial<Omit<Project, 'id'>>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  linkThought: (projectId: string, thoughtId: string) => Promise<void>;
  unlinkThought: (projectId: string, thoughtId: string) => Promise<void>;
  linkTask: (projectId: string, taskId: string) => Promise<void>;
  unlinkTask: (projectId: string, taskId: string) => Promise<void>;
  getProjectsByStatus: (status: ProjectStatus) => Project[];
  getProjectsByTimeframe: (timeframe: ProjectTimeframe) => Project[];
  getProjectsByGoal: (goalId: string) => Project[];
};

export const useProjects = create<State>((set, get) => ({
  projects: [],
  isLoading: true,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    const projectsQuery = query(
      collection(db, `users/${userId}/projects`),
      orderBy('createdAt', 'desc')
    );

    const unsub = subscribeCol<Project>(projectsQuery, (projects, meta) => {
      set({
        projects,
        isLoading: false,
        fromCache: meta.fromCache,
        hasPendingWrites: meta.hasPendingWrites,
      });
    });

    set({ unsubscribe: unsub });
  },

  add: async (data) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const projectId = Date.now().toString();
    const newProject: Project = {
      ...data,
      id: projectId,
      createdAt: new Date().toISOString(),
      linkedThoughtIds: [],
      linkedTaskIds: [],
      priority: data.priority || 'medium',
      status: data.status || 'active',
    };

    await createAt(`users/${userId}/projects/${projectId}`, newProject);
    return projectId;
  },

  update: async (id, updates) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateAt(`users/${userId}/projects/${id}`, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  delete: async (id) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await deleteAt(`users/${userId}/projects/${id}`);
  },

  linkThought: async (projectId, thoughtId) => {
    const project = get().projects.find(p => p.id === projectId);
    if (!project) return;
    
    await get().update(projectId, {
      linkedThoughtIds: [...project.linkedThoughtIds, thoughtId],
    });
  },

  unlinkThought: async (projectId, thoughtId) => {
    const project = get().projects.find(p => p.id === projectId);
    if (!project) return;
    
    await get().update(projectId, {
      linkedThoughtIds: project.linkedThoughtIds.filter(id => id !== thoughtId),
    });
  },

  linkTask: async (projectId, taskId) => {
    const project = get().projects.find(p => p.id === projectId);
    if (!project) return;
    
    await get().update(projectId, {
      linkedTaskIds: [...project.linkedTaskIds, taskId],
    });
  },

  unlinkTask: async (projectId, taskId) => {
    const project = get().projects.find(p => p.id === projectId);
    if (!project) return;
    
    await get().update(projectId, {
      linkedTaskIds: project.linkedTaskIds.filter(id => id !== taskId),
    });
  },

  getProjectsByStatus: (status) => {
    return get().projects.filter(p => p.status === status);
  },

  getProjectsByTimeframe: (timeframe) => {
    return get().projects.filter(p => p.timeframe === timeframe);
  },

  getProjectsByGoal: (goalId) => {
    return get().projects.filter(p => p.goalId === goalId);
  },
}));
