export type SupportedCurrency = 'CAD' | 'BDT' | 'SGD' | 'USD' | 'COP';

export const DEFAULT_DISPLAY_CURRENCY: SupportedCurrency = 'CAD';
export const BASE_CURRENCY: SupportedCurrency = 'USD';

const USD_PER_CURRENCY: Record<SupportedCurrency, number> = {
  USD: 1,
  CAD: 0.74,
  SGD: 0.74,
  BDT: 0.0092,
  COP: 0.00025,
};

const currencyLocales: Record<SupportedCurrency, string> = {
  USD: 'en-US',
  CAD: 'en-CA',
  SGD: 'en-SG',
  BDT: 'bn-BD',
  COP: 'es-CO',
};

export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency
): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  if (from === to) {
    return amount;
  }

  const fromRate = USD_PER_CURRENCY[from];
  const toRate = USD_PER_CURRENCY[to];

  if (!fromRate || !toRate) {
    return amount;
  }

  const amountInUsd = amount * fromRate;
  return amountInUsd / toRate;
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
