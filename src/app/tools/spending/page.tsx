"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSpending } from "@/store/useSpending";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/store/useSettings";
import { parseCSV } from "@/lib/transactionParser";
import { ArrowLeft, Upload, TrendingUp, DollarSign, Calendar, PieChart, Link as LinkIcon } from "lucide-react";
import type { TransactionCategory } from "@/types/transactions";
import { useTrackToolUsage } from "@/hooks/useTrackToolUsage";
import { PlaidLinkButton } from "@/components/spending/PlaidLinkButton";

export default function SpendingPage() {
  useTrackToolUsage('spending');

  const { user } = useAuth();
  const router = useRouter();
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    accounts,
    transactions,
    insights,
    isLoading,
    subscribe,
    addAccount,
    addTransactions,
    saveInsight,
    getTotalSpentByMonth,
    getCategoryBreakdown,
  } = useSpending();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<any>(null);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  // Load insight for selected month
  useEffect(() => {
    const insight = insights.find(i => i.month === selectedMonth);
    setCurrentInsight(insight);
  }, [selectedMonth, insights]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const text = await file.text();

      // Parse CSV - expected format: Date, Description, Amount
      const mapping = {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        hasHeaders: true,
      };

      const parsedTransactions = parseCSV(text, mapping);

      // Create account if none exists
      let accountId = accounts[0]?.id;
      if (!accountId) {
        accountId = await addAccount({
          name: 'Default Account',
          accountType: 'checking',
          institution: 'Unknown',
          currency: 'USD',
        });
      }

      // Add transactions
      const transactionsToAdd = parsedTransactions.map(t => ({
        accountId,
        date: t.date,
        description: t.description,
        merchant: t.merchant || t.description,
        amount: Math.abs(t.amount),
        category: t.category as TransactionCategory,
        tags: [],
      }));

      await addTransactions(transactionsToAdd);

      alert(`Successfully imported ${parsedTransactions.length} transactions!`);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to parse CSV file. Please check the format.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAnalyze = async () => {
    if (!settings.openaiApiKey) {
      alert('Please configure your OpenAI API key in settings.');
      return;
    }

    setIsAnalyzing(true);

    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      const monthTransactions = transactions.filter(
        t => t.date >= startDate && t.date <= endDate
      );

      if (monthTransactions.length === 0) {
        alert('No transactions found for this month.');
        return;
      }

      const totalSpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      const categoryBreakdown = getCategoryBreakdown(startDate, endDate);

      // Format category breakdown
      const formattedBreakdown: Record<string, any> = {};
      Object.entries(categoryBreakdown).forEach(([cat, total]) => {
        const count = monthTransactions.filter(t => t.category === cat).length;
        formattedBreakdown[cat] = {
          total,
          count,
          percentage: (total / totalSpent) * 100,
        };
      });

      // Get top merchants
      const merchantTotals: Record<string, { total: number; count: number }> = {};
      monthTransactions.forEach(t => {
        if (!merchantTotals[t.merchant]) {
          merchantTotals[t.merchant] = { total: 0, count: 0 };
        }
        merchantTotals[t.merchant].total += t.amount;
        merchantTotals[t.merchant].count += 1;
      });

      const topMerchants = Object.entries(merchantTotals)
        .map(([merchant, data]) => ({ merchant, amount: data.total, count: data.count }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Call analysis API
      const response = await fetch('/api/analyze-spending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          totalSpent,
          transactionCount: monthTransactions.length,
          categoryBreakdown: formattedBreakdown,
          topMerchants,
          apiKey: settings.openaiApiKey,
          model: settings.aiModel || 'gpt-4o',
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(`Analysis failed: ${data.error}`);
        return;
      }

      // Save insight
      await saveInsight({
        month: selectedMonth,
        accountIds: accounts.map(a => a.id),
        totalSpent,
        categoryBreakdown,
        topMerchants,
        aiSummary: data.analysis,
      });

      // Refresh current insight
      setCurrentInsight({
        month: selectedMonth,
        totalSpent,
        categoryBreakdown,
        topMerchants,
        aiSummary: data.analysis,
      });
    } catch (error) {
      console.error('Error analyzing spending:', error);
      alert('Failed to analyze spending. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalSpent = getTotalSpentByMonth(selectedMonth);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              Track Your Spending
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Upload bank statements and get AI-powered insights
            </p>
          </div>
        </div>
      </div>

      {/* Month selector */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Month:
        </label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="input"
        />
      </div>

      {/* Upload section */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Transactions
        </h2>

        {/* Connect Bank Account */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Connect Bank Account
            </h3>
            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              Recommended
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Automatically import transactions from American Express, Chase, Bank of America, and 12,000+ banks.
            Secure OAuth connection powered by Plaid.
          </p>
          <PlaidLinkButton
            onSuccess={() => {
              alert('Bank account connected successfully! Transactions are being synced.');
            }}
            onError={(error) => {
              alert(`Failed to connect bank: ${error.message}`);
            }}
            className="btn btn-primary flex items-center gap-2"
          />
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or upload CSV</span>
          </div>
        </div>

        {/* CSV Upload */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Upload Bank Statement
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Upload a CSV file from your bank or credit card statement.
            Expected format: Date, Description, Amount
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          {isUploading && <p className="text-sm text-gray-600 mt-2">Uploading...</p>}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</span>
          </div>
          <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</span>
          </div>
          <div className="text-2xl font-bold">
            {transactions.filter(t => t.date.startsWith(selectedMonth)).length}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Accounts</span>
          </div>
          <div className="text-2xl font-bold">{accounts.length}</div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">AI Insights</h2>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || transactions.length === 0}
            className="btn btn-primary flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Spending'}
          </button>
        </div>

        {currentInsight?.aiSummary ? (
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {currentInsight.aiSummary}
            </div>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Upload transactions and click &ldquo;Analyze Spending&rdquo; to get AI-powered insights.
          </p>
        )}
      </div>

      {/* Transactions list */}
      {transactions.filter(t => t.date.startsWith(selectedMonth)).length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
          <div className="space-y-2">
            {transactions
              .filter(t => t.date.startsWith(selectedMonth))
              .slice(0, 10)
              .map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium">{t.merchant}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t.date} &bull; {t.category}</div>
                  </div>
                  <div className="text-lg font-semibold">${t.amount.toFixed(2)}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
