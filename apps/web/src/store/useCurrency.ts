import { create } from 'zustand';
import { DEFAULT_DISPLAY_CURRENCY, SupportedCurrency } from '@/lib/utils/currency';

interface CurrencyState {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
}

export const useCurrency = create<CurrencyState>((set) => ({
  currency: DEFAULT_DISPLAY_CURRENCY,
  setCurrency: (currency) => set({ currency }),
}));
