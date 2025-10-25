import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { thought, apiKey, model, context } = await request.json();
    const selectedModel = model || 'gpt-3.5-turbo'; // Default to cheapest model

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

    // Build user context section
    const userContextSection = context ? `

User's Current Data Context:
${context.goals && context.goals.length > 0 ? `\nGoals (${context.goals.length}):
${context.goals.map((goal: any) => `- ${goal.title} (${goal.status})`).join('\n')}` : ''}

${context.projects && context.projects.length > 0 ? `\nProjects (${context.projects.length}):
${context.projects.map((project: any) => `- ${project.title} (${project.status}) - ${project.description}`).join('\n')}` : ''}

${context.tasks && context.tasks.length > 0 ? `\nRecent Tasks (${context.tasks.length}):
${context.tasks.slice(0, 10).map((task: any) => `- ${task.title} (${task.status}) - ${task.category}`).join('\n')}` : ''}

${context.moods && context.moods.length > 0 ? `\nRecent Moods (${context.moods.length}):
${context.moods.slice(0, 5).map((mood: any) => `- ${mood.mood} (${mood.intensity}/10) - ${mood.notes || 'No notes'}`).join('\n')}` : ''}

${context.friends && context.friends.length > 0 ? `\nFriends/Contacts (${context.friends.length}):
${context.friends.map((friend: any) => `- ${friend.name} (${friend.relationship})`).join('\n')}` : ''}` : '';

    const prompt = `You are an intelligent thought processor for a productivity and mental wellness app.

Available Actions:
- createTask: Create a new task
- createProject: Create a new project
- createGoal: Create a new goal
- createMoodEntry: Create a mood entry
- addTag: Add a tag to the thought
- enhanceThought: Improve the thought text
- linkToProject: Link thought to existing project

${userContextSection}

User Thought:
Text: "${thought.text}"
Type: ${thought.type || 'neutral'}
Current Tags: ${thought.tags?.join(', ') || 'none'}
Created: ${thought.createdAt}

Analyze this thought and suggest helpful actions. Consider:
1. **Thought Enhancement**: Can the text be improved for clarity or grammar?
2. **Existing Data Context**: Review the user's current goals, projects, tasks, and moods to determine if this thought should:
   - Link to an existing project/goal (use linkToProject action)
   - Create a new project/goal (use createProject action)
   - Add to an existing task or create a new one
   - Relate to recent mood patterns
3. **Specific Actions**: What should be created or updated?
4. **Mood Recognition**: If this is clearly an emotional expression, create a mood entry with intensity

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "actions": [
    {
      "type": "createTask",
      "data": {
        "title": "specific task title",
        "category": "health | wealth | mastery | connection",
        "estimatedTime": 30,
        "priority": "medium"
      },
      "reasoning": "why this task should be created"
    },
    {
      "type": "addTag",
      "data": { "tag": "research" },
      "reasoning": "why this tag is appropriate"
    },
    {
      "type": "createMoodEntry",
      "data": {
        "mood": "sad",
        "intensity": 9,
        "notes": "User expresses strong sadness"
      },
      "reasoning": "Clear emotional expression with high intensity"
    },
    {
      "type": "createProject",
      "data": {
        "title": "Better Physique",
        "description": "Achieve great physical fitness and body composition",
        "timeframe": "long-term",
        "category": "health",
        "targetDate": "2027-10-21"
      },
      "reasoning": "Clear long-term goal with 2 year timeframe"
    }
  ]
}

Rules:
- Only suggest actions that are truly helpful
- Don't create tasks for vague thoughts
- Use appropriate categories: health, wealth, mastery, connection
- Be conservative with task creation
- Consider existing user data when making decisions`;

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
