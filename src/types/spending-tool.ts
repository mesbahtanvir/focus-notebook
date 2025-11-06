/**
 * Unified Spending Tool - Data Models
 * Based on PRD v1.0 - Privacy-first financial aggregation with Plaid integration
 */

// ============================================================================
// User & Plan
// ============================================================================

export type UserPlan = 'free' | 'premium';

export interface User {
  email: string;
  plan: UserPlan;
  planExpiry?: string; // YYYY-MM-DD
  baseCurrency: string; // ISO currency code, e.g., "CAD", "USD"
  createdAt: number;
  lastSeenAt: number;
}

// ============================================================================
// Item Status & Errors (Plaid Connection)
// ============================================================================

export type ItemStatus =
  | 'ok'                    // Healthy, syncing works
  | 'needs_relink'          // User action required (login, consent, invalid creds)
  | 'pending_expiration'    // Expiring soon or no webhooks >72h
  | 'institution_down'      // Bank unavailable (no user action)
  | 'paused'                // User paused sync
  | 'error';                // Non-actionable or unknown error

export interface ItemError {
  code: string;             // Plaid error code
  message: string;          // Human-readable message
  at: number;               // Timestamp when error occurred
}

export interface PlaidItem {
  uid: string;              // User ID
  institutionId: string;    // Plaid institution ID (e.g., "ins_123")
  institutionName?: string; // Human-readable bank name
  status: ItemStatus;
  error?: ItemError;
  cursor?: string;          // Opaque cursor for incremental sync
  kmsRef: string;           // KMS reference for encrypted access_token
  lastSyncAt: number;       // Timestamp of last successful sync
  createdAt: number;
  updatedAt?: number;
}

// ============================================================================
// Accounts & Balances
// ============================================================================

export type AccountType = 'depository' | 'credit' | 'loan' | 'investment' | 'other';
export type AccountSubtype =
  | 'checking'
  | 'savings'
  | 'credit card'
  | 'money market'
  | 'cd'
  | 'brokerage'
  | 'ira'
  | '401k'
  | 'mortgage'
  | 'auto'
  | 'student'
  | string; // Plaid has many subtypes

export interface AccountBalances {
  current: number;          // Current balance
  available?: number;       // Available balance (for credit/checking)
  isoCurrency: string;      // Currency code
  limit?: number;           // Credit limit (for credit cards)
}

export interface Account {
  uid: string;              // User ID
  itemId: string;           // Reference to PlaidItem
  type: AccountType;
  subtype?: AccountSubtype;
  name: string;             // User-friendly name (e.g., "Amex Gold")
  mask?: string;            // Last 4 digits (e.g., "1234")
  balances: AccountBalances;
  officialName?: string;    // Bank's official account name
  updatedAt: number;
}

// ============================================================================
// Transactions & Categories
// ============================================================================

// Base categories (free tier)
export type BaseCategoryLevel1 =
  | 'Food and Drink'
  | 'Transportation'
  | 'Shopping'
  | 'Travel'
  | 'Entertainment'
  | 'Personal Care'
  | 'General Services'
  | 'Utilities'
  | 'Home'
  | 'Healthcare'
  | 'Education'
  | 'Government'
  | 'Income'
  | 'Transfer'
  | 'Other';

// Premium taxonomy (detailed categories)
export type PremiumCategoryLevel1 =
  | 'Food & Drink'
  | 'Transport'
  | 'Shopping'
  | 'Travel'
  | 'Wellness'
  | 'Utilities'
  | 'Rent/Mortgage'
  | 'Fees/Interest'
  | 'Income'
  | 'Entertainment'
  | 'Education'
  | 'Fitness'
  | 'Other';

export type PremiumCategoryLevel2 =
  // Food & Drink
  | 'Cafe'
  | 'Casual Dining'
  | 'Fine Dining'
  | 'Groceries'
  | 'Fast Food'
  | 'Alcohol & Bars'
  // Transport
  | 'Ridehail'
  | 'Public Transit'
  | 'Fuel'
  | 'Parking'
  | 'Auto Maintenance'
  // Shopping
  | 'Clothes'
  | 'Electronics'
  | 'Home Décor'
  | 'General'
  | 'Online Shopping'
  // Travel
  | 'Flights'
  | 'Hotels'
  | 'Airbnb'
  | 'Tours'
  | 'Car Rental'
  // Other specific categories
  | string;

export interface MerchantInfo {
  name: string;             // Raw merchant name from Plaid
  normalized?: string;      // Normalized merchant name (e.g., "AMZN" → "Amazon")
  logo?: string;            // URL to merchant logo
}

export interface PlaidTransaction {
  uid: string;              // User ID
  itemId: string;           // Reference to PlaidItem
  accountId: string;        // Reference to Account
  plaidTransactionId: string; // Plaid's unique transaction ID

  // Core transaction data
  postedAt: string;         // YYYY-MM-DD (date transaction posted)
  authorizedAt?: string;    // YYYY-MM-DD (date transaction authorized)
  pending: boolean;         // True if transaction is pending
  amount: number;           // Positive for debit, negative for credit
  isoCurrency: string;      // Currency code

  // Merchant & description
  merchant?: MerchantInfo;
  originalDescription: string; // Raw description from bank
  personalNote?: string;    // User-added note

  // Categorization
  category_base: string[];  // Hierarchical base category (free tier)
  category_premium?: string[]; // Hierarchical premium category (premium tier)
  confidence?: number;      // 0-1 confidence score for categorization

  // Subscription tracking
  isSubscription: boolean;
  recurringStreamId?: string; // Reference to RecurringStream if detected

  // Metadata
  ingestedAt: number;       // When we first received this transaction
  updatedAt: number;        // Last update timestamp
  source: 'plaid' | 'manual'; // Source of transaction data

  // Pending transaction tracking
  pendingTransactionId?: string; // Links pending to posted transaction
}

// ============================================================================
// Recurring Streams & Subscriptions
// ============================================================================

export type RecurrenceCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
export type RecurrenceDirection = 'inflow' | 'outflow';

export interface RecurringStream {
  id?: string;              // Document ID (optional, added by Firestore)
  uid: string;              // User ID
  direction: RecurrenceDirection;
  merchant: string;         // Normalized merchant name
  cadence: RecurrenceCadence;
  meanAmount: number;       // Average amount across occurrences
  currency: string;         // ISO currency code
  confidence: number;       // 0-1 confidence this is truly recurring
  lastSeen: string;         // YYYY-MM-DD of most recent transaction
  nextExpected: string;     // YYYY-MM-DD of next expected transaction
  sampleTxnIds: string[];   // Sample transaction IDs (up to 5)
  firstSeen: string;        // YYYY-MM-DD of first detected occurrence
  occurrenceCount: number;  // Number of times this has occurred
  active: boolean;          // False if stream appears to have ended
}

// ============================================================================
// Monthly Rollups & Analytics
// ============================================================================

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  percentage: number;       // Percentage of total spending
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

export interface Cashflow {
  inflow: number;           // Total income
  outflow: number;          // Total spending
  net: number;              // Net cashflow (inflow - outflow)
}

export interface Anomaly {
  category: string;
  deltaPct: number;         // Percentage change vs previous period
  explanation?: string;     // Optional explanation
}

export interface MonthlyRollup {
  uid: string;              // User ID
  month: string;            // YYYY-MM

  // Spending by category
  totalsByCategory: Record<string, number>; // category -> total
  categoryBreakdown: CategoryTotal[];

  // Top merchants
  topMerchants: MerchantTotal[];

  // Cashflow
  cashflow: Cashflow;

  // Anomalies (categories with >30% change)
  anomalies: Anomaly[];

  // Metadata
  builtAt: number;          // Timestamp when rollup was computed
  transactionCount: number; // Number of transactions in this month
}

// ============================================================================
// LLM Insights (Premium Feature)
// ============================================================================

export interface SpendWarning {
  category: string;
  deltaPct: number;         // Percentage increase vs previous period
  explanation: string;
}

export interface NewSubscription {
  merchant: string;
  amount: number;
  firstSeen: string;        // YYYY-MM-DD
}

export interface BudgetSuggestion {
  title: string;
  impact: string;           // Expected impact (e.g., "Save $200/month")
}

export interface BudgetRecommendations {
  notes: string;
  actions: BudgetSuggestion[];
}

export interface LLMInsightOutput {
  month: string;            // YYYY-MM
  headlineInsights: string[]; // 3-6 key insights
  spendWarnings: SpendWarning[];
  newSubscriptions: NewSubscription[];
  budgetSuggestions: BudgetRecommendations;
  questionsForUser: string[]; // 1-3 clarifying questions
}

export interface LLMAnalysis {
  uid: string;              // User ID
  month: string;            // YYYY-MM
  inputHash: string;        // SHA-256 hash of input data (for cache invalidation)
  model: string;            // Model used (e.g., "claude-3-5-sonnet-20241022")
  status: 'pending' | 'processing' | 'done' | 'error';
  output?: LLMInsightOutput;
  error?: string;
  tokens?: {
    prompt: number;
    completion: number;
  };
  createdAt: number;
  completedAt?: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateLinkTokenRequest {
  platform?: 'web' | 'ios' | 'android';
  redirectUri?: string;     // For OAuth redirect
}

export interface CreateLinkTokenResponse {
  link_token: string;
  expires_at: string;       // ISO timestamp
}

export interface ExchangePublicTokenRequest {
  public_token: string;
}

export interface ExchangePublicTokenResponse {
  itemId: string;
  institutionId: string;
  institutionName: string;
  accounts: Account[];
}

export interface CreateRelinkTokenRequest {
  itemId: string;
  platform?: 'web' | 'ios' | 'android';
}

export interface CreateRelinkTokenResponse {
  link_token: string;
  expires_at: string;
}

export interface TransactionFilters {
  startDate?: string;       // YYYY-MM-DD
  endDate?: string;         // YYYY-MM-DD
  accountId?: string;
  category?: string;
  merchant?: string;
  minAmount?: number;
  maxAmount?: number;
  pending?: boolean;
  isSubscription?: boolean;
}

export interface GetTransactionsResponse {
  transactions: PlaidTransaction[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface GetRollupRequest {
  month: string;            // YYYY-MM
}

export interface GetRollupResponse {
  rollup: MonthlyRollup | null;
}

export interface RunInsightsRequest {
  month: string;            // YYYY-MM
  force?: boolean;          // Force recompute even if cached
}

export interface RunInsightsResponse {
  analysisId: string;
  status: 'pending' | 'processing';
}

// ============================================================================
// Webhook Payloads
// ============================================================================

export type PlaidWebhookType =
  | 'TRANSACTIONS'
  | 'ITEM'
  | 'AUTH'
  | 'HOLDINGS'
  | 'INVESTMENTS_TRANSACTIONS';

export type TransactionWebhookCode =
  | 'SYNC_UPDATES_AVAILABLE'
  | 'DEFAULT_UPDATE'
  | 'HISTORICAL_UPDATE'
  | 'TRANSACTIONS_REMOVED';

export type ItemWebhookCode =
  | 'ERROR'
  | 'PENDING_EXPIRATION'
  | 'USER_PERMISSION_REVOKED'
  | 'WEBHOOK_UPDATE_ACKNOWLEDGED';

export interface PlaidWebhookPayload {
  webhook_type: PlaidWebhookType;
  webhook_code: string;
  item_id: string;
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
  };
  // Additional fields depending on webhook type
  [key: string]: any;
}

// ============================================================================
// Frontend State Types
// ============================================================================

export interface ConnectionStatus {
  itemId: string;
  institutionName: string;
  status: ItemStatus;
  error?: ItemError;
  lastSyncAt: number;
  accountCount: number;
}

export interface DashboardSummary {
  totalBalance: number;
  currency: string;
  monthlySpending: number;
  monthlyIncome: number;
  activeSubscriptions: number;
  subscriptionTotal: number;
  connectedAccounts: number;
  needsAttention: number;   // Number of items needing relink
}

// ============================================================================
// Configuration & Constants
// ============================================================================

export const PLAID_PRODUCTS = ['transactions'] as const;
export const PLAID_COUNTRY_CODES = ['US', 'CA'] as const;

export const PREMIUM_TAXONOMY: Record<PremiumCategoryLevel1, PremiumCategoryLevel2[]> = {
  'Food & Drink': ['Cafe', 'Casual Dining', 'Fine Dining', 'Groceries', 'Fast Food', 'Alcohol & Bars'],
  'Transport': ['Ridehail', 'Public Transit', 'Fuel', 'Parking', 'Auto Maintenance'],
  'Shopping': ['Clothes', 'Electronics', 'Home Décor', 'General', 'Online Shopping'],
  'Travel': ['Flights', 'Hotels', 'Airbnb', 'Tours', 'Car Rental'],
  'Wellness': [],
  'Utilities': [],
  'Rent/Mortgage': [],
  'Fees/Interest': [],
  'Income': [],
  'Entertainment': [],
  'Education': [],
  'Fitness': [],
  'Other': [],
};

export const MERCHANT_NORMALIZATIONS: Record<string, string> = {
  'AMZN': 'Amazon',
  'AMZN MKTP': 'Amazon',
  'AMAZON.COM': 'Amazon',
  'AMZ*': 'Amazon',
  'STARBUCKS': 'Starbucks',
  'SBX*': 'Starbucks',
  'UBER': 'Uber',
  'UBER *TRIP': 'Uber',
  'UBER EATS': 'Uber Eats',
  'SPOTIFY': 'Spotify',
  'NETFLIX': 'Netflix',
  'WHOLEFDS': 'Whole Foods',
  'WM SUPERCENTER': 'Walmart',
  'WALMART': 'Walmart',
  'TARGET': 'Target',
  'TST*': 'Toast',
  'SQ *': 'Square',
  'PAYPAL': 'PayPal',
  'VENMO': 'Venmo',
  'APPLE.COM/BILL': 'Apple',
  'APL*APPLE': 'Apple',
  'GOOGLE *': 'Google',
  'GOOG *': 'Google',
  // Add more as needed
};
