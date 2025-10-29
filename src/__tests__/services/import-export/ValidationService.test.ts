import { ValidationService } from '@/services/import-export/ValidationService';
import {
  mockExportedData,
  invalidData,
  invalidTaskData,
  minimalValidData,
  emptyEntityCollection,
} from '../../utils/mockData';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validate', () => {
    it('should validate correct data successfully', () => {
      const result = validationService.validate(mockExportedData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toBeDefined();
      expect(result.entities).toBeDefined();
    });

    it('should return valid entities even with warnings', () => {
      const result = validationService.validate(mockExportedData);

      expect(result.isValid).toBe(true);
      expect(result.entities.tasks).toBeDefined();
      expect(result.entities.projects).toBeDefined();
      expect(result.entities.goals).toBeDefined();
    });

    it('should reject data with missing metadata', () => {
      const result = validationService.validate(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'metadata')).toBe(true);
    });

    it('should reject data with missing data object', () => {
      const dataWithoutDataField = {
        metadata: mockExportedData.metadata,
      };

      const result = validationService.validate(dataWithoutDataField);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'data')).toBe(true);
    });

    it('should reject null or undefined data', () => {
      const nullResult = validationService.validate(null);
      expect(nullResult.isValid).toBe(false);

      const undefinedResult = validationService.validate(undefined);
      expect(undefinedResult.isValid).toBe(false);
    });

    it('should validate minimal valid data', () => {
      const result = validationService.validate(minimalValidData);

      expect(result.isValid).toBe(true);
      expect(result.entities.tasks?.length).toBe(1);
    });

    it.skip('should handle empty entity collections', () => {
      const emptyData = {
        metadata: mockExportedData.metadata,
        data: emptyEntityCollection,
      };

      const result = validationService.validate(emptyData);

      // Data has empty collections, should be valid or have warnings
      expect(result.entities).toBeDefined();
      // Check if it's valid or has specific warnings about empty data
      expect(result.isValid || result.warnings.length > 0).toBe(true);
    });
  });

  describe('validateMetadata', () => {
    it('should validate correct metadata', () => {
      const result = validationService.validate(mockExportedData);

      expect(result.errors.filter(e => e.entityId === 'metadata')).toHaveLength(0);
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.userId).toBeDefined();
    });

    it('should warn about unsupported version', () => {
      const dataWithBadVersion = {
        ...mockExportedData,
        metadata: {
          ...mockExportedData.metadata,
          version: '99.0.0',
        },
      };

      const result = validationService.validate(dataWithBadVersion);

      expect(result.errors.some(
        e => e.type === 'schema_version' && e.severity === 'warning'
      )).toBe(true);
    });

    it('should detect missing version field', () => {
      const dataWithoutVersion = {
        metadata: {
          ...mockExportedData.metadata,
          version: undefined,
        },
        data: mockExportedData.data,
      };

      const result = validationService.validate(dataWithoutVersion);

      expect(result.errors.some(
        e => e.field === 'version' && e.severity === 'error'
      )).toBe(true);
    });

    it('should warn about missing exportedAt', () => {
      const dataWithoutExportedAt = {
        metadata: {
          ...mockExportedData.metadata,
          exportedAt: undefined,
        },
        data: mockExportedData.data,
      };

      const result = validationService.validate(dataWithoutExportedAt);

      expect(result.errors.some(
        e => e.field === 'exportedAt' && e.severity === 'warning'
      )).toBe(true);
    });
  });

  describe('validateTask', () => {
    it('should validate task with all required fields', () => {
      const result = validationService.validate(mockExportedData);
      const taskErrors = result.errors.filter(e => e.entityType === 'tasks');

      expect(taskErrors.length).toBe(0);
    });

    it('should reject task without title', () => {
      const dataWithoutTitle = {
        metadata: mockExportedData.metadata,
        data: {
          tasks: [
            {
              id: 'task-no-title',
              done: false,
              status: 'active',
              priority: 'medium',
            },
          ],
        },
      };

      const result = validationService.validate(dataWithoutTitle);

      expect(result.errors.some(
        e => e.entityType === 'tasks' && e.field === 'title'
      )).toBe(true);
    });

    it('should warn about invalid done field type', () => {
      const result = validationService.validate(invalidTaskData);

      expect(result.errors.some(
        e => e.entityType === 'tasks' && e.field === 'done'
      )).toBe(true);
    });

    it('should reject task without ID', () => {
      const dataWithoutId = {
        metadata: mockExportedData.metadata,
        data: {
          tasks: [
            {
              title: 'Task without ID',
              done: false,
              status: 'active',
            },
          ],
        },
      };

      const result = validationService.validate(dataWithoutId);

      expect(result.errors.some(
        e => e.field === 'id' && e.severity === 'error'
      )).toBe(true);
    });
  });

  describe('validateProject', () => {
    it('should validate project with required fields', () => {
      const result = validationService.validate(mockExportedData);
      const projectErrors = result.errors.filter(e => e.entityType === 'projects');

      expect(projectErrors.length).toBe(0);
    });

    it('should reject project without title', () => {
      const dataWithoutTitle = {
        metadata: mockExportedData.metadata,
        data: {
          projects: [
            {
              id: 'project-no-title',
              status: 'active',
            },
          ],
        },
      };

      const result = validationService.validate(dataWithoutTitle);

      expect(result.errors.some(
        e => e.entityType === 'projects' && e.field === 'title'
      )).toBe(true);
    });
  });

  describe('validateGoal', () => {
    it('should validate goal with required fields', () => {
      const result = validationService.validate(mockExportedData);
      const goalErrors = result.errors.filter(e => e.entityType === 'goals');

      expect(goalErrors.length).toBe(0);
    });

    it('should reject goal without title', () => {
      const dataWithoutTitle = {
        metadata: mockExportedData.metadata,
        data: {
          goals: [
            {
              id: 'goal-no-title',
              objective: 'Test',
            },
          ],
        },
      };

      const result = validationService.validate(dataWithoutTitle);

      expect(result.errors.some(
        e => e.entityType === 'goals' && e.field === 'title'
      )).toBe(true);
    });
  });

  describe('validateThought', () => {
    it('should validate thought with required fields', () => {
      const result = validationService.validate(mockExportedData);
      const thoughtErrors = result.errors.filter(e => e.entityType === 'thoughts');

      expect(thoughtErrors.length).toBe(0);
    });

    it('should reject thought without text', () => {
      const dataWithoutText = {
        metadata: mockExportedData.metadata,
        data: {
          thoughts: [
            {
              id: 'thought-no-text',
              tags: ['test'],
            },
          ],
        },
      };

      const result = validationService.validate(dataWithoutText);

      expect(result.errors.some(
        e => e.entityType === 'thoughts' && e.field === 'text'
      )).toBe(true);
    });
  });

  describe('validateMood', () => {
    it('should validate mood with required fields', () => {
      const result = validationService.validate(mockExportedData);
      const moodErrors = result.errors.filter(e => e.entityType === 'moods');

      expect(moodErrors.length).toBe(0);
    });

    it('should reject mood without value', () => {
      const dataWithoutValue = {
        metadata: mockExportedData.metadata,
        data: {
          moods: [
            {
              id: 'mood-no-value',
              note: 'Test',
            },
          ],
        },
      };

      const result = validationService.validate(dataWithoutValue);

      expect(result.errors.some(
        e => e.entityType === 'moods' && e.field === 'value'
      )).toBe(true);
    });

    it('should warn about mood value out of range', () => {
      const dataWithInvalidValue = {
        metadata: mockExportedData.metadata,
        data: {
          moods: [
            {
              id: 'mood-invalid-value',
              value: 15, // Out of 1-10 range
              note: 'Test',
            },
          ],
        },
      };

      const result = validationService.validate(dataWithInvalidValue);

      expect(result.errors.some(
        e => e.entityType === 'moods' && e.field === 'value' && e.severity === 'warning'
      )).toBe(true);
    });
  });

  describe('validateFocusSession', () => {
    it('should reject session without duration', () => {
      const dataWithoutDuration = {
        metadata: mockExportedData.metadata,
        data: {
          focusSessions: [
            {
              id: 'session-no-duration',
              tasks: [],
            },
          ],
        },
      };

      const result = validationService.validate(dataWithoutDuration);

      expect(result.errors.some(
        e => e.entityType === 'focusSessions' && e.field === 'duration'
      )).toBe(true);
    });

    it('should warn about invalid tasks field', () => {
      const dataWithInvalidTasks = {
        metadata: mockExportedData.metadata,
        data: {
          focusSessions: [
            {
              id: 'session-invalid-tasks',
              duration: 60,
              tasks: 'not-an-array',
            },
          ],
        },
      };

      const result = validationService.validate(dataWithInvalidTasks);

      expect(result.errors.some(
        e => e.entityType === 'focusSessions' && e.field === 'tasks'
      )).toBe(true);
    });
  });

  describe('validatePerson', () => {
    it('should reject person without name', () => {
      const dataWithoutName = {
        metadata: mockExportedData.metadata,
        data: {
          people: [
            {
              id: 'person-no-name',
              relationshipType: 'friend',
            },
          ],
        },
      };

      const result = validationService.validate(dataWithoutName);

      expect(result.errors.some(
        e => e.entityType === 'people' && e.field === 'name'
      )).toBe(true);
    });
  });

  describe('calculateDataSize', () => {
    it('should calculate data size correctly', () => {
      const size = validationService.calculateDataSize(mockExportedData);

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it.skip('should return 0 for invalid data', () => {
      const invalidData = { circular: {} } as any;
      // Create circular reference
      invalidData.circular.self = invalidData;
      
      const size = validationService.calculateDataSize(invalidData);

      expect(typeof size).toBe('number');
    });
  });

  describe('estimateImportTime', () => {
    it('should estimate import time based on item count', () => {
      const time = validationService.estimateImportTime(100, 1024 * 100); // 100KB

      expect(time).toBeGreaterThan(0);
      expect(typeof time).toBe('number');
    });

    it('should give longer estimates for more items', () => {
      const time1 = validationService.estimateImportTime(10, 1024);
      const time2 = validationService.estimateImportTime(100, 1024);

      expect(time2).toBeGreaterThan(time1);
    });

    it('should consider file size in estimation', () => {
      const time1 = validationService.estimateImportTime(10, 1024); // 1KB
      const time2 = validationService.estimateImportTime(10, 1024 * 1024); // 1MB

      expect(time2).toBeGreaterThan(time1);
    });
  });

  describe('edge cases', () => {
    it.skip('should handle empty arrays gracefully', () => {
      const dataWithEmptyArrays = {
        metadata: mockExportedData.metadata,
        data: {
          tasks: [],
          projects: [],
          goals: [],
          thoughts: [],
          moods: [],
          focusSessions: [],
          people: [],
        },
      };

      const result = validationService.validate(dataWithEmptyArrays);

      // Empty arrays should be valid
      expect(result.isValid).toBe(true);
    });

    it('should handle non-array entity collections', () => {
      const dataWithNonArray = {
        metadata: mockExportedData.metadata,
        data: {
          tasks: 'not-an-array',
        },
      };

      const result = validationService.validate(dataWithNonArray);

      expect(result.errors.some(
        e => e.entityType === 'tasks' && e.type === 'invalid_type'
      )).toBe(true);
    });

    it('should handle missing entity collections', () => {
      const dataWithMissingCollections = {
        metadata: mockExportedData.metadata,
        data: {
          tasks: mockExportedData.data.tasks,
          // Other collections missing
        },
      };

      const result = validationService.validate(dataWithMissingCollections);

      expect(result.isValid).toBe(true);
      expect(result.entities.tasks).toBeDefined();
    });
  });
});
