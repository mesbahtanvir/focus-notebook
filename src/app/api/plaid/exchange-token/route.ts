/**
 * Exchange Plaid Public Token
 *
 * Exchanges a public_token from Plaid Link for an access_token
 * and creates connected bank accounts in Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPlaidClient } from '@/lib/plaidClient';
import { adminDb } from '@/lib/server/firebaseAdmin';
import type { BankAccount } from '@/store/useSpending';

export async function POST(request: NextRequest) {
  try {
    const { publicToken, userId, metadata } = await request.json();

    if (!publicToken || !userId) {
      return NextResponse.json(
        { error: 'Public token and user ID are required' },
        { status: 400 }
      );
    }

    const plaidClient = createPlaidClient();

    // Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = tokenResponse.data.access_token;
    const itemId = tokenResponse.data.item_id;

    // Get accounts information
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts;
    const institution = metadata?.institution;

    // Create bank accounts in Firestore
    const createdAccounts: string[] = [];

    for (const account of accounts) {
      const accountData: Omit<BankAccount, 'id' | 'createdAt'> = {
        name: account.name || account.official_name || 'Connected Account',
        accountType: mapPlaidAccountType(account.type),
        institution: institution?.name || 'Bank',
        lastFourDigits: account.mask || undefined,
        currency: account.balances.iso_currency_code || 'USD',
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
        plaidInstitutionId: institution?.institution_id || undefined,
        plaidAccountId: account.account_id,
        isPlaidConnected: true,
        lastSynced: new Date().toISOString(),
      };

      // Create account in Firestore
      const accountRef = adminDb.collection(`users/${userId}/bankAccounts`).doc();
      await accountRef.set({
        id: accountRef.id,
        ...accountData,
        createdAt: new Date().toISOString(),
      });

      createdAccounts.push(accountRef.id);
    }

    return NextResponse.json({
      success: true,
      accountsCreated: createdAccounts.length,
      accountIds: createdAccounts,
      institution: institution?.name,
    });
  } catch (error: any) {
    console.error('Plaid token exchange error:', error);

    return NextResponse.json(
      {
        error: 'Failed to exchange token',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Map Plaid account type to app account type
 */
function mapPlaidAccountType(plaidType: string): 'checking' | 'savings' | 'credit' {
  switch (plaidType.toLowerCase()) {
    case 'credit':
    case 'credit card':
      return 'credit';
    case 'depository':
    case 'savings':
      return 'savings';
    case 'checking':
    default:
      return 'checking';
  }
}
