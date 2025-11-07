/**
 * Test Data Generator for Prompts
 * Provides realistic sample data for testing YAML-based prompts
 */

export interface ThoughtTestData {
  thought: {
    id: string;
    text: string;
    type: string;
    tags: string[];
    createdAt: string;
  };
  context: {
    goals?: Array<{ title: string; status: string; objective?: string }>;
    projects?: Array<{ title: string; status: string; description?: string }>;
    tasks?: Array<{ title: string; category?: string; priority?: string }>;
    moods?: Array<{ value?: number; mood?: number; note?: string }>;
    relationships?: Array<{ name: string; relationshipType?: string; connectionStrength?: number }>;
    notes?: Array<{ title?: string; content?: string }>;
    errands?: Array<{ title?: string; category?: string }>;
  };
  toolReference?: string;
}

/**
 * Generate test data for process-thought prompt
 */
export function generateProcessThoughtTestData(): ThoughtTestData {
  return {
    thought: {
      id: 'test-thought-123',
      text: 'I need to learn React hooks and build a personal portfolio website. Also feeling stressed about the upcoming deadline.',
      type: 'mixed',
      tags: ['tool-tasks', 'tool-mood'],
      createdAt: new Date().toISOString(),
    },
    context: {
      goals: [
        { id: 'goal-react-dev', title: 'Master React Development', status: 'active', objective: 'Become proficient in React and modern web development' },
        { id: 'goal-personal-brand', title: 'Launch Personal Brand', status: 'active', objective: 'Build online presence through portfolio and content' },
      ],
      projects: [
        { id: 'project-portfolio-v2', title: 'Portfolio Website v2', status: 'active', description: 'Redesign portfolio with React and showcase recent projects' },
        { id: 'project-typescript', title: 'Learn Advanced TypeScript', status: 'active', description: 'Deep dive into TypeScript patterns and best practices' },
      ],
      tasks: [
        { id: 'task-react-hooks', title: 'Complete React hooks tutorial', category: 'mastery', priority: 'high' },
        { id: 'task-portfolio-mockup', title: 'Design portfolio mockup', category: 'mastery', priority: 'medium' },
        { id: 'task-hosting-research', title: 'Research hosting options', category: 'mastery', priority: 'low' },
      ],
      moods: [
        { value: 6, note: 'Feeling motivated but a bit overwhelmed' },
        { value: 7, note: 'Good progress on learning today' },
      ],
      relationships: [
        { id: 'rel-sarah-mentor', name: 'Sarah (Mentor)', relationshipType: 'professional', connectionStrength: 8 },
        { id: 'rel-alex-friend', name: 'Alex (Study Buddy)', relationshipType: 'friend', connectionStrength: 7 },
      ],
      notes: [
        { id: 'note-react-hooks', title: 'React Hooks Best Practices', content: 'Key points from documentation: useState, useEffect, custom hooks...' },
        { id: 'note-portfolio-inspiration', title: 'Portfolio Design Inspiration', content: 'Collection of great developer portfolios for reference' },
      ],
      errands: [
        { id: 'errand-laptop-charger', title: 'Buy new laptop charger', category: 'shopping' },
        { id: 'errand-dentist', title: 'Schedule dentist appointment', category: 'health' },
      ],
    },
    toolReference: '(Tool specs would be dynamically loaded based on enrolled tools)',
  };
}

/**
 * Generate minimal test data for process-thought prompt
 */
export function generateMinimalThoughtTestData(): ThoughtTestData {
  return {
    thought: {
      id: 'test-minimal-001',
      text: 'Need to finish the project report by Friday',
      type: 'task',
      tags: [],
      createdAt: new Date().toISOString(),
    },
    context: {},
  };
}

/**
 * Generate test data for brainstorming prompt
 */
export function generateBrainstormingTestData() {
  return {
    topic: 'Product features for a habit-tracking app',
    conversationHistory: [
      {
        role: 'user',
        content: 'What are some innovative features for a habit tracking app?',
      },
      {
        role: 'assistant',
        content: 'Here are some ideas: 1) Streak visualization with gamification, 2) Social accountability features, 3) AI-powered habit suggestions based on your goals',
      },
    ],
    context: {
      goals: [
        { title: 'Build a successful mobile app', status: 'active', objective: 'Launch and grow a habit tracking app' },
      ],
      projects: [
        { title: 'Habit Tracker MVP', status: 'active', description: 'Minimum viable product for habit tracking' },
      ],
    },
  };
}

/**
 * Generate test data for spending analysis prompt
 */
export function generateSpendingAnalysisTestData() {
  return {
    transactions: [
      { date: '2024-01-15', amount: 45.50, merchant: 'Whole Foods', category: 'groceries' },
      { date: '2024-01-16', amount: 12.99, merchant: 'Netflix', category: 'entertainment' },
      { date: '2024-01-17', amount: 85.00, merchant: 'Shell Gas Station', category: 'transportation' },
      { date: '2024-01-18', amount: 35.00, merchant: 'Chipotle', category: 'dining' },
      { date: '2024-01-19', amount: 120.00, merchant: 'Amazon', category: 'shopping' },
    ],
    timeframe: 'last 7 days',
    categories: ['groceries', 'dining', 'entertainment', 'transportation', 'shopping'],
  };
}

/**
 * Generate test data for any prompt by name
 * @param promptName - Name of the prompt
 * @returns Test data object
 */
export function generateTestDataForPrompt(promptName: string): any {
  switch (promptName) {
    case 'process-thought':
      return generateProcessThoughtTestData();
    case 'brainstorming':
      return generateBrainstormingTestData();
    case 'spending-analysis':
      return generateSpendingAnalysisTestData();
    default:
      throw new Error(`No test data generator available for prompt: ${promptName}`);
  }
}

/**
 * Format thought data for YAML prompt system
 * Converts from PromptParams format to variables + context
 */
export function formatThoughtForYAML(testData: ThoughtTestData) {
  return {
    variables: {
      thought: {
        text: testData.thought.text,
        type: testData.thought.type,
        tags: testData.thought.tags.join(', ') || 'none',
        createdAt: testData.thought.createdAt,
      },
      toolReference: testData.toolReference || '(Tool reference not provided)',
    },
    context: testData.context,
  };
}
