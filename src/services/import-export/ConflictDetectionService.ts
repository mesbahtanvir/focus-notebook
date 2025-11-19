import {
  Conflict,
  ConflictReport,
  ConflictType,
  ConflictResolution,
  EntityType,
  EntityCollection,
} from "@/types/import-export";

/**
 * ConflictDetectionService
 *
 * Detects conflicts between imported data and existing data.
 * Identifies duplicate IDs, broken references, and data constraints.
 */
export class ConflictDetectionService {
  /**
   * Detect all conflicts in imported data
   */
  async detectConflicts(
    importedEntities: Partial<EntityCollection>,
    existingEntities: Partial<EntityCollection>
  ): Promise<ConflictReport> {
    const conflicts: Conflict[] = [];

    // Detect duplicate ID conflicts
    conflicts.push(...this.detectDuplicateIds(importedEntities, existingEntities));

    // Detect broken reference conflicts
    conflicts.push(...this.detectBrokenReferences(importedEntities));

    // Build conflict report
    const report: ConflictReport = {
      totalConflicts: conflicts.length,
      conflictsByType: this.categorizeConflicts(conflicts),
      conflicts,
      hasBlockingConflicts: conflicts.some(
        c => c.type === ConflictType.BROKEN_REFERENCE
      )
    };

    return report;
  }

  /**
   * Detect duplicate ID conflicts
   */
  private detectDuplicateIds(
    importedEntities: Partial<EntityCollection>,
    existingEntities: Partial<EntityCollection>
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const entityTypes: EntityType[] = [
      'tasks',
      'projects',
      'goals',
      'thoughts',
      'moods',
      'focusSessions',
      'people',
      'portfolios'
    ];

    for (const entityType of entityTypes) {
      const imported = importedEntities[entityType] || [];
      const existing = existingEntities[entityType] || [];

      // Build a map of existing IDs
      const existingIds = new Map(
        existing.map((item: any) => [item.id, item])
      );

      // Check each imported item
      for (const item of imported as any[]) {
        if (existingIds.has(item.id)) {
          conflicts.push({
            id: `${entityType}-${item.id}`,
            type: ConflictType.DUPLICATE_ID,
            entityType,
            entityId: item.id,
            itemTitle: this.getItemTitle(entityType, item),
            existingItem: existingIds.get(item.id),
            importedItem: item,
            message: `${this.formatEntityType(entityType)} with ID "${item.id}" already exists`,
            suggestedResolution: ConflictResolution.SKIP,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect broken reference conflicts
   */
  private detectBrokenReferences(
    importedEntities: Partial<EntityCollection>
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Build a map of all imported IDs
    const importedIds = this.buildImportedIdsMap(importedEntities);

    // Check tasks
    if (importedEntities.tasks) {
      for (const task of importedEntities.tasks) {
        // Check projectId reference
        if (task.projectId && !importedIds.projects.has(task.projectId)) {
          conflicts.push({
            id: `task-${task.id}-project-ref`,
            type: ConflictType.BROKEN_REFERENCE,
            entityType: 'tasks',
            entityId: task.id,
            itemTitle: task.title,
            importedItem: task,
            message: `Task "${task.title}" references non-existent project (${task.projectId})`,
            suggestedResolution: ConflictResolution.ASK_USER,
            details: {
              referencedEntity: 'projects',
              referencedId: task.projectId,
              fieldName: 'projectId'
            }
          });
        }

        // Check thoughtId reference
        if (task.thoughtId && !importedIds.thoughts.has(task.thoughtId)) {
          conflicts.push({
            id: `task-${task.id}-thought-ref`,
            type: ConflictType.BROKEN_REFERENCE,
            entityType: 'tasks',
            entityId: task.id,
            itemTitle: task.title,
            importedItem: task,
            message: `Task "${task.title}" references non-existent thought (${task.thoughtId})`,
            suggestedResolution: ConflictResolution.ASK_USER,
            details: {
              referencedEntity: 'thoughts',
              referencedId: task.thoughtId,
              fieldName: 'thoughtId'
            }
          });
        }
      }
    }

    // Check projects
    if (importedEntities.projects) {
      for (const project of importedEntities.projects) {
        // Check goalId reference
        if (project.goalId && !importedIds.goals.has(project.goalId)) {
          conflicts.push({
            id: `project-${project.id}-goal-ref`,
            type: ConflictType.BROKEN_REFERENCE,
            entityType: 'projects',
            entityId: project.id,
            itemTitle: project.title,
            importedItem: project,
            message: `Project "${project.title}" references non-existent goal (${project.goalId})`,
            suggestedResolution: ConflictResolution.ASK_USER,
            details: {
              referencedEntity: 'goals',
              referencedId: project.goalId,
              fieldName: 'goalId'
            }
          });
        }

        // Check parentProjectId reference
        if (project.parentProjectId && !importedIds.projects.has(project.parentProjectId)) {
          conflicts.push({
            id: `project-${project.id}-parent-ref`,
            type: ConflictType.BROKEN_REFERENCE,
            entityType: 'projects',
            entityId: project.id,
            itemTitle: project.title,
            importedItem: project,
            message: `Project "${project.title}" references non-existent parent project (${project.parentProjectId})`,
            suggestedResolution: ConflictResolution.ASK_USER,
            details: {
              referencedEntity: 'projects',
              referencedId: project.parentProjectId,
              fieldName: 'parentProjectId'
            }
          });
        }
      }
    }

    // Check thoughts
    // NOTE: Thought linking is now handled via relationships store
    // No need to check linkedXIds arrays as they no longer exist

    // Check people
    // NOTE: Person linking now uses relationships store, not linkedThoughtIds array
    if (importedEntities.people) {
      // People validation - currently no direct reference fields to check
      // Relationships are managed via Entity Graph
    }

    return conflicts;
  }

  /**
   * Build a map of all imported IDs by entity type
   */
  private buildImportedIdsMap(
    importedEntities: Partial<EntityCollection>
  ): Record<EntityType, Set<string>> {
    return {
      tasks: new Set((importedEntities.tasks || []).map((t: any) => t.id)),
      projects: new Set((importedEntities.projects || []).map((p: any) => p.id)),
      goals: new Set((importedEntities.goals || []).map((g: any) => g.id)),
      thoughts: new Set((importedEntities.thoughts || []).map((t: any) => t.id)),
      moods: new Set((importedEntities.moods || []).map((m: any) => m.id)),
      focusSessions: new Set((importedEntities.focusSessions || []).map((f: any) => f.id)),
      people: new Set((importedEntities.people || []).map((p: any) => p.id)),
      portfolios: new Set((importedEntities.portfolios || []).map((p: any) => p.id)),
      spending: new Set((importedEntities.spending || []).map((s: any) => s.id)),
      relationships: new Set((importedEntities.relationships || []).map((r: any) => r.id)),
      llmLogs: new Set((importedEntities.llmLogs || []).map((l: any) => l.id)),
    };
  }

  /**
   * Categorize conflicts by type
   */
  private categorizeConflicts(
    conflicts: Conflict[]
  ): Record<ConflictType, number> {
    const categorized: Record<ConflictType, number> = {
      [ConflictType.DUPLICATE_ID]: 0,
      [ConflictType.BROKEN_REFERENCE]: 0,
      [ConflictType.VERSION_MISMATCH]: 0,
      [ConflictType.DATA_CONSTRAINT]: 0,
    };

    for (const conflict of conflicts) {
      categorized[conflict.type]++;
    }

    return categorized;
  }

  /**
   * Get title/name from an item
   */
  private getItemTitle(entityType: EntityType, item: any): string {
    switch (entityType) {
      case 'tasks':
      case 'projects':
      case 'goals':
        return item.title || 'Untitled';
      case 'thoughts':
        return item.text?.substring(0, 50) || 'No text';
      case 'moods':
        return `Mood: ${item.value}`;
      case 'focusSessions':
        return `Session: ${item.duration}min`;
      case 'people':
        return item.name || 'Unnamed';
      case 'portfolios':
        return item.name || 'Untitled Portfolio';
      case 'spending':
        return item.name || `Transaction: $${item.amount}`;
      case 'relationships':
        return `${item.sourceEntityType} → ${item.targetEntityType}`;
      case 'llmLogs':
        return item.prompt?.substring(0, 50) || 'LLM Log';
      default:
        return 'Unknown';
    }
  }

  /**
   * Format entity type for display
   */
  private formatEntityType(entityType: EntityType): string {
    const formatted = entityType.charAt(0).toUpperCase() + entityType.slice(1);
    return formatted.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Check if a conflict is blocking (prevents import)
   */
  isBlockingConflict(conflict: Conflict): boolean {
    return conflict.type === ConflictType.BROKEN_REFERENCE;
  }

  /**
   * Get conflicts that need user resolution
   */
  getConflictsNeedingResolution(conflicts: Conflict[]): Conflict[] {
    return conflicts.filter(
      c => c.suggestedResolution === ConflictResolution.ASK_USER || !c.resolution
    );
  }
}
