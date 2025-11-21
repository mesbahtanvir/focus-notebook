import { NextRequest, NextResponse } from 'next/server';
import { verifyAiRequest, UnauthorizedError, ForbiddenError } from '@/lib/server/verifyAiRequest';
import { renderToolSpecsForPrompt, getToolSpecById } from '../../../../shared/toolSpecs';
import { resolveToolSpecIds } from '../../../../shared/toolSpecUtils';

export async function POST(request: NextRequest) {
  try {
    await verifyAiRequest(request);
    const { thought, model, context, toolSpecIds: incomingToolSpecIds } = await request.json();
    const selectedModel = model || 'gpt-4o'; // Default to highest quality model

    const resolvedSpecIds = Array.from(
      new Set(
        Array.isArray(incomingToolSpecIds) && incomingToolSpecIds.length > 0
          ? incomingToolSpecIds
          : resolveToolSpecIds(thought)
      )
    );
    const toolSpecs = resolvedSpecIds.map((id: string) => {
      try {
        return getToolSpecById(id);
      } catch {
        return getToolSpecById('thoughts');
      }
    });
    const toolReference = renderToolSpecsForPrompt(toolSpecs);

    console.log('🤖 Processing thought:', thought.id);
    console.log('💭 Thought text:', thought.text);

    // Build comprehensive user context section (excluding thoughts)
    const userContextSection = context ? `

User's Current Data Context:

${context.goals && context.goals.length > 0 ? `\nGoals (${context.goals.length}):
${context.goals.map((goal: any) => `- ${goal.title} (${goal.status}) - ${goal.objective || 'No objective'}`).join('\n')}` : ''}

${context.projects && context.projects.length > 0 ? `\nProjects (${context.projects.length}):
${context.projects.map((project: any) => `- ${project.title} (${project.status}) - ${project.description || 'No description'}`).join('\n')}` : ''}

${context.tasks && context.tasks.length > 0 ? `\nActive Tasks (${context.tasks.length}):
${context.tasks.map((task: any) => `- ${task.title} (${task.category || 'no category'}) - ${task.priority || 'no priority'}`).join('\n')}` : ''}

${context.moods && context.moods.length > 0 ? `\nRecent Moods (${context.moods.length}):
${context.moods.map((mood: any) => `- ${mood.value || mood.mood}/10 - ${mood.note || 'No notes'}`).join('\n')}` : ''}

${context.relationships && context.relationships.length > 0 ? `\nRelationships (${context.relationships.length}):
${context.relationships.map((person: any) => `- ${person.name} (${person.relationshipType || 'unknown'}) - Strength: ${person.connectionStrength || 'N/A'}/10`).join('\n')}` : ''}

${context.notes && context.notes.length > 0 ? `\nRecent Notes (${context.notes.length}):
${context.notes.map((note: any) => `- ${note.title || 'Untitled'} - ${note.content?.substring(0, 50) || 'No content'}...`).join('\n')}` : ''}

${context.errands && context.errands.length > 0 ? `\nActive Errands (${context.errands.length}):
${context.errands.map((errand: any) => `- ${errand.title || 'Untitled'} (${errand.category || 'no category'})`).join('\n')}` : ''}` : '';

    const prompt = `You are an intelligent thought processor for a productivity and mental wellness app.

Tool Reference Guidance:
${toolReference}

Available Tools (connect thoughts to tools for processing):
- tasks: Thought contains actionable items that should become tasks
- projects: Relates to project planning or execution
- goals: Connects to personal or professional goals
- moodtracker: Expresses emotions or mental state that should be tracked
- cbt: Contains cognitive distortions or negative thinking patterns suitable for CBT analysis
- focus: Suitable for focused work sessions or deep work
- brainstorming: Contains ideas for exploration and ideation
- relationships: Mentions people or relationship dynamics
- notes: General reference or learning material to save
- errands: Contains to-do items for daily tasks

Available Actions:
- createRelationship: Connect this thought to a tool or entity
  * For tool connections: Use when thought should be processed by a specific tool
  * For entity connections: Use to link thought to tasks, projects, goals, moods, or people
- createTask: Create a new task from the thought
- enhanceTask: Enhance an existing task with information from this thought (provide taskId in data)
- createProject: Create a new project
- createGoal: Create a new goal
- createMood: Create a mood entry

DEPRECATED (use createRelationship instead):
- addTag: Add a tool tag to the thought (use createRelationship with targetType: 'tool')
- linkToProject: Link thought to existing project (use createRelationship)

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
      "type": "createRelationship",
      "confidence": 95,
      "data": {
        "targetType": "tool",
        "targetId": "tasks",
        "relationshipType": "should-be-processed-by",
        "reasoning": "Thought contains actionable items that should become tasks"
      },
      "reasoning": "Thought contains clear actionable items"
    },
    {
      "type": "createRelationship",
      "confidence": 90,
      "data": {
        "targetType": "tool",
        "targetId": "cbt",
        "relationshipType": "should-be-processed-by",
        "reasoning": "Detected cognitive distortion: catastrophizing"
      },
      "reasoning": "CBT analysis would help reframe this thought"
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
      "type": "createRelationship",
      "confidence": 92,
      "data": {
        "targetType": "project",
        "targetId": "proj-123",
        "relationshipType": "part-of",
        "reasoning": "Thought discusses specific aspect of this project"
      },
      "reasoning": "Directly relates to user's active project"
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
- Confidence scores should be accurate and conservative
- Use createRelationship to connect thoughts to tools (for processing) or entities (for organization)
- When suggesting tool processing, use targetType: 'tool' with appropriate relationshipType
- For entity links, use specific relationshipTypes: 'part-of' (projects), 'linked-to' (tasks), 'triggered-by' (moods)
- Each relationship should have clear reasoning explaining why the connection is valuable`;

    // TODO: Implement server-side AI service integration
    // This endpoint should now connect to a backend AI service
    // instead of making direct OpenAI API calls with user keys

    console.log('📤 AI service integration needed');

    return NextResponse.json(
      {
        error: 'AI service not configured',
        details: 'Thought processing functionality is currently being updated. Please check back later.'
      },
      { status: 503 }
    );

  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('💥 Process thought error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 }
    );
  }
}
