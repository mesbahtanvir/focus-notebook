export type SupportedCurrency = 'USD' | 'CAD' | 'BDT' | 'COP';

export const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'BDT', 'COP'] as const satisfies readonly SupportedCurrency[];

const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  USD: 0.71,
  CAD: 1,
  BDT: 87,
  COP: 2758,
};

interface CachedRates {
  date: string;
  rates: Record<SupportedCurrency, number>;
}

let cachedRates: CachedRates | null = null;

const FX_API_URL = 'https://api.exchangerate.host/latest';

export function getSupportedCurrencies(): SupportedCurrency[] {
  return [...SUPPORTED_CURRENCIES];
}

export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase() as SupportedCurrency);
}

export function normalizeCurrencyCode(currency?: string): SupportedCurrency {
  const normalized = (currency || 'CAD').toUpperCase();
  return isSupportedCurrency(normalized) ? normalized : 'CAD';
}

async function fetchRatesFromApi(): Promise<Record<SupportedCurrency, number>> {
  const symbols = SUPPORTED_CURRENCIES.join(',');
  const url = `${FX_API_URL}?base=CAD&symbols=${symbols}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch currency rates');
  }

  const data = await response.json();
  if (!data?.rates) {
    throw new Error('Unexpected response from currency service');
  }

  const rates: Record<SupportedCurrency, number> = { ...FALLBACK_RATES };
  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === 'CAD') {
      rates[currency] = 1;
    } else if (data.rates[currency] && typeof data.rates[currency] === 'number') {
      rates[currency] = data.rates[currency];
    }
  }

  return rates;
}

export async function getFxRates(): Promise<Record<SupportedCurrency, number>> {
  const today = new Date().toISOString().split('T')[0];
  if (cachedRates && cachedRates.date === today) {
    return cachedRates.rates;
  }

  try {
    const rates = await fetchRatesFromApi();
    cachedRates = { date: today, rates };
    return rates;
  } catch (error) {
    console.error('Failed to fetch FX rates. Falling back to static table.', error);
    cachedRates = { date: today, rates: FALLBACK_RATES };
    return FALLBACK_RATES;
  }
}

export function getCachedFxRates(): Record<SupportedCurrency, number> {
  if (cachedRates) {
    return cachedRates.rates;
  }
  return FALLBACK_RATES;
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  if (from === to) {
    return amount;
  }

  const rates = await getFxRates();
  return convertUsingRates(amount, from, to, rates);
}

export function convertCurrencySync(amount: number, fromCurrency: string, toCurrency: string): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  if (from === to) {
    return amount;
  }

  const rates = getCachedFxRates();
  return convertUsingRates(amount, from, to, rates);
}

function convertUsingRates(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  rates: Record<SupportedCurrency, number>
): number {
  if (from === to) return amount;

  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    return amount;
  }

  // Convert to base CAD first then to target
  const amountInCad = from === 'CAD' ? amount : amount / fromRate;
  return to === 'CAD' ? amountInCad : amountInCad * toRate;
}

export function formatCurrency(
  amount: number,
  currency: string = 'CAD',
  options: Intl.NumberFormatOptions = {}
): string {
  const normalizedCurrency = (currency || 'CAD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch (error) {
    console.warn(`Unsupported currency "${currency}". Falling back to CAD.`, error);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  }
}

export async function convertAmountsToCurrency(
  amounts: Array<{ amount: number; currency: string }>,
  targetCurrency: string
): Promise<number[]> {
  const target = normalizeCurrencyCode(targetCurrency);
  const rates = await getFxRates();

  return amounts.map(({ amount, currency }) => {
    const from = normalizeCurrencyCode(currency);
    return convertUsingRates(amount, from, target, rates);
  });
}
