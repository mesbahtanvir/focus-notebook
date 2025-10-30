import { NextRequest, NextResponse } from 'next/server';

// Alpha Vantage API configuration
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Cache for historical data (longer cache since it changes less frequently)
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const historyCache = new Map<string, { data: any; timestamp: number }>();

function getCachedHistory(cacheKey: string) {
  const cached = historyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedHistory(cacheKey: string, data: any) {
  historyCache.set(cacheKey, { data, timestamp: Date.now() });
}

export async function POST(request: NextRequest) {
  try {
    const { ticker, days = 90 } = await request.json();

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker symbol is required' },
        { status: 400 }
      );
    }

    const upperTicker = ticker.toUpperCase();
    const cacheKey = `${upperTicker}_${days}`;

    // Check cache first
    const cachedData = getCachedHistory(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Check API key
    if (!ALPHA_VANTAGE_API_KEY) {
      return NextResponse.json(
        { error: 'Stock API is not configured. Please contact administrator.' },
        { status: 503 }
      );
    }

    // Determine which Alpha Vantage function to use based on days
    // Daily data for up to 100 days
    const outputSize = days <= 100 ? 'compact' : 'full'; // compact = last 100 days, full = 20+ years
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${upperTicker}&outputsize=${outputSize}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    // Check for API errors
    if (data['Error Message']) {
      return NextResponse.json(
        { error: 'Invalid ticker symbol or API error' },
        { status: 404 }
      );
    }

    if (data['Note']) {
      // API call frequency limit
      return NextResponse.json(
        {
          error: 'API call frequency limit reached. Please try again later.',
          rateLimitExceeded: true
        },
        { status: 429 }
      );
    }

    const timeSeries = data['Time Series (Daily)'];

    if (!timeSeries) {
      return NextResponse.json(
        { error: 'No historical data available for this ticker' },
        { status: 404 }
      );
    }

    // Parse and format the historical data
    const historicalData = Object.entries(timeSeries)
      .map(([date, values]: [string, any]) => ({
        date,
        price: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        open: parseFloat(values['1. open']),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date ascending
      .slice(-days); // Get only the requested number of days

    const result = {
      symbol: upperTicker,
      data: historicalData,
      source: 'Alpha Vantage',
      days: historicalData.length,
    };

    // Cache the result
    setCachedHistory(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock history. Please try again later.' },
      { status: 500 }
    );
  }
}
