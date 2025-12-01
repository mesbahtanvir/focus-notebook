# Focus Notebook - Firebase to Golang Backend Migration Analysis

**Date:** 2025-11-21
**Project:** Focus Notebook
**Objective:** Design and implement a Golang backend to replace Firebase Cloud Functions while maintaining all existing features

---

## Executive Summary

This document provides a comprehensive analysis of all Firebase interactions in the Focus Notebook application and proposes a Golang backend architecture that:

1. **Maintains 100% feature parity** with existing Firebase setup
2. **Minimizes maintenance overhead** through simple, robust design
3. **Ensures backward compatibility** - no breaking changes to the frontend
4. **Provides a clear migration path** from Firebase to self-hosted infrastructure

---

## Current Firebase Architecture Analysis

### 1. Authentication (Firebase Auth)

**Current Implementation:**
- **Provider Methods:**
  - Google OAuth (`signInWithPopup`)
  - Email/Password (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`)
  - Anonymous (`signInAnonymously`)
  - Account Linking (`linkWithCredential`)
- **Session Management:**
  - Anonymous sessions: 2-hour expiry tracked in `anonymousSessions` collection
  - Token refresh: Every 45 minutes via `getIdToken(forceRefresh)`
  - Visibility-based refresh: Refreshes when tab returns to foreground after 50+ minutes
- **Authentication Flow:**
  1. Client signs in via Firebase Auth SDK
  2. Receives Firebase ID token (JWT)
  3. Token sent in `Authorization: Bearer <token>` header to API routes
  4. Backend verifies token using Firebase Admin SDK (`verifyIdToken`)

**Key Files:**
- `src/contexts/AuthContext.tsx` (lines 1-440)
- `src/lib/server/verifyAiRequest.ts` (lines 1-76)
- `firestore.rules` (security rules based on `request.auth.uid`)

**Security Model:**
- All Firestore access requires authentication (`request.auth != null`)
- User can only access their own data: `users/{userId}/*` where `userId == request.auth.uid`
- Anonymous sessions have additional `allowAi` flag check for AI features

---

### 2. Firestore Database

**Collection Structure:**

#### User-Scoped Collections (users/{userId}/{collection})
All user data follows the pattern: `users/{userId}/{collection}/{documentId}`

| Collection | Purpose | Real-time | Count |
|-----------|---------|-----------|-------|
| `tasks` | Task management | ✓ | High |
| `thoughts` | Thought tracking & CBT | ✓ | High |
| `goals` | Goal tracking | ✓ | Medium |
| `projects` | Project management | ✓ | Medium |
| `moods` | Mood tracking | ✓ | High |
| `people` | Relationships | ✓ | Medium |
| `investments` | Investment tracking | ✓ | Medium |
| `portfolioSnapshots` | Daily portfolio records | ✓ | High |
| `trips` | Travel planning | ✓ | Low |
| `places` | Visited places | ✓ | Low |
| `spending` | Expenses | ✓ | High |
| `body_progress` | Health metrics | ✓ | Medium |
| `errands` | Daily errands | ✓ | Medium |
| `notes` | Note-taking | ✓ | Medium |
| `calendars` | Calendar events | ✓ | Medium |
| `entity_graph` | Entity relationships | ✓ | High |
| `focus_sessions` | Pomodoro sessions | ✓ | High |
| `llm_logs` | AI interaction logs | ✓ | High |
| `token_usage` | API token tracking | ✓ | High |
| `tool_usage` | Tool analytics | ✓ | High |
| `request_logs` | API request logs | ✓ | High |
| `processingQueue` | Thought processing queue | ✓ | Medium |
| `csvProcessingStatus` | CSV upload status | ✓ | Low |
| `subscriptionStatus` | Billing status | ✓ | Low |

#### Global Collections
| Collection | Purpose | Access | Managed By |
|-----------|---------|--------|-----------|
| `visa_requirements` | Visa data | Read-only (all users) | Cloud Function |
| `visa_data` | Visa metadata | Read-only (all users) | Cloud Function |
| `photoBattles` | Photo voting sessions | Public with vote validation | Cloud Function |
| `anonymousSessions` | Anonymous auth tracking | Owner + Functions | AuthContext + Function |
| `stripeCustomers` | Stripe customer mapping | Functions only | Stripe webhooks |
| `plaidItems` | Plaid connection metadata | User + Functions | Plaid functions |
| `accounts` | Bank account data | User + Functions | Plaid sync |
| `transactions` | Bank transactions | User + Functions | Plaid sync |
| `recurringStreams` | Detected subscriptions | User + Functions | Spending analysis |

**CRUD Operations:**
- Centralized through gateway pattern: `createAt`, `updateAt`, `deleteAt` (src/lib/data/gateway.ts:59-108)
- Automatic metadata injection:
  - `createdAt`: Server timestamp on create
  - `updatedAt`: Server timestamp on update
  - `updatedBy`: Current user ID
  - `version`: Incremented on each update (optimistic locking)
- Undefined value sanitization: `removeUndefined()` recursively cleans payloads

**Real-time Subscriptions:**
- All stores use `subscribeCol()` or `subscribeDoc()` from `src/lib/data/subscribe.ts`
- Subscription features:
  - Metadata tracking: `fromCache`, `hasPendingWrites`
  - Error handling with callback notification
  - Resilient subscriptions with auto-reconnect (subscription-health.ts)
  - Connection health monitoring (connection-monitor.ts)
  - Circuit breaker pattern for failed operations (circuit-breaker.ts)

**Offline Support:**
- Persistent local cache (IndexedDB) for non-Safari browsers
- Memory cache for Safari (due to IndexedDB bugs)
- Offline queue for failed operations (offline-queue.ts)
- Automatic retry on reconnection

---

### 3. Firebase Storage

**Usage Patterns:**
| Use Case | Path Pattern | Trigger | Processing |
|----------|-------------|---------|------------|
| CSV bank statements | `users/{userId}/csv/{filename}` | `onCSVUpload` | Parse → Firestore transactions |
| Dexa scan PDFs | `users/{userId}/dexa/{filename}` | `onDexaScanUpload` | Extract → body_progress |
| Photo uploads | `users/{userId}/photos/{photoId}` | `generatePhotoThumbnail` | Resize → thumbnails |

**Operations:**
- `uploadBytes(ref, file)` - Upload binary data
- `getDownloadURL(ref)` - Get signed URL
- `deleteObject(ref)` - Delete file

**Files Using Storage:**
- `src/components/spending/CSVUploadSection.tsx` (lines 11, 101)
- `src/components/body-progress/DexaScanUpload.tsx`
- `src/store/usePhotoFeedback.ts`

**Storage Triggers (Cloud Functions):**
1. `onCSVUpload` - Parses CSV and creates transactions (functions/src/csvStorageTrigger.ts)
2. `onDexaScanUpload` - Parses dexa PDF (functions/src/dexaScanStorageTrigger.ts)
3. `generatePhotoThumbnail` - Creates image thumbnails (functions/src/photoThumbnails.ts)

---

### 4. Cloud Functions

**Categories:**

#### AI/LLM Processing
| Function | Trigger | Purpose |
|----------|---------|---------|
| `processNewThought` | Firestore onCreate | Auto-process new thoughts |
| `manualProcessThought` | HTTP Callable | User-initiated processing |
| `reprocessThought` | HTTP Callable | Reprocess with new context |
| `revertThoughtProcessing` | HTTP Callable | Undo AI changes |
| `processThoughtQueueWorker` | Pub/Sub | Queue-based processing |

**Key Logic (functions/src/processThought.ts:1-200):**
- Subscription validation: Check Pro status + AI credits
- Context gathering: Load user's goals, tasks, projects, moods
- OpenAI integration: GPT-4o for thought analysis
- Action processing: Create tasks, projects, relationships, moods
- Usage tracking: Increment AI token counters

#### Billing (Stripe)
| Function | Purpose |
|----------|---------|
| `createStripeCheckoutSession` | Start subscription checkout |
| `createStripePortalSession` | Manage billing portal |
| `stripeWebhook` | Handle subscription events |
| `syncStripeSubscription` | Manual sync |
| `getStripeInvoices` | Fetch invoice history |
| `getUsageStats` | AI usage metrics |

**Implementation (functions/src/stripeBilling.ts:1-150):**
- Stripe API v2023-10-16
- Customer ID mapping in `stripeCustomers` collection
- Subscription status sync to `users/{userId}/subscriptionStatus/current`
- Webhook event handling: `customer.subscription.*`

#### Banking (Plaid)
| Function | Purpose |
|----------|---------|
| `createLinkToken` | Initialize Plaid Link |
| `exchangePublicToken` | Complete connection |
| `createRelinkToken` | Reconnect expired items |
| `triggerSync` | Force transaction sync |
| `plaidWebhook` | Handle Plaid events |

**Integration:**
- Plaid API for bank connections
- Encrypted access token storage
- Transaction categorization with AI (functions/src/services/categorizationService.ts)
- Subscription detection (functions/src/services/subscriptionDetection.ts)

#### File Processing
| Function | Trigger | Processing |
|----------|---------|------------|
| `onCSVUpload` | Storage onCreate | Parse CSV → transactions |
| `processCsvBatchQueue` | Pub/Sub | Batch CSV processing |
| `onDexaScanUpload` | Storage onCreate | PDF → body metrics |
| `generatePhotoThumbnail` | Storage onCreate | Image resize |

#### Data Maintenance
| Function | Schedule/Trigger | Purpose |
|----------|------------------|---------|
| `updateTrackedTickers` | Daily | Update stock watchlist |
| `refreshTrackedTickerPrices` | Every 15 min | Refresh stock prices |
| `createDailyPortfolioSnapshots` | Daily | Snapshot portfolio values |
| `cleanupExpiredAnonymousUsers` | Daily | Delete expired sessions |
| `updateVisaDataWeekly` | Weekly | Scrape visa requirements |

#### Other Functions
| Function | Purpose |
|----------|---------|
| `linkTransactionToTrip` | Link spending to trips |
| `processTransactionTripLinks` | AI-based trip linking |
| `runPlaceInsights` | Generate place insights |
| `submitPhotoVote` | Elo photo voting |
| `getNextPhotoPair` | Fetch voting pairs |

**Total Functions:** 35+

---

### 5. API Routes (Next.js)

**Current Routes:**
| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/process-thought` | POST | Process thought with AI | ✓ |
| `/api/chat` | POST | AI chat interface | ✓ |
| `/api/predict-investment` | POST | Investment predictions | ✓ |
| `/api/spending/[action]` | POST | Spending operations | ✓ |
| `/api/spending/delete-csv` | POST | Delete CSV statement | ✓ |
| `/api/stock-price` | GET | Current stock price | ✓ |
| `/api/stock-history` | GET | Historical stock data | ✓ |

**Authentication Pattern:**
```typescript
const authHeader = request.headers.get('authorization');
const token = authHeader.replace('Bearer ', '').trim();
const decoded = await adminAuth.verifyIdToken(token);
const uid = decoded.uid;
```

**Current Status:**
- Most routes return `503 Service Unavailable` with message "AI service not configured"
- Functions are being migrated from client-side OpenAI to server-side service
- This is the **perfect opportunity** to replace with Go backend

---

## Proposed Golang Backend Architecture

### Design Principles

1. **Backward Compatible:** Frontend code requires ZERO changes
2. **Simple & Robust:** Standard library + minimal dependencies
3. **Low Maintenance:** Clear code, comprehensive tests, good logging
4. **Firebase as Database:** Continue using Firestore + Storage, replace Functions + API routes
5. **Gradual Migration:** Can run alongside existing Firebase Functions during transition

---

### Technology Stack

#### Core Framework
- **Language:** Go 1.21+
- **HTTP Router:** `github.com/gorilla/mux` (simple, stable, well-documented)
- **Firebase Admin:** `firebase.google.com/go/v4`
  - Auth: `auth.Client` for token verification
  - Firestore: `firestore.Client` for database operations
  - Storage: `storage.Client` for file operations

#### Third-Party Integrations
- **AI/LLM:**
  - OpenAI: `github.com/sashabaranov/go-openai`
  - Anthropic: `github.com/anthropics/anthropic-sdk-go`
- **Payments:** `github.com/stripe/stripe-go/v76`
- **Banking:** `github.com/plaid/plaid-go/v12`
- **HTTP Client:** `net/http` (standard library)

#### Infrastructure
- **Configuration:** Environment variables + YAML
- **Logging:** `go.uber.org/zap` (structured, high-performance)
- **Metrics:** `github.com/prometheus/client_golang`
- **Deployment:** Docker container
- **Hosting Options:**
  - Cloud Run (serverless, auto-scaling)
  - Kubernetes
  - VPS (DigitalOcean, Linode, etc.)

---

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                      │
│  - React Components                                             │
│  - Zustand Stores (32 stores)                                   │
│  - Firebase SDK (Auth, Firestore, Storage) - UNCHANGED         │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ├─── Direct Firestore Access (Real-time subscriptions)
                    │    ↓
                    │    Firebase Firestore
                    │
                    ├─── Direct Firebase Auth (Sign in, token management)
                    │    ↓
                    │    Firebase Auth
                    │
                    └─── HTTP API Calls (AI, integrations)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Golang Backend API                         │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  HTTP Router (gorilla/mux)                                │ │
│  │  - /api/process-thought                                   │ │
│  │  - /api/chat                                              │ │
│  │  - /api/predict-investment                                │ │
│  │  - /api/spending/*                                        │ │
│  │  - /api/stripe/*                                          │ │
│  │  - /api/plaid/*                                           │ │
│  └────────────────────┬──────────────────────────────────────┘ │
│                       │                                          │
│  ┌────────────────────┼──────────────────────────────────────┐ │
│  │  Middleware Layer  │                                       │ │
│  │  ├─ Authentication (Firebase ID token verification)       │ │
│  │  ├─ Authorization (Anonymous AI check, subscription)      │ │
│  │  ├─ Logging (Request/response logging)                    │ │
│  │  ├─ Error Recovery (Panic recovery)                       │ │
│  │  └─ CORS (Cross-origin requests)                          │ │
│  └────────────────────┼──────────────────────────────────────┘ │
│                       │                                          │
│  ┌────────────────────┴──────────────────────────────────────┐ │
│  │  Service Layer                                            │ │
│  │  ├─ ThoughtProcessingService                              │ │
│  │  ├─ SubscriptionService                                   │ │
│  │  ├─ CategorizationService                                 │ │
│  │  ├─ StockDataService                                      │ │
│  │  ├─ PlaceInsightsService                                  │ │
│  │  └─ PhotoVotingService                                    │ │
│  └────────────────────┬──────────────────────────────────────┘ │
│                       │                                          │
│  ┌────────────────────┴──────────────────────────────────────┐ │
│  │  Integration Layer                                        │ │
│  │  ├─ OpenAI Client (thought processing, chat)              │ │
│  │  ├─ Anthropic Client (alternative AI)                     │ │
│  │  ├─ Stripe Client (billing operations)                    │ │
│  │  ├─ Plaid Client (banking operations)                     │ │
│  │  └─ Alpha Vantage (stock data)                            │ │
│  └────────────────────┬──────────────────────────────────────┘ │
│                       │                                          │
│  ┌────────────────────┴──────────────────────────────────────┐ │
│  │  Data Access Layer                                        │ │
│  │  ├─ Firestore Repository (CRUD with metadata injection)   │ │
│  │  ├─ Storage Repository (File upload/download)             │ │
│  │  └─ Queue Repository (Processing queues)                  │ │
│  └────────────────────┬──────────────────────────────────────┘ │
└────────────────────────┼──────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   ┌─────────┐    ┌─────────┐    ┌─────────────┐
   │ Firebase│    │ Firebase│    │   Firebase  │
   │   Auth  │    │Firestore│    │   Storage   │
   └─────────┘    └─────────┘    └─────────────┘
                         │
                         ↓
            ┌────────────────────────┐
            │  Background Workers    │
            │  ├─ Thought Queue      │
            │  ├─ CSV Processing     │
            │  ├─ Stock Price Update │
            │  ├─ Portfolio Snapshot │
            │  └─ Anonymous Cleanup  │
            └────────────────────────┘
```

---

### Project Structure

```
backend/
├── cmd/
│   ├── server/              # Main HTTP server
│   │   └── main.go
│   └── worker/              # Background worker
│       └── main.go
│
├── internal/                # Private application code
│   ├── middleware/          # HTTP middleware
│   │   ├── auth.go          # Firebase token verification
│   │   ├── logging.go       # Request/response logging
│   │   ├── recovery.go      # Panic recovery
│   │   └── cors.go          # CORS handling
│   │
│   ├── handlers/            # HTTP handlers (controllers)
│   │   ├── thought.go       # Thought processing endpoints
│   │   ├── chat.go          # AI chat endpoint
│   │   ├── investment.go    # Investment endpoints
│   │   ├── spending.go      # Spending endpoints
│   │   ├── stripe.go        # Stripe webhook & operations
│   │   ├── plaid.go         # Plaid operations
│   │   ├── stock.go         # Stock data endpoints
│   │   ├── photo.go         # Photo voting endpoints
│   │   └── health.go        # Health check endpoint
│   │
│   ├── services/            # Business logic layer
│   │   ├── thought_processing.go    # Thought AI processing
│   │   ├── subscription.go          # Subscription validation
│   │   ├── categorization.go        # Transaction categorization
│   │   ├── stock_data.go            # Stock market data
│   │   ├── place_insights.go        # Place analysis
│   │   ├── photo_voting.go          # Elo photo voting
│   │   ├── trip_linking.go          # Trip-spending linking
│   │   └── context_gatherer.go      # User context for AI
│   │
│   ├── clients/             # External API clients
│   │   ├── openai.go        # OpenAI API client
│   │   ├── anthropic.go     # Anthropic API client
│   │   ├── stripe.go        # Stripe API wrapper
│   │   ├── plaid.go         # Plaid API wrapper
│   │   └── alphavantage.go  # Stock data API
│   │
│   ├── repository/          # Data access layer
│   │   ├── firestore.go     # Firestore CRUD operations
│   │   ├── storage.go       # Firebase Storage operations
│   │   ├── queue.go         # Processing queue operations
│   │   └── metadata.go      # Metadata injection helpers
│   │
│   ├── models/              # Data models
│   │   ├── thought.go       # Thought model
│   │   ├── task.go          # Task model
│   │   ├── transaction.go   # Transaction model
│   │   ├── subscription.go  # Subscription model
│   │   ├── user.go          # User model
│   │   └── common.go        # Common fields (createdAt, etc.)
│   │
│   ├── config/              # Configuration
│   │   └── config.go        # Config loader
│   │
│   └── utils/               # Utility functions
│       ├── errors.go        # Custom error types
│       ├── logger.go        # Logging setup
│       └── validation.go    # Input validation
│
├── pkg/                     # Public libraries (reusable)
│   └── firebase/
│       └── admin.go         # Firebase Admin SDK setup
│
├── scripts/                 # Utility scripts
│   ├── deploy.sh            # Deployment script
│   └── migrate.sh           # Migration helper
│
├── config/                  # Configuration files
│   ├── config.yaml          # Main config
│   └── prompts/             # AI prompt templates
│       ├── thought_processing.yaml
│       └── categorization.yaml
│
├── Dockerfile               # Container image
├── docker-compose.yml       # Local development
├── go.mod                   # Go dependencies
├── go.sum                   # Dependency checksums
└── README.md                # Setup instructions
```

---

### API Endpoints (Complete List)

#### Thought Processing
```
POST   /api/process-thought
POST   /api/reprocess-thought
POST   /api/revert-thought-processing
POST   /api/chat
```

#### Investment
```
POST   /api/predict-investment
GET    /api/stock-price
GET    /api/stock-history
POST   /api/refresh-ticker-prices      # Background trigger
POST   /api/create-portfolio-snapshot   # Background trigger
```

#### Spending
```
POST   /api/spending/categorize
POST   /api/spending/link-trip
POST   /api/spending/dismiss-trip-suggestion
POST   /api/spending/delete-csv
POST   /api/spending/delete-all-transactions
```

#### Plaid (Banking)
```
POST   /api/plaid/create-link-token
POST   /api/plaid/exchange-public-token
POST   /api/plaid/create-relink-token
POST   /api/plaid/mark-relinking
POST   /api/plaid/trigger-sync
POST   /api/plaid/webhook              # Plaid → Backend
```

#### Stripe (Billing)
```
POST   /api/stripe/create-checkout-session
POST   /api/stripe/create-portal-session
POST   /api/stripe/webhook             # Stripe → Backend
POST   /api/stripe/sync-subscription
GET    /api/stripe/invoices
GET    /api/stripe/payment-method
POST   /api/stripe/reactivate-subscription
GET    /api/stripe/usage-stats
```

#### Photos
```
POST   /api/photo/vote
GET    /api/photo/next-pair
POST   /api/photo/signed-url
```

#### Places
```
POST   /api/place/insights
```

#### Visa
```
POST   /api/visa/update-data            # Background trigger
GET    /api/visa/requirements
```

#### File Processing (Webhook-style)
```
POST   /api/process-csv                 # Called by storage trigger
POST   /api/process-dexa-scan           # Called by storage trigger
POST   /api/process-photo-thumbnail     # Called by storage trigger
```

#### Maintenance (Background Jobs)
```
POST   /api/cleanup-anonymous-users     # Daily cron
POST   /api/update-visa-data            # Weekly cron
```

#### Health
```
GET    /health                          # Health check
GET    /metrics                         # Prometheus metrics
```

---

### Authentication & Authorization

#### Flow
1. **Client → Backend:**
   - Header: `Authorization: Bearer <firebase-id-token>`
2. **Backend Verification:**
   ```go
   func authMiddleware(next http.Handler) http.Handler {
       return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
           authHeader := r.Header.Get("Authorization")
           token := strings.TrimPrefix(authHeader, "Bearer ")

           // Verify with Firebase Admin
           decodedToken, err := firebaseAuth.VerifyIDToken(ctx, token)
           if err != nil {
               http.Error(w, "Unauthorized", 401)
               return
           }

           // Extract user info
           uid := decodedToken.UID
           isAnonymous := decodedToken.Firebase.SignInProvider == "anonymous"

           // Check anonymous AI access
           if isAnonymous {
               allowed, err := checkAnonymousAiAccess(ctx, uid)
               if err != nil || !allowed {
                   http.Error(w, "Forbidden: Anonymous sessions cannot access AI", 403)
                   return
               }
           }

           // Add user context to request
           ctx := context.WithValue(r.Context(), "uid", uid)
           ctx = context.WithValue(ctx, "isAnonymous", isAnonymous)
           next.ServeHTTP(w, r.WithContext(ctx))
       })
   }
   ```

3. **Anonymous AI Check:**
   - Query `anonymousSessions/{uid}`
   - Check: `allowAi == true` AND `expiresAt > now` AND `!cleanupPending`

4. **Subscription Check (for AI endpoints):**
   ```go
   func requireSubscription(next http.Handler) http.Handler {
       return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
           uid := r.Context().Value("uid").(string)

           // Get subscription status
           sub, err := getSubscriptionStatus(ctx, uid)
           if err != nil || !sub.AiAllowed {
               http.Error(w, "Pro subscription required", 403)
               return
           }

           next.ServeHTTP(w, r)
       })
   }
   ```

---

### Data Access Layer

#### Repository Pattern

```go
type FirestoreRepository struct {
    client *firestore.Client
    auth   *auth.Client
}

// CreateDocument - matches createAt() from gateway.ts
func (r *FirestoreRepository) CreateDocument(ctx context.Context, path string, data map[string]interface{}) error {
    uid := ctx.Value("uid").(string)

    // Add metadata (matching gateway.ts:59-68)
    now := time.Now()
    data["createdAt"] = now
    data["updatedAt"] = now
    data["updatedBy"] = uid
    data["version"] = 1

    // Remove undefined values (matching removeUndefined)
    cleanData := removeUndefinedValues(data)

    ref := r.client.Doc(path)
    _, err := ref.Set(ctx, cleanData)
    return err
}

// UpdateDocument - matches updateAt() from gateway.ts
func (r *FirestoreRepository) UpdateDocument(ctx context.Context, path string, updates map[string]interface{}) error {
    uid := ctx.Value("uid").(string)

    // Add metadata
    updates["updatedAt"] = time.Now()
    updates["updatedBy"] = uid
    updates["version"] = firestore.Increment(1)

    cleanUpdates := removeUndefinedValues(updates)

    ref := r.client.Doc(path)
    _, err := ref.Update(ctx, mapToUpdates(cleanUpdates))
    return err
}

// DeleteDocument - matches deleteAt() from gateway.ts
func (r *FirestoreRepository) DeleteDocument(ctx context.Context, path string) error {
    ref := r.client.Doc(path)
    _, err := ref.Delete(ctx)
    return err
}

// GetDocument - read a single document
func (r *FirestoreRepository) GetDocument(ctx context.Context, path string) (*firestore.DocumentSnapshot, error) {
    ref := r.client.Doc(path)
    return ref.Get(ctx)
}

// QueryCollection - query with filters
func (r *FirestoreRepository) QueryCollection(ctx context.Context, collectionPath string, filters []firestore.Query) ([]*firestore.DocumentSnapshot, error) {
    query := r.client.Collection(collectionPath).Query
    for _, filter := range filters {
        query = filter
    }
    return query.Documents(ctx).GetAll()
}
```

#### Storage Repository

```go
type StorageRepository struct {
    bucket *storage.BucketHandle
}

// UploadFile - upload to Firebase Storage
func (r *StorageRepository) UploadFile(ctx context.Context, path string, data []byte, contentType string) error {
    obj := r.bucket.Object(path)
    writer := obj.NewWriter(ctx)
    writer.ContentType = contentType

    if _, err := writer.Write(data); err != nil {
        return err
    }

    return writer.Close()
}

// GetSignedURL - get temporary download URL
func (r *StorageRepository) GetSignedURL(ctx context.Context, path string, expiry time.Duration) (string, error) {
    obj := r.bucket.Object(path)
    opts := &storage.SignedURLOptions{
        Expires: time.Now().Add(expiry),
        Method:  "GET",
    }
    return obj.SignedURL(opts)
}

// DeleteFile - delete from storage
func (r *StorageRepository) DeleteFile(ctx context.Context, path string) error {
    obj := r.bucket.Object(path)
    return obj.Delete(ctx)
}
```

---

### Service Layer Examples

#### Thought Processing Service

```go
type ThoughtProcessingService struct {
    repo       *FirestoreRepository
    openai     *OpenAIClient
    contextSvc *ContextGathererService
    subscription *SubscriptionService
}

func (s *ThoughtProcessingService) ProcessThought(ctx context.Context, thoughtID string) error {
    uid := ctx.Value("uid").(string)

    // 1. Validate subscription
    allowed, err := s.subscription.IsAiAllowed(ctx, uid)
    if err != nil || !allowed {
        return errors.New("AI processing not allowed")
    }

    // 2. Get thought document
    thoughtPath := fmt.Sprintf("users/%s/thoughts/%s", uid, thoughtID)
    thoughtSnap, err := s.repo.GetDocument(ctx, thoughtPath)
    if err != nil {
        return err
    }

    var thought Thought
    thoughtSnap.DataTo(&thought)

    // 3. Check if already processed
    if contains(thought.Tags, "processed") {
        return errors.New("already processed")
    }

    // 4. Gather user context
    userContext, err := s.contextSvc.GatherContext(ctx, uid)
    if err != nil {
        return err
    }

    // 5. Build AI prompt
    prompt := s.buildPrompt(thought, userContext)

    // 6. Call OpenAI
    response, err := s.openai.Chat(ctx, prompt)
    if err != nil {
        return err
    }

    // 7. Parse actions
    actions, err := parseActions(response)
    if err != nil {
        return err
    }

    // 8. Execute actions
    for _, action := range actions {
        if err := s.executeAction(ctx, uid, thoughtID, action); err != nil {
            log.Error("Failed to execute action", zap.Error(err))
        }
    }

    // 9. Update thought
    updates := map[string]interface{}{
        "tags": append(thought.Tags, "processed"),
        "aiProcessingStatus": "completed",
        "processedAt": time.Now(),
    }

    return s.repo.UpdateDocument(ctx, thoughtPath, updates)
}

func (s *ThoughtProcessingService) executeAction(ctx context.Context, uid, thoughtID string, action Action) error {
    switch action.Type {
    case "createTask":
        return s.createTask(ctx, uid, action.Data)
    case "createProject":
        return s.createProject(ctx, uid, action.Data)
    case "createMood":
        return s.createMood(ctx, uid, action.Data)
    case "createRelationship":
        return s.createRelationship(ctx, uid, thoughtID, action.Data)
    default:
        return fmt.Errorf("unknown action type: %s", action.Type)
    }
}
```

#### Subscription Service

```go
type SubscriptionService struct {
    repo *FirestoreRepository
}

func (s *SubscriptionService) IsAiAllowed(ctx context.Context, uid string) (bool, error) {
    isAnonymous := ctx.Value("isAnonymous").(bool)

    // Anonymous users need special check
    if isAnonymous {
        sessionPath := fmt.Sprintf("anonymousSessions/%s", uid)
        sessionSnap, err := s.repo.GetDocument(ctx, sessionPath)
        if err != nil {
            return false, err
        }

        var session AnonymousSession
        sessionSnap.DataTo(&session)

        // Check allowAi flag and expiry
        if !session.AllowAi || session.ExpiresAt.Before(time.Now()) || session.CleanupPending {
            return false, nil
        }

        return true, nil
    }

    // Regular users: check subscription
    statusPath := fmt.Sprintf("users/%s/subscriptionStatus/current", uid)
    statusSnap, err := s.repo.GetDocument(ctx, statusPath)
    if err != nil {
        return false, err
    }

    var status SubscriptionStatus
    statusSnap.DataTo(&status)

    // Check tier and entitlements
    if status.Tier != "pro" {
        return false, nil
    }

    if status.Entitlements == nil || !status.Entitlements.AiProcessing {
        return false, nil
    }

    return true, nil
}
```

---

### Background Workers

```go
// Worker for processing queued thoughts
func StartThoughtQueueWorker(ctx context.Context, repo *FirestoreRepository, svc *ThoughtProcessingService) {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            // Process queued jobs
            if err := processQueue(ctx, repo, svc); err != nil {
                log.Error("Queue processing failed", zap.Error(err))
            }
        case <-ctx.Done():
            return
        }
    }
}

func processQueue(ctx context.Context, repo *FirestoreRepository, svc *ThoughtProcessingService) error {
    // Query all users' processing queues
    // This is simplified - in production, use Pub/Sub or task queue
    users, err := repo.QueryCollection(ctx, "users", nil)
    if err != nil {
        return err
    }

    for _, userSnap := range users {
        uid := userSnap.Ref.ID
        queuePath := fmt.Sprintf("users/%s/processingQueue", uid)

        // Get pending jobs
        jobs, err := repo.QueryCollection(ctx, queuePath, []firestore.Query{
            firestore.Where("status", "==", "queued"),
        })
        if err != nil {
            continue
        }

        for _, jobSnap := range jobs {
            var job ThoughtProcessingJob
            jobSnap.DataTo(&job)

            // Process thought
            if err := svc.ProcessThought(ctx, job.ThoughtID); err != nil {
                log.Error("Failed to process thought", zap.Error(err))
                // Update job status to failed
            } else {
                // Update job status to completed
            }
        }
    }

    return nil
}

// Daily cleanup of expired anonymous sessions
func StartAnonymousCleanupWorker(ctx context.Context, repo *FirestoreRepository) {
    ticker := time.NewTicker(24 * time.Hour)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            if err := cleanupExpiredSessions(ctx, repo); err != nil {
                log.Error("Cleanup failed", zap.Error(err))
            }
        case <-ctx.Done():
            return
        }
    }
}
```

---

### Configuration

```yaml
# config/config.yaml
server:
  port: 8080
  timeout: 30s
  cors:
    allowed_origins:
      - http://localhost:3000
      - https://focusnotebook.app
    allowed_methods:
      - GET
      - POST
      - PUT
      - DELETE
    allowed_headers:
      - Authorization
      - Content-Type

firebase:
  project_id: your-project-id
  credentials_path: ./service-account-key.json
  storage_bucket: your-bucket.firebasestorage.app

openai:
  api_key: ${OPENAI_API_KEY}
  default_model: gpt-4o
  max_tokens: 2000

anthropic:
  api_key: ${ANTHROPIC_API_KEY}
  default_model: claude-3-sonnet-20240229

stripe:
  secret_key: ${STRIPE_SECRET_KEY}
  webhook_secret: ${STRIPE_WEBHOOK_SECRET}

plaid:
  client_id: ${PLAID_CLIENT_ID}
  secret: ${PLAID_SECRET}
  environment: sandbox  # or production

alpha_vantage:
  api_key: ${ALPHA_VANTAGE_API_KEY}

logging:
  level: info  # debug, info, warn, error
  format: json  # json or console

workers:
  thought_queue:
    enabled: true
    interval: 10s
  anonymous_cleanup:
    enabled: true
    interval: 24h
  stock_prices:
    enabled: true
    interval: 15m
  portfolio_snapshot:
    enabled: true
    cron: "0 0 * * *"  # Daily at midnight
```

---

### Deployment

#### Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build server
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Build worker
RUN CGO_ENABLED=0 GOOS=linux go build -o /worker ./cmd/worker

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binaries
COPY --from=builder /server .
COPY --from=builder /worker .

# Copy config
COPY config/ ./config/

EXPOSE 8080

# Default to server (can override with CMD)
CMD ["./server"]
```

#### docker-compose.yml (for local development)

```yaml
version: '3.8'

services:
  server:
    build: .
    ports:
      - "8080:8080"
    environment:
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - PLAID_CLIENT_ID=${PLAID_CLIENT_ID}
      - PLAID_SECRET=${PLAID_SECRET}
    volumes:
      - ./config:/root/config
      - ./service-account-key.json:/root/service-account-key.json
    command: ./server

  worker:
    build: .
    environment:
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./config:/root/config
      - ./service-account-key.json:/root/service-account-key.json
    command: ./worker
```

---

### Migration Strategy

#### Phase 1: Setup & Foundation (Week 1-2)
1. ✅ Set up Go project structure
2. ✅ Implement Firebase Admin SDK integration
3. ✅ Build authentication middleware
4. ✅ Create Firestore repository layer
5. ✅ Add logging and error handling
6. ✅ Write comprehensive tests

#### Phase 2: Core API Endpoints (Week 3-4)
1. ✅ Implement thought processing endpoints
2. ✅ Implement chat endpoint
3. ✅ Implement stock data endpoints
4. ✅ Add health check and metrics
5. ✅ Test with frontend (parallel to Firebase)

#### Phase 3: Integrations (Week 5-6)
1. ✅ Stripe billing integration
2. ✅ Plaid banking integration
3. ✅ File processing endpoints (CSV, PDF)
4. ✅ Photo voting endpoints
5. ✅ Place insights endpoint

#### Phase 4: Background Workers (Week 7-8)
1. ✅ Thought queue worker
2. ✅ Stock price refresh worker
3. ✅ Portfolio snapshot worker
4. ✅ Anonymous cleanup worker
5. ✅ Visa data update worker

#### Phase 5: Testing & Deployment (Week 9-10)
1. ✅ Integration testing
2. ✅ Load testing
3. ✅ Deploy to Cloud Run (or chosen host)
4. ✅ Monitor for issues
5. ✅ Gradual traffic shift from Firebase Functions

#### Phase 6: Cleanup (Week 11-12)
1. ✅ Decommission Firebase Cloud Functions
2. ✅ Update documentation
3. ✅ Cost analysis and optimization

---

### Testing Strategy

#### Unit Tests
- All services have test coverage
- Mock Firestore and external APIs
- Test error handling and edge cases

```go
func TestThoughtProcessingService_ProcessThought(t *testing.T) {
    mockRepo := NewMockFirestoreRepository()
    mockOpenAI := NewMockOpenAIClient()

    svc := &ThoughtProcessingService{
        repo:   mockRepo,
        openai: mockOpenAI,
    }

    ctx := context.WithValue(context.Background(), "uid", "test-user")

    err := svc.ProcessThought(ctx, "thought-123")
    assert.NoError(t, err)

    // Verify thought was updated
    assert.True(t, mockRepo.UpdateCalled)
}
```

#### Integration Tests
- Test with Firebase Emulator
- Test full request → response flow
- Verify database state after operations

#### Load Tests
- Use `hey` or `k6` for load testing
- Test concurrent requests
- Measure response times under load

---

### Monitoring & Observability

#### Metrics (Prometheus)
```go
var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "Duration of HTTP requests",
        },
        []string{"path", "method", "status"},
    )

    thoughtsProcessed = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "thoughts_processed_total",
            Help: "Total number of thoughts processed",
        },
    )
)
```

#### Logging
```go
logger, _ := zap.NewProduction()
defer logger.Sync()

logger.Info("Processing thought",
    zap.String("uid", uid),
    zap.String("thoughtId", thoughtID),
    zap.Duration("duration", duration),
)
```

#### Alerts
- Response time > 2s
- Error rate > 1%
- Queue backlog > 100 items
- Worker failures

---

### Cost Comparison

| Service | Firebase | Go Backend (Cloud Run) | Savings |
|---------|----------|------------------------|---------|
| Compute | $0.40/million invocations | $0.024/million requests | **94%** |
| Egress | $0.12/GB | $0.12/GB | 0% |
| Build time | Included | Included | 0% |
| **Total** | **~$200/mo** | **~$12/mo** | **94%** |

*Estimates based on 5M requests/month, 100ms avg duration*

**Additional savings:**
- No vendor lock-in
- Easier to optimize and scale
- Simpler debugging and testing
- Can move to cheaper VPS if needed

---

## Summary

### What Frontend Changes Are Needed?
**ZERO.** The frontend continues to:
- Use Firebase Auth SDK for authentication
- Use Firestore SDK for real-time data subscriptions
- Use Firebase Storage SDK for file uploads
- Call API endpoints at `/api/*` (which now route to Go backend)

### What Does the Go Backend Replace?
1. ✅ All Firebase Cloud Functions (35+ functions)
2. ✅ All Next.js API routes (7 routes)
3. ✅ Background workers and cron jobs

### What Stays on Firebase?
1. ✅ Authentication (Firebase Auth)
2. ✅ Database (Firestore)
3. ✅ File Storage (Firebase Storage)
4. ✅ Security Rules (firestore.rules, storage.rules)

### Key Benefits
1. ✅ **94% cost reduction** on compute
2. ✅ **No vendor lock-in** - can switch database later
3. ✅ **Faster development** - Go is simpler than TypeScript + Firebase ecosystem
4. ✅ **Better performance** - compiled language, more efficient
5. ✅ **Easier debugging** - standard HTTP server, no serverless constraints
6. ✅ **Simple deployment** - single Docker container
7. ✅ **No breaking changes** - frontend works as-is

---

## Next Steps

1. **Review this analysis** with the team
2. **Approve architecture** and technology choices
3. **Set up Go project** structure
4. **Implement Phase 1** (foundation + auth)
5. **Test with frontend** in parallel to existing Firebase
6. **Continue phases 2-6** with gradual rollout

---

**Questions or concerns?** Please discuss before moving to implementation.
