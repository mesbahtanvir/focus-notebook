import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const db = admin.firestore();

const MARKET_DATA_COLLECTION = 'marketData';
const TRACKED_TICKERS_DOCUMENT = 'trackedTickers';
const LATEST_PRICES_DOCUMENT = 'latestPrices';
const PRICE_HISTORY_PARENT = 'daily';

const getAlphaVantageApiKey = () => process.env.ALPHA_VANTAGE_API_KEY || '';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_SOURCE = 'Alpha Vantage';
const ALPHA_VANTAGE_REQUEST_INTERVAL_MS = 15_000; // 4 requests/minute to stay under free-tier limit

type TrackedQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  source: string;
  fetchedAt: string;
};

type FirestoreContribution = {
  currency?: unknown;
};

type FirestorePriceHistoryPoint = {
  currency?: unknown;
};

type FirestoreInvestment = {
  assetType?: unknown;
  ticker?: unknown;
  currency?: unknown;
  baseCurrency?: unknown;
  nativeCurrency?: unknown;
  contributions?: unknown;
  priceHistory?: unknown;
};

type FirestoreRecurringPlan = {
  currency?: unknown;
};

type FirestorePortfolio = {
  investments?: unknown;
  baseCurrency?: unknown;
  nativeCurrency?: unknown;
  recurringPlan?: unknown;
};

/**
 * Normalizes an arbitrary ticker value to an uppercase, trimmed string when possible.
 */
const normalizeTicker = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

/**
 * Normalizes an arbitrary currency value to a three-letter ISO-like code when possible.
 */
const normalizeCurrency = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
};

const addCurrencyIfPresent = (value: unknown, accumulator: Set<string>) => {
  const normalized = normalizeCurrency(value);
  if (normalized) {
    accumulator.add(normalized);
  }
};

/**
 * Extracts the unique stock tickers from the provided portfolio document.
 */
const collectTickersFromPortfolio = (portfolio: FirestorePortfolio): string[] => {
  if (!portfolio || !Array.isArray(portfolio.investments)) {
    return [];
  }

  const tickers = new Set<string>();

  for (const rawInvestment of portfolio.investments as FirestoreInvestment[]) {
    if (!rawInvestment || typeof rawInvestment !== 'object') {
      continue;
    }

    const { assetType, ticker } = rawInvestment;
    if (assetType !== 'stock') {
      continue;
    }

    const normalizedTicker = normalizeTicker(ticker);
    if (normalizedTicker) {
      tickers.add(normalizedTicker);
    }
  }

  return Array.from(tickers);
};

const collectCurrenciesFromPortfolio = (portfolio: FirestorePortfolio): string[] => {
  const currencies = new Set<string>();

  if (!portfolio || typeof portfolio !== 'object') {
    return [];
  }

  addCurrencyIfPresent(portfolio.baseCurrency, currencies);
  addCurrencyIfPresent(portfolio.nativeCurrency, currencies);

  const recurringPlan = portfolio.recurringPlan as FirestoreRecurringPlan | null | undefined;
  if (recurringPlan && typeof recurringPlan === 'object') {
    addCurrencyIfPresent(recurringPlan.currency, currencies);
  }

  if (!Array.isArray(portfolio.investments)) {
    return Array.from(currencies);
  }

  for (const rawInvestment of portfolio.investments as FirestoreInvestment[]) {
    if (!rawInvestment || typeof rawInvestment !== 'object') {
      continue;
    }

    addCurrencyIfPresent(rawInvestment.currency, currencies);
    addCurrencyIfPresent(rawInvestment.baseCurrency, currencies);
    addCurrencyIfPresent(rawInvestment.nativeCurrency, currencies);

    if (Array.isArray(rawInvestment.contributions)) {
      for (const rawContribution of rawInvestment.contributions as FirestoreContribution[]) {
        if (!rawContribution || typeof rawContribution !== 'object') {
          continue;
        }

        addCurrencyIfPresent(rawContribution.currency, currencies);
      }
    }

    if (Array.isArray(rawInvestment.priceHistory)) {
      for (const rawPoint of rawInvestment.priceHistory as FirestorePriceHistoryPoint[]) {
        if (!rawPoint || typeof rawPoint !== 'object') {
          continue;
        }

        addCurrencyIfPresent(rawPoint.currency, currencies);
      }
    }
  }

  return Array.from(currencies);
};

/**
 * Aggregates tracked tickers from all user portfolios and persists the list to Firestore.
 */
const delay = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));

const parseAlphaVantageQuote = (ticker: string, payload: any): TrackedQuote => {
  if (!payload) {
    throw new Error('Missing Alpha Vantage response payload');
  }

  if (payload['Note']) {
    throw new Error('Alpha Vantage rate limit exceeded');
  }

  if (payload['Error Message']) {
    throw new Error(`Alpha Vantage returned an error for ${ticker}`);
  }

  const quote = payload['Global Quote'];
  if (!quote || typeof quote !== 'object') {
    throw new Error(`Alpha Vantage returned no quote for ${ticker}`);
  }

  const price = Number.parseFloat(quote['05. price']);
  const change = Number.parseFloat(quote['09. change']);
  const changePercentRaw = typeof quote['10. change percent'] === 'string' ? quote['10. change percent'] : '';
  const changePercent = Number.parseFloat(changePercentRaw.replace('%', ''));
  const latestTradingDay = typeof quote['07. latest trading day'] === 'string' ? quote['07. latest trading day'] : '';

  if (!Number.isFinite(price)) {
    throw new Error(`Alpha Vantage returned an invalid price for ${ticker}`);
  }

  return {
    symbol: ticker,
    price,
    change: Number.isFinite(change) ? change : 0,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    timestamp: latestTradingDay ? new Date(`${latestTradingDay}T00:00:00Z`).toISOString() : new Date().toISOString(),
    source: ALPHA_VANTAGE_SOURCE,
    fetchedAt: new Date().toISOString(),
  };
};

const fetchTickerQuote = async (ticker: string, apiKey: string): Promise<TrackedQuote> => {
  const params = new URLSearchParams({
    function: 'GLOBAL_QUOTE',
    symbol: ticker,
    apikey: apiKey,
  });

  const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quote for ${ticker}: ${response.statusText}`);
  }

  const data = await response.json();
  return parseAlphaVantageQuote(ticker, data);
};

type UpdateTrackedTickersDependencies = {
  firestore?: FirebaseFirestore.Firestore;
  logger?: Pick<typeof functions.logger, 'info' | 'warn' | 'error'>;
  fieldValue?: typeof admin.firestore.FieldValue;
};

type RefreshTrackedTickerPricesDependencies = UpdateTrackedTickersDependencies & {
  apiKey?: string;
  quoteFetcher?: (ticker: string) => Promise<TrackedQuote>;
  delayFn?: (duration: number) => Promise<void>;
  now?: () => Date;
};

const runUpdateTrackedTickers = async (
  context: functions.EventContext,
  dependencies: UpdateTrackedTickersDependencies = {}
) => {
  const database = dependencies.firestore ?? db;
  const logger = dependencies.logger ?? functions.logger;
  const fieldValue = dependencies.fieldValue ?? admin.firestore.FieldValue;

  const tickers = new Set<string>();
  const currencies = new Set<string>();

  const portfolioSnapshot = await database.collectionGroup('portfolios').get();
  logger.info('Scanning portfolios for tracked tickers and currencies', {
    totalPortfolios: portfolioSnapshot.size,
    executionId: context.eventId,
  });

  for (const doc of portfolioSnapshot.docs) {
    const portfolio = doc.data() as FirestorePortfolio;
    for (const ticker of collectTickersFromPortfolio(portfolio)) {
      tickers.add(ticker);
    }
    for (const currency of collectCurrenciesFromPortfolio(portfolio)) {
      currencies.add(currency);
    }
  }

  const sortedTickers = Array.from(tickers).sort();
  const sortedCurrencies = Array.from(currencies).sort();
  const trackedDocRef = database.collection(MARKET_DATA_COLLECTION).doc(TRACKED_TICKERS_DOCUMENT);

  await trackedDocRef.set({
    tickers: sortedTickers,
    currencies: sortedCurrencies,
    totalTickers: sortedTickers.length,
    totalCurrencies: sortedCurrencies.length,
    totalPortfolios: portfolioSnapshot.size,
    generatedAt: fieldValue.serverTimestamp(),
  });

  logger.info('Tracked tickers and currencies updated', {
    totalTickers: sortedTickers.length,
    totalCurrencies: sortedCurrencies.length,
    executionId: context.eventId,
  });

  return null;
};

const runRefreshTrackedTickerPrices = async (
  context: functions.EventContext,
  dependencies: RefreshTrackedTickerPricesDependencies = {}
) => {
  const database = dependencies.firestore ?? db;
  const logger = dependencies.logger ?? functions.logger;
  const fieldValue = dependencies.fieldValue ?? admin.firestore.FieldValue;
  const apiKey = dependencies.apiKey ?? getAlphaVantageApiKey();

  if (!apiKey) {
    logger.error('Alpha Vantage API key missing; skipping price refresh', {
      executionId: context.eventId,
    });
    return null;
  }

  const trackedDoc = await database.collection(MARKET_DATA_COLLECTION).doc(TRACKED_TICKERS_DOCUMENT).get();
  if (!trackedDoc.exists) {
    logger.warn('Tracked tickers document missing; skipping price refresh', {
      executionId: context.eventId,
    });
    return null;
  }

  const data = trackedDoc.data() as { tickers?: unknown } | undefined;
  const trackedTickers = Array.isArray(data?.tickers)
    ? (data?.tickers as unknown[])
        .map(normalizeTicker)
        .filter((ticker): ticker is string => Boolean(ticker))
    : [];

  if (trackedTickers.length === 0) {
    logger.info('No tracked tickers to refresh', { executionId: context.eventId });
    return null;
  }

  const tickerSnapshots: Record<string, TrackedQuote> = {};
  const failures: Array<{ ticker: string; error: string }> = [];
  const quoteFetcher =
    dependencies.quoteFetcher ?? ((ticker: string) => fetchTickerQuote(ticker, apiKey));
  const delayFn = dependencies.delayFn ?? delay;
  const nowProvider = dependencies.now ?? (() => new Date());

  logger.info('Refreshing tracked ticker prices', {
    totalTickers: trackedTickers.length,
    executionId: context.eventId,
  });

  for (let index = 0; index < trackedTickers.length; index += 1) {
    const ticker = trackedTickers[index];
    try {
      const quote = await quoteFetcher(ticker);
      tickerSnapshots[ticker] = quote;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failures.push({ ticker, error: errorMessage });
      logger.error('Failed to refresh ticker price', {
        ticker,
        error: errorMessage,
        executionId: context.eventId,
      });
    }

    if (index < trackedTickers.length - 1) {
      await delayFn(ALPHA_VANTAGE_REQUEST_INTERVAL_MS);
    }
  }

  const now = nowProvider();
  const isoDate = now.toISOString();
  const dateKey = isoDate.slice(0, 10);

  const latestRef = database.collection(MARKET_DATA_COLLECTION).doc(LATEST_PRICES_DOCUMENT);
  const historyRef = database
    .collection(MARKET_DATA_COLLECTION)
    .doc(PRICE_HISTORY_PARENT)
    .collection('prices')
    .doc(dateKey);

  const batch = database.batch();
  const payload = {
    tickers: tickerSnapshots,
    generatedAt: fieldValue.serverTimestamp(),
    source: ALPHA_VANTAGE_SOURCE,
    totalTickers: trackedTickers.length,
    totalFailures: failures.length,
    failures,
    refreshedAt: isoDate,
  };

  batch.set(latestRef, payload, { merge: true });
  batch.set(historyRef, { ...payload, date: dateKey });

  await batch.commit();

  logger.info('Tracked ticker prices refreshed', {
    totalTickers: trackedTickers.length,
    totalFailures: failures.length,
    executionId: context.eventId,
  });

  return null;
};

export const updateTrackedTickers = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(context => runUpdateTrackedTickers(context));

export const refreshTrackedTickerPrices = functions.pubsub
  .schedule('5 0 * * *')
  .timeZone('UTC')
  .onRun(context => runRefreshTrackedTickerPrices(context));

export const __private__ = {
  normalizeTicker,
  normalizeCurrency,
  collectTickersFromPortfolio,
  collectCurrenciesFromPortfolio,
  parseAlphaVantageQuote,
  runUpdateTrackedTickers,
  runRefreshTrackedTickerPrices,
  fetchTickerQuote,
  delay,
};
