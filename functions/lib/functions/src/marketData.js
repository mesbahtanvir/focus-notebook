"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private__ = exports.refreshTrackedTickerPrices = exports.updateTrackedTickers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const MARKET_DATA_COLLECTION = 'marketData';
const TRACKED_TICKERS_DOCUMENT = 'trackedTickers';
const LATEST_PRICES_DOCUMENT = 'latestPrices';
const PRICE_HISTORY_PARENT = 'daily';
const getAlphaVantageApiKey = () => process.env.ALPHA_VANTAGE_API_KEY || '';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_SOURCE = 'Alpha Vantage';
const ALPHA_VANTAGE_REQUEST_INTERVAL_MS = 15000; // 4 requests/minute to stay under free-tier limit
/**
 * Normalizes an arbitrary ticker value to an uppercase, trimmed string when possible.
 */
const normalizeTicker = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
};
/**
 * Normalizes an arbitrary currency value to a three-letter ISO-like code when possible.
 */
const normalizeCurrency = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim().toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
};
const addCurrencyIfPresent = (value, accumulator) => {
    const normalized = normalizeCurrency(value);
    if (normalized) {
        accumulator.add(normalized);
    }
};
/**
 * Extracts the unique stock tickers from the provided portfolio document.
 */
const collectTickersFromPortfolio = (portfolio) => {
    if (!portfolio || !Array.isArray(portfolio.investments)) {
        return [];
    }
    const tickers = new Set();
    for (const rawInvestment of portfolio.investments) {
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
const collectCurrenciesFromPortfolio = (portfolio) => {
    const currencies = new Set();
    if (!portfolio || typeof portfolio !== 'object') {
        return [];
    }
    addCurrencyIfPresent(portfolio.baseCurrency, currencies);
    addCurrencyIfPresent(portfolio.nativeCurrency, currencies);
    const recurringPlan = portfolio.recurringPlan;
    if (recurringPlan && typeof recurringPlan === 'object') {
        addCurrencyIfPresent(recurringPlan.currency, currencies);
    }
    if (!Array.isArray(portfolio.investments)) {
        return Array.from(currencies);
    }
    for (const rawInvestment of portfolio.investments) {
        if (!rawInvestment || typeof rawInvestment !== 'object') {
            continue;
        }
        addCurrencyIfPresent(rawInvestment.currency, currencies);
        addCurrencyIfPresent(rawInvestment.baseCurrency, currencies);
        addCurrencyIfPresent(rawInvestment.nativeCurrency, currencies);
        if (Array.isArray(rawInvestment.contributions)) {
            for (const rawContribution of rawInvestment.contributions) {
                if (!rawContribution || typeof rawContribution !== 'object') {
                    continue;
                }
                addCurrencyIfPresent(rawContribution.currency, currencies);
            }
        }
        if (Array.isArray(rawInvestment.priceHistory)) {
            for (const rawPoint of rawInvestment.priceHistory) {
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
const delay = (duration) => new Promise(resolve => setTimeout(resolve, duration));
const parseAlphaVantageQuote = (ticker, payload) => {
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
const fetchTickerQuote = async (ticker, apiKey) => {
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
const runUpdateTrackedTickers = async (context, dependencies = {}) => {
    var _a, _b, _c;
    const database = (_a = dependencies.firestore) !== null && _a !== void 0 ? _a : db;
    const logger = (_b = dependencies.logger) !== null && _b !== void 0 ? _b : functions.logger;
    const fieldValue = (_c = dependencies.fieldValue) !== null && _c !== void 0 ? _c : admin.firestore.FieldValue;
    const tickers = new Set();
    const currencies = new Set();
    const portfolioSnapshot = await database.collectionGroup('portfolios').get();
    logger.info('Scanning portfolios for tracked tickers and currencies', {
        totalPortfolios: portfolioSnapshot.size,
        executionId: context.eventId,
    });
    for (const doc of portfolioSnapshot.docs) {
        const portfolio = doc.data();
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
const runRefreshTrackedTickerPrices = async (context, dependencies = {}) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const database = (_a = dependencies.firestore) !== null && _a !== void 0 ? _a : db;
    const logger = (_b = dependencies.logger) !== null && _b !== void 0 ? _b : functions.logger;
    const fieldValue = (_c = dependencies.fieldValue) !== null && _c !== void 0 ? _c : admin.firestore.FieldValue;
    const apiKey = (_d = dependencies.apiKey) !== null && _d !== void 0 ? _d : getAlphaVantageApiKey();
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
    const data = trackedDoc.data();
    const trackedTickers = Array.isArray(data === null || data === void 0 ? void 0 : data.tickers)
        ? (data === null || data === void 0 ? void 0 : data.tickers)
            .map(normalizeTicker)
            .filter((ticker) => Boolean(ticker))
        : [];
    if (trackedTickers.length === 0) {
        logger.info('No tracked tickers to refresh', { executionId: context.eventId });
        return null;
    }
    const tickerSnapshots = {};
    const failures = [];
    const quoteFetcher = (_e = dependencies.quoteFetcher) !== null && _e !== void 0 ? _e : ((ticker) => fetchTickerQuote(ticker, apiKey));
    const delayFn = (_f = dependencies.delayFn) !== null && _f !== void 0 ? _f : delay;
    const nowProvider = (_g = dependencies.now) !== null && _g !== void 0 ? _g : (() => new Date());
    logger.info('Refreshing tracked ticker prices', {
        totalTickers: trackedTickers.length,
        executionId: context.eventId,
    });
    for (let index = 0; index < trackedTickers.length; index += 1) {
        const ticker = trackedTickers[index];
        try {
            const quote = await quoteFetcher(ticker);
            tickerSnapshots[ticker] = quote;
        }
        catch (error) {
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
    batch.set(historyRef, Object.assign(Object.assign({}, payload), { date: dateKey }));
    await batch.commit();
    logger.info('Tracked ticker prices refreshed', {
        totalTickers: trackedTickers.length,
        totalFailures: failures.length,
        executionId: context.eventId,
    });
    return null;
};
exports.updateTrackedTickers = functions.pubsub
    .schedule('0 0 * * *')
    .timeZone('UTC')
    .onRun(context => runUpdateTrackedTickers(context));
exports.refreshTrackedTickerPrices = functions.pubsub
    .schedule('5 0 * * *')
    .timeZone('UTC')
    .onRun(context => runRefreshTrackedTickerPrices(context));
exports.__private__ = {
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
//# sourceMappingURL=marketData.js.map