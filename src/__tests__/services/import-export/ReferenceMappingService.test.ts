import { ReferenceMappingService } from '@/services/import-export/ReferenceMappingService';
import { ImportSelection } from '@/types/import-export';
import { mockEntityCollection, emptyEntityCollection } from '../../utils/mockData';

describe('ReferenceMappingService', () => {
  let mappingService: ReferenceMappingService;

  beforeEach(() => {
    mappingService = new ReferenceMappingService();
  });

  describe('buildRelationshipMap', () => {
    it('should build complete relationship map', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      expect(map.taskToProject).toBeDefined();
      expect(map.taskToThought).toBeDefined();
      expect(map.projectToGoal).toBeDefined();
      expect(map.projectToParent).toBeDefined();
      expect(map.thoughtToTasks).toBeDefined();
      expect(map.thoughtToProjects).toBeDefined();
      expect(map.dependencyGraph).toBeDefined();
      expect(map.importOrder).toBeDefined();
    });

    it('should map task to project relationships', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      expect(map.taskToProject.get('task-1')).toBe('project-1');
      expect(map.taskToProject.get('task-2')).toBe('project-1');
    });

    it('should map task to thought relationships', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      expect(map.taskToThought.get('task-2')).toBe('thought-1');
      expect(map.taskToThought.get('task-3')).toBe('thought-2');
    });

    it('should map project to goal relationships', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      expect(map.projectToGoal.get('project-1')).toBe('goal-1');
    });

    it('should map project to parent relationships', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      expect(map.projectToParent.get('project-2')).toBe('project-1');
    });

    it('should map thought to task relationships', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      expect(map.thoughtToTasks.get('thought-1')).toContain('task-2');
      expect(map.thoughtToTasks.get('thought-2')).toContain('task-3');
    });

    it('should map thought to project relationships', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      expect(map.thoughtToProjects.get('thought-1')).toContain('project-1');
    });

    it('should handle empty entity collection', () => {
      const map = mappingService.buildRelationshipMap(emptyEntityCollection);

      expect(map.taskToProject.size).toBe(0);
      expect(map.dependencyGraph).toBeDefined();
      expect(map.importOrder).toHaveLength(0);
    });
  });

  describe('buildDependencyGraph', () => {
    it('should include all entities as nodes', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;

      // Check that all entities are in the graph
      expect(graph.nodes.has('task-1')).toBe(true);
      expect(graph.nodes.has('project-1')).toBe(true);
      expect(graph.nodes.has('goal-1')).toBe(true);
    });

    it('should create edges for dependencies', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;

      // Tasks depend on projects
      const task1Edges = graph.edges.get('task-1');
      expect(task1Edges?.has('project-1')).toBe(true);

      // Projects depend on goals
      const project1Edges = graph.edges.get('project-1');
      expect(project1Edges?.has('goal-1')).toBe(true);
    });

    it('should map entity types correctly', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;

      expect(graph.entityTypes.get('task-1')).toBe('tasks');
      expect(graph.entityTypes.get('project-1')).toBe('projects');
      expect(graph.entityTypes.get('goal-1')).toBe('goals');
    });
  });

  describe('determineImportOrder', () => {
    it('should order entities by dependencies', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      expect(map.importOrder).toContain('goals');
      expect(map.importOrder).toContain('projects');
      expect(map.importOrder).toContain('tasks');

      // Goals should come before projects
      const goalsIndex = map.importOrder.indexOf('goals');
      const projectsIndex = map.importOrder.indexOf('projects');
      const tasksIndex = map.importOrder.indexOf('tasks');

      expect(goalsIndex).toBeLessThan(projectsIndex);
      expect(projectsIndex).toBeLessThan(tasksIndex);
    });

    it('should include thoughts before tasks', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      const thoughtsIndex = map.importOrder.indexOf('thoughts');
      const tasksIndex = map.importOrder.indexOf('tasks');

      expect(thoughtsIndex).toBeLessThan(tasksIndex);
    });

    it('should only include entity types with items', () => {
      const dataWithOnlyTasks = {
        ...emptyEntityCollection,
        tasks: mockEntityCollection.tasks,
      };

      const map = mappingService.buildRelationshipMap(dataWithOnlyTasks);

      expect(map.importOrder).toContain('tasks');
      expect(map.importOrder.length).toBe(1);
    });

    it('should handle correct dependency order for all types', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);

      // Expected order: goals, thoughts, moods, projects, tasks
      const order = map.importOrder;

      if (order.includes('goals') && order.includes('projects')) {
        expect(order.indexOf('goals')).toBeLessThan(order.indexOf('projects'));
      }

      if (order.includes('projects') && order.includes('tasks')) {
        expect(order.indexOf('projects')).toBeLessThan(order.indexOf('tasks'));
      }

      if (order.includes('thoughts') && order.includes('tasks')) {
        expect(order.indexOf('thoughts')).toBeLessThan(order.indexOf('tasks'));
      }
    });
  });

  describe('createIdMapping', () => {
    const mockSelection: ImportSelection = {
      selectedItems: new Map([
        ['tasks', new Set(['task-1', 'task-2'])],
        ['projects', new Set(['project-1'])],
      ]),
      skippedItems: new Map(),
      conflictResolutions: new Map(),
      totalSelected: 3,
      totalSkipped: 0,
    };

    it('should preserve IDs when preserveIds is true', () => {
      const mapping = mappingService.createIdMapping(
        mockEntityCollection,
        mockSelection,
        true // preserveIds
      );

      expect(mapping.oldToNew.get('task-1')).toBe('task-1');
      expect(mapping.oldToNew.get('task-2')).toBe('task-2');
      expect(mapping.preserved.has('task-1')).toBe(true);
      expect(mapping.generated.size).toBe(0);
    });

    it('should generate new IDs when preserveIds is false', () => {
      const mapping = mappingService.createIdMapping(
        mockEntityCollection,
        mockSelection,
        false // don't preserve IDs
      );

      expect(mapping.oldToNew.get('task-1')).not.toBe('task-1');
      expect(mapping.oldToNew.get('task-2')).not.toBe('task-2');
      expect(mapping.generated.size).toBeGreaterThan(0);
      expect(mapping.preserved.size).toBe(0);
    });

    it('should create bidirectional mapping', () => {
      const mapping = mappingService.createIdMapping(
        mockEntityCollection,
        mockSelection,
        true
      );

      const oldId = 'task-1';
      const newId = mapping.oldToNew.get(oldId)!;

      expect(mapping.newToOld.get(newId)).toBe(oldId);
    });

    it('should only map selected items', () => {
      const mapping = mappingService.createIdMapping(
        mockEntityCollection,
        mockSelection,
        true
      );

      // task-3 not in selection
      expect(mapping.oldToNew.has('task-3')).toBe(false);

      // task-1 and task-2 in selection
      expect(mapping.oldToNew.has('task-1')).toBe(true);
      expect(mapping.oldToNew.has('task-2')).toBe(true);
    });

    it('should handle empty selection', () => {
      const emptySelection: ImportSelection = {
        selectedItems: new Map(),
        skippedItems: new Map(),
        conflictResolutions: new Map(),
        totalSelected: 0,
        totalSkipped: 0,
      };

      const mapping = mappingService.createIdMapping(
        mockEntityCollection,
        emptySelection,
        true
      );

      expect(mapping.oldToNew.size).toBe(0);
      expect(mapping.newToOld.size).toBe(0);
    });
  });

  describe('updateReferences', () => {
    it('should update task references', () => {
      const idMapping = {
        oldToNew: new Map([
          ['task-1', 'new-task-1'],
          ['project-1', 'new-project-1'],
          ['thought-1', 'new-thought-1'],
        ]),
        newToOld: new Map(),
        preserved: new Set<string>(),
        generated: new Set<string>(),
      };

      const updated = mappingService.updateReferences(
        mockEntityCollection,
        idMapping
      );

      const task1 = updated.tasks?.find(t => t.id === 'new-task-1');
      expect(task1?.projectId).toBe('new-project-1');

      const task2 = updated.tasks?.find(t => t.id === 'task-2'); // Mapping doesn't exist
      // Should update the reference since 'thought-1' was in the mapping
      expect(task2?.thoughtId).toBe('new-thought-1');
    });

    it('should update project references', () => {
      const idMapping = {
        oldToNew: new Map([
          ['project-1', 'new-project-1'],
          ['project-2', 'new-project-2'],
          ['goal-1', 'new-goal-1'],
        ]),
        newToOld: new Map(),
        preserved: new Set<string>(),
        generated: new Set<string>(),
      };

      const updated = mappingService.updateReferences(
        mockEntityCollection,
        idMapping
      );

      const project1 = updated.projects?.find(p => p.id === 'new-project-1');
      expect(project1?.goalId).toBe('new-goal-1');

      const project2 = updated.projects?.find(p => p.id === 'new-project-2');
      expect(project2?.parentProjectId).toBe('new-project-1');
    });

    it('should update thought references', () => {
      const idMapping = {
        oldToNew: new Map([
          ['thought-1', 'new-thought-1'],
          ['task-2', 'new-task-2'],
          ['project-1', 'new-project-1'],
        ]),
        newToOld: new Map(),
        preserved: new Set<string>(),
        generated: new Set<string>(),
      };

      const updated = mappingService.updateReferences(
        mockEntityCollection,
        idMapping
      );

      const thought1 = updated.thoughts?.find(t => t.id === 'new-thought-1');
      expect(thought1?.linkedTaskIds).toContain('new-task-2');
      expect(thought1?.linkedProjectIds).toContain('new-project-1');
    });

    it('should preserve references not in mapping', () => {
      const idMapping = {
        oldToNew: new Map([['task-1', 'new-task-1']]),
        newToOld: new Map(),
        preserved: new Set<string>(),
        generated: new Set<string>(),
      };

      const updated = mappingService.updateReferences(
        mockEntityCollection,
        idMapping
      );

      // task-2 not in mapping, should keep original ID
      const task2 = updated.tasks?.find(t => t.id === 'task-2');
      expect(task2?.id).toBe('task-2');
      expect(task2?.projectId).toBe('project-1'); // project-1 not in mapping
    });

    it('should handle empty mapping', () => {
      const emptyMapping = {
        oldToNew: new Map(),
        newToOld: new Map(),
        preserved: new Set<string>(),
        generated: new Set<string>(),
      };

      const updated = mappingService.updateReferences(
        mockEntityCollection,
        emptyMapping
      );

      // Everything should remain unchanged
      expect(updated.tasks?.find(t => t.id === 'task-1')).toBeDefined();
      expect(updated.projects?.find(p => p.id === 'project-1')).toBeDefined();
    });

    it('should update mood metadata references', () => {
      const idMapping = {
        oldToNew: new Map([['thought-1', 'new-thought-1']]),
        newToOld: new Map(),
        preserved: new Set<string>(),
        generated: new Set<string>(),
      };

      const updated = mappingService.updateReferences(
        mockEntityCollection,
        idMapping
      );

      const mood1 = updated.moods?.find(m => m.id === 'mood-1');
      expect(mood1?.metadata?.sourceThoughtId).toBe('new-thought-1');
    });
  });

  describe('hasDependencies', () => {
    it('should detect entities with dependencies', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;

      // task-1 has dependency on project-1
      expect(mappingService.hasDependencies('task-1', graph)).toBe(true);

      // goal-1 has no dependencies
      expect(mappingService.hasDependencies('goal-1', graph)).toBe(false);
    });
  });

  describe('getDependencies', () => {
    it('should return list of dependencies', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;

      const task1Deps = mappingService.getDependencies('task-1', graph);
      expect(task1Deps).toContain('project-1');

      const project1Deps = mappingService.getDependencies('project-1', graph);
      expect(project1Deps).toContain('goal-1');
    });

    it('should return empty array for entities with no dependencies', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;

      const goalDeps = mappingService.getDependencies('goal-1', graph);
      expect(goalDeps).toHaveLength(0);
    });

    it('should return empty array for non-existent entities', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;

      const deps = mappingService.getDependencies('non-existent', graph);
      expect(deps).toHaveLength(0);
    });
  });

  describe('validateDependencies', () => {
    it('should validate satisfied dependencies', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;
      const importedIds = new Set(['project-1', 'goal-1']);

      const result = mappingService.validateDependencies(
        'task-1',
        graph,
        importedIds
      );

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing dependencies', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;
      const importedIds = new Set<string>(); // Empty set

      const result = mappingService.validateDependencies(
        'task-1',
        graph,
        importedIds
      );

      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing).toContain('project-1');
    });

    it('should handle entities with no dependencies', () => {
      const map = mappingService.buildRelationshipMap(mockEntityCollection);
      const graph = map.dependencyGraph;
      const importedIds = new Set<string>();

      const result = mappingService.validateDependencies(
        'goal-1',
        graph,
        importedIds
      );

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle circular references', () => {
      const circularData = {
        tasks: [],
        projects: [
          {
            id: 'project-a',
            title: 'Project A',
            parentProjectId: 'project-b',
            status: 'active',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'project-b',
            title: 'Project B',
            parentProjectId: 'project-a',
            status: 'active',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        goals: [],
        thoughts: [],
        moods: [],
        focusSessions: [],
        people: [],
      };

      // Should not crash
      const map = mappingService.buildRelationshipMap(circularData);
      expect(map).toBeDefined();
    });

    it('should handle entities with undefined references', () => {
      const dataWithUndefinedRefs = {
        tasks: [{
          id: 'task-undefined-refs',
          title: 'Task',
          done: false,
          status: 'active' as const,
          priority: 'medium' as const,
          projectId: undefined,
          thoughtId: undefined,
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

      const map = mappingService.buildRelationshipMap(dataWithUndefinedRefs);
      expect(map.taskToProject.size).toBe(0);
    });
  });
});
