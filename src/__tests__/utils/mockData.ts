import {
  EntityCollection,
  ExportedData,
  ExportMetadata,
} from '@/types/import-export';

/**
 * Mock data for testing import/export functionality
 */

export const mockMetadata: ExportMetadata = {
  version: '1.0.0',
  exportedAt: '2025-10-28T12:00:00.000Z',
  userId: 'test-user-123',
  totalItems: 10,
  entityCounts: {
    tasks: 4,
    projects: 2,
    goals: 1,
    thoughts: 2,
    moods: 1,
    focusSessions: 0,
    people: 0,
  },
};

export const mockGoals = [
  {
    id: 'goal-1',
    title: 'Test Goal',
    objective: 'Test objective',
    timeframe: 'long-term' as const,
    status: 'in-progress',
    priority: 'high',
    progress: 50,
    tags: ['test', 'goal'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export const mockProjects = [
  {
    id: 'project-1',
    title: 'Test Project 1',
    objective: 'Test project objective',
    goalId: 'goal-1',
    status: 'active',
    priority: 'high',
    progress: 60,
    tags: ['test'],
    linkedTaskIds: ['task-1', 'task-2'],
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 'project-2',
    title: 'Test Project 2',
    objective: 'Another test project',
    parentProjectId: 'project-1',
    status: 'active',
    priority: 'medium',
    progress: 30,
    tags: ['test'],
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  },
];

export const mockTasks = [
  {
    id: 'task-1',
    title: 'Test Task 1',
    done: false,
    status: 'active' as const,
    priority: 'high' as const,
    category: 'mastery' as const,
    projectId: 'project-1',
    tags: ['test', 'urgent'],
    estimatedMinutes: 60,
    focusEligible: true,
    createdAt: '2025-01-04T00:00:00.000Z',
    updatedAt: '2025-01-04T00:00:00.000Z',
  },
  {
    id: 'task-2',
    title: 'Test Task 2',
    done: true,
    status: 'completed' as const,
    priority: 'medium' as const,
    category: 'pleasure' as const,
    projectId: 'project-1',
    thoughtId: 'thought-1',
    tags: ['test'],
    completedAt: '2025-01-05T00:00:00.000Z',
    createdAt: '2025-01-04T00:00:00.000Z',
    updatedAt: '2025-01-05T00:00:00.000Z',
  },
  {
    id: 'task-3',
    title: 'Test Task 3',
    done: false,
    status: 'backlog' as const,
    priority: 'low' as const,
    thoughtId: 'thought-2',
    tags: ['test'],
    createdAt: '2025-01-06T00:00:00.000Z',
    updatedAt: '2025-01-06T00:00:00.000Z',
  },
  {
    id: 'task-4',
    title: 'Test Task 4',
    done: false,
    status: 'active' as const,
    priority: 'urgent' as const,
    projectId: 'non-existent-project', // Broken reference
    tags: ['test'],
    createdAt: '2025-01-07T00:00:00.000Z',
    updatedAt: '2025-01-07T00:00:00.000Z',
  },
];

export const mockThoughts = [
  {
    id: 'thought-1',
    text: 'Test thought 1',
    tags: ['test', 'deep'],
    isDeepThought: true,
    linkedTaskIds: ['task-2'],
    linkedProjectIds: ['project-1'],
    createdAt: '2025-01-08T00:00:00.000Z',
    updatedAt: '2025-01-08T00:00:00.000Z',
  },
  {
    id: 'thought-2',
    text: 'Test thought 2',
    tags: ['test'],
    isDeepThought: false,
    linkedTaskIds: ['task-3'],
    createdAt: '2025-01-09T00:00:00.000Z',
    updatedAt: '2025-01-09T00:00:00.000Z',
  },
];

export const mockMoods = [
  {
    id: 'mood-1',
    value: 8,
    note: 'Feeling great',
    metadata: {
      sourceThoughtId: 'thought-1',
      createdBy: 'user' as const,
    },
    createdAt: '2025-01-10T00:00:00.000Z',
    updatedAt: '2025-01-10T00:00:00.000Z',
  },
];

export const mockEntityCollection: EntityCollection = {
  tasks: mockTasks,
  projects: mockProjects,
  goals: mockGoals,
  thoughts: mockThoughts,
  moods: mockMoods,
  focusSessions: [],
  people: [],
};

export const mockExportedData: ExportedData = {
  metadata: mockMetadata,
  data: mockEntityCollection,
};

// Invalid data for testing validation
export const invalidData = {
  // Missing metadata
  data: {
    tasks: [{ id: 'task-1' }], // Missing required fields
  },
};

export const invalidTaskData = {
  metadata: mockMetadata,
  data: {
    tasks: [
      {
        id: 'invalid-task',
        // Missing title
        done: 'not-a-boolean', // Wrong type
        status: 'invalid-status',
      },
    ],
  },
};

// Data with duplicate IDs for conflict testing
export const duplicateIdData: EntityCollection = {
  tasks: [
    {
      id: 'task-1', // Duplicate with mockTasks
      title: 'Duplicate Task',
      done: false,
      status: 'active' as const,
      priority: 'high' as const,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  projects: [],
  goals: [],
  thoughts: [],
  moods: [],
  focusSessions: [],
  people: [],
};

// Empty entity collection
export const emptyEntityCollection: EntityCollection = {
  tasks: [],
  projects: [],
  goals: [],
  thoughts: [],
  moods: [],
  focusSessions: [],
  people: [],
};

// Minimal valid export data
export const minimalValidData: ExportedData = {
  metadata: {
    version: '1.0.0',
    exportedAt: '2025-10-28T00:00:00.000Z',
    userId: 'test-user',
    totalItems: 1,
    entityCounts: {
      tasks: 1,
      projects: 0,
      goals: 0,
      thoughts: 0,
      moods: 0,
      focusSessions: 0,
      people: 0,
    },
  },
  data: {
    tasks: [
      {
        id: 'minimal-task-1',
        title: 'Minimal Task',
        done: false,
        status: 'active' as const,
        priority: 'medium' as const,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ],
    projects: [],
    goals: [],
    thoughts: [],
    moods: [],
    focusSessions: [],
    people: [],
  },
};
