/**
 * Monthly Rollup Service
 * Aggregates transactions into monthly summaries for analytics
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();

// ============================================================================
// Build Monthly Rollup
// ============================================================================

export interface MonthlyRollupData {
  uid: string;
  month: string; // YYYY-MM
  totalsByCategory: Record<string, number>;
  categoryBreakdown: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  topMerchants: Array<{
    merchant: string;
    total: number;
    count: number;
  }>;
  cashflow: {
    inflow: number;
    outflow: number;
    net: number;
  };
  anomalies: Array<{
    category: string;
    deltaPct: number;
    explanation?: string;
  }>;
  transactionCount: number;
  builtAt: number;
}

export async function buildMonthlyRollup(
  uid: string,
  month: string // YYYY-MM
): Promise<MonthlyRollupData> {
  // Get all transactions for the month
  const startDate = `${month}-01`;
  const endDate = getMonthEndDate(month);

  const txnsSnapshot = await db
    .collection('transactions')
    .where('uid', '==', uid)
    .where('postedAt', '>=', startDate)
    .where('postedAt', '<=', endDate)
    .where('pending', '==', false)
    .get();

  const transactions = txnsSnapshot.docs.map(doc => doc.data());

  // Check if user is premium
  const userDoc = await db.collection('users').doc(uid).get();
  const isPremium = userDoc.data()?.plan === 'premium';

  // Initialize aggregations
  const categoryTotals: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const merchantTotals: Record<string, { total: number; count: number }> = {};
  let totalInflow = 0;
  let totalOutflow = 0;

  // Process transactions
  for (const txn of transactions) {
    const amount = Math.abs(txn.amount);
    const isIncome = txn.amount < 0; // Plaid: negative = credit/income

    // Category aggregation (use premium if available, else base)
    const category = isPremium && txn.category_premium?.[0]
      ? txn.category_premium[0]
      : txn.category_base?.[0] || 'Other';

    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    // Merchant aggregation
    const merchant = txn.merchant?.normalized || txn.merchant?.name || 'Unknown';
    if (!merchantTotals[merchant]) {
      merchantTotals[merchant] = { total: 0, count: 0 };
    }
    merchantTotals[merchant].total += amount;
    merchantTotals[merchant].count += 1;

    // Cashflow
    if (isIncome) {
      totalInflow += amount;
    } else {
      totalOutflow += amount;
    }
  }

  // Calculate category breakdown with percentages
  const totalSpending = totalOutflow;
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([category, total]) => ({
      category,
      total,
      count: categoryCounts[category],
      percentage: totalSpending > 0 ? (total / totalSpending) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Top merchants
  const topMerchants = Object.entries(merchantTotals)
    .map(([merchant, data]) => ({
      merchant,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Detect anomalies (categories with >30% change vs previous month)
  const anomalies = await detectAnomalies(uid, month, categoryTotals);

  const rollup: MonthlyRollupData = {
    uid,
    month,
    totalsByCategory: categoryTotals,
    categoryBreakdown,
    topMerchants,
    cashflow: {
      inflow: totalInflow,
      outflow: totalOutflow,
      net: totalInflow - totalOutflow,
    },
    anomalies,
    transactionCount: transactions.length,
    builtAt: Date.now(),
  };

  // Save rollup to Firestore
  const rollupId = `${uid}_${month}`;
  await db.collection('monthlyRollups').doc(rollupId).set(rollup);

  return rollup;
}

// ============================================================================
// Detect Anomalies
// ============================================================================

async function detectAnomalies(
  uid: string,
  currentMonth: string,
  currentTotals: Record<string, number>
): Promise<Array<{ category: string; deltaPct: number; explanation?: string }>> {
  // Get previous month
  const [year, month] = currentMonth.split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1); // month - 2 because JS months are 0-indexed
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  // Fetch previous month's rollup
  const prevRollupId = `${uid}_${prevMonth}`;
  const prevRollupDoc = await db.collection('monthlyRollups').doc(prevRollupId).get();

  if (!prevRollupDoc.exists) {
    return []; // No previous data to compare
  }

  const prevTotals = prevRollupDoc.data()?.totalsByCategory || {};

  // Compare categories
  const anomalies: Array<{ category: string; deltaPct: number; explanation?: string }> = [];

  for (const [category, currentTotal] of Object.entries(currentTotals)) {
    const prevTotal = prevTotals[category] || 0;

    if (prevTotal === 0 && currentTotal > 0) {
      // New category spending
      anomalies.push({
        category,
        deltaPct: 100,
        explanation: 'New spending category this month',
      });
    } else if (prevTotal > 0) {
      const deltaPct = ((currentTotal - prevTotal) / prevTotal) * 100;

      // Flag if change > 30%
      if (Math.abs(deltaPct) > 30) {
        anomalies.push({
          category,
          deltaPct: Math.round(deltaPct),
          explanation: deltaPct > 0
            ? `Spending increased by ${Math.round(deltaPct)}%`
            : `Spending decreased by ${Math.abs(Math.round(deltaPct))}%`,
        });
      }
    }
  }

  // Also check for categories that disappeared
  for (const category of Object.keys(prevTotals)) {
    if (!currentTotals[category] && prevTotals[category] > 100) {
      // Only flag if previous spending was significant
      anomalies.push({
        category,
        deltaPct: -100,
        explanation: 'No spending in this category this month',
      });
    }
  }

  return anomalies.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMonthEndDate(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

// ============================================================================
// Get Notable Transactions (for LLM insights)
// ============================================================================

export async function getNotableTransactions(
  uid: string,
  month: string,
  limit: number = 10
): Promise<any[]> {
  const startDate = `${month}-01`;
  const endDate = getMonthEndDate(month);

  // Get top transactions by amount (excluding transfers/income)
  const txnsSnapshot = await db
    .collection('transactions')
    .where('uid', '==', uid)
    .where('postedAt', '>=', startDate)
    .where('postedAt', '<=', endDate)
    .where('pending', '==', false)
    .orderBy('amount', 'desc')
    .limit(limit * 2) // Get more to filter
    .get();

  const transactions = txnsSnapshot.docs
    .map(doc => ({
      merchant: doc.data().merchant?.normalized || doc.data().merchant?.name,
      amount: Math.abs(doc.data().amount),
      date: doc.data().postedAt,
      category: doc.data().category_premium?.[0] || doc.data().category_base?.[0],
    }))
    .filter(txn => txn.amount > 50) // Exclude small transactions
    .slice(0, limit);

  return transactions;
}

// ============================================================================
// Calculate Input Hash (for LLM caching)
// ============================================================================

export function calculateInputHash(rollup: MonthlyRollupData, notableTransactions: any[]): string {
  const input = JSON.stringify({
    rollup: {
      month: rollup.month,
      categoryBreakdown: rollup.categoryBreakdown,
      topMerchants: rollup.topMerchants.slice(0, 5),
      cashflow: rollup.cashflow,
      anomalies: rollup.anomalies,
    },
    notableTransactions,
  });

  return crypto.createHash('sha256').update(input).digest('hex');
}
