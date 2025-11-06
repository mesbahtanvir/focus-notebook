import { create } from 'zustand';
import { collection, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseClient';
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';
import type {
  Relationship,
  RelationshipQuery,
  CreateRelationshipOptions,
  UpdateRelationshipOptions,
  EntityType,
  RelationshipType,
  RelationshipStatus,
  ToolProcessingData,
} from '@/types/relationship';
import {
  isToolRelationship,
  isToolProcessed,
  isPendingProcessing,
  isValidStrength,
  canTransitionStatus,
} from '@/types/relationship';
import type { ToolSpecId } from '../../shared/toolSpecs';

// ============================================================================
// Store State Interface
// ============================================================================

type State = {
  // Data
  relationships: Relationship[];
  isLoading: boolean;
  error: string | null;

  // Subscription management
  isSubscribed: boolean;
  unsubscribe: (() => void) | null;

  // Core operations
  subscribe: (userId: string) => void;
  createRelationship: (options: CreateRelationshipOptions) => Promise<Relationship>;
  updateRelationship: (id: string, updates: UpdateRelationshipOptions) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;
  archiveRelationship: (id: string) => Promise<void>;
  rejectRelationship: (id: string) => Promise<void>;
  reactivateRelationship: (id: string) => Promise<void>;

  // Batch operations
  createRelationships: (options: CreateRelationshipOptions[]) => Promise<Relationship[]>;
  deleteRelationships: (ids: string[]) => Promise<void>;

  // Query helpers
  getRelationship: (id: string) => Relationship | undefined;
  queryRelationships: (filter: RelationshipQuery) => Relationship[];
  getRelationshipsFor: (entityType: EntityType, entityId: string) => Relationship[];
  getRelationshipsBetween: (
    sourceType: EntityType,
    sourceId: string,
    targetType: EntityType,
    targetId: string
  ) => Relationship[];

  // Tool-specific queries
  getToolRelationships: (thoughtId: string) => Relationship[];
  getPendingToolProcessing: (thoughtId: string) => Relationship[];
  getProcessedTools: (thoughtId: string) => Relationship[];
  getToolProcessingData: (thoughtId: string, toolId: ToolSpecId) => ToolProcessingData | null;

  // Entity relationship queries
  getLinkedTasks: (entityType: EntityType, entityId: string) => Relationship[];
  getLinkedProjects: (entityType: EntityType, entityId: string) => Relationship[];
  getLinkedGoals: (entityType: EntityType, entityId: string) => Relationship[];
  getLinkedMoods: (entityType: EntityType, entityId: string) => Relationship[];

  // AI suggestions
  getAISuggestions: (entityId: string) => Relationship[];
  acceptSuggestion: (id: string) => Promise<void>;

  // Statistics
  getRelationshipCount: (entityType: EntityType, entityId: string) => number;
  getToolUsageStats: (toolId: ToolSpecId) => { totalProcessed: number; averageStrength: number };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique relationship ID
 */
function generateRelationshipId(): string {
  return `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Apply query filters to relationships array
 */
function applyFilters(relationships: Relationship[], filter: RelationshipQuery): Relationship[] {
  let filtered = [...relationships];

  // Entity filters
  if (filter.sourceType) {
    filtered = filtered.filter((r) => r.sourceType === filter.sourceType);
  }
  if (filter.sourceId) {
    filtered = filtered.filter((r) => r.sourceId === filter.sourceId);
  }
  if (filter.targetType) {
    filtered = filtered.filter((r) => r.targetType === filter.targetType);
  }
  if (filter.targetId) {
    filtered = filtered.filter((r) => r.targetId === filter.targetId);
  }

  // Relationship type filter
  if (filter.relationshipType) {
    if (Array.isArray(filter.relationshipType)) {
      filtered = filtered.filter((r) => filter.relationshipType!.includes(r.relationshipType));
    } else {
      filtered = filtered.filter((r) => r.relationshipType === filter.relationshipType);
    }
  }

  // Status filter
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      filtered = filtered.filter((r) => filter.status!.includes(r.status));
    } else {
      filtered = filtered.filter((r) => r.status === filter.status);
    }
  }

  // Created by filter
  if (filter.createdBy) {
    filtered = filtered.filter((r) => r.createdBy === filter.createdBy);
  }

  // Strength filters
  if (filter.minStrength !== undefined) {
    filtered = filtered.filter((r) => r.strength >= filter.minStrength!);
  }
  if (filter.maxStrength !== undefined) {
    filtered = filtered.filter((r) => r.strength <= filter.maxStrength!);
  }

  // Time filters
  if (filter.createdAfter) {
    filtered = filtered.filter((r) => r.createdAt >= filter.createdAfter!);
  }
  if (filter.createdBefore) {
    filtered = filtered.filter((r) => r.createdAt <= filter.createdBefore!);
  }

  // Tool filters
  if (filter.toolId) {
    filtered = filtered.filter((r) => r.targetType === 'tool' && r.targetId === filter.toolId);
  }
  if (filter.hasBeenProcessed !== undefined) {
    filtered = filtered.filter((r) => {
      const processed = (r.toolProcessingData?.processingCount ?? 0) > 0;
      return processed === filter.hasBeenProcessed;
    });
  }
  if (filter.createdByTool) {
    filtered = filtered.filter((r) => r.metadata?.createdByTool === filter.createdByTool);
  }

  // Sort by createdAt descending (newest first)
  filtered.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  // Pagination
  if (filter.offset) {
    filtered = filtered.slice(filter.offset);
  }
  if (filter.limit) {
    filtered = filtered.slice(0, filter.limit);
  }

  return filtered;
}

// ============================================================================
// Zustand Store
// ============================================================================

export const useEntityRelationships = create<State>((set, get) => ({
  // ----- Initial State -----
  relationships: [],
  isLoading: false,
  error: null,
  isSubscribed: false,
  unsubscribe: null,

  // ----- Subscription -----
  subscribe: (userId: string) => {
    const current = get().unsubscribe;
    if (current) current();

    set({ isLoading: true, error: null });

    const relationshipsRef = collection(db, `users/${userId}/relationships`);
    const q = query(relationshipsRef, orderBy('createdAt', 'desc'));

    const unsub = subscribeCol<Relationship>(q as any, (rows) => {
      set({
        relationships: rows,
        isLoading: false,
        isSubscribed: true,
        error: null,
      });
    });

    set({ unsubscribe: unsub });
  },

  // ----- Create -----
  createRelationship: async (options: CreateRelationshipOptions): Promise<Relationship> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    // Validate strength
    const strength = options.strength ?? (options.createdBy === 'user' ? 100 : 80);
    if (!isValidStrength(strength)) {
      throw new Error(`Invalid strength: ${strength}. Must be between 0 and 100.`);
    }

    const relationship: Relationship = {
      id: generateRelationshipId(),
      sourceType: options.sourceType,
      sourceId: options.sourceId,
      targetType: options.targetType,
      targetId: options.targetId,
      relationshipType: options.relationshipType,
      strength,
      createdBy: options.createdBy,
      createdAt: now(),
      status: 'active',
      reasoning: options.reasoning,
      toolProcessingData: options.toolProcessingData,
      metadata: options.metadata,
    };

    const path = `users/${userId}/relationships/${relationship.id}`;
    await createAt(path, relationship);

    return relationship;
  },

  // ----- Update -----
  updateRelationship: async (id: string, updates: UpdateRelationshipOptions): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const existing = get().getRelationship(id);
    if (!existing) throw new Error(`Relationship ${id} not found`);

    // Validate status transition
    if (updates.status && !canTransitionStatus(existing.status, updates.status)) {
      throw new Error(`Cannot transition from ${existing.status} to ${updates.status}`);
    }

    // Validate strength
    if (updates.strength !== undefined && !isValidStrength(updates.strength)) {
      throw new Error(`Invalid strength: ${updates.strength}`);
    }

    const { toolProcessingData, metadata, ...otherUpdates } = updates;

    const updatedFields: Partial<Relationship> = {
      ...otherUpdates,
      updatedAt: now(),
    };

    // Handle toolProcessingData updates (merge with existing)
    if (toolProcessingData) {
      updatedFields.toolProcessingData = {
        ...existing.toolProcessingData,
        ...toolProcessingData,
      } as ToolProcessingData;
    }

    // Handle metadata updates (merge with existing)
    if (metadata) {
      updatedFields.metadata = {
        ...existing.metadata,
        ...metadata,
      };
    }

    const path = `users/${userId}/relationships/${id}`;
    await updateAt(path, updatedFields);
  },

  // ----- Delete -----
  deleteRelationship: async (id: string): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const path = `users/${userId}/relationships/${id}`;
    await deleteAt(path);
  },

  // ----- Status Updates -----
  archiveRelationship: async (id: string): Promise<void> => {
    await get().updateRelationship(id, { status: 'archived' });
  },

  rejectRelationship: async (id: string): Promise<void> => {
    await get().updateRelationship(id, { status: 'rejected' });
  },

  reactivateRelationship: async (id: string): Promise<void> => {
    await get().updateRelationship(id, { status: 'active' });
  },

  // ----- Batch Operations -----
  createRelationships: async (options: CreateRelationshipOptions[]): Promise<Relationship[]> => {
    const relationships = await Promise.all(options.map((opt) => get().createRelationship(opt)));
    return relationships;
  },

  deleteRelationships: async (ids: string[]): Promise<void> => {
    await Promise.all(ids.map((id) => get().deleteRelationship(id)));
  },

  // ----- Query Helpers -----
  getRelationship: (id: string): Relationship | undefined => {
    return get().relationships.find((r) => r.id === id);
  },

  queryRelationships: (filter: RelationshipQuery): Relationship[] => {
    return applyFilters(get().relationships, filter);
  },

  getRelationshipsFor: (entityType: EntityType, entityId: string): Relationship[] => {
    return get().relationships.filter(
      (r) =>
        (r.sourceType === entityType && r.sourceId === entityId) ||
        (r.targetType === entityType && r.targetId === entityId)
    );
  },

  getRelationshipsBetween: (
    sourceType: EntityType,
    sourceId: string,
    targetType: EntityType,
    targetId: string
  ): Relationship[] => {
    return get().relationships.filter(
      (r) =>
        r.sourceType === sourceType &&
        r.sourceId === sourceId &&
        r.targetType === targetType &&
        r.targetId === targetId &&
        r.status === 'active'
    );
  },

  // ----- Tool-Specific Queries -----
  getToolRelationships: (thoughtId: string): Relationship[] => {
    return get().relationships.filter(
      (r) =>
        r.sourceType === 'thought' &&
        r.sourceId === thoughtId &&
        r.targetType === 'tool' &&
        r.status === 'active'
    );
  },

  getPendingToolProcessing: (thoughtId: string): Relationship[] => {
    return get()
      .getToolRelationships(thoughtId)
      .filter((r) => isPendingProcessing(r));
  },

  getProcessedTools: (thoughtId: string): Relationship[] => {
    return get()
      .getToolRelationships(thoughtId)
      .filter((r) => isToolProcessed(r));
  },

  getToolProcessingData: (thoughtId: string, toolId: ToolSpecId): ToolProcessingData | null => {
    const relationship = get().relationships.find(
      (r) =>
        r.sourceType === 'thought' &&
        r.sourceId === thoughtId &&
        r.targetType === 'tool' &&
        r.targetId === toolId &&
        r.status === 'active'
    );
    return relationship?.toolProcessingData ?? null;
  },

  // ----- Entity Relationship Queries -----
  getLinkedTasks: (entityType: EntityType, entityId: string): Relationship[] => {
    return get().relationships.filter(
      (r) =>
        r.sourceType === entityType &&
        r.sourceId === entityId &&
        r.targetType === 'task' &&
        r.status === 'active'
    );
  },

  getLinkedProjects: (entityType: EntityType, entityId: string): Relationship[] => {
    return get().relationships.filter(
      (r) =>
        r.sourceType === entityType &&
        r.sourceId === entityId &&
        r.targetType === 'project' &&
        r.status === 'active'
    );
  },

  getLinkedGoals: (entityType: EntityType, entityId: string): Relationship[] => {
    return get().relationships.filter(
      (r) =>
        r.sourceType === entityType &&
        r.sourceId === entityId &&
        r.targetType === 'goal' &&
        r.status === 'active'
    );
  },

  getLinkedMoods: (entityType: EntityType, entityId: string): Relationship[] => {
    return get().relationships.filter(
      (r) =>
        r.sourceType === entityType &&
        r.sourceId === entityId &&
        r.targetType === 'mood' &&
        r.status === 'active'
    );
  },

  // ----- AI Suggestions -----
  getAISuggestions: (entityId: string): Relationship[] => {
    return get().relationships.filter(
      (r) =>
        r.sourceId === entityId &&
        r.createdBy === 'ai' &&
        r.status === 'active' &&
        r.strength < 95 // Suggestions have lower confidence
    );
  },

  acceptSuggestion: async (id: string): Promise<void> => {
    // When accepting a suggestion, increase strength to 100
    await get().updateRelationship(id, { strength: 100 });
  },

  // ----- Statistics -----
  getRelationshipCount: (entityType: EntityType, entityId: string): number => {
    return get().getRelationshipsFor(entityType, entityId).length;
  },

  getToolUsageStats: (
    toolId: ToolSpecId
  ): { totalProcessed: number; averageStrength: number } => {
    const toolRels = get().relationships.filter(
      (r) =>
        r.targetType === 'tool' &&
        r.targetId === toolId &&
        isToolProcessed(r) &&
        r.status === 'active'
    );

    const totalProcessed = toolRels.length;
    const averageStrength =
      totalProcessed > 0
        ? toolRels.reduce((sum, r) => sum + r.strength, 0) / totalProcessed
        : 0;

    return { totalProcessed, averageStrength };
  },
}));
