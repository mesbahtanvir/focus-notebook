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

export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const locale = currencyLocales[currency] || 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
