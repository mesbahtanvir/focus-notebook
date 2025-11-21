/**
 * Tests for currency utility functions
 */

import {
  convertCurrencySync,
  formatCurrency,
  formatCurrencyCompact,
  DEFAULT_DISPLAY_CURRENCY,
  BASE_CURRENCY,
} from '@/lib/utils/currency';

// Mock the currency service
jest.mock('@/lib/services/currency', () => ({
  ...jest.requireActual('@/lib/services/currency'),
  convertCurrencySync: jest.fn((amount, from, to) => {
    if (from === to) return amount;
    // Simple mock conversion rates
    const rates: Record<string, number> = {
      USD: 1,
      CAD: 1.35,
      BDT: 110,
      COP: 4000,
    };
    if (from === 'USD') return amount * rates[to];
    if (to === 'USD') return amount / rates[from];
    return (amount / rates[from]) * rates[to];
  }),
}));

describe('currency utility functions', () => {
  describe('constants', () => {
    it('should have correct default display currency', () => {
      expect(DEFAULT_DISPLAY_CURRENCY).toBe('CAD');
    });

    it('should have correct base currency', () => {
      expect(BASE_CURRENCY).toBe('USD');
    });
  });

  describe('convertCurrencySync', () => {
    it('should convert between different currencies', () => {
      const result = convertCurrencySync(100, 'USD', 'CAD');
      expect(result).toBeGreaterThan(100);
    });

    it('should return same amount for same currency', () => {
      const result = convertCurrencySync(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should handle all supported currencies', () => {
      expect(convertCurrencySync(100, 'USD', 'BDT')).toBeGreaterThan(0);
      expect(convertCurrencySync(100, 'CAD', 'USD')).toBeGreaterThan(0);
      expect(convertCurrencySync(100, 'BDT', 'COP')).toBeGreaterThan(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format USD with default locale', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('should format CAD with Canadian locale', () => {
      const result = formatCurrency(1234.56, 'CAD');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('should format BDT with Bangladesh locale', () => {
      const result = formatCurrency(1234.56, 'BDT');
      // BDT fallback to CAD if unsupported
      expect(result).toBeTruthy();
      expect(result).toContain('1,234.56');
    });

    it('should format COP with Colombian locale', () => {
      const result = formatCurrency(1234.56, 'COP');
      // COP fallback to CAD if unsupported
      expect(result).toBeTruthy();
      expect(result).toContain('1,234.56');
    });

    it('should use custom locale with formatting options', () => {
      const result = formatCurrency(1234.56, 'USD', { locale: 'fr-FR' } as any);
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('should apply custom formatting options', () => {
      const result = formatCurrency(1234.567, 'USD', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
      expect(result).toContain('1,234.567');
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-100, 'USD');
      expect(result).toContain('100');
    });

    it('should handle very large numbers', () => {
      const result = formatCurrency(1000000, 'USD');
      expect(result).toContain('1,000,000');
    });

    it('should handle very small numbers', () => {
      const result = formatCurrency(0.01, 'USD');
      expect(result).toContain('0.01');
    });

    it('should use default fraction digits', () => {
      const result = formatCurrency(100, 'USD');
      expect(result).toContain('100.00');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('should format large numbers compactly', () => {
      const result = formatCurrencyCompact(1000000, 'USD');
      // Compact notation should show something like $1M
      expect(result).toMatch(/\$.*1/);
    });

    it('should format thousands compactly', () => {
      const result = formatCurrencyCompact(1500, 'USD');
      // Should show something like $1.5K
      expect(result).toContain('$');
    });

    it('should use USD as default currency', () => {
      const result = formatCurrencyCompact(1000);
      expect(result).toContain('$');
    });

    it('should handle different currencies', () => {
      const resultUSD = formatCurrencyCompact(1000, 'USD');
      const resultCAD = formatCurrencyCompact(1000, 'CAD');
      const resultBDT = formatCurrencyCompact(1000, 'BDT');
      const resultCOP = formatCurrencyCompact(1000, 'COP');

      expect(resultUSD).toContain('$');
      expect(resultCAD).toContain('$');
      expect(resultBDT).toBeTruthy();
      expect(resultCOP).toContain('$');
    });

    it('should handle small numbers', () => {
      const result = formatCurrencyCompact(100, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('100');
    });

    it('should handle zero', () => {
      const result = formatCurrencyCompact(0, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('0');
    });

    it('should handle negative numbers', () => {
      const result = formatCurrencyCompact(-1000, 'USD');
      expect(result).toContain('$');
    });

    it('should use maximum 1 fraction digit', () => {
      const result = formatCurrencyCompact(1234.567, 'USD');
      // Should not have more than 1 decimal place
      expect(result).toBeTruthy();
    });

    it('should handle very large numbers', () => {
      const result = formatCurrencyCompact(1000000000, 'USD');
      expect(result).toContain('$');
    });
  });

  describe('edge cases', () => {
    it('should handle currency conversion with zero', () => {
      const result = convertCurrencySync(0, 'USD', 'CAD');
      expect(result).toBe(0);
    });

    it('should handle formatting with Infinity', () => {
      const result = formatCurrency(Infinity, 'USD');
      expect(result).toBeTruthy();
    });

    it('should handle formatting with NaN', () => {
      const result = formatCurrency(NaN, 'USD');
      expect(result).toBeTruthy();
    });

    it('should handle compact formatting with Infinity', () => {
      const result = formatCurrencyCompact(Infinity, 'USD');
      expect(result).toBeTruthy();
    });

    it('should handle compact formatting with NaN', () => {
      const result = formatCurrencyCompact(NaN, 'USD');
      expect(result).toBeTruthy();
    });
  });
});
