import { create } from 'zustand';
import { createAt, deleteAt, updateAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';
import { collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import type { Unsubscribe } from 'firebase/firestore';
import {
  convertAmountsToCurrency,
  convertCurrency,
  convertCurrencySync,
  normalizeCurrencyCode,
} from '@/lib/services/currency';

export type InvestmentType = 'stocks' | 'bonds' | 'crypto' | 'real-estate' | 'retirement' | 'mutual-funds' | 'other';
export type AssetType = 'stock' | 'manual';
export type PortfolioStatus = 'active' | 'closed' | 'archived';
export type ContributionType = 'deposit' | 'withdrawal' | 'value-update';

export interface PricePoint {
  date: string;
  price: number;
  volume?: number;
  source?: 'api' | 'manual';
  currency?: string;
}

export interface Contribution {
  id: string;
  date: string;
  amount: number;
  type: ContributionType;
  note?: string;
  createdAt: string;
  currency?: string;
  amountInInvestmentCurrency?: number;
}

export interface Investment {
  id: string;
  portfolioId: string;
  name: string;
  type: InvestmentType;
  assetType: AssetType; // NEW: 'stock' or 'manual'
  ticker?: string; // NEW: Stock ticker symbol (e.g., "AAPL")
  quantity?: number; // NEW: Number of shares owned
  currentPricePerShare?: number; // NEW: Current price per share
  initialAmount: number;
  currentValue: number;
  priceHistory?: PricePoint[]; // NEW: Historical price data
  lastPriceUpdate?: string; // NEW: Last time price was updated
  contributions: Contribution[];
  notes?: string;
  createdAt: string;
  updatedAt?: number;
  currency: string;
}

export interface PortfolioSnapshot {
  id: string;
  date: string;
  totalValue: number;
  currency: string;
  investments: {
    id: string;
    value: number;
    ticker?: string;
    currency: string;
    sourceCurrency: string;
  }[];
  createdAt: string;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  status: PortfolioStatus;
  targetAmount?: number;
  targetDate?: string;
  investments: Investment[];
  createdAt: string;
  updatedAt?: number;
}

interface InvestmentsState {
  portfolios: Portfolio[];
  isLoading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  unsubscribe: Unsubscribe | null;
  currentUserId: string | null;

  // Portfolio methods
  subscribe: (userId: string) => void;
  addPortfolio: (portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt' | 'investments'>) => Promise<string>;
  updatePortfolio: (id: string, updates: Partial<Omit<Portfolio, 'id' | 'createdAt' | 'investments'>>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;

  // Investment methods
  addInvestment: (portfolioId: string, investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'portfolioId' | 'contributions'>) => Promise<string>;
  updateInvestment: (portfolioId: string, investmentId: string, updates: Partial<Omit<Investment, 'id' | 'createdAt' | 'portfolioId' | 'contributions'>>) => Promise<void>;
  deleteInvestment: (portfolioId: string, investmentId: string) => Promise<void>;

  // Contribution methods
  addContribution: (
    portfolioId: string,
    investmentId: string,
    contribution: Omit<Contribution, 'id' | 'createdAt' | 'amountInInvestmentCurrency'>
  ) => Promise<void>;
  deleteContribution: (portfolioId: string, investmentId: string, contributionId: string) => Promise<void>;

  // Stock price methods
  refreshInvestmentPrice: (portfolioId: string, investmentId: string) => Promise<void>;
  refreshAllPrices: (portfolioId: string) => Promise<void>;

  // Snapshot methods
  createSnapshot: (portfolioId: string) => Promise<void>;
  getSnapshots: (portfolioId: string) => PortfolioSnapshot[];

  // Utility methods
  getPortfolio: (id: string) => Portfolio | undefined;
  getInvestment: (portfolioId: string, investmentId: string) => Investment | undefined;
  getTotalPortfolioValue: (portfolioId: string) => number;
  getTotalInvested: (portfolioId: string) => number;
  getPortfolioROI: (portfolioId: string) => number;
  getAllPortfoliosValue: () => number;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => Promise<number>;
  getInvestmentValueInCurrency: (portfolioId: string, investmentId: string, targetCurrency: string) => Promise<number>;
  getTotalPortfolioValueInCurrency: (portfolioId: string, targetCurrency: string) => Promise<number>;
  getTotalInvestedInCurrency: (portfolioId: string, targetCurrency: string) => Promise<number>;
}

const BASE_CURRENCY = 'CAD';

export const useInvestments = create<InvestmentsState>((set, get) => ({
  portfolios: [],
  isLoading: false,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,
  currentUserId: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    if (!userId) {
      set({
        portfolios: [],
        isLoading: false,
        fromCache: false,
        hasPendingWrites: false,
        unsubscribe: null,
        currentUserId: null,
      });
      return;
    }

    set({ isLoading: true, currentUserId: userId });

    const portfoliosQuery = query(
      collection(db, `users/${userId}/portfolios`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = subscribeCol<Portfolio>(
      portfoliosQuery,
      (data, metadata) => {
        set({
          portfolios: data.map(portfolio => ({
            ...portfolio,
            investments: (portfolio.investments || []).map(investment => {
              const investmentCurrency = normalizeCurrencyCode(investment.currency);

              const contributions = (investment.contributions || []).map(contribution => {
                const contributionCurrency = normalizeCurrencyCode(
                  contribution.currency || investmentCurrency
                );
                const amountInInvestmentCurrency =
                  contribution.amountInInvestmentCurrency !== undefined
                    ? contribution.amountInInvestmentCurrency
                    : convertCurrencySync(
                        contribution.amount,
                        contributionCurrency,
                        investmentCurrency
                      );

                return {
                  ...contribution,
                  currency: contributionCurrency,
                  amountInInvestmentCurrency,
                };
              });

              const priceHistory = (investment.priceHistory || []).map(point => ({
                ...point,
                currency: point.currency || investmentCurrency,
              }));

              return {
                ...investment,
                currency: investmentCurrency,
                contributions,
                priceHistory,
              };
            })
          })),
          isLoading: false,
          fromCache: metadata.fromCache,
          hasPendingWrites: metadata.hasPendingWrites,
        });
      }
    );

    set({ unsubscribe, currentUserId: userId });
  },

  addPortfolio: async (portfolio) => {
    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newPortfolio: Portfolio = {
      ...portfolio,
      id,
      investments: [],
      createdAt: now,
    };

    await createAt(`users/${userId}/portfolios/${id}`, newPortfolio);
    return id;
  },

  updatePortfolio: async (id, updates) => {
    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    await updateAt(`users/${userId}/portfolios/${id}`, updates);
  },

  deletePortfolio: async (id) => {
    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    await deleteAt(`users/${userId}/portfolios/${id}`);
  },

  addInvestment: async (portfolioId, investment) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const investmentCurrency = normalizeCurrencyCode(investment.currency);
    const priceHistory = (investment.priceHistory || []).map(point => ({
      ...point,
      currency: point.currency || investmentCurrency,
    }));

    const newInvestment: Investment = {
      ...investment,
      id,
      portfolioId,
      contributions: [],
      createdAt: now,
      currency: investmentCurrency,
      priceHistory,
    };

    const updatedInvestments = [...portfolio.investments, newInvestment];
    await updateAt(`users/${userId}/portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });

    return id;
  },

  updateInvestment: async (portfolioId, investmentId, updates) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const updatedInvestments = portfolio.investments.map(inv => {
      if (inv.id !== investmentId) return inv;

      const updatedCurrency = updates.currency
        ? normalizeCurrencyCode(updates.currency)
        : inv.currency;

      const sanitizedPriceHistory = updates.priceHistory
        ? updates.priceHistory.map(point => ({
            ...point,
            currency: point.currency || updatedCurrency,
          }))
        : undefined;

      return {
        ...inv,
        ...updates,
        currency: updatedCurrency,
        priceHistory: sanitizedPriceHistory ?? inv.priceHistory,
        updatedAt: Date.now(),
      };
    });

    await updateAt(`users/${userId}/portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });
  },

  deleteInvestment: async (portfolioId, investmentId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const updatedInvestments = portfolio.investments.filter(inv => inv.id !== investmentId);
    await updateAt(`users/${userId}/portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });
  },

  addContribution: async (portfolioId, investmentId, contribution) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const investment = get().getInvestment(portfolioId, investmentId);
    if (!investment) throw new Error('Investment not found');

    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const investmentCurrency = normalizeCurrencyCode(investment.currency);
    const contributionCurrency = normalizeCurrencyCode(contribution.currency || investmentCurrency);
    const normalizedAmount =
      contributionCurrency === investmentCurrency
        ? contribution.amount
        : await convertCurrency(contribution.amount, contributionCurrency, investmentCurrency);

    const newContribution: Contribution = {
      ...contribution,
      id,
      createdAt: now,
      currency: contributionCurrency,
      amountInInvestmentCurrency: normalizedAmount,
    };

    const updatedContributions = [...investment.contributions, newContribution];

    // Update current value based on contribution type
    let newCurrentValue = investment.currentValue;
    if (contribution.type === 'deposit') {
      newCurrentValue += normalizedAmount;
    } else if (contribution.type === 'withdrawal') {
      newCurrentValue -= normalizedAmount;
    } else if (contribution.type === 'value-update') {
      newCurrentValue = normalizedAmount;
    }

    const updatedInvestments = portfolio.investments.map(inv =>
      inv.id === investmentId
        ? { ...inv, contributions: updatedContributions, currentValue: newCurrentValue, updatedAt: Date.now() }
        : inv
    );

    await updateAt(`users/${userId}/portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });
  },

  deleteContribution: async (portfolioId, investmentId, contributionId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const investment = get().getInvestment(portfolioId, investmentId);
    if (!investment) throw new Error('Investment not found');

    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const updatedContributions = investment.contributions.filter(c => c.id !== contributionId);

    const updatedInvestments = portfolio.investments.map(inv =>
      inv.id === investmentId
        ? { ...inv, contributions: updatedContributions, updatedAt: Date.now() }
        : inv
    );

    await updateAt(`users/${userId}/portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });
  },

  getPortfolio: (id) => {
    return get().portfolios.find(p => p.id === id);
  },

  getInvestment: (portfolioId, investmentId) => {
    const portfolio = get().getPortfolio(portfolioId);
    return portfolio?.investments.find(inv => inv.id === investmentId);
  },

  getTotalPortfolioValue: (portfolioId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) return 0;
    return portfolio.investments.reduce((sum, inv) => {
      const investmentCurrency = normalizeCurrencyCode(inv.currency);
      const convertedValue = convertCurrencySync(inv.currentValue, investmentCurrency, BASE_CURRENCY);
      return sum + convertedValue;
    }, 0);
  },

  getTotalInvested: (portfolioId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) return 0;
    return portfolio.investments.reduce((sum, inv) => {
      const investmentCurrency = normalizeCurrencyCode(inv.currency);
      const deposits = inv.contributions
        .filter(c => c.type === 'deposit')
        .reduce((s, c) => s + (c.amountInInvestmentCurrency ?? c.amount), 0);
      const withdrawals = inv.contributions
        .filter(c => c.type === 'withdrawal')
        .reduce((s, c) => s + (c.amountInInvestmentCurrency ?? c.amount), 0);
      const investedTotal = inv.initialAmount + deposits - withdrawals;
      return sum + convertCurrencySync(investedTotal, investmentCurrency, BASE_CURRENCY);
    }, 0);
  },

  getPortfolioROI: (portfolioId) => {
    const currentValue = get().getTotalPortfolioValue(portfolioId);
    const invested = get().getTotalInvested(portfolioId);
    if (invested === 0) return 0;
    return ((currentValue - invested) / invested) * 100;
  },

  getAllPortfoliosValue: () => {
    return get().portfolios.reduce((sum, portfolio) => {
      return sum + get().getTotalPortfolioValue(portfolio.id);
    }, 0);
  },

  convertAmount: async (amount, fromCurrency, toCurrency) => {
    return convertCurrency(amount, fromCurrency, toCurrency);
  },

  getInvestmentValueInCurrency: async (portfolioId, investmentId, targetCurrency) => {
    const investment = get().getInvestment(portfolioId, investmentId);
    if (!investment) return 0;
    return convertCurrency(investment.currentValue, investment.currency, targetCurrency);
  },

  getTotalPortfolioValueInCurrency: async (portfolioId, targetCurrency) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) return 0;

    const conversions = await convertAmountsToCurrency(
      portfolio.investments.map(inv => ({
        amount: inv.currentValue,
        currency: inv.currency,
      })),
      targetCurrency
    );

    return conversions.reduce((sum, value) => sum + value, 0);
  },

  getTotalInvestedInCurrency: async (portfolioId, targetCurrency) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) return 0;

    const investedAmounts = portfolio.investments.map(inv => {
      const deposits = inv.contributions
        .filter(c => c.type === 'deposit')
        .reduce((s, c) => s + (c.amountInInvestmentCurrency ?? c.amount), 0);
      const withdrawals = inv.contributions
        .filter(c => c.type === 'withdrawal')
        .reduce((s, c) => s + (c.amountInInvestmentCurrency ?? c.amount), 0);

      return {
        amount: inv.initialAmount + deposits - withdrawals,
        currency: inv.currency,
      };
    });

    const converted = await convertAmountsToCurrency(investedAmounts, targetCurrency);
    return converted.reduce((sum, value) => sum + value, 0);
  },

  refreshInvestmentPrice: async (portfolioId, investmentId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const investment = get().getInvestment(portfolioId, investmentId);
    if (!investment || !investment.ticker || investment.assetType !== 'stock') {
      throw new Error('Investment is not a stock or has no ticker');
    }

    try {
      // Import the stock API service
      const { fetchStockPrice } = await import('@/lib/services/stockApi');
      const quote = await fetchStockPrice(investment.ticker);

      const investmentCurrency = normalizeCurrencyCode(investment.currency);
      const convertedPrice =
        investmentCurrency === 'USD'
          ? quote.price
          : await convertCurrency(quote.price, 'USD', investmentCurrency);

      // Update investment with new price
      const newPricePoint: PricePoint = {
        date: new Date().toISOString(),
        price: convertedPrice,
        source: 'api',
        currency: investmentCurrency,
      };

      const updatedPriceHistory = [
        ...(investment.priceHistory || []),
        newPricePoint
      ].slice(-100); // Keep only last 100 price points

      const newCurrentValue = (investment.quantity || 0) * convertedPrice;

      await get().updateInvestment(portfolioId, investmentId, {
        currentPricePerShare: convertedPrice,
        currentValue: newCurrentValue,
        lastPriceUpdate: quote.timestamp,
        priceHistory: updatedPriceHistory,
      });
    } catch (error) {
      console.error('Failed to refresh investment price:', error);
      throw error;
    }
  },

  refreshAllPrices: async (portfolioId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const stockInvestments = portfolio.investments.filter(
      inv => inv.assetType === 'stock' && inv.ticker
    );

    if (stockInvestments.length === 0) {
      return; // No stocks to update
    }

    // Refresh prices sequentially to respect rate limits
    for (const investment of stockInvestments) {
      try {
        await get().refreshInvestmentPrice(portfolioId, investment.id);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to refresh price for ${investment.ticker}:`, error);
        // Continue with other investments even if one fails
      }
    }
  },

  createSnapshot: async (portfolioId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const today = new Date().toISOString().split('T')[0];
    const id = crypto.randomUUID();

    const targetCurrency = BASE_CURRENCY;
    const investmentsForConversion = portfolio.investments.map(inv => ({
      amount: inv.currentValue,
      currency: inv.currency,
    }));
    const convertedValues = await convertAmountsToCurrency(investmentsForConversion, targetCurrency);

    const snapshotInvestments = portfolio.investments.map((inv, index) => {
      const sourceCurrency = normalizeCurrencyCode(inv.currency);
      return {
        id: inv.id,
        value: convertedValues[index] ?? 0,
        ticker: inv.ticker,
        currency: targetCurrency,
        sourceCurrency,
      };
    });

    const totalValue = snapshotInvestments.reduce((sum, item) => sum + item.value, 0);

    const snapshot: PortfolioSnapshot = {
      id,
      date: today,
      totalValue,
      currency: targetCurrency,
      investments: snapshotInvestments,
      createdAt: new Date().toISOString(),
    };

    // Store snapshot in Firestore
    const userId = get().currentUserId ?? auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    await createAt(`users/${userId}/portfolios/${portfolioId}/snapshots/${id}`, snapshot);
  },

  getSnapshots: (portfolioId) => {
    // Note: Snapshots would need to be loaded separately via subscription
    // This is a placeholder that would be enhanced with actual snapshot loading
    // For now, we can calculate historical value from price history
    return [];
  },
}));
