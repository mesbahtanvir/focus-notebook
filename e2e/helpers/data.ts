import { Page } from '@playwright/test';

/**
 * Test data helpers for screenshot tests
 *
 * These helpers provide mock data for various entities in the app
 * to ensure consistent, reproducible screenshots.
 */

export interface MockTask {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly';
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface MockThought {
  id: string;
  content: string;
  title?: string;
  tags?: string[];
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface MockGoal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: 'active' | 'completed' | 'archived';
  progress?: number;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface MockProject {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface MockFocusSession {
  id: string;
  taskId?: string;
  duration: number;
  completedAt: number;
  userId: string;
  notes?: string;
}

/**
 * Generate sample tasks for testing
 */
export function generateMockTasks(count: number = 5, userId: string = 'test-user-123'): MockTask[] {
  const now = Date.now();
  const tasks: MockTask[] = [];

  for (let i = 0; i < count; i++) {
    tasks.push({
      id: `task-${i + 1}`,
      text: `Test Task ${i + 1}`,
      completed: i % 3 === 0,
      dueDate: new Date(now + (i - 2) * 24 * 60 * 60 * 1000).toISOString(),
      priority: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high',
      tags: i % 2 === 0 ? ['work', 'important'] : ['personal'],
      recurrenceType: i === 0 ? 'daily' : 'none',
      userId,
      createdAt: now - (count - i) * 60 * 60 * 1000,
      updatedAt: now - (count - i) * 60 * 60 * 1000,
    });
  }

  return tasks;
}

/**
 * Generate sample thoughts for testing
 */
export function generateMockThoughts(count: number = 3, userId: string = 'test-user-123'): MockThought[] {
  const now = Date.now();
  const thoughts: MockThought[] = [];

  for (let i = 0; i < count; i++) {
    thoughts.push({
      id: `thought-${i + 1}`,
      title: `Thought Title ${i + 1}`,
      content: `This is a test thought content for thought ${i + 1}. It contains some reflections and ideas.`,
      tags: i % 2 === 0 ? ['reflection', 'idea'] : ['journal'],
      userId,
      createdAt: now - (count - i) * 24 * 60 * 60 * 1000,
      updatedAt: now - (count - i) * 24 * 60 * 60 * 1000,
    });
  }

  return thoughts;
}

/**
 * Generate sample goals for testing
 */
export function generateMockGoals(count: number = 3, userId: string = 'test-user-123'): MockGoal[] {
  const now = Date.now();
  const goals: MockGoal[] = [];

  for (let i = 0; i < count; i++) {
    goals.push({
      id: `goal-${i + 1}`,
      title: `Goal ${i + 1}`,
      description: `Description for goal ${i + 1}`,
      targetDate: new Date(now + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: i === 0 ? 'completed' : 'active',
      progress: i === 0 ? 100 : (i + 1) * 25,
      userId,
      createdAt: now - (count - i) * 24 * 60 * 60 * 1000,
      updatedAt: now - (count - i) * 24 * 60 * 60 * 1000,
    });
  }

  return goals;
}

/**
 * Generate sample projects for testing
 */
export function generateMockProjects(count: number = 2, userId: string = 'test-user-123'): MockProject[] {
  const now = Date.now();
  const projects: MockProject[] = [];

  for (let i = 0; i < count; i++) {
    projects.push({
      id: `project-${i + 1}`,
      title: `Project ${i + 1}`,
      description: `Description for project ${i + 1}`,
      status: i === 0 ? 'completed' : 'active',
      userId,
      createdAt: now - (count - i) * 24 * 60 * 60 * 1000,
      updatedAt: now - (count - i) * 24 * 60 * 60 * 1000,
    });
  }

  return projects;
}

/**
 * Generate sample focus sessions for testing
 */
export function generateMockFocusSessions(count: number = 5, userId: string = 'test-user-123'): MockFocusSession[] {
  const now = Date.now();
  const sessions: MockFocusSession[] = [];

  for (let i = 0; i < count; i++) {
    sessions.push({
      id: `session-${i + 1}`,
      taskId: i % 2 === 0 ? `task-${i + 1}` : undefined,
      duration: [25, 50, 15][i % 3] * 60 * 1000, // 25min, 50min, 15min in ms
      completedAt: now - (count - i) * 24 * 60 * 60 * 1000,
      userId,
      notes: i % 2 === 0 ? `Notes for session ${i + 1}` : undefined,
    });
  }

  return sessions;
}

/**
 * Seed the page with mock data
 */
export async function seedMockData(page: Page, options: {
  tasks?: MockTask[];
  thoughts?: MockThought[];
  goals?: MockGoal[];
  projects?: MockProject[];
  focusSessions?: MockFocusSession[];
} = {}) {
  await page.addInitScript((mockData) => {
    // Store mock data in localStorage/sessionStorage
    if (mockData.tasks) {
      localStorage.setItem('mockTasks', JSON.stringify(mockData.tasks));
    }
    if (mockData.thoughts) {
      localStorage.setItem('mockThoughts', JSON.stringify(mockData.thoughts));
    }
    if (mockData.goals) {
      localStorage.setItem('mockGoals', JSON.stringify(mockData.goals));
    }
    if (mockData.projects) {
      localStorage.setItem('mockProjects', JSON.stringify(mockData.projects));
    }
    if (mockData.focusSessions) {
      localStorage.setItem('mockFocusSessions', JSON.stringify(mockData.focusSessions));
    }

    // Flag that mock data is available
    (window as any).__MOCK_DATA_LOADED__ = true;
  }, options);
}

/**
 * Clear all mock data
 */
export async function clearMockData(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('mockTasks');
    localStorage.removeItem('mockThoughts');
    localStorage.removeItem('mockGoals');
    localStorage.removeItem('mockProjects');
    localStorage.removeItem('mockFocusSessions');
  });
}
