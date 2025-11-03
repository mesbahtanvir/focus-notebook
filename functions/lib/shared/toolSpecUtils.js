"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveToolSpecIds = resolveToolSpecIds;
exports.resolveToolSpecs = resolveToolSpecs;
const toolSpecs_1 = require("./toolSpecs");
const TAG_TO_SPEC = {
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
/**
 * Resolve the most relevant tool specs for a given thought.
 * Only returns tools the user has enrolled in (when provided).
 */
function resolveToolSpecIds(thought, options = {}) {
    const { enrolledToolIds, fallbackToThoughts = true } = options;
    const allowedIds = Array.isArray(enrolledToolIds)
        ? enrolledToolIds.filter((id) => isToolSpecId(id))
        : null;
    const allowedSet = allowedIds ? new Set(allowedIds) : null;
    const candidates = new Set();
    if ((thought === null || thought === void 0 ? void 0 : thought.sourceToolId) && isToolSpecId(thought.sourceToolId)) {
        candidates.add(thought.sourceToolId);
    }
    const tags = (thought === null || thought === void 0 ? void 0 : thought.tags) || [];
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
    // Always consider baseline thought processing unless filtered out later
    candidates.add('thoughts');
    const filtered = Array.from(candidates).filter((id) => {
        if (!allowedSet)
            return true;
        return allowedSet.has(id);
    });
    if (filtered.length > 0) {
        return filtered;
    }
    if (allowedSet) {
        if (allowedSet.has('thoughts') && fallbackToThoughts) {
            return ['thoughts'];
        }
        return [];
    }
    return fallbackToThoughts ? ['thoughts'] : [];
}
function resolveToolSpecs(thought, options = {}) {
    return resolveToolSpecIds(thought, options).map((id) => (0, toolSpecs_1.getToolSpecById)(id));
}
function isToolSpecId(value) {
    try {
        (0, toolSpecs_1.getToolSpecById)(value);
        return true;
    }
    catch (_a) {
        return false;
    }
}
//# sourceMappingURL=toolSpecUtils.js.map