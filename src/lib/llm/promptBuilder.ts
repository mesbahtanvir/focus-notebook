/**
 * LLM Prompt Builder with parameterized values
 * For use with GitHub Models tab or other LLM interfaces
 */

export interface ThoughtContext {
  text: string;
  type?: string;
  tags?: string[];
  createdAt: string;
  id: string;
}

export interface UserContext {
  goals?: Array<{ title: string; status: string; objective?: string }>;
  projects?: Array<{ title: string; status: string; description?: string }>;
  tasks?: Array<{ title: string; category?: string; priority?: string }>;
  moods?: Array<{ value?: number; mood?: number; note?: string }>;
  relationships?: Array<{ name: string; relationshipType?: string; connectionStrength?: number }>;
  notes?: Array<{ title?: string; content?: string }>;
  errands?: Array<{ title?: string; category?: string }>;
}

export interface PromptParams {
  thought: ThoughtContext;
  context?: UserContext;
  toolReference?: string;
}

/**
 * Build the user context section from provided data
 */
export function buildUserContextSection(context?: UserContext): string {
  if (!context) return '';

  const sections: string[] = [];

  if (context.goals && context.goals.length > 0) {
    sections.push(`\nGoals (${context.goals.length}):\n${context.goals.map(
      (goal) => `- ${goal.title} (${goal.status}) - ${goal.objective || 'No objective'}`
    ).join('\n')}`);
  }

  if (context.projects && context.projects.length > 0) {
    sections.push(`\nProjects (${context.projects.length}):\n${context.projects.map(
      (project) => `- ${project.title} (${project.status}) - ${project.description || 'No description'}`
    ).join('\n')}`);
  }

  if (context.tasks && context.tasks.length > 0) {
    sections.push(`\nActive Tasks (${context.tasks.length}):\n${context.tasks.map(
      (task) => `- ${task.title} (${task.category || 'no category'}) - ${task.priority || 'no priority'}`
    ).join('\n')}`);
  }

  if (context.moods && context.moods.length > 0) {
    sections.push(`\nRecent Moods (${context.moods.length}):\n${context.moods.map(
      (mood) => `- ${mood.value || mood.mood}/10 - ${mood.note || 'No notes'}`
    ).join('\n')}`);
  }

  if (context.relationships && context.relationships.length > 0) {
    sections.push(`\nRelationships (${context.relationships.length}):\n${context.relationships.map(
      (person) => `- ${person.name} (${person.relationshipType || 'unknown'}) - Strength: ${person.connectionStrength || 'N/A'}/10`
    ).join('\n')}`);
  }

  if (context.notes && context.notes.length > 0) {
    sections.push(`\nRecent Notes (${context.notes.length}):\n${context.notes.map(
      (note) => `- ${note.title || 'Untitled'} - ${note.content?.substring(0, 50) || 'No content'}...`
    ).join('\n')}`);
  }

  if (context.errands && context.errands.length > 0) {
    sections.push(`\nActive Errands (${context.errands.length}):\n${context.errands.map(
      (errand) => `- ${errand.title || 'Untitled'} (${errand.category || 'no category'})`
    ).join('\n')}`);
  }

  return sections.length > 0 ? `\n\nUser's Current Data Context:\n${sections.join('\n')}` : '';
}

/**
 * Build the complete thought processing prompt
 */
export function buildThoughtProcessingPrompt(params: PromptParams): string {
  const { thought, context, toolReference = '(Tool reference not provided)' } = params;
  const userContextSection = buildUserContextSection(context);

  return `You are an intelligent thought processor for a productivity and mental wellness app.

Tool Reference Guidance:
${toolReference}

Available Tool Tags (use these to indicate which tools can benefit from this thought):
- tool-tasks: Thought contains actionable items that should become tasks
- tool-projects: Relates to project planning or execution
- tool-goals: Connects to personal or professional goals
- tool-mood: Expresses emotions or mental state that should be tracked
- tool-cbt: Contains cognitive distortions or negative thinking patterns suitable for CBT analysis
- tool-focus: Suitable for focused work sessions or deep work
- tool-brainstorming: Contains ideas for exploration and ideation
- tool-relationships: Mentions people or relationship dynamics
- tool-notes: General reference or learning material to save
- tool-errands: Contains to-do items for daily tasks

Available Actions:
- createTask: Create a new task from the thought
- enhanceTask: Enhance an existing task with information from this thought (provide taskId in data)
- createProject: Create a new project
- createGoal: Create a new goal
- createMood: Create a mood entry
- addTag: Add a tool tag to the thought
- linkToProject: Link thought to existing project

${userContextSection}

User Thought:
Text: "${thought.text}"
Type: ${thought.type || 'neutral'}
Current Tags: ${thought.tags?.join(', ') || 'none'}
Created: ${thought.createdAt}

Analyze this thought and suggest helpful actions. Consider:
1. **Tool Tags**: Which tools (tasks, projects, goals, mood, cbt, etc.) can benefit from this thought?
2. **Existing Data Context**: Review the user's current goals, projects, tasks, and moods to determine if this thought should:
   - Link to an existing project/goal (use linkToProject action)
   - Create a new project/goal (use createProject/createGoal action)
   - Enhance an existing task with new information (use enhanceTask with taskId)
   - Create a new task (use createTask)
   - Track mood/emotion (use createMood)
3. **Confidence Scoring**: For each action, provide a confidence score (0-100):
   - 99-100: Very high confidence, safe to auto-apply immediately
   - 70-98: Medium confidence, show as suggestion for user approval
   - 0-69: Low confidence, do not suggest

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "actions": [
    {
      "type": "addTag",
      "confidence": 95,
      "data": { "tag": "tool-tasks" },
      "reasoning": "Thought contains actionable items"
    },
    {
      "type": "createTask",
      "confidence": 85,
      "data": {
        "title": "specific task title",
        "category": "mastery",
        "priority": "high"
      },
      "reasoning": "Clear actionable item identified"
    },
    {
      "type": "enhanceTask",
      "confidence": 90,
      "data": {
        "taskId": "existing-task-id",
        "updates": {
          "notes": "Additional context from thought"
        }
      },
      "reasoning": "Thought provides relevant context for existing task"
    },
    {
      "type": "createMood",
      "confidence": 99,
      "data": {
        "value": 7,
        "note": "Feeling optimistic about new project"
      },
      "reasoning": "Clear emotional expression with high confidence"
    }
  ]
}

Rules:
- Only suggest actions that are truly helpful
- Don't create tasks for vague thoughts
- Use appropriate categories: health, wealth, mastery, connection
- Be conservative with task creation
- Consider existing user data when making decisions
- Match tasks to existing context when enhancing
- Confidence scores should be accurate and conservative`;
}

/**
 * Generate test values for GitHub Models tab
 */
export function getTestPromptValues(): PromptParams {
  return {
    thought: {
      id: 'test-thought-123',
      text: 'I need to learn React hooks and build a personal portfolio website. Also feeling stressed about the upcoming deadline.',
      type: 'mixed',
      tags: ['tool-tasks', 'tool-mood'],
      createdAt: new Date().toISOString(),
    },
    context: {
      goals: [
        { title: 'Master React Development', status: 'active', objective: 'Become proficient in React and modern web development' },
        { title: 'Launch Personal Brand', status: 'active', objective: 'Build online presence through portfolio and content' },
      ],
      projects: [
        { title: 'Portfolio Website v2', status: 'active', description: 'Redesign portfolio with React and showcase recent projects' },
        { title: 'Learn Advanced TypeScript', status: 'active', description: 'Deep dive into TypeScript patterns and best practices' },
      ],
      tasks: [
        { title: 'Complete React hooks tutorial', category: 'mastery', priority: 'high' },
        { title: 'Design portfolio mockup', category: 'mastery', priority: 'medium' },
        { title: 'Research hosting options', category: 'mastery', priority: 'low' },
      ],
      moods: [
        { value: 6, note: 'Feeling motivated but a bit overwhelmed' },
        { value: 7, note: 'Good progress on learning today' },
      ],
      relationships: [
        { name: 'Sarah (Mentor)', relationshipType: 'professional', connectionStrength: 8 },
        { name: 'Alex (Study Buddy)', relationshipType: 'friend', connectionStrength: 7 },
      ],
      notes: [
        { title: 'React Hooks Best Practices', content: 'Key points from documentation: useState, useEffect, custom hooks...' },
        { title: 'Portfolio Design Inspiration', content: 'Collection of great developer portfolios for reference' },
      ],
      errands: [
        { title: 'Buy new laptop charger', category: 'shopping' },
        { title: 'Schedule dentist appointment', category: 'health' },
      ],
    },
    toolReference: '(Tool specs would be dynamically loaded based on enrolled tools)',
  };
}

/**
 * Export the prompt as a ready-to-use string for GitHub Models
 */
export function exportPromptForGitHubModels(): string {
  const testParams = getTestPromptValues();
  const prompt = buildThoughtProcessingPrompt(testParams);

  return `# Thought Processing Prompt for GitHub Models

## System Message:
You are a helpful thought processor. Always respond with valid JSON only, no markdown formatting.

## User Prompt:
${prompt}

---

## Test Instructions:
1. Copy the User Prompt above
2. Paste into GitHub Models interface
3. Use models like gpt-4o, gpt-4-turbo, or similar
4. Set temperature to 0.7
5. Set max_tokens to 1500
6. The model should respond with JSON containing suggested actions

## Expected Response Format:
The model will analyze the thought and return JSON with actions like:
- Adding tool tags
- Creating tasks
- Linking to projects
- Tracking mood
- Each action includes confidence score (0-100) and reasoning

## Customization:
To test with your own data, modify the values in the prompt:
- Thought text: "${testParams.thought.text}"
- Goals: ${testParams.context?.goals?.length || 0} sample goals
- Projects: ${testParams.context?.projects?.length || 0} sample projects
- Tasks: ${testParams.context?.tasks?.length || 0} sample tasks
- Moods: ${testParams.context?.moods?.length || 0} sample moods
`;
}
