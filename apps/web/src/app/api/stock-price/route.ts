import { NextRequest, NextResponse } from 'next/server';

// Alpha Vantage API configuration
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Rate limiting: Track API calls (simple in-memory for MVP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_CALLS_PER_DAY = 25; // Free tier limit
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Simple cache to avoid hitting API too frequently
const priceCache = new Map<string, { data: any; timestamp: number }>();

function checkRateLimit(): boolean {
  const today = new Date().toDateString();
  const limit = rateLimitMap.get(today);

  if (!limit) {
    rateLimitMap.set(today, { count: 1, resetTime: Date.now() + 24 * 60 * 60 * 1000 });
    return true;
  }

  if (Date.now() > limit.resetTime) {
    rateLimitMap.set(today, { count: 1, resetTime: Date.now() + 24 * 60 * 60 * 1000 });
    return true;
  }

  if (limit.count >= MAX_CALLS_PER_DAY) {
    return false;
  }

  limit.count++;
  return true;
}

function getCachedPrice(ticker: string) {
  const cached = priceCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedPrice(ticker: string, data: any) {
  priceCache.set(ticker, { data, timestamp: Date.now() });
}

export async function POST(request: NextRequest) {
  try {
    const { ticker } = await request.json();

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker symbol is required' },
        { status: 400 }
      );
    }

    const upperTicker = ticker.toUpperCase();

    // Check cache first
    const cachedData = getCachedPrice(upperTicker);
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

    // Check rate limit
    if (!checkRateLimit()) {
      return NextResponse.json(
        {
          error: 'Daily API limit reached. Please try again tomorrow or use manual value updates.',
          rateLimitExceeded: true
        },
        { status: 429 }
      );
    }

    // Fetch from Alpha Vantage
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${upperTicker}&apikey=${ALPHA_VANTAGE_API_KEY}`;

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
          error: 'API call frequency limit reached. Please wait a moment and try again.',
          rateLimitExceeded: true
        },
        { status: 429 }
      );
    }

    const quote = data['Global Quote'];

    if (!quote || !quote['05. price']) {
      return NextResponse.json(
        { error: 'No data available for this ticker' },
        { status: 404 }
      );
    }

    // Parse the response
    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
    const timestamp = new Date().toISOString();

    const result = {
      symbol: upperTicker,
      price,
      change,
      changePercent,
      timestamp,
      source: 'Alpha Vantage',
    };

    // Cache the result
    setCachedPrice(upperTicker, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock price. Please try again later.' },
      { status: 500 }
    );
  }
}
