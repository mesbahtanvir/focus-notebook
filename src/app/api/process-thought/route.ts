import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { thought, apiKey, model, context } = await request.json();
    const selectedModel = model || 'gpt-4o'; // Default to highest quality model

    // Validate API key
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          needsSetup: true
        },
        { status: 200 }
      );
    }

    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { 
          error: 'Invalid API key format',
          needsSetup: true
        },
        { status: 200 }
      );
    }

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

    // Call OpenAI API
    console.log('📤 Calling OpenAI API');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful thought processor. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    console.log('📥 OpenAI response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ OpenAI API error:', error);
      
      return NextResponse.json(
        { 
          error: 'Failed to process thought',
          details: error.error?.message || 'Unknown error'
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    let aiResponse = data.choices[0]?.message?.content;

    console.log('🤖 Raw AI response:', aiResponse);

    // Track token usage
    if (data.usage) {
      try {
        const { useTokenUsage } = await import('@/store/useTokenUsage');
        useTokenUsage.getState().addUsage({
          model: selectedModel,
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          endpoint: '/api/process-thought',
          thoughtId: thought.id,
        });
        console.log('📊 Token usage tracked:', data.usage);
      } catch (error) {
        console.warn('⚠️ Failed to track token usage:', error);
      }
    }

    // Clean up response - remove markdown code blocks if present
    if (aiResponse) {
      aiResponse = aiResponse.trim();
      if (aiResponse.startsWith('```json')) {
        aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (aiResponse.startsWith('```')) {
        aiResponse = aiResponse.replace(/```\n?/g, '');
      }
      aiResponse = aiResponse.trim();
    }

    // Parse the AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      console.error('Response was:', aiResponse);
      return NextResponse.json(
        { 
          error: 'Failed to parse AI response',
          details: 'AI returned invalid JSON'
        },
        { status: 200 }
      );
    }

    console.log('✅ Parsed AI response:', parsedResponse);
    console.log('📊 Tokens used:', data.usage);

    return NextResponse.json({
      success: true,
      result: parsedResponse,
      usage: data.usage
    });

  } catch (error) {
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
