import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProjectTimeframe = 'short-term' | 'long-term';
export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  title: string;
  description?: string;
  timeframe: ProjectTimeframe;
  status: ProjectStatus;
  targetDate?: string;
  createdAt: string;
  completedAt?: string;
  category: 'health' | 'wealth' | 'mastery' | 'connection';
  linkedThoughtIds: string[]; // Thoughts attached to this project
  linkedTaskIds: string[]; // Tasks related to this project
  tags?: string[];
  progress?: number; // 0-100
  notes?: string;
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
  loadProjects: () => void;
  add: (data: Omit<Project, 'id' | 'createdAt' | 'linkedThoughtIds' | 'linkedTaskIds'>) => string;
  update: (id: string, updates: Partial<Omit<Project, 'id'>>) => void;
  delete: (id: string) => void;
  linkThought: (projectId: string, thoughtId: string) => void;
  unlinkThought: (projectId: string, thoughtId: string) => void;
  linkTask: (projectId: string, taskId: string) => void;
  unlinkTask: (projectId: string, taskId: string) => void;
  getProjectsByStatus: (status: ProjectStatus) => Project[];
  getProjectsByTimeframe: (timeframe: ProjectTimeframe) => Project[];
};

export const useProjects = create<State>()(
  persist(
    (set, get) => ({
      projects: [],
      isLoading: false,

      loadProjects: () => {
        set({ isLoading: false });
      },

      add: (data) => {
        const newProject: Project = {
          ...data,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          linkedThoughtIds: [],
          linkedTaskIds: [],
        };
        
        set((state) => ({
          projects: [...state.projects, newProject]
        }));
        
        return newProject.id;
      },

      update: (id, updates) => {
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === id ? { ...p, ...updates } : p
          )
        }));
      },

      delete: (id) => {
        set((state) => ({
          projects: state.projects.filter(p => p.id !== id)
        }));
      },

      linkThought: (projectId, thoughtId) => {
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, linkedThoughtIds: [...p.linkedThoughtIds, thoughtId] }
              : p
          )
        }));
      },

      unlinkThought: (projectId, thoughtId) => {
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, linkedThoughtIds: p.linkedThoughtIds.filter(id => id !== thoughtId) }
              : p
          )
        }));
      },

      linkTask: (projectId, taskId) => {
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, linkedTaskIds: [...p.linkedTaskIds, taskId] }
              : p
          )
        }));
      },

      unlinkTask: (projectId, taskId) => {
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, linkedTaskIds: p.linkedTaskIds.filter(id => id !== taskId) }
              : p
          )
        }));
      },

      getProjectsByStatus: (status) => {
        return get().projects.filter(p => p.status === status);
      },

      getProjectsByTimeframe: (timeframe) => {
        return get().projects.filter(p => p.timeframe === timeframe);
      },
    }),
    {
      name: 'projects-storage',
    }
  )
);
