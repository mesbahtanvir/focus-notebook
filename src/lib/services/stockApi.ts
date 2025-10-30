/**
 * Stock API Service
 * Handles stock price fetching and historical data retrieval
 */

import { formatCurrency } from '@/lib/currency';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  source: string;
}

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
    const response = await fetch('/api/stock-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker: ticker.toUpperCase() }),
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
export function formatPrice(
  price: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return formatCurrency(price, currency, locale);
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
