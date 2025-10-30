import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { historicalData, symbol, apiKey, model } = await request.json();
    const selectedModel = model || 'gpt-4o-mini'; // Use GPT-4 for better predictions

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

    if (!historicalData || historicalData.length < 30) {
      return NextResponse.json(
        { error: 'Need at least 30 days of historical data for predictions' },
        { status: 400 }
      );
    }

    console.log('🤖 Generating investment prediction for:', symbol);

    // Prepare historical data summary
    const dataLength = historicalData.length;
    const firstPrice = historicalData[0].price;
    const lastPrice = historicalData[dataLength - 1].price;
    const priceChange = lastPrice - firstPrice;
    const priceChangePercent = ((priceChange / firstPrice) * 100).toFixed(2);

    // Calculate moving averages
    const last7Days = historicalData.slice(-7);
    const last30Days = historicalData.slice(-30);
    const avg7 = (last7Days.reduce((sum: number, d: any) => sum + d.price, 0) / 7).toFixed(2);
    const avg30 = (last30Days.reduce((sum: number, d: any) => sum + d.price, 0) / 30).toFixed(2);

    // Format price data for AI (sample to reduce token usage)
    const sampledData = historicalData.filter((_: any, i: number) => i % 3 === 0); // Take every 3rd day
    const priceDataString = sampledData
      .map((d: any) => `${d.date}: $${d.price.toFixed(2)}`)
      .join('\n');

    const prompt = `You are a financial analyst assistant. Analyze the following stock price data and provide a prediction.

Stock Symbol: ${symbol}
Data Period: ${dataLength} days
Start Price: $${firstPrice.toFixed(2)}
Current Price: $${lastPrice.toFixed(2)}
Total Change: ${priceChangePercent}%
7-Day Average: $${avg7}
30-Day Average: $${avg30}

Historical Prices (sampled):
${priceDataString}

Based on this data, provide a 30-day forward prediction. Consider:
1. Recent price trends and momentum
2. Moving average crossovers
3. Price volatility
4. Historical patterns

IMPORTANT DISCLAIMERS:
- This is NOT financial advice
- Past performance does not guarantee future results
- Stock markets are unpredictable
- Use for informational purposes only

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "predictions": [
    {
      "date": "YYYY-MM-DD",
      "predictedPrice": 123.45,
      "confidence": "low|medium|high"
    }
  ],
  "trend": "bullish|bearish|neutral",
  "summary": "Brief analysis summary",
  "reasoning": "Key factors influencing the prediction",
  "riskFactors": ["List of risk factors to consider"],
  "targetPrice30Days": 123.45,
  "supportLevel": 120.00,
  "resistanceLevel": 130.00
}

Generate predictions for the next 30 days (every 3 days for efficiency).`;

    // Call OpenAI API
    console.log('📤 Calling OpenAI API for prediction');
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
            content: 'You are a financial analyst assistant. Always respond with valid JSON only. Your predictions are for educational purposes only and should not be considered financial advice.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5, // Lower temperature for more consistent predictions
        max_tokens: 2000,
      }),
    });

    console.log('📥 OpenAI response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ OpenAI API error:', error);

      return NextResponse.json(
        {
          error: 'Failed to generate prediction',
          details: error.error?.message || 'Unknown error'
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    let aiResponse = data.choices[0]?.message?.content;

    console.log('🤖 Raw AI response:', aiResponse?.substring(0, 200));

    // Track token usage
    if (data.usage) {
      try {
        const { useTokenUsage } = await import('@/store/useTokenUsage');
        useTokenUsage.getState().addUsage({
          model: selectedModel,
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          endpoint: `/api/predict-investment/${symbol}`,
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

    console.log('✅ Generated prediction for', symbol);

    return NextResponse.json({
      success: true,
      symbol,
      prediction: parsedResponse,
      usage: data.usage,
      disclaimer: 'This prediction is for informational purposes only and should not be considered financial advice. Past performance does not guarantee future results.'
    });

  } catch (error) {
    console.error('💥 Prediction error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 }
    );
  }
}
