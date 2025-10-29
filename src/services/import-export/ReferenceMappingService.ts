import {
  EntityType,
  EntityCollection,
  RelationshipMap,
  DependencyGraph,
  IdMapping,
  ImportSelection,
} from "@/types/import-export";

/**
 * ReferenceMappingService
 *
 * Builds dependency graphs, determines import order, and manages ID mappings.
 * Ensures relationships are maintained when importing data.
 */
export class ReferenceMappingService {
  /**
   * Build complete relationship map from imported entities
   */
  buildRelationshipMap(entities: Partial<EntityCollection>): RelationshipMap {
    const taskToProject = new Map<string, string>();
    const taskToThought = new Map<string, string>();
    const projectToGoal = new Map<string, string>();
    const projectToParent = new Map<string, string>();
    const thoughtToTasks = new Map<string, string[]>();
    const thoughtToProjects = new Map<string, string[]>();
    const thoughtToMoods = new Map<string, string[]>();
    const thoughtToPeople = new Map<string, string[]>();

    // Build task relationships
    if (entities.tasks) {
      for (const task of entities.tasks) {
        if (task.projectId) {
          taskToProject.set(task.id, task.projectId);
        }
        if (task.thoughtId) {
          taskToThought.set(task.id, task.thoughtId);
        }
      }
    }

    // Build project relationships
    if (entities.projects) {
      for (const project of entities.projects) {
        if (project.goalId) {
          projectToGoal.set(project.id, project.goalId);
        }
        if (project.parentProjectId) {
          projectToParent.set(project.id, project.parentProjectId);
        }
      }
    }

    // Build thought relationships
    if (entities.thoughts) {
      for (const thought of entities.thoughts) {
        if (thought.linkedTaskIds) {
          thoughtToTasks.set(thought.id, thought.linkedTaskIds);
        }
        if (thought.linkedProjectIds) {
          thoughtToProjects.set(thought.id, thought.linkedProjectIds);
        }
        if (thought.linkedMoodIds) {
          thoughtToMoods.set(thought.id, thought.linkedMoodIds);
        }
      }
    }

    // Build people relationships
    if (entities.people) {
      for (const person of entities.people) {
        if (person.linkedThoughtIds) {
          for (const thoughtId of person.linkedThoughtIds) {
            const existing = thoughtToPeople.get(thoughtId) || [];
            thoughtToPeople.set(thoughtId, [...existing, person.id]);
          }
        }
      }
    }

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(entities);

    // Determine import order
    const importOrder = this.determineImportOrder(dependencyGraph);

    return {
      taskToProject,
      taskToThought,
      projectToGoal,
      projectToParent,
      thoughtToTasks,
      thoughtToProjects,
      thoughtToMoods,
      thoughtToPeople,
      dependencyGraph,
      importOrder,
    };
  }

  /**
   * Build dependency graph from entities
   */
  private buildDependencyGraph(entities: Partial<EntityCollection>): DependencyGraph {
    const nodes = new Set<string>();
    const edges = new Map<string, Set<string>>();
    const entityTypes = new Map<string, EntityType>();

    // Add all entities as nodes
    const allEntities: [EntityType, any[]][] = [
      ['goals', entities.goals || []],
      ['projects', entities.projects || []],
      ['tasks', entities.tasks || []],
      ['thoughts', entities.thoughts || []],
      ['moods', entities.moods || []],
      ['focusSessions', entities.focusSessions || []],
      ['people', entities.people || []],
    ];

    for (const [type, collection] of allEntities) {
      for (const item of collection) {
        nodes.add(item.id);
        entityTypes.set(item.id, type);
        edges.set(item.id, new Set());
      }
    }

    // Add edges (dependencies)
    // Tasks depend on projects and thoughts
    if (entities.tasks) {
      for (const task of entities.tasks) {
        const taskEdges = edges.get(task.id) || new Set();
        if (task.projectId && nodes.has(task.projectId)) {
          taskEdges.add(task.projectId);
        }
        if (task.thoughtId && nodes.has(task.thoughtId)) {
          taskEdges.add(task.thoughtId);
        }
        edges.set(task.id, taskEdges);
      }
    }

    // Projects depend on goals and parent projects
    if (entities.projects) {
      for (const project of entities.projects) {
        const projectEdges = edges.get(project.id) || new Set();
        if (project.goalId && nodes.has(project.goalId)) {
          projectEdges.add(project.goalId);
        }
        if (project.parentProjectId && nodes.has(project.parentProjectId)) {
          projectEdges.add(project.parentProjectId);
        }
        edges.set(project.id, projectEdges);
      }
    }

    // Thoughts with linked items (bidirectional, but thoughts should come first for creation)
    if (entities.thoughts) {
      for (const thought of entities.thoughts) {
        const thoughtEdges = edges.get(thought.id) || new Set();
        // Thoughts don't strictly depend on tasks/projects, but we track the relationships
        edges.set(thought.id, thoughtEdges);
      }
    }

    return { nodes, edges, entityTypes };
  }

  /**
   * Determine optimal import order based on dependencies
   */
  private determineImportOrder(graph: DependencyGraph): EntityType[] {
    // Use topological sort based on entity type dependencies
    // Order: goals -> thoughts -> moods -> people -> projects -> tasks -> focusSessions

    const order: EntityType[] = [];
    const entityTypeCounts = new Map<EntityType, number>();

    // Count entities by type
    for (const [id, type] of graph.entityTypes.entries()) {
      entityTypeCounts.set(type, (entityTypeCounts.get(type) || 0) + 1);
    }

    // Define import order based on dependencies
    const dependencyOrder: EntityType[] = [
      'goals',         // No dependencies
      'thoughts',      // No dependencies (though may link to tasks/projects later)
      'moods',         // May be linked by thoughts
      'people',        // May link to thoughts
      'projects',      // Depends on goals
      'tasks',         // Depends on projects and thoughts
      'focusSessions', // Depends on tasks (embedded)
    ];

    // Only include entity types that have items
    for (const type of dependencyOrder) {
      if (entityTypeCounts.has(type) && (entityTypeCounts.get(type) || 0) > 0) {
        order.push(type);
      }
    }

    return order;
  }

  /**
   * Create ID mapping for import
   */
  createIdMapping(
    entities: Partial<EntityCollection>,
    selection: ImportSelection,
    preserveIds: boolean
  ): IdMapping {
    const oldToNew = new Map<string, string>();
    const newToOld = new Map<string, string>();
    const preserved = new Set<string>();
    const generated = new Set<string>();

    const entityTypes: EntityType[] = [
      'goals',
      'projects',
      'tasks',
      'thoughts',
      'moods',
      'focusSessions',
      'people'
    ];

    for (const entityType of entityTypes) {
      const selectedIds = selection.selectedItems.get(entityType) || new Set();
      const collection = entities[entityType] || [];

      for (const item of collection as any[]) {
        if (selectedIds.has(item.id)) {
          if (preserveIds) {
            // Keep original ID
            oldToNew.set(item.id, item.id);
            newToOld.set(item.id, item.id);
            preserved.add(item.id);
          } else {
            // Generate new ID
            const newId = this.generateNewId();
            oldToNew.set(item.id, newId);
            newToOld.set(newId, item.id);
            generated.add(newId);
          }
        }
      }
    }

    return { oldToNew, newToOld, preserved, generated };
  }

  /**
   * Update all references in entities using ID mapping
   */
  updateReferences(
    entities: Partial<EntityCollection>,
    idMapping: IdMapping
  ): Partial<EntityCollection> {
    const updated: Partial<EntityCollection> = {};

    // Update tasks
    if (entities.tasks) {
      updated.tasks = entities.tasks.map(task => ({
        ...task,
        id: idMapping.oldToNew.get(task.id) || task.id,
        projectId: task.projectId
          ? idMapping.oldToNew.get(task.projectId) || task.projectId
          : task.projectId,
        thoughtId: task.thoughtId
          ? idMapping.oldToNew.get(task.thoughtId) || task.thoughtId
          : task.thoughtId,
      }));
    }

    // Update projects
    if (entities.projects) {
      updated.projects = entities.projects.map(project => ({
        ...project,
        id: idMapping.oldToNew.get(project.id) || project.id,
        goalId: project.goalId
          ? idMapping.oldToNew.get(project.goalId) || project.goalId
          : project.goalId,
        parentProjectId: project.parentProjectId
          ? idMapping.oldToNew.get(project.parentProjectId) || project.parentProjectId
          : project.parentProjectId,
        linkedTaskIds: project.linkedTaskIds
          ? project.linkedTaskIds.map(id => idMapping.oldToNew.get(id) || id)
          : project.linkedTaskIds,
        linkedThoughtIds: project.linkedThoughtIds
          ? project.linkedThoughtIds.map(id => idMapping.oldToNew.get(id) || id)
          : project.linkedThoughtIds,
      }));
    }

    // Update goals
    if (entities.goals) {
      updated.goals = entities.goals.map(goal => ({
        ...goal,
        id: idMapping.oldToNew.get(goal.id) || goal.id,
      }));
    }

    // Update thoughts
    if (entities.thoughts) {
      updated.thoughts = entities.thoughts.map(thought => ({
        ...thought,
        id: idMapping.oldToNew.get(thought.id) || thought.id,
        linkedTaskIds: thought.linkedTaskIds
          ? thought.linkedTaskIds.map(id => idMapping.oldToNew.get(id) || id)
          : thought.linkedTaskIds,
        linkedProjectIds: thought.linkedProjectIds
          ? thought.linkedProjectIds.map(id => idMapping.oldToNew.get(id) || id)
          : thought.linkedProjectIds,
        linkedMoodIds: thought.linkedMoodIds
          ? thought.linkedMoodIds.map(id => idMapping.oldToNew.get(id) || id)
          : thought.linkedMoodIds,
      }));
    }

    // Update moods
    if (entities.moods) {
      updated.moods = entities.moods.map(mood => ({
        ...mood,
        id: idMapping.oldToNew.get(mood.id) || mood.id,
        metadata: mood.metadata ? {
          ...mood.metadata,
          sourceThoughtId: mood.metadata.sourceThoughtId
            ? idMapping.oldToNew.get(mood.metadata.sourceThoughtId) || mood.metadata.sourceThoughtId
            : mood.metadata.sourceThoughtId,
        } : mood.metadata,
      }));
    }

    // Update focus sessions
    if (entities.focusSessions) {
      updated.focusSessions = entities.focusSessions.map(session => ({
        ...session,
        id: idMapping.oldToNew.get(session.id) || session.id,
        tasks: session.tasks.map((task: any) => ({
          ...task,
          id: idMapping.oldToNew.get(task.id) || task.id,
        })),
      }));
    }

    // Update people
    if (entities.people) {
      updated.people = entities.people.map(person => ({
        ...person,
        id: idMapping.oldToNew.get(person.id) || person.id,
        linkedThoughtIds: person.linkedThoughtIds
          ? person.linkedThoughtIds.map(id => idMapping.oldToNew.get(id) || id)
          : person.linkedThoughtIds,
      }));
    }

    return updated;
  }

  /**
   * Generate a new unique ID
   */
  private generateNewId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if entity has dependencies
   */
  hasDependencies(entityId: string, graph: DependencyGraph): boolean {
    const edges = graph.edges.get(entityId);
    return edges ? edges.size > 0 : false;
  }

  /**
   * Get all dependencies for an entity
   */
  getDependencies(entityId: string, graph: DependencyGraph): string[] {
    const edges = graph.edges.get(entityId);
    return edges ? Array.from(edges) : [];
  }

  /**
   * Validate that all dependencies are satisfied
   */
  validateDependencies(
    entityId: string,
    graph: DependencyGraph,
    importedIds: Set<string>
  ): { valid: boolean; missing: string[] } {
    const dependencies = this.getDependencies(entityId, graph);
    const missing = dependencies.filter(depId => !importedIds.has(depId));

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
