"use strict";
/**
 * Context Gatherer Utility
 *
 * Gathers user context (goals, projects, people, tasks, moods) for AI processing
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessingContext = getProcessingContext;
exports.formatContextForPrompt = formatContextForPrompt;
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
/**
 * Gather all relevant context for processing a thought
 */
async function getProcessingContext(userId) {
    const db = admin.firestore();
    const [goalsSnap, projectsSnap, peopleSnap, tasksSnap, moodsSnap] = await Promise.all([
        // Get all goals (limited by config)
        db.collection(`users/${userId}/goals`)
            .limit(config_1.CONFIG.MAX_CONTEXT_ITEMS.GOALS)
            .get(),
        // Get all projects (limited by config)
        db.collection(`users/${userId}/projects`)
            .limit(config_1.CONFIG.MAX_CONTEXT_ITEMS.PROJECTS)
            .get(),
        // Get all relationships/people (limited by config)
        db.collection(`users/${userId}/relationships`)
            .limit(config_1.CONFIG.MAX_CONTEXT_ITEMS.PEOPLE)
            .get(),
        // Get active tasks only (limited by config)
        db.collection(`users/${userId}/tasks`)
            .where('status', '==', 'active')
            .limit(config_1.CONFIG.MAX_CONTEXT_ITEMS.TASKS)
            .get(),
        // Get recent moods (limited by config)
        db.collection(`users/${userId}/moods`)
            .orderBy('createdAt', 'desc')
            .limit(config_1.CONFIG.MAX_CONTEXT_ITEMS.MOODS)
            .get(),
    ]);
    return {
        goals: goalsSnap.docs.map(d => ({
            id: d.id,
            title: d.data().title || '',
            objective: d.data().objective || '',
        })),
        projects: projectsSnap.docs.map(d => ({
            id: d.id,
            title: d.data().title || '',
            description: d.data().description,
        })),
        people: peopleSnap.docs.map(d => {
            const name = d.data().name || '';
            return {
                id: d.id,
                name,
                shortName: name.split(' ')[0].toLowerCase(),
                relationshipType: d.data().relationshipType,
            };
        }),
        tasks: tasksSnap.docs.map(d => ({
            id: d.id,
            title: d.data().title || '',
            category: d.data().category,
        })),
        moods: moodsSnap.docs.map(d => ({
            value: d.data().value || 5,
            note: d.data().note,
        })),
    };
}
/**
 * Format context for AI prompt
 */
function formatContextForPrompt(context) {
    const sections = [];
    // Goals section
    if (context.goals.length > 0) {
        sections.push(`Goals (${context.goals.length}):`);
        context.goals.forEach(g => {
            sections.push(`- ID: ${g.id}, Title: "${g.title}", Objective: "${g.objective}"`);
        });
    }
    // Projects section
    if (context.projects.length > 0) {
        sections.push(`\nProjects (${context.projects.length}):`);
        context.projects.forEach(p => {
            const desc = p.description ? `, Description: "${p.description}"` : '';
            sections.push(`- ID: ${p.id}, Title: "${p.title}"${desc}`);
        });
    }
    // People section
    if (context.people.length > 0) {
        sections.push(`\nPeople (${context.people.length}):`);
        context.people.forEach(p => {
            const rel = p.relationshipType ? ` (${p.relationshipType})` : '';
            sections.push(`- ${p.name} (shortname: ${p.shortName})${rel}`);
        });
    }
    // Active Tasks section
    if (context.tasks.length > 0) {
        sections.push(`\nActive Tasks (${context.tasks.length}):`);
        context.tasks.slice(0, 10).forEach(t => {
            const cat = t.category ? ` [${t.category}]` : '';
            sections.push(`- ${t.title}${cat}`);
        });
    }
    // Recent Moods section
    if (context.moods.length > 0) {
        sections.push(`\nRecent Moods (${context.moods.length}):`);
        context.moods.forEach(m => {
            const note = m.note ? ` - ${m.note}` : '';
            sections.push(`- ${m.value}/10${note}`);
        });
    }
    return sections.join('\n');
}
//# sourceMappingURL=contextGatherer.js.map