export { normalizeCurrencyCode, SUPPORTED_CURRENCIES } from '@/lib/services/currency';
export type { SupportedCurrency } from '@/lib/services/currency';
import { convertCurrencySync, SupportedCurrency } from '@/lib/services/currency';

export const DEFAULT_DISPLAY_CURRENCY: SupportedCurrency = 'CAD';
export const BASE_CURRENCY: SupportedCurrency = 'USD';

const currencyLocales: Record<SupportedCurrency, string> = {
  USD: 'en-US',
  CAD: 'en-CA',
  BDT: 'bn-BD',
  COP: 'es-CO',
};

export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency
): number {
  return convertCurrencySync(amount, from, to);
}

export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  const effectiveLocale = locale || currencyLocales[currency] || 'en-US';

  const formatterOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  };

  try {
    return new Intl.NumberFormat(effectiveLocale, formatterOptions).format(amount);
  } catch (error) {
    // Fallback for unsupported currency codes/locales
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatCurrencyCompact(
  amount: number,
  currency: SupportedCurrency = 'USD'
): string {
  const locale = currencyLocales[currency] || 'en-US';

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
