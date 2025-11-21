/**
 * Tests for currency service utilities
 */

import {
  getSupportedCurrencies,
  isSupportedCurrency,
  normalizeCurrencyCode,
  getFxRates,
  getCachedFxRates,
  convertCurrency,
  convertCurrencySync,
  formatCurrency,
  convertAmountsToCurrency,
} from '@/lib/services/currency';

// Mock fetch globally
global.fetch = jest.fn();

describe('currency utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module state by clearing any cached rates
    jest.resetModules();
  });

  describe('getSupportedCurrencies', () => {
    it('should return array of supported currencies', () => {
      const currencies = getSupportedCurrencies();
      expect(currencies).toContain('USD');
      expect(currencies).toContain('CAD');
      expect(currencies).toContain('BDT');
      expect(currencies).toContain('COP');
      expect(currencies).toHaveLength(4);
    });

    it('should return a copy of the array', () => {
      const currencies1 = getSupportedCurrencies();
      const currencies2 = getSupportedCurrencies();
      expect(currencies1).not.toBe(currencies2);
      expect(currencies1).toEqual(currencies2);
    });
  });

  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isSupportedCurrency('USD')).toBe(true);
      expect(isSupportedCurrency('CAD')).toBe(true);
      expect(isSupportedCurrency('BDT')).toBe(true);
      expect(isSupportedCurrency('COP')).toBe(true);
    });

    it('should return true for lowercase supported currencies', () => {
      expect(isSupportedCurrency('usd')).toBe(true);
      expect(isSupportedCurrency('cad')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isSupportedCurrency('EUR')).toBe(false);
      expect(isSupportedCurrency('GBP')).toBe(false);
      expect(isSupportedCurrency('JPY')).toBe(false);
      expect(isSupportedCurrency('')).toBe(false);
    });
  });

  describe('normalizeCurrencyCode', () => {
    it('should return uppercase currency code for supported currencies', () => {
      expect(normalizeCurrencyCode('usd')).toBe('USD');
      expect(normalizeCurrencyCode('cad')).toBe('CAD');
      expect(normalizeCurrencyCode('USD')).toBe('USD');
    });

    it('should return CAD for unsupported currencies', () => {
      expect(normalizeCurrencyCode('EUR')).toBe('CAD');
      expect(normalizeCurrencyCode('GBP')).toBe('CAD');
      expect(normalizeCurrencyCode('invalid')).toBe('CAD');
    });

    it('should return CAD for undefined or empty input', () => {
      expect(normalizeCurrencyCode(undefined)).toBe('CAD');
      expect(normalizeCurrencyCode('')).toBe('CAD');
    });
  });

  describe('getFxRates', () => {
    it('should fetch rates from API successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            USD: 0.71,
            CAD: 1,
            BDT: 87.5,
            COP: 2800,
          },
        }),
      });

      const rates = await getFxRates();
      expect(rates).toHaveProperty('USD');
      expect(rates).toHaveProperty('CAD');
      expect(rates).toHaveProperty('BDT');
      expect(rates).toHaveProperty('COP');
      expect(rates.CAD).toBe(1);
    });

    it('should use cached rates for same day', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            USD: 0.71,
            CAD: 1,
            BDT: 87,
            COP: 2758,
          },
        }),
      });

      // First call
      await getFxRates();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call on same day should use cache
      await getFxRates();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fallback to static rates on API failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const rates = await getFxRates();

      expect(rates).toHaveProperty('USD');
      expect(rates).toHaveProperty('CAD');
      expect(rates.CAD).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle API response without rates', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const rates = await getFxRates();

      expect(rates).toHaveProperty('USD');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const rates = await getFxRates();

      expect(rates).toHaveProperty('USD');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getCachedFxRates', () => {
    it('should return fallback rates when no cache', () => {
      const rates = getCachedFxRates();
      expect(rates).toHaveProperty('USD');
      expect(rates).toHaveProperty('CAD');
      expect(rates.CAD).toBe(1);
    });

    it('should return cached rates after getFxRates', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            USD: 0.75,
            CAD: 1,
            BDT: 90,
            COP: 2900,
          },
        }),
      });

      await getFxRates();
      const cachedRates = getCachedFxRates();
      expect(cachedRates.USD).toBe(0.75);
    });
  });

  describe('convertCurrency', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          rates: {
            USD: 0.71,
            CAD: 1,
            BDT: 87,
            COP: 2758,
          },
        }),
      });
    });

    it('should convert between different currencies', async () => {
      const result = await convertCurrency(100, 'CAD', 'USD');
      expect(result).toBeCloseTo(71, 1);
    });

    it('should return same amount for same currency', async () => {
      const result = await convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should handle non-finite amounts', async () => {
      expect(await convertCurrency(NaN, 'USD', 'CAD')).toBe(0);
      expect(await convertCurrency(Infinity, 'USD', 'CAD')).toBe(0);
      expect(await convertCurrency(-Infinity, 'USD', 'CAD')).toBe(0);
    });

    it('should normalize currency codes', async () => {
      const result = await convertCurrency(100, 'usd', 'cad');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('convertCurrencySync', () => {
    it('should convert using cached rates', () => {
      const result = convertCurrencySync(100, 'CAD', 'USD');
      expect(result).toBeGreaterThan(0);
    });

    it('should return same amount for same currency', () => {
      const result = convertCurrencySync(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should handle non-finite amounts', () => {
      expect(convertCurrencySync(NaN, 'USD', 'CAD')).toBe(0);
      expect(convertCurrencySync(Infinity, 'USD', 'CAD')).toBe(0);
    });

    it('should normalize currency codes', () => {
      const result = convertCurrencySync(100, 'usd', 'cad');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with default options', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('should format CAD by default', () => {
      const result = formatCurrency(100);
      expect(result).toContain('100.00');
      expect(result).toContain('$');
    });

    it('should handle different currencies', () => {
      const usd = formatCurrency(100, 'USD');
      const cad = formatCurrency(100, 'CAD');
      expect(usd).toContain('100.00');
      expect(cad).toContain('100.00');
    });

    it('should fallback to CAD for unsupported currencies', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = formatCurrency(100, 'INVALID');
      expect(result).toContain('100.00');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should apply custom formatting options', () => {
      const result = formatCurrency(1234.567, 'USD', { maximumFractionDigits: 0 });
      expect(result).toContain('1,235');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-100, 'USD');
      expect(result).toContain('100.00');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0, 'USD');
      expect(result).toContain('0.00');
    });
  });

  describe('convertAmountsToCurrency', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          rates: {
            USD: 0.71,
            CAD: 1,
            BDT: 87,
            COP: 2758,
          },
        }),
      });
    });

    it('should convert multiple amounts to target currency', async () => {
      const amounts = [
        { amount: 100, currency: 'CAD' },
        { amount: 100, currency: 'USD' },
      ];

      const results = await convertAmountsToCurrency(amounts, 'CAD');
      expect(results).toHaveLength(2);
      expect(results[0]).toBe(100); // CAD to CAD
      expect(results[1]).toBeGreaterThan(100); // USD to CAD
    });

    it('should handle empty array', async () => {
      const results = await convertAmountsToCurrency([], 'USD');
      expect(results).toHaveLength(0);
    });

    it('should normalize currency codes', async () => {
      const amounts = [
        { amount: 100, currency: 'usd' },
        { amount: 50, currency: 'cad' },
      ];

      const results = await convertAmountsToCurrency(amounts, 'usd');
      expect(results).toHaveLength(2);
      expect(results[0]).toBe(100); // USD to USD
    });

    it('should handle unsupported currencies', async () => {
      const amounts = [
        { amount: 100, currency: 'INVALID' },
      ];

      const results = await convertAmountsToCurrency(amounts, 'USD');
      expect(results).toHaveLength(1);
      expect(results[0]).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          rates: { USD: 0.71, CAD: 1, BDT: 87, COP: 2758 },
        }),
      });

      const result = await convertCurrency(1e10, 'CAD', 'USD');
      expect(result).toBeGreaterThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should handle very small numbers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          rates: { USD: 0.71, CAD: 1, BDT: 87, COP: 2758 },
        }),
      });

      const result = await convertCurrency(0.01, 'CAD', 'USD');
      expect(result).toBeGreaterThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should handle negative amounts in conversion', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          rates: { USD: 0.71, CAD: 1, BDT: 87, COP: 2758 },
        }),
      });

      const result = await convertCurrency(-100, 'CAD', 'USD');
      expect(result).toBeLessThan(0);
    });
  });
});
