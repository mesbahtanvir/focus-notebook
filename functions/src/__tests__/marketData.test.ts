const firestoreMock = Object.assign(jest.fn(), {
  FieldValue: { serverTimestamp: jest.fn(() => 'timestamp') },
});

jest.mock('firebase-admin', () => ({
  firestore: firestoreMock,
}));

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
});
