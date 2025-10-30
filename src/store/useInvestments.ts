import { create } from 'zustand';
import { createAt, deleteAt, updateAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { Unsubscribe } from 'firebase/firestore';

export type InvestmentType = 'stocks' | 'bonds' | 'crypto' | 'real-estate' | 'retirement' | 'mutual-funds' | 'other';
export type PortfolioStatus = 'active' | 'closed' | 'archived';
export type ContributionType = 'deposit' | 'withdrawal' | 'value-update';

export interface Contribution {
  id: string;
  date: string;
  amount: number;
  type: ContributionType;
  note?: string;
  createdAt: string;
}

export interface Investment {
  id: string;
  portfolioId: string;
  name: string;
  type: InvestmentType;
  initialAmount: number;
  currentValue: number;
  contributions: Contribution[];
  notes?: string;
  createdAt: string;
  updatedAt?: number;
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
  addContribution: (portfolioId: string, investmentId: string, contribution: Omit<Contribution, 'id' | 'createdAt'>) => Promise<void>;
  deleteContribution: (portfolioId: string, investmentId: string, contributionId: string) => Promise<void>;

  // Utility methods
  getPortfolio: (id: string) => Portfolio | undefined;
  getInvestment: (portfolioId: string, investmentId: string) => Investment | undefined;
  getTotalPortfolioValue: (portfolioId: string) => number;
  getTotalInvested: (portfolioId: string) => number;
  getPortfolioROI: (portfolioId: string) => number;
  getAllPortfoliosValue: () => number;
}

export const useInvestments = create<InvestmentsState>((set, get) => ({
  portfolios: [],
  isLoading: false,
  fromCache: false,
  hasPendingWrites: false,
  unsubscribe: null,

  subscribe: (userId: string) => {
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    set({ isLoading: true });

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
            investments: portfolio.investments || []
          })),
          isLoading: false,
          fromCache: metadata.fromCache,
          hasPendingWrites: metadata.hasPendingWrites,
        });
      }
    );

    set({ unsubscribe });
  },

  addPortfolio: async (portfolio) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newPortfolio: Portfolio = {
      ...portfolio,
      id,
      investments: [],
      createdAt: now,
    };

    await createAt(`portfolios/${id}`, newPortfolio);
    return id;
  },

  updatePortfolio: async (id, updates) => {
    await updateAt(`portfolios/${id}`, updates);
  },

  deletePortfolio: async (id) => {
    await deleteAt(`portfolios/${id}`);
  },

  addInvestment: async (portfolioId, investment) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newInvestment: Investment = {
      ...investment,
      id,
      portfolioId,
      contributions: [],
      createdAt: now,
    };

    const updatedInvestments = [...portfolio.investments, newInvestment];
    await updateAt(`portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });

    return id;
  },

  updateInvestment: async (portfolioId, investmentId, updates) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const updatedInvestments = portfolio.investments.map(inv =>
      inv.id === investmentId ? { ...inv, ...updates, updatedAt: Date.now() } : inv
    );

    await updateAt(`portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });
  },

  deleteInvestment: async (portfolioId, investmentId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const updatedInvestments = portfolio.investments.filter(inv => inv.id !== investmentId);
    await updateAt(`portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });
  },

  addContribution: async (portfolioId, investmentId, contribution) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const investment = get().getInvestment(portfolioId, investmentId);
    if (!investment) throw new Error('Investment not found');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newContribution: Contribution = {
      ...contribution,
      id,
      createdAt: now,
    };

    const updatedContributions = [...investment.contributions, newContribution];

    // Update current value based on contribution type
    let newCurrentValue = investment.currentValue;
    if (contribution.type === 'deposit') {
      newCurrentValue += contribution.amount;
    } else if (contribution.type === 'withdrawal') {
      newCurrentValue -= contribution.amount;
    } else if (contribution.type === 'value-update') {
      newCurrentValue = contribution.amount;
    }

    const updatedInvestments = portfolio.investments.map(inv =>
      inv.id === investmentId
        ? { ...inv, contributions: updatedContributions, currentValue: newCurrentValue, updatedAt: Date.now() }
        : inv
    );

    await updateAt(`portfolios/${portfolioId}`, {
      investments: updatedInvestments,
    });
  },

  deleteContribution: async (portfolioId, investmentId, contributionId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    const investment = get().getInvestment(portfolioId, investmentId);
    if (!investment) throw new Error('Investment not found');

    const updatedContributions = investment.contributions.filter(c => c.id !== contributionId);

    const updatedInvestments = portfolio.investments.map(inv =>
      inv.id === investmentId
        ? { ...inv, contributions: updatedContributions, updatedAt: Date.now() }
        : inv
    );

    await updateAt(`portfolios/${portfolioId}`, {
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
    return portfolio.investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  },

  getTotalInvested: (portfolioId) => {
    const portfolio = get().getPortfolio(portfolioId);
    if (!portfolio) return 0;
    return portfolio.investments.reduce((sum, inv) => {
      const deposits = inv.contributions
        .filter(c => c.type === 'deposit')
        .reduce((s, c) => s + c.amount, 0);
      const withdrawals = inv.contributions
        .filter(c => c.type === 'withdrawal')
        .reduce((s, c) => s + c.amount, 0);
      return sum + inv.initialAmount + deposits - withdrawals;
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
}));
