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
  goalId?: string; // Connected to a goal (only for top-level projects)
  parentProjectId?: string; // For sub-projects (nested hierarchy)
  timeframe: ProjectTimeframe;
  status: ProjectStatus;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt?: number;
  completedAt?: string;
  category: 'health' | 'wealth' | 'mastery' | 'connection';
  tags?: string[];
  progress?: number; // 0-100
  notes?: string;
  source?: 'manual' | 'ai' | 'thought';
  isLeaf?: boolean; // True if this project has tasks, false if it has sub-projects
  level?: number; // Depth in hierarchy: 0 = under goal, 1 = sub-project, etc.
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
  add: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, updates: Partial<Omit<Project, 'id'>>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  getProjectsByStatus: (status: ProjectStatus) => Project[];
  getProjectsByTimeframe: (timeframe: ProjectTimeframe) => Project[];
  getProjectsByGoal: (goalId: string) => Project[];
  getSubProjects: (projectId: string) => Project[];
  getTopLevelProjects: () => Project[];
  getProjectHierarchy: (projectId: string) => Project[];
  isLeafProject: (projectId: string) => boolean;
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

  getProjectsByStatus: (status) => {
    return get().projects.filter(p => p.status === status);
  },

  getProjectsByTimeframe: (timeframe) => {
    return get().projects.filter(p => p.timeframe === timeframe);
  },

  getProjectsByGoal: (goalId) => {
    return get().projects.filter(p => p.goalId === goalId && !p.parentProjectId);
  },

  getSubProjects: (projectId) => {
    return get().projects.filter(p => p.parentProjectId === projectId);
  },

  getTopLevelProjects: () => {
    return get().projects.filter(p => !p.parentProjectId);
  },

  getProjectHierarchy: (projectId) => {
    const hierarchy: Project[] = [];
    let currentProject = get().projects.find(p => p.id === projectId);
    
    while (currentProject) {
      hierarchy.unshift(currentProject);
      if (currentProject.parentProjectId) {
        currentProject = get().projects.find(p => p.id === currentProject!.parentProjectId);
      } else {
        break;
      }
    }
    
    return hierarchy;
  },

  isLeafProject: (projectId) => {
    const project = get().projects.find(p => p.id === projectId);
    if (!project) return false;
    
    // A project is a leaf if it explicitly has isLeaf=true or has no sub-projects
    const hasSubProjects = get().projects.some(p => p.parentProjectId === projectId);
    return project.isLeaf !== false && !hasSubProjects;
  },
}));
