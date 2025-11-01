import { NextRequest, NextResponse } from 'next/server';
import { verifyAiRequest, UnauthorizedError, ForbiddenError } from '@/lib/server/verifyAiRequest';

export async function POST(request: NextRequest) {
  try {
    await verifyAiRequest(request);
    const { messages, apiKey, model } = await request.json();
    const selectedModel = model || 'gpt-4o'; // Default to highest quality model

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
    console.log('🤖 Calling OpenAI API at https://api.openai.com/v1/chat/completions');
    console.log('📝 Using model:', selectedModel);
    console.log('💬 Message count:', messages.length);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.8, // Higher temperature for more creative brainstorming
        max_tokens: 500,
      }),
    });
    
    console.log('✅ OpenAI API response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ OpenAI API Error Details:');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(error, null, 2));
      
      // Provide more specific error messages
      let userMessage = "I'm having trouble connecting to the AI service.";
      
      if (response.status === 401) {
        userMessage = "Your API key appears to be invalid. Please check your Settings and make sure you've entered the correct OpenAI API key.";
      } else if (response.status === 429) {
        userMessage = "You've hit the rate limit or your OpenAI account is out of credits. Please check your OpenAI dashboard.";
      } else if (response.status === 400) {
        userMessage = `There's an issue with the request: ${error.error?.message || 'Invalid request format'}`;
      } else if (error.error?.message) {
        userMessage = `OpenAI Error: ${error.error.message}`;
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to get AI response',
          message: userMessage,
          details: error.error?.message || 'Unknown error',
          statusCode: response.status
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "I'm not sure how to respond to that. Can you rephrase?";

    console.log('💡 OpenAI response received successfully');
    console.log('📊 Tokens used:', data.usage);

    // Track token usage
    if (data.usage) {
      try {
        const { useTokenUsage } = await import('@/store/useTokenUsage');
        useTokenUsage.getState().addUsage({
          model: selectedModel,
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          endpoint: '/api/chat',
        });
        console.log('📊 Token usage tracked:', data.usage);
      } catch (error) {
        console.warn('⚠️ Failed to track token usage:', error);
      }
    }
    
    return NextResponse.json({ message: assistantMessage });

  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
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
