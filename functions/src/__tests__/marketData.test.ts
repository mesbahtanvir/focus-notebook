const firestoreMock = Object.assign(jest.fn(), {
  FieldValue: { serverTimestamp: jest.fn(() => 'timestamp') },
});

jest.mock('firebase-admin', () => ({
  firestore: firestoreMock,
}));

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { __private__ } from '../marketData';

describe('marketData helpers', () => {
  describe('normalizeTicker', () => {
    it('uppercases and trims ticker values', () => {
      expect(__private__.normalizeTicker(' aapl ')).toBe('AAPL');
    });

    it('returns null for non-string values', () => {
      expect(__private__.normalizeTicker(undefined)).toBeNull();
      expect(__private__.normalizeTicker(42 as unknown as string)).toBeNull();
    });

    it('returns null for empty values after normalization', () => {
      expect(__private__.normalizeTicker('   ')).toBeNull();
    });
  });

  describe('normalizeCurrency', () => {
    it('uppercases valid ISO-like currency codes', () => {
      expect(__private__.normalizeCurrency(' cad ')).toBe('CAD');
    });

    it('rejects values that are not three letters', () => {
      expect(__private__.normalizeCurrency('CA')).toBeNull();
      expect(__private__.normalizeCurrency('CAD$')).toBeNull();
      expect(__private__.normalizeCurrency('123')).toBeNull();
    });
  });

  describe('collectTickersFromPortfolio', () => {
    it('collects unique stock tickers from investments', () => {
      const result = __private__.collectTickersFromPortfolio({
        investments: [
          { assetType: 'stock', ticker: 'aapl' },
          { assetType: 'stock', ticker: ' AAPL ' },
          { assetType: 'crypto', ticker: 'btc' },
          { assetType: 'stock', ticker: 'msft' },
        ],
      });

      expect(result.sort()).toEqual(['AAPL', 'MSFT']);
    });

    it('handles missing or malformed investments', () => {
      expect(
        __private__.collectTickersFromPortfolio({
          investments: [{ assetType: 'stock' }, null, 'invalid' as unknown as object],
        })
      ).toEqual([]);
    });
  });

  describe('collectCurrenciesFromPortfolio', () => {
    it('collects currencies from portfolio-level and investment-level fields', () => {
      const result = __private__.collectCurrenciesFromPortfolio({
        baseCurrency: 'cad',
        nativeCurrency: 'usd',
        recurringPlan: { currency: ' eur ' },
        investments: [
          {
            assetType: 'stock',
            currency: 'cad',
            baseCurrency: 'usd',
            nativeCurrency: 'gbp',
            contributions: [{ currency: 'usd' }, { currency: ' CAD ' }],
            priceHistory: [{ currency: 'usd' }, { currency: 'jpy' }],
          },
          { assetType: 'crypto', currency: 'btc' },
        ],
      });

      expect(result.sort()).toEqual(['BTC', 'CAD', 'EUR', 'GBP', 'JPY', 'USD']);
    });

    it('returns an empty array when no currencies exist', () => {
      expect(__private__.collectCurrenciesFromPortfolio({})).toEqual([]);
    });
  });

  describe('parseAlphaVantageQuote', () => {
    it('parses a valid Alpha Vantage quote payload', () => {
      const quote = __private__.parseAlphaVantageQuote('AAPL', {
        'Global Quote': {
          '01. symbol': 'AAPL',
          '05. price': '172.57',
          '09. change': '1.23',
          '10. change percent': '0.72%',
          '07. latest trading day': '2024-05-10',
        },
      });

      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(172.57);
      expect(quote.change).toBe(1.23);
      expect(quote.changePercent).toBeCloseTo(0.72);
      expect(quote.timestamp).toBe('2024-05-10T00:00:00.000Z');
    });

    it('throws when the payload contains an error message', () => {
      expect(() =>
        __private__.parseAlphaVantageQuote('AAPL', {
          'Error Message': 'Invalid API call',
        })
      ).toThrow(/AAPL/);
    });
  });

  describe('delay', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('resolves after the specified duration', async () => {
      jest.useFakeTimers();

      const callback = jest.fn();
      const promise = __private__.delay(500).then(callback);

      jest.advanceTimersByTime(499);
      await Promise.resolve();
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(callback).toHaveBeenCalledTimes(1);

      await promise;
    });
  });

  describe('fetchTickerQuote', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('fetches and parses a ticker quote', async () => {
      const jsonMock = jest.fn().mockResolvedValue({
        'Global Quote': {
          '05. price': '123.45',
          '09. change': '1.23',
          '10. change percent': '0.99%',
          '07. latest trading day': '2024-05-12',
        },
      });
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, statusText: 'OK', json: jsonMock });
      global.fetch = fetchMock as unknown as typeof global.fetch;

      const result = await __private__.fetchTickerQuote('AAPL', 'demo-key');

      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('symbol=AAPL'));
      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBeCloseTo(123.45);
    });

    it('throws when the provider returns a non-OK response', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, statusText: 'Rate limited' });
      global.fetch = fetchMock as unknown as typeof global.fetch;

      await expect(__private__.fetchTickerQuote('AAPL', 'demo-key')).rejects.toThrow('Rate limited');
    });
  });

  describe('runUpdateTrackedTickers', () => {
    it('aggregates tickers and currencies then persists to Firestore', async () => {
      const setMock = jest.fn().mockResolvedValue(undefined);
      const docMock = jest.fn().mockReturnValue({ set: setMock });
      const getMock = jest.fn().mockResolvedValue({
        size: 2,
        docs: [
          {
            data: () => ({
              baseCurrency: 'cad',
              investments: [
                { assetType: 'stock', ticker: 'aapl', currency: 'cad' },
                { assetType: 'stock', ticker: 'MSFT', currency: 'usd' },
              ],
            }),
          },
          {
            data: () => ({
              nativeCurrency: 'gbp',
              investments: [
                { assetType: 'crypto', ticker: 'btc' },
                { assetType: 'stock', ticker: ' msft ', contributions: [{ currency: 'eur' }] },
              ],
            }),
          },
        ],
      });

      const firestore = {
        collectionGroup: jest.fn().mockReturnValue({ get: getMock }),
        collection: jest.fn().mockImplementation((collectionName: string) => {
          if (collectionName !== 'marketData') {
            throw new Error(`Unexpected collection: ${collectionName}`);
          }

          return { doc: docMock };
        }),
      } as unknown as FirebaseFirestore.Firestore;

      const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as Pick<
        typeof functions.logger,
        'info' | 'warn' | 'error'
      >;
      const fieldValue = { serverTimestamp: jest.fn(() => 'timestamp') } as unknown as typeof admin.firestore.FieldValue;

      const result = await __private__.runUpdateTrackedTickers({ eventId: 'event-1' } as any, {
        firestore,
        logger,
        fieldValue,
      });

      expect(result).toBeNull();
      expect(firestore.collectionGroup).toHaveBeenCalledWith('portfolios');
      expect(docMock).toHaveBeenCalledWith('trackedTickers');
      expect(setMock).toHaveBeenCalledWith({
        tickers: ['AAPL', 'MSFT'],
        currencies: ['CAD', 'EUR', 'GBP', 'USD'],
        totalTickers: 2,
        totalCurrencies: 4,
        totalPortfolios: 2,
        generatedAt: 'timestamp',
      });
      expect(logger.info).toHaveBeenCalledWith('Tracked tickers and currencies updated', expect.any(Object));
    });
  });

  describe('runRefreshTrackedTickerPrices', () => {
    const buildFirestore = () => {
      const trackedTickersDoc = {
        get: jest.fn(),
      };

      const latestRef = { id: 'latest' };
      const historyDoc = { id: 'history' };
      const pricesCollection = {
        doc: jest.fn().mockReturnValue(historyDoc),
      };
      const marketDataDoc = jest.fn().mockImplementation((docName: string) => {
        if (docName === 'trackedTickers') {
          return trackedTickersDoc;
        }
        if (docName === 'latestPrices') {
          return latestRef;
        }
        if (docName === 'daily') {
          return { collection: jest.fn().mockReturnValue(pricesCollection) };
        }

        throw new Error(`Unexpected doc: ${docName}`);
      });

      const batchSet = jest.fn();
      const batchCommit = jest.fn().mockResolvedValue(undefined);
      const firestore = {
        collection: jest.fn().mockImplementation((collectionName: string) => {
          if (collectionName !== 'marketData') {
            throw new Error(`Unexpected collection: ${collectionName}`);
          }

          return { doc: marketDataDoc };
        }),
        batch: jest.fn().mockReturnValue({ set: batchSet, commit: batchCommit }),
      } as unknown as FirebaseFirestore.Firestore;

      return { firestore, trackedTickersDoc, marketDataDoc, batchSet, batchCommit, pricesCollection, latestRef, historyDoc };
    };

    it('persists refreshed ticker prices and records failures', async () => {
      const { firestore, trackedTickersDoc, batchSet, batchCommit, pricesCollection, latestRef, historyDoc } = buildFirestore();

      trackedTickersDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ tickers: ['aapl', ' msft '] }),
      });

      const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as Pick<
        typeof functions.logger,
        'info' | 'warn' | 'error'
      >;
      const fieldValue = { serverTimestamp: jest.fn(() => 'timestamp') } as unknown as typeof admin.firestore.FieldValue;
      const quoteFetcher = jest
        .fn<Promise<ReturnType<typeof __private__.parseAlphaVantageQuote>>, [string]>()
        .mockImplementation(ticker => {
          if (ticker === 'AAPL') {
            return Promise.resolve({
              symbol: 'AAPL',
              price: 170,
              change: 1,
              changePercent: 0.5,
              timestamp: '2024-05-10T00:00:00.000Z',
              source: 'Alpha Vantage',
              fetchedAt: '2024-05-10T12:00:00.000Z',
            });
          }

          return Promise.reject(new Error('Boom'));
        });

      const delayFn = jest.fn().mockResolvedValue(undefined);
      const now = () => new Date('2024-05-11T15:30:00.000Z');

      const result = await __private__.runRefreshTrackedTickerPrices({ eventId: 'run-1' } as any, {
        firestore,
        logger,
        fieldValue,
        apiKey: 'test-key',
        quoteFetcher,
        delayFn,
        now,
      });

      expect(result).toBeNull();
      expect(quoteFetcher).toHaveBeenCalledTimes(2);
      expect(delayFn).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Failed to refresh ticker price', expect.objectContaining({ ticker: 'MSFT' }));
      expect(batchSet).toHaveBeenNthCalledWith(
        1,
        latestRef,
        {
          tickers: {
            AAPL: {
              symbol: 'AAPL',
              price: 170,
              change: 1,
              changePercent: 0.5,
              timestamp: '2024-05-10T00:00:00.000Z',
              source: 'Alpha Vantage',
              fetchedAt: '2024-05-10T12:00:00.000Z',
            },
          },
          generatedAt: 'timestamp',
          source: 'Alpha Vantage',
          totalTickers: 2,
          totalFailures: 1,
          failures: [{ ticker: 'MSFT', error: 'Boom' }],
          refreshedAt: '2024-05-11T15:30:00.000Z',
        },
        { merge: true }
      );
      expect(batchSet).toHaveBeenNthCalledWith(
        2,
        historyDoc,
        expect.objectContaining({
          date: '2024-05-11',
          totalFailures: 1,
        })
      );
      expect(batchCommit).toHaveBeenCalledTimes(1);
      expect(pricesCollection.doc).toHaveBeenCalledWith('2024-05-11');
    });

    it('logs when tracked tickers document is missing', async () => {
      const { firestore, trackedTickersDoc } = buildFirestore();
      trackedTickersDoc.get.mockResolvedValue({ exists: false });

      const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as Pick<
        typeof functions.logger,
        'info' | 'warn' | 'error'
      >;
      const fieldValue = { serverTimestamp: jest.fn(() => 'timestamp') } as unknown as typeof admin.firestore.FieldValue;

      const result = await __private__.runRefreshTrackedTickerPrices({ eventId: 'missing-doc' } as any, {
        firestore,
        logger,
        fieldValue,
        apiKey: 'test-key',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Tracked tickers document missing; skipping price refresh', {
        executionId: 'missing-doc',
      });
    });

    it('logs when API key is missing', async () => {
      const { firestore } = buildFirestore();
      const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as Pick<
        typeof functions.logger,
        'info' | 'warn' | 'error'
      >;
      const fieldValue = { serverTimestamp: jest.fn(() => 'timestamp') } as unknown as typeof admin.firestore.FieldValue;

      const result = await __private__.runRefreshTrackedTickerPrices({ eventId: 'no-key' } as any, {
        firestore,
        logger,
        fieldValue,
        apiKey: '',
      });

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Alpha Vantage API key missing; skipping price refresh', {
        executionId: 'no-key',
      });
    });
  });
});
