/**
 * Sync Transactions from Plaid
 *
 * Fetches transactions from Plaid for a connected account
 * and saves them to Firestore, avoiding duplicates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPlaidClient } from '@/lib/plaidClient';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { categorizeTransaction } from '@/lib/transactionParser';
import type { Transaction } from '@/store/useSpending';
import type { TransactionCategory } from '@/types/transactions';

export async function POST(request: NextRequest) {
  try {
    const { accountId, userId, startDate, endDate } = await request.json();

    if (!accountId || !userId) {
      return NextResponse.json(
        { error: 'Account ID and user ID are required' },
        { status: 400 }
      );
    }

    // Get account from Firestore
    const accountDoc = await adminDb
      .collection(`users/${userId}/bankAccounts`)
      .doc(accountId)
      .get();

    if (!accountDoc.exists) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const accountData = accountDoc.data();

    if (!accountData?.plaidAccessToken) {
      return NextResponse.json(
        { error: 'Account is not connected via Plaid' },
        { status: 400 }
      );
    }

    const plaidClient = createPlaidClient();

    // Calculate date range (default to last 30 days)
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Fetch transactions from Plaid
    const response = await plaidClient.transactionsGet({
      access_token: accountData.plaidAccessToken,
      start_date: start,
      end_date: end,
      options: {
        account_ids: [accountData.plaidAccountId],
      },
    });

    const plaidTransactions = response.data.transactions;

    // Check existing transactions to avoid duplicates
    const existingTransactionsSnapshot = await adminDb
      .collection(`users/${userId}/transactions`)
      .where('accountId', '==', accountId)
      .where('plaidTransactionId', '!=', null)
      .get();

    const existingPlaidIds = new Set(
      existingTransactionsSnapshot.docs.map(doc => doc.data().plaidTransactionId)
    );

    // Filter out existing transactions
    const newTransactions = plaidTransactions.filter(
      tx => !existingPlaidIds.has(tx.transaction_id)
    );

    // Save new transactions to Firestore
    const batch = adminDb.batch();
    let savedCount = 0;

    for (const plaidTx of newTransactions) {
      // Map Plaid transaction to app transaction
      const merchant = plaidTx.merchant_name || plaidTx.name || 'Unknown';
      const description = plaidTx.name || '';
      const category = mapPlaidCategory(plaidTx.category || null) || categorizeTransaction(description);

      const transactionData: Omit<Transaction, 'id' | 'createdAt'> = {
        accountId,
        date: plaidTx.date,
        description,
        merchant,
        amount: Math.abs(plaidTx.amount), // Plaid uses negative for debits
        category,
        plaidTransactionId: plaidTx.transaction_id,
        source: 'plaid',
        pending: plaidTx.pending,
      };

      const transactionRef = adminDb
        .collection(`users/${userId}/transactions`)
        .doc();

      batch.set(transactionRef, {
        id: transactionRef.id,
        ...transactionData,
        createdAt: new Date().toISOString(),
      });

      savedCount++;
    }

    if (savedCount > 0) {
      await batch.commit();
    }

    // Update account's lastSynced timestamp
    await adminDb
      .collection(`users/${userId}/bankAccounts`)
      .doc(accountId)
      .update({
        lastSynced: new Date().toISOString(),
        syncError: null,
      });

    return NextResponse.json({
      success: true,
      totalTransactions: plaidTransactions.length,
      newTransactions: savedCount,
      dateRange: { start, end },
    });
  } catch (error: any) {
    console.error('Plaid transaction sync error:', error);

    // Try to update account with error
    const { accountId, userId } = await request.json();
    if (accountId && userId) {
      try {
        await adminDb
          .collection(`users/${userId}/bankAccounts`)
          .doc(accountId)
          .update({
            syncError: error.message || 'Failed to sync transactions',
          });
      } catch (updateError) {
        console.error('Failed to update sync error:', updateError);
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to sync transactions',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Map Plaid category to app category
 */
function mapPlaidCategory(plaidCategories: string[] | null): TransactionCategory | null {
  if (!plaidCategories || plaidCategories.length === 0) {
    return null;
  }

  const primaryCategory = plaidCategories[0]?.toLowerCase();

  if (!primaryCategory) {
    return null;
  }

  // Map Plaid categories to app categories
  if (primaryCategory.includes('food') || primaryCategory.includes('restaurant')) {
    return 'dining';
  }
  if (primaryCategory.includes('groceries') || primaryCategory.includes('supermarket')) {
    return 'groceries';
  }
  if (primaryCategory.includes('transport') || primaryCategory.includes('taxi') || primaryCategory.includes('gas')) {
    return 'transportation';
  }
  if (primaryCategory.includes('entertainment') || primaryCategory.includes('recreation')) {
    return 'entertainment';
  }
  if (primaryCategory.includes('shops') || primaryCategory.includes('retail')) {
    return 'shopping';
  }
  if (primaryCategory.includes('service') || primaryCategory.includes('utilities')) {
    return 'utilities';
  }
  if (primaryCategory.includes('healthcare') || primaryCategory.includes('medical')) {
    return 'health';
  }
  if (primaryCategory.includes('travel') || primaryCategory.includes('hotel') || primaryCategory.includes('airlines')) {
    return 'travel';
  }
  if (primaryCategory.includes('subscription')) {
    return 'subscriptions';
  }

  return null;
}
