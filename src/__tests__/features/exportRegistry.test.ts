/**
 * Test cases for Export/Import Registry System feature (#39)
 * Tests registry pattern, data source registration, export/import operations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  exportRegistry,
  registerExportSource,
  createStoreExportSource,
  type ExportableDataSource,
} from '@/lib/exportRegistry';

describe('Export/Import Registry System (#39)', () => {
  // Track registered test sources for cleanup
  const testSources: string[] = [];

  const registerTestSource = (source: ExportableDataSource<any>) => {
    exportRegistry.register(source);
    testSources.push(source.id);
  };

  afterEach(() => {
    // Clean up all test sources
    testSources.forEach(id => exportRegistry.unregister(id));
    testSources.length = 0;
  });

  describe('ExportRegistry - Basic Operations', () => {
    it('should register and retrieve a data source', () => {
      const source: ExportableDataSource<any> = {
        id: 'test-basic-source',
        name: 'Test Source',
        description: 'A test source',
        export: async () => [],
        import: async () => [],
      };

      registerTestSource(source);

      expect(exportRegistry.hasSource('test-basic-source')).toBe(true);

      const retrieved = exportRegistry.getSource('test-basic-source');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Source');
      expect(retrieved?.description).toBe('A test source');
    });

    it('should return undefined for non-existent source', () => {
      const retrieved = exportRegistry.getSource('non-existent-source-xyz');
      expect(retrieved).toBeUndefined();
    });

    it('should unregister a data source', () => {
      const source: ExportableDataSource<any> = {
        id: 'test-unregister-source',
        name: 'Test Source',
        export: async () => [],
        import: async () => [],
      };

      registerTestSource(source);
      expect(exportRegistry.hasSource('test-unregister-source')).toBe(true);

      const result = exportRegistry.unregister('test-unregister-source');
      expect(result).toBe(true);
      expect(exportRegistry.hasSource('test-unregister-source')).toBe(false);
    });

    it('should return false when unregistering non-existent source', () => {
      const result = exportRegistry.unregister('non-existent-unregister');
      expect(result).toBe(false);
    });

    it('should get all source IDs', () => {
      registerTestSource({
        id: 'test-ids-1',
        name: 'Source 1',
        export: async () => [],
        import: async () => [],
      });

      registerTestSource({
        id: 'test-ids-2',
        name: 'Source 2',
        export: async () => [],
        import: async () => [],
      });

      const ids = exportRegistry.getSourceIds();
      expect(ids).toContain('test-ids-1');
      expect(ids).toContain('test-ids-2');
    });
  });

  describe('ExportRegistry - Priority System', () => {
    it('should sort sources by priority (higher first)', () => {
      registerTestSource({
        id: 'test-priority-low',
        name: 'Low Priority',
        priority: 10,
        export: async () => [],
        import: async () => [],
      });

      registerTestSource({
        id: 'test-priority-high',
        name: 'High Priority',
        priority: 100,
        export: async () => [],
        import: async () => [],
      });

      registerTestSource({
        id: 'test-priority-medium',
        name: 'Medium Priority',
        priority: 50,
        export: async () => [],
        import: async () => [],
      });

      const allSources = exportRegistry.getAllSources();
      const testPrioritySources = allSources.filter(s => s.id.startsWith('test-priority-'));

      expect(testPrioritySources[0].id).toBe('test-priority-high');
      expect(testPrioritySources[1].id).toBe('test-priority-medium');
      expect(testPrioritySources[2].id).toBe('test-priority-low');
    });

    it('should default priority to 0 if not specified', () => {
      registerTestSource({
        id: 'test-no-priority',
        name: 'No Priority',
        export: async () => [],
        import: async () => [],
      });

      const source = exportRegistry.getSource('test-no-priority');
      expect(source?.priority).toBeUndefined();
    });
  });

  describe('ExportRegistry - Export Operations', () => {
    interface TestData {
      id: string;
      value: string;
    }

    it('should export data from a source', async () => {
      const testData: TestData[] = [
        { id: '1', value: 'data1' },
        { id: '2', value: 'data2' },
      ];

      registerTestSource({
        id: 'test-export-basic',
        name: 'Export Test',
        export: async () => testData,
        import: async () => [],
      });

      const result = await exportRegistry.exportSelected('user-123', ['test-export-basic']);

      expect(result['test-export-basic']).toEqual(testData);
    });

    it('should apply export transformation', async () => {
      const rawData: TestData[] = [
        { id: '1', value: 'secret-data' },
      ];

      registerTestSource({
        id: 'test-export-transform',
        name: 'Transform Test',
        export: async () => rawData,
        import: async () => [],
        transformExport: (data: TestData[]) => {
          return data.map(item => ({
            ...item,
            value: 'redacted',
          }));
        },
      });

      const result = await exportRegistry.exportSelected('user-123', ['test-export-transform']);

      expect(result['test-export-transform'][0].value).toBe('redacted');
    });

    it('should handle export errors gracefully', async () => {
      registerTestSource({
        id: 'test-export-error',
        name: 'Error Test',
        export: async () => {
          throw new Error('Export failed');
        },
        import: async () => [],
      });

      const result = await exportRegistry.exportSelected('user-123', ['test-export-error']);

      expect(result['test-export-error']).toEqual([]);
    });

    it('should export from multiple sources', async () => {
      registerTestSource({
        id: 'test-multi-export-1',
        name: 'Source 1',
        export: async () => [{ id: '1', value: 'data1' }],
        import: async () => [],
      });

      registerTestSource({
        id: 'test-multi-export-2',
        name: 'Source 2',
        export: async () => [{ id: '2', value: 'data2' }],
        import: async () => [],
      });

      const result = await exportRegistry.exportSelected('user-123', [
        'test-multi-export-1',
        'test-multi-export-2',
      ]);

      expect(result['test-multi-export-1']).toHaveLength(1);
      expect(result['test-multi-export-2']).toHaveLength(1);
    });
  });

  describe('ExportRegistry - Import Operations', () => {
    interface TestData {
      id: string;
      value: string;
    }

    it('should import data to a source', async () => {
      const importedIds: string[] = [];

      registerTestSource({
        id: 'test-import-basic',
        name: 'Import Test',
        export: async () => [],
        import: async (userId: string, data: TestData[]) => {
          data.forEach(item => importedIds.push(item.id));
          return data.map(d => d.id);
        },
      });

      const importData = {
        'test-import-basic': [
          { id: '1', value: 'data1' },
          { id: '2', value: 'data2' },
        ],
      };

      const result = await exportRegistry.importAll('user-123', importData);

      expect(result['test-import-basic']).toEqual(['1', '2']);
      expect(importedIds).toHaveLength(2);
    });

    it('should apply import transformation', async () => {
      let receivedData: TestData[] = [];

      registerTestSource({
        id: 'test-import-transform',
        name: 'Transform Test',
        export: async () => [],
        import: async (userId: string, data: TestData[]) => {
          receivedData = data;
          return data.map(d => d.id);
        },
        transformImport: (data: TestData[]) => {
          return data.map(item => ({
            ...item,
            value: item.value + '-transformed',
          }));
        },
      });

      const importData = {
        'test-import-transform': [
          { id: '1', value: 'data1' },
        ],
      };

      await exportRegistry.importAll('user-123', importData);

      expect(receivedData[0].value).toBe('data1-transformed');
    });

    it('should validate data before import', async () => {
      registerTestSource({
        id: 'test-import-validate',
        name: 'Validation Test',
        export: async () => [],
        import: async (userId: string, data: TestData[]) => {
          return data.map(d => d.id);
        },
        validate: (data: TestData[]) => {
          const errors: string[] = [];
          data.forEach((item, i) => {
            if (!item.id) {
              errors.push(`Item at index ${i} missing id`);
            }
          });
          return errors;
        },
      });

      const invalidData = {
        'test-import-validate': [
          { id: '', value: 'data1' },
        ],
      };

      const result = await exportRegistry.importAll('user-123', invalidData);

      expect(result['test-import-validate']).toBe(0);
    });

    it('should skip sources with no data', async () => {
      let importCalled = false;

      registerTestSource({
        id: 'test-import-skip',
        name: 'Skip Test',
        export: async () => [],
        import: async () => {
          importCalled = true;
          return [];
        },
      });

      const importData = {
        'some-other-source': [{ id: '1', value: 'data' }],
      };

      await exportRegistry.importAll('user-123', importData);

      expect(importCalled).toBe(false);
    });

    it('should handle import errors gracefully', async () => {
      registerTestSource({
        id: 'test-import-error',
        name: 'Error Test',
        export: async () => [],
        import: async () => {
          throw new Error('Import failed');
        },
      });

      const importData = {
        'test-import-error': [{ id: '1', value: 'data1' }],
      };

      const result = await exportRegistry.importAll('user-123', importData);

      expect(result['test-import-error']).toBe(0);
    });

    it('should import in priority order', async () => {
      const importOrder: string[] = [];

      registerTestSource({
        id: 'test-order-low',
        name: 'Low Priority',
        priority: 10,
        export: async () => [],
        import: async () => {
          importOrder.push('low');
          return [];
        },
      });

      registerTestSource({
        id: 'test-order-high',
        name: 'High Priority',
        priority: 100,
        export: async () => [],
        import: async () => {
          importOrder.push('high');
          return [];
        },
      });

      const importData = {
        'test-order-low': [{ id: '1', value: 'data1' }],
        'test-order-high': [{ id: '2', value: 'data2' }],
      };

      await exportRegistry.importAll('user-123', importData);

      expect(importOrder[0]).toBe('high');
      expect(importOrder[1]).toBe('low');
    });
  });

  describe('Helper Functions', () => {
    it('should create store export source', () => {
      const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const source = createStoreExportSource({
        id: 'test-store-helper',
        name: 'Test Store',
        description: 'Test store description',
        priority: 50,
        getItems: async () => mockItems,
        addItem: async (userId, item) => item.id,
      });

      expect(source.id).toBe('test-store-helper');
      expect(source.name).toBe('Test Store');
      expect(source.description).toBe('Test store description');
      expect(source.priority).toBe(50);
    });

    it('should export data using createStoreExportSource', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const source = createStoreExportSource({
        id: 'test-store-export-helper',
        name: 'Test Store',
        getItems: async () => mockItems,
        addItem: async (userId, item) => item.id,
      });

      const exported = await source.export('user-123');

      expect(exported).toEqual(mockItems);
    });

    it('should import data using createStoreExportSource', async () => {
      const addedItems: any[] = [];

      const source = createStoreExportSource({
        id: 'test-store-import-helper',
        name: 'Test Store',
        getItems: async () => [],
        addItem: async (userId, item) => {
          addedItems.push(item);
          return item.id;
        },
      });

      const importData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const result = await source.import('user-123', importData);

      expect(addedItems).toHaveLength(2);
      expect(result).toEqual(['1', '2']);
    });

    it('should handle errors in createStoreExportSource import', async () => {
      const source = createStoreExportSource({
        id: 'test-store-error-helper',
        name: 'Test Store',
        getItems: async () => [],
        addItem: async (userId, item) => {
          if (item.id === '2') {
            throw new Error('Failed to add item');
          }
          return item.id;
        },
      });

      const importData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }, // This will fail
        { id: '3', name: 'Item 3' },
      ];

      const result = await source.import('user-123', importData);

      expect(result).toEqual(['1', '3']);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete export-import cycle', async () => {
      interface TestItem {
        id: string;
        title: string;
      }

      // Use a fresh store for this test
      const testStore: TestItem[] = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' },
      ];

      registerTestSource({
        id: 'test-integration-cycle',
        name: 'Items',
        export: async () => {
          // Return a copy to avoid mutation
          return [...testStore];
        },
        import: async (userId: string, data: TestItem[]) => {
          const imported: string[] = [];
          data.forEach(item => {
            const newId = `new-${item.id}`;
            testStore.push({ ...item, id: newId });
            imported.push(newId);
          });
          return imported;
        },
      });

      // Get initial count
      const initialCount = testStore.length;

      // Export
      const exported = await exportRegistry.exportSelected('user-123', ['test-integration-cycle']);
      expect(exported['test-integration-cycle'].length).toBeGreaterThanOrEqual(initialCount);

      // Import
      const importResult = await exportRegistry.importAll('user-456', exported);
      expect(Array.isArray(importResult['test-integration-cycle'])).toBe(true);
      expect(testStore.length).toBeGreaterThan(initialCount);
    });

    it('should work with the tasks export source pattern', async () => {
      interface Task {
        id: string;
        title: string;
        status: string;
      }

      const tasks: Task[] = [];

      registerTestSource({
        id: 'test-tasks-pattern',
        name: 'Tasks',
        description: 'All tasks',
        priority: 100,
        export: async (userId: string) => {
          return tasks;
        },
        import: async (userId: string, data: Task[]) => {
          const imported: string[] = [];
          for (const task of data) {
            const newId = `task-${Date.now()}-${Math.random()}`;
            tasks.push({ ...task, id: newId });
            imported.push(newId);
          }
          return imported;
        },
        validate: (data: Task[]) => {
          const errors: string[] = [];
          for (let i = 0; i < data.length; i++) {
            const task = data[i];
            if (!task.title) {
              errors.push(`Task at index ${i} has invalid title`);
            }
            if (!['active', 'completed', 'backlog'].includes(task.status)) {
              errors.push(`Task at index ${i} has invalid status`);
            }
          }
          return errors;
        },
      });

      // Add some tasks
      tasks.push({ id: '1', title: 'Task 1', status: 'active' });
      tasks.push({ id: '2', title: 'Task 2', status: 'completed' });

      // Export
      const exported = await exportRegistry.exportSelected('user-123', ['test-tasks-pattern']);
      expect(exported['test-tasks-pattern']).toHaveLength(2);

      // Import valid data
      const validImport = {
        'test-tasks-pattern': [
          { id: '3', title: 'Task 3', status: 'active' },
        ],
      };

      const importResult = await exportRegistry.importAll('user-123', validImport);
      expect(Array.isArray(importResult['test-tasks-pattern'])).toBe(true);
      expect(tasks).toHaveLength(3);

      // Try to import invalid data
      const invalidImport = {
        'test-tasks-pattern': [
          { id: '4', title: '', status: 'invalid' },
        ],
      };

      const invalidResult = await exportRegistry.importAll('user-123', invalidImport);
      expect(invalidResult['test-tasks-pattern']).toBe(0);
      expect(tasks).toHaveLength(3); // Should not increase
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty export data', async () => {
      registerTestSource({
        id: 'test-empty-export',
        name: 'Empty Source',
        export: async () => [],
        import: async () => [],
      });

      const result = await exportRegistry.exportSelected('user-123', ['test-empty-export']);

      expect(result['test-empty-export']).toEqual([]);
    });

    it('should handle empty import data', async () => {
      registerTestSource({
        id: 'test-empty-import',
        name: 'Empty Import',
        export: async () => [],
        import: async (userId: string, data: any[]) => {
          return data.length;
        },
      });

      const importData = {
        'test-empty-import': [],
      };

      const result = await exportRegistry.importAll('user-123', importData);

      expect(result['test-empty-import']).toBe(0);
    });

    it('should handle special characters in source IDs', () => {
      const source: ExportableDataSource<any> = {
        id: 'test-special-chars_123',
        name: 'Special Source',
        export: async () => [],
        import: async () => [],
      };

      registerTestSource(source);

      expect(exportRegistry.hasSource('test-special-chars_123')).toBe(true);
    });

    it('should handle non-array import data', async () => {
      let importCalled = false;

      registerTestSource({
        id: 'test-invalid-import-data',
        name: 'Invalid Data',
        export: async () => [],
        import: async () => {
          importCalled = true;
          return [];
        },
      });

      const importData = {
        'test-invalid-import-data': 'invalid-string-data' as any,
      };

      await exportRegistry.importAll('user-123', importData);

      expect(importCalled).toBe(false);
    });
  });
});
