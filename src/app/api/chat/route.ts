import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey } = await request.json();

    // Validate API key
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          message: "Hi! I'd love to help you brainstorm, but it looks like you haven't set up your OpenAI API key yet. Please add your API key in the Settings to enable AI-powered brainstorming!",
          needsSetup: true
        },
        { status: 200 } // Return 200 so the UI can show the fallback message
      );
    }

    // Basic validation of API key format
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { 
          error: 'Invalid API key format',
          message: "The API key doesn't look right. OpenAI API keys should start with 'sk-'. Please check your Settings and make sure you've entered the correct key.",
          needsSetup: true
        },
        { status: 200 }
      );
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Use GPT-3.5 Turbo for cost-effectiveness and availability
        messages: messages,
        temperature: 0.8, // Higher temperature for more creative brainstorming
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      
      return NextResponse.json(
        { 
          error: 'Failed to get AI response',
          message: "I'm having trouble connecting to the AI service. Please try again in a moment!"
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "I'm not sure how to respond to that. Can you rephrase?";

    return NextResponse.json({ message: assistantMessage });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: "Oops! Something went wrong on my end. Let's try that again!"
      },
      { status: 200 }
    );
  }
}
