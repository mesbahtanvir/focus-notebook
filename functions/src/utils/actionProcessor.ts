/**
 * Action Processor Utility
 *
 * Processes AI actions: applies auto-actions and extracts suggestions
 */

import { CONFIG } from '../config';
import { AIAction } from './openaiClient';

export interface ProcessedActions {
  autoApply: {
    text?: string;
    textChanges?: Array<{
      type: string;
      from: string;
      to: string;
    }>;
    tagsToAdd: string[];
  };
  suggestions: Array<{
    id: string;
    type: string;
    confidence: number;
    data: any;
    reasoning: string;
    createdAt: string;
    status: 'pending';
  }>;
}

/**
 * Process actions into auto-apply and suggestions
 */
export function processActions(
  actions: AIAction[],
  currentThought: any
): ProcessedActions {
  const result: ProcessedActions = {
    autoApply: {
      tagsToAdd: [],
    },
    suggestions: [],
  };

  for (const action of actions) {
    // Auto-apply high confidence actions
    if (action.confidence >= CONFIG.CONFIDENCE_THRESHOLDS.AUTO_APPLY) {
      applyHighConfidenceAction(action, result, currentThought);
    }
    // Store medium confidence as suggestions
    else if (action.confidence >= CONFIG.CONFIDENCE_THRESHOLDS.SUGGEST) {
      result.suggestions.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: action.type,
        confidence: action.confidence,
        data: action.data,
        reasoning: action.reasoning,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });
    }
    // Ignore low confidence actions
  }

  return result;
}

/**
 * Apply high confidence action
 */
function applyHighConfidenceAction(
  action: AIAction,
  result: ProcessedActions,
  currentThought: any
) {
  switch (action.type) {
    case 'enhanceThought':
      result.autoApply.text = action.data.improvedText;
      result.autoApply.textChanges = action.data.changes || [];
      break;

    case 'addTag':
      const tag = action.data.tag;
      // Don't add duplicate tags
      if (!currentThought.tags?.includes(tag) && !result.autoApply.tagsToAdd.includes(tag)) {
        result.autoApply.tagsToAdd.push(tag);
      }
      break;

    // These are handled through entity tags
    case 'linkToGoal':
      const goalTag = `goal-${action.data.goalId}`;
      if (!currentThought.tags?.includes(goalTag) && !result.autoApply.tagsToAdd.includes(goalTag)) {
        result.autoApply.tagsToAdd.push(goalTag);
      }
      break;

    case 'linkToProject':
      const projectTag = `project-${action.data.projectId}`;
      if (!currentThought.tags?.includes(projectTag) && !result.autoApply.tagsToAdd.includes(projectTag)) {
        result.autoApply.tagsToAdd.push(projectTag);
      }
      break;

    case 'linkToPerson':
      const personTag = `person-${action.data.shortName}`;
      if (!currentThought.tags?.includes(personTag) && !result.autoApply.tagsToAdd.includes(personTag)) {
        result.autoApply.tagsToAdd.push(personTag);
      }
      break;

    default:
      // Unknown action type at high confidence, log warning
      console.warn(`Unknown high-confidence action type: ${action.type}`);
  }
}

/**
 * Build update object for Firestore
 */
export function buildThoughtUpdate(
  processedActions: ProcessedActions,
  currentThought: any,
  tokensUsed: number,
  trigger: 'auto' | 'manual' | 'reprocess'
): any {
  const { autoApply, suggestions } = processedActions;

  // Store original data for revert (only if not already stored)
  const originalText = currentThought.originalText || currentThought.text;
  const originalTags = currentThought.originalTags || currentThought.tags || [];

  // Merge tags
  const currentTags = currentThought.tags || [];
  const newTags = [...currentTags, ...autoApply.tagsToAdd];

  // Add 'processed' tag if any changes were made
  if (!newTags.includes('processed') && (autoApply.text || autoApply.tagsToAdd.length > 0)) {
    newTags.push('processed');
  }

  // Build applied changes object
  const aiAppliedChanges: any = {
    textEnhanced: !!autoApply.text && autoApply.text !== currentThought.text,
    textChanges: autoApply.textChanges || [],
    tagsAdded: autoApply.tagsToAdd,
    appliedAt: new Date().toISOString(),
    appliedBy: trigger === 'auto' ? 'auto' : 'manual-trigger',
  };

  // Build processing history entry
  const historyEntry = {
    processedAt: new Date().toISOString(),
    trigger,
    status: 'completed',
    tokensUsed,
    changesApplied: (autoApply.text ? 1 : 0) + autoApply.tagsToAdd.length,
    suggestionsCount: suggestions.length,
  };

  // Build update object
  const update: any = {
    aiProcessingStatus: 'completed',
    aiError: null,
    originalText,
    originalTags,
    aiAppliedChanges,
    aiSuggestions: suggestions,
    tags: newTags,
  };

  // Only update text if it was enhanced
  if (autoApply.text && autoApply.text !== currentThought.text) {
    update.text = autoApply.text;
  }

  return { update, historyEntry };
}

/**
 * Count total changes applied
 */
export function countChanges(processedActions: ProcessedActions): number {
  let count = 0;
  if (processedActions.autoApply.text) count++;
  count += processedActions.autoApply.tagsToAdd.length;
  return count;
}
