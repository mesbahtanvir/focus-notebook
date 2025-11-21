/**
 * Currency utilities - Re-exports from services/currency
 * This file serves as a convenience re-export layer for currency operations.
 * All main functionality is implemented in @/lib/services/currency.
 */

export {
  normalizeCurrencyCode,
  SUPPORTED_CURRENCIES,
  getSupportedCurrencies,
  isSupportedCurrency,
  getFxRates,
  getCachedFxRates,
  convertCurrency,
  convertCurrencySync,
  formatCurrency,
  convertAmountsToCurrency,
} from '@/lib/services/currency';

export type { SupportedCurrency } from '@/lib/services/currency';

export const DEFAULT_DISPLAY_CURRENCY = 'CAD' as const;
export const BASE_CURRENCY = 'USD' as const;

export const CURRENCY_LOCALES = {
  USD: 'en-US',
  CAD: 'en-CA',
  BDT: 'bn-BD',
  COP: 'es-CO',
} as const;

/**
 * Format currency in compact notation (e.g., $1.2K, $3.4M)
 */
export function formatCurrencyCompact(
  amount: number,
  currency: string = 'USD'
): string {
  const locale = CURRENCY_LOCALES[currency as keyof typeof CURRENCY_LOCALES] || 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount.toFixed(1)}`;
  }
}
