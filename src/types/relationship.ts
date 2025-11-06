/**
 * Unified Relationship System
 *
 * This system provides a consistent way to connect thoughts to:
 * - Other entities (tasks, projects, goals, moods, people)
 * - Tools (for processing and analysis)
 *
 * Relationships replace the previous tag-based and array-based linking systems,
 * providing rich metadata, bidirectional queries, and clear semantics.
 */

import type { ToolSpecId } from '../../../shared/toolSpecs';

// ============================================================================
// Entity Types
// ============================================================================

/**
 * All entity types that can participate in relationships
 */
export type EntityType =
  | 'thought'
  | 'task'
  | 'project'
  | 'goal'
  | 'mood'
  | 'tool'      // Tools are first-class entities
  | 'person';   // Friends/relationships

// ============================================================================
// Relationship Types
// ============================================================================

/**
 * Semantic types describing the nature of a relationship
 */
export type RelationshipType =
  // ----- Tool Relationships -----
  | 'should-be-processed-by'   // AI suggests this thought needs processing by tool
  | 'processed-by'             // Tool has analyzed/processed this content
  | 'analyzed-with'            // User manually ran analysis with tool

  // ----- Creation Relationships -----
  | 'created-from'             // Entity was created from another (e.g., task from thought)
  | 'inspired-by'              // Entity was inspired by another
  | 'derived-from'             // Entity is a derivative of another

  // ----- Hierarchical Relationships -----
  | 'part-of'                  // Entity is part of another (e.g., thought part of project)
  | 'sub-item-of'              // Entity is a child of another
  | 'parent-of'                // Entity is parent of another

  // ----- Dependency Relationships -----
  | 'blocks'                   // Entity blocks another from progressing
  | 'blocked-by'               // Entity is blocked by another
  | 'depends-on'               // Entity depends on completion of another
  | 'required-by'              // Entity is required by another

  // ----- Semantic Relationships -----
  | 'related-to'               // Generic similarity/relevance
  | 'mentions'                 // Entity mentions another (e.g., thought mentions person)
  | 'references'               // Entity references another
  | 'linked-to'                // User-created manual link

  // ----- Temporal Relationships -----
  | 'precedes'                 // Entity came before another
  | 'follows'                  // Entity came after another
  | 'supersedes'               // Entity replaces/updates previous version
  | 'superseded-by'            // Entity was replaced by newer version

  // ----- Emotional/Contextual Relationships -----
  | 'triggered-by'             // Mood/emotion triggered by entity
  | 'contributed-to'           // Entity contributed to outcome/mood
  | 'affected-by';             // Entity was affected by another

// ============================================================================
// Tool Processing Data
// ============================================================================

/**
 * CBT-specific analysis results
 */
export interface CBTAnalysis {
  situation?: string;
  automaticThought?: string;
  emotion?: string;
  evidence?: string;
  alternativeThought?: string;
  outcome?: string;
  distortions?: string[];
  analyzedAt?: string;
}

/**
 * Brainstorm-specific results
 */
export interface BrainstormResults {
  ideas: string[];
  conversationSummary?: string;
  actionItems?: string[];
  sessionDuration?: number;
}

/**
 * Deep reflection results
 */
export interface DeepReflectionResults {
  insights: string[];
  themes: string[];
  questions: string[];
  reflectionDepth?: number;
}

/**
 * Data specific to tool processing relationships
 * Only present when relationshipType is tool-related and targetType is 'tool'
 */
export interface ToolProcessingData {
  // Processing lifecycle
  processedAt?: string;           // When tool last processed this
  processingCount: number;        // How many times tool has processed this
  lastProcessingSession?: string; // ID of last processing session

  // Generated actions
  actionsGenerated?: string[];    // IDs of relationships/entities this tool created

  // Tool-specific results (only one will be present based on toolId)
  cbtAnalysis?: CBTAnalysis;
  brainstormResults?: BrainstormResults;
  deepReflectionResults?: DeepReflectionResults;

  // Generic results for other tools
  customResults?: Record<string, any>;

  // Processing metadata
  tokensUsed?: number;
  model?: string;
  processingDuration?: number;  // milliseconds
}

// ============================================================================
// Core Relationship Interface
// ============================================================================

/**
 * Represents a connection between two entities
 *
 * Examples:
 * - Thought → Task (created-from)
 * - Thought → Tool:CBT (processed-by)
 * - Thought → Project (part-of)
 * - Task → Project (part-of)
 * - Thought → Person (mentions)
 */
export interface Relationship {
  id: string;

  // ----- Connection -----
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;  // For tools: ToolSpecId like 'cbt', 'brainstorm', etc.

  // ----- Semantics -----
  relationshipType: RelationshipType;
  strength: number;  // 0-100: confidence/relevance/importance

  // ----- Metadata -----
  createdBy: 'ai' | 'user';
  createdAt: string;  // ISO timestamp
  updatedAt?: string;
  reasoning?: string;  // Why this relationship exists (especially useful for AI-created)

  // ----- Lifecycle -----
  status: 'active' | 'archived' | 'rejected';

  // ----- Tool-specific data -----
  toolProcessingData?: ToolProcessingData;

  // ----- Context -----
  metadata?: {
    // Track which tool created this relationship
    createdByTool?: ToolSpecId;
    createdByToolRelationship?: string;  // ID of tool relationship that created this

    // AI suggestion tracking
    aiSuggestionId?: string;
    aiConfidence?: number;

    // User context
    contextSnapshot?: string;  // Why this was relevant at creation time
    userNote?: string;

    // Additional tool-specific metadata
    [key: string]: any;
  };
}

// ============================================================================
// Relationship Status
// ============================================================================

/**
 * Lifecycle status of a relationship
 */
export type RelationshipStatus = 'active' | 'archived' | 'rejected';

/**
 * Status transition rules
 */
export const RELATIONSHIP_STATUS_TRANSITIONS: Record<RelationshipStatus, RelationshipStatus[]> = {
  active: ['archived', 'rejected'],
  archived: ['active'],           // Can reactivate archived relationships
  rejected: ['active'],            // Can reconsider rejected relationships
};

// ============================================================================
// Query Filters
// ============================================================================

/**
 * Filter options for querying relationships
 */
export interface RelationshipQuery {
  // Entity filters
  sourceType?: EntityType;
  sourceId?: string;
  targetType?: EntityType;
  targetId?: string;

  // Relationship filters
  relationshipType?: RelationshipType | RelationshipType[];
  status?: RelationshipStatus | RelationshipStatus[];
  createdBy?: 'ai' | 'user';

  // Strength filters
  minStrength?: number;
  maxStrength?: number;

  // Time filters
  createdAfter?: string;
  createdBefore?: string;

  // Tool filters (when targetType is 'tool')
  toolId?: ToolSpecId;
  hasBeenProcessed?: boolean;  // toolProcessingData.processingCount > 0

  // Metadata filters
  createdByTool?: ToolSpecId;

  // Limit/pagination
  limit?: number;
  offset?: number;
}

/**
 * Options for creating a relationship
 */
export interface CreateRelationshipOptions {
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationshipType: RelationshipType;
  strength?: number;  // Default: 100 for user-created, AI confidence for AI-created
  createdBy: 'ai' | 'user';
  reasoning?: string;
  metadata?: Relationship['metadata'];
  toolProcessingData?: ToolProcessingData;
}

/**
 * Options for updating a relationship
 */
export interface UpdateRelationshipOptions {
  relationshipType?: RelationshipType;
  strength?: number;
  status?: RelationshipStatus;
  reasoning?: string;
  toolProcessingData?: Partial<ToolProcessingData>;
  metadata?: Partial<Relationship['metadata']>;
}

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Check if a relationship is a tool relationship
 */
export function isToolRelationship(relationship: Relationship): boolean {
  return relationship.targetType === 'tool';
}

/**
 * Check if a tool relationship has been processed
 */
export function isToolProcessed(relationship: Relationship): boolean {
  return (
    isToolRelationship(relationship) &&
    (relationship.toolProcessingData?.processingCount ?? 0) > 0
  );
}

/**
 * Check if a relationship is pending processing
 */
export function isPendingProcessing(relationship: Relationship): boolean {
  return (
    isToolRelationship(relationship) &&
    relationship.relationshipType === 'should-be-processed-by' &&
    !isToolProcessed(relationship)
  );
}

/**
 * Check if relationship is AI-suggested but not accepted
 */
export function isAISuggestion(relationship: Relationship): boolean {
  return (
    relationship.createdBy === 'ai' &&
    relationship.status === 'active' &&
    relationship.strength < 95
  );
}

// ============================================================================
// Relationship Helpers
// ============================================================================

/**
 * Get the tool ID from a tool relationship
 */
export function getToolId(relationship: Relationship): ToolSpecId | null {
  if (!isToolRelationship(relationship)) {
    return null;
  }
  return relationship.targetId as ToolSpecId;
}

/**
 * Get a human-readable description of the relationship
 */
export function getRelationshipDescription(relationship: Relationship): string {
  const typeDescriptions: Record<RelationshipType, string> = {
    'should-be-processed-by': 'should be processed by',
    'processed-by': 'processed by',
    'analyzed-with': 'analyzed with',
    'created-from': 'created from',
    'inspired-by': 'inspired by',
    'derived-from': 'derived from',
    'part-of': 'part of',
    'sub-item-of': 'sub-item of',
    'parent-of': 'parent of',
    'blocks': 'blocks',
    'blocked-by': 'blocked by',
    'depends-on': 'depends on',
    'required-by': 'required by',
    'related-to': 'related to',
    'mentions': 'mentions',
    'references': 'references',
    'linked-to': 'linked to',
    'precedes': 'precedes',
    'follows': 'follows',
    'supersedes': 'supersedes',
    'superseded-by': 'superseded by',
    'triggered-by': 'triggered by',
    'contributed-to': 'contributed to',
    'affected-by': 'affected by',
  };

  return typeDescriptions[relationship.relationshipType] || relationship.relationshipType;
}

/**
 * Create a bidirectional relationship pair
 * Returns [forward, reverse] relationships
 */
export function getBidirectionalPair(
  relationship: Relationship
): [RelationshipType, RelationshipType] | null {
  const pairs: Record<RelationshipType, RelationshipType> = {
    'parent-of': 'sub-item-of',
    'sub-item-of': 'parent-of',
    'blocks': 'blocked-by',
    'blocked-by': 'blocks',
    'depends-on': 'required-by',
    'required-by': 'depends-on',
    'precedes': 'follows',
    'follows': 'precedes',
    'supersedes': 'superseded-by',
    'superseded-by': 'supersedes',
  } as Record<RelationshipType, RelationshipType>;

  const reverse = pairs[relationship.relationshipType];
  return reverse ? [relationship.relationshipType, reverse] : null;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate relationship strength
 */
export function isValidStrength(strength: number): boolean {
  return strength >= 0 && strength <= 100;
}

/**
 * Validate relationship type for given entity types
 */
export function isValidRelationshipType(
  sourceType: EntityType,
  targetType: EntityType,
  relationshipType: RelationshipType
): boolean {
  // Tool relationships only valid when target is 'tool'
  const toolRelationships = ['should-be-processed-by', 'processed-by', 'analyzed-with'];
  if (toolRelationships.includes(relationshipType)) {
    return targetType === 'tool';
  }

  // Some relationships only make sense for certain entity types
  // Can be extended as needed
  return true;
}

/**
 * Validate relationship status transition
 */
export function canTransitionStatus(
  from: RelationshipStatus,
  to: RelationshipStatus
): boolean {
  return RELATIONSHIP_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
