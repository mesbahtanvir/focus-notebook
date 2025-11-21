/**
 * Stock API Service
 * Handles stock price fetching and historical data retrieval
 */
import { formatCurrency, normalizeCurrencyCode } from '@/lib/utils/currency';
import { db } from '@/lib/firebaseClient';
import { Timestamp, doc, getDoc } from 'firebase/firestore';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  source: string;
}

type FirestoreTickerEntry = {
  price?: number;
  change?: number;
  changePercent?: number;
  timestamp?: string;
  source?: string;
  fetchedAt?: string;
};

type FirestorePriceSnapshot = {
  tickers?: Record<string, FirestoreTickerEntry>;
  source?: string;
  generatedAt?: Timestamp | string | null;
  refreshedAt?: string | null;
};

const MARKET_DATA_COLLECTION = 'marketData';
const LATEST_PRICES_DOCUMENT = 'latestPrices';

const toIsoString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return ((value as { toDate: () => Date }).toDate()).toISOString();
    } catch (error) {
      console.error('Failed to convert Firestore timestamp-like value to ISO string', error);
      return null;
    }
  }

  return null;
};

const loadQuoteFromFirestore = async (ticker: string): Promise<StockQuote | null> => {
  try {
    const snapshotRef = doc(db, MARKET_DATA_COLLECTION, LATEST_PRICES_DOCUMENT);
    const snapshot = await getDoc(snapshotRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as FirestorePriceSnapshot;
    const entry = data.tickers?.[ticker];

    if (!entry || typeof entry.price !== 'number') {
      return null;
    }

    const timestamp = entry.timestamp || entry.fetchedAt || data.refreshedAt || toIsoString(data.generatedAt) || new Date().toISOString();

    return {
      symbol: ticker,
      price: entry.price,
      change: typeof entry.change === 'number' ? entry.change : 0,
      changePercent: typeof entry.changePercent === 'number' ? entry.changePercent : 0,
      timestamp,
      source: entry.source || data.source || 'Cached Market Data',
    };
  } catch (error) {
    console.error('Error loading stock price from Firestore:', error);
    return null;
  }
};

export interface HistoricalDataPoint {
  date: string;
  price: number;
  volume?: number;
}

export interface StockHistory {
  symbol: string;
  data: HistoricalDataPoint[];
  source: string;
}

/**
 * Fetch current stock price
 */
export async function fetchStockPrice(ticker: string): Promise<StockQuote> {
  try {
    const upperTicker = ticker.toUpperCase();

    const cachedQuote = await loadQuoteFromFirestore(upperTicker);
    if (cachedQuote) {
      return cachedQuote;
    }

    const response = await fetch('/api/stock-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker: upperTicker }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stock price');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching stock price:', error);
    throw error;
  }
}

/**
 * Fetch historical stock data
 */
export async function fetchStockHistory(
  ticker: string,
  days: number = 90
): Promise<StockHistory> {
  try {
    const response = await fetch('/api/stock-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker: ticker.toUpperCase(), days }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stock history');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching stock history:', error);
    throw error;
  }
}

/**
 * Batch fetch prices for multiple tickers
 */
export async function fetchMultipleStockPrices(
  tickers: string[]
): Promise<Record<string, StockQuote>> {
  const results: Record<string, StockQuote> = {};

  // Fetch prices sequentially to respect rate limits
  for (const ticker of tickers) {
    try {
      const quote = await fetchStockPrice(ticker);
      results[ticker] = quote;
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to fetch price for ${ticker}:`, error);
      // Continue with other tickers even if one fails
    }
  }

  return results;
}

/**
 * Validate ticker symbol format
 */
export function validateTicker(ticker: string): boolean {
  // Allow 1-5 alphanumeric characters per segment separated by . or - (e.g., BRK.B, VUN.TO)
  const tickerRegex = /^[A-Z0-9]{1,5}(?:[.-][A-Z0-9]{1,5})*$/;
  return tickerRegex.test(ticker.toUpperCase());
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return formatCurrency(price, normalizeCurrencyCode(currency));
}

/**
 * Format change percentage
 */
export function formatChangePercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Get color class based on change value
 */
export function getChangeColorClass(change: number): string {
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-600';
}
