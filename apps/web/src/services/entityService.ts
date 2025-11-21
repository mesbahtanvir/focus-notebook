/**
 * Centralized Entity Service
 *
 * All entity creation, updates, and linking MUST go through this service.
 * This ensures data consistency, proper entity graph management, and centralized validation.
 *
 * DO NOT directly call store methods (useX.getState().add) from UI or other code.
 */

import { useTasks, Task } from '@/store/useTasks';
import { useMoods, MoodEntry } from '@/store/useMoods';
import { useGoals, Goal } from '@/store/useGoals';
import { useProjects, Project } from '@/store/useProjects';
import { useFriends, Friend } from '@/store/useFriends';
import { useEntityGraph } from '@/store/useEntityGraph';
import type { EntityType, RelationshipType } from '@/types/entityGraph';

// ============================================================================
// Types
// ============================================================================

export type EntityCreationSource = 'ai' | 'user';

export interface EntityCreationOptions {
  /** Entity that triggered this creation (e.g., thought that created this task) */
  sourceEntity?: {
    type: EntityType;
    id: string;
  };
  /** Who/what created this entity */
  createdBy?: EntityCreationSource;
  /** AI confidence score (0-100) if created by AI */
  confidence?: number;
  /** AI reasoning for this action */
  reasoning?: string;
  /** Relationship type to use (default: 'created-from' for source entities) */
  relationshipType?: RelationshipType;
}

export interface LinkingOptions {
  /** Relationship type (default: 'linked-to') */
  relationshipType?: RelationshipType;
  /** Relationship strength (0-100) */
  strength?: number;
  /** Who/what created this link */
  createdBy?: EntityCreationSource;
  /** Reasoning for this link */
  reasoning?: string;
}

export interface EntityServiceResult<T = string> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates and sanitizes task category
 */
function validateTaskCategory(category?: string): 'mastery' | 'pleasure' {
  if (category === 'mastery' || category === 'pleasure') {
    return category;
  }
  return 'mastery'; // Default to mastery if invalid
}

/**
 * Validates and sanitizes mood value (must be 1-10)
 */
function validateMoodValue(value: any): number {
  let moodValue = 5; // Default to neutral

  if (typeof value === 'number' && !isNaN(value)) {
    moodValue = Math.min(10, Math.max(1, Math.round(value)));
  } else if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      moodValue = Math.min(10, Math.max(1, Math.round(parsed)));
    }
  }

  return moodValue;
}

/**
 * Validates goal timeframe
 */
function validateGoalTimeframe(timeframe?: string): 'immediate' | 'short-term' | 'long-term' {
  if (timeframe === 'immediate' || timeframe === 'short-term' || timeframe === 'long-term') {
    return timeframe;
  }
  return 'short-term'; // Default
}

// ============================================================================
// Task Operations
// ============================================================================

/**
 * Creates a new task with automatic relationship management
 */
export async function createTask(
  taskData: Omit<Task, 'id' | 'createdAt'>,
  options: EntityCreationOptions = {}
): Promise<EntityServiceResult<string>> {
  try {
    // Validate category
    const validatedData: Omit<Task, 'id' | 'createdAt'> = {
      ...taskData,
      category: validateTaskCategory(taskData.category),
      createdBy: (options.createdBy || 'user') as 'ai' | 'user',
      status: taskData.status || 'active',
      focusEligible: taskData.focusEligible ?? true,
      done: taskData.done ?? false,
    };

    // Create task
    const addTask = useTasks.getState().add;
    const taskId = await addTask(validatedData);

    // Create relationship if source entity provided
    if (options.sourceEntity) {
      await useEntityGraph.getState().createRelationship({
        sourceType: options.sourceEntity.type,
        sourceId: options.sourceEntity.id,
        targetType: 'task',
        targetId: taskId,
        relationshipType: options.relationshipType || 'created-from',
        strength: options.confidence,
        createdBy: options.createdBy || 'user',
        reasoning: options.reasoning,
      });
    }

    return { success: true, data: taskId };
  } catch (error) {
    console.error('Failed to create task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Links a task to another entity
 */
export async function linkTaskToEntity(
  taskId: string,
  entityType: EntityType,
  entityId: string,
  options: LinkingOptions = {}
): Promise<EntityServiceResult<void>> {
  try {
    await useEntityGraph.getState().createRelationship({
      sourceType: entityType,
      sourceId: entityId,
      targetType: 'task',
      targetId: taskId,
      relationshipType: options.relationshipType || 'linked-to',
      strength: options.strength,
      createdBy: options.createdBy || 'user',
      reasoning: options.reasoning,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to link task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Mood Operations
// ============================================================================

/**
 * Creates a new mood entry with automatic relationship management
 */
export async function createMood(
  moodData: Omit<MoodEntry, 'id' | 'createdAt'>,
  options: EntityCreationOptions = {}
): Promise<EntityServiceResult<string>> {
  try {
    // Validate mood value
    const validatedData: Omit<MoodEntry, 'id' | 'createdAt'> = {
      ...moodData,
      value: validateMoodValue(moodData.value),
      note: moodData.note || '',
    };

    // Create mood
    const addMood = useMoods.getState().add;
    const moodId = await addMood(validatedData);

    // Create relationship if source entity provided
    if (options.sourceEntity) {
      await useEntityGraph.getState().createRelationship({
        sourceType: options.sourceEntity.type,
        sourceId: options.sourceEntity.id,
        targetType: 'mood',
        targetId: moodId,
        relationshipType: options.relationshipType || 'created-from',
        strength: options.confidence,
        createdBy: options.createdBy || 'user',
        reasoning: options.reasoning,
      });
    }

    return { success: true, data: moodId };
  } catch (error) {
    console.error('Failed to create mood:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Links a mood to another entity
 */
export async function linkMoodToEntity(
  moodId: string,
  entityType: EntityType,
  entityId: string,
  options: LinkingOptions = {}
): Promise<EntityServiceResult<void>> {
  try {
    await useEntityGraph.getState().createRelationship({
      sourceType: entityType,
      sourceId: entityId,
      targetType: 'mood',
      targetId: moodId,
      relationshipType: options.relationshipType || 'linked-to',
      strength: options.strength,
      createdBy: options.createdBy || 'user',
      reasoning: options.reasoning,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to link mood:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Goal Operations
// ============================================================================

/**
 * Creates a new goal with automatic relationship management
 */
export async function createGoal(
  goalData: Omit<Goal, 'id' | 'createdAt'>,
  options: EntityCreationOptions = {}
): Promise<EntityServiceResult<string>> {
  try {
    // Validate timeframe and map createdBy to source
    const sourceMapping: Record<EntityCreationSource, 'ai' | 'manual'> = {
      ai: 'ai',
      user: 'manual',
    };
    const validatedData: Omit<Goal, 'id' | 'createdAt'> = {
      ...goalData,
      timeframe: validateGoalTimeframe(goalData.timeframe),
      source: sourceMapping[options.createdBy || 'user'],
      status: goalData.status || 'active',
      priority: goalData.priority || 'medium',
      progress: goalData.progress || 0,
    };

    // Create goal
    const addGoal = useGoals.getState().add;
    const goalId = await addGoal(validatedData);

    // Create relationship if source entity provided
    if (options.sourceEntity) {
      await useEntityGraph.getState().createRelationship({
        sourceType: options.sourceEntity.type,
        sourceId: options.sourceEntity.id,
        targetType: 'goal',
        targetId: goalId,
        relationshipType: options.relationshipType || 'created-from',
        strength: options.confidence,
        createdBy: options.createdBy || 'user',
        reasoning: options.reasoning,
      });
    }

    return { success: true, data: goalId };
  } catch (error) {
    console.error('Failed to create goal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Links a goal to another entity
 */
export async function linkGoalToEntity(
  goalId: string,
  entityType: EntityType,
  entityId: string,
  options: LinkingOptions = {}
): Promise<EntityServiceResult<void>> {
  try {
    await useEntityGraph.getState().createRelationship({
      sourceType: entityType,
      sourceId: entityId,
      targetType: 'goal',
      targetId: goalId,
      relationshipType: options.relationshipType || 'linked-to',
      strength: options.strength,
      createdBy: options.createdBy || 'user',
      reasoning: options.reasoning,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to link goal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Project Operations
// ============================================================================

/**
 * Creates a new project with automatic relationship management
 */
export async function createProject(
  projectData: Omit<Project, 'id' | 'createdAt'>,
  options: EntityCreationOptions = {}
): Promise<EntityServiceResult<string>> {
  try {
    // Map createdBy to source
    const sourceMapping: Record<EntityCreationSource, 'ai' | 'manual'> = {
      ai: 'ai',
      user: 'manual',
    };
    const validatedData: Omit<Project, 'id' | 'createdAt'> = {
      ...projectData,
      source: sourceMapping[options.createdBy || 'user'],
      status: projectData.status || 'active',
    };

    // Create project
    const addProject = useProjects.getState().add;
    const projectId = await addProject(validatedData);

    // Create relationship if source entity provided
    if (options.sourceEntity) {
      await useEntityGraph.getState().createRelationship({
        sourceType: options.sourceEntity.type,
        sourceId: options.sourceEntity.id,
        targetType: 'project',
        targetId: projectId,
        relationshipType: options.relationshipType || 'created-from',
        strength: options.confidence,
        createdBy: options.createdBy || 'user',
        reasoning: options.reasoning,
      });
    }

    return { success: true, data: projectId };
  } catch (error) {
    console.error('Failed to create project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Links a project to another entity
 */
export async function linkProjectToEntity(
  projectId: string,
  entityType: EntityType,
  entityId: string,
  options: LinkingOptions = {}
): Promise<EntityServiceResult<void>> {
  try {
    await useEntityGraph.getState().createRelationship({
      sourceType: entityType,
      sourceId: entityId,
      targetType: 'project',
      targetId: projectId,
      relationshipType: options.relationshipType || 'linked-to',
      strength: options.strength,
      createdBy: options.createdBy || 'user',
      reasoning: options.reasoning,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to link project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Person/Friend Operations
// ============================================================================

/**
 * Links a person to another entity (e.g., thought mentions person)
 */
export async function linkPersonToEntity(
  personId: string,
  entityType: EntityType,
  entityId: string,
  options: LinkingOptions = {}
): Promise<EntityServiceResult<void>> {
  try {
    await useEntityGraph.getState().createRelationship({
      sourceType: entityType,
      sourceId: entityId,
      targetType: 'person',
      targetId: personId,
      relationshipType: options.relationshipType || 'mentions',
      strength: options.strength,
      createdBy: options.createdBy || 'user',
      reasoning: options.reasoning,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to link person:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Generic Linking Operations
// ============================================================================

/**
 * Creates a generic relationship between any two entities
 */
export async function linkEntities(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
  options: LinkingOptions = {}
): Promise<EntityServiceResult<void>> {
  try {
    await useEntityGraph.getState().createRelationship({
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType: options.relationshipType || 'linked-to',
      strength: options.strength,
      createdBy: options.createdBy || 'user',
      reasoning: options.reasoning,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to link entities:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Removes a relationship between two entities
 */
export async function unlinkEntities(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string
): Promise<EntityServiceResult<void>> {
  try {
    const relationships = useEntityGraph.getState().relationships;
    const relationship = relationships.find(
      r => r.sourceType === sourceType &&
           r.sourceId === sourceId &&
           r.targetType === targetType &&
           r.targetId === targetId
    );

    if (relationship) {
      await useEntityGraph.getState().deleteRelationship(relationship.id);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to unlink entities:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
