/**
 * Plaid Service - Handles all Plaid API interactions
 */

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  ItemGetRequest,
  TransactionsSyncRequest,
  AccountsGetRequest,
} from 'plaid';
import * as admin from 'firebase-admin';
import { decrypt } from '../utils/encryption';
import { ItemStatus, ItemError } from '../types/spending-tool';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  console.warn('Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.');
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// ============================================================================
// Link Token Creation
// ============================================================================

export interface CreateLinkTokenOptions {
  userId: string;
  userEmail?: string;
  platform?: 'web' | 'ios' | 'android';
  redirectUri?: string;
  androidPackageName?: string;
  accessToken?: string; // For update mode (relink)
}

export async function createLinkToken(
  options: CreateLinkTokenOptions
): Promise<{ link_token: string; expiration: string }> {
  const {
    userId,
    platform = 'web',
    redirectUri,
    androidPackageName,
    accessToken,
  } = options;

  const request: LinkTokenCreateRequest = {
    user: {
      client_user_id: userId,
    },
    client_name: 'Focus Notebook',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us, CountryCode.Ca],
    language: 'en',
  };

  // Update mode (relink)
  if (accessToken) {
    request.access_token = accessToken;
  }

  // Platform-specific configuration
  if (platform === 'ios' || platform === 'android') {
    if (redirectUri) {
      request.redirect_uri = redirectUri;
    }
    if (platform === 'android' && androidPackageName) {
      request.android_package_name = androidPackageName;
    }
  }

  try {
    const response = await plaidClient.linkTokenCreate(request);
    return {
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    };
  } catch (error: any) {
    console.error('Error creating link token:', error.response?.data || error);
    throw new Error(`Failed to create link token: ${error.message}`);
  }
}

// ============================================================================
// Public Token Exchange
// ============================================================================

export async function exchangePublicToken(publicToken: string): Promise<{
  accessToken: string;
  itemId: string;
}> {
  try {
    const request: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    };

    const response = await plaidClient.itemPublicTokenExchange(request);

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  } catch (error: any) {
    console.error('Error exchanging public token:', error.response?.data || error);
    throw new Error(`Failed to exchange public token: ${error.message}`);
  }
}

// ============================================================================
// Get Item Info
// ============================================================================

export async function getItem(accessToken: string): Promise<{
  itemId: string;
  institutionId: string | null;
  webhook: string | null;
  error: any | null;
  availableProducts: string[];
  billedProducts: string[];
  consentExpirationTime: string | null;
}> {
  try {
    const request: ItemGetRequest = {
      access_token: accessToken,
    };

    const response = await plaidClient.itemGet(request);
    const item = response.data.item;

    return {
      itemId: item.item_id,
      institutionId: item.institution_id || null,
      webhook: item.webhook || null,
      error: item.error || null,
      availableProducts: item.available_products,
      billedProducts: item.billed_products,
      consentExpirationTime: item.consent_expiration_time || null,
    };
  } catch (error: any) {
    console.error('Error fetching item:', error.response?.data || error);
    throw new Error(`Failed to fetch item: ${error.message}`);
  }
}

// ============================================================================
// Get Institution Info
// ============================================================================

export async function getInstitutionById(institutionId: string): Promise<{
  institutionId: string;
  name: string;
  url?: string;
  logo?: string;
  primaryColor?: string;
}> {
  try {
    const response = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us, CountryCode.Ca],
    });

    const institution = response.data.institution;
    return {
      institutionId: institution.institution_id,
      name: institution.name,
      url: institution.url || undefined,
      logo: institution.logo || undefined,
      primaryColor: institution.primary_color || undefined,
    };
  } catch (error: any) {
    console.error('Error fetching institution:', error.response?.data || error);
    throw new Error(`Failed to fetch institution: ${error.message}`);
  }
}

// ============================================================================
// Get Accounts
// ============================================================================

export async function getAccounts(accessToken: string) {
  try {
    const request: AccountsGetRequest = {
      access_token: accessToken,
    };

    const response = await plaidClient.accountsGet(request);
    return response.data.accounts;
  } catch (error: any) {
    console.error('Error fetching accounts:', error.response?.data || error);
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }
}

// ============================================================================
// Transaction Sync
// ============================================================================

export async function syncTransactions(
  accessToken: string,
  cursor?: string
): Promise<{
  added: any[];
  modified: any[];
  removed: any[];
  nextCursor: string;
  hasMore: boolean;
}> {
  try {
    const request: TransactionsSyncRequest = {
      access_token: accessToken,
      cursor: cursor || undefined,
    };

    const response = await plaidClient.transactionsSync(request);

    return {
      added: response.data.added,
      modified: response.data.modified,
      removed: response.data.removed,
      nextCursor: response.data.next_cursor,
      hasMore: response.data.has_more,
    };
  } catch (error: any) {
    console.error('Error syncing transactions:', error.response?.data || error);
    throw new Error(`Failed to sync transactions: ${error.message}`);
  }
}

// ============================================================================
// Retrieve Access Token from Firestore
// ============================================================================

export async function getAccessToken(itemId: string): Promise<string> {
  const itemDoc = await admin.firestore()
    .collection('plaidItems')
    .doc(itemId)
    .get();

  if (!itemDoc.exists) {
    throw new Error(`Item ${itemId} not found`);
  }

  const item = itemDoc.data();
  if (!item?.kmsRef) {
    throw new Error(`Item ${itemId} has no encrypted access token`);
  }

  return decrypt(item.kmsRef);
}

// ============================================================================
// Error Mapping (Plaid errors -> ItemStatus)
// ============================================================================

export function mapPlaidErrorToStatus(errorCode: string): ItemStatus {
  // Login required or consent needed
  if (
    errorCode === 'ITEM_LOGIN_REQUIRED' ||
    errorCode === 'CONSENT_REQUIRED' ||
    errorCode === 'INVALID_CREDENTIALS'
  ) {
    return 'needs_relink';
  }

  // Institution down
  if (
    errorCode === 'INSTITUTION_DOWN' ||
    errorCode === 'INSTITUTION_NOT_RESPONDING'
  ) {
    return 'institution_down';
  }

  // Pending expiration
  if (errorCode === 'PENDING_EXPIRATION') {
    return 'pending_expiration';
  }

  // Default to error for unknown cases
  return 'error';
}

export function createItemError(
  errorType: string,
  errorCode: string,
  errorMessage: string
): ItemError {
  return {
    code: errorCode,
    message: errorMessage,
    at: Date.now(),
  };
}

// ============================================================================
// Update Item Status
// ============================================================================

export async function updateItemStatus(
  itemId: string,
  status: ItemStatus,
  error?: ItemError
): Promise<void> {
  const updateData: any = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (error) {
    updateData.error = error;
  } else if (status === 'ok') {
    // Clear error when status is ok
    updateData.error = admin.firestore.FieldValue.delete();
  }

  await admin.firestore()
    .collection('plaidItems')
    .doc(itemId)
    .update(updateData);
}
