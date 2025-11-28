import { NextRequest, NextResponse } from 'next/server';
import { verifyAiRequest, UnauthorizedError, ForbiddenError } from '@/lib/server/verifyAiRequest';

export async function POST(request: NextRequest) {
  try {
    await verifyAiRequest(request);
    const { messages, model } = await request.json();
    const selectedModel = model || 'gpt-4o'; // Default to highest quality model

    console.log('🤖 Processing chat request');
    console.log('📝 Using model:', selectedModel);
    console.log('💬 Message count:', messages.length);

    // TODO: Implement server-side AI service integration
    // This endpoint should now connect to a backend AI service
    // instead of making direct OpenAI API calls with user keys

    return NextResponse.json(
      {
        error: 'AI service not configured',
        message: "AI chat functionality is currently being updated. Please check back later.",
      },
      { status: 503 }
    );

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
