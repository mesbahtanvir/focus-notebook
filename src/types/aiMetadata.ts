/**
 * Comprehensive AI Action Tracking System
 *
 * This system tracks all AI-performed actions for full audit trail and revert capability
 */

export type AIActionType = 'create' | 'update' | 'delete' | 'link';
export type AITargetType = 'task' | 'mood' | 'project' | 'goal' | 'tag' | 'thought';
export type AISourceType = 'thought' | 'task' | 'mood' | 'manual';

/**
 * Metadata attached to items created/modified by AI
 */
export interface AIActionMetadata {
  id: string; // Unique ID for this action
  sourceType: AISourceType; // What triggered this action
  sourceId: string; // ID of the source (e.g., thought ID)
  actionType: AIActionType; // What was done
  targetType: AITargetType; // What was affected
  targetId: string; // ID of the affected item
  performedAt: string; // ISO timestamp
  performedBy: 'ai' | 'user'; // Who performed it
  suggestionId?: string; // Link back to original AI suggestion
  confidence?: number; // AI confidence score (0-100)

  // For reverting
  originalData?: any; // State before action (for updates/deletes)
  newData?: any; // State after action (for creates/updates)

  // Additional context
  reasoning?: string; // Why AI made this action
  relatedActionIds?: string[]; // Other actions performed together
}

/**
 * Action history tracking for comprehensive audit trail
 */
export interface AIActionHistory {
  actions: AIActionMetadata[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Extended interfaces for items with AI tracking
 */
export interface WithAIMetadata {
  aiMetadata?: AIActionMetadata;
  createdBy?: 'ai' | 'user';
  aiActionHistory?: AIActionMetadata[]; // Full history of AI actions on this item
}

