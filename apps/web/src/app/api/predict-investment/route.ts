import { NextRequest, NextResponse } from 'next/server';
import { verifyAiRequest, UnauthorizedError, ForbiddenError } from '@/lib/server/verifyAiRequest';

export async function POST(request: NextRequest) {
  try {
    await verifyAiRequest(request);
    const { historicalData, symbol, model } = await request.json();
    const selectedModel = model || 'gpt-4o-mini'; // Use GPT-4 for better predictions

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

    // TODO: Implement server-side AI service integration
    // This endpoint should now connect to a backend AI service
    // instead of making direct OpenAI API calls with user keys

    console.log('📤 AI service integration needed for:', symbol);

    return NextResponse.json(
      {
        error: 'AI service not configured',
        details: 'Investment prediction functionality is currently being updated. Please check back later.'
      },
      { status: 503 }
    );

  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
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
