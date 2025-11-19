import { getToolSpecById, type ToolSpec, type ToolSpecId } from './toolSpecs';

type ThoughtLike = {
  tags?: string[];
  sourceToolId?: string | null;
  text?: string;
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

    if (normalized.startsWith('project-')) {
      candidates.add('projects');
      continue;
    }

    if (normalized.startsWith('goal-')) {
      candidates.add('goals');
      continue;
    }
  }

  // Check for calendar-related keywords in thought text
  const text = thought?.text?.toLowerCase() || '';
  const calendarKeywords = [
    'appointment', 'meeting', 'schedule', 'tomorrow', 'today', 'next week',
    'next month', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday', 'am', 'pm', 'o\'clock', 'deadline', 'due date',
    'conference', 'call', 'interview', 'doctor', 'dentist', 'class',
    'workshop', 'event', 'ceremony', 'party', 'lunch', 'dinner', 'breakfast'
  ];
  
  const hasCalendarKeyword = calendarKeywords.some(keyword => text.includes(keyword));
  const hasTimeReference = /\b(\d{1,2}(:\d{2})?\s?(am|pm)|\d{1,2}\s*o'clock)\b/i.test(text);
  
  if (hasCalendarKeyword || hasTimeReference) {
    candidates.add('calendar');
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
