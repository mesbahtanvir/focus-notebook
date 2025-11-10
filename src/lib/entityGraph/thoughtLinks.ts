import type { Relationship, EntityType } from '@/types/entityGraph';
import type { Thought } from '@/store/useThoughts';

interface LinkedThoughtOptions {
  relationships: Relationship[];
  thoughts: Thought[];
  entityType: EntityType;
  entityId?: string | null;
  additionalThoughtIds?: string[];
}

/**
 * Collect all thoughts linked to a given entity via the Entity Graph.
 * Falls back to legacy linkedThoughtIds arrays when provided.
 */
export function getLinkedThoughtsForEntity({
  relationships,
  thoughts,
  entityType,
  entityId,
  additionalThoughtIds = [],
}: LinkedThoughtOptions): Thought[] {
  if (!entityId) return [];

  const thoughtMap = new Map(thoughts.map((thought) => [thought.id, thought]));
  const linked = new Map<string, Thought>();

  for (const relationship of relationships) {
    if (relationship.status !== 'active') continue;

    const isThoughtSource =
      relationship.sourceType === 'thought' &&
      relationship.targetType === entityType &&
      relationship.targetId === entityId;

    const isThoughtTarget =
      relationship.targetType === 'thought' &&
      relationship.sourceType === entityType &&
      relationship.sourceId === entityId;

    if (isThoughtSource) {
      const thought = thoughtMap.get(relationship.sourceId);
      if (thought && !linked.has(thought.id)) {
        linked.set(thought.id, thought);
      }
      continue;
    }

    if (isThoughtTarget) {
      const thought = thoughtMap.get(relationship.targetId);
      if (thought && !linked.has(thought.id)) {
        linked.set(thought.id, thought);
      }
    }
  }

  for (const fallbackId of additionalThoughtIds) {
    if (!fallbackId || linked.has(fallbackId)) continue;
    const thought = thoughtMap.get(fallbackId);
    if (thought) {
      linked.set(fallbackId, thought);
    }
  }

  return Array.from(linked.values());
}
