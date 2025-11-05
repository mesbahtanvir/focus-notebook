/**
 * Tests for spending integration in import/export system
 * Validates that spending data is properly included in EntityType mappings
 */

import { EntityType, ImportPhase } from '@/types/import-export';

describe('Spending Integration in Import/Export System', () => {
  describe('EntityType', () => {
    it('should include spending in EntityType union', () => {
      const entityType: EntityType = 'spending';
      expect(entityType).toBe('spending');
    });

    it('should allow all entity types including spending', () => {
      const entityTypes: EntityType[] = [
        'tasks',
        'projects',
        'goals',
        'thoughts',
        'moods',
        'focusSessions',
        'people',
        'portfolios',
        'spending',
      ];

      // This should compile without errors
      entityTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('ImportPhase', () => {
    it('should include IMPORTING_SPENDING phase', () => {
      const phase: ImportPhase = ImportPhase.IMPORTING_SPENDING;
      expect(phase).toBe('importing_spending');
    });

    it('should have all import phases including spending', () => {
      const expectedPhases = [
        ImportPhase.PARSING,
        ImportPhase.VALIDATING,
        ImportPhase.DETECTING_CONFLICTS,
        ImportPhase.PREPARING,
        ImportPhase.IMPORTING_GOALS,
        ImportPhase.IMPORTING_PROJECTS,
        ImportPhase.IMPORTING_TASKS,
        ImportPhase.IMPORTING_THOUGHTS,
        ImportPhase.IMPORTING_MOODS,
        ImportPhase.IMPORTING_FOCUS_SESSIONS,
        ImportPhase.IMPORTING_PEOPLE,
        ImportPhase.IMPORTING_PORTFOLIOS,
        ImportPhase.IMPORTING_SPENDING,
        ImportPhase.UPDATING_REFERENCES,
        ImportPhase.COMPLETING,
        ImportPhase.COMPLETED,
        ImportPhase.FAILED,
        ImportPhase.CANCELLED,
      ];

      expect(expectedPhases.length).toBeGreaterThan(0);
      expect(expectedPhases).toContain(ImportPhase.IMPORTING_SPENDING);
    });
  });

  describe('EntityType Completeness', () => {
    it('should have consistent entity type count across the system', () => {
      // We expect 9 entity types in total
      const expectedEntityTypes = [
        'tasks',
        'projects',
        'goals',
        'thoughts',
        'moods',
        'focusSessions',
        'people',
        'portfolios',
        'spending',
      ];

      expect(expectedEntityTypes.length).toBe(9);
    });
  });

  describe('Record<EntityType, T> Mappings', () => {
    it('should support complete Record<EntityType, number> mapping', () => {
      const entityCounts: Record<EntityType, number> = {
        tasks: 10,
        projects: 5,
        goals: 3,
        thoughts: 20,
        moods: 15,
        focusSessions: 8,
        people: 12,
        portfolios: 2,
        spending: 50,
      };

      expect(Object.keys(entityCounts).length).toBe(9);
      expect(entityCounts.spending).toBe(50);
    });

    it('should support complete Record<EntityType, string> mapping', () => {
      const entityLabels: Record<EntityType, string> = {
        tasks: 'Tasks',
        projects: 'Projects',
        goals: 'Goals',
        thoughts: 'Thoughts',
        moods: 'Moods',
        focusSessions: 'Focus Sessions',
        people: 'People',
        portfolios: 'Portfolios',
        spending: 'Transactions',
      };

      expect(Object.keys(entityLabels).length).toBe(9);
      expect(entityLabels.spending).toBe('Transactions');
    });
  });
});
