import {
  ParsedImportData,
  ImportSelection,
  ImportOptions,
  ImportResult,
  ImportProgress,
  ImportPhase,
  ImportLogEntry,
  ImportError,
  ImportWarning,
  EntityType,
  EntityCollection,
  ProgressCallback,
  ImportStats,
  IdMapping,
  ConflictResolution,
} from "@/types/import-export";
import { ValidationService } from "./ValidationService";
import { ConflictDetectionService } from "./ConflictDetectionService";
import { ReferenceMappingService } from "./ReferenceMappingService";

/**
 * ImportService
 *
 * Orchestrates the entire import process with real-time progress tracking,
 * selective import, conflict resolution, and reference mapping.
 */
export class ImportService {
  private validationService: ValidationService;
  private conflictService: ConflictDetectionService;
  private mappingService: ReferenceMappingService;
  private isCancelled: boolean = false;

  constructor() {
    this.validationService = new ValidationService();
    this.conflictService = new ConflictDetectionService();
    this.mappingService = new ReferenceMappingService();
  }

  /**
   * Parse and validate import file
   */
  async parseImportFile(
    file: File,
    onProgress?: ProgressCallback
  ): Promise<ParsedImportData> {
    const startTime = Date.now();

    // Report parsing phase
    this.reportProgress(onProgress, {
      phase: ImportPhase.PARSING,
      overallProgress: 10,
      itemsProcessed: 0,
      itemsTotal: 0,
      itemsByType: this.getEmptyItemsByType(),
      startTime,
      elapsedTime: 0,
      logs: [{
        timestamp: Date.now(),
        phase: ImportPhase.PARSING,
        message: `Parsing file: ${file.name}`,
        level: 'info',
      }],
      errors: [],
      warnings: [],
    });

    try {
      // Read file content
      const content = await file.text();
      const data = JSON.parse(content);

      // Report validation phase
      this.reportProgress(onProgress, {
        phase: ImportPhase.VALIDATING,
        overallProgress: 30,
        itemsProcessed: 0,
        itemsTotal: 0,
        itemsByType: this.getEmptyItemsByType(),
        startTime,
        elapsedTime: Date.now() - startTime,
        logs: [{
          timestamp: Date.now(),
          phase: ImportPhase.VALIDATING,
          message: 'Validating data structure...',
          level: 'info',
        }],
        errors: [],
        warnings: [],
      });

      // Validate data
      const validation = this.validationService.validate(data);

      if (!validation.isValid) {
        const errorLogs: ImportLogEntry[] = validation.errors
          .filter(e => e.severity === 'error')
          .slice(0, 5)
          .map(e => ({
            timestamp: Date.now(),
            phase: ImportPhase.VALIDATING,
            message: e.message,
            level: 'error',
          }));

        throw new Error(
          `Validation failed: ${validation.errors.filter(e => e.severity === 'error').length} errors found`
        );
      }

      // Calculate stats
      const stats = this.calculateStats(validation.entities, file.size);

      // Report conflict detection phase
      this.reportProgress(onProgress, {
        phase: ImportPhase.DETECTING_CONFLICTS,
        overallProgress: 50,
        itemsProcessed: 0,
        itemsTotal: stats.totalItems,
        itemsByType: this.getItemsByTypeFromStats(stats),
        startTime,
        elapsedTime: Date.now() - startTime,
        logs: [{
          timestamp: Date.now(),
          phase: ImportPhase.DETECTING_CONFLICTS,
          message: `Found ${stats.totalItems} items to import`,
          level: 'success',
        }],
        errors: [],
        warnings: [],
      });

      // Build relationship map
      const relationships = this.mappingService.buildRelationshipMap(validation.entities);

      // Detect conflicts (we'll need existing data for this, but for now, just prepare empty)
      const conflicts = await this.conflictService.detectConflicts(
        validation.entities,
        {} // Will be populated when we have access to existing data
      );

      // Final progress report
      this.reportProgress(onProgress, {
        phase: ImportPhase.PREPARING,
        overallProgress: 70,
        itemsProcessed: 0,
        itemsTotal: stats.totalItems,
        itemsByType: this.getItemsByTypeFromStats(stats),
        startTime,
        elapsedTime: Date.now() - startTime,
        logs: [{
          timestamp: Date.now(),
          phase: ImportPhase.PREPARING,
          message: `Detected ${conflicts.totalConflicts} conflicts`,
          level: conflicts.totalConflicts > 0 ? 'warning' : 'success',
        }],
        errors: [],
        warnings: [],
      });

      return {
        metadata: validation.metadata,
        entities: validation.entities as EntityCollection,
        isValid: true,
        validationErrors: validation.errors,
        conflicts,
        relationships,
        stats,
      };
    } catch (error) {
      const importError: ImportError = {
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : 'Failed to parse file',
        error: error instanceof Error ? error : new Error(String(error)),
        canContinue: false,
      };

      this.reportProgress(onProgress, {
        phase: ImportPhase.FAILED,
        overallProgress: 0,
        itemsProcessed: 0,
        itemsTotal: 0,
        itemsByType: this.getEmptyItemsByType(),
        startTime,
        elapsedTime: Date.now() - startTime,
        logs: [],
        errors: [importError],
        warnings: [],
      });

      throw error;
    }
  }

  /**
   * Execute import with progress tracking
   */
  async executeImport(
    parsedData: ParsedImportData,
    selection: ImportSelection,
    options: ImportOptions,
    dataLayer: {
      tasks: { add: (task: any) => Promise<void> };
      projects: { add: (project: any) => Promise<void> };
      goals: { add: (goal: any) => Promise<void> };
      thoughts: { add: (thought: any) => Promise<void> };
      moods: { add: (mood: any) => Promise<void> };
      focusSessions: { add: (session: any) => Promise<void> };
      people: { add: (person: any) => Promise<void> };
      portfolios: { add: (portfolio: any) => Promise<void> };
    },
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    this.isCancelled = false;
    const startTime = Date.now();
    const logs: ImportLogEntry[] = [];
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const importedByType: Record<EntityType, number> = this.getEmptyEntityCount();
    const skippedByType: Record<EntityType, number> = this.getEmptyEntityCount();

    try {
      // Apply conflict resolutions
      let entitiesToImport = this.applyConflictResolutions(
        parsedData.entities,
        selection,
        parsedData.conflicts
      );

      // Filter by selection
      entitiesToImport = this.filterBySelection(entitiesToImport, selection);

      // Create ID mapping if needed
      let idMapping: IdMapping | undefined;
      if (options.updateReferences) {
        idMapping = this.mappingService.createIdMapping(
          entitiesToImport,
          selection,
          options.preserveIds
        );

        // Update references with new IDs
        entitiesToImport = this.mappingService.updateReferences(
          entitiesToImport,
          idMapping
        );

        logs.push({
          timestamp: Date.now(),
          phase: ImportPhase.UPDATING_REFERENCES,
          message: `Updated ${idMapping.oldToNew.size} references`,
          level: 'info',
        });
      }

      // Calculate total items to import
      const totalItems = selection.totalSelected;
      let itemsProcessed = 0;

      // Import in correct order
      const importOrder = parsedData.relationships.importOrder;

      for (const entityType of importOrder) {
        if (this.isCancelled) {
          logs.push({
            timestamp: Date.now(),
            phase: ImportPhase.CANCELLED,
            message: 'Import cancelled by user',
            level: 'warning',
          });
          break;
        }

        const phase = this.getPhaseForEntityType(entityType);
        const collection = entitiesToImport[entityType] || [];

        // Report start of entity type import
        this.reportProgress(onProgress, {
          phase,
          overallProgress: Math.round((itemsProcessed / totalItems) * 100),
          currentEntityType: entityType,
          itemsProcessed,
          itemsTotal: totalItems,
          itemsByType: this.getItemsByTypeProgress(
            importedByType,
            skippedByType,
            parsedData.stats
          ),
          startTime,
          elapsedTime: Date.now() - startTime,
          estimatedTimeRemaining: this.calculateETA(itemsProcessed, totalItems, startTime),
          speed: this.calculateSpeed(itemsProcessed, startTime),
          logs: logs.slice(-10), // Keep last 10 logs
          errors,
          warnings,
        });

        // Import each item
        for (const item of collection as any[]) {
          if (this.isCancelled) break;

          try {
            // Report current item
            this.reportProgress(onProgress, {
              phase,
              overallProgress: Math.round((itemsProcessed / totalItems) * 100),
              currentEntityType: entityType,
              currentEntityName: this.getItemName(entityType, item),
              currentEntityDetails: {
                id: item.id,
                title: this.getItemName(entityType, item),
                category: item.category,
                tags: item.tags,
                type: entityType,
              },
              itemsProcessed,
              itemsTotal: totalItems,
              itemsByType: this.getItemsByTypeProgress(
                importedByType,
                skippedByType,
                parsedData.stats
              ),
              startTime,
              elapsedTime: Date.now() - startTime,
              estimatedTimeRemaining: this.calculateETA(itemsProcessed, totalItems, startTime),
              speed: this.calculateSpeed(itemsProcessed, startTime),
              logs: logs.slice(-10),
              errors,
              warnings,
            });

            // Import item
            await this.importItem(entityType, item, dataLayer);

            importedByType[entityType]++;
            itemsProcessed++;

            logs.push({
              timestamp: Date.now(),
              phase,
              entityType,
              entityId: item.id,
              entityName: this.getItemName(entityType, item),
              message: `Imported ${this.formatEntityType(entityType)}: ${this.getItemName(entityType, item)}`,
              level: 'success',
            });

            // Add small delay for large imports to allow UI updates
            if (itemsProcessed % 50 === 0) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          } catch (error) {
            errors.push({
              timestamp: Date.now(),
              entityType,
              entityId: item.id,
              entityName: this.getItemName(entityType, item),
              message: `Failed to import ${this.formatEntityType(entityType)}`,
              error: error instanceof Error ? error : new Error(String(error)),
              canContinue: true,
            });

            logs.push({
              timestamp: Date.now(),
              phase,
              entityType,
              entityId: item.id,
              entityName: this.getItemName(entityType, item),
              message: `Error: ${error instanceof Error ? error.message : String(error)}`,
              level: 'error',
            });
          }
        }
      }

      // Final completion phase
      const finalPhase = this.isCancelled ? ImportPhase.CANCELLED : ImportPhase.COMPLETED;

      this.reportProgress(onProgress, {
        phase: finalPhase,
        overallProgress: 100,
        itemsProcessed: totalItems,
        itemsTotal: totalItems,
        itemsByType: this.getItemsByTypeProgress(
          importedByType,
          skippedByType,
          parsedData.stats
        ),
        startTime,
        elapsedTime: Date.now() - startTime,
        logs: logs.slice(-10),
        errors,
        warnings,
      });

      return {
        success: !this.isCancelled && errors.length === 0,
        completed: !this.isCancelled,
        cancelled: this.isCancelled,
        totalImported: itemsProcessed,
        importedByType,
        skippedByType,
        errors,
        warnings,
        duration: Date.now() - startTime,
        logs,
      };
    } catch (error) {
      this.reportProgress(onProgress, {
        phase: ImportPhase.FAILED,
        overallProgress: 0,
        itemsProcessed: 0,
        itemsTotal: 0,
        itemsByType: this.getEmptyItemsByType(),
        startTime,
        elapsedTime: Date.now() - startTime,
        logs,
        errors: [...errors, {
          timestamp: Date.now(),
          message: error instanceof Error ? error.message : 'Import failed',
          error: error instanceof Error ? error : new Error(String(error)),
          canContinue: false,
        }],
        warnings,
      });

      throw error;
    }
  }

  /**
   * Cancel ongoing import
   */
  cancelImport(): void {
    this.isCancelled = true;
  }

  // Helper methods

  private async importItem(
    entityType: EntityType,
    item: any,
    dataLayer: any
  ): Promise<void> {
    switch (entityType) {
      case 'tasks':
        await dataLayer.tasks.add(item);
        break;
      case 'projects':
        await dataLayer.projects.add(item);
        break;
      case 'goals':
        await dataLayer.goals.add(item);
        break;
      case 'thoughts':
        await dataLayer.thoughts.add(item);
        break;
      case 'moods':
        await dataLayer.moods.add(item);
        break;
      case 'focusSessions':
        await dataLayer.focusSessions.add(item);
        break;
      case 'people':
        await dataLayer.people.add(item);
        break;
      case 'portfolios':
        await dataLayer.portfolios.add(item);
        break;
    }
  }

  private applyConflictResolutions(
    entities: Partial<EntityCollection>,
    selection: ImportSelection,
    conflicts: any
  ): Partial<EntityCollection> {
    // Filter out items where conflict resolution is SKIP
    const result: Partial<EntityCollection> = {};

    for (const conflict of conflicts.conflicts || []) {
      if (conflict.resolution === ConflictResolution.SKIP) {
        const skipped = selection.skippedItems.get(conflict.entityType) || new Set();
        skipped.add(conflict.entityId);
        selection.skippedItems.set(conflict.entityType, skipped);
      }
    }

    return entities;
  }

  private filterBySelection(
    entities: Partial<EntityCollection>,
    selection: ImportSelection
  ): Partial<EntityCollection> {
    const filtered: Partial<EntityCollection> = {};
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
      const selectedIds = selection.selectedItems.get(entityType) || new Set();
      const collection = entities[entityType] || [];

      filtered[entityType] = collection.filter((item: any) =>
        selectedIds.has(item.id)
      ) as any;
    }

    return filtered;
  }

  private calculateStats(entities: Partial<EntityCollection>, fileSize: number): ImportStats {
    const itemsByType: Record<EntityType, number> = {
      tasks: entities.tasks?.length || 0,
      projects: entities.projects?.length || 0,
      goals: entities.goals?.length || 0,
      thoughts: entities.thoughts?.length || 0,
      moods: entities.moods?.length || 0,
      focusSessions: entities.focusSessions?.length || 0,
      people: entities.people?.length || 0,
      portfolios: entities.portfolios?.length || 0,
      spending: entities.spending?.length || 0,
    };

    const totalItems = Object.values(itemsByType).reduce((sum, count) => sum + count, 0);

    return {
      totalItems,
      itemsByType,
      estimatedImportTime: this.validationService.estimateImportTime(totalItems, fileSize),
      dataSize: fileSize,
      schemaVersion: '1.0.0',
    };
  }

  private getPhaseForEntityType(entityType: EntityType): ImportPhase {
    const phaseMap: Record<EntityType, ImportPhase> = {
      goals: ImportPhase.IMPORTING_GOALS,
      projects: ImportPhase.IMPORTING_PROJECTS,
      tasks: ImportPhase.IMPORTING_TASKS,
      thoughts: ImportPhase.IMPORTING_THOUGHTS,
      moods: ImportPhase.IMPORTING_MOODS,
      focusSessions: ImportPhase.IMPORTING_FOCUS_SESSIONS,
      people: ImportPhase.IMPORTING_PEOPLE,
      portfolios: ImportPhase.IMPORTING_PORTFOLIOS,
      spending: ImportPhase.IMPORTING_SPENDING,
    };
    return phaseMap[entityType];
  }

  private getItemName(entityType: EntityType, item: any): string {
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
      default:
        return 'Unknown';
    }
  }

  private formatEntityType(entityType: EntityType): string {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1, -1);
  }

  private calculateETA(itemsProcessed: number, totalItems: number, startTime: number): number {
    if (itemsProcessed === 0) return 0;
    const elapsed = Date.now() - startTime;
    const rate = itemsProcessed / elapsed;
    const remaining = totalItems - itemsProcessed;
    return Math.round(remaining / rate);
  }

  private calculateSpeed(itemsProcessed: number, startTime: number): number {
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    return elapsed > 0 ? itemsProcessed / elapsed : 0;
  }

  private reportProgress(callback: ProgressCallback | undefined, progress: ImportProgress): void {
    if (callback) {
      callback(progress);
    }
  }

  private getEmptyItemsByType(): Record<EntityType, { processed: number; total: number; progress: number }> {
    return {
      tasks: { processed: 0, total: 0, progress: 0 },
      projects: { processed: 0, total: 0, progress: 0 },
      goals: { processed: 0, total: 0, progress: 0 },
      thoughts: { processed: 0, total: 0, progress: 0 },
      moods: { processed: 0, total: 0, progress: 0 },
      focusSessions: { processed: 0, total: 0, progress: 0 },
      people: { processed: 0, total: 0, progress: 0 },
      portfolios: { processed: 0, total: 0, progress: 0 },
      spending: { processed: 0, total: 0, progress: 0 },
    };
  }

  private getEmptyEntityCount(): Record<EntityType, number> {
    return {
      tasks: 0,
      projects: 0,
      goals: 0,
      thoughts: 0,
      moods: 0,
      focusSessions: 0,
      people: 0,
      portfolios: 0,
      spending: 0,
    };
  }

  private getItemsByTypeFromStats(stats: ImportStats): Record<EntityType, { processed: number; total: number; progress: number }> {
    return {
      tasks: { processed: 0, total: stats.itemsByType.tasks, progress: 0 },
      projects: { processed: 0, total: stats.itemsByType.projects, progress: 0 },
      goals: { processed: 0, total: stats.itemsByType.goals, progress: 0 },
      thoughts: { processed: 0, total: stats.itemsByType.thoughts, progress: 0 },
      moods: { processed: 0, total: stats.itemsByType.moods, progress: 0 },
      focusSessions: { processed: 0, total: stats.itemsByType.focusSessions, progress: 0 },
      people: { processed: 0, total: stats.itemsByType.people, progress: 0 },
      portfolios: { processed: 0, total: stats.itemsByType.portfolios, progress: 0 },
      spending: { processed: 0, total: stats.itemsByType.spending, progress: 0 },
    };
  }

  private getItemsByTypeProgress(
    imported: Record<EntityType, number>,
    skipped: Record<EntityType, number>,
    stats: ImportStats
  ): Record<EntityType, { processed: number; total: number; progress: number }> {
    const result: any = {};
    const entityTypes: EntityType[] = ['tasks', 'projects', 'goals', 'thoughts', 'moods', 'focusSessions', 'people', 'portfolios'];

    for (const type of entityTypes) {
      const total = stats.itemsByType[type];
      const processed = imported[type];
      result[type] = {
        processed,
        total,
        progress: total > 0 ? Math.round((processed / total) * 100) : 0,
      };
    }

    return result;
  }
}
