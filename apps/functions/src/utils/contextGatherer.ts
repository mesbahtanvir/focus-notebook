/**
 * Context Gatherer Utility
 *
 * Gathers user context (goals, projects, people, tasks, moods) for AI processing
 */

import * as admin from 'firebase-admin';
import { CONFIG } from '../config';

export interface ProcessingContext {
  goals: Array<{
    id: string;
    title: string;
    objective: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  people: Array<{
    id: string;
    name: string;
    shortName: string;
    relationshipType?: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    category?: string;
  }>;
  moods: Array<{
    value: number;
    note?: string;
  }>;
}

/**
 * Gather all relevant context for processing a thought
 */
export async function getProcessingContext(userId: string): Promise<ProcessingContext> {
  const db = admin.firestore();

  const [goalsSnap, projectsSnap, peopleSnap, tasksSnap, moodsSnap] = await Promise.all([
    // Get all goals (limited by config)
    db.collection(`users/${userId}/goals`)
      .limit(CONFIG.MAX_CONTEXT_ITEMS.GOALS)
      .get(),

    // Get all projects (limited by config)
    db.collection(`users/${userId}/projects`)
      .limit(CONFIG.MAX_CONTEXT_ITEMS.PROJECTS)
      .get(),

    // Get all relationships/people (limited by config)
    db.collection(`users/${userId}/relationships`)
      .limit(CONFIG.MAX_CONTEXT_ITEMS.PEOPLE)
      .get(),

    // Get active tasks only (limited by config)
    db.collection(`users/${userId}/tasks`)
      .where('status', '==', 'active')
      .limit(CONFIG.MAX_CONTEXT_ITEMS.TASKS)
      .get(),

    // Get recent moods (limited by config)
    db.collection(`users/${userId}/moods`)
      .orderBy('createdAt', 'desc')
      .limit(CONFIG.MAX_CONTEXT_ITEMS.MOODS)
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
export function formatContextForPrompt(context: ProcessingContext): string {
  const sections: string[] = [];

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
