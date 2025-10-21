import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { thought, apiKey, toolDescriptions } = await request.json();

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

Analyze this thought and suggest helpful actions. Consider:
1. **Thought Enhancement**: Can the text be improved for clarity or grammar?
2. **Relevant Tools**: Which tools would help process this thought?
3. **Specific Actions**: What should be created or updated?
4. **Reasoning**: Why are these suggestions appropriate?

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
        "priority": "medium"
      },
      "reasoning": "why this task should be created"
    },
    {
      "type": "addTag",
      "tool": "system",
      "data": { "tag": "research" },
      "reasoning": "why this tag is appropriate"
    }
  ],
  "confidence": 0.95,
  "processingComplexity": "simple"
}

Rules:
- Only suggest actions that are truly helpful
- Don't create tasks for vague thoughts
- Use appropriate categories: health, wealth, mastery, connection
- Be conservative with task creation
- Enhance text only if there are clear improvements
- Consider the thought type and existing tags`;

    // Call OpenAI API
    console.log('📤 Calling OpenAI API');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
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
