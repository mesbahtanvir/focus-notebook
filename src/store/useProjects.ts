import { createEntityStore, BaseEntity, BaseState, BaseActions } from './createEntityStore';

export type ProjectTimeframe = 'short-term' | 'long-term';
export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'cancelled';

export interface Project extends BaseEntity {
  title: string;
  objective: string;
  actionPlan: string[];
  description?: string;
  goalId?: string; // Connected to a goal (only for top-level projects)
  parentProjectId?: string; // For sub-projects (nested hierarchy)
  timeframe: ProjectTimeframe;
  status: ProjectStatus;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  targetDate?: string;
  completedAt?: string;
  category: 'health' | 'wealth' | 'mastery' | 'connection';
  linkedThoughtIds: string[];
  linkedTaskIds: string[];
  tags?: string[];
  progress?: number; // 0-100
  notes?: string;
  source?: 'manual' | 'ai' | 'thought';
  isLeaf?: boolean;
  level?: number;
  milestones?: {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string;
  }[];
}

// Extra actions specific to projects
interface ProjectExtraActions {
  projects: Project[];
  linkThought: (projectId: string, thoughtId: string) => Promise<void>;
  unlinkThought: (projectId: string, thoughtId: string) => Promise<void>;
  linkTask: (projectId: string, taskId: string) => Promise<void>;
  unlinkTask: (projectId: string, taskId: string) => Promise<void>;
  getProjectsByStatus: (status: ProjectStatus) => Project[];
  getProjectsByTimeframe: (timeframe: ProjectTimeframe) => Project[];
  getProjectsByGoal: (goalId: string) => Project[];
  getSubProjects: (projectId: string) => Project[];
  getTopLevelProjects: () => Project[];
  getProjectHierarchy: (projectId: string) => Project[];
  isLeafProject: (projectId: string) => boolean;
}

// Create the store with project-specific actions
export const useProjects = createEntityStore<Project, Omit<Project, 'id' | 'createdAt'>, ProjectExtraActions>(
  {
    collectionName: 'projects',
    defaultValues: {
      linkedThoughtIds: [],
      linkedTaskIds: [],
      priority: 'medium',
      status: 'active',
    } as Partial<Project>,
  },
  (set, get) => ({
    // Computed property for backward compatibility
    get projects() {
      return get().items;
    },

    // Link/unlink thoughts
    linkThought: async (projectId: string, thoughtId: string) => {
      const project = get().items.find((p) => p.id === projectId);
      if (!project) return;

      await get().update(projectId, {
        linkedThoughtIds: [...project.linkedThoughtIds, thoughtId],
      });
    },

    unlinkThought: async (projectId: string, thoughtId: string) => {
      const project = get().items.find((p) => p.id === projectId);
      if (!project) return;

      await get().update(projectId, {
        linkedThoughtIds: project.linkedThoughtIds.filter((id) => id !== thoughtId),
      });
    },

    // Link/unlink tasks
    linkTask: async (projectId: string, taskId: string) => {
      const project = get().items.find((p) => p.id === projectId);
      if (!project) return;

      await get().update(projectId, {
        linkedTaskIds: [...project.linkedTaskIds, taskId],
      });
    },

    unlinkTask: async (projectId: string, taskId: string) => {
      const project = get().items.find((p) => p.id === projectId);
      if (!project) return;

      await get().update(projectId, {
        linkedTaskIds: project.linkedTaskIds.filter((id) => id !== taskId),
      });
    },

    // Query helpers
    getProjectsByStatus: (status: ProjectStatus) => {
      return get().items.filter((p) => p.status === status);
    },

    getProjectsByTimeframe: (timeframe: ProjectTimeframe) => {
      return get().items.filter((p) => p.timeframe === timeframe);
    },

    getProjectsByGoal: (goalId: string) => {
      return get().items.filter((p) => p.goalId === goalId && !p.parentProjectId);
    },

    getSubProjects: (projectId: string) => {
      return get().items.filter((p) => p.parentProjectId === projectId);
    },

    getTopLevelProjects: () => {
      return get().items.filter((p) => !p.parentProjectId);
    },

    getProjectHierarchy: (projectId: string) => {
      const hierarchy: Project[] = [];
      let currentProject = get().items.find((p) => p.id === projectId);

      while (currentProject) {
        hierarchy.unshift(currentProject);
        if (currentProject.parentProjectId) {
          currentProject = get().items.find((p) => p.id === currentProject!.parentProjectId);
        } else {
          break;
        }
      }

      return hierarchy;
    },

    isLeafProject: (projectId: string) => {
      const project = get().items.find((p) => p.id === projectId);
      if (!project) return false;

      const hasSubProjects = get().items.some((p) => p.parentProjectId === projectId);
      return project.isLeaf !== false && !hasSubProjects;
    },
  })
);
