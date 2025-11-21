# Focus Notebook - Comprehensive Codebase Structure Analysis

**Analysis Date:** November 21, 2025  
**Repository:** focus-notebook (Monorepo)  
**Total TypeScript/TSX Files:** 394  
**Total Go Files:** 43  
**Branch:** claude/organize-codebase-structure-01HpjS5zmcAHQN4dzmba9rQr

---

## Executive Summary

Focus Notebook is a **monorepo** containing:

1. **Frontend (Next.js/React/TypeScript)** - Primary web application
2. **Firebase Cloud Functions (TypeScript/Node.js)** - Serverless backend
3. **Go Backend (Golang)** - Modern performance-focused backend service
4. **Mobile (React Native)** - Capacitor-based iOS wrapper
5. **E2E Tests (Playwright)** - Visual regression & integration testing
6. **Shared Types** - Cross-project type definitions
7. **Documentation** - Comprehensive guides

---

## 1. ROOT DIRECTORY LAYOUT

```
/focus-notebook (root)
├── .git/                          # Git repository
├── .github/                       # GitHub workflows (CI/CD)
├── .env.local                     # Environment variables (dev)
├── .env.local.example             # Environment template
├── .eslintrc.json                 # ESLint config
├── .firebaserc                    # Firebase project config
├── .gitignore                     # Git ignore rules
├── .lighthouseci/                 # Lighthouse CI config
├── .nvmrc                         # Node version specification
│
├── CLAUDE.md                      # AI Assistant Development Guide (28KB)
├── GPT.md                         # GPT-specific instructions
├── LICENSE                        # MIT License
├── README.md                      # Main project README
├── QUICK_BUILD_STEPS.txt          # Quick reference guide
│
├── TIME_TRACKING_*.md             # Time tracking analysis docs (5 files)
├── VISA_SETUP.md                  # Visa tool setup guide
│
├── Package Management & Build
├── package.json                   # Root workspace dependencies
├── package-lock.json              # Locked dependency versions
├── tsconfig.json                  # TypeScript root config
├── jest.config.js                 # Jest test framework config
├── jest.setup.ts                  # Jest setup file
├── next.config.mjs                # Next.js configuration
├── postcss.config.js              # PostCSS config
├── tailwind.config.ts             # Tailwind CSS config
├── playwright.config.ts           # Playwright E2E test config
├── components.json                # shadcn/ui components config
├── capacitor.config.ts            # Capacitor mobile config
├── cors.json                      # CORS configuration
│
├── Firebase Configuration
├── firebase.json                  # Firebase deployment config
├── firestore.rules                # Firestore security rules
├── firestore.indexes.json         # Firestore index definitions
├── storage.rules                  # Firebase Storage rules
│
├── Source Code Directories
├── src/                           # Main Next.js application (394 .ts/.tsx files)
├── functions/                     # Firebase Cloud Functions
├── backend-go/                    # Golang backend service
├── mobile/                        # React Native/Capacitor mobile
├── shared/                        # Shared types and utilities
├── e2e/                           # Playwright end-to-end tests
├── docs/                          # Documentation
├── scripts/                       # Build and utility scripts
├── public/                        # Static assets
├── lhci_reports/                  # Lighthouse CI reports
│
└── sample-import-data.json        # Sample data for testing
```

---

## 2. FRONTEND APPLICATION STRUCTURE (`/src`)

The main Next.js 14 application with 394 TypeScript/TSX files organized into:

### 2.1 App Router Structure (`/src/app`)
```
/src/app/
├── page.tsx                       # Landing page
├── layout.tsx                     # Root layout
├── not-found.tsx                 # 404 page
├── globals.css                   # Global styles
│
├── api/                          # API routes (7 route handlers)
│   ├── chat/route.ts            # AI chat interface
│   ├── process-thought/route.ts # Thought processing
│   ├── predict-investment/route.ts
│   ├── spending/
│   │   ├── [action]/route.ts    # Dynamic spending routes
│   │   └── delete-csv/route.ts
│   ├── stock-history/route.ts
│   └── stock-price/route.ts
│
├── admin/                        # Admin panel pages
├── billing/                      # Billing pages
├── dashboard/                    # Dashboard routes
├── learn/                        # Learning/educational content
├── login/                        # Authentication pages
├── profile/                      # User profile pages
├── settings/                     # User settings pages
│
└── tools/                        # 30 Tool Applications
    ├── admired-people/          # People admiration tracking
    ├── asset-horizon/           # Asset planning
    ├── body-progress/           # Fitness tracking
    ├── calendar/                # Calendar view
    ├── cbt/                     # Cognitive Behavioral Therapy
    ├── deepreflect/             # Deep reflection tool
    ├── errands/                 # Task errand tracking
    ├── finances/                # Financial overview
    ├── focus/                   # Focus sessions (Pomodoro)
    ├── friends/                 # Relationship tracking
    ├── goals/                   # Goal management
    ├── investments/             # Investment tracking
    ├── meditation/              # Meditation sessions
    ├── migrate/                 # Data migration tool
    ├── moodtracker/            # Mood tracking
    ├── notes/                   # Note taking
    ├── packing-list/            # Trip packing lists
    ├── photo-feedback/          # Photo voting/feedback
    ├── places/                  # Location tracking
    ├── productivity/            # Productivity tools
    ├── projects/                # Project management
    ├── relationships/           # Relationship tracking
    ├── soulful/                 # Wellness tool
    ├── spending/                # Spending tracker
    ├── subscriptions/           # Subscription management
    ├── tasks/                   # Task management
    ├── thoughts/                # Thought tracking
    ├── travel/                  # Travel planning
    └── trips/                   # Trip management
```

### 2.2 Components (`/src/components`) - 16+ subdirectories
```
/src/components/
├── ui/                          # Reusable UI primitives
│   └── [50+ component files]    # Buttons, cards, modals, etc.
│
├── billing/                     # Billing-related components
├── body-progress/               # Body progress components
├── dashboard/                   # Dashboard components
├── entity-graph/                # Entity relationship visualizations
├── goal/                        # Goal components
├── import-export/               # Import/export components
├── investment/                  # Investment components
├── migrations/                  # Data migration components
├── photo-feedback/              # Photo voting components
├── spending/                    # Spending tool components
├── subscription/                # Subscription components
├── tools/                       # Tool-specific components
├── trip/                        # Trip planning components
├── visa-finder/                 # Visa lookup components
│
├── [Root components]
├── AdmiredPersonCard.tsx         # Feature cards
├── ConfirmModal.tsx              # Confirmation dialogs
├── ConnectionHealthMonitor.tsx   # Connection status
├── EnhancedDataManagement.tsx     # Data management UI
├── ErrorBoundary.tsx             # Error handling
├── FirestoreSubscriber.tsx        # Real-time subscriptions
├── FocusSession.tsx              # Main focus timer (67KB)
├── FocusStatistics.tsx            # Focus session analytics
├── Layout.tsx                     # Layout wrapper
├── LandingPage.tsx                # Landing page (24KB)
├── MostUsedTools.tsx              # Tool usage analytics
├── Navbar.tsx                     # Navigation bar
├── OfflineBanner.tsx              # Offline indicator
├── RichTextEditor.tsx             # TipTap rich text editor
└── [More feature components]
```

### 2.3 State Management (`/src/store`) - 32 Zustand Stores
```
/src/store/
├── useAdmiredPeople.ts
├── useAnonymousSession.ts
├── useBillingData.ts
├── useBodyProgress.ts
├── useCalendar.ts
├── useCurrency.ts
├── useEntityGraph.ts
├── useFocus.ts                  # Focus session state (29KB)
├── useFriends.ts
├── useGoals.ts
├── useInvestments.ts            # Investment tracking (36KB)
├── useLLMLogs.ts
├── useLLMQueue.ts               # LLM request queueing
├── useMoods.ts
├── usePackingLists.ts           # Packing list management
├── usePhotoFeedback.ts          # Photo voting state (32KB)
├── usePlaces.ts
├── useProjects.ts
├── useRelationships.ts
├── useRequestLog.ts
├── useSettings.ts
├── useSettingsStore.ts
├── useSpending.ts               # Spending tracking
├── useSpendingTool.ts           # Advanced spending (16KB)
├── useSubscriptionStatus.ts
├── useSubscriptions.ts
├── useTasks.ts                  # Task management (10KB)
├── useThoughts.ts               # Thought tracking (7KB)
├── useTokenUsage.ts
├── useToolUsage.ts
├── useTrips.ts                  # Trip planning (10KB)
├── useUsageStats.ts
└── useVisaFinder.ts
```

### 2.4 Custom Hooks (`/src/hooks`) - 41+ hooks
```
/src/hooks/
├── [Domain-specific hooks - in /store]
├── [UI hooks]
├── use-toast.ts                 # Toast notifications
├── useAuthUserId.ts             # Get current user ID
├── useConfirm.tsx               # Confirmation dialog
├── useConnectionHealth.ts       # Monitor connection
├── useHaptics.ts                # Mobile haptic feedback
├── useImportExport.ts           # Data import/export (23KB)
├── useInfiniteGallery.ts        # Infinite gallery loading
├── useInfiniteScroll.ts         # Infinite scroll
└── useTrackToolUsage.ts         # Track tool analytics
```

### 2.5 Library/Services (`/src/lib`) - 11 subdirectories
```
/src/lib/
├── analytics/                   # Analytics utilities
├── cbtUtils.ts                  # CBT-specific utilities
├── constants/                   # Application constants
├── data/                        # Data access layer
│   ├── gateway.ts              # CRUD operations wrapper
│   └── subscribe.ts            # Real-time subscriptions
│
├── deviceDetection.ts          # Device type detection
├── firebase/                    # Firebase resilience layer
│   ├── circuit-breaker.ts      # Prevents cascading failures
│   ├── offline-queue.ts        # Offline operation queueing
│   ├── retry.ts                # Retry logic with backoff
│   ├── gateway.ts              # CRUD operations
│   ├── subscription-health.ts  # Real-time monitoring
│   ├── connection-monitor.ts   # Network tracking
│   └── metrics.ts              # Operation metrics
│
├── entityGraph/                 # Entity graph utilities
│   ├── [Entity relationship logic]
│
├── firebaseClient.ts           # Firebase client initialization
├── formatDateTime.ts           # Date/time formatting
├── formatNotes.tsx             # Rich text formatting
│
├── migrations/                  # Data migration scripts
│   └── [Migration files]
│
├── server/                      # Server-side utilities
├── services/                    # Service utilities
├── utils/                       # General utilities
├── toast-presets.ts            # Toast notification presets
└── utils.ts                    # Utility functions
```

### 2.6 Services (`/src/services`) - Business Logic
```
/src/services/
├── TimeTrackingService.ts      # Time tracking logic (7.6KB)
├── entityService.ts            # Centralized entity management (15KB)
├── thoughtProcessingService.ts # Thought processing logic (17KB)
└── import-export/              # Import/export business logic
    └── [Import/export services]
```

### 2.7 Data Layer (`/src/repositories`) - Repository Pattern
```
/src/repositories/
├── firebase/                    # Firebase repositories
│   └── [Concrete repository implementations]
├── interfaces/                  # Repository interfaces
│   └── [Interface definitions]
└── mock/                        # Mock repositories for testing
    └── [Mock implementations]
```

### 2.8 Contexts & DI (`/src/contexts` & `/src/di`)
```
/src/contexts/
├── AuthContext.tsx             # Authentication & user session
└── DIContext.tsx               # Dependency injection context

/src/di/
├── Container.ts                # Service container
├── ServiceKeys.ts              # Service identifiers
└── setup.ts                    # DI setup and configuration
```

### 2.9 Type Definitions (`/src/types`)
```
/src/types/
├── aiMetadata.ts               # AI processing metadata
├── entityGraph.ts              # Entity relationship types (13KB)
├── import-export.ts            # Import/export types (9.6KB)
├── packing-list.ts             # Packing list types (3.5KB)
├── spending-tool.ts            # Spending types (17KB)
├── visa.ts                     # Visa types (2.4KB)
├── react-native-shim.d.ts      # React Native type definitions
└── index.ts                    # Type exports
```

### 2.10 Testing (`/src/__tests__`)
```
/src/__tests__/
├── lib/                         # Library/utility tests
├── integration/                 # Integration tests
├── routes/                      # API route tests
└── utils/                       # Test utilities
    ├── builders/               # Test data builders
    └── testHelpers/            # Common test utilities
```

---

## 3. FIREBASE CLOUD FUNCTIONS (`/functions`)

Node.js/TypeScript serverless backend for Firebase:

```
/functions/
├── src/
│   ├── index.ts                 # Entry point, exports all functions (3.1KB)
│   │
│   ├── [Main Functions - 26 TypeScript files]
│   ├── cleanupAnonymous.ts     # Anonymous user cleanup
│   ├── csvStorageTrigger.ts    # CSV file processing (20KB)
│   ├── deleteCSVStatement.ts   # CSV deletion logic
│   ├── dexaScanStorageTrigger.ts # DexaScan processing (9.5KB)
│   ├── marketData.ts           # Stock market data updates (13KB)
│   ├── packingList.ts          # Packing list generation (11KB)
│   ├── packingListTemplates.ts # Template management (16KB)
│   ├── photoThumbnails.ts      # Image thumbnail generation
│   ├── photoVotes.ts           # Photo voting logic (15KB)
│   ├── placeInsights.ts        # Place insights generation
│   ├── plaidFunctions.ts       # Plaid API integration (13KB)
│   ├── plaidWebhooks.ts        # Plaid webhook handlers (9.5KB)
│   ├── portfolioSnapshots.ts   # Daily portfolio snapshots (6.3KB)
│   ├── processCSVTransactions.ts # CSV transaction processing (13KB)
│   ├── processThought.ts       # AI thought processing (25KB)
│   ├── spendingMaintenance.ts  # Spending data maintenance
│   ├── stripeBilling.ts        # Stripe integration (34KB)
│   ├── tripLinking.ts          # Trip-spending linking (14KB)
│   ├── visaDataUpdater.ts      # Visa requirement updates (11KB)
│   │
│   ├── services/               # Specialized services
│   │   ├── categorizationService.ts  # Transaction categorization
│   │   ├── llmInsightsService.ts     # LLM-based insights
│   │   ├── plaidService.ts           # Plaid API wrapper
│   │   └── subscriptionDetection.ts  # Subscription detection
│   │
│   ├── utils/                  # Utility functions
│   │   ├── openaiClient.ts    # OpenAI integration
│   │   ├── encryption.ts      # Data encryption
│   │   ├── aiPromptLogger.ts  # AI request logging
│   │   └── contextGatherer.ts # Context data gathering
│   │
│   ├── prompts/                # YAML prompt templates
│   ├── types/                  # TypeScript types
│   ├── __mocks__/              # Mock data for testing
│   ├── __tests__/              # Jest test suites
│   └── config.ts               # Configuration
│
├── package.json                # Dependencies (Node.js 20)
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest test configuration
└── [.gitignore, .env.example]
```

**Key Dependencies:**
- firebase-functions: ^7.0.0
- firebase-admin: ^13.6.0
- OpenAI: ^6.9.0
- Anthropic SDK: ^0.68.0
- Stripe: ^14.24.0
- Plaid: ^39.1.0
- Sharp: ^0.33.5 (image processing)

---

## 4. GOLANG BACKEND (`/backend-go`)

High-performance backend service replacing Firebase Cloud Functions:

```
/backend-go/
├── cmd/                         # Executable entry points
│   └── server/
│       └── main.go             # HTTP API server
│
├── internal/                    # Private packages
│   ├── clients/                # External API clients
│   │   ├── anthropic.go       # Anthropic SDK wrapper
│   │   ├── openai.go          # OpenAI client
│   │   ├── stripe.go          # Stripe client
│   │   ├── plaid.go           # Plaid client
│   │   └── ratelimiter.go     # Rate limiting
│   │
│   ├── config/                # Configuration management
│   │   └── config.go          # Config parser
│   │
│   ├── handlers/              # HTTP request handlers
│   │   ├── analytics.go       # Analytics endpoints
│   │   ├── analytics_test.go
│   │   ├── entity_graph.go    # Entity graph endpoints
│   │   ├── entity_graph_test.go
│   │   ├── health.go          # Health check endpoint
│   │   ├── import_export.go   # Import/export handlers
│   │   ├── investment.go      # Investment endpoints
│   │   ├── investment_test.go
│   │   ├── plaid.go           # Plaid handlers
│   │   ├── stripe.go          # Stripe handlers
│   │   └── thought.go         # Thought processing handlers
│   │
│   ├── middleware/            # HTTP middleware
│   │   ├── auth.go            # Authentication middleware
│   │   ├── cors.go            # CORS handling
│   │   ├── logging.go         # Request logging
│   │   └── recovery.go        # Panic recovery
│   │
│   ├── models/                # Data models
│   │   ├── common.go          # Common models
│   │   └── thought.go         # Thought model
│   │
│   ├── repository/            # Data access layer
│   │   ├── firestore.go       # Firestore operations
│   │   └── mocks/
│   │       └── mock_repository.go
│   │
│   ├── services/              # Business logic (14 services)
│   │   ├── action_processor.go
│   │   ├── context_gatherer.go
│   │   ├── dashboard_analytics.go (23KB)
│   │   ├── dashboard_analytics_test.go
│   │   ├── entity_graph.go (16KB)
│   │   ├── entity_graph_test.go
│   │   ├── import_export.go (31KB)
│   │   ├── investment_calculations.go (15KB)
│   │   ├── investment_calculations_test.go
│   │   ├── plaid.go (17KB)
│   │   ├── spending_analytics.go (11KB)
│   │   ├── stripe_billing.go (13KB)
│   │   ├── subscription.go
│   │   └── thought_processing.go (11KB)
│   │
│   └── utils/                 # Utility functions
│       ├── response.go        # HTTP response helpers
│       └── logger.go          # Logging utilities
│
├── pkg/                       # Public packages
│   └── firebase/
│       └── admin.go           # Firebase Admin SDK setup
│
├── config/                    # Configuration files
│   └── [Config files]
│
├── [Docker & Deployment]
├── Dockerfile                 # Container image
├── docker-compose.yml         # Docker Compose setup
│
├── [Configuration & Docs]
├── go.mod                     # Go module definition
├── go.sum                     # Dependency versions
├── .golangci.yml              # Linting configuration
├── .env.example               # Environment template
├── .gitignore
│
├── [Documentation]
├── README.md                  # Getting started
├── QUICKSTART.md              # Quick reference
├── ANALYSIS.md                # Architecture analysis (44KB)
├── IMPLEMENTATION_SUMMARY.md  # Implementation notes (14KB)
├── PHASE2_SUMMARY.md          # Phase 2 work (17KB)
├── PHASE3_SUMMARY.md          # Phase 3 work (25KB)
└── PHASE4_PLAID_SUMMARY.md    # Phase 4 work (29KB)
```

**Go Module Dependencies:**
- cloud.google.com/go/firestore
- firebase.google.com/go/v4
- github.com/gorilla/mux
- github.com/stripe/stripe-go
- github.com/plaid/plaid-go
- github.com/anthropics/anthropic-sdk-go
- github.com/sashabaranov/go-openai
- Prometheus metrics
- Zap logging

---

## 5. MOBILE APPLICATION (`/mobile`)

React Native/Capacitor iOS wrapper:

```
/mobile/
├── screens/                   # Screen components
├── components/                # Reusable components
├── upload/                    # Image upload pipeline
│   ├── imageProcessor.ts      # Image compression
│   ├── uploadManager.ts       # Upload orchestration
│   ├── uploadQueue.ts         # Persistent queue
│   └── CachedImage.tsx        # Cached image rendering
│
├── [Mobile configuration]
└── [Mobile build files]
```

---

## 6. END-TO-END TESTS (`/e2e`)

Playwright-based automated testing:

```
/e2e/
├── *.spec.ts                   # Test suites
│   ├── auth.spec.ts           # Authentication flows
│   ├── dashboard.spec.ts      # Dashboard functionality
│   ├── modals.spec.ts         # Modal interactions
│   ├── tools-focus.spec.ts    # Focus tool tests
│   ├── tools-goals-thoughts.spec.ts
│   ├── tools-investment-trips.spec.ts
│   ├── tools-relationships.spec.ts
│   └── [More test files]
│
├── [Snapshot directories]
│   └── *.spec.ts-snapshots/   # Visual snapshots for comparison
│
├── fixtures/                   # Test data fixtures
├── helpers/                    # Test helper utilities
├── setup/                      # Test environment setup
│   └── emulator-data.ts       # Firebase emulator seed data
│
└── playwright.config.ts        # Playwright configuration
```

---

## 7. SHARED & CONFIGURATION

### Shared Types (`/shared`)
```
/shared/
└── [Shared type definitions and utilities]
```

### Documentation (`/docs`)
```
/docs/
├── README.md                   # Documentation index
├── guides/
│   ├── setup.md              # Setup instructions
│   ├── development.md        # Dev workflow
│   ├── testing.md            # Testing guide
│   └── contributing.md       # Contribution guide
│
└── reference/
    ├── architecture.md       # Architecture overview
    ├── features.md          # Feature documentation
    ├── functions.md         # Cloud functions reference
    └── spending-api.md      # Spending API details
```

### Scripts (`/scripts`)
```
/scripts/
└── [Build and utility scripts]
```

---

## 8. TECHNOLOGY STACK SUMMARY

### Frontend
- **Framework**: Next.js 14.2.33 (App Router)
- **Language**: TypeScript 5.6.3
- **UI Library**: React 18.3.1
- **State Management**: Zustand 4.5.4 (31 stores)
- **Forms**: react-hook-form 7.53.0
- **Styling**: Tailwind CSS 3.4.10
- **Components**: Radix UI primitives
- **Icons**: lucide-react 0.545.0
- **Rich Text**: TipTap 3.10.7
- **Charts**: recharts 3.3.0
- **Animation**: framer-motion 11.0.0
- **Maps**: react-simple-maps 3.0.0

### Backend (Cloud Functions)
- **Runtime**: Node.js 20
- **Framework**: Firebase Cloud Functions 7.0.0
- **Database**: Firestore
- **Auth**: Firebase Auth + Admin SDK
- **File Storage**: Firebase Storage

### Backend (Go)
- **Language**: Go 1.21
- **HTTP Framework**: Gorilla mux
- **Database**: Firestore (via Admin SDK)
- **Auth**: Firebase token verification
- **Logging**: Zap
- **Metrics**: Prometheus

### Mobile
- **Framework**: Capacitor 7.4.3
- **Platform**: iOS wrapper
- **Image Processing**: Custom pipeline with compression

### Testing
- **Unit Tests**: Jest 29.7.0
- **E2E Tests**: Playwright 1.56.1
- **Component Testing**: React Testing Library

### Third-party Integrations
- **Payment**: Stripe 14.24.0
- **Banking**: Plaid 39.1.0
- **AI**: OpenAI, Anthropic SDK
- **PDF Processing**: pdf-parse 2.4.5
- **Stock Data**: Alpha Vantage API

---

## 9. FILE STATISTICS

| Category | Count | Size |
|----------|-------|------|
| TypeScript/TSX Files (src) | 394 | ~5-6MB |
| Go Files (backend) | 43 | ~1-2MB |
| Total Test Files | 50+ | ~2-3MB |
| E2E Test Snapshots | 100+ | ~10MB+ |
| Documentation Files | 15+ | ~500KB |

---

## 10. KEY ARCHITECTURAL PATTERNS

### Resilience & Performance
1. **Circuit Breaker** (`/src/lib/firebase/circuit-breaker.ts`)
   - Prevents cascading failures
   - Auto-recovery with exponential backoff

2. **Offline Queue** (`/src/lib/firebase/offline-queue.ts`)
   - Queues operations when offline
   - Retries on reconnection

3. **Real-time Subscriptions** (`/src/lib/firebase/subscription-health.ts`)
   - Monitors connection health
   - Auto-reconnect on failures

4. **Retry Logic** (`/src/lib/firebase/retry.ts`)
   - Exponential backoff strategy
   - Error classification

### Data Flow
1. **Gateway Pattern** - `createAt`, `updateAt`, `deleteAt` wrappers
2. **Subscribe Pattern** - Real-time synchronization
3. **Entity Service** - Centralized entity management
4. **Repository Pattern** - Data access abstraction
5. **DI Container** - Service locator pattern

### State Management
1. **Zustand Stores** - 32 domain-specific stores
2. **Real-time Subscriptions** - Integrated into stores
3. **Cache Management** - Local caching with metadata
4. **Sync Status** - Track loading, errors, sync state

---

## 11. DEPLOYMENT & HOSTING

### Frontend
- **Hosting**: Firebase Hosting (or Vercel)
- **Build**: `npm run build` → Next.js static + server functions
- **Deploy**: `firebase deploy --only hosting`

### Cloud Functions
- **Runtime**: Node.js 20 on Firebase
- **Deploy**: `firebase deploy --only functions`
- **Configuration**: `firebase.json`

### Go Backend
- **Deployment Options**:
  - Google Cloud Run (recommended)
  - Kubernetes
  - VPS/Dedicated server
  - Docker Compose (local dev)

---

## 12. CI/CD PIPELINE

### GitHub Actions Workflows (`.github/workflows/`)
1. **Frontend Tests** - Jest, TypeScript, ESLint
2. **E2E Tests** - Playwright visual regression
3. **Backend Tests** - Go tests with race detector
4. **Security Checks** - golangci-lint, gosec, govulncheck
5. **Coverage Reports** - Generated in CI, uploaded as artifacts

### Pre-Push Requirements
```bash
npm run lint      # ESLint
npm test          # Jest tests
npm run build     # Next.js production build
npx tsc          # TypeScript check
```

---

## 13. CURRENT ORGANIZATIONAL OBSERVATIONS

### Strengths
1. **Clear Separation**: Frontend, Cloud Functions, Go Backend well-isolated
2. **Feature-Driven**: Tools are organized by feature
3. **Comprehensive Stores**: Good Zustand organization
4. **Component Categorization**: UI components separated by feature
5. **Library Organization**: `/src/lib` has clear subdirectories
6. **Documentation**: Excellent CLAUDE.md and README files

### Areas for Consideration (Not Issues, Just Observations)
1. **Root-level Components**: Some generic components in `/src/components` root
2. **Root API Routes**: All API routes are in `/src/app/api` (could be categorized)
3. **Services Organization**: `/src/services` has business logic + `/src/lib/services` has utilities
4. **Hook Distribution**: Hooks split between `/src/store` and `/src/hooks`
5. **Type Organization**: Types in both `/src/types` and individual domains
6. **Test Organization**: Tests in `__tests__` separate from source (different from co-location)

---

## 14. MONOREPO WORKSPACE STRUCTURE

The project uses a **monorepo structure** with:
- **Root package.json** - Manages dependencies for web + functions
- **functions/package.json** - Cloud Functions workspace
- **backend-go/** - Separate Go module (go.mod)
- **mobile/** - React Native workspace

### Dependencies Resolution
- Root: React, Next.js, Zustand, Firebase SDK, testing tools
- Functions: Firebase Admin, OpenAI, Stripe, Plaid
- Go Backend: Firebase Admin SDK, AI SDKs, Stripe, Plaid
- Shared: Type definitions exported from `/src/types`

---

## 15. CONFIGURATION FILES MAPPING

| File | Purpose | Scope |
|------|---------|-------|
| `tsconfig.json` | Root TypeScript config | All .ts/.tsx |
| `functions/tsconfig.json` | Cloud Functions TS config | functions only |
| `jest.config.js` | Root test runner | Frontend tests |
| `functions/jest.config.js` | Function tests | Function tests |
| `.eslintrc.json` | Linting rules | All JS/TS |
| `next.config.mjs` | Next.js configuration | Frontend build |
| `playwright.config.ts` | E2E test runner | E2E tests |
| `tailwind.config.ts` | CSS framework | Styling |
| `firebase.json` | Firebase deployment | Hosting + Functions |
| `.firebaserc` | Firebase project config | Firebase project ID |
| `capacitor.config.ts` | Mobile config | iOS build |
| `.golangci.yml` | Go linting | backend-go |

---

## 16. ENTRY POINTS

### Web Application
- **Dev**: `npm run dev` → Next.js dev server on port 3000
- **Build**: `npm run build` → Production build in `.next/`
- **Start**: `npm run start` → Serve production build

### Cloud Functions
- **Dev**: `cd functions && npm run serve` → Firebase emulator
- **Build**: `npm run build` → Transpile TypeScript
- **Deploy**: `npm run deploy` → Deploy to Firebase

### Go Backend
- **Dev**: `go run cmd/server/main.go` → HTTP server on port 8080
- **Build**: `go build -o server ./cmd/server` → Binary compilation
- **Docker**: `docker-compose up` → Full stack locally

### Mobile
- **iOS**: Built via Capacitor from web app
- **Build**: Capacitor CLI generates iOS project

### Tests
- **Jest**: `npm test` → Unit and integration tests
- **Playwright**: `npm run test:screenshots` → E2E and visual regression
- **Go Tests**: `cd backend-go && go test ./...` → Go unit tests

---

## FINAL SUMMARY

Focus Notebook is a **well-organized, production-ready monorepo** with:

1. A modern Next.js 14 frontend with 30+ tools
2. Firebase Cloud Functions backend
3. An emerging Golang backend for performance
4. Mobile support via Capacitor
5. Comprehensive testing with Jest and Playwright
6. Strong documentation and development guidance

The codebase follows **industry best practices** including:
- Clear separation of concerns
- Feature-driven organization
- Resilience patterns (circuit breakers, offline queues)
- Comprehensive error handling
- Strong type safety with TypeScript
- Extensive testing coverage

The monorepo structure is **scalable** and supports multiple deployment targets while maintaining code sharing through types and utilities.

