import { NextRequest, NextResponse } from 'next/server';
import { verifyAiRequest, UnauthorizedError, ForbiddenError } from '@/lib/server/verifyAiRequest';
import { loadPrompt, renderTemplate, renderContext } from '@/lib/prompts/promptLoader';

export async function POST(request: NextRequest) {
  try {
    await verifyAiRequest(request);
    const {
      month,
      totalSpent,
      transactionCount,
      categoryBreakdown,
      topMerchants,
      previousMonth,
      apiKey,
      model
    } = await request.json();

    // Load spending analysis prompt configuration
    const promptConfig = loadPrompt('spending-analysis');
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

    // Calculate average transaction
    const averageTransaction = transactionCount > 0
      ? (totalSpent / transactionCount).toFixed(2)
      : '0.00';

    // Calculate change percentage if previous month exists
    let changePercentage = '0';
    if (previousMonth && previousMonth.totalSpent > 0) {
      const change = ((totalSpent - previousMonth.totalSpent) / previousMonth.totalSpent) * 100;
      changePercentage = change.toFixed(1);
    }

    // Format category breakdown for template
    const formattedCategories = Object.entries(categoryBreakdown || {}).map(([category, data]: [string, any]) => ({
      category,
      total: data.total.toFixed(2),
      percentage: data.percentage.toFixed(1),
      count: data.count,
    }));

    // Format top merchants for template
    const formattedMerchants = (topMerchants || []).map((m: any) => ({
      merchant: m.merchant,
      total: m.total.toFixed(2),
      count: m.count,
    }));

    // Build context for prompt
    const context = {
      month,
      totalSpent: totalSpent.toFixed(2),
      transactionCount,
      averageTransaction,
      categoryBreakdown: formattedCategories,
      topMerchants: formattedMerchants,
      previousMonth: previousMonth ? {
        totalSpent: previousMonth.totalSpent.toFixed(2),
      } : null,
      changePercentage,
    };

    // Render user prompt with context
    const userPromptContent = renderContext(promptConfig.userPrompt || '', context);

    // Build messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: promptConfig.systemPrompt,
      },
      {
        role: 'user',
        content: userPromptContent,
      },
    ];

    console.log('📊 Analyzing spending for:', month);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: promptConfig.model.temperature,
        max_tokens: promptConfig.model.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to analyze spending' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Track token usage
    const { useTokenUsage } = await import('@/store/useTokenUsage');
    useTokenUsage.getState().addUsage({
      model: selectedModel,
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
      endpoint: '/api/analyze-spending',
    });

    // Parse the analysis from response
    const analysis = data.choices[0].message.content;

    return NextResponse.json({
      analysis,
      usage: data.usage,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Spending analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze spending' },
      { status: 500 }
    );
  }
}
