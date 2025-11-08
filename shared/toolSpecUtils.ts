import { getToolSpecById, type ToolSpec, type ToolSpecId } from './toolSpecs';

const TAG_TO_SPEC: Partial<Record<string, ToolSpecId>> = {
  'tool-tasks': 'tasks',
  'tool-projects': 'projects',
  'tool-goals': 'goals',
  'tool-focus': 'focus',
  'tool-brainstorm': 'brainstorming',
  'tool-brainstorming': 'brainstorming',
  'tool-notes': 'notes',
  'tool-relationships': 'relationships',
  'tool-mood': 'moodtracker',
  'tool-moodtracker': 'moodtracker',
  'tool-cbt': 'cbt',
  cbt: 'cbt',
  'cbt-processed': 'cbt',
  'tool-deepreflect': 'deepreflect',
  'tool-errands': 'errands',
  'tool-packing': 'packing-list',
  'tool-packing-list': 'packing-list',
  'tool-trips': 'trips',
  'tool-trip': 'trips',
  'tool-investments': 'investments',
  'tool-subscriptions': 'subscriptions',
  'tool-asset-horizon': 'asset-horizon',
};

type ThoughtLike = {
  tags?: string[];
  sourceToolId?: string | null;
};

interface ResolveOptions {
  fallbackToThoughts?: boolean;
}

/**
 * Resolve the most relevant tool specs for a given thought.
 */
export function resolveToolSpecIds(
  thought: ThoughtLike | null | undefined,
  options: ResolveOptions = {}
): ToolSpecId[] {
  const { fallbackToThoughts = true } = options;

  const candidates = new Set<ToolSpecId>();
  if (thought?.sourceToolId && isToolSpecId(thought.sourceToolId)) {
    candidates.add(thought.sourceToolId);
  }

  const tags = thought?.tags || [];
  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    const mapped = TAG_TO_SPEC[normalized];
    if (mapped) {
      candidates.add(mapped);
      continue;
    }

    if (normalized.startsWith('tool-')) {
      const potential = normalized.slice(5);
      if (isToolSpecId(potential)) {
        candidates.add(potential);
      }
      continue;
    }

    if (normalized.startsWith('person-')) {
      candidates.add('relationships');
      continue;
    }

    if (normalized.startsWith('project-')) {
      candidates.add('projects');
      continue;
    }

    if (normalized.startsWith('goal-')) {
      candidates.add('goals');
      continue;
    }
  }

  // Always consider baseline thought processing
  candidates.add('thoughts');

  const filtered = Array.from(candidates);

  if (filtered.length > 0) {
    return filtered;
  }

  return fallbackToThoughts ? ['thoughts'] : [];
}

export function resolveToolSpecs(
  thought: ThoughtLike | null | undefined,
  options: ResolveOptions = {}
): ToolSpec[] {
  return resolveToolSpecIds(thought, options).map((id) => getToolSpecById(id));
}

function isToolSpecId(value: string): value is ToolSpecId {
  try {
    getToolSpecById(value as ToolSpecId);
    return true;
  } catch {
    return false;
  }
}
