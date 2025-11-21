jest.mock('../config', () => ({
  CONFIG: {
    MAX_CONTEXT_ITEMS: {
      GOALS: 10,
      PROJECTS: 10,
      PEOPLE: 20,
      TASKS: 15,
      MOODS: 5,
    },
  },
}));

const mockFirestore = {
  collection: jest.fn(),
};

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => mockFirestore),
}));

import {
  getProcessingContext,
  formatContextForPrompt,
  ProcessingContext,
} from '../utils/contextGatherer';

describe('contextGatherer', () => {
  describe('getProcessingContext', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should gather all context types', async () => {
      const userId = 'user-123';

      const mockGoals = [
        { id: 'goal-1', data: () => ({ title: 'Fitness Goal', objective: 'Get fit' }) },
        { id: 'goal-2', data: () => ({ title: 'Career Goal', objective: 'Get promoted' }) },
      ];

      const mockProjects = [
        {
          id: 'project-1',
          data: () => ({ title: 'Website', description: 'Build website' }),
        },
      ];

      const mockPeople = [
        {
          id: 'person-1',
          data: () => ({
            name: 'John Doe',
            relationshipType: 'friend',
          }),
        },
      ];

      const mockTasks = [
        {
          id: 'task-1',
          data: () => ({ title: 'Complete report', category: 'work' }),
        },
      ];

      const mockMoods = [
        {
          id: 'mood-1',
          data: () => ({ value: 8, note: 'Feeling good' }),
        },
      ];

      mockFirestore.collection.mockImplementation((path: string) => {
        const baseRef = {
          limit: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn(),
        };

        if (path.includes('goals')) {
          baseRef.get.mockResolvedValue({ docs: mockGoals });
        } else if (path.includes('projects')) {
          baseRef.get.mockResolvedValue({ docs: mockProjects });
        } else if (path.includes('relationships')) {
          baseRef.get.mockResolvedValue({ docs: mockPeople });
        } else if (path.includes('tasks')) {
          baseRef.get.mockResolvedValue({ docs: mockTasks });
        } else if (path.includes('moods')) {
          baseRef.get.mockResolvedValue({ docs: mockMoods });
        }

        return baseRef;
      });

      const context = await getProcessingContext(userId);

      expect(context.goals).toHaveLength(2);
      expect(context.goals[0].title).toBe('Fitness Goal');
      expect(context.projects).toHaveLength(1);
      expect(context.people).toHaveLength(1);
      expect(context.people[0].shortName).toBe('john');
      expect(context.tasks).toHaveLength(1);
      expect(context.moods).toHaveLength(1);
    });

    it('should handle missing data fields gracefully', async () => {
      const userId = 'user-456';

      const mockGoals = [
        { id: 'goal-1', data: () => ({}) },
      ];

      const mockProjects = [
        { id: 'project-1', data: () => ({ title: 'Project' }) },
      ];

      const mockPeople = [
        { id: 'person-1', data: () => ({}) },
      ];

      const mockTasks = [
        { id: 'task-1', data: () => ({}) },
      ];

      const mockMoods = [
        { id: 'mood-1', data: () => ({}) },
      ];

      mockFirestore.collection.mockImplementation((path: string) => {
        const baseRef = {
          limit: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn(),
        };

        if (path.includes('goals')) {
          baseRef.get.mockResolvedValue({ docs: mockGoals });
        } else if (path.includes('projects')) {
          baseRef.get.mockResolvedValue({ docs: mockProjects });
        } else if (path.includes('relationships')) {
          baseRef.get.mockResolvedValue({ docs: mockPeople });
        } else if (path.includes('tasks')) {
          baseRef.get.mockResolvedValue({ docs: mockTasks });
        } else if (path.includes('moods')) {
          baseRef.get.mockResolvedValue({ docs: mockMoods });
        }

        return baseRef;
      });

      const context = await getProcessingContext(userId);

      expect(context.goals[0].title).toBe('');
      expect(context.goals[0].objective).toBe('');
      expect(context.projects[0].description).toBeUndefined();
      expect(context.people[0].name).toBe('');
      expect(context.tasks[0].title).toBe('');
      expect(context.moods[0].value).toBe(5);
    });

    it('should handle empty collections', async () => {
      const userId = 'user-789';

      mockFirestore.collection.mockImplementation(() => ({
        limit: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      }));

      const context = await getProcessingContext(userId);

      expect(context.goals).toEqual([]);
      expect(context.projects).toEqual([]);
      expect(context.people).toEqual([]);
      expect(context.tasks).toEqual([]);
      expect(context.moods).toEqual([]);
    });

    it('should extract short name from full name', async () => {
      const userId = 'user-short-name';

      const mockPeople = [
        {
          id: 'person-1',
          data: () => ({ name: 'Jane Smith' }),
        },
        {
          id: 'person-2',
          data: () => ({ name: 'Bob' }),
        },
      ];

      mockFirestore.collection.mockImplementation((path: string) => {
        const baseRef = {
          limit: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };

        if (path.includes('relationships')) {
          baseRef.get.mockResolvedValue({ docs: mockPeople });
        }

        return baseRef;
      });

      const context = await getProcessingContext(userId);

      expect(context.people[0].shortName).toBe('jane');
      expect(context.people[1].shortName).toBe('bob');
    });

    it('should query active tasks only', async () => {
      const userId = 'user-active-tasks';
      let taskWhereClause: any = null;

      mockFirestore.collection.mockImplementation((path: string) => {
        const baseRef: any = {
          limit: jest.fn().mockReturnThis(),
          where: jest.fn((...args: any[]) => {
            if (path.includes('tasks')) {
              taskWhereClause = args;
            }
            return baseRef;
          }),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };

        return baseRef;
      });

      await getProcessingContext(userId);

      expect(taskWhereClause).toEqual(['status', '==', 'active']);
    });

    it('should order moods by createdAt desc', async () => {
      const userId = 'user-moods-order';
      let moodsOrderBy: any = null;

      mockFirestore.collection.mockImplementation((path: string) => {
        const baseRef: any = {
          limit: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn((...args: any[]) => {
            if (path.includes('moods')) {
              moodsOrderBy = args;
            }
            return baseRef;
          }),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };

        return baseRef;
      });

      await getProcessingContext(userId);

      expect(moodsOrderBy).toEqual(['createdAt', 'desc']);
    });
  });

  describe('formatContextForPrompt', () => {
    it('should format all context sections', () => {
      const context: ProcessingContext = {
        goals: [
          { id: 'goal-1', title: 'Fitness', objective: 'Get healthy' },
        ],
        projects: [
          { id: 'project-1', title: 'Website', description: 'Build site' },
        ],
        people: [
          { id: 'person-1', name: 'John Doe', shortName: 'john', relationshipType: 'friend' },
        ],
        tasks: [
          { id: 'task-1', title: 'Complete report', category: 'work' },
        ],
        moods: [
          { value: 8, note: 'Feeling great' },
        ],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Goals (1):');
      expect(result).toContain('ID: goal-1');
      expect(result).toContain('Projects (1):');
      expect(result).toContain('ID: project-1');
      expect(result).toContain('People (1):');
      expect(result).toContain('John Doe');
      expect(result).toContain('(friend)');
      expect(result).toContain('Active Tasks (1):');
      expect(result).toContain('Complete report [work]');
      expect(result).toContain('Recent Moods (1):');
      expect(result).toContain('8/10 - Feeling great');
    });

    it('should handle empty context', () => {
      const context: ProcessingContext = {
        goals: [],
        projects: [],
        people: [],
        tasks: [],
        moods: [],
      };

      const result = formatContextForPrompt(context);

      expect(result).toBe('');
    });

    it('should format goals without extra fields', () => {
      const context: ProcessingContext = {
        goals: [
          { id: 'goal-1', title: 'Title', objective: 'Objective' },
        ],
        projects: [],
        people: [],
        tasks: [],
        moods: [],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Goals (1):');
      expect(result).toContain('ID: goal-1, Title: "Title", Objective: "Objective"');
    });

    it('should format projects without description', () => {
      const context: ProcessingContext = {
        goals: [],
        projects: [
          { id: 'project-1', title: 'Project Title' },
        ],
        people: [],
        tasks: [],
        moods: [],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Projects (1):');
      expect(result).toContain('ID: project-1, Title: "Project Title"');
      expect(result).not.toContain('Description:');
    });

    it('should format people without relationship type', () => {
      const context: ProcessingContext = {
        goals: [],
        projects: [],
        people: [
          { id: 'person-1', name: 'John', shortName: 'john' },
        ],
        tasks: [],
        moods: [],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('People (1):');
      expect(result).toContain('- John (shortname: john)');
      expect(result).not.toContain('(friend)');
    });

    it('should format tasks without category', () => {
      const context: ProcessingContext = {
        goals: [],
        projects: [],
        people: [],
        tasks: [
          { id: 'task-1', title: 'Task title' },
        ],
        moods: [],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Active Tasks (1):');
      expect(result).toContain('- Task title');
      expect(result).not.toContain('[');
    });

    it('should limit tasks display to 10', () => {
      const tasks = Array.from({ length: 15 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
      }));

      const context: ProcessingContext = {
        goals: [],
        projects: [],
        people: [],
        tasks,
        moods: [],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Active Tasks (15):');
      const taskMatches = result.match(/- Task \d+/g);
      expect(taskMatches?.length).toBe(10);
    });

    it('should format moods without note', () => {
      const context: ProcessingContext = {
        goals: [],
        projects: [],
        people: [],
        tasks: [],
        moods: [
          { value: 7 },
        ],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Recent Moods (1):');
      expect(result).toContain('- 7/10');
      expect(result).not.toContain(' - ');
    });

    it('should format multiple items correctly', () => {
      const context: ProcessingContext = {
        goals: [
          { id: 'goal-1', title: 'Goal 1', objective: 'Obj 1' },
          { id: 'goal-2', title: 'Goal 2', objective: 'Obj 2' },
        ],
        projects: [],
        people: [],
        tasks: [],
        moods: [],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Goals (2):');
      expect(result).toContain('ID: goal-1');
      expect(result).toContain('ID: goal-2');
    });

    it('should handle special characters in strings', () => {
      const context: ProcessingContext = {
        goals: [
          {
            id: 'goal-1',
            title: 'Goal with "quotes"',
            objective: 'Objective with \nnewline',
          },
        ],
        projects: [],
        people: [],
        tasks: [],
        moods: [],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Goal with "quotes"');
      expect(result).toContain('Objective with \nnewline');
    });
  });
});
