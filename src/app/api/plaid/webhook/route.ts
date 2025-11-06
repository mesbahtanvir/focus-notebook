/**
 * Plaid Webhook Handler
 *
 * Handles webhook notifications from Plaid for transaction updates
 * Automatically syncs new transactions when available
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { createPlaidClient } from '@/lib/plaidClient';
import { categorizeTransaction } from '@/lib/transactionParser';
import type { Transaction } from '@/store/useSpending';
import type { TransactionCategory } from '@/types/transactions';

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    const { webhook_type, webhook_code, item_id } = webhookData;

    console.log('Received Plaid webhook:', { webhook_type, webhook_code, item_id });

    // Handle different webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(webhookData);
        break;

      case 'ITEM':
        await handleItemWebhook(webhookData);
        break;

      default:
        console.log('Unhandled webhook type:', webhook_type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * Handle transaction-related webhooks
 */
async function handleTransactionsWebhook(data: any) {
  const { webhook_code, item_id, new_transactions, removed_transactions } = data;

  // Find accounts with this item_id
  const accountsSnapshot = await adminDb
    .collectionGroup('bankAccounts')
    .where('plaidItemId', '==', item_id)
    .get();

  if (accountsSnapshot.empty) {
    console.log('No accounts found for item:', item_id);
    return;
  }

  const accounts = accountsSnapshot.docs.map(doc => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      userId: doc.ref.parent.parent?.id,
      plaidAccessToken: data.plaidAccessToken,
      ...data,
    };
  });

  switch (webhook_code) {
    case 'DEFAULT_UPDATE':
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
      // Sync new transactions
      if (new_transactions > 0) {
        console.log(`Syncing ${new_transactions} new transactions for item ${item_id}`);

        for (const account of accounts) {
          if (!account.userId) continue;

          await syncAccountTransactions(
            account.id,
            account.userId,
            account.plaidAccessToken
          );
        }
      }
      break;

    case 'TRANSACTIONS_REMOVED':
      // Remove deleted transactions
      if (removed_transactions && removed_transactions.length > 0) {
        console.log(`Removing ${removed_transactions.length} transactions`);

        for (const account of accounts) {
          if (!account.userId) continue;

          await removeTransactions(account.userId, removed_transactions);
        }
      }
      break;

    default:
      console.log('Unhandled transaction webhook code:', webhook_code);
  }
}

/**
 * Handle item-related webhooks
 */
async function handleItemWebhook(data: any) {
  const { webhook_code, item_id, error } = data;

  console.log('Item webhook:', { webhook_code, item_id, error });

  // Find accounts with this item_id
  const accountsSnapshot = await adminDb
    .collectionGroup('bankAccounts')
    .where('plaidItemId', '==', item_id)
    .get();

  if (accountsSnapshot.empty) {
    return;
  }

  switch (webhook_code) {
    case 'ERROR':
      // Update accounts with error status
      const batch = adminDb.batch();

      accountsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          syncError: error?.error_message || 'Unknown error',
          updatedAt: Date.now(),
        });
      });

      await batch.commit();
      break;

    case 'PENDING_EXPIRATION':
      // Item credentials will expire soon
      console.log('Item credentials expiring soon:', item_id);
      break;

    default:
      console.log('Unhandled item webhook code:', webhook_code);
  }
}

/**
 * Sync transactions for an account
 */
async function syncAccountTransactions(
  accountId: string,
  userId: string,
  accessToken: string
) {
  try {
    const plaidClient = createPlaidClient();

    // Get last 30 days of transactions
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });

    const plaidTransactions = response.data.transactions;

    // Check existing transactions
    const existingSnapshot = await adminDb
      .collection(`users/${userId}/transactions`)
      .where('accountId', '==', accountId)
      .where('plaidTransactionId', '!=', null)
      .get();

    const existingIds = new Set(
      existingSnapshot.docs.map(doc => doc.data().plaidTransactionId)
    );

    // Filter new transactions
    const newTransactions = plaidTransactions.filter(
      tx => !existingIds.has(tx.transaction_id)
    );

    // Save new transactions
    const batch = adminDb.batch();

    for (const plaidTx of newTransactions) {
      const merchant = plaidTx.merchant_name || plaidTx.name || 'Unknown';
      const description = plaidTx.name || '';
      const category = mapPlaidCategory(plaidTx.category || null) || categorizeTransaction(description);

      const transactionData: Omit<Transaction, 'id' | 'createdAt'> = {
        accountId,
        date: plaidTx.date,
        description,
        merchant,
        amount: Math.abs(plaidTx.amount),
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
    }

    if (newTransactions.length > 0) {
      await batch.commit();
    }

    // Update last synced timestamp
    await adminDb
      .collection(`users/${userId}/bankAccounts`)
      .doc(accountId)
      .update({
        lastSynced: new Date().toISOString(),
        syncError: null,
      });

    console.log(`Synced ${newTransactions.length} new transactions for account ${accountId}`);
  } catch (error) {
    console.error('Failed to sync transactions:', error);
    throw error;
  }
}

/**
 * Remove transactions by Plaid transaction IDs
 */
async function removeTransactions(userId: string, plaidTransactionIds: string[]) {
  const batch = adminDb.batch();

  for (const plaidTxId of plaidTransactionIds) {
    const snapshot = await adminDb
      .collection(`users/${userId}/transactions`)
      .where('plaidTransactionId', '==', plaidTxId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      batch.delete(snapshot.docs[0].ref);
    }
  }

  await batch.commit();
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
