# Unified Spending Tool - Implementation Summary

## Overview

This document summarizes the MVP implementation of the Unified Spending Tool as specified in the PRD v1.0. This is a privacy-first financial aggregation tool that connects to banks via Plaid, aggregates transactions, provides categorization, subscription detection, trends, and LLM-powered insights.

## ✅ Implemented Components

### 1. Backend Infrastructure (Firebase Cloud Functions)

#### Plaid Integration (`functions/src/`)
- **plaidService.ts**: Core Plaid API wrapper
  - Link token creation (new connections + update mode for relink)
  - Public token exchange
  - Institution metadata fetching
  - Account retrieval
  - Transaction sync with cursor-based pagination
  - Error mapping to item statuses
  - Access token encryption/decryption

- **plaidFunctions.ts**: Cloud Functions for Plaid operations
  - `createLinkToken`: Generate link token for new connections
  - `exchangePublicToken`: Complete connection and store encrypted token
  - `createRelinkToken`: Generate update-mode link token
  - `markRelinking`: Mark item as successfully relinked
  - `triggerSync`: Manual transaction sync trigger
  - Automatic transaction ingestion with merchant normalization

- **plaidWebhooks.ts**: Webhook handler for Plaid events
  - `TRANSACTIONS.*`: Auto-sync on new/updated transactions
  - `ITEM.ERROR`: Map errors to item statuses (needs_relink, institution_down, etc.)
  - `ITEM.PENDING_EXPIRATION`: Pre-emptive relink notifications
  - `ITEM.USER_PERMISSION_REVOKED`: Handle revoked access

#### Data Services (`functions/src/services/`)
- **encryption.ts**: KMS-style encryption for Plaid tokens
  - AES-256-GCM encryption
  - PBKDF2 key derivation
  - Ready for Google Cloud KMS upgrade

- **categorizationService.ts**: Premium taxonomy categorization
  - 60+ merchant mappings
  - 2-level category hierarchy (level1 + level2)
  - Base categories for free users, premium for premium users
  - LLM fallback for low-confidence transactions (< 0.6)
  - Merchant normalization

- **subscriptionDetection.ts**: Recurring payment detection
  - Pattern analysis: weekly, biweekly, monthly, quarterly, annual
  - Heuristics: same merchant, ±5 day jitter, ±20% amount variance
  - Confidence scoring based on consistency
  - Known subscription merchant database
  - Automatic stream creation and transaction tagging

- **monthlyRollupService.ts**: Monthly aggregation
  - Category totals and breakdowns
  - Top 10 merchants
  - Cashflow (inflow/outflow/net)
  - Anomaly detection (>30% MoM change)
  - Notable transaction extraction for LLM

- **llmInsightsService.ts**: Claude-powered insights
  - Structured JSON output schema
  - 3-6 headline insights
  - Spend warnings for anomalies
  - New subscription detection
  - 2-4 actionable budget suggestions
  - 1-3 clarifying questions
  - Input hash-based caching

### 2. Data Models & Types (`src/types/spending-tool.ts`)

Complete TypeScript definitions for:
- **User & Plans**: `free` | `premium` tier management
- **Items & Status**: 6 item states (ok, needs_relink, pending_expiration, institution_down, paused, error)
- **Accounts & Balances**: All account types with multi-currency support
- **Transactions**: Normalized with base + premium categories
- **Recurring Streams**: Subscription metadata with cadence and confidence
- **Monthly Rollups**: Pre-computed aggregates for fast UI rendering
- **LLM Insights**: Structured insight output schema
- **API Request/Response**: All function interfaces
- **Webhook Payloads**: Plaid webhook type definitions

### 3. Frontend State Management (`src/store/useSpendingTool.ts`)

Zustand store with:
- **Real-time Firestore listeners**: Items, accounts, transactions, subscriptions
- **Plaid Link actions**: Create token, exchange, relink, sync
- **Dashboard summary**: Balance, spending, income, subscription totals
- **Connection statuses**: Item health monitoring
- **Filters**: Account selection, date ranges
- **Auto-cleanup**: Unsubscribe on component unmount

### 4. Security & Privacy

- **KMS Encryption**: All Plaid access tokens encrypted at rest
- **No PII in LLM**: Only aggregates + minimal merchant/amount/date
- **Firestore Rules**: (TODO) User-scoped access controls
- **Secret-safe logging**: Never log tokens or credentials
- **Multi-currency**: Support without FX conversion (display native amounts)

### 5. Relink Flow (Core Feature)

**Item Status States:**
- `ok`: Healthy, syncing works
- `needs_relink`: User action required (login, consent, invalid creds)
- `pending_expiration`: Will expire soon or no webhooks >72h
- `institution_down`: Bank unavailable (no user action)
- `paused`: User paused sync
- `error`: Non-actionable or unknown error

**UX Flow:**
1. User sees banner: "Connection needs your attention"
2. Clicks "Relink" CTA
3. Server creates update-mode link token with existing access_token
4. Plaid Link opens for bank re-authentication
5. On success, mark item `ok` and trigger immediate sync
6. If no webhook within 2 minutes, show "Verifying…" state

**Error Mapping:**
- `ITEM_LOGIN_REQUIRED` → `needs_relink`
- `CONSENT_REQUIRED` → `needs_relink`
- `INVALID_CREDENTIALS` → `needs_relink`
- `INSTITUTION_DOWN` → `institution_down`
- `PENDING_EXPIRATION` → `pending_expiration`

## 🚧 Pending Implementation (Not Yet Started)

### High Priority
1. **Frontend UI Components**
   - [ ] Account linking button with Plaid Link
   - [ ] Transaction list with filters
   - [ ] Relink banners (inline + global)
   - [ ] Subscription list UI
   - [ ] Trends & visualizations (recharts)
   - [ ] LLM insights display
   - [ ] Connections management page

2. **Cron Jobs** (`functions/src/`)
   - [ ] `dailySync`: Catch-up sync for all items
   - [ ] `monthlyRollup`: Rebuild rollups at month boundary
   - [ ] `rebuildStreams`: Weekly subscription detection refresh
   - [ ] `stalenessCheck`: Mark items as pending_expiration if lastSyncAt > 72h

3. **Firestore Security Rules**
   - [ ] Add rules for new collections: `plaidItems`, `accounts`, `transactions`, `recurringStreams`, `monthlyRollups`, `llmAnalyses`

4. **API Routes** (`src/app/api/spending/`)
   - [ ] `/api/spending/link-token` → Next.js wrapper for createLinkToken
   - [ ] `/api/spending/accounts` → Fetch accounts
   - [ ] `/api/spending/transactions` → Fetch with filters
   - [ ] `/api/spending/rollup` → Fetch monthly rollup
   - [ ] `/api/spending/insights` → Trigger & fetch insights

### Medium Priority
5. **Testing**
   - [ ] Unit tests for categorization
   - [ ] Unit tests for subscription detection
   - [ ] Integration tests for sync flow
   - [ ] E2E tests for relink flow

6. **Settings & Privacy**
   - [ ] Pause/resume sync per item
   - [ ] Delete connection (cascade delete)
   - [ ] Export data
   - [ ] Manage premium taxonomy preferences

### Low Priority
7. **Optimizations**
   - [ ] Batch writes for large transaction syncs
   - [ ] Composite Firestore indexes
   - [ ] Transaction deduplication (pending → posted merge)
   - [ ] Webhook signature verification
   - [ ] Rate limiting for LLM calls

## 📁 File Structure

```
functions/src/
├── index.ts                    # Function exports (✅ updated)
├── plaidFunctions.ts           # ✅ New: Plaid API Cloud Functions
├── plaidWebhooks.ts            # ✅ New: Webhook handler
├── services/
│   ├── plaidService.ts         # ✅ New: Plaid API wrapper
│   ├── categorizationService.ts # ✅ New: Premium categorization
│   ├── subscriptionDetection.ts # ✅ New: Recurring payment detection
│   ├── monthlyRollupService.ts  # ✅ New: Monthly aggregation
│   └── llmInsightsService.ts    # ✅ New: Claude insights
├── utils/
│   └── encryption.ts           # ✅ New: Token encryption
└── types/
    └── spending-tool.ts        # ✅ New: Type definitions

src/
├── types/
│   └── spending-tool.ts        # ✅ New: Frontend types (full schema)
├── store/
│   └── useSpendingTool.ts      # ✅ New: Zustand store
└── lib/services/
    └── encryption.ts           # ✅ New: Encryption utility

.env.local                      # ✅ Updated: Added Plaid + Anthropic keys
package.json                    # ✅ Updated: Added plaid, @anthropic-ai/sdk, react-plaid-link
functions/package.json          # ✅ Updated: Added plaid, @anthropic-ai/sdk
```

## 🔐 Environment Variables

Add to `.env.local`:

```bash
# Plaid
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_secret_here
PLAID_ENV=sandbox  # or development, production
NEXT_PUBLIC_PLAID_ENV=sandbox

# Anthropic (for LLM insights)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_64_char_hex_key_here
```

## 📊 Data Flow

### New Connection Flow
1. User clicks "Connect Bank"
2. Frontend: `createLinkToken()` → Backend: Generate link token
3. Frontend: Open Plaid Link with token
4. User authenticates with bank
5. Plaid returns `public_token`
6. Frontend: `exchangePublicToken()` → Backend:
   - Exchange for `access_token`
   - Encrypt token → Firestore `plaidItems`
   - Fetch accounts → Firestore `accounts`
   - Trigger initial transaction sync
7. Webhook: `TRANSACTIONS.HISTORICAL_UPDATE` → Sync complete

### Transaction Sync Flow
1. Webhook: `TRANSACTIONS.SYNC_UPDATES_AVAILABLE`
2. Backend: Fetch item, decrypt access token
3. Call Plaid `/transactions/sync` with cursor
4. Process added/modified/removed transactions
5. Normalize merchant, categorize (base or premium)
6. Write to Firestore `transactions`
7. Update item cursor and lastSyncAt

### Relink Flow
1. Webhook: `ITEM.ERROR` with `ITEM_LOGIN_REQUIRED`
2. Backend: Set item status → `needs_relink`
3. Frontend: Real-time listener detects status change
4. UI: Show banner "Connection needs your attention"
5. User clicks "Relink"
6. Frontend: `createRelinkToken(itemId)` → Backend: Generate update-mode token
7. Frontend: Open Plaid Link with token
8. User re-authenticates
9. Plaid re-authorizes (no new public_token)
10. Frontend: `markRelinking(itemId)` → Backend: Set status → `ok`, trigger sync

### Monthly Insights Flow
1. Cron or user trigger: `runInsights(month)`
2. Backend: Fetch/build monthly rollup
3. Backend: Get notable transactions
4. Backend: Calculate input hash
5. If cached and hash matches → return cached insights
6. Else: Call Claude API with rollup + notable txns
7. Parse JSON output (handle markdown wrappers)
8. Save to Firestore `llmAnalyses`
9. Frontend: Real-time listener updates UI

## 🎯 PRD Acceptance Criteria

### ✅ Completed
- [x] Secure OAuth linking with encrypted token storage
- [x] Transaction sync with cursor-based incremental updates
- [x] Premium taxonomy with 60+ merchant mappings
- [x] Subscription detection with pattern analysis
- [x] Monthly rollups with category/merchant/cashflow aggregation
- [x] LLM insights with structured JSON schema
- [x] Relink flow with 6 item states and error mapping
- [x] Merchant normalization
- [x] Multi-currency support (no FX conversion)
- [x] Webhook handling for all major events

### 🚧 Pending
- [ ] UI components (account link, transactions, relink banners, visualizations)
- [ ] Cron jobs (daily sync, monthly rollup, staleness check, weekly stream rebuild)
- [ ] Firestore security rules
- [ ] API routes (Next.js wrappers)
- [ ] Settings & privacy controls
- [ ] Testing (unit, integration, E2E)

## 🚀 Next Steps

1. **Deploy Functions to Firebase**
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

2. **Set Plaid Webhook URL**
   - Go to Plaid Dashboard → Webhooks
   - Set URL: `https://your-project.cloudfunctions.net/plaidWebhook`

3. **Configure Firestore Rules** (see PRD Section 8)
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Build Frontend UI**
   - Start with account linking button
   - Add transaction list with filters
   - Implement relink banners
   - Build visualizations with recharts

5. **Test Relink Flow**
   - Use Plaid sandbox to simulate `ITEM_LOGIN_REQUIRED`
   - Verify status changes and UI updates
   - Ensure sync triggers after relink

6. **Add Cron Jobs**
   - Schedule via Cloud Scheduler
   - Test daily sync, monthly rollup, staleness check

## 📝 Notes & Decisions

### Why AES-256-GCM instead of Google Cloud KMS?
- **MVP Speed**: Built-in crypto module, no GCP setup required
- **Production Path**: Encryption service is designed for easy KMS upgrade (see comments)
- **Security**: PBKDF2 key derivation with 100k iterations, random salt/IV per encryption

### Why Claude 3.5 Sonnet instead of Haiku?
- **Insight Quality**: Sonnet produces more nuanced budget suggestions
- **JSON Reliability**: Better at following strict schema
- **Cost**: Acceptable for monthly batch processing (not per-transaction)

### Why Zustand instead of Redux?
- **Existing Codebase**: All other stores use Zustand
- **Simplicity**: No boilerplate, direct state updates
- **Real-time**: Easy integration with Firestore listeners

### Why Merchant Normalization?
- **UX**: "AMZN MKTP US*1234" → "Amazon" is more readable
- **Subscription Detection**: Groups transactions by normalized name
- **LLM Insights**: Cleaner merchant names improve LLM output

## ⚠️ Important TODOs Before Production

1. **Replace Encryption with Google Cloud KMS**
   - See `functions/src/utils/encryption.ts` for implementation template
   - Update `PLAID_SECRET` to use Secret Manager

2. **Add Webhook Signature Verification**
   - Verify `plaid-verification` header
   - Prevent unauthorized webhook calls

3. **Implement Firestore Security Rules**
   - See PRD Section 8 for rule sketch
   - Test with Firebase Emulator

4. **Add Rate Limiting**
   - LLM calls: Max 1 per user per month per month
   - Plaid sync: Respect webhook-driven updates

5. **Transaction Deduplication**
   - Merge pending → posted using `pending_transaction_id`
   - Implement 48-hour similarity window for matching

6. **Add Metrics & Monitoring**
   - Sync latency (p50/p95)
   - Relink funnel tracking
   - LLM token usage
   - Subscription detection precision/recall

## 🐛 Known Limitations (MVP)

1. **No FX Conversion**: Multi-currency transactions displayed in native amounts
2. **No Manual Categorization**: Users can't override categories (coming in v2)
3. **No Budget Envelopes**: Only insights and suggestions, no hard limits
4. **No Bill Pay**: Read-only access to transactions
5. **No Investment Analytics**: Basic balance display only
6. **Sandbox Only**: Plaid sandbox mode (real banks require production approval)
7. **US/CA Only**: Country codes limited to US and CA

## 📚 References

- **PRD**: See `PRD_Unified_Spending_Tool.md` (source document)
- **Plaid Docs**: https://plaid.com/docs/
- **Plaid Link**: https://plaid.com/docs/link/
- **Claude API**: https://docs.anthropic.com/
- **Firebase Functions**: https://firebase.google.com/docs/functions
- **Zustand**: https://docs.pmnd.rs/zustand/

---

**Implementation Date**: 2025-11-06
**Status**: Backend Core ✅ Complete | Frontend 🚧 Pending
**Next Review**: After UI components and cron jobs
