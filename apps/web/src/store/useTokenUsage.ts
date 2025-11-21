import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TokenUsage {
  id: string;
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // Cost in USD
  endpoint: string; // Which API endpoint was used
  thoughtId?: string; // Optional: link to specific thought
  userId?: string; // Optional: for multi-user scenarios
}

export interface TokenUsageInput {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  endpoint: string;
  thoughtId?: string;
  userId?: string;
}

export interface TokenUsageStats {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  tokensByModel: Record<string, number>;
  costByModel: Record<string, number>;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    cost: number;
    requests: number;
  }>;
}

type State = {
  tokenUsages: TokenUsage[];
  isLoading: boolean;
  addUsage: (usage: TokenUsageInput) => void;
  getStats: (days?: number) => TokenUsageStats;
  getUsageByModel: (model: string) => TokenUsage[];
  getUsageByDateRange: (startDate: string, endDate: string) => TokenUsage[];
  clearOldUsage: (daysToKeep: number) => void;
  exportUsage: () => string; // CSV export
};

// Pricing per 1K tokens (as of 2024)
const MODEL_PRICING = {
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
} as const;

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
  if (!pricing) {
    // Default pricing for unknown models
    return (promptTokens * 0.0005 + completionTokens * 0.0015) / 1000;
  }
  
  const inputCost = (promptTokens * pricing.input) / 1000;
  const outputCost = (completionTokens * pricing.output) / 1000;
  return inputCost + outputCost;
}

export const useTokenUsage = create<State>()(
  persist(
    (set, get) => ({
      tokenUsages: [],
      isLoading: false,

      addUsage: (usage) => {
        const cost = calculateCost(usage.model, usage.promptTokens, usage.completionTokens);
        const newUsage: TokenUsage = {
          ...usage,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          cost,
        };

        set((state) => ({
          tokenUsages: [newUsage, ...state.tokenUsages].slice(0, 10000), // Keep last 10k records
        }));
      },

      getStats: (days = 30) => {
        const { tokenUsages } = get();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const recentUsage = tokenUsages.filter(
          usage => new Date(usage.timestamp) >= cutoffDate
        );

        const totalTokens = recentUsage.reduce((sum, usage) => sum + usage.totalTokens, 0);
        const totalCost = recentUsage.reduce((sum, usage) => sum + usage.cost, 0);
        const totalRequests = recentUsage.length;
        const averageTokensPerRequest = totalRequests > 0 ? totalTokens / totalRequests : 0;
        const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

        // Group by model
        const tokensByModel: Record<string, number> = {};
        const costByModel: Record<string, number> = {};
        recentUsage.forEach(usage => {
          tokensByModel[usage.model] = (tokensByModel[usage.model] || 0) + usage.totalTokens;
          costByModel[usage.model] = (costByModel[usage.model] || 0) + usage.cost;
        });

        // Group by day
        const dailyUsage: Array<{ date: string; tokens: number; cost: number; requests: number }> = [];
        const dailyMap: Record<string, { tokens: number; cost: number; requests: number }> = {};
        
        recentUsage.forEach(usage => {
          const date = usage.timestamp.split('T')[0];
          if (!dailyMap[date]) {
            dailyMap[date] = { tokens: 0, cost: 0, requests: 0 };
          }
          dailyMap[date].tokens += usage.totalTokens;
          dailyMap[date].cost += usage.cost;
          dailyMap[date].requests += 1;
        });

        Object.entries(dailyMap).forEach(([date, data]) => {
          dailyUsage.push({ date, ...data });
        });

        dailyUsage.sort((a, b) => a.date.localeCompare(b.date));

        return {
          totalTokens,
          totalCost,
          totalRequests,
          averageTokensPerRequest,
          averageCostPerRequest,
          tokensByModel,
          costByModel,
          dailyUsage,
        };
      },

      getUsageByModel: (model) => {
        const { tokenUsages } = get();
        return tokenUsages.filter(usage => usage.model === model);
      },

      getUsageByDateRange: (startDate, endDate) => {
        const { tokenUsages } = get();
        return tokenUsages.filter(usage => {
          const usageDate = usage.timestamp.split('T')[0];
          return usageDate >= startDate && usageDate <= endDate;
        });
      },

      clearOldUsage: (daysToKeep) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        set((state) => ({
          tokenUsages: state.tokenUsages.filter(
            usage => new Date(usage.timestamp) >= cutoffDate
          ),
        }));
      },

      exportUsage: () => {
        const { tokenUsages } = get();
        const headers = ['Date', 'Model', 'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 'Cost (USD)', 'Endpoint', 'Thought ID'];
        const rows = tokenUsages.map(usage => [
          new Date(usage.timestamp).toLocaleDateString(),
          usage.model,
          usage.promptTokens.toString(),
          usage.completionTokens.toString(),
          usage.totalTokens.toString(),
          usage.cost.toFixed(6),
          usage.endpoint,
          usage.thoughtId || '',
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      },
    }),
    {
      name: 'token-usage-storage',
      version: 1,
    }
  )
);
