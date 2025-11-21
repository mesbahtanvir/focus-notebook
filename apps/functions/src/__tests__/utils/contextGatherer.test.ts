/**
 * Unit tests for Context Gatherer
 */

import { formatContextForPrompt } from '../../utils/contextGatherer';
import type { ProcessingContext } from '../../utils/contextGatherer';

describe('Context Gatherer', () => {
  describe('formatContextForPrompt', () => {
    it('should format context with all sections', () => {
      const context: ProcessingContext = {
        goals: [
          { id: 'goal1', title: 'Lose weight', objective: 'Lose 10 pounds' },
          { id: 'goal2', title: 'Learn piano', objective: 'Practice daily' }
        ],
        projects: [
          { id: 'proj1', title: 'Website Redesign', description: 'Redesign company site' }
        ],
        people: [
          { id: 'p1', name: 'Sarah Johnson', shortName: 'sarah', relationshipType: 'friend' },
          { id: 'p2', name: 'John Doe', shortName: 'john' }
        ],
        tasks: [
          { id: 't1', title: 'Email client', category: 'mastery' },
          { id: 't2', title: 'Review code' }
        ],
        moods: [
          { value: 8, note: 'Feeling great' },
          { value: 6 }
        ]
      };

      const formatted = formatContextForPrompt(context);

      // Check all sections are present
      expect(formatted).toContain('Goals (2)');
      expect(formatted).toContain('Projects (1)');
      expect(formatted).toContain('People (2)');
      expect(formatted).toContain('Active Tasks (2)');
      expect(formatted).toContain('Recent Moods (2)');

      // Check goal formatting
      expect(formatted).toContain('ID: goal1, Title: "Lose weight", Objective: "Lose 10 pounds"');
      expect(formatted).toContain('ID: goal2, Title: "Learn piano", Objective: "Practice daily"');

      // Check project formatting
      expect(formatted).toContain('ID: proj1, Title: "Website Redesign", Description: "Redesign company site"');

      // Check people formatting
      expect(formatted).toContain('Sarah Johnson (shortname: sarah) (friend)');
      expect(formatted).toContain('John Doe (shortname: john)');

      // Check task formatting
      expect(formatted).toContain('Email client [mastery]');
      expect(formatted).toContain('Review code');

      // Check mood formatting
      expect(formatted).toContain('8/10 - Feeling great');
      expect(formatted).toContain('6/10');
    });

    it('should handle empty context gracefully', () => {
      const context: ProcessingContext = {
        goals: [],
        projects: [],
        people: [],
        tasks: [],
        moods: []
      };

      const formatted = formatContextForPrompt(context);

      expect(formatted).toBe('');
    });

    it('should handle partial context', () => {
      const context: ProcessingContext = {
        goals: [{ id: 'g1', title: 'Test goal', objective: 'Test' }],
        projects: [],
        people: [],
        tasks: [],
        moods: []
      };

      const formatted = formatContextForPrompt(context);

      expect(formatted).toContain('Goals (1)');
      expect(formatted).not.toContain('Projects');
      expect(formatted).not.toContain('People');
    });

    it('should limit tasks to 10 in output', () => {
      const tasks = Array.from({ length: 15 }, (_, i) => ({
        id: `t${i}`,
        title: `Task ${i}`
      }));

      const context: ProcessingContext = {
        goals: [],
        projects: [],
        people: [],
        tasks,
        moods: []
      };

      const formatted = formatContextForPrompt(context);

      expect(formatted).toContain('Active Tasks (15)');
      // Should only show first 10
      expect(formatted).toContain('Task 0');
      expect(formatted).toContain('Task 9');
      expect(formatted).not.toContain('Task 10');
      expect(formatted).not.toContain('Task 14');
    });

    it('should handle missing optional fields', () => {
      const context: ProcessingContext = {
        goals: [{ id: 'g1', title: 'Goal', objective: '' }],
        projects: [{ id: 'p1', title: 'Project' }],
        people: [{ id: 'per1', name: 'Alice', shortName: 'alice' }],
        tasks: [{ id: 't1', title: 'Task' }],
        moods: [{ value: 7 }]
      };

      const formatted = formatContextForPrompt(context);

      expect(formatted).toContain('Objective: ""'); // Empty objective
      expect(formatted).not.toContain('Description:'); // No description for project
      expect(formatted).toContain('Alice (shortname: alice)'); // No relationship type
      expect(formatted).toContain('Task'); // No category
      expect(formatted).toContain('7/10'); // No note
    });
  });
});
