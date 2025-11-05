import { NextRequest, NextResponse } from 'next/server';
import { verifyAiRequest, UnauthorizedError, ForbiddenError } from '@/lib/server/verifyAiRequest';
import { loadPrompt, buildMessages } from '@/lib/prompts/promptLoader';

export async function POST(request: NextRequest) {
  try {
    await verifyAiRequest(request);
    const { messages, apiKey, model, action } = await request.json();

    // Load brainstorming prompt configuration
    const promptConfig = loadPrompt('brainstorming');
    const selectedModel = model || promptConfig.model.default;

    // Validate API key
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          needsSetup: true,
        },
        { status: 200 }
      );
    }

    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        {
          error: 'Invalid API key format',
          needsSetup: true,
        },
        { status: 200 }
      );
    }

    // Handle different actions
    if (action === 'extract-actions') {
      // Extract action items from conversation
      return await extractActionItems(messages, apiKey, promptConfig, selectedModel);
    } else if (action === 'summarize') {
      // Generate conversation summary
      return await generateSummary(messages, apiKey, promptConfig, selectedModel);
    } else {
      // Default: Continue conversation
      return await continueConversation(messages, apiKey, promptConfig, selectedModel);
    }
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Brainstorming API error:', error);
    return NextResponse.json(
      { error: 'Failed to process brainstorming request' },
      { status: 500 }
    );
  }
}

async function continueConversation(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  promptConfig: any,
  model: string
) {
  // Add system message at the beginning
  const apiMessages = [
    {
      role: 'system',
      content: promptConfig.systemPrompt,
    },
    ...messages,
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      temperature: promptConfig.model.temperature,
      max_tokens: promptConfig.model.maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI' },
      { status: response.status }
    );
  }

  const data = await response.json();

  // Track token usage
  const { useTokenUsage } = await import('@/store/useTokenUsage');
  useTokenUsage.getState().addUsage({
    model,
    promptTokens: data.usage.prompt_tokens,
    completionTokens: data.usage.completion_tokens,
    totalTokens: data.usage.total_tokens,
    endpoint: '/api/brainstorm',
  });

  return NextResponse.json({
    message: data.choices[0].message.content,
    usage: data.usage,
  });
}

async function extractActionItems(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  promptConfig: any,
  model: string
) {
  if (!promptConfig.actionExtractionPrompt) {
    return NextResponse.json(
      { error: 'Action extraction not configured' },
      { status: 400 }
    );
  }

  // Build conversation history
  const conversationHistory = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const extractionPrompt = promptConfig.actionExtractionPrompt.replace(
    '{{conversationHistory}}',
    conversationHistory
  );

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts action items from conversations.',
        },
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to extract action items' },
      { status: response.status }
    );
  }

  const data = await response.json();

  // Track token usage
  const { useTokenUsage } = await import('@/store/useTokenUsage');
  useTokenUsage.getState().addUsage({
    model,
    promptTokens: data.usage.prompt_tokens,
    completionTokens: data.usage.completion_tokens,
    totalTokens: data.usage.total_tokens,
    endpoint: '/api/brainstorm/extract',
  });

  try {
    const actions = JSON.parse(data.choices[0].message.content);
    return NextResponse.json({
      actions,
      usage: data.usage,
    });
  } catch (error) {
    console.error('Failed to parse action items:', error);
    return NextResponse.json(
      { error: 'Failed to parse action items' },
      { status: 500 }
    );
  }
}

async function generateSummary(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  promptConfig: any,
  model: string
) {
  if (!promptConfig.summaryPrompt) {
    return NextResponse.json({ error: 'Summary generation not configured' }, { status: 400 });
  }

  // Build conversation history
  const conversationHistory = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const summaryPrompt = promptConfig.summaryPrompt.replace(
    '{{conversationHistory}}',
    conversationHistory
  );

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes conversations concisely.',
        },
        {
          role: 'user',
          content: summaryPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: response.status }
    );
  }

  const data = await response.json();

  // Track token usage
  const { useTokenUsage } = await import('@/store/useTokenUsage');
  useTokenUsage.getState().addUsage({
    model,
    promptTokens: data.usage.prompt_tokens,
    completionTokens: data.usage.completion_tokens,
    totalTokens: data.usage.total_tokens,
    endpoint: '/api/brainstorm/summarize',
  });

  return NextResponse.json({
    summary: data.choices[0].message.content,
    usage: data.usage,
  });
}
