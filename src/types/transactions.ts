/**
 * Types for Credit Card Transaction Parser Tool
 */

export type TransactionCategory =
  | 'groceries'
  | 'dining'
  | 'transportation'
  | 'entertainment'
  | 'shopping'
  | 'utilities'
  | 'health'
  | 'travel'
  | 'subscriptions'
  | 'other';

export interface Transaction {
  id: string;
  date: string; // ISO date string
  description: string;
  amount: number; // Positive for spending, negative for refunds
  category?: TransactionCategory;
  merchant?: string;
  notes?: string;
  createdAt: string;
  parsedFrom?: 'csv' | 'manual' | 'paste';
}

export interface TransactionAnalysis {
  totalSpending: number;
  totalRefunds: number;
  netSpending: number;
  transactionCount: number;
  averageTransaction: number;
  categoryBreakdown: Record<TransactionCategory, {
    total: number;
    count: number;
    percentage: number;
  }>;
  topMerchants: Array<{
    merchant: string;
    total: number;
    count: number;
  }>;
  dailySpending: Record<string, number>; // date -> amount
  weeklyTrend: Array<{
    week: string;
    total: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    total: number;
  }>;
}

export interface CSVMapping {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  hasHeaders: boolean;
  dateFormat?: string;
}
