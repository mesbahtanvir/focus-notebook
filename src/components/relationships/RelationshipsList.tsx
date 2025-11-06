"use client";

import { useMemo } from 'react';
import { useEntityRelationships } from '@/store/useEntityRelationships';
import { useTasks } from '@/store/useTasks';
import { useProjects } from '@/store/useProjects';
import { useGoals } from '@/store/useGoals';
import { useMoods } from '@/store/useMoods';
import { getToolSpecById } from '../../../shared/toolSpecs';
import type { Relationship, EntityType } from '@/types/relationship';
import {
  isToolRelationship,
  isToolProcessed,
  isPendingProcessing,
  getRelationshipDescription,
  getToolId,
} from '@/types/relationship';
import {
  Wrench,
  CheckCircle2,
  Clock,
  ListChecks,
  FolderKanban,
  Target,
  Smile,
  User,
  Link2,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// Props
// ============================================================================

interface RelationshipsListProps {
  entityType: EntityType;
  entityId: string;
  onDelete?: (relationshipId: string) => void;
  onAccept?: (relationshipId: string) => void;
  onReject?: (relationshipId: string) => void;
  showActions?: boolean;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const ENTITY_ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  tool: Wrench,
  task: ListChecks,
  project: FolderKanban,
  goal: Target,
  mood: Smile,
  person: User,
  thought: Link2,
};

// ============================================================================
// Helper: Get Entity Data
// ============================================================================

interface EntityStores {
  tasks: any[];
  projects: any[];
  goals: any[];
  moods: any[];
}

function getEntityData(relationship: Relationship, stores: EntityStores) {
  if (relationship.targetType === 'task') {
    return stores.tasks.find((t) => t.id === relationship.targetId);
  }
  if (relationship.targetType === 'project') {
    return stores.projects.find((p) => p.id === relationship.targetId);
  }
  if (relationship.targetType === 'goal') {
    return stores.goals.find((g) => g.id === relationship.targetId);
  }
  if (relationship.targetType === 'mood') {
    return stores.moods.find((m) => m.id === relationship.targetId);
  }
  if (relationship.targetType === 'tool') {
    try {
      return getToolSpecById(relationship.targetId);
    } catch {
      return null;
    }
  }

  return null;
}

// ============================================================================
// Helper: Get Entity Link
// ============================================================================

function getEntityLink(relationship: Relationship): string | null {
  if (relationship.targetType === 'task') {
    return `/tools/tasks?taskId=${relationship.targetId}`;
  }
  if (relationship.targetType === 'project') {
    return `/tools/projects?projectId=${relationship.targetId}`;
  }
  if (relationship.targetType === 'goal') {
    return `/tools/goals?goalId=${relationship.targetId}`;
  }
  if (relationship.targetType === 'mood') {
    return `/tools/moodtracker?moodId=${relationship.targetId}`;
  }
  if (relationship.targetType === 'tool') {
    // Map tool IDs to their routes
    const toolRoutes: Record<string, string> = {
      tasks: '/tools/tasks',
      projects: '/tools/projects',
      goals: '/tools/goals',
      moodtracker: '/tools/moodtracker',
      cbt: '/tools/cbt',
      focus: '/tools/focus',
      brainstorming: '/tools/brainstorming',
      relationships: '/tools/relationships',
      notes: '/tools/notes',
      errands: '/tools/errands',
    };
    return toolRoutes[relationship.targetId] || null;
  }

  return null;
}

// ============================================================================
// Relationship Card Component
// ============================================================================

interface RelationshipCardProps {
  relationship: Relationship;
  entityData: any;
  onDelete?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

function RelationshipCard({
  relationship,
  entityData,
  onDelete,
  onAccept,
  onReject,
  showActions = true,
}: RelationshipCardProps) {
  const Icon = ENTITY_ICONS[relationship.targetType];
  const isToolRel = isToolRelationship(relationship);
  const processed = isToolProcessed(relationship);
  const pending = isPendingProcessing(relationship);
  const isAISuggestion = relationship.createdBy === 'ai' && relationship.strength < 95;
  const link = getEntityLink(relationship);

  // Get entity name/title
  const entityName = useMemo(() => {
    if (relationship.targetType === 'tool' && entityData) {
      return entityData.title || relationship.targetId;
    }
    if (entityData) {
      return entityData.title || entityData.name || entityData.text || relationship.targetId;
    }
    return relationship.targetId;
  }, [relationship, entityData]);

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border transition-all
        ${isAISuggestion ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
        hover:shadow-md
      `}
    >
      {/* Icon */}
      <div
        className={`
          p-2 rounded-lg shrink-0
          ${isToolRel ? 'bg-purple-100 dark:bg-purple-900' : 'bg-blue-100 dark:bg-blue-900'}
        `}
      >
        <Icon
          className={`
            w-5 h-5
            ${isToolRel ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}
          `}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Entity Name */}
        <div className="flex items-center gap-2">
          {link ? (
            <Link
              href={link}
              className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1"
            >
              {entityName}
              <ExternalLink className="w-3 h-3" />
            </Link>
          ) : (
            <span className="font-medium text-gray-900 dark:text-gray-100">{entityName}</span>
          )}

          {/* Status badges for tools */}
          {isToolRel && (
            <>
              {processed && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Processed
                </span>
              )}
              {pending && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              )}
            </>
          )}

          {/* AI Suggestion badge */}
          {isAISuggestion && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              AI Suggestion ({relationship.strength}%)
            </span>
          )}
        </div>

        {/* Relationship Type */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          {getRelationshipDescription(relationship)}
        </p>

        {/* Reasoning */}
        {relationship.reasoning && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
            &ldquo;{relationship.reasoning}&rdquo;
          </p>
        )}

        {/* Tool Processing Data */}
        {isToolRel && relationship.toolProcessingData && processed && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p>
              Processed {relationship.toolProcessingData.processingCount}{' '}
              {relationship.toolProcessingData.processingCount === 1 ? 'time' : 'times'}
            </p>
            {relationship.toolProcessingData.processedAt && (
              <p>
                Last processed:{' '}
                {new Date(relationship.toolProcessingData.processedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Created by info */}
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {relationship.createdBy === 'ai' ? '🤖 AI-created' : '👤 User-created'} •{' '}
          {new Date(relationship.createdAt).toLocaleDateString()}
          {relationship.metadata?.createdByTool && (
            <> • via {relationship.metadata.createdByTool}</>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1 shrink-0">
          {isAISuggestion && onAccept && onReject && (
            <>
              <button
                onClick={onAccept}
                className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 transition-colors"
                title="Accept suggestion"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={onReject}
                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors"
                title="Reject suggestion"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {onDelete && !isAISuggestion && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors"
              title="Remove relationship"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RelationshipsList({
  entityType,
  entityId,
  onDelete,
  onAccept,
  onReject,
  showActions = true,
}: RelationshipsListProps) {
  const relationships = useEntityRelationships((s) =>
    s.getRelationshipsFor(entityType, entityId).filter((r) => r.status === 'active')
  );

  // Load entity stores at the top level
  const tasks = useTasks((s) => s.tasks);
  const projects = useProjects((s) => s.projects);
  const goals = useGoals((s) => s.goals);
  const moods = useMoods((s) => s.moods);

  const entityStores = useMemo(
    () => ({ tasks, projects, goals, moods }),
    [tasks, projects, goals, moods]
  );

  // Group relationships by type
  const grouped = useMemo(() => {
    const tools: Relationship[] = [];
    const tasks: Relationship[] = [];
    const projects: Relationship[] = [];
    const goals: Relationship[] = [];
    const moods: Relationship[] = [];
    const suggestions: Relationship[] = [];

    relationships.forEach((rel) => {
      if (rel.createdBy === 'ai' && rel.strength < 95) {
        suggestions.push(rel);
      } else if (rel.targetType === 'tool') {
        tools.push(rel);
      } else if (rel.targetType === 'task') {
        tasks.push(rel);
      } else if (rel.targetType === 'project') {
        projects.push(rel);
      } else if (rel.targetType === 'goal') {
        goals.push(rel);
      } else if (rel.targetType === 'mood') {
        moods.push(rel);
      }
    });

    return { tools, tasks, projects, goals, moods, suggestions };
  }, [relationships]);

  if (relationships.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Link2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No relationships yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Suggestions */}
      {grouped.suggestions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            AI Suggestions ({grouped.suggestions.length})
          </h3>
          <div className="space-y-2">
            {grouped.suggestions.map((rel) => (
              <RelationshipCard
                key={rel.id}
                relationship={rel}
                entityData={getEntityData(rel, entityStores)}
                onAccept={onAccept ? () => onAccept(rel.id) : undefined}
                onReject={onReject ? () => onReject(rel.id) : undefined}
                showActions={showActions}
              />
            ))}
          </div>
        </section>
      )}

      {/* Tool Relationships */}
      {grouped.tools.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-purple-500" />
            Tools ({grouped.tools.length})
          </h3>
          <div className="space-y-2">
            {grouped.tools.map((rel) => (
              <RelationshipCard
                key={rel.id}
                relationship={rel}
                entityData={getEntityData(rel, entityStores)}
                onDelete={onDelete ? () => onDelete(rel.id) : undefined}
                showActions={showActions}
              />
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      {grouped.tasks.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-blue-500" />
            Tasks ({grouped.tasks.length})
          </h3>
          <div className="space-y-2">
            {grouped.tasks.map((rel) => (
              <RelationshipCard
                key={rel.id}
                relationship={rel}
                entityData={getEntityData(rel, entityStores)}
                onDelete={onDelete ? () => onDelete(rel.id) : undefined}
                showActions={showActions}
              />
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {grouped.projects.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-green-500" />
            Projects ({grouped.projects.length})
          </h3>
          <div className="space-y-2">
            {grouped.projects.map((rel) => (
              <RelationshipCard
                key={rel.id}
                relationship={rel}
                entityData={getEntityData(rel, entityStores)}
                onDelete={onDelete ? () => onDelete(rel.id) : undefined}
                showActions={showActions}
              />
            ))}
          </div>
        </section>
      )}

      {/* Goals */}
      {grouped.goals.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-500" />
            Goals ({grouped.goals.length})
          </h3>
          <div className="space-y-2">
            {grouped.goals.map((rel) => (
              <RelationshipCard
                key={rel.id}
                relationship={rel}
                entityData={getEntityData(rel, entityStores)}
                onDelete={onDelete ? () => onDelete(rel.id) : undefined}
                showActions={showActions}
              />
            ))}
          </div>
        </section>
      )}

      {/* Moods */}
      {grouped.moods.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Smile className="w-4 h-4 text-yellow-500" />
            Moods ({grouped.moods.length})
          </h3>
          <div className="space-y-2">
            {grouped.moods.map((rel) => (
              <RelationshipCard
                key={rel.id}
                relationship={rel}
                entityData={getEntityData(rel, entityStores)}
                onDelete={onDelete ? () => onDelete(rel.id) : undefined}
                showActions={showActions}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
