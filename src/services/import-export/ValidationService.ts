import {
  ExportedData,
  EntityType,
  ValidationError,
  EntityCollection,
  ExportMetadata,
} from "@/types/import-export";
import { Task } from "@/store/useTasks";
import { Project } from "@/store/useProjects";
import { Goal } from "@/store/useGoals";
import { Thought } from "@/store/useThoughts";
import { MoodEntry } from "@/store/useMoods";
import { FocusSession } from "@/store/useFocus";
import { Person } from "@/store/useRelationships";
import { Portfolio } from "@/store/useInvestments";

/**
 * ValidationService
 *
 * Validates imported data structure, schema, and integrity.
 * Checks for required fields, data types, and basic constraints.
 */
export class ValidationService {
  private readonly CURRENT_VERSION = "1.0.0";
  private readonly SUPPORTED_VERSIONS = ["1.0.0"];

  /**
   * Validates the entire import data structure
   */
  validate(data: any): {
    isValid: boolean;
    errors: ValidationError[];
    metadata: ExportMetadata;
    entities: Partial<EntityCollection>;
  } {
    const errors: ValidationError[] = [];

    // Validate basic structure
    if (!data || typeof data !== 'object') {
      errors.push({
        type: 'invalid_type',
        entityType: 'tasks',
        entityId: 'root',
        message: 'Import data must be a valid object',
        severity: 'error'
      });
      return {
        isValid: false,
        errors,
        metadata: this.getDefaultMetadata(),
        entities: {}
      };
    }

    // Validate metadata
    const metadataErrors = this.validateMetadata(data.metadata);
    errors.push(...metadataErrors);

    // Validate data object
    if (!data.data || typeof data.data !== 'object') {
      errors.push({
        type: 'missing_field',
        entityType: 'tasks',
        entityId: 'root',
        field: 'data',
        message: 'Import data must contain a "data" object',
        severity: 'error'
      });
      return {
        isValid: false,
        errors,
        metadata: data.metadata || this.getDefaultMetadata(),
        entities: {}
      };
    }

    // Validate each entity collection
    const entities: Partial<EntityCollection> = {};
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
      if (data.data[entityType]) {
        const validationResult = this.validateEntityCollection(
          entityType,
          data.data[entityType]
        );
        errors.push(...validationResult.errors);
        if (validationResult.validEntities.length > 0) {
          entities[entityType] = validationResult.validEntities as any;
        }
      }
    }

    // Check if we have any valid entities
    const hasValidEntities = Object.keys(entities).some(
      key => (entities[key as EntityType]?.length ?? 0) > 0
    );

    const hasBlockingErrors = errors.some(e => e.severity === 'error');

    return {
      isValid: hasValidEntities && !hasBlockingErrors,
      errors,
      metadata: data.metadata || this.getDefaultMetadata(),
      entities
    };
  }

  /**
   * Validates metadata structure
   */
  private validateMetadata(metadata: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!metadata) {
      errors.push({
        type: 'missing_field',
        entityType: 'tasks',
        entityId: 'metadata',
        field: 'metadata',
        message: 'Import data must contain metadata',
        severity: 'error'
      });
      return errors;
    }

    // Check version
    if (!metadata.version) {
      errors.push({
        type: 'missing_field',
        entityType: 'tasks',
        entityId: 'metadata',
        field: 'version',
        message: 'Metadata must contain version',
        severity: 'error'
      });
    } else if (!this.SUPPORTED_VERSIONS.includes(metadata.version)) {
      errors.push({
        type: 'schema_version',
        entityType: 'tasks',
        entityId: 'metadata',
        field: 'version',
        message: `Unsupported schema version: ${metadata.version}. Supported versions: ${this.SUPPORTED_VERSIONS.join(', ')}`,
        severity: 'warning'
      });
    }

    // Check exportedAt
    if (!metadata.exportedAt) {
      errors.push({
        type: 'missing_field',
        entityType: 'tasks',
        entityId: 'metadata',
        field: 'exportedAt',
        message: 'Metadata must contain exportedAt timestamp',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validates a collection of entities
   */
  private validateEntityCollection(
    entityType: EntityType,
    collection: any
  ): {
    errors: ValidationError[];
    validEntities: any[];
  } {
    const errors: ValidationError[] = [];
    const validEntities: any[] = [];

    if (!Array.isArray(collection)) {
      errors.push({
        type: 'invalid_type',
        entityType,
        entityId: 'collection',
        message: `${entityType} must be an array`,
        severity: 'error'
      });
      return { errors, validEntities };
    }

    for (const item of collection) {
      const itemErrors = this.validateEntity(entityType, item);

      if (itemErrors.length === 0 || itemErrors.every(e => e.severity === 'warning')) {
        validEntities.push(item);
      }

      errors.push(...itemErrors);
    }

    return { errors, validEntities };
  }

  /**
   * Validates a single entity based on its type
   */
  private validateEntity(entityType: EntityType, entity: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic validation
    if (!entity || typeof entity !== 'object') {
      errors.push({
        type: 'invalid_type',
        entityType,
        entityId: 'unknown',
        message: 'Entity must be a valid object',
        severity: 'error'
      });
      return errors;
    }

    // Check for required ID field
    if (!entity.id || typeof entity.id !== 'string') {
      errors.push({
        type: 'missing_field',
        entityType,
        entityId: entity.id || 'unknown',
        field: 'id',
        message: 'Entity must have a valid string ID',
        severity: 'error'
      });
    }

    // Type-specific validation
    switch (entityType) {
      case 'tasks':
        errors.push(...this.validateTask(entity));
        break;
      case 'projects':
        errors.push(...this.validateProject(entity));
        break;
      case 'goals':
        errors.push(...this.validateGoal(entity));
        break;
      case 'thoughts':
        errors.push(...this.validateThought(entity));
        break;
      case 'moods':
        errors.push(...this.validateMood(entity));
        break;
      case 'focusSessions':
        errors.push(...this.validateFocusSession(entity));
        break;
      case 'people':
        errors.push(...this.validatePerson(entity));
        break;
      case 'portfolios':
        errors.push(...this.validatePortfolio(entity));
        break;
    }

    return errors;
  }

  // Entity-specific validation methods

  private validateTask(task: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!task.title || typeof task.title !== 'string') {
      errors.push({
        type: 'missing_field',
        entityType: 'tasks',
        entityId: task.id,
        field: 'title',
        message: 'Task must have a title',
        severity: 'error'
      });
    }

    if (task.done !== undefined && typeof task.done !== 'boolean') {
      errors.push({
        type: 'invalid_type',
        entityType: 'tasks',
        entityId: task.id,
        field: 'done',
        message: 'Task done field must be a boolean',
        severity: 'warning'
      });
    }

    return errors;
  }

  private validateProject(project: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!project.title || typeof project.title !== 'string') {
      errors.push({
        type: 'missing_field',
        entityType: 'projects',
        entityId: project.id,
        field: 'title',
        message: 'Project must have a title',
        severity: 'error'
      });
    }

    return errors;
  }

  private validateGoal(goal: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!goal.title || typeof goal.title !== 'string') {
      errors.push({
        type: 'missing_field',
        entityType: 'goals',
        entityId: goal.id,
        field: 'title',
        message: 'Goal must have a title',
        severity: 'error'
      });
    }

    return errors;
  }

  private validateThought(thought: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!thought.text || typeof thought.text !== 'string') {
      errors.push({
        type: 'missing_field',
        entityType: 'thoughts',
        entityId: thought.id,
        field: 'text',
        message: 'Thought must have text content',
        severity: 'error'
      });
    }

    return errors;
  }

  private validateMood(mood: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (mood.value === undefined || typeof mood.value !== 'number') {
      errors.push({
        type: 'missing_field',
        entityType: 'moods',
        entityId: mood.id,
        field: 'value',
        message: 'Mood must have a numeric value',
        severity: 'error'
      });
    } else if (mood.value < 1 || mood.value > 10) {
      errors.push({
        type: 'invalid_type',
        entityType: 'moods',
        entityId: mood.id,
        field: 'value',
        message: 'Mood value must be between 1 and 10',
        severity: 'warning'
      });
    }

    return errors;
  }

  private validateFocusSession(session: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!session.duration || typeof session.duration !== 'number') {
      errors.push({
        type: 'missing_field',
        entityType: 'focusSessions',
        entityId: session.id,
        field: 'duration',
        message: 'Focus session must have a duration',
        severity: 'error'
      });
    }

    if (!Array.isArray(session.tasks)) {
      errors.push({
        type: 'invalid_type',
        entityType: 'focusSessions',
        entityId: session.id,
        field: 'tasks',
        message: 'Focus session tasks must be an array',
        severity: 'warning'
      });
    }

    return errors;
  }

  private validatePerson(person: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!person.name || typeof person.name !== 'string') {
      errors.push({
        type: 'missing_field',
        entityType: 'people',
        entityId: person.id,
        field: 'name',
        message: 'Person must have a name',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Returns default metadata structure
   */
  private getDefaultMetadata(): ExportMetadata {
    return {
      version: this.CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      userId: 'unknown',
      totalItems: 0,
      entityCounts: {
        tasks: 0,
        projects: 0,
        goals: 0,
        thoughts: 0,
        moods: 0,
        focusSessions: 0,
        people: 0,
        portfolios: 0,
        spending: 0,
        relationships: 0,
        llmLogs: 0,
      }
    };
  }

  private validatePortfolio(portfolio: Portfolio): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!portfolio.name || typeof portfolio.name !== 'string') {
      errors.push({
        type: 'missing_field',
        entityType: 'portfolios',
        entityId: portfolio.id,
        field: 'name',
        message: 'Portfolio must have a name',
        severity: 'error',
      });
    }

    if (portfolio.investments && !Array.isArray(portfolio.investments)) {
      errors.push({
        type: 'invalid_type',
        entityType: 'portfolios',
        entityId: portfolio.id,
        field: 'investments',
        message: 'Investments must be an array',
        severity: 'error',
      });
    } else if (Array.isArray(portfolio.investments)) {
      for (const investment of portfolio.investments) {
        if (!investment.id || typeof investment.id !== 'string') {
          errors.push({
            type: 'missing_field',
            entityType: 'portfolios',
            entityId: portfolio.id,
            field: 'investment.id',
            message: 'Each investment requires a valid ID',
            severity: 'warning',
          });
        }
        if (!investment.name || typeof investment.name !== 'string') {
          errors.push({
            type: 'missing_field',
            entityType: 'portfolios',
            entityId: portfolio.id,
            field: 'investment.name',
            message: 'Each investment should have a name for clarity',
            severity: 'warning',
          });
        }
        if (investment.currency && typeof investment.currency !== 'string') {
          errors.push({
            type: 'invalid_type',
            entityType: 'portfolios',
            entityId: portfolio.id,
            field: 'investment.currency',
            message: 'Investment currency must be a string',
            severity: 'warning',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Calculates file size for import data
   */
  calculateDataSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Estimates import time based on data size
   */
  estimateImportTime(totalItems: number, dataSize: number): number {
    // Rough estimate: ~100 items per second for small items
    // Adjust based on data size
    const baseTime = (totalItems / 100) * 1000; // milliseconds
    const sizeAdjustment = (dataSize / 1024 / 1024) * 500; // 500ms per MB
    return Math.ceil(baseTime + sizeAdjustment);
  }
}
