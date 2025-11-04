/**
 * Credit Card Transaction Parser
 * Parses CSV data and categorizes transactions
 */

import type { Transaction, TransactionCategory, CSVMapping, TransactionAnalysis } from '@/types/transactions';

/**
 * Parse CSV text into transactions
 */
export function parseCSV(csvText: string, mapping: CSVMapping): Transaction[] {
  const lines = csvText.trim().split('\n');
  const startIndex = mapping.hasHeaders ? 1 : 0;
  const transactions: Transaction[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted fields)
    const fields = parseCSVLine(line);

    if (fields.length <= Math.max(mapping.dateColumn, mapping.descriptionColumn, mapping.amountColumn)) {
      continue; // Skip invalid lines
    }

    const dateStr = fields[mapping.dateColumn]?.trim();
    const description = fields[mapping.descriptionColumn]?.trim();
    const amountStr = fields[mapping.amountColumn]?.trim();

    if (!dateStr || !description || !amountStr) continue;

    // Parse amount (remove currency symbols and commas)
    const amount = parseAmount(amountStr);
    if (isNaN(amount)) continue;

    // Parse date
    const date = parseDate(dateStr, mapping.dateFormat);
    if (!date) continue;

    // Auto-categorize and extract merchant
    const category = categorizeTransaction(description);
    const merchant = extractMerchant(description);

    transactions.push({
      id: `txn_${Date.now()}_${i}`,
      date: date.toISOString(),
      description,
      amount,
      category,
      merchant,
      createdAt: new Date().toISOString(),
      parsedFrom: 'csv',
    });
  }

  return transactions;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  fields.push(currentField);
  return fields;
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
  // Remove currency symbols, spaces, and commas
  const cleaned = amountStr.replace(/[$€£¥₹,\s]/g, '');

  // Handle parentheses for negative numbers: (100.00) -> -100.00
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    return -parseFloat(cleaned.slice(1, -1));
  }

  return parseFloat(cleaned);
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string, format?: string): Date | null {
  try {
    // Try ISO format first
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    // Try common formats
    // MM/DD/YYYY or M/D/YYYY
    const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const [, month, day, year] = mdyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // DD/MM/YYYY or D/M/YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch && format?.includes('DD')) {
      const [, day, month, year] = dmyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // YYYY-MM-DD
    const ymdMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Auto-categorize transaction based on description
 */
export function categorizeTransaction(description: string): TransactionCategory {
  const desc = description.toLowerCase();

  // Groceries
  if (/(grocery|supermarket|whole foods|trader joe|safeway|kroger|walmart|target|costco|aldi)/i.test(desc)) {
    return 'groceries';
  }

  // Dining
  if (/(restaurant|cafe|coffee|starbucks|mcdonald|burger|pizza|chipotle|subway|dining|food|bar|grill)/i.test(desc)) {
    return 'dining';
  }

  // Transportation
  if (/(uber|lyft|taxi|gas|fuel|parking|transit|metro|bus|train|airline|flight)/i.test(desc)) {
    return 'transportation';
  }

  // Entertainment
  if (/(netflix|spotify|hulu|disney|amazon prime|movie|theater|cinema|concert|game|steam)/i.test(desc)) {
    return 'entertainment';
  }

  // Shopping
  if (/(amazon|ebay|etsy|shop|store|retail|mall|clothing|fashion)/i.test(desc)) {
    return 'shopping';
  }

  // Utilities
  if (/(electric|water|gas|internet|phone|utility|bill|insurance)/i.test(desc)) {
    return 'utilities';
  }

  // Health
  if (/(pharmacy|drug|medical|doctor|hospital|health|dental|gym|fitness)/i.test(desc)) {
    return 'health';
  }

  // Travel
  if (/(hotel|airbnb|booking|expedia|travel|vacation|resort)/i.test(desc)) {
    return 'travel';
  }

  // Subscriptions
  if (/(subscription|monthly|annual|membership)/i.test(desc)) {
    return 'subscriptions';
  }

  return 'other';
}

/**
 * Extract merchant name from description
 */
function extractMerchant(description: string): string {
  // Remove common suffixes and clean up
  let merchant = description
    .replace(/\s+\d{4}$/g, '') // Remove trailing numbers
    .replace(/\*+/g, '') // Remove asterisks
    .replace(/#\d+/g, '') // Remove reference numbers
    .replace(/\s+-\s+.*/g, '') // Remove everything after dash
    .trim();

  // Take first part before common delimiters
  const parts = merchant.split(/[,-]/);
  merchant = parts[0].trim();

  // Capitalize properly
  merchant = merchant
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return merchant || description;
}

/**
 * Analyze transactions and generate insights
 */
export function analyzeTransactions(transactions: Transaction[]): TransactionAnalysis {
  const categoryTotals: Record<TransactionCategory, { total: number; count: number }> = {
    groceries: { total: 0, count: 0 },
    dining: { total: 0, count: 0 },
    transportation: { total: 0, count: 0 },
    entertainment: { total: 0, count: 0 },
    shopping: { total: 0, count: 0 },
    utilities: { total: 0, count: 0 },
    health: { total: 0, count: 0 },
    travel: { total: 0, count: 0 },
    subscriptions: { total: 0, count: 0 },
    other: { total: 0, count: 0 },
  };

  const merchantTotals: Record<string, { total: number; count: number }> = {};
  const dailyTotals: Record<string, number> = {};

  let totalSpending = 0;
  let totalRefunds = 0;

  for (const txn of transactions) {
    const amount = Math.abs(txn.amount);

    if (txn.amount > 0) {
      totalSpending += amount;
    } else {
      totalRefunds += amount;
    }

    // Category breakdown
    const category = txn.category || 'other';
    categoryTotals[category].total += amount;
    categoryTotals[category].count++;

    // Merchant breakdown
    const merchant = txn.merchant || 'Unknown';
    if (!merchantTotals[merchant]) {
      merchantTotals[merchant] = { total: 0, count: 0 };
    }
    merchantTotals[merchant].total += amount;
    merchantTotals[merchant].count++;

    // Daily breakdown
    const date = new Date(txn.date).toISOString().split('T')[0];
    dailyTotals[date] = (dailyTotals[date] || 0) + amount;
  }

  // Calculate percentages for categories
  const categoryBreakdown: Record<TransactionCategory, { total: number; count: number; percentage: number }> = {} as any;
  for (const [category, data] of Object.entries(categoryTotals)) {
    categoryBreakdown[category as TransactionCategory] = {
      ...data,
      percentage: totalSpending > 0 ? (data.total / totalSpending) * 100 : 0,
    };
  }

  // Top merchants
  const topMerchants = Object.entries(merchantTotals)
    .map(([merchant, data]) => ({ merchant, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Weekly trend
  const weeklyTotals: Record<string, number> = {};
  for (const [date, amount] of Object.entries(dailyTotals)) {
    const weekStart = getWeekStart(new Date(date));
    const weekKey = weekStart.toISOString().split('T')[0];
    weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + amount;
  }

  const weeklyTrend = Object.entries(weeklyTotals)
    .map(([week, total]) => ({ week, total }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // Monthly trend
  const monthlyTotals: Record<string, number> = {};
  for (const [date, amount] of Object.entries(dailyTotals)) {
    const monthKey = date.substring(0, 7); // YYYY-MM
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amount;
  }

  const monthlyTrend = Object.entries(monthlyTotals)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalSpending,
    totalRefunds,
    netSpending: totalSpending - totalRefunds,
    transactionCount: transactions.length,
    averageTransaction: transactions.length > 0 ? totalSpending / transactions.length : 0,
    categoryBreakdown,
    topMerchants,
    dailySpending: dailyTotals,
    weeklyTrend,
    monthlyTrend,
  };
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Export transactions to CSV
 */
export function exportToCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Description', 'Amount', 'Category', 'Merchant', 'Notes'];
  const rows = transactions.map(txn => [
    new Date(txn.date).toLocaleDateString(),
    txn.description,
    txn.amount.toFixed(2),
    txn.category || '',
    txn.merchant || '',
    txn.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${field}"`).join(',')),
  ].join('\n');

  return csvContent;
}
