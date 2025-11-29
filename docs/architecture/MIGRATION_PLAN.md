# Focus Notebook: Firebase to Go Backend Migration Plan

> **Comprehensive step-by-step guide to migrate from frontend-heavy Firebase to a robust Go backend**

**Last Updated:** 2025-11-23
**Status:** In Progress
**Estimated Timeline:** 12-16 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Migration Goals](#migration-goals)
4. [What's Already Implemented](#whats-already-implemented)
5. [What's Missing](#whats-missing)
6. [Migration Strategy](#migration-strategy)
7. [Phase-by-Phase Plan](#phase-by-phase-plan)
8. [Frontend Migration Steps](#frontend-migration-steps)
9. [Testing Strategy](#testing-strategy)
10. [Rollback Plan](#rollback-plan)
11. [Cost-Benefit Analysis](#cost-benefit-analysis)
12. [Risk Assessment](#risk-assessment)

---

## Executive Summary

Focus Notebook currently relies heavily on Firebase for:
- **Frontend:** Direct Firestore queries (35+ collections), real-time subscriptions (28 collections), Storage operations
- **Backend:** 40+ Cloud Functions for AI, billing, banking, scheduled jobs

**Migration Approach:**
1. Build Go backend with REST/GraphQL API
2. Maintain Firebase Auth, Firestore, and Storage (for now)
3. Replace Cloud Functions with Go services
4. Gradually migrate frontend from direct Firestore access to API calls
5. Optionally migrate to PostgreSQL + S3 (future phase)

**Key Benefit:** 94% cost savings, better performance, easier development, better security

---

## Current Architecture Analysis

### Frontend (Next.js + Firebase)

**Direct Firebase Dependencies:**
- **35 Zustand stores** making direct Firestore queries
- **28 real-time subscriptions** for live data updates
- **Firebase Auth** for authentication (Google OAuth, Email/Password, Anonymous)
- **Firebase Storage** for photos, CSV files, DEXA scans
- **Offline-first** architecture with Firestore persistence

**Firebase Resilience Layer:**
- Circuit breaker pattern
- Retry logic with exponential backoff
- Offline queue
- Subscription health monitoring
- Connection monitoring
- Metrics collection

### Backend (Firebase Cloud Functions)

**40+ Cloud Functions:**

| Category | Functions | Status |
|----------|-----------|--------|
| **AI Processing** | 6 functions (thought processing, place insights, chat) | ⚠️ Partial |
| **Billing (Stripe)** | 8 functions (checkout, portal, webhooks, invoices) | ✅ Complete |
| **Banking (Plaid)** | 6 functions (link token, sync, webhooks) | ✅ Complete |
| **Spending** | 9 functions (CSV processing, categorization, trip linking) | ⚠️ Partial |
| **Investment** | 3 functions (market data, portfolio snapshots) | ⚠️ Partial |
| **Travel & Visa** | 4 functions (visa updates, packing lists) | ❌ Missing |
| **Photo Management** | 5 functions (thumbnails, voting, CDN URLs) | ❌ Missing |
| **Body Progress** | 1 function (DEXA scan processing) | ❌ Missing |
| **Maintenance** | 1 function (anonymous cleanup) | ❌ Missing |

**Total:** 43+ functions across 9 categories

---

## Migration Goals

### Primary Goals

1. **Replace Cloud Functions** - Move all 40+ functions to Go backend
2. **API Gateway** - Create unified REST/GraphQL API for frontend
3. **Reduce Frontend Complexity** - Remove direct Firestore access from frontend
4. **Maintain Real-time Features** - Implement WebSocket/SSE for live updates
5. **Improve Performance** - Compiled Go vs. cold-start JavaScript
6. **Better Security** - Centralized authorization logic
7. **Cost Savings** - 94% reduction in function costs

### Non-Goals (For Now)

- ❌ Migrate away from Firebase Auth (keep it, works great)
- ❌ Migrate away from Firestore (keep it, optionally migrate later)
- ❌ Migrate away from Firebase Storage (keep it, optionally migrate later)
- ❌ Rewrite frontend (keep React/Next.js)

---

## What's Already Implemented

### ✅ Core Infrastructure (Go Backend)

**Location:** `/backend-go`

1. **HTTP Server** (`cmd/server/main.go`)
   - Gorilla Mux router
   - Graceful shutdown
   - Configurable timeouts
   - CORS middleware
   - Prometheus metrics

2. **Authentication Middleware** (`internal/middleware/auth.go`)
   - Firebase token verification
   - User context injection
   - Anonymous session support
   - AI access control
   - Subscription validation

3. **Repository Layer** (`internal/repository/firestore.go`)
   - Firestore CRUD operations
   - Metadata injection (createdAt, updatedBy, version)
   - Mock repository for testing

4. **External Clients** (`internal/clients/`)
   - ✅ OpenAI client
   - ✅ Anthropic client
   - ✅ Stripe client
   - ✅ Plaid client
   - ✅ Rate limiter

### ✅ Implemented Services

| Service | File | Features | Status |
|---------|------|----------|--------|
| **Thought Processing** | `services/thought_processing.go` | AI processing, reprocessing, revert | ✅ Complete |
| **Stripe Billing** | `services/stripe_billing.go` | Checkout, portal, webhooks, invoices | ✅ Complete |
| **Plaid** | `services/plaid.go` | Link token, sync, webhooks | ✅ Complete |
| **Dashboard Analytics** | `services/dashboard_analytics.go` | Dashboard calculations | ✅ Complete |
| **Spending Analytics** | `services/spending_analytics.go` | Spending insights | ✅ Complete |
| **Investment Calculations** | `services/investment_calculations.go` | Portfolio metrics, projections | ✅ Complete |
| **Entity Graph** | `services/entity_graph.go` | Relationship queries | ✅ Complete |
| **Import/Export** | `services/import_export.go` | Data import/export | ✅ Complete |
| **Subscription** | `services/subscription.go` | Subscription validation | ✅ Complete |
| **Action Processor** | `services/action_processor.go` | CBT action processing | ✅ Complete |
| **Context Gatherer** | `services/context_gatherer.go` | AI context gathering | ✅ Complete |

### ✅ Implemented API Endpoints

**Health & Metrics:**
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

**Thought Processing:**
- `POST /api/process-thought`
- `POST /api/reprocess-thought`
- `POST /api/revert-thought-processing`

**Stripe Billing:**
- `POST /api/stripe/webhook`
- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/create-portal-session`
- `GET /api/stripe/invoices`
- `GET /api/stripe/payment-method`
- `POST /api/stripe/reactivate-subscription`
- `GET /api/stripe/usage-stats`

**Plaid Banking:**
- `POST /api/plaid/webhook`
- `POST /api/plaid/create-link-token`
- `POST /api/plaid/exchange-public-token`
- `POST /api/plaid/create-relink-token`
- `POST /api/plaid/mark-relinking`
- `POST /api/plaid/trigger-sync`

**Analytics:**
- `GET /api/analytics/dashboard`
- `GET /api/analytics/spending`

**Import/Export:**
- `POST /api/import/validate`
- `POST /api/import/execute`
- `GET /api/export`
- `GET /api/export/summary`

**Investment:**
- `GET /api/portfolio/{portfolioId}/metrics`
- `GET /api/portfolio/{portfolioId}/snapshots`
- `POST /api/portfolio/projection`
- `GET /api/portfolio/summary`

**Entity Graph:**
- `GET /api/entity-graph/relationships`
- `POST /api/entity-graph/relationships`
- `GET /api/entity-graph/linked/{entityType}/{entityId}`
- `GET /api/entity-graph/tools`
- `GET /api/entity-graph/stats`

**Total:** 30+ endpoints implemented

---

## What's Missing

### ❌ Missing API Endpoints (Critical)

| Endpoint | Used By | Priority | Complexity |
|----------|---------|----------|------------|
| `POST /api/chat` | Chat interface | 🔴 High | Medium |
| `POST /api/spending/categorize` | Spending tool | 🔴 High | Low |
| `POST /api/spending/link-trip` | Spending tool | 🔴 High | Low |
| `POST /api/spending/delete-csv` | Spending tool | 🟡 Medium | Low |
| `POST /api/spending/delete-all` | Spending tool | 🟡 Medium | Low |
| `POST /api/spending/process-csv` | CSV upload | 🔴 High | High |
| `POST /api/predict-investment` | Investment tool | 🟡 Medium | Medium |
| `GET /api/stock-price` | Investment tool | 🔴 High | Low |
| `GET /api/stock-history` | Investment tool | 🔴 High | Low |
| `POST /api/photo/vote` | Photo feedback | 🔴 High | Low |
| `GET /api/photo/next-pair` | Photo feedback | 🔴 High | Medium |
| `GET /api/photo/signed-url` | Photo library | 🔴 High | Low |
| `POST /api/packing-list/create` | Trip planning | 🟡 Medium | Medium |
| `POST /api/packing-list/update` | Trip planning | 🟡 Medium | Low |
| `POST /api/packing-list/toggle-item` | Trip planning | 🟡 Medium | Low |
| `POST /api/place-insights` | Place tool | 🟢 Low | Medium |
| `GET /api/visa-requirements` | Visa finder | 🟡 Medium | Low |

### ❌ Missing Services

| Service | Purpose | Priority | Complexity |
|---------|---------|----------|------------|
| **Photo Service** | Thumbnail generation, CDN URLs, voting | 🔴 High | High |
| **CSV Processing Service** | Parse & process bank statements | 🔴 High | High |
| **DEXA Scan Service** | Process body scan PDFs | 🟡 Medium | High |
| **Packing List Service** | AI-powered packing list generation | 🟡 Medium | Medium |
| **Place Insights Service** | AI-powered place insights | 🟢 Low | Medium |
| **Trip Linking Service** | Auto-link transactions to trips | 🟡 Medium | Medium |
| **Subscription Detection Service** | Detect recurring subscriptions | 🟡 Medium | Medium |
| **Transaction Categorization Service** | AI-powered categorization | 🔴 High | Medium |
| **Market Data Service** | Stock price updates | 🔴 High | Low |
| **Visa Data Service** | Visa requirement updates | 🟡 Medium | Low |
| **Stock Service** | Real-time stock data | 🔴 High | Low |
| **Chat Service** | AI chat interface | 🔴 High | Medium |

### ❌ Missing Background Workers

| Worker | Purpose | Trigger | Priority |
|--------|---------|---------|----------|
| **Market Data Worker** | Update stock prices | Hourly | 🔴 High |
| **Portfolio Snapshot Worker** | Daily portfolio snapshots | Daily | 🟡 Medium |
| **Visa Data Worker** | Update visa requirements | Weekly | 🟢 Low |
| **Anonymous Cleanup Worker** | Clean expired sessions | Daily | 🟡 Medium |
| **Subscription Detection Worker** | Detect subscriptions | Daily | 🟡 Medium |
| **Monthly Rollup Worker** | Monthly spending summaries | Monthly | 🟢 Low |

### ❌ Missing Storage Triggers

| Trigger | Purpose | Handler | Priority |
|---------|---------|---------|----------|
| CSV Upload | Process bank statement | `onCSVUpload` | 🔴 High |
| Photo Upload | Generate thumbnails | `onPhotoUpload` | 🔴 High |
| DEXA Upload | Process scan PDF | `onDexaUpload` | 🟡 Medium |

### ❌ Missing Real-time Features

Currently, the Go backend doesn't handle real-time data sync. The frontend still needs:
- **WebSocket/SSE** for real-time updates (replace Firestore subscriptions)
- **Pub/Sub** for cross-client synchronization
- **Change streams** for data change notifications

**Options:**
1. Keep Firestore subscriptions (easiest, but defeats purpose)
2. Implement WebSocket server in Go
3. Use third-party service (Ably, Pusher)
4. Implement Server-Sent Events (SSE)

---

## Migration Strategy

### Approach: Gradual, Service-by-Service Migration

**Principle:** Migrate one service at a time, validate, then move to the next.

**Why Gradual?**
- ✅ Lower risk
- ✅ Easier rollback
- ✅ Continuous delivery
- ✅ Learn and adapt

**Why Not "Big Bang"?**
- ❌ High risk
- ❌ Long testing period
- ❌ Difficult rollback
- ❌ All-or-nothing deployment

### Compatibility Layer

**Keep Firebase for:**
- Authentication (Firebase Auth)
- Data storage (Firestore)
- File storage (Firebase Storage)
- Real-time subscriptions (during migration)

**Go Backend Responsibilities:**
- Business logic
- AI processing
- External API integration (Stripe, Plaid)
- Background jobs
- Data aggregation/analytics

### Migration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                    (Next.js + React)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│                      (Next.js API Routes)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Route traffic to:                                       │ │
│  │ - Go Backend (new)                                      │ │
│  │ - Firebase Functions (legacy, gradually removed)       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                   │                          │
         ┌─────────┴──────────┐   ┌──────────┴────────────┐
         ▼                    ▼   ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   GO BACKEND     │  │ FIREBASE FUNCTIONS│  │  FIREBASE AUTH   │
│   (New Services) │  │  (Deprecated)     │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         │                    │                       │
         └────────────────────┴───────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────┐
         │          FIREBASE FIRESTORE                 │
         │          (Data Storage)                     │
         └────────────────────────────────────────────┘
         │          FIREBASE STORAGE                   │
         │          (File Storage)                     │
         └────────────────────────────────────────────┘
```

---

## Phase-by-Phase Plan

### Phase 1: Infrastructure & Foundation (Weeks 1-2)

**Goal:** Complete backend infrastructure and deployment pipeline

**Tasks:**

1. **Complete Worker Infrastructure** ⏱️ 3 days
   - [ ] Create `cmd/worker/main.go` entry point
   - [ ] Implement worker scheduler
   - [ ] Add graceful shutdown
   - [ ] Add health monitoring

2. **Set Up CI/CD** ⏱️ 2 days
   - [ ] GitHub Actions workflow for Go tests
   - [ ] GitHub Actions workflow for Go build
   - [ ] Docker build pipeline
   - [ ] Cloud Run deployment pipeline

3. **Environment Configuration** ⏱️ 1 day
   - [ ] Production config file
   - [ ] Staging config file
   - [ ] Secret management (Google Secret Manager)
   - [ ] Environment variable validation

4. **Observability** ⏱️ 2 days
   - [ ] Prometheus metrics dashboard
   - [ ] Structured logging (Zap)
   - [ ] Error tracking (Sentry)
   - [ ] Performance monitoring

5. **Testing Infrastructure** ⏱️ 2 days
   - [ ] Integration test framework
   - [ ] Firebase emulator setup
   - [ ] Test data builders
   - [ ] Mock external services

**Deliverables:**
- ✅ Worker service running
- ✅ CI/CD pipeline functional
- ✅ Monitoring dashboards
- ✅ 80%+ test coverage

**Success Criteria:**
- Go backend deploys automatically on merge
- All tests pass in CI
- Metrics visible in Prometheus

---

### Phase 2: Critical API Endpoints (Weeks 3-5)

**Goal:** Implement missing high-priority endpoints

#### Week 3: Stock & Investment APIs

**Tasks:**

1. **Stock Service** ⏱️ 3 days
   - [ ] Implement `services/stock.go`
   - [ ] Alpha Vantage client wrapper
   - [ ] Redis caching layer
   - [ ] Rate limiting
   - [ ] Error handling

2. **Stock API Endpoints** ⏱️ 2 days
   - [ ] `GET /api/stock-price`
   - [ ] `GET /api/stock-history`
   - [ ] `POST /api/predict-investment`
   - [ ] Unit tests
   - [ ] Integration tests

**Deliverables:**
- Stock APIs functional
- Investment predictions working

#### Week 4: Spending & Transaction APIs

**Tasks:**

1. **Transaction Categorization Service** ⏱️ 3 days
   - [ ] Port from Cloud Function
   - [ ] AI-powered categorization
   - [ ] Rule-based fallback
   - [ ] Subscription detection

2. **CSV Processing Service** ⏱️ 4 days
   - [ ] CSV parser
   - [ ] Transaction deduplication
   - [ ] Bank format detection
   - [ ] Batch processing
   - [ ] Storage trigger handler

3. **Spending API Endpoints** ⏱️ 3 days
   - [ ] `POST /api/spending/categorize`
   - [ ] `POST /api/spending/link-trip`
   - [ ] `POST /api/spending/delete-csv`
   - [ ] `POST /api/spending/process-csv`
   - [ ] Unit tests

**Deliverables:**
- Spending APIs functional
- CSV processing working

#### Week 5: Photo & Chat APIs

**Tasks:**

1. **Photo Service** ⏱️ 4 days
   - [ ] Implement `services/photo.go`
   - [ ] Thumbnail generation (Sharp equivalent)
   - [ ] Elo rating algorithm
   - [ ] CDN URL signing
   - [ ] Storage trigger handler

2. **Photo API Endpoints** ⏱️ 2 days
   - [ ] `POST /api/photo/vote`
   - [ ] `GET /api/photo/next-pair`
   - [ ] `GET /api/photo/signed-url`
   - [ ] Unit tests

3. **Chat Service** ⏱️ 3 days
   - [ ] Implement `services/chat.go`
   - [ ] Conversation history management
   - [ ] Context injection
   - [ ] Streaming responses

4. **Chat API Endpoint** ⏱️ 1 day
   - [ ] `POST /api/chat`
   - [ ] WebSocket support (optional)
   - [ ] Unit tests

**Deliverables:**
- Photo voting functional
- AI chat working

**Success Criteria for Phase 2:**
- All critical endpoints implemented
- 80%+ test coverage
- Response time <500ms (p95)

---

### Phase 3: Background Workers (Weeks 6-7)

**Goal:** Implement scheduled background jobs

#### Week 6: Market Data & Portfolio Workers

**Tasks:**

1. **Market Data Worker** ⏱️ 3 days
   - [ ] Implement hourly stock price updates
   - [ ] Batch ticker processing
   - [ ] Error handling & retry
   - [ ] Metrics & monitoring

2. **Portfolio Snapshot Worker** ⏱️ 2 days
   - [ ] Daily portfolio value calculation
   - [ ] Historical data storage
   - [ ] Performance metrics

3. **Anonymous Cleanup Worker** ⏱️ 2 days
   - [ ] Identify expired anonymous users
   - [ ] Delete user data
   - [ ] Clean up storage files
   - [ ] Logging & metrics

**Deliverables:**
- Stock prices update automatically
- Portfolio snapshots generated daily

#### Week 7: Visa Data & Subscription Workers

**Tasks:**

1. **Visa Data Worker** ⏱️ 3 days
   - [ ] Port visa scraping logic
   - [ ] Weekly update schedule
   - [ ] Change detection
   - [ ] Error logging

2. **Subscription Detection Worker** ⏱️ 3 days
   - [ ] Analyze transactions for patterns
   - [ ] Detect recurring charges
   - [ ] Create subscription records
   - [ ] Notify users

**Deliverables:**
- Visa data updates automatically
- Subscriptions detected automatically

**Success Criteria for Phase 3:**
- All workers running on schedule
- No missed executions
- Error rate <1%

---

### Phase 4: Storage Triggers (Weeks 8-9)

**Goal:** Replace Firebase Storage triggers with Cloud Storage triggers

#### Week 8: Photo & CSV Triggers

**Tasks:**

1. **Cloud Storage Trigger Setup** ⏱️ 2 days
   - [ ] Configure Google Cloud Storage triggers
   - [ ] Set up Pub/Sub topics
   - [ ] Implement trigger handlers in Go

2. **Photo Upload Trigger** ⏱️ 3 days
   - [ ] Detect photo uploads
   - [ ] Generate thumbnails (3 sizes)
   - [ ] Update Firestore metadata
   - [ ] Error handling

3. **CSV Upload Trigger** ⏱️ 3 days
   - [ ] Detect CSV uploads
   - [ ] Trigger processing job
   - [ ] Update processing status
   - [ ] Error handling

**Deliverables:**
- Photo thumbnails generated on upload
- CSV files processed on upload

#### Week 9: DEXA Scan Trigger

**Tasks:**

1. **DEXA Scan Service** ⏱️ 4 days
   - [ ] PDF parsing library (pdfcpu or similar)
   - [ ] Extract body composition data
   - [ ] Store in Firestore
   - [ ] Error handling

2. **DEXA Upload Trigger** ⏱️ 2 days
   - [ ] Detect DEXA scan uploads
   - [ ] Trigger processing
   - [ ] Update status in Firestore

**Deliverables:**
- DEXA scans processed automatically

**Success Criteria for Phase 4:**
- All storage triggers working
- Processing time <30s (p95)
- Error rate <0.5%

---

### Phase 5: Medium-Priority Services (Weeks 10-11)

**Goal:** Implement remaining medium-priority features

#### Week 10: Packing Lists & Trip Linking

**Tasks:**

1. **Packing List Service** ⏱️ 4 days
   - [ ] Port from Cloud Function
   - [ ] AI prompt templates
   - [ ] Context gathering (destination, duration, activities)
   - [ ] Template management

2. **Packing List API Endpoints** ⏱️ 2 days
   - [ ] `POST /api/packing-list/create`
   - [ ] `POST /api/packing-list/update`
   - [ ] `POST /api/packing-list/toggle-item`
   - [ ] Unit tests

3. **Trip Linking Service** ⏱️ 3 days
   - [ ] Analyze transactions for trip patterns
   - [ ] Suggest trip links
   - [ ] Auto-link with confidence threshold
   - [ ] API endpoints

**Deliverables:**
- Packing lists generated by AI
- Transactions linked to trips

#### Week 11: Place Insights & Visa API

**Tasks:**

1. **Place Insights Service** ⏱️ 3 days
   - [ ] Port from Cloud Function
   - [ ] AI-powered insights generation
   - [ ] Context gathering
   - [ ] API endpoint

2. **Visa Requirements API** ⏱️ 2 days
   - [ ] `GET /api/visa-requirements`
   - [ ] Query visa data collection
   - [ ] Caching layer

**Deliverables:**
- Place insights working
- Visa API functional

**Success Criteria for Phase 5:**
- All medium-priority features done
- No regressions in existing features

---

### Phase 6: Frontend Migration - API Client (Weeks 12-13)

**Goal:** Create unified API client for frontend

#### Week 12: API Client Library

**Tasks:**

1. **Create API Client** ⏱️ 4 days
   - [ ] Create `src/lib/api/client.ts`
   - [ ] HTTP client with retry & timeout
   - [ ] Authentication header injection
   - [ ] Error handling
   - [ ] TypeScript types for all endpoints

2. **API Client Methods** ⏱️ 4 days
   - [ ] Thought processing methods
   - [ ] Stock methods
   - [ ] Spending methods
   - [ ] Photo methods
   - [ ] Chat methods
   - [ ] All other endpoints

**Example Structure:**
```typescript
// src/lib/api/client.ts
export class ApiClient {
  async processThought(thoughtId: string, options?: ProcessOptions): Promise<ProcessedThought> {
    return this.post('/api/process-thought', { thoughtId, ...options });
  }

  async getStockPrice(ticker: string): Promise<StockPrice> {
    return this.get(`/api/stock-price?ticker=${ticker}`);
  }

  // ... all endpoints
}

// Usage in stores
const apiClient = new ApiClient(firebaseAuth);
const result = await apiClient.processThought(thoughtId);
```

**Deliverables:**
- API client library complete
- TypeScript types for all endpoints
- Unit tests

#### Week 13: Update API Routes to Use Go Backend

**Tasks:**

1. **Update Next.js API Routes** ⏱️ 5 days
   - [ ] Update `/api/process-thought/route.ts` to proxy to Go
   - [ ] Update `/api/stock-price/route.ts` to proxy to Go
   - [ ] Update all other API routes
   - [ ] Add feature flags for gradual rollout

**Example:**
```typescript
// src/app/api/process-thought/route.ts
export async function POST(request: NextRequest) {
  const featureFlags = await getFeatureFlags();

  if (featureFlags.useGoBackend) {
    // New: Proxy to Go backend
    return proxyToGoBackend(request, '/api/process-thought');
  } else {
    // Legacy: Call Firebase Function
    return callFirebaseFunction('processThought', request);
  }
}
```

2. **Feature Flags** ⏱️ 2 days
   - [ ] Implement feature flag system
   - [ ] Add flags for each migrated endpoint
   - [ ] Admin UI for toggling flags

**Deliverables:**
- API routes proxy to Go backend
- Feature flags for gradual rollout

**Success Criteria for Phase 6:**
- API client working for all endpoints
- No breaking changes to frontend
- Feature flags functional

---

### Phase 7: Frontend Migration - Remove Direct Firestore Access (Weeks 14-16)

**Goal:** Gradually migrate Zustand stores from direct Firestore queries to API calls

**This is the most complex phase and highest risk.**

#### Strategy: One Store at a Time

**Approach:**
1. Pick a low-risk store (e.g., `useVisaFinder`)
2. Refactor to use API client
3. Test thoroughly
4. Deploy with feature flag
5. Monitor for errors
6. Roll out to 100%
7. Remove old code
8. Repeat for next store

#### Week 14: Low-Risk Stores (Read-Only)

**Stores to Migrate:**
- `useVisaFinder` (read-only, no subscriptions)
- `usePlaces` (mostly read)
- `useAdmiredPeople` (low usage)

**Tasks:**

1. **Refactor Store Pattern** ⏱️ 2 days
   - [ ] Create `createApiStore` helper
   - [ ] Handle loading states
   - [ ] Handle errors
   - [ ] Caching layer

2. **Migrate Stores** ⏱️ 4 days
   - [ ] Migrate `useVisaFinder`
   - [ ] Migrate `usePlaces`
   - [ ] Migrate `useAdmiredPeople`
   - [ ] Add tests

**Before (Direct Firestore):**
```typescript
// src/store/useVisaFinder.ts
export const useVisaFinder = create<VisaFinderState>((set, get) => ({
  requirements: [],
  isLoading: false,

  async fetchRequirements(passportCountry: string) {
    set({ isLoading: true });
    const snapshot = await getDocs(
      query(collection(db, 'visa_requirements'), where('passport', '==', passportCountry))
    );
    const requirements = snapshot.docs.map(doc => doc.data());
    set({ requirements, isLoading: false });
  },
}));
```

**After (API Client):**
```typescript
// src/store/useVisaFinder.ts
export const useVisaFinder = create<VisaFinderState>((set, get) => ({
  requirements: [],
  isLoading: false,

  async fetchRequirements(passportCountry: string) {
    set({ isLoading: true });
    const requirements = await apiClient.getVisaRequirements(passportCountry);
    set({ requirements, isLoading: false });
  },
}));
```

**Deliverables:**
- 3 stores migrated
- No regressions

#### Week 15: Medium-Risk Stores (Read-Write, No Subscriptions)

**Stores to Migrate:**
- `usePhotoLibrary` (no subscriptions)
- `useUsageStats` (no subscriptions)
- `useCurrency` (client-only)

**Tasks:**

1. **Migrate Stores** ⏱️ 5 days
   - [ ] Migrate `usePhotoLibrary`
   - [ ] Migrate `useUsageStats`
   - [ ] Update all usage sites
   - [ ] Add tests

**Deliverables:**
- 3 more stores migrated

#### Week 16: High-Risk Planning & Strategy

**Goal:** Plan for migrating stores with real-time subscriptions

**Challenge:** 28 stores use Firestore real-time subscriptions. These need a different approach.

**Options:**

**Option A: Keep Firestore Subscriptions (Easiest)**
- Frontend keeps Firestore subscriptions for real-time data
- Go backend only handles:
  - Mutations (create, update, delete)
  - Complex queries
  - Business logic
  - External API integration
- **Pros:** Minimal frontend changes, real-time still works
- **Cons:** Still dependent on Firestore, doesn't fully move to API

**Option B: WebSocket/SSE (More Work)**
- Implement WebSocket or Server-Sent Events in Go
- Frontend subscribes to Go backend for updates
- Go backend watches Firestore changes and pushes to clients
- **Pros:** Fully moves to API, more control
- **Cons:** Significant work, need to handle connection management, reconnection, etc.

**Option C: Polling (Simple)**
- Frontend polls API periodically for updates
- **Pros:** Simple to implement
- **Cons:** Not real-time, more API calls, higher latency

**Recommendation: Start with Option A, gradually move to Option B**

**Tasks:**

1. **Research & Prototyping** ⏱️ 3 days
   - [ ] Research WebSocket libraries (gorilla/websocket)
   - [ ] Prototype WebSocket server
   - [ ] Prototype frontend WebSocket client
   - [ ] Test with one store

2. **Document Migration Strategy** ⏱️ 2 days
   - [ ] Document approach for each store
   - [ ] Identify dependencies
   - [ ] Risk assessment
   - [ ] Timeline

**Deliverables:**
- WebSocket prototype working
- Migration strategy documented

**Success Criteria for Phase 7:**
- 6+ stores migrated to API
- Real-time subscription strategy defined
- No production issues

---

### Phase 8: Real-time Subscriptions (Future)

**Goal:** Replace Firestore subscriptions with WebSocket/SSE

**This is a major phase that needs its own detailed planning.**

**High-Level Approach:**

1. **WebSocket Server** (Go)
   - Connection management
   - Authentication
   - Room-based subscriptions (per user)
   - Firestore change listeners
   - Push updates to clients

2. **WebSocket Client** (Frontend)
   - Connection management
   - Reconnection logic
   - Message handling
   - Integration with Zustand stores

3. **Migration Process**
   - Migrate one store at a time
   - A/B test with feature flags
   - Monitor for issues
   - Gradual rollout

**Estimated Timeline:** 6-8 weeks (separate project)

---

## Frontend Migration Steps

### Step-by-Step Store Migration Checklist

For each Zustand store being migrated:

**1. Preparation**
- [ ] Identify all Firestore queries in the store
- [ ] List all components using the store
- [ ] Create API client methods for all operations
- [ ] Write integration tests

**2. Refactor Store**
- [ ] Replace Firestore calls with API calls
- [ ] Keep the same store interface (no breaking changes)
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add optimistic updates (optional)

**3. Testing**
- [ ] Unit tests for store
- [ ] Integration tests with API
- [ ] E2E tests for critical flows
- [ ] Manual testing

**4. Feature Flag**
- [ ] Add feature flag for new store
- [ ] Deploy with flag OFF
- [ ] Test in production (flag ON for admins)

**5. Gradual Rollout**
- [ ] 10% of users
- [ ] Monitor errors, performance
- [ ] 50% of users
- [ ] Monitor
- [ ] 100% of users

**6. Cleanup**
- [ ] Remove old Firestore code
- [ ] Remove feature flag
- [ ] Update documentation

---

## Testing Strategy

### Unit Tests (Go Backend)

**Requirements:**
- 80%+ code coverage
- All services have tests
- All handlers have tests
- Mock external dependencies

**Tools:**
- Go testing package
- `github.com/stretchr/testify`
- Mock repository for testing

**Example:**
```go
func TestThoughtProcessing(t *testing.T) {
    mockRepo := &mocks.MockRepository{}
    mockOpenAI := &mocks.MockOpenAIClient{}

    service := services.NewThoughtProcessingService(
        mockRepo, mockOpenAI, nil, nil, nil, nil,
    )

    result, err := service.ProcessThought(context.Background(), "user123", "thought123")

    assert.NoError(t, err)
    assert.NotNil(t, result)
}
```

### Integration Tests (Go Backend)

**Requirements:**
- Test with Firebase Emulator
- Test with real external APIs (sandbox mode)
- Test error scenarios

**Tools:**
- Firebase Emulator
- Docker Compose for test environment

### End-to-End Tests (Frontend)

**Requirements:**
- Test critical user flows
- Test with Go backend (not Firebase Functions)
- Test offline scenarios
- Test error scenarios

**Tools:**
- Playwright
- Firebase Emulator

**Critical Flows:**
- User signup → create thought → process with AI
- Connect bank account → sync transactions → categorize
- Create portfolio → add stocks → see performance
- Upload photo → vote on photos → see results

### Load Testing

**Requirements:**
- Test at 10x current load
- Identify bottlenecks
- Optimize hot paths

**Tools:**
- `hey` (HTTP load testing)
- `k6` (advanced scenarios)
- Prometheus + Grafana (monitoring)

**Scenarios:**
- 1000 concurrent users
- 10,000 requests/second
- Sustained load for 1 hour

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

**Trigger:** Critical production issue

**Steps:**
1. Toggle feature flag to route traffic back to Firebase Functions
2. Monitor error rates
3. Investigate issue
4. Fix and re-deploy

### Gradual Rollback

**Trigger:** Elevated error rate, degraded performance

**Steps:**
1. Reduce traffic percentage to Go backend (100% → 50% → 10% → 0%)
2. Monitor metrics at each step
3. Investigate issue offline
4. Fix and re-deploy

### Full Rollback (Abort Migration)

**Trigger:** Unfixable architectural issue

**Steps:**
1. Route all traffic to Firebase Functions
2. Deprecate Go backend
3. Keep as learning experience
4. Revisit migration strategy

**Prevention:**
- Thorough testing before each phase
- Small incremental changes
- Feature flags for all migrations
- Comprehensive monitoring

---

## Cost-Benefit Analysis

### Current Costs (Firebase Functions)

**Assumptions:**
- 5 million API calls/month
- Average function duration: 500ms
- Average memory: 256MB

**Firebase Functions Pricing:**
- Invocations: $0.40 per million
- Compute time: $0.0000025 per GB-second
- Network egress: $0.12 per GB

**Monthly Cost:**
```
Invocations: 5M × $0.40 = $2.00
Compute: 5M × 0.5s × 0.256GB × $0.0000025 = $160.00
Network: ~100GB × $0.12 = $12.00
Total: ~$174/month
```

### Projected Costs (Go Backend on Cloud Run)

**Assumptions:**
- 5 million API calls/month
- Average response time: 50ms (10x faster)
- Average memory: 512MB
- CPU: 1 vCPU

**Cloud Run Pricing:**
- Requests: $0.40 per million
- CPU time: $0.00002400 per vCPU-second
- Memory: $0.00000250 per GB-second

**Monthly Cost:**
```
Requests: 5M × $0.40 = $2.00
CPU: 5M × 0.05s × $0.00002400 = $6.00
Memory: 5M × 0.05s × 0.512GB × $0.00000250 = $0.32
Total: ~$8.32/month
```

**Savings: $165.68/month (95.2%)**

### Additional Savings

**Developer Time:**
- Faster development (Go vs. TypeScript)
- Easier debugging (compiled vs. interpreted)
- Better IDE support
- Fewer cold starts

**Performance:**
- 10x faster response times
- Lower latency
- Better user experience

**Scalability:**
- Better resource utilization
- More predictable costs
- Easier to optimize

---

## Risk Assessment

### High-Risk Areas

**1. Real-time Subscriptions**
- **Risk:** Breaking real-time features
- **Impact:** High (core functionality)
- **Mitigation:**
  - Keep Firestore subscriptions initially
  - Gradually migrate with WebSocket/SSE
  - Extensive testing
  - Feature flags

**2. Offline Support**
- **Risk:** Breaking offline-first architecture
- **Impact:** High (key selling point)
- **Mitigation:**
  - Implement offline queue in frontend
  - Use service workers for caching
  - Test offline scenarios thoroughly
  - Keep Firestore cache initially

**3. Data Consistency**
- **Risk:** Race conditions, stale data
- **Impact:** High (data integrity)
- **Mitigation:**
  - Optimistic concurrency control (version field)
  - Idempotency keys for mutations
  - Comprehensive testing
  - Rollback procedures

**4. Authentication**
- **Risk:** Breaking auth flows
- **Impact:** Critical (users can't log in)
- **Mitigation:**
  - Keep Firebase Auth (don't migrate)
  - Thorough token verification testing
  - Multiple auth method testing
  - Emergency rollback plan

### Medium-Risk Areas

**5. Performance Regression**
- **Risk:** Go backend slower than expected
- **Impact:** Medium (user experience)
- **Mitigation:**
  - Load testing before launch
  - Performance benchmarks
  - Caching layer
  - Database query optimization

**6. External API Integration**
- **Risk:** Breaking Stripe/Plaid/OpenAI integration
- **Impact:** Medium (features broken)
- **Mitigation:**
  - Sandbox testing
  - Idempotency
  - Retry logic
  - Webhook testing

### Low-Risk Areas

**7. Background Workers**
- **Risk:** Workers not running on schedule
- **Impact:** Low (not user-facing)
- **Mitigation:**
  - Monitoring & alerting
  - Manual trigger endpoints
  - Redundancy

---

## Success Metrics

### Performance Metrics

**Target Metrics:**
- **API Response Time:** <100ms (p50), <500ms (p95)
- **Error Rate:** <0.1%
- **Uptime:** 99.9%+
- **Cold Start Time:** <500ms

**Monitoring:**
- Prometheus + Grafana dashboards
- Real-time alerting (PagerDuty)
- Error tracking (Sentry)

### Business Metrics

**Target Metrics:**
- **Cost Reduction:** 90%+ vs. Firebase Functions
- **User Satisfaction:** No degradation in NPS
- **Developer Velocity:** 50% faster feature development
- **Incident Rate:** <1 per month

---

## Timeline Summary

| Phase | Duration | Focus | Risk |
|-------|----------|-------|------|
| Phase 1: Infrastructure | 2 weeks | Workers, CI/CD, monitoring | 🟢 Low |
| Phase 2: Critical APIs | 3 weeks | Stock, spending, photo, chat | 🟡 Medium |
| Phase 3: Background Workers | 2 weeks | Scheduled jobs | 🟢 Low |
| Phase 4: Storage Triggers | 2 weeks | File processing | 🟡 Medium |
| Phase 5: Medium-Priority | 2 weeks | Packing lists, visa, trip linking | 🟢 Low |
| Phase 6: API Client | 2 weeks | Frontend API client, feature flags | 🟡 Medium |
| Phase 7: Frontend Migration | 3 weeks | Migrate stores to API | 🔴 High |
| **Total** | **16 weeks** | | |

**Phase 8 (Real-time):** 6-8 weeks (separate project)

**Total Migration Time:** 22-24 weeks (5.5-6 months)

---

## Next Steps

### Immediate Actions (This Week)

1. **Review & Approve Plan** ⏱️ 1 day
   - [ ] Review this migration plan
   - [ ] Identify concerns
   - [ ] Get stakeholder buy-in

2. **Set Up Project** ⏱️ 1 day
   - [ ] Create project board (GitHub Projects)
   - [ ] Create issues for Phase 1 tasks
   - [ ] Set up milestones

3. **Start Phase 1** ⏱️ 3 days
   - [ ] Implement worker infrastructure
   - [ ] Set up CI/CD pipeline
   - [ ] Configure monitoring

### Weekly Cadence

**Every Monday:**
- Review last week's progress
- Plan current week's tasks
- Update project board

**Every Friday:**
- Demo completed features
- Review metrics
- Retrospective

### Monthly Reviews

**Every Month:**
- Review overall progress vs. plan
- Adjust timeline if needed
- Celebrate wins

---

## Conclusion

This migration plan provides a comprehensive roadmap to move Focus Notebook from a frontend-heavy Firebase architecture to a robust Go backend with REST APIs. The gradual, phase-by-phase approach minimizes risk while delivering value incrementally.

**Key Takeaways:**

1. **Already 30% Complete:** Significant Go backend infrastructure already exists
2. **16-Week Timeline:** Realistic timeline with buffer for unknowns
3. **Low Risk:** Gradual migration with feature flags and rollback plans
4. **High ROI:** 95% cost savings, better performance, easier development
5. **Maintainable:** Clear phases, good testing, comprehensive monitoring

**Recommendation:** Proceed with Phase 1 immediately. The infrastructure is solid and the migration strategy is sound.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-23
**Next Review:** 2025-12-07

**Questions or Concerns?** Contact the development team or open a GitHub issue.
