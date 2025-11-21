# Focus Notebook Codebase Architecture Analysis

## 1. STORE STRUCTURE (Frontend State Management)

### Complete Store Inventory (35 Zustand stores)

#### Core Domain Stores (10 major stores)
| Store | Type | Size | Firebase | Key Operations |
|-------|------|------|----------|-----------------|
| `useTasks.ts` | Core | 304 LOC | Real-time | CRUD, toggle, archive, status transitions, recurring |
| `useThoughts.ts` | Core | 282 LOC | Real-time | CRUD, AI processing, CBT analysis, suggestions |
| `useSpending.ts` | Core | 291 LOC | Real-time | Accounts, transactions, insights, categorization |
| `useInvestments.ts` | Complex | 1024 LOC | Real-time | Holdings, transactions, portfolio snapshots, predictions |
| `useFocus.ts` | Complex | 961 LOC | Real-time | Focus sessions, blocking, pause/resume, analytics |
| `usePhotoFeedback.ts` | Complex | 943 LOC | Real-time + Storage | Photo battles, voting, ranking, thumbnail mgmt |
| `useTrips.ts` | Core | 373 LOC | Real-time | Destinations, linked expenses, visa tracking |
| `usePhotoLibrary.ts` | Complex | 306 LOC | Storage | Photo upload, gallery, progress tracking |
| `useEntityGraph.ts` | Complex | 482 LOC | Real-time | Relationships, linking, graph operations |
| `usePackingLists.ts` | Core | 296 LOC | Real-time | Packing items, templates, toggling |

#### Supporting Stores (15 additional)
| Store | Type | Purpose |
|-------|------|---------|
| `useGoals.ts` | Data | Goal tracking with status/priority |
| `useMoods.ts` | Data | Mood tracking (1-10 scale) |
| `useProjects.ts` | Data | Project management |
| `useFriends.ts` | Data | Relationship tracking |
| `useRelationships.ts` | Data | Advanced relationship data |
| `usePlaces.ts` | Data | Location tracking |
| `useAdmiredPeople.ts` | Data | Admired people tracking |
| `useBodyProgress.ts` | Data | DEXA scans and body metrics |
| `useVisaFinder.ts` | Data | Visa requirement tracking |
| `useSubscriptions.ts` | Data | Subscription tracking |
| `useCalendar.ts` | Data | Local calendar events (persisted) |
| `useLLMLogs.ts` | Analytics | LLM interaction logging |
| `useTokenUsage.ts` | Analytics | AI token tracking (local only) |
| `useRequestLog.ts` | Analytics | Request logging |
| `useToolUsage.ts` | Analytics | Tool usage tracking |

#### Configuration/Status Stores (10 additional)
| Store | Purpose |
|-------|---------|
| `useSettings.ts` | User preferences (theme, model selection) |
| `useSettingsStore.ts` | Additional settings |
| `useCurrency.ts` | Currency display preference |
| `useBillingData.ts` | Billing information |
| `useSubscriptionStatus.ts` | Subscription tier and entitlements |
| `useAnonymousSession.ts` | Anonymous user session state |
| `useLLMQueue.ts` | LLM processing queue management |
| `useUsageStats.ts` | Usage statistics hook (not Zustand) |
| `useDatingFeedback.ts` | Dating photo feedback (legacy) |
| `useSpendingTool.ts` | Spending tool specific state |

---

## 2. FIREBASE INTEGRATION PATTERNS

### A. Data Access Pattern (Gateway Layer)
**Location**: `src/lib/data/gateway.ts`

**Core Functions**:
```
- createAt(path, data)      // Create with auto metadata (createdAt, updatedAt, updatedBy, version)
- updateAt(path, updates)   // Update with auto-increment version
- setAt(path, data)         // Merge update with auto metadata
- deleteAt(path)            // Delete document
```

**Key Features**:
- Automatic timestamp injection (server timestamps)
- User tracking (updatedBy)
- Version incrementing
- Undefined value filtering (Firestore compatibility)

### B. Real-Time Subscriptions (Subscribe Pattern)
**Location**: `src/lib/data/subscribe.ts`

**Core Functions**:
```
- subscribeCol(query, callback)    // Subscribe to collection
- subscribeDoc(ref, callback)      // Subscribe to single document
```

**Metadata Tracking**:
```javascript
{
  fromCache: boolean,           // Local cache status
  hasPendingWrites: boolean,    // Offline edits pending
  error?: Error                 // Subscription errors
}
```

**Stores Using Real-Time Subscriptions** (13 stores):
- useTasks, useThoughts, useSpending, useTrips, useEntityGraph
- useGoals, useMoods, useProjects, useFriends, useBodyProgress
- usePhotoLibrary, usePackingLists, useLLMLogs

### C. Firebase Resilience Layer
**Location**: `src/lib/firebase/`

**Components**:
1. **Circuit Breaker** (`circuit-breaker.ts`)
   - Per-endpoint circuit breaker
   - States: Closed → Open → Half-Open
   - Exponential backoff recovery

2. **Retry Logic** (`retry.ts`)
   - Configurable retry strategies
   - Error classification (retryable vs. permanent)
   - Exponential backoff with jitter

3. **Offline Queue** (`offline-queue.ts`)
   - Queues operations when offline
   - Priority-based (high/medium/low)
   - Auto-retry on reconnection

4. **Subscription Health** (`subscription-health.ts`)
   - Real-time subscription monitoring
   - Auto-reconnect on failures
   - Health status tracking

5. **Connection Monitor** (`connection-monitor.ts`)
   - Network connectivity tracking
   - Latency measurement
   - Recovery triggers

6. **Metrics Collector** (`metrics.ts`)
   - Operation performance tracking
   - Connection health metrics
   - Error rate monitoring

### D. Firestore Structure by Domain

```
users/{uid}/
├── tasks/                    # Task documents
├── thoughts/                 # Thought documents
├── moods/                    # Mood entries
├── goals/                    # Goals
├── projects/                 # Projects
├── trips/                    # Trips
├── spending/
│   ├── accounts/            # Bank accounts
│   └── transactions/        # Transactions
├── investments/
│   ├── holdings/           # Investment holdings
│   └── transactions/       # Investment transactions
├── entityGraph/            # Relationship graph
├── photoLibrary/           # Photo metadata
├── photoFeedback/          # Photo battle data
├── packinglists/           # Packing list data
└── [other-domains]/        # Other collections
```

**Authentication Levels**:
- Authenticated users: Full access to own data
- Anonymous users: Limited to 2-hour session
- Admin: Cleanup and maintenance functions

---

## 3. DATA ACCESS PATTERNS & DIRECT FIREBASE OPERATIONS

### Mixed Pattern Approach

**Direct Firebase Calls** (Not using gateway):
1. **Photo Library** (`usePhotoLibrary.ts`): Direct Firebase Storage operations
2. **Photo Feedback** (`usePhotoFeedback.ts`): Direct Storage + setDoc/updateDoc
3. **Body Progress** (`useBodyProgress.ts`): Direct Storage for DEXA scans
4. **Calendar** (`useCalendar.ts`): localStorage based, no Firebase

**Custom Resilience** (Per-store):
- `usePhotoFeedback.ts`: Direct Firestore writes with error handling
- `useSpending.ts`: Handles concurrent transaction batch uploads

### Token Tracking
- `useTokenUsage.ts`: Local tracking only (localStorage persisted)
- Not persisted to Firestore
- Used for frontend rate limiting and display

### Cache Management
- Zustand store maintains in-memory cache
- Firebase metadata (`fromCache`, `hasPendingWrites`) indicates sync status
- No explicit cache invalidation - relies on subscription updates

---

## 4. API ROUTES (Frontend-facing)

### Location: `src/app/api/`

#### Current API Routes (7 routes)

| Route | Method | Purpose | Auth | Backend |
|-------|--------|---------|------|---------|
| `/process-thought` | POST | AI thought analysis | verifyAiRequest | Needs implementation |
| `/chat` | POST | AI chat interface | verifyAiRequest | Needs implementation |
| `/predict-investment` | POST | Stock prediction | verifyAiRequest | Direct API call |
| `/stock-price` | POST | Real-time stock price | None | Alpha Vantage API |
| `/stock-history` | POST | Historical stock data | None | Alpha Vantage API |
| `/spending/[action]` | POST | Spending operations proxy | Bearer token | Cloud Functions |
| `/spending/delete-csv` | POST | CSV deletion proxy | Bearer token | Cloud Functions |

#### Spending Proxy Actions
Maps to Cloud Functions:
- `link-token` → `createLinkToken`
- `exchange-public-token` → `exchangePublicToken`
- `trigger-sync` → `triggerSync`
- `process-csv` → `processCSVTransactions`
- `link-transaction-trip` → `linkTransactionToTrip`
- `delete-all-transactions` → `deleteAllTransactions`

### Authentication Pattern
1. **Bearer Token**: For direct Cloud Function calls
   - Token from Firebase Auth
   - Sent in `Authorization: Bearer <token>` header

2. **verifyAiRequest**: Custom AI verification
   - Location: `src/lib/server/verifyAiRequest.ts`
   - Verifies Firebase token
   - Checks subscription status
   - Rate limiting checks

3. **App Check Token**: Optional Firebase security
   - `X-Firebase-AppCheck` header
   - Firebase Instance ID token

---

## 5. SERVICES (Business Logic)

### Location: `src/services/`

#### 1. **Entity Service** (`entityService.ts`)
**Purpose**: Centralized entity creation and linking
**Key Operations**:
- `createTask()` - Create with auto-relationship
- `createGoal()` - Create with source tracking
- `createMood()` - Create with validation
- `linkEntities()` - Create relationships between entities
- `updateEntity()` - Update with graph awareness

**Options Supported**:
```typescript
interface EntityCreationOptions {
  sourceEntity?: { type, id }    // What triggered creation
  createdBy?: 'ai' | 'user'      // Creation source
  confidence?: number             // AI confidence
  reasoning?: string              // Why created
}
```

**Key Rule**: "All entity creation MUST go through this service"

#### 2. **Thought Processing Service** (`thoughtProcessingService.ts`)
**Purpose**: Manage AI processing of thoughts
**Key Operations**:
- `processThought(thoughtId)` - Queue for cloud function
- Subscription status checking
- Entitlement validation
- Rate limiting enforcement

**Cloud Function Integration**:
- Calls `manualProcessThought` cloud function
- Returns structured suggestions

#### 3. **Time Tracking Service** (`TimeTrackingService.ts`)
**Purpose**: Calculate time spent on tasks
**Operations**: Duration calculations, interval tracking

#### 4. **Import/Export Services** (`import-export/`)
**Components**:
- `ImportService.ts` - Data import logic
- `ExportService.ts` - Data export logic
- `ValidationService.ts` - Data validation
- `ConflictDetectionService.ts` - Merge conflict handling
- `ReferenceMappingService.ts` - ID remapping

---

## 6. CLOUD FUNCTIONS (Backend)

### Location: `functions/src/`

#### A. Thought Processing (5 functions)
| Function | Trigger | Purpose |
|----------|---------|---------|
| `processNewThought` | onDocumentCreate(thoughts) | Auto-trigger AI analysis |
| `manualProcessThought` | HTTPS callable | User-triggered processing |
| `reprocessThought` | HTTPS callable | Re-analyze with options |
| `revertThoughtProcessing` | HTTPS callable | Undo AI changes |
| `processThoughtQueueWorker` | Scheduled | Background queue processing |

**Features**:
- Rate limiting (per user/tier)
- Subscription entitlement checking
- Tool spec resolution
- AI confidence scoring
- Action suggestions (createTask, linkEntity, etc.)
- Token usage tracking

#### B. Plaid Integration (5 functions)
| Function | Type | Purpose |
|----------|------|---------|
| `createLinkToken` | HTTPS callable | Initiate Plaid link flow |
| `exchangePublicToken` | HTTPS callable | Complete connection |
| `createRelinkToken` | HTTPS callable | Re-authorize access |
| `markRelinking` | HTTPS callable | Track relinking status |
| `triggerSync` | HTTPS callable | Force transaction sync |
| `plaidWebhook` | HTTPS (webhook) | Handle Plaid events |

**Webhook Events Handled**:
- TRANSACTIONS_REMOVED
- TRANSACTIONS_UPDATED
- ITEM_LOGIN_REQUIRED
- ERROR

#### C. CSV Processing (4 functions)
| Function | Trigger | Purpose |
|----------|---------|---------|
| `onCSVUpload` | onFinalize(spending/csv) | Batch queue creation |
| `processCsvBatchQueue` | Scheduled | Batch processing worker |
| `processCSVTransactions` | HTTPS callable | Direct processing |
| `deleteCSVStatement` | HTTPS callable | Delete CSV file |

**Enhancement**:
- LLM categorization of transactions
- Merchant extraction
- Subscription detection

#### D. Stripe Billing (8 functions)
| Function | Type | Purpose |
|----------|------|---------|
| `createStripeCheckoutSession` | HTTPS callable | Payment checkout |
| `createStripePortalSession` | HTTPS callable | Billing portal |
| `stripeWebhook` | HTTPS (webhook) | Handle payments |
| `syncStripeSubscription` | Scheduled | Sync sub status |
| `getStripeInvoices` | HTTPS callable | Fetch invoices |
| `getStripePaymentMethod` | HTTPS callable | Payment details |
| `reactivateStripeSubscription` | HTTPS callable | Resume subscription |
| `getUsageStats` | HTTPS callable | Usage statistics |

#### E. Market & Investment (3 functions)
| Function | Trigger | Purpose |
|----------|---------|---------|
| `updateTrackedTickers` | HTTPS callable | Update watchlist |
| `refreshTrackedTickerPrices` | Scheduled (daily) | Background price update |
| `createDailyPortfolioSnapshots` | Scheduled (daily) | Portfolio snapshots |

#### F. Trip & Location (2 functions)
| Function | Type | Purpose |
|----------|------|---------|
| `processTransactionTripLinks` | Scheduled | Auto-link expenses to trips |
| `linkTransactionToTrip` | HTTPS callable | Manual linking |

#### G. Photo Feedback (5 functions)
| Function | Type | Purpose |
|----------|------|---------|
| `generatePhotoThumbnail` | onFinalize(storage) | Auto-thumbnail creation |
| `getSignedImageUrl` | HTTPS callable | Signed download URL |
| `submitPhotoVote` | HTTPS callable | Record vote |
| `getNextPhotoPair` | HTTPS callable | Get battle pair |
| `mergePhotos` | HTTPS callable | Merge similar photos |

#### H. Data Management (3 functions)
| Function | Type | Purpose |
|----------|------|---------|
| `cleanupExpiredAnonymousUsers` | Scheduled (hourly) | Remove 2-hour sessions |
| `deleteAllTransactions` | HTTPS callable | Bulk delete |
| `deleteCSVStatement` | HTTPS callable | Single delete |

#### I. Miscellaneous (4 functions)
| Function | Type | Purpose |
|----------|------|---------|
| `onDexaScanUpload` | onFinalize(storage) | DEXA scan processing |
| `updateVisaDataWeekly` | Scheduled (weekly) | Update visa requirements |
| `updateVisaDataManual` | HTTPS callable | Manual update |
| `getVisaRequirements` | HTTPS callable | Fetch requirements |
| `runPlaceInsights` | HTTPS callable | Place analysis |
| `createPackingList` | HTTPS callable | Generate packing list |
| `packingListTemplates` | HTTPS callable | Get templates |

### Cloud Function Patterns

**HTTPS Callable Pattern**:
```typescript
export const functionName = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '...');
  }
  
  const uid = context.auth.uid;
  // Implementation
  return { result };
});
```

**Storage Trigger Pattern**:
```typescript
export const onUpload = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;  // gs://bucket/path
  // Implementation
});
```

**Scheduled Function Pattern**:
```typescript
export const dailyJob = functions.pubsub
  .schedule('every day 00:00').timeZone('UTC')
  .onRun(async (context) => {
    // Implementation
  });
```

**Webhook Pattern**:
```typescript
export const webhook = functions.https.onRequest(async (req, res) => {
  // Verify signature
  // Handle event
  res.json({ success: true });
});
```

### Shared Utilities

**Location**: `functions/src/utils/`

| Utility | Purpose |
|---------|---------|
| `openaiClient.ts` | OpenAI API wrapper |
| `encryption.ts` | Data encryption/decryption |
| `aiPromptLogger.ts` | Log LLM interactions |
| `contextGatherer.ts` | Gather user context for AI |
| `actionProcessor.ts` | Process AI action suggestions |

**Location**: `functions/src/services/`

| Service | Purpose |
|---------|---------|
| `categorizationService.ts` | Transaction categorization |
| `llmInsightsService.ts` | LLM-based insights |
| `plaidService.ts` | Plaid API wrapper |
| `subscriptionDetection.ts` | Detect recurring transactions |

---

## 7. KEY ARCHITECTURAL INSIGHTS

### A. Data Flow Patterns

#### Pattern 1: Real-Time Data Synchronization
```
Store.subscribe() → Firebase Collection Query
    ↓
subscribeCol() callback
    ↓
Store state update (Zustand)
    ↓
Component re-render (via Zustand selector)
```

**Stores Affected**: Tasks, Thoughts, Spending, Goals, Moods, etc.

#### Pattern 2: Backend Processing Delegation
```
Frontend Component → Cloud Function (HTTPS Callable)
    ↓
Function processes (LLM, API calls, heavy computation)
    ↓
Write results to Firestore
    ↓
Store subscription receives update
    ↓
Component reflects changes
```

**Functions Affected**: All CSV processing, thought processing, photo processing

#### Pattern 3: User-Initiated API Proxy
```
Component → Frontend API Route (/api/*)
    ↓
API Route extracts token
    ↓
Calls Cloud Function with Bearer token
    ↓
Cloud Function validates and executes
    ↓
Response to component
```

**Routes**: Spending proxy routes

#### Pattern 4: Offline Queue
```
Action triggered (offline)
    ↓
Added to offline-queue
    ↓
Network restored
    ↓
Queue processes (with retries)
    ↓
Firestore operation succeeds
    ↓
Store updates
```

**Enabled For**: All gateway operations (createAt, updateAt, deleteAt)

### B. Authentication & Authorization

**Three-Tier System**:
1. **Anonymous Users**
   - 2-hour session duration
   - AI processing disabled (unless override key)
   - Limited tool access
   - No billing integration

2. **Authenticated Users**
   - Firebase Auth (Google OAuth, Email/Password)
   - Full Firestore access (row-level security)
   - Cloud Function access
   - Billing integration

3. **Admins**
   - Full database access
   - Scheduled function management
   - User cleanup functions

### C. Subscription Tiers

**Tracked In**: `useSubscriptionStatus.ts`, Stripe integration

**Tier Levels**:
- **Free**: Limited AI processing, basic features
- **Pro**: Unlimited AI processing, advanced features

**Entitlement Codes**:
- `ok` - Full access
- `inactive` - Subscription lapsed
- `disabled` - Admin disabled
- `exhausted` - Credits depleted
- `tier-mismatch` - Wrong tier
- `no-record` - No subscription record

### D. AI/LLM Integration

**Current Status**: Being refactored (from direct API calls to backend services)

**API Routes Status**:
- `/process-thought` - Returns 503 (not implemented)
- `/chat` - Returns 503 (not implemented)
- `/predict-investment` - Direct implementation (no backend)

**Cloud Functions**:
- `processThought` - Uses OpenAI (server-side)
- CSV processing - Uses OpenAI for enhancement
- Various features - Use OpenAI for insights

**Models Used**:
- Primary: GPT-4o (thought processing)
- Fallback: GPT-4o-mini (cheaper operations)
- Available: User configurable via settings

### E. File Storage Operations

**Photo Storage**:
- Upload to `gs://bucket/users/{uid}/photos/`
- Trigger `generatePhotoThumbnail` function
- Store metadata in Firestore

**CSV Storage**:
- Upload to `gs://bucket/spending/csv/{uid}/`
- Trigger `onCSVUpload` function
- Create batch queue for processing
- Store transactions in Firestore

**DEXA Scans**:
- Upload to `gs://bucket/bodyProgress/{uid}/`
- Trigger `onDexaScanUpload` function
- LLM extracts metrics
- Store in Firestore

### F. Limitation: Direct API Routes

**Token Usage API** (`/api/*`):
- No metrics collection
- Only used for spending operations proxy
- Most endpoints return 503 (unimplemented)

**Better Alternative**: Cloud Functions
- Built-in billing integration
- Rate limiting
- Better error handling
- Metrics collection

---

## 8. REFACTORING OPPORTUNITIES & RECOMMENDATIONS

### A. Immediate Pain Points

1. **API Routes** (3 routes need implementation)
   - `/process-thought` - Needs backend service
   - `/chat` - Needs backend service  
   - Create unified AI service

2. **Direct Firebase Calls**
   - Photo Feedback doesn't use gateway
   - Photo Library uses mixed approach
   - Standardize on gateway pattern

3. **Mixed Authentication**
   - Some routes use Bearer tokens
   - Some use verifyAiRequest
   - Create unified auth middleware

4. **Subscription Validation**
   - Spread across multiple stores
   - Move to centralized service
   - Cache at store level

### B. Backend Service Architecture

**Recommended Structure**:
```
backend/
├── services/
│   ├── ai/
│   │   ├── thoughProcessingService
│   │   ├── chatService
│   │   └── insightService
│   ├── billing/
│   │   ├── subscriptionService
│   │   └── usageService
│   ├── data/
│   │   ├── importExportService
│   │   └── bulkOperationService
│   └── integration/
│       ├── plaidService
│       ├── stripeService
│       └── externalApiService
├── middleware/
│   ├── auth
│   ├── validation
│   └── rateLimit
└── repositories/
    ├── firestoreRepository
    ├── storageRepository
    └── cacheRepository
```

### C. Data Consistency Improvements

1. **Transactional Operations**
   - Thought → Task creation should be atomic
   - Link creation should be atomic with source
   - Use Firestore transactions

2. **Event-Driven Updates**
   - Cloud Function triggers for metadata updates
   - Audit trail logging
   - Change tracking

3. **Cache Invalidation**
   - Explicit cache clearing after mutations
   - TTL-based cache expiry
   - Subscription-based invalidation

### D. Firebase Resilience

**Current**: Good, but not universally used
**Recommendation**:
- Enforce gateway usage for all CRUD
- Create wrapper stores that extend Zustand
- Add automatic retry/offline queuing

### E. Monitoring & Observability

**Current**: Partial (LLM logging)
**Recommended**:
- Structured logging for all API calls
- Error tracking (Sentry/similar)
- Performance monitoring
- Usage metrics collection
- Health checks for external APIs

---

## 9. STORE DEPENDENCY GRAPH (Import Analysis)

### Heavy Dependencies
- `useEntityGraph` → 4+ other stores (for relationships)
- `useThoughts` → useEntityGraph, useTasks, useProjects
- `useSpending` → useTrips (for trip linking)
- `useFocus` → useTasks (for task management)

### Lightweight Stores (No dependencies)
- useMoods, useGoals, useProjects, useBodyProgress
- useAdmiredPeople, useFriends, usePlaces

### Mix In/Out
- useTrips: Used by useSpending, useInvestments
- useTasks: Used by useFocus, useEntityGraph
- useEntityGraph: Central hub for relationships

---

## 10. TECHNOLOGY DEBT & LEGACY CODE

1. **useDatingFeedback.ts** - Legacy photo feedback
   - Functionality moved to usePhotoFeedback
   - Still in codebase (553 LOC)
   - Candidates for deprecation

2. **Local Storage vs Firebase**
   - useCalendar: Purely local
   - useTokenUsage: Local only
   - useSettings: Persisted locally
   - **Recommendation**: Move to Firestore for sync

3. **Mixed Patterns in Stores**
   - Some use subscribeCol, some use direct queries
   - Some handle errors explicitly, some don't
   - **Recommendation**: Create base store class

4. **Undefined Value Handling**
   - Gateway has removeUndefined() function
   - Not enforced everywhere
   - Can cause silent failures

---

## 11. SECURITY CONSIDERATIONS

### Current Implementation

1. **Row-Level Security** (Firestore Rules)
   - Users can only access own documents
   - Admin functions verified via context.auth

2. **API Key Management**
   - Alpha Vantage (public tier)
   - OpenAI (needs rotation)
   - Stripe (in secrets)
   - Plaid (in secrets)

3. **Authentication**
   - Firebase Auth tokens
   - App Check for client validation
   - Anonymous session timeout

### Gaps Identified

1. **API Route Validation**
   - Limited input validation
   - No schema validation
   - No rate limiting on some routes

2. **Cloud Function Logging**
   - Some functions log user data
   - No redaction of sensitive fields
   - Recommendation: Add audit logging

3. **Token Management**
   - No token refresh in frontend API routes
   - Bearer token sent in plain text (over HTTPS only)
   - No token rotation mechanism

---

## 12. PERFORMANCE CONSIDERATIONS

### Store Update Patterns

1. **Subscription-Based** (Good for real-time)
   - Tasks, Thoughts, Spending, etc.
   - Automatic updates via listeners
   - Can cause excessive re-renders if not memoized

2. **Manual Updates** (Good for UI-driven)
   - Calendar (local state)
   - Settings (persisted locally)
   - Reduces Firebase operations

3. **Hybrid** (Photo Feedback)
   - Real-time subscriptions
   - Direct Storage operations
   - Batch updates for votes

### Optimization Opportunities

1. **Query Optimization**
   - Add Firestore indexes
   - Use collection groups for entity graph
   - Implement pagination for large collections

2. **Component Memoization**
   - Use React.memo for list items
   - Memoize selector functions in Zustand
   - Avoid inline selectors

3. **Lazy Loading**
   - Lazy load store subscriptions
   - Implement virtual scrolling for long lists
   - Defer non-critical updates

---

## SUMMARY TABLE: Current Architecture Strengths & Gaps

| Aspect | Strength | Gap |
|--------|----------|-----|
| **Real-Time Sync** | ✅ Firebase subscriptions | ⚠️ Offline queue not always used |
| **Error Handling** | ✅ Resilience layer | ⚠️ Not consistently applied |
| **AI Integration** | ✅ Cloud Functions | ❌ API routes unimplemented |
| **Authentication** | ✅ Firebase Auth | ⚠️ Mixed validation patterns |
| **Data Consistency** | ✅ Firestore ACID | ⚠️ No transactional operations |
| **Type Safety** | ✅ TypeScript throughout | ⚠️ Some `any` types remain |
| **Testing** | ✅ Jest tests exist | ⚠️ Coverage gaps in stores |
| **Documentation** | ✅ CLAUDE.md exists | ⚠️ Cloud Functions undocumented |
| **Monitoring** | ⚠️ Partial logging | ❌ No centralized observability |
| **API Design** | ✅ RESTful pattern | ⚠️ Inconsistent auth |
