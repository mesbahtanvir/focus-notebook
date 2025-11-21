import { Page } from '@playwright/test';
import {
  MockTask,
  MockThought,
  MockGoal,
  MockProject,
  MockFocusSession,
} from '../helpers/data';

/**
 * Baseline Data Fixture
 *
 * Provides a realistic, comprehensive dataset that simulates
 * a user who has been actively using the app for a few weeks.
 * This creates more realistic and useful screenshot baselines.
 */

export interface BaselineData {
  tasks: MockTask[];
  thoughts: MockThought[];
  goals: MockGoal[];
  projects: MockProject[];
  focusSessions: MockFocusSession[];
  friends?: any[];
  relationships?: any[];
  investments?: any[];
  trips?: any[];
  subscriptions?: any[];
}

/**
 * Generate comprehensive baseline data for a realistic user scenario
 */
export function generateBaselineData(userId: string = 'test-user-123'): BaselineData {
  const now = Date.now();
  const today = new Date(now);
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Tasks: Mix of completed, pending, and recurring
  const tasks: MockTask[] = [
    // Today's tasks
    {
      id: 'task-1',
      text: 'Review pull requests',
      completed: false,
      dueDate: today.toISOString(),
      priority: 'high',
      tags: ['work', 'urgent'],
      recurrenceType: 'daily',
      userId,
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'task-2',
      text: 'Prepare presentation slides for team meeting',
      completed: false,
      dueDate: today.toISOString(),
      priority: 'high',
      tags: ['work', 'presentation'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
      updatedAt: now - 2 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'task-3',
      text: 'Call dentist for appointment',
      completed: false,
      dueDate: today.toISOString(),
      priority: 'medium',
      tags: ['personal', 'health'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 1 * 24 * 60 * 60 * 1000,
      updatedAt: now - 1 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'task-4',
      text: 'Morning workout',
      completed: true,
      dueDate: today.toISOString(),
      priority: 'medium',
      tags: ['health', 'routine'],
      recurrenceType: 'daily',
      userId,
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      updatedAt: now,
    },
    // Tomorrow's tasks
    {
      id: 'task-5',
      text: 'Finish quarterly report',
      completed: false,
      dueDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      priority: 'high',
      tags: ['work', 'deadline'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 5 * 24 * 60 * 60 * 1000,
      updatedAt: now - 5 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'task-6',
      text: 'Review design mockups',
      completed: false,
      dueDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      priority: 'medium',
      tags: ['work', 'design'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 1 * 24 * 60 * 60 * 1000,
      updatedAt: now - 1 * 24 * 60 * 60 * 1000,
    },
    // This week
    {
      id: 'task-7',
      text: 'Weekly team sync',
      completed: false,
      dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'medium',
      tags: ['work', 'meeting'],
      recurrenceType: 'weekly',
      userId,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
      updatedAt: now - 7 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'task-8',
      text: 'Update project documentation',
      completed: false,
      dueDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'low',
      tags: ['work', 'documentation'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      updatedAt: now - 10 * 24 * 60 * 60 * 1000,
    },
    // Backlog
    {
      id: 'task-9',
      text: 'Research new JavaScript framework',
      completed: false,
      dueDate: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'low',
      tags: ['learning', 'work'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 20 * 24 * 60 * 60 * 1000,
      updatedAt: now - 20 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'task-10',
      text: 'Plan summer vacation',
      completed: false,
      dueDate: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'low',
      tags: ['personal', 'travel'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 15 * 24 * 60 * 60 * 1000,
      updatedAt: now - 15 * 24 * 60 * 60 * 1000,
    },
    // No due date
    {
      id: 'task-11',
      text: 'Organize digital photos',
      completed: false,
      priority: 'low',
      tags: ['personal', 'someday'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 25 * 24 * 60 * 60 * 1000,
      updatedAt: now - 25 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'task-12',
      text: 'Learn to play guitar',
      completed: false,
      priority: 'low',
      tags: ['personal', 'hobby', 'someday'],
      recurrenceType: 'none',
      userId,
      createdAt: now - 40 * 24 * 60 * 60 * 1000,
      updatedAt: now - 40 * 24 * 60 * 60 * 1000,
    },
  ];

  // Thoughts: Mix of recent reflections and journal entries
  const thoughts: MockThought[] = [
    {
      id: 'thought-1',
      title: 'Reflections on Team Collaboration',
      content: 'Today\'s standup meeting went really well. The team is communicating more effectively, and we\'re starting to see better alignment on priorities. Need to keep this momentum going.',
      tags: ['work', 'reflection', 'team'],
      userId,
      createdAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
      updatedAt: now - 2 * 60 * 60 * 1000,
    },
    {
      id: 'thought-2',
      title: 'Project Architecture Ideas',
      content: 'Been thinking about how to refactor the authentication system. Maybe we should consider implementing OAuth 2.0 with refresh tokens. This would improve security and user experience.',
      tags: ['work', 'technical', 'ideas'],
      userId,
      createdAt: yesterday.getTime(),
      updatedAt: yesterday.getTime(),
    },
    {
      id: 'thought-3',
      title: 'Weekend Plans and Balance',
      content: 'Realizing I need to be more intentional about work-life balance. This weekend, going to disconnect from work completely and spend time with family. Mental health is just as important as productivity.',
      tags: ['personal', 'wellness', 'balance'],
      userId,
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'thought-4',
      title: 'Learning Notes: React Server Components',
      content: 'Server components are a game-changer for React applications. Key takeaways: better performance, reduced bundle size, direct database access. Need to experiment with this in the next project.',
      tags: ['learning', 'technical', 'react'],
      userId,
      createdAt: now - 5 * 24 * 60 * 60 * 1000,
      updatedAt: now - 5 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'thought-5',
      title: 'Morning Motivation',
      content: 'Starting the day with gratitude. Grateful for: supportive team, interesting projects, good health. Setting intention: be present and focused today.',
      tags: ['personal', 'gratitude', 'motivation'],
      userId,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
      updatedAt: now - 7 * 24 * 60 * 60 * 1000,
    },
  ];

  // Goals: Mix of in-progress and completed
  const goals: MockGoal[] = [
    {
      id: 'goal-1',
      title: 'Launch New Product Feature',
      description: 'Complete and ship the user dashboard redesign with analytics integration',
      targetDate: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      progress: 65,
      userId,
      createdAt: now - 45 * 24 * 60 * 60 * 1000,
      updatedAt: now - 1 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'goal-2',
      title: 'Read 12 Books This Year',
      description: 'Commit to reading one book per month to expand knowledge and perspective',
      targetDate: new Date(now + 180 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      progress: 42, // 5 books done
      userId,
      createdAt: now - 120 * 24 * 60 * 60 * 1000,
      updatedAt: now - 10 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'goal-3',
      title: 'Get AWS Certification',
      description: 'Study and pass AWS Solutions Architect Associate exam',
      targetDate: new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      progress: 30,
      userId,
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      updatedAt: now - 2 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'goal-4',
      title: 'Run a 10K Race',
      description: 'Train consistently and complete a 10K run in under 60 minutes',
      targetDate: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      progress: 55,
      userId,
      createdAt: now - 60 * 24 * 60 * 60 * 1000,
      updatedAt: now - 1 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'goal-5',
      title: 'Complete Online Course on Machine Learning',
      description: 'Finish Stanford\'s ML course and build a practical project',
      targetDate: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), // Past due
      status: 'completed',
      progress: 100,
      userId,
      createdAt: now - 120 * 24 * 60 * 60 * 1000,
      updatedAt: now - 10 * 24 * 60 * 60 * 1000,
    },
  ];

  // Projects: Active development projects
  const projects: MockProject[] = [
    {
      id: 'project-1',
      title: 'E-commerce Platform Redesign',
      description: 'Complete overhaul of the shopping experience with improved UX and performance',
      status: 'active',
      userId,
      createdAt: now - 45 * 24 * 60 * 60 * 1000,
      updatedAt: now - 1 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'project-2',
      title: 'Mobile App Development',
      description: 'Build native iOS and Android apps using React Native',
      status: 'active',
      userId,
      createdAt: now - 60 * 24 * 60 * 60 * 1000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'project-3',
      title: 'API Documentation Portal',
      description: 'Create comprehensive developer documentation with interactive examples',
      status: 'active',
      userId,
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      updatedAt: now - 5 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'project-4',
      title: 'CI/CD Pipeline Setup',
      description: 'Automate testing and deployment process using GitHub Actions',
      status: 'completed',
      userId,
      createdAt: now - 90 * 24 * 60 * 60 * 1000,
      updatedAt: now - 20 * 24 * 60 * 60 * 1000,
    },
  ];

  // Focus Sessions: Recent work sessions
  const focusSessions: MockFocusSession[] = [
    // Today
    {
      id: 'session-1',
      taskId: 'task-1',
      duration: 25 * 60 * 1000, // 25 minutes
      completedAt: now - 2 * 60 * 60 * 1000,
      userId,
      notes: 'Reviewed 3 PRs, left detailed feedback',
    },
    {
      id: 'session-2',
      taskId: 'task-2',
      duration: 50 * 60 * 1000, // 50 minutes
      completedAt: now - 30 * 60 * 1000,
      userId,
      notes: 'Created outline and first 5 slides',
    },
    // Yesterday
    {
      id: 'session-3',
      taskId: 'task-1',
      duration: 25 * 60 * 1000,
      completedAt: yesterday.getTime() - 3 * 60 * 60 * 1000,
      userId,
      notes: 'Code review session',
    },
    {
      id: 'session-4',
      taskId: 'task-5',
      duration: 25 * 60 * 1000,
      completedAt: yesterday.getTime() - 5 * 60 * 60 * 1000,
      userId,
      notes: 'Started drafting quarterly report',
    },
    {
      id: 'session-5',
      duration: 15 * 60 * 1000, // Break
      completedAt: yesterday.getTime() - 6 * 60 * 60 * 1000,
      userId,
      notes: 'Short break and planning',
    },
    // Earlier this week
    {
      id: 'session-6',
      taskId: 'task-6',
      duration: 25 * 60 * 1000,
      completedAt: now - 2 * 24 * 60 * 60 * 1000,
      userId,
      notes: 'Design review and feedback',
    },
    {
      id: 'session-7',
      taskId: 'task-8',
      duration: 25 * 60 * 1000,
      completedAt: now - 3 * 24 * 60 * 60 * 1000,
      userId,
      notes: 'Documentation updates',
    },
    {
      id: 'session-8',
      duration: 25 * 60 * 1000,
      completedAt: now - 4 * 24 * 60 * 60 * 1000,
      userId,
      notes: 'General focus session',
    },
    {
      id: 'session-9',
      taskId: 'task-9',
      duration: 50 * 60 * 1000,
      completedAt: now - 5 * 24 * 60 * 60 * 1000,
      userId,
      notes: 'Research and learning',
    },
    {
      id: 'session-10',
      duration: 25 * 60 * 1000,
      completedAt: now - 6 * 24 * 60 * 60 * 1000,
      userId,
      notes: 'Morning focus session',
    },
  ];

  return {
    tasks,
    thoughts,
    goals,
    projects,
    focusSessions,
  };
}

/**
 * Seed baseline data into the page for testing
 */
export async function seedBaselineData(page: Page, userId: string = 'test-user-123') {
  const data = generateBaselineData(userId);

  await page.addInitScript((baselineData) => {
    // Store baseline data in localStorage
    localStorage.setItem('mockTasks', JSON.stringify(baselineData.tasks));
    localStorage.setItem('mockThoughts', JSON.stringify(baselineData.thoughts));
    localStorage.setItem('mockGoals', JSON.stringify(baselineData.goals));
    localStorage.setItem('mockProjects', JSON.stringify(baselineData.projects));
    localStorage.setItem('mockFocusSessions', JSON.stringify(baselineData.focusSessions));

    // Flag that baseline data is loaded
    (window as any).__BASELINE_DATA_LOADED__ = true;
  }, data);

  return data;
}
