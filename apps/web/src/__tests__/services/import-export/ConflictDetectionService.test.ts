import { ConflictDetectionService } from '@/services/import-export/ConflictDetectionService';
import { ConflictType, ConflictResolution } from '@/types/import-export';
import {
  mockEntityCollection,
  duplicateIdData,
  emptyEntityCollection,
} from '../../utils/mockData';

describe('ConflictDetectionService', () => {
  let conflictService: ConflictDetectionService;

  beforeEach(() => {
    conflictService = new ConflictDetectionService();
  });

  describe('detectConflicts', () => {
    it('should detect no conflicts when data is clean', async () => {
      const result = await conflictService.detectConflicts(
        emptyEntityCollection,
        emptyEntityCollection
      );

      expect(result.totalConflicts).toBe(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.hasBlockingConflicts).toBe(false);
    });

    it('should detect duplicate ID conflicts', async () => {
      const result = await conflictService.detectConflicts(
        duplicateIdData,
        mockEntityCollection
      );

      expect(result.totalConflicts).toBeGreaterThan(0);
      expect(result.conflicts.some(
        c => c.type === ConflictType.DUPLICATE_ID
      )).toBe(true);
    });

    it('should detect broken reference conflicts', async () => {
      const result = await conflictService.detectConflicts(
        mockEntityCollection,
        emptyEntityCollection
      );

      // task-4 references non-existent project
      const brokenRefConflicts = result.conflicts.filter(
        c => c.type === ConflictType.BROKEN_REFERENCE
      );

      expect(brokenRefConflicts.length).toBeGreaterThan(0);
      expect(result.hasBlockingConflicts).toBe(true);
    });

    it('should categorize conflicts by type', async () => {
      const result = await conflictService.detectConflicts(
        mockEntityCollection,
        emptyEntityCollection
      );

      expect(result.conflictsByType).toBeDefined();
      expect(typeof result.conflictsByType[ConflictType.DUPLICATE_ID]).toBe('number');
      expect(typeof result.conflictsByType[ConflictType.BROKEN_REFERENCE]).toBe('number');
    });

    it('should handle empty entity collections', async () => {
      const result = await conflictService.detectConflicts(
        emptyEntityCollection,
        emptyEntityCollection
      );

      expect(result.totalConflicts).toBe(0);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('detectDuplicateIds', () => {
    it('should find duplicate task IDs', async () => {
      const result = await conflictService.detectConflicts(
        duplicateIdData,
        mockEntityCollection
      );

      const taskConflicts = result.conflicts.filter(
        c => c.entityType === 'tasks' && c.type === ConflictType.DUPLICATE_ID
      );

      expect(taskConflicts.length).toBeGreaterThan(0);
      expect(taskConflicts[0].entityId).toBe('task-1');
      expect(taskConflicts[0].suggestedResolution).toBe(ConflictResolution.SKIP);
    });

    it('should include both existing and imported items in conflict', async () => {
      const result = await conflictService.detectConflicts(
        duplicateIdData,
        mockEntityCollection
      );

      const taskConflict = result.conflicts.find(
        c => c.entityId === 'task-1'
      );

      expect(taskConflict?.existingItem).toBeDefined();
      expect(taskConflict?.importedItem).toBeDefined();
      expect(taskConflict?.existingItem.id).toBe(taskConflict?.importedItem.id);
    });

    it('should detect duplicates across all entity types', async () => {
      const multiDuplicateData = {
        tasks: [{ ...mockEntityCollection.tasks[0] }],
        projects: [{ ...mockEntityCollection.projects[0] }],
        goals: [{ ...mockEntityCollection.goals[0] }],
        thoughts: [],
        moods: [],
        focusSessions: [],
        people: [],
      };

      const result = await conflictService.detectConflicts(
        multiDuplicateData,
        mockEntityCollection
      );

      expect(result.conflicts.filter(c => c.entityType === 'tasks').length).toBeGreaterThan(0);
      expect(result.conflicts.filter(c => c.entityType === 'projects').length).toBeGreaterThan(0);
      expect(result.conflicts.filter(c => c.entityType === 'goals').length).toBeGreaterThan(0);
    });

    it('should generate proper conflict messages', async () => {
      const result = await conflictService.detectConflicts(
        duplicateIdData,
        mockEntityCollection
      );

      const conflict = result.conflicts[0];
      expect(conflict.message).toContain('already exists');
      expect(conflict.message).toContain(conflict.entityId);
    });
  });

  describe('detectBrokenReferences', () => {
    it('should detect broken projectId reference in tasks', async () => {
      const result = await conflictService.detectConflicts(
        mockEntityCollection,
        emptyEntityCollection
      );

      const brokenProjectRefs = result.conflicts.filter(
        c => c.entityType === 'tasks' &&
        c.details?.referencedEntity === 'projects'
      );

      expect(brokenProjectRefs.length).toBeGreaterThan(0);
      expect(brokenProjectRefs[0].details?.fieldName).toBe('projectId');
    });

    it('should detect broken thoughtId reference in tasks', async () => {
      // Remove thoughts to create broken references
      const dataWithBrokenRefs = {
        ...mockEntityCollection,
        thoughts: [],
      };

      const result = await conflictService.detectConflicts(
        dataWithBrokenRefs,
        emptyEntityCollection
      );

      const brokenThoughtRefs = result.conflicts.filter(
        c => c.entityType === 'tasks' &&
        c.details?.referencedEntity === 'thoughts'
      );

      expect(brokenThoughtRefs.length).toBeGreaterThan(0);
    });

    it('should detect broken goalId reference in projects', async () => {
      // Remove goals to create broken references
      const dataWithBrokenRefs = {
        ...mockEntityCollection,
        goals: [],
      };

      const result = await conflictService.detectConflicts(
        dataWithBrokenRefs,
        emptyEntityCollection
      );

      const brokenGoalRefs = result.conflicts.filter(
        c => c.entityType === 'projects' &&
        c.details?.referencedEntity === 'goals'
      );

      expect(brokenGoalRefs.length).toBeGreaterThan(0);
    });

    it('should detect broken parentProjectId reference', async () => {
      // Remove parent project to create broken reference
      const dataWithBrokenRefs = {
        ...mockEntityCollection,
        projects: [mockEntityCollection.projects[1]], // Only child project
      };

      const result = await conflictService.detectConflicts(
        dataWithBrokenRefs,
        emptyEntityCollection
      );

      const brokenParentRefs = result.conflicts.filter(
        c => c.entityType === 'projects' &&
        c.details?.fieldName === 'parentProjectId'
      );

      expect(brokenParentRefs.length).toBeGreaterThan(0);
    });

    it.skip('should detect broken linkedTaskIds in thoughts', async () => {
      // NOTE: Thought linking now uses relationships store, not linkedXIds arrays
      // Remove tasks to create broken references
      const dataWithBrokenRefs = {
        ...mockEntityCollection,
        tasks: [],
      };

      const result = await conflictService.detectConflicts(
        dataWithBrokenRefs,
        emptyEntityCollection
      );

      const brokenTaskRefs = result.conflicts.filter(
        c => c.entityType === 'thoughts' &&
        c.details?.referencedEntity === 'tasks'
      );

      expect(brokenTaskRefs.length).toBeGreaterThan(0);
    });

    it.skip('should detect broken linkedProjectIds in thoughts', async () => {
      // NOTE: Thought linking now uses relationships store, not linkedXIds arrays
      // Remove projects to create broken references
      const dataWithBrokenRefs = {
        ...mockEntityCollection,
        projects: [],
      };

      const result = await conflictService.detectConflicts(
        dataWithBrokenRefs,
        emptyEntityCollection
      );

      const brokenProjectRefs = result.conflicts.filter(
        c => c.entityType === 'thoughts' &&
        c.details?.referencedEntity === 'projects'
      );

      expect(brokenProjectRefs.length).toBeGreaterThan(0);
    });

    it.skip('should detect broken linkedMoodIds in thoughts', async () => {
      // NOTE: Thought linking now uses relationships store, not linkedXIds arrays
      // Create thought with broken mood reference
      const dataWithBrokenRefs = {
        tasks: [],
        projects: [],
        goals: [],
        thoughts: [{
          id: 'thought-with-broken-mood',
          text: 'Test',
          linkedMoodIds: ['non-existent-mood'],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }],
        moods: [],
        focusSessions: [],
        people: [],
      };

      const result = await conflictService.detectConflicts(
        dataWithBrokenRefs,
        emptyEntityCollection
      );

      const brokenMoodRefs = result.conflicts.filter(
        c => c.entityType === 'thoughts' &&
        c.details?.referencedEntity === 'moods'
      );

      expect(brokenMoodRefs.length).toBeGreaterThan(0);
    });

    it.skip('should detect broken linkedThoughtIds in people', async () => {
      // NOTE: Person linking now uses relationships store, not linkedThoughtIds array
      // Create person with broken thought reference
      const dataWithBrokenRefs = {
        tasks: [],
        projects: [],
        goals: [],
        thoughts: [],
        moods: [],
        focusSessions: [],
        people: [{
          id: 'person-with-broken-thought',
          name: 'Test Person',
          relationshipType: 'friend' as const,
          connectionStrength: 5,
          trustLevel: 5,
          linkedThoughtIds: ['non-existent-thought'],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }],
      };

      const result = await conflictService.detectConflicts(
        dataWithBrokenRefs,
        emptyEntityCollection
      );

      const brokenThoughtRefs = result.conflicts.filter(
        c => c.entityType === 'people' &&
        c.details?.referencedEntity === 'thoughts'
      );

      expect(brokenThoughtRefs.length).toBeGreaterThan(0);
    });

    it('should suggest ASK_USER resolution for broken references', async () => {
      const result = await conflictService.detectConflicts(
        mockEntityCollection,
        emptyEntityCollection
      );

      const brokenRefConflicts = result.conflicts.filter(
        c => c.type === ConflictType.BROKEN_REFERENCE
      );

      brokenRefConflicts.forEach(conflict => {
        expect(conflict.suggestedResolution).toBe(ConflictResolution.ASK_USER);
      });
    });
  });

  describe('isBlockingConflict', () => {
    it('should identify broken references as blocking', () => {
      const brokenRefConflict = {
        id: 'conflict-1',
        type: ConflictType.BROKEN_REFERENCE,
        entityType: 'tasks' as const,
        entityId: 'task-1',
        message: 'Test',
        suggestedResolution: ConflictResolution.SKIP,
      };

      expect(conflictService.isBlockingConflict(brokenRefConflict)).toBe(true);
    });

    it('should not identify duplicate IDs as blocking', () => {
      const duplicateConflict = {
        id: 'conflict-1',
        type: ConflictType.DUPLICATE_ID,
        entityType: 'tasks' as const,
        entityId: 'task-1',
        message: 'Test',
        suggestedResolution: ConflictResolution.SKIP,
      };

      expect(conflictService.isBlockingConflict(duplicateConflict)).toBe(false);
    });
  });

  describe('getConflictsNeedingResolution', () => {
    it('should return conflicts without resolution', async () => {
      const result = await conflictService.detectConflicts(
        mockEntityCollection,
        emptyEntityCollection
      );

      const needingResolution = conflictService.getConflictsNeedingResolution(
        result.conflicts
      );

      expect(needingResolution.length).toBeGreaterThan(0);
      needingResolution.forEach(conflict => {
        expect(conflict.resolution).toBeUndefined();
      });
    });

    it('should exclude conflicts with resolution', async () => {
      const result = await conflictService.detectConflicts(
        duplicateIdData,
        mockEntityCollection
      );

      // Resolve one conflict
      if (result.conflicts.length > 0) {
        result.conflicts[0].resolution = ConflictResolution.SKIP;
      }

      const needingResolution = conflictService.getConflictsNeedingResolution(
        result.conflicts
      );

      expect(needingResolution.length).toBe(result.conflicts.length - 1);
    });
  });

  describe('edge cases', () => {
    it('should handle entities with missing reference fields', async () => {
      const dataWithMissingFields = {
        tasks: [{
          id: 'task-no-refs',
          title: 'Task',
          done: false,
          status: 'active' as const,
          priority: 'medium' as const,
          // No projectId or thoughtId
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }],
        projects: [],
        goals: [],
        thoughts: [],
        moods: [],
        focusSessions: [],
        people: [],
      };

      const result = await conflictService.detectConflicts(
        dataWithMissingFields,
        emptyEntityCollection
      );

      // Should not create conflicts for missing optional fields
      expect(result.totalConflicts).toBe(0);
    });

    it('should handle circular references gracefully', async () => {
      const circularData = {
        tasks: [],
        projects: [
          {
            id: 'project-a',
            title: 'Project A',
            objective: 'Test objective A',
            actionPlan: ['Step 1'],
            timeframe: 'short-term' as const,
            category: 'mastery' as const,
            parentProjectId: 'project-b',
            status: 'active' as const,
            priority: 'medium' as const,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: Date.parse('2025-01-01T00:00:00.000Z'),
          },
          {
            id: 'project-b',
            title: 'Project B',
            objective: 'Test objective B',
            actionPlan: ['Step 1'],
            timeframe: 'short-term' as const,
            category: 'mastery' as const,
            parentProjectId: 'project-a',
            status: 'active' as const,
            priority: 'medium' as const,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: Date.parse('2025-01-01T00:00:00.000Z'),
          },
        ],
        goals: [],
        thoughts: [],
        moods: [],
        focusSessions: [],
        people: [],
      };

      const result = await conflictService.detectConflicts(
        circularData,
        emptyEntityCollection
      );

      // Should detect conflicts but not crash
      expect(result).toBeDefined();
    });

    it('should handle empty arrays in reference fields', async () => {
      const dataWithEmptyArrays = {
        tasks: [],
        projects: [],
        goals: [],
        thoughts: [{
          id: 'thought-empty-arrays',
          text: 'Test',
          linkedProjectIds: [],
          linkedMoodIds: [],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }],
        moods: [],
        focusSessions: [],
        people: [],
      };

      const result = await conflictService.detectConflicts(
        dataWithEmptyArrays,
        emptyEntityCollection
      );

      // Empty arrays should not create conflicts
      expect(result.totalConflicts).toBe(0);
    });
  });
});
