import { ExportService } from '@/services/import-export/ExportService';
import { ExportFilterOptions, EntityType } from '@/types/import-export';
import { mockEntityCollection, emptyEntityCollection } from '../../utils/mockData';

describe('ExportService', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService();
  });

  describe('exportAll', () => {
    it('should export all data with metadata', async () => {
      const result = await exportService.exportAll(mockEntityCollection, 'test-user');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.userId).toBe('test-user');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.exportedAt).toBeDefined();
      expect(result.data).toEqual(mockEntityCollection);
    });

    it('should calculate total items correctly', async () => {
      const result = await exportService.exportAll(mockEntityCollection, 'test-user');

      const expectedTotal =
        mockEntityCollection.tasks.length +
        mockEntityCollection.projects.length +
        mockEntityCollection.goals.length +
        mockEntityCollection.thoughts.length +
        mockEntityCollection.moods.length +
        mockEntityCollection.focusSessions.length +
        mockEntityCollection.people.length;

      expect(result.metadata.totalItems).toBe(expectedTotal);
    });

    it('should calculate entity counts correctly', async () => {
      const result = await exportService.exportAll(mockEntityCollection, 'test-user');

      expect(result.metadata.entityCounts.tasks).toBe(mockEntityCollection.tasks.length);
      expect(result.metadata.entityCounts.projects).toBe(mockEntityCollection.projects.length);
      expect(result.metadata.entityCounts.goals).toBe(mockEntityCollection.goals.length);
      expect(result.metadata.entityCounts.thoughts).toBe(mockEntityCollection.thoughts.length);
      expect(result.metadata.entityCounts.moods).toBe(mockEntityCollection.moods.length);
    });

    it('should handle empty collection', async () => {
      const result = await exportService.exportAll(emptyEntityCollection, 'test-user');

      expect(result.metadata.totalItems).toBe(0);
      expect(result.data).toEqual(emptyEntityCollection);
    });
  });

  describe('exportWithFilters', () => {
    it('should filter by entity types', async () => {
      const filters: ExportFilterOptions = {
        entities: ['tasks', 'projects'],
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.tasks).toBeDefined();
      expect(result.data.projects).toBeDefined();
      expect(result.data.goals).toBeUndefined();
      expect(result.data.thoughts).toBeUndefined();
    });

    it('should filter tasks by status', async () => {
      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        status: ['active'],
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.tasks?.every(t => t.status === 'active')).toBe(true);
    });

    it('should filter tasks by category', async () => {
      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        categories: ['mastery'],
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.tasks?.every(t => t.category === 'mastery')).toBe(true);
    });

    it('should filter tasks by tags', async () => {
      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        tags: ['urgent'],
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.tasks?.every(
        t => t.tags && t.tags.includes('urgent')
      )).toBe(true);
    });

    it('should exclude completed items when specified', async () => {
      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        includeCompleted: false,
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.tasks?.every(t => !t.done)).toBe(true);
    });

    it('should filter by date range', async () => {
      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        dateRange: {
          start: new Date('2025-01-04T00:00:00.000Z'),
          end: new Date('2025-01-06T00:00:00.000Z'),
        },
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      result.data.tasks?.forEach(task => {
        const createdDate = new Date(task.createdAt);
        expect(createdDate >= filters.dateRange!.start).toBe(true);
        expect(createdDate <= filters.dateRange!.end).toBe(true);
      });
    });

    it('should filter projects by status', async () => {
      const filters: ExportFilterOptions = {
        entities: ['projects'],
        status: ['active'],
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.projects?.every(p => p.status === 'active')).toBe(true);
    });

    it('should filter goals by status', async () => {
      const filters: ExportFilterOptions = {
        entities: ['goals'],
        status: ['active'],
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.goals?.every(g => g.status === 'active')).toBe(true);
    });

    it('should filter thoughts by tags', async () => {
      const filters: ExportFilterOptions = {
        entities: ['thoughts'],
        tags: ['test'],
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.thoughts?.every(
        t => t.tags && t.tags.includes('test')
      )).toBe(true);
    });

    it('should handle multiple filters simultaneously', async () => {
      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        status: ['active'],
        categories: ['mastery'],
        tags: ['test'],
        includeCompleted: false,
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      result.data.tasks?.forEach(task => {
        expect(task.status).toBe('active');
        expect(task.category).toBe('mastery');
        expect(task.tags).toContain('test');
        expect(task.done).toBe(false);
      });
    });

    it('should return empty arrays for no matches', async () => {
      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        status: ['non-existent-status'],
      };

      const result = await exportService.exportWithFilters(
        mockEntityCollection,
        'test-user',
        filters
      );

      expect(result.data.tasks?.length).toBe(0);
    });
  });

  describe('exportSelected', () => {
    it('should export only selected items', async () => {
      const selectedIds = new Map<EntityType, Set<string>>([
        ['tasks' as EntityType, new Set(['task-1', 'task-2'])],
        ['projects' as EntityType, new Set(['project-1'])],
      ]);

      const result = await exportService.exportSelected(
        mockEntityCollection,
        'test-user',
        selectedIds
      );

      expect(result.data.tasks?.length).toBe(2);
      expect(result.data.projects?.length).toBe(1);
      expect(result.data.tasks?.map(t => t.id).sort()).toEqual(['task-1', 'task-2']);
      expect(result.data.projects?.[0].id).toBe('project-1');
    });

    it('should handle empty selection', async () => {
      const selectedIds = new Map();

      const result = await exportService.exportSelected(
        mockEntityCollection,
        'test-user',
        selectedIds
      );

      expect(result.metadata.totalItems).toBe(0);
    });

    it('should handle selection of non-existent IDs', async () => {
      const selectedIds = new Map<EntityType, Set<string>>([
        ['tasks' as EntityType, new Set(['non-existent-task'])],
      ]);

      const result = await exportService.exportSelected(
        mockEntityCollection,
        'test-user',
        selectedIds
      );

      expect(result.data.tasks?.length).toBe(0);
    });
  });

  describe('exportByDateRange', () => {
    it('should export items within date range', async () => {
      const start = new Date('2025-01-04T00:00:00.000Z');
      const end = new Date('2025-01-06T00:00:00.000Z');

      const result = await exportService.exportByDateRange(
        mockEntityCollection,
        'test-user',
        start,
        end
      );

      // Verify all exported items are within range
      result.data.tasks?.forEach(task => {
        const createdDate = new Date(task.createdAt);
        expect(createdDate >= start).toBe(true);
        expect(createdDate <= end).toBe(true);
      });
    });

    it('should handle date range with no matches', async () => {
      const start = new Date('2020-01-01T00:00:00.000Z');
      const end = new Date('2020-12-31T00:00:00.000Z');

      const result = await exportService.exportByDateRange(
        mockEntityCollection,
        'test-user',
        start,
        end
      );

      expect(result.metadata.totalItems).toBe(0);
    });

    it('should filter focus sessions by startTime', async () => {
      const dataWithSessions = {
        ...emptyEntityCollection,
        focusSessions: [{
          id: 'session-1',
          duration: 60,
          tasks: [],
          startTime: '2025-01-05T00:00:00.000Z',
          currentTaskIndex: 0,
          isActive: false,
          isOnBreak: false,
          breaks: [],
          createdAt: '2025-01-05T00:00:00.000Z',
          updatedAt: '2025-01-05T00:00:00.000Z',
        }],
      };

      const start = new Date('2025-01-04T00:00:00.000Z');
      const end = new Date('2025-01-06T00:00:00.000Z');

      const result = await exportService.exportByDateRange(
        dataWithSessions,
        'test-user',
        start,
        end
      );

      expect(result.data.focusSessions?.length).toBe(1);
    });
  });

  describe('downloadAsJson', () => {
    let createElementSpy: jest.SpyInstance;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;
    let createObjectURLSpy: jest.SpyInstance;
    let revokeObjectURLSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock DOM methods
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };

      createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation();
      removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation();
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      createObjectURLSpy = global.URL.createObjectURL as jest.Mock;
      // Mock URL.revokeObjectURL  
      global.URL.revokeObjectURL = jest.fn();
      revokeObjectURLSpy = global.URL.revokeObjectURL as jest.Mock;
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should trigger download with default filename', async () => {
      const exportedData = await exportService.exportAll(mockEntityCollection, 'test-user');

      exportService.downloadAsJson(exportedData);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    it('should use custom filename when provided', async () => {
      const exportedData = await exportService.exportAll(mockEntityCollection, 'test-user');
      const customFilename = 'my-export.json';

      exportService.downloadAsJson(exportedData, customFilename);

      // Verify the anchor element was configured with custom filename
      const mockAnchor = createElementSpy.mock.results[0].value;
      expect(mockAnchor.download).toBe(customFilename);
    });
  });

  describe('edge cases', () => {
    it('should handle missing createdAt fields gracefully', async () => {
      const dataWithoutDates = {
        ...emptyEntityCollection,
        tasks: [{
          id: 'task-no-date',
          title: 'Task',
          done: false,
          status: 'active' as const,
          priority: 'medium' as const,
          // No createdAt field
        }],
      };

      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        dateRange: {
          start: new Date('2025-01-01'),
          end: new Date('2025-12-31'),
        },
      };

      const result = await exportService.exportWithFilters(
        dataWithoutDates as any,
        'test-user',
        filters
      );

      // Items without dates should be filtered out
      expect(result.data.tasks?.length).toBe(0);
    });

    it('should handle entities with undefined optional fields', async () => {
      const dataWithMissingFields = {
        ...emptyEntityCollection,
        tasks: [{
          id: 'task-minimal',
          title: 'Task',
          done: false,
          status: 'active' as const,
          priority: 'medium' as const,
          // No category, tags, etc.
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }],
      };

      const filters: ExportFilterOptions = {
        entities: ['tasks'],
        categories: ['mastery'],
      };

      const result = await exportService.exportWithFilters(
        dataWithMissingFields,
        'test-user',
        filters
      );

      // Task without category should not match filter
      expect(result.data.tasks?.length).toBe(0);
    });

    it('should handle partial entity collections', async () => {
      const partialData = {
        tasks: mockEntityCollection.tasks,
        // Other entities missing
      };

      const result = await exportService.exportAll(partialData as any, 'test-user');

      expect(result.data.tasks).toBeDefined();
      expect(result.metadata.entityCounts.tasks).toBe(mockEntityCollection.tasks.length);
    });

    it('should handle very large date ranges', async () => {
      const start = new Date('2000-01-01');
      const end = new Date('2100-12-31');

      const result = await exportService.exportByDateRange(
        mockEntityCollection,
        'test-user',
        start,
        end
      );

      // All items should be included
      expect(result.metadata.totalItems).toBeGreaterThan(0);
    });
  });
});
