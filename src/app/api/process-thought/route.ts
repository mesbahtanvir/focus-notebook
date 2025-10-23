import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { thought, apiKey, toolDescriptions, model } = await request.json();
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

    // Build the prompt
    const prompt = `You are an intelligent thought processor for a productivity and mental wellness app.

Available Tools:
${toolDescriptions}

User Thought:
Text: "${thought.text}"
Type: ${thought.type || 'neutral'}
Current Tags: ${thought.tags?.join(', ') || 'none'}
Created: ${thought.createdAt}

Analyze this thought and suggest helpful actions. Use the tool examples and keywords above to guide your decision. Consider:
1. **Thought Enhancement**: Can the text be improved for clarity or grammar?
2. **Relevant Tools**: Which tools would help process this thought? Match against example thoughts and keywords.
3. **Specific Actions**: What should be created or updated?
4. **Task Frequency**: If creating a task, should it recur? (daily, weekly, monthly, workweek, none)
5. **Mood Recognition**: If this is clearly an emotional expression, create a mood entry with intensity
6. **Reasoning**: Why are these suggestions appropriate?

IMPORTANT: Match the thought against the tool examples and keywords provided above. For example:
- "I am sooo sad right now" → Mood Tracker tool (matches keywords: sad, feeling, so)
- "I need to buy groceries" → Tasks tool (matches keywords: need to, buy)
- "Ideas for new features" → Brainstorming tool (matches keywords: ideas)

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "thoughtEnhancement": {
    "improvedText": "improved version or null if no changes needed",
    "changes": "description of what was improved",
    "shouldApply": true or false
  },
  "suggestedTools": ["tasks", "brainstorming"],
  "actions": [
    {
      "type": "createTask",
      "tool": "tasks",
      "data": {
        "title": "specific task title",
        "category": "health | wealth | mastery | connection",
        "estimatedTime": 30,
        "priority": "medium",
        "recurrence": {
          "type": "none | daily | weekly | workweek | monthly",
          "frequency": 1,
          "reasoning": "why this frequency makes sense"
        }
      },
      "reasoning": "why this task should be created"
    },
    {
      "type": "addTag",
      "tool": "system",
      "data": { "tag": "research" },
      "reasoning": "why this tag is appropriate"
    },
    {
      "type": "createMoodEntry",
      "tool": "mood",
      "data": {
        "mood": "sad",
        "intensity": 9,
        "notes": "User expresses strong sadness"
      },
      "reasoning": "Clear emotional expression with high intensity"
    },
    {
      "type": "createProject",
      "tool": "projects",
      "data": {
        "title": "Better Physique",
        "description": "Achieve great physical fitness and body composition",
        "timeframe": "long-term",
        "category": "health",
        "targetDate": "2027-10-21"
      },
      "reasoning": "Clear long-term goal with 2 year timeframe"
    }
  ],
  "confidence": 0.95,
  "processingComplexity": "simple"
}

Rules:
- Only suggest actions that are truly helpful
- Don't create tasks for vague thoughts
- Use appropriate categories: health, wealth, mastery, connection
- For recurring tasks: daily (every day), workweek (Mon-Fri), weekly (once per week), monthly
- Examples: "exercise daily" → daily, "weekly review" → weekly, "check email" → workweek
- One-time tasks should have recurrence.type = "none"
- Be conservative with task creation
- Enhance text only if there are clear improvements
- Consider the thought type and existing tags

MOOD RECOGNITION RULES:
- If thought clearly expresses emotion (contains "I feel", "I am", "so sad", "really happy", etc.), create a mood entry
- Estimate intensity 1-10 based on language intensity:
  * Words like "a bit", "slightly", "somewhat" → 3-4
  * Neutral expressions → 5
  * Words like "really", "very" → 6-7
  * Words like "so", "sooo", "extremely", "really really" → 8-10
- Examples:
  * "I am sooo sad right now" → intensity: 9 (multiple 'o's indicate strong emotion)
  * "Feeling a bit down" → intensity: 4
  * "I'm extremely happy!" → intensity: 9
  * "Kind of stressed" → intensity: 5

PROJECT/GOAL RECOGNITION RULES:
- If thought expresses a long-term aspiration (months-years), create a project with timeframe "long-term"
- If thought expresses a short-term goal (weeks-months), create a project with timeframe "short-term"
- Look for time indicators: "in 2 years", "by next year", "within 6 months"
- Extract target date if mentioned
- If thought mentions HOW to achieve a goal or relates to existing goal, use "linkToProject" instead
- Examples:
  * "I want to have a great physique in 2 years" → createProject (long-term, health, target: 2 years from now)
  * "How can I achieve great physique in 2 years" → linkToProject (link to "Better Physique" project) + createTask + addTag: brainstorm
  * "Goal: Learn Spanish fluently" → createProject (long-term, mastery)
  * "Ideas for improving my fitness routine" → linkToProject (link to fitness-related project) + addTag: brainstorm`;

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
