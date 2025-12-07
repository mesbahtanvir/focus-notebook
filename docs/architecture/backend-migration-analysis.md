# Backend Integration Migration Analysis

> **Goal**: Remove all direct Firebase communication from frontend. All data operations go through the Go backend. Replace Cloud Functions with backend-native processing.

## Executive Summary

| Component | Current State | Migration Required |
|-----------|--------------|-------------------|
| **Frontend → Firebase** | 35 Zustand stores directly call Firestore | Replace with REST API calls to backend |
| **Frontend → Backend** | NOT USED (returns 503) | Enable and use for all operations |
| **Cloud Functions** | 25+ functions (triggers, scheduled, callable) | Port to Go backend |
| **Real-time Subscriptions** | Direct Firestore `onSnapshot` | Replace with SSE/WebSocket from backend |

---

## Part 1: Current Architecture

### 1.1 Frontend Data Flow (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  Zustand    │───▶│   Gateway   │───▶│   Firebase SDK      │  │
│  │  Stores     │    │  (gateway.ts)│    │  (firebaseClient.ts)│  │
│  │  (35 stores)│◀───│             │◀───│                     │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                                   │              │
└───────────────────────────────────────────────────│──────────────┘
                                                    │
                                                    ▼
                                        ┌─────────────────────┐
                                        │   FIRESTORE         │
                                        │   (Direct Access)   │
                                        └─────────────────────┘
```

### 1.2 Backend Data Flow (Target)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  Zustand    │───▶│  API Client │───▶│   Go Backend        │  │
│  │  Stores     │    │  (REST/SSE) │    │   (REST API)        │  │
│  │  (35 stores)│◀───│             │◀───│                     │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                                   │              │
└───────────────────────────────────────────────────│──────────────┘
                                                    │
                                                    ▼
                                        ┌─────────────────────┐
                                        │   GO BACKEND        │
                                        │   ┌─────────────┐   │
                                        │   │  Handlers   │   │
                                        │   └─────────────┘   │
                                        │          │          │
                                        │          ▼          │
                                        │   ┌─────────────┐   │
                                        │   │  Services   │   │
                                        │   └─────────────┘   │
                                        │          │          │
                                        │          ▼          │
                                        │   ┌─────────────┐   │
                                        │   │ Repository  │   │
                                        │   └─────────────┘   │
                                        └──────────│──────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │   FIRESTORE         │
                                        │   (Admin SDK)       │
                                        └─────────────────────┘
```

---

## Part 2: Missing Backend Features

### 2.1 CRUD Operations for All Collections

The backend needs generic CRUD endpoints for **30+ Firestore collections**:

| Collection | Path | Backend Status | Priority |
|------------|------|----------------|----------|
| `tasks` | `users/{uid}/tasks` | ❌ Missing | Critical |
| `thoughts` | `users/{uid}/thoughts` | ❌ Missing | Critical |
| `focusSessions` | `users/{uid}/focusSessions` | ❌ Missing | Critical |
| `moods` | `users/{uid}/moods` | ❌ Missing | Critical |
| `goals` | `users/{uid}/goals` | ❌ Missing | High |
| `projects` | `users/{uid}/projects` | ❌ Missing | High |
| `trips` | `users/{uid}/trips` | ❌ Missing | High |
| `places` | `users/{uid}/places` | ❌ Missing | High |
| `friends` | `users/{uid}/friends` | ❌ Missing | Medium |
| `relationships` | `users/{uid}/relationships` | ❌ Missing | Medium |
| `admiredPeople` | `users/{uid}/admiredPeople` | ❌ Missing | Low |
| `packingLists` | `users/{uid}/packingLists` | ⚠️ Partial (create only) | High |
| `photoLibrary` | `users/{uid}/photoLibrary` | ⚠️ Partial (photos) | Medium |
| `dexaScans` | `users/{uid}/dexaScans` | ❌ Missing | Low |
| `entityGraph` | `users/{uid}/entityGraph` | ✅ Exists | - |
| `subscriptions` | `users/{uid}/subscriptions` | ❌ Missing | High |
| `billingInfo` | `users/{uid}/billingInfo` | ✅ Via Stripe | - |
| `portfolios` | `users/{uid}/portfolios` | ⚠️ Partial (read only) | High |
| `bankAccounts` | `users/{uid}/bankAccounts` | ⚠️ Via Plaid | Medium |
| `transactions` | `users/{uid}/transactions` | ⚠️ Via Plaid/CSV | Medium |
| `llmLogs` | `users/{uid}/llmLogs` | ❌ Missing | Low |
| `tokenUsage` | `users/{uid}/tokenUsage` | ❌ Missing | Low |
| `toolUsage` | `users/{uid}/toolUsage` | ❌ Missing | Low |
| `csvProcessingStatus` | `users/{uid}/csvProcessingStatus` | ⚠️ Partial | Medium |
| `dexaScanProcessingStatus` | `users/{uid}/dexaScanProcessingStatus` | ❌ Missing | Low |

### 2.2 Real-time Subscriptions

**Current**: Frontend uses Firestore `onSnapshot` for real-time updates
**Missing**: Backend needs to provide real-time updates via SSE or WebSockets

**Required Implementation**:
```
GET /api/subscribe/{collection}
Headers: Accept: text/event-stream

Response: SSE stream with document changes
data: {"type": "added", "doc": {...}}
data: {"type": "modified", "doc": {...}}
data: {"type": "removed", "docId": "xxx"}
```

### 2.3 File Storage Operations

**Current**: Frontend directly uploads to Firebase Storage
**Missing**: Backend needs file upload/download endpoints

| Operation | Status | Required Endpoint |
|-----------|--------|-------------------|
| Photo upload | ❌ Missing | `POST /api/storage/photos` |
| Photo delete | ❌ Missing | `DELETE /api/storage/photos/{id}` |
| CSV upload | ❌ Missing | `POST /api/storage/csv` |
| DEXA scan upload | ❌ Missing | `POST /api/storage/dexa-scans` |
| Signed URL | ✅ Exists | `POST /api/photo/signed-url` |

### 2.4 Cloud Functions to Port

#### 2.4.1 Firestore Triggers (Document Creation)

| Cloud Function | Trigger | Backend Equivalent |
|----------------|---------|-------------------|
| `processNewThought` | `users/{uid}/thoughts/{id}` onCreate | Background worker on thought creation |
| `processThoughtQueueWorker` | `users/{uid}/thoughtProcessingQueue/{id}` onCreate | Queue processor worker |
| `processCsvBatchQueue` | `csvBatchQueue/{id}` onCreate | Queue processor worker |

**Migration Strategy**: When backend creates documents, it should also trigger processing if needed. Use a background job system (goroutines with channels or external queue like Redis).

#### 2.4.2 Storage Triggers

| Cloud Function | Trigger | Backend Equivalent |
|----------------|---------|-------------------|
| `onCSVUpload` | Storage `csvStatements/**` | Process immediately on upload endpoint |
| `generatePhotoThumbnail` | Storage `images/original/**` | Process immediately on upload endpoint |
| `onDexaScanUpload` | Storage `dexaScans/**` | Process immediately on upload endpoint |

**Migration Strategy**: When files are uploaded via backend API, process them synchronously or queue for async processing.

#### 2.4.3 Scheduled Functions

| Cloud Function | Schedule | Backend Equivalent |
|----------------|----------|-------------------|
| `cleanupExpiredAnonymousUsers` | Every 60 minutes | Cron job / Go ticker |
| `updateTrackedTickers` | Daily at 00:00 | Cron job / Go ticker |
| `refreshTrackedTickerPrices` | Daily at 00:05 | Cron job / Go ticker |
| `createDailyPortfolioSnapshots` | Daily at 03:00 | Cron job / Go ticker |
| `processTransactionTripLinks` | Every 15 minutes | Cron job / Go ticker |
| `updateVisaDataWeekly` | Weekly | Cron job / Go ticker |

**Migration Strategy**: Use `robfig/cron` or native Go tickers with goroutines.

#### 2.4.4 Callable Functions (Already Partially Ported)

| Cloud Function | Backend Status | Notes |
|----------------|----------------|-------|
| `manualProcessThought` | ✅ `/api/process-thought` | Working |
| `reprocessThought` | ✅ `/api/reprocess-thought` | Working |
| `revertThoughtProcessing` | ⚠️ Placeholder | TODO: Implement revert logic |
| `createStripeCheckoutSession` | ✅ Working | - |
| `createStripePortalSession` | ✅ Working | - |
| `stripeWebhook` | ✅ Working | - |
| `getStripeInvoices` | ✅ Working | - |
| `getStripePaymentMethod` | ✅ Working | - |
| `reactivateStripeSubscription` | ✅ Working | - |
| `getUsageStats` | ⚠️ Placeholder | TODO: Implement |
| `createLinkToken` | ✅ Working | - |
| `exchangePublicToken` | ✅ Working | - |
| `createRelinkToken` | ✅ Working | - |
| `markRelinking` | ✅ Working | - |
| `triggerSync` | ✅ Working | - |
| `plaidWebhook` | ✅ Working | - |
| `processCSVTransactions` | ⚠️ Partial | Need delete cleanup |
| `deleteCSVStatement` | ⚠️ Partial | Need cascade delete |
| `linkTransactionToTrip` | ❌ Missing | - |
| `dismissTransactionTripSuggestion` | ❌ Missing | - |
| `deleteAllTransactions` | ❌ Missing | - |
| `getVisaRequirements` | ✅ Working | - |
| `submitPhotoVote` | ✅ `/api/photo/vote` | - |
| `getNextPhotoPair` | ✅ `/api/photo/next-pair` | - |
| `mergePhotos` | ❌ Missing | - |
| `runPlaceInsights` | ✅ `/api/place-insights` | - |
| `createPackingList` | ✅ `/api/packing-list/create` | - |
| `updatePackingList` | ✅ `/api/packing-list/update` | - |
| `togglePackedItem` | ✅ `/api/packing-list/toggle-item` | - |
| `setPackingItemStatus` | ❌ Missing | - |
| `addCustomPackingItem` | ❌ Missing | - |
| `deleteCustomPackingItem` | ❌ Missing | - |
| `deletePackingList` | ❌ Missing | - |
| `getSignedImageUrl` | ✅ Working | - |

---

## Part 3: Migration Steps

### Phase 1: Backend API Completeness (Priority: Critical)

#### Step 1.1: Generic CRUD Endpoints

Create generic CRUD handler pattern:

```go
// handlers/crud.go
type CRUDHandler struct {
    repo   repository.Repository
    logger *zap.Logger
}

// Generic endpoints for any collection
// POST   /api/{collection}         - Create
// GET    /api/{collection}         - List
// GET    /api/{collection}/{id}    - Get
// PUT    /api/{collection}/{id}    - Update
// DELETE /api/{collection}/{id}    - Delete
```

**Collections to add**:
1. `/api/tasks` - Task CRUD
2. `/api/thoughts` - Thought CRUD
3. `/api/focus-sessions` - Focus session CRUD
4. `/api/moods` - Mood CRUD
5. `/api/goals` - Goal CRUD
6. `/api/projects` - Project CRUD
7. `/api/trips` - Trip CRUD
8. `/api/places` - Place CRUD
9. `/api/friends` - Friend CRUD
10. `/api/relationships` - Relationship CRUD
11. `/api/admired-people` - Admired people CRUD
12. `/api/subscriptions` - Subscription management
13. `/api/portfolios` - Full portfolio CRUD

#### Step 1.2: Real-time Subscriptions via SSE

```go
// handlers/subscribe.go
func (h *SubscribeHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
    // Set SSE headers
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")

    // Create Firestore listener
    collection := chi.URLParam(r, "collection")
    uid := r.Context().Value("uid").(string)

    // Stream changes to client
    iter := h.repo.Subscribe(ctx, fmt.Sprintf("users/%s/%s", uid, collection))
    for change := range iter {
        fmt.Fprintf(w, "data: %s\n\n", json.Marshal(change))
        w.(http.Flusher).Flush()
    }
}
```

**Endpoint**: `GET /api/subscribe/{collection}`

### Phase 2: File Storage API (Priority: High)

#### Step 2.1: Photo Upload Endpoint

```go
// POST /api/storage/photos
// Content-Type: multipart/form-data
// Body: file (image), metadata (JSON)
func (h *StorageHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
    // 1. Parse multipart form
    // 2. Upload to Firebase Storage
    // 3. Generate thumbnail (synchronous or queue)
    // 4. Create Firestore document in photoLibrary
    // 5. Return photo metadata
}
```

#### Step 2.2: CSV Upload Endpoint

```go
// POST /api/storage/csv
// Content-Type: multipart/form-data
func (h *StorageHandler) UploadCSV(w http.ResponseWriter, r *http.Request) {
    // 1. Parse CSV file
    // 2. Upload to Firebase Storage
    // 3. Queue batch processing jobs
    // 4. Return processing status
}
```

#### Step 2.3: DEXA Scan Upload Endpoint

```go
// POST /api/storage/dexa-scans
// Content-Type: multipart/form-data
func (h *StorageHandler) UploadDexaScan(w http.ResponseWriter, r *http.Request) {
    // 1. Upload PDF to Storage
    // 2. Queue for OpenAI Vision processing
    // 3. Return processing status
}
```

### Phase 3: Background Workers (Priority: High)

#### Step 3.1: Job Queue System

```go
// internal/workers/queue.go
type JobQueue struct {
    thoughtJobs    chan ThoughtJob
    csvJobs        chan CSVJob
    photoJobs      chan PhotoJob
    workers        int
}

func (q *JobQueue) Start(ctx context.Context) {
    for i := 0; i < q.workers; i++ {
        go q.processThoughtJobs(ctx)
        go q.processCSVJobs(ctx)
        go q.processPhotoJobs(ctx)
    }
}
```

#### Step 3.2: Scheduled Jobs (Cron)

```go
// cmd/server/main.go
import "github.com/robfig/cron/v3"

func startScheduledJobs(services *Services) {
    c := cron.New()

    // Every 60 minutes - cleanup anonymous users
    c.AddFunc("0 * * * *", services.cleanupAnonymousUsers)

    // Daily at 00:00 - update tracked tickers
    c.AddFunc("0 0 * * *", services.updateTrackedTickers)

    // Daily at 00:05 - refresh ticker prices
    c.AddFunc("5 0 * * *", services.refreshTickerPrices)

    // Daily at 03:00 - create portfolio snapshots
    c.AddFunc("0 3 * * *", services.createPortfolioSnapshots)

    // Every 15 minutes - process trip links
    c.AddFunc("*/15 * * * *", services.processTransactionTripLinks)

    c.Start()
}
```

### Phase 4: Frontend Migration (Priority: Critical)

#### Step 4.1: Create API Client Module

```typescript
// frontend/web/lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await auth.currentUser?.getIdToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new APIError(response.status, await response.text());
  }

  return response.json();
}

// CRUD helpers
export const api = {
  create: <T>(collection: string, data: any) =>
    apiRequest<T>(`/api/${collection}`, { method: 'POST', body: JSON.stringify(data) }),

  get: <T>(collection: string, id: string) =>
    apiRequest<T>(`/api/${collection}/${id}`),

  list: <T>(collection: string, query?: string) =>
    apiRequest<T[]>(`/api/${collection}${query ? `?${query}` : ''}`),

  update: <T>(collection: string, id: string, data: any) =>
    apiRequest<T>(`/api/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (collection: string, id: string) =>
    apiRequest(`/api/${collection}/${id}`, { method: 'DELETE' }),
};
```

#### Step 4.2: Create SSE Subscription Helper

```typescript
// frontend/web/lib/api/subscribe.ts
export function subscribeToCollection<T>(
  collection: string,
  callback: (data: T[], meta: SubscriptionMeta) => void
): () => void {
  const token = await auth.currentUser?.getIdToken();

  const eventSource = new EventSource(
    `${API_BASE}/api/subscribe/${collection}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  eventSource.onmessage = (event) => {
    const change = JSON.parse(event.data);
    // Handle add/modify/remove
    callback(change.data, { fromCache: false });
  };

  return () => eventSource.close();
}
```

#### Step 4.3: Migrate Zustand Stores

**Before (Direct Firebase)**:
```typescript
// store/useTasks.ts
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';
import { subscribeCol } from '@/lib/data/subscribe';

export const useTasks = create<State>((set, get) => ({
  subscribe: (userId: string) => {
    const query = query(collection(db, `users/${userId}/tasks`));
    return subscribeCol(query, (tasks, meta) => {
      set({ tasks, isLoading: false });
    });
  },

  add: async (data) => {
    await createAt(`users/${userId}/tasks/${id}`, data);
  },
}));
```

**After (Via Backend)**:
```typescript
// store/useTasks.ts
import { api, subscribeToCollection } from '@/lib/api';

export const useTasks = create<State>((set, get) => ({
  subscribe: (userId: string) => {
    return subscribeToCollection('tasks', (tasks, meta) => {
      set({ tasks, isLoading: false });
    });
  },

  add: async (data) => {
    await api.create('tasks', data);
  },
}));
```

### Phase 5: Remove Firebase SDK from Frontend (Priority: Final)

#### Step 5.1: Keep Only Auth

```typescript
// frontend/web/lib/firebaseClient.ts
// KEEP: Firebase Auth for token generation
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// REMOVE: Firestore, Storage, Functions
// - db (Firestore)
// - storage (Firebase Storage)
// - functions (Cloud Functions)
```

#### Step 5.2: Remove Gateway & Subscribe

```bash
# Files to remove after migration:
rm frontend/web/lib/data/gateway.ts
rm frontend/web/lib/data/subscribe.ts
rm frontend/web/lib/firebase/circuit-breaker.ts
rm frontend/web/lib/firebase/offline-queue.ts
rm frontend/web/lib/firebase/retry.ts
# etc.
```

The resilience patterns (circuit breaker, retry, offline queue) should be implemented in the API client instead.

---

## Part 4: Migration Checklist

### Backend Work

- [ ] **CRUD Endpoints** (13 new handlers)
  - [ ] Tasks CRUD
  - [ ] Thoughts CRUD
  - [ ] Focus Sessions CRUD
  - [ ] Moods CRUD
  - [ ] Goals CRUD
  - [ ] Projects CRUD
  - [ ] Trips CRUD
  - [ ] Places CRUD
  - [ ] Friends CRUD
  - [ ] Relationships CRUD
  - [ ] Admired People CRUD
  - [ ] Subscriptions CRUD
  - [ ] Portfolios full CRUD

- [ ] **Real-time Subscriptions**
  - [ ] SSE endpoint `/api/subscribe/{collection}`
  - [ ] Firestore change stream integration
  - [ ] Connection health monitoring

- [ ] **File Storage Endpoints**
  - [ ] Photo upload with thumbnail generation
  - [ ] CSV upload with processing queue
  - [ ] DEXA scan upload with PDF parsing

- [ ] **Background Workers**
  - [ ] Job queue system
  - [ ] Thought processing worker
  - [ ] CSV batch processing worker
  - [ ] Photo thumbnail worker

- [ ] **Scheduled Jobs**
  - [ ] Anonymous user cleanup (hourly)
  - [ ] Ticker updates (daily)
  - [ ] Portfolio snapshots (daily)
  - [ ] Transaction-trip linking (15 min)
  - [ ] Visa data updates (weekly)

- [ ] **Missing Callable Functions**
  - [ ] `linkTransactionToTrip`
  - [ ] `dismissTransactionTripSuggestion`
  - [ ] `deleteAllTransactions`
  - [ ] `mergePhotos`
  - [ ] `setPackingItemStatus`
  - [ ] `addCustomPackingItem`
  - [ ] `deleteCustomPackingItem`
  - [ ] `deletePackingList`
  - [ ] Complete `revertThoughtProcessing`
  - [ ] Complete `getUsageStats`

### Frontend Work

- [ ] **API Client Module**
  - [ ] Base request function with auth
  - [ ] CRUD helper functions
  - [ ] SSE subscription helper
  - [ ] Error handling & retry logic
  - [ ] Offline queue (optional)

- [ ] **Store Migration** (35 stores)
  - [ ] useTasks
  - [ ] useThoughts
  - [ ] useFocus
  - [ ] useMoods
  - [ ] useGoals
  - [ ] useProjects
  - [ ] useTrips
  - [ ] usePlaces
  - [ ] useFriends
  - [ ] useRelationships
  - [ ] useAdmiredPeople
  - [ ] usePackingLists
  - [ ] usePhotoLibrary
  - [ ] usePhotoFeedback
  - [ ] useDatingFeedback
  - [ ] useBodyProgress
  - [ ] useInvestments
  - [ ] useSpending
  - [ ] useSpendingTool
  - [ ] useEntityGraph
  - [ ] useSubscriptions
  - [ ] useBillingData
  - [ ] useLLMLogs
  - [ ] useTokenUsage
  - [ ] useToolUsage
  - [ ] useVisaFinder
  - [ ] useCalendar
  - [ ] useAnonymousSession
  - [ ] (remaining stores...)

- [ ] **Remove Firebase SDK**
  - [ ] Keep only Auth
  - [ ] Remove Firestore imports
  - [ ] Remove Storage imports
  - [ ] Remove Cloud Functions imports
  - [ ] Delete gateway.ts
  - [ ] Delete subscribe.ts
  - [ ] Delete firebase resilience layer

### Testing

- [ ] Backend unit tests for new handlers
- [ ] Backend integration tests for SSE
- [ ] Frontend tests for API client
- [ ] E2E tests for full flow
- [ ] Load testing for SSE connections

### Deployment

- [ ] Backend deployment with cron support
- [ ] Environment variables for backend URL
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] Monitoring & alerting

---

## Part 5: Architecture Decisions

### 5.1 Real-time Updates: SSE vs WebSocket

**Recommendation: Server-Sent Events (SSE)**

| Aspect | SSE | WebSocket |
|--------|-----|-----------|
| Complexity | Simple, HTTP-based | More complex, separate protocol |
| Browser Support | Excellent | Excellent |
| Firewall/Proxy | Works through HTTP | May require special config |
| Reconnection | Built-in automatic | Manual implementation |
| Bidirectional | No (one-way) | Yes |
| Use Case | Server push (our need) | Interactive apps |

SSE is sufficient since we only need server→client updates. The client sends changes via REST POST/PUT.

### 5.2 Background Processing: In-Process vs External Queue

**Recommendation: In-Process Goroutines (Start), External Queue (Scale)**

**Phase 1**: Use goroutines with channels
- Simple, no external dependencies
- Suitable for moderate load
- Easy to implement

**Phase 2** (if needed): Redis/NATS queue
- For high volume processing
- Cross-instance job distribution
- Better failure recovery

### 5.3 Offline Support

The current frontend has sophisticated offline support via:
- Firestore persistent cache
- Offline operation queue
- Circuit breaker pattern

**Options for backend migration**:
1. **Service Worker + IndexedDB**: Cache API responses, queue mutations
2. **Simplified approach**: Accept that offline = read-only from cache
3. **Backend handles it**: Backend queues operations when Firestore is unavailable

**Recommendation**: Start with option 2 (simplified), add Service Worker if needed.

---

## Part 6: Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Gradual rollout, feature flags |
| Real-time latency | Medium | SSE with heartbeat, connection pooling |
| Backend single point of failure | High | Multiple instances, health checks |
| Auth token handling | Medium | Proper token refresh, error handling |
| Offline functionality regression | Medium | Service worker caching |
| Performance degradation | Medium | Connection pooling, caching |

---

## Appendix A: File Changes Summary

### Backend Files to Create

```
backend/
├── internal/
│   ├── handlers/
│   │   ├── crud.go              # Generic CRUD handler
│   │   ├── subscribe.go         # SSE subscription handler
│   │   ├── storage.go           # File upload handlers
│   │   ├── tasks.go             # Task-specific logic
│   │   ├── thoughts.go          # Thought-specific logic
│   │   └── ...
│   ├── workers/
│   │   ├── queue.go             # Job queue system
│   │   ├── thought_worker.go    # Thought processing worker
│   │   ├── csv_worker.go        # CSV processing worker
│   │   ├── photo_worker.go      # Photo thumbnail worker
│   │   └── scheduler.go         # Cron job scheduler
│   └── repository/
│       └── subscribe.go         # Firestore change stream
└── cmd/
    └── server/
        └── main.go              # Add cron, workers initialization
```

### Frontend Files to Create

```
frontend/web/
├── lib/
│   └── api/
│       ├── client.ts            # Base API client
│       ├── subscribe.ts         # SSE subscription helper
│       ├── types.ts             # API types
│       └── errors.ts            # Error handling
```

### Frontend Files to Modify

```
frontend/web/
├── store/
│   ├── useTasks.ts              # Replace Firebase with API
│   ├── useThoughts.ts           # Replace Firebase with API
│   ├── useFocus.ts              # Replace Firebase with API
│   ├── useMoods.ts              # Replace Firebase with API
│   └── ... (all 35 stores)
├── lib/
│   └── firebaseClient.ts        # Keep only Auth
```

### Frontend Files to Delete

```
frontend/web/
├── lib/
│   ├── data/
│   │   ├── gateway.ts           # DELETE
│   │   └── subscribe.ts         # DELETE
│   └── firebase/
│       ├── circuit-breaker.ts   # DELETE (move to API client)
│       ├── offline-queue.ts     # DELETE (move to API client)
│       ├── retry.ts             # DELETE (move to API client)
│       └── ...                  # DELETE all
```

---

## Appendix B: Estimated Effort

| Component | Estimated Time | Dependencies |
|-----------|---------------|--------------|
| Generic CRUD handlers | 2-3 days | None |
| SSE subscriptions | 3-4 days | CRUD handlers |
| File storage endpoints | 2-3 days | None |
| Background workers | 3-4 days | None |
| Scheduled jobs | 1-2 days | Workers |
| Frontend API client | 2-3 days | Backend CRUD |
| Store migration (35 stores) | 5-7 days | API client |
| Testing | 3-4 days | All above |
| **Total** | **21-30 days** | |

---

*Document generated: 2025-12-04*
*Author: Claude Code Analysis*
