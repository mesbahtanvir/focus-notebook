/**
 * Subscription & Recurring Payment Detection Service
 * Detects recurring transactions using heuristics and patterns
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

// ============================================================================
// Detect Recurring Transactions
// ============================================================================

export interface RecurringCandidate {
  merchant: string;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
  }>;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  confidence: number;
  meanAmount: number;
  variance: number;
}

export async function detectRecurringTransactions(
  uid: string,
  lookbackDays: number = 365
): Promise<RecurringCandidate[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Fetch all transactions for user in lookback period
  const txnsSnapshot = await db
    .collection('transactions')
    .where('uid', '==', uid)
    .where('postedAt', '>=', startDateStr)
    .where('pending', '==', false)
    .orderBy('postedAt', 'asc')
    .get();

  // Group by normalized merchant
  const merchantGroups: Record<string, any[]> = {};

  for (const doc of txnsSnapshot.docs) {
    const txn = doc.data();
    const merchant = txn.merchant?.normalized || txn.merchant?.name || 'Unknown';

    if (!merchantGroups[merchant]) {
      merchantGroups[merchant] = [];
    }

    merchantGroups[merchant].push({
      id: doc.id,
      date: txn.postedAt,
      amount: Math.abs(txn.amount),
      merchant,
    });
  }

  // Analyze each merchant group for recurring patterns
  const candidates: RecurringCandidate[] = [];

  for (const [merchant, transactions] of Object.entries(merchantGroups)) {
    // Need at least 3 transactions to establish a pattern
    if (transactions.length < 3) {
      continue;
    }

    const pattern = analyzeTransactionPattern(transactions);

    if (pattern) {
      candidates.push({
        merchant,
        transactions,
        cadence: pattern.cadence,
        confidence: pattern.confidence,
        meanAmount: pattern.meanAmount,
        variance: pattern.variance,
      });
    }
  }

  return candidates.filter(c => c.confidence >= 0.7).sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// Analyze Transaction Pattern
// ============================================================================

interface PatternResult {
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  confidence: number;
  meanAmount: number;
  variance: number;
}

function analyzeTransactionPattern(
  transactions: Array<{ date: string; amount: number }>
): PatternResult | null {
  if (transactions.length < 3) {
    return null;
  }

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate intervals between transactions (in days)
  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const prevDate = new Date(transactions[i - 1].date);
    const currDate = new Date(transactions[i].date);
    const daysDiff = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    intervals.push(daysDiff);
  }

  // Calculate mean and variance of intervals
  const meanInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  const variance = intervals.reduce(
    (sum, val) => sum + Math.pow(val - meanInterval, 2),
    0
  ) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Calculate coefficient of variation (lower = more consistent)
  const cv = stdDev / meanInterval;

  // Detect cadence based on mean interval
  let cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | null = null;

  if (meanInterval >= 5 && meanInterval <= 9) {
    cadence = 'weekly';
  } else if (meanInterval >= 12 && meanInterval <= 16) {
    cadence = 'biweekly';
  } else if (meanInterval >= 25 && meanInterval <= 35) {
    cadence = 'monthly';
  } else if (meanInterval >= 85 && meanInterval <= 95) {
    cadence = 'quarterly';
  } else if (meanInterval >= 355 && meanInterval <= 375) {
    cadence = 'annual';
  }

  if (!cadence) {
    return null;
  }

  // Calculate confidence based on:
  // 1. Consistency of intervals (lower CV = higher confidence)
  // 2. Amount variance (lower = higher confidence)
  // 3. Number of occurrences (more = higher confidence)

  const amounts = transactions.map(t => t.amount);
  const meanAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const amountVariance = amounts.reduce(
    (sum, val) => sum + Math.pow(val - meanAmount, 2),
    0
  ) / amounts.length;
  const amountCV = Math.sqrt(amountVariance) / meanAmount;

  // Confidence calculation
  let confidence = 1.0;

  // Penalize high coefficient of variation in intervals
  if (cv > 0.1) {
    confidence *= (1 - Math.min(cv, 0.5));
  }

  // Penalize high variance in amounts (>20%)
  if (amountCV > 0.2) {
    confidence *= (1 - Math.min(amountCV - 0.2, 0.3));
  }

  // Reward more occurrences
  if (transactions.length >= 6) {
    confidence *= 1.1;
  } else if (transactions.length === 5) {
    confidence *= 1.05;
  } else if (transactions.length === 3) {
    confidence *= 0.85;
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  return {
    cadence,
    confidence,
    meanAmount,
    variance: amountVariance,
  };
}

// ============================================================================
// Create/Update Recurring Streams
// ============================================================================

export async function updateRecurringStreams(
  uid: string,
  candidates: RecurringCandidate[]
): Promise<void> {
  const batch = db.batch();

  for (const candidate of candidates) {
    const streamId = `${uid}_${candidate.merchant.toLowerCase().replace(/\s+/g, '_')}`;
    const streamRef = db.collection('recurringStreams').doc(streamId);

    // Calculate next expected date based on cadence
    const lastTxn = candidate.transactions[candidate.transactions.length - 1];
    const lastDate = new Date(lastTxn.date);
    let nextExpected = new Date(lastDate);

    switch (candidate.cadence) {
      case 'weekly':
        nextExpected.setDate(nextExpected.getDate() + 7);
        break;
      case 'biweekly':
        nextExpected.setDate(nextExpected.getDate() + 14);
        break;
      case 'monthly':
        nextExpected.setMonth(nextExpected.getMonth() + 1);
        break;
      case 'quarterly':
        nextExpected.setMonth(nextExpected.getMonth() + 3);
        break;
      case 'annual':
        nextExpected.setFullYear(nextExpected.getFullYear() + 1);
        break;
    }

    const firstSeen = candidate.transactions[0].date;
    const sampleTxnIds = candidate.transactions.slice(0, 5).map(t => t.id);

    batch.set(streamRef, {
      uid,
      direction: 'outflow', // Assuming subscriptions are outflows
      merchant: candidate.merchant,
      cadence: candidate.cadence,
      meanAmount: candidate.meanAmount,
      currency: 'USD', // TODO: Get from transaction
      confidence: candidate.confidence,
      lastSeen: lastTxn.date,
      nextExpected: nextExpected.toISOString().split('T')[0],
      sampleTxnIds,
      firstSeen,
      occurrenceCount: candidate.transactions.length,
      active: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Mark transactions as subscriptions
    for (const txn of candidate.transactions) {
      const txnRef = db.collection('transactions').doc(txn.id);
      batch.update(txnRef, {
        isSubscription: true,
        recurringStreamId: streamId,
      });
    }
  }

  await batch.commit();
}

// ============================================================================
// Find Known Subscriptions by Merchant
// ============================================================================

const KNOWN_SUBSCRIPTION_MERCHANTS = [
  'netflix',
  'spotify',
  'apple music',
  'hulu',
  'disney',
  'hbo',
  'youtube premium',
  'amazon prime',
  'apple icloud',
  'google one',
  'microsoft 365',
  'adobe',
  'dropbox',
  'github',
  'chatgpt',
  'claude',
  'notion',
  'slack',
  'zoom',
  'new york times',
  'washington post',
  'wall street journal',
  'patreon',
  'substack',
];

export function isKnownSubscriptionMerchant(merchant: string): boolean {
  const merchantLower = merchant.toLowerCase();
  return KNOWN_SUBSCRIPTION_MERCHANTS.some(known =>
    merchantLower.includes(known)
  );
}
