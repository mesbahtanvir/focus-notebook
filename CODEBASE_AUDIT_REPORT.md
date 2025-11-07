# FOCUS NOTEBOOK - COMPREHENSIVE CODEBASE AUDIT (UPDATED)

## Executive Summary
This is an updated Next.js + React + Firebase application audit after main branch rebase. Total ~80K lines of TypeScript/JavaScript code across 337 source files.

**Updated:** November 7, 2025
**Key Changes:** Improvements in console logging (239 vs 250+), type assertions (187 vs 306), skipped tests (4 vs 8)

**Key Metrics:**
- Source files: 337 TypeScript/JavaScript files (src/)
- Test files: 63 total (expanded from 53)
- Firebase function files: 26 files (~7,933 lines)
- Zustand stores: 29 separate store modules
- Console.log statements in production: 239 (improved from 250+)
- Type assertions (as any): 187 (improved from 306)
- Type any usage: 228 instances

---

## 1. DELETABLE CODE

### 1.1 Duplicate Functions (CRITICAL - UNCHANGED)

#### Duplicate: `normalizeMerchantName()`
- **File 1:** `/home/user/focus-notebook/functions/src/plaidFunctions.ts:424-429`
- **File 2:** `/home/user/focus-notebook/functions/src/plaidWebhooks.ts:286-310`
- **Issue:** Identical merchant normalization logic duplicated across two files
  - **Difference:** plaidWebhooks has MERCHANT_PATTERNS defined inside function (12 items)
  - **Difference:** plaidFunctions has MERCHANT_PATTERNS defined at module level (13 items: includes 'SBX': 'Starbucks')
- **Impact:** Code maintenance nightmare if patterns change
- **Action:** Extract to shared utility file `functions/src/utils/merchantNormalizer.ts`
- **Effort:** 15 minutes
- **Lines to remove:** 20 total lines of duplication

**Code Location - plaidFunctions.ts (lines 389-429):**
```typescript
const MERCHANT_PATTERNS: Record<string, string> = {
  'AMZN': 'Amazon',
  'AMAZON': 'Amazon',
  'STARBUCKS': 'Starbucks',
  'SBX': 'Starbucks',  // <-- ONLY IN THIS VERSION
  'UBER': 'Uber',
  'NETFLIX': 'Netflix',
  'SPOTIFY': 'Spotify',
  'WALMART': 'Walmart',
  'TARGET': 'Target',
  'APPLE.COM': 'Apple',
  'GOOGLE': 'Google',
  'PAYPAL': 'PayPal',
  'VENMO': 'Venmo',
};

function normalizeMerchantName(name: string): string {
  const upper = name.toUpperCase();
  for (const [pattern, normalized] of Object.entries(MERCHANT_PATTERNS)) {
    if (upper.includes(pattern)) {
      return normalized;
    }
  }
  // ... rest of normalization logic
}
```

**Code Location - plaidWebhooks.ts (lines 286-310):**
```typescript
function normalizeMerchantName(name: string): string {
  const MERCHANT_PATTERNS: Record<string, string> = {
    'AMZN': 'Amazon',
    'AMAZON': 'Amazon',
    'STARBUCKS': 'Starbucks',
    // ... SBX missing here
    'UBER': 'Uber',
    // ... rest similar
  };
  // ... rest of normalization logic
}
```

#### Duplicate: `formatDate()` Functions (CONFUSING NAMING)
- **File 1:** `/home/user/focus-notebook/src/lib/cbtUtils.ts:73-118` - Handles Firestore Timestamps
- **File 2:** `/home/user/focus-notebook/src/lib/formatDateTime.ts:2-16` - Formats to "10th Oct 2025"
- **File 3:** `/home/user/focus-notebook/src/components/billing/InvoiceHistory.tsx` - Local date formatting
- **File 4:** Additional patterns in various utilities
- **Issue:** Same function name doing different things causes confusion and import errors
- **Recommendation:** 
  - Rename cbtUtils version to `parseDate()` or `normalizeFirestoreDate()`
  - Keep formatDateTime as the ordinal format function
  - Remove local duplicates and import from single source
- **Effort:** 1 hour
- **Impact:** High (confusion in imports and usage)

#### Multiple Settings Stores
- **useSettings.ts (54 lines)** - Manages: API keys, theme, AI model
- **useSettingsStore.ts (35 lines)** - Manages: cloud sync settings, sync interval, last sync time
- **Issue:** Two separate stores for different settings aspects
- **Usage:** useSettings used in 1 file, useSettingsStore used in 4 files
- **Recommendation:** Merge into single `useSettingsStore` with sections or create composed store
- **Effort:** 30 minutes
- **Impact:** Medium (maintenance burden)

**useSettings.ts structure:**
```typescript
export interface UserSettings {
  openaiApiKey?: string;
  theme?: 'light' | 'dark' | 'system';
  aiModel?: AIModel;
}
```

**useSettingsStore.ts structure:**
```typescript
interface SettingsState {
  cloudSyncEnabled: boolean;
  syncInterval: number; // minutes
  lastSyncTime: number | null;
}
```

#### Duplicate Task Store (Legacy + New)
- **useTasks.ts (360 lines)** - Current production store (56 imports across codebase)
- **useTasksV2.ts (133 lines)** - Refactored version using Repository pattern (2 imports only in tests)
- **Status:** useTasksV2 marked "will replace useTasks.ts once tested"
- **Action:** Complete migration or remove old store once v2 is validated
- **Effort:** 2-3 hours (depends on test completion)

### 1.2 Overly Large, Single-Purpose Files

#### Packing List Tool Page (CRITICAL SIZE)
- **File:** `/home/user/focus-notebook/src/app/tools/packing-list/page.tsx`
- **Size:** 1,828 lines in single component
- **Contents:** Type definitions, data structures, state management, UI rendering
- **Recommendation:** Split into:
  - `components/packing/PackingListTypes.ts` (type definitions, ~50 lines)
  - `components/packing/usePacking.ts` (Zustand store, ~200 lines)
  - `components/packing/PackingListUI.tsx` (main UI component, ~400 lines)
  - `components/packing/TimelineSection.tsx` (timeline rendering, ~300 lines)
  - `components/packing/ItemsSection.tsx` (items management, ~300 lines)
  - `components/packing/TripDetailsSection.tsx` (trip form, ~200 lines)
- **Effort:** 8-10 hours
- **Impact:** Very High (improves maintainability significantly)

#### Firebase Function Files (Large & Complex)
- **stripeBilling.ts: 1,077 lines** - Stripe integration with multiple operations
  - Contains: Subscription management, invoicing, payment methods, usage tracking, portal, webhooks
  - Recommendation: Break into:
    - `services/stripeSubscription.ts` (250 lines)
    - `services/stripeInvoicing.ts` (200 lines)
    - `services/stripePaymentMethods.ts` (150 lines)
    - `services/stripeUsageTracking.ts` (200 lines)
  - Effort: 6-8 hours

- **processThought.ts: 851 lines** - Thought processing with multiple sub-operations
  - Contains: Validation, LLM processing, queue management, status updates
  - Recommendation: Break into sub-services
  - Effort: 6-8 hours

- **marketData.ts: 413 lines** - Market data sync
- **plaidFunctions.ts: 439 lines** - Plaid operations
- **plaidWebhooks.ts: 311 lines** - Webhook handling

### 1.3 Boilerplate Tool Layout Files (17-18 files - SLIGHT IMPROVEMENT)

All these files contain ~6 lines of identical boilerplate:
```
/home/user/focus-notebook/src/app/tools/*/layout.tsx (17 instances)
```

**Affected tools:** focus, brainstorming, cbt, deepreflect, errands, investments, goals, friends, moodtracker, notes, packing-list, projects, relationships, subscriptions, tasks, thoughts, trips, asset-horizon

**Current pattern (all identical except toolId):**
```tsx
import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function ToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="TOOL_ID">{children}</ToolAccessGate>;
}
```

**Recommendation:** 
- Option A: Remove all layout files and move ToolAccessGate logic to parent layout
- Option B: Use route groups to handle access control
- Option C: Use middleware for access checking
- **Effort:** 1-2 hours
- **Impact:** Medium (clutter reduction, easier maintenance)

### 1.4 Duplicate Spending Stores (Overlapping)

- **useSpending.ts (273 lines)** - Transaction/account based spending tracking
- **useSpendingTool.ts (449 lines)** - Plaid-integrated spending tool
- **Issue:** Both manage transactions and accounts; different implementations, confusing API
- **Used by:** 
  - `spending/page.tsx` uses `useSpending`
  - `spending-unified/page.tsx` uses `useSpendingTool`
- **Recommendation:** Decide on single source of truth or document separation clearly
- **Effort:** 2-3 hours for consolidation decision + implementation
- **Impact:** High (maintenance and API clarity)

### 1.5 Unused/Untested Code

#### Skipped Tests (4 instances - IMPROVED)
- `/home/user/focus-notebook/src/__tests__/examples/TaskStoreIntegration.test.ts:1` - 1 skipped test
- `/home/user/focus-notebook/src/__tests__/services/import-export/ValidationService.test.ts:3` - 3 skipped tests
- **Action:** Either complete tests or remove them
- **Effort:** 1-2 hours

#### TODOs & FIXMEs Still in Code (6 total - IMPROVED)
- `src/store/useSpendingTool.ts`: "TODO: Implement API call" (3x)
- `src/store/useSpendingTool.ts`: "TODO: Get from user settings"
- `src/store/instances.ts`: "TODO: Add other stores as migrated"
- `src/di/setup.ts`: "TODO: Register repositories as migrated"
- `functions/src/services/subscriptionDetection.ts`: "TODO: Get from transaction"
- `functions/src/plaidWebhooks.ts`: "TODO: implement in production" (webhook verification)

**Recommendation:** Address all TODOs or formally document as out-of-scope
**Effort:** 1-2 hours

### 1.6 Excessive Debug Code (IMPROVED)

- **Console.log statements:** 239 in production code (improved from 250+, 11 removed)
- **Firebase functions:** 86 console statements not wrapped in debug conditionals
- **Files with heavy logging:**
  - Investment related files
  - Spending analysis files
  - Connection health monitoring
  - Thought processing
- **Recommendation:** Implement proper logging with environment-based filtering
- **Pattern to implement:**
```typescript
const logger = {
  log: (msg: string) => process.env.DEBUG === 'true' && console.log(msg),
  error: (msg: string) => console.error(msg),
  warn: (msg: string) => console.warn(msg),
}
```
- **Effort:** 2-3 hours
- **Impact:** Medium (production code cleanliness)

---

## 2. CODE COMPLEXITY & REPETITIVENESS

### 2.1 Duplicate Validation Logic

**Pattern found in multiple files:**
- ExportService validates entities with 8+ filter methods
- Each filter follows same pattern but manually coded
- **File:** `/home/user/focus-notebook/src/services/import-export/ExportService.ts:390 lines`

**Recommendation:** Create generic filter factory:
```ts
function createEntityFilter(entityType: EntityType, filters: ExportFilterOptions) {
  return (entity: any) => validateEntityAgainstFilters(entity, filters);
}
```
- **Effort:** 2-3 hours
- **Impact:** Medium (code reduction)

### 2.2 Store Boilerplate (29 Zustand Stores - UNCHANGED)

**Stores using identical patterns:**
1. useInvestments (1,024 lines) - Portfolio, currency, snapshots, projections
2. useFocus (710 lines) - Session management
3. useEntityRelationships (482 lines) - Complex relationships
4. useSpendingTool (449 lines) - Plaid integration
5. useTrips (368 lines)
6. useTasks (360 lines)
7. useLLMQueue (334 lines)
8. useToolEnrollment (282 lines)
9. useSpending (273 lines)
10. useThoughts (237 lines)
11. useSubscriptions (219 lines)
12. useProjects (211 lines)
13. useTokenUsage (195 lines)
14-29. Others: 12 more stores (100-160 lines each)

**Pattern repetition:** All follow subscribe → data → actions pattern with CRUD operations

**Recommendation:** Create store factory pattern:
```ts
function createFirestoreStore<T>(collection: string, schema: ZodSchema) {
  return create<StoreState<T>>((set, get) => ({
    data: [],
    subscribe: (userId) => { /* reusable */ },
    add: (item) => { /* reusable */ },
    update: (id, updates) => { /* reusable */ },
    delete: (id) => { /* reusable */ }
  }))
}
```
- **Effort:** 15-20 hours
- **Impact:** High (significant code reduction)
- **Potential savings:** 5,000+ lines of boilerplate

### 2.3 React Hook Complexity in Large Components

**ThoughtDetailModal.tsx (954 lines):**
- **useState hooks:** 17 total
  - isEditing, text, tagsInput, isProcessing, errorMessage, showErrorModal
  - showSuccessModal, successMessage, showDeleteConfirm, showAIResources
  - showRevertConfirm, isProcessingSuggestion, showLinkingUI
  - selectedTasksToLink, selectedMoodsToLink, selectedProjectsToLink
- **useMemo hooks:** 1
- **Reason:** Complex modal with editing, processing, linking, deletion
- **Recommendation:** Extract to custom hook `useThoughtModal`
- **Effort:** 3-4 hours
- **Impact:** High (improves readability)

**TaskDetailModal.tsx (936 lines):**
- **useState hooks:** 20 total (most complex)
- **Recommendation:** Extract to custom hook `useTaskModal`
- **Effort:** 3-4 hours

### 2.4 Map/Filter/Reduce Patterns

**28 instances in components** that could use reusable utilities:
- Transaction filtering in multiple components
- Task status filtering and sorting
- Relationship/friend filtering
- Project filtering by status/completion

**Recommendation:** Create transformation utilities module
- **Effort:** 2-3 hours
- **Impact:** Medium (code reusability)

### 2.5 Deeply Nested Conditional Logic

**Examples:**
- `/home/user/focus-notebook/src/lib/utils/projections.ts` - Multiple nested Math.max/min checks
- `/home/user/focus-notebook/src/components/investment/AssetHorizonPanel.tsx` - Scenario calculations
- Component rendering with multiple nested ternary operators

**Recommendation:** Extract to named utility functions:
```ts
const validateMonthCount = (months: number): number => Math.max(0, Math.trunc(months));
```

---

## 3. CODE READABILITY

### 3.1 Inconsistent Naming Conventions

#### Type Naming Inconsistency
- `RecurrenceType` vs `TripLength` vs `PackingSectionId`
- `Task` interface defined in multiple places (store, types, repositories)
- Transaction-related: `PlaidTransaction`, `Transaction` (in different files)

#### Function Naming Confusion
- `formatDate()` - exists in 5 files with different behaviors (CRITICAL)
- `normalizeMerchantName()` - duplicated in 2 files
- `calculateCBTStats()` vs `generateProjectionSeries()` - inconsistent naming

#### Store Action Naming
- `useInvestments`: delete, update, add
- `useProjects`: delete, update, add
- `useThoughts`: deleteThought, updateThought, addThought
- **Issue:** Inconsistent use of entity names in methods

**Recommendation:** Standardize on: add{Entity}, update{Entity}, delete{Entity}

### 3.2 Magic Numbers & Strings

**Found throughout codebase:**
- `'10th Oct 2025'` - Hard-coded date format
- `Math.max(0, ...)` - Repeated 10+ times without explanation
- `MERCHANT_PATTERNS` - Duplicated object literal in 2 files
- Sync intervals: `5` minutes hard-coded in `useSettingsStore.ts:23`
- `STRIPE_API_VERSION: '2023-10-16'`
- Buffer sizes, timeouts, retry counts

**Recommendation:** Create `constants/` directory:
```ts
// src/constants/formats.ts
export const DATE_FORMAT_ORDINAL = 'Do MMM YYYY';

// src/constants/api.ts
export const STRIPE_API_VERSION = '2023-10-16';

// src/constants/timing.ts
export const DEFAULT_SYNC_INTERVAL_MINUTES = 5;
export const RETRY_TIMEOUT_MS = 5000;
```
- **Effort:** 1-2 hours
- **Files to create:** 5-6 constants files

### 3.3 Missing JSDoc Comments

**Complex functions without documentation:**
- `/home/user/focus-notebook/functions/src/utils/contextGatherer.ts` (160 lines)
- `/home/user/focus-notebook/functions/src/services/llmInsightsService.ts` (302 lines)
- `/home/user/focus-notebook/functions/src/utils/actionProcessor.ts` (188 lines)
- `/home/user/focus-notebook/functions/src/services/categorizationService.ts` (258 lines)
- `/home/user/focus-notebook/functions/src/services/monthlyRollupService.ts` (280 lines)
- `/home/user/focus-notebook/src/services/import-export/ExportService.ts` - Filter methods

**Recommendation:** Add JSDoc for functions with:
- Complex logic
- Non-obvious parameters
- Side effects

Example:
```ts
/**
 * Normalizes merchant names to canonical forms for spending analysis
 * @param name - Raw merchant name from Plaid/bank
 * @returns Normalized merchant name (e.g., 'AMZN' → 'Amazon')
 */
function normalizeMerchantName(name: string): string {
```
- **Effort:** 3-4 hours
- **Impact:** Low-Medium (documentation)

### 3.4 Inconsistent Error Handling

**Pattern inconsistencies:**
- Some async functions use try/catch
- Some use `.catch()` chains
- Some don't handle errors at all
- Firebase function error responses vary in format

**Example mismatch:**
- `/home/user/focus-notebook/src/app/api/analyze-spending/route.ts` - Returns 200 for errors
- `/home/user/focus-notebook/src/app/api/brainstorm/route.ts` - Throws exceptions
- `/home/user/focus-notebook/src/app/api/process-thought/route.ts` - Returns 200 with error flag

**Recommendation:** Standardize error handling across all API routes
- **Effort:** 2-3 hours

### 3.5 Type Safety Issues

**Type any usage: 228 instances** (improved from previous)
- **Type annotations:** `: any` used in 228 places
- **Type assertions:** `as any` / `as unknown` used in 187 places (improved from 306)

**Heaviest usage in:**
- `/home/user/focus-notebook/src/services/import-export/ExportService.ts` - 10 instances
- `/home/user/focus-notebook/src/services/import-export/ValidationService.ts` - 8+ instances
- `/home/user/focus-notebook/src/services/import-export/ImportService.ts` - Multiple instances

**Recommendation:** 
- Replace with proper types or `Partial<T>` / `Record<string, unknown>`
- Create schemas for validation
- Use Zod for runtime type safety

- **Effort:** 10-15 hours
- **Impact:** Medium-High (bug prevention)

---

## 4. TEST PERFORMANCE & COVERAGE

### 4.1 Test Coverage Metrics

**Total test files:** 63
**Total test lines:** ~15,600

**Largest test files:**
1. `cbtUtils.test.ts` - 696 lines
2. `exportRegistry.test.ts` - 683 lines
3. `transactionParser.test.ts` - 664 lines
4. `useEntityRelationships.test.ts` - 654 lines
5. `taskFiltering.test.ts` - 645 lines

### 4.2 E2E Test Coverage (NEW FINDING)

**E2E test files:** 11 total (~2,963 lines)
- **Largest:** safari-loading.spec.ts (399 lines)
- **Total e2e lines:** 2,963

**Recommendation:** Modularize long e2e tests
- **Effort:** 3-4 hours
- **Impact:** Medium (test maintainability)

### 4.3 Skipped/Only Tests

**Skipped tests found:** 4 instances (IMPROVED from 8)
- 3 in `ValidationService.test.ts` (empty validation tests)
- 1 in `TaskStoreIntegration.test.ts` (daily task reset)

**Recommendation:** Complete or remove skipped tests
- **Effort:** 1-2 hours

### 4.4 Test Redundancy

**Multiple test files testing similar concerns:**
- Task filtering: `taskFiltering.test.ts`, `TaskStoreIntegration.test.ts`
- Entity relationships: `useEntityRelationships.test.ts`, `RelationshipsList.test.tsx`
- Export functionality: `exportRegistry.test.ts`, `ExportService.test.ts`, `ReferenceMappingService.test.ts`

**Recommendation:** Review test organization and consolidate related tests
- **Effort:** 3-4 hours

### 4.5 Jest Configuration Optimization

**Current config:** `/home/user/focus-notebook/jest.config.js`

**Optimization opportunities:**
1. Increase CI workers from 2 to 4 (unless constrained)
2. Add test timeout profiles for slow tests
3. Enable `--logHeapUsage` to detect memory leaks
4. Consider test sharding strategy
- **Effort:** 1-2 hours
- **Impact:** Low-Medium (test performance)

### 4.6 Test Mock Coverage

**Files with jest.mock/spyOn:** 20+ test files
**Global mocks in jest.setup.ts:** 61 lines covering:
- Firebase (firebaseClient, firestore functions)
- Firebase Auth Context
- Data gateway functions
- Data subscribe functions

**Recommendation:** Review global mocks for shadow issues
- **Effort:** 2-3 hours

---

## 5. IMPORT-EXPORT SERVICE COMPLEXITY (NEW DETAILED ANALYSIS)

### 5.1 Service Suite Overview

The import-export service totals **2,387 lines** across 5 large files:

| File | Lines | Purpose |
|------|-------|---------|
| ImportService.ts | 665 | Data import with conflict detection |
| ValidationService.ts | 528 | Entity validation and filtering |
| ExportService.ts | 390 | Data export with filtering |
| ReferenceMappingService.ts | 422 | Reference mapping and linking |
| ConflictDetectionService.ts | 382 | Import conflict detection |

### 5.2 Type Safety in Services

**Type assertions found:**
- ExportService: 10+ `as any` assertions
- ValidationService: 8+ `as any` assertions
- ImportService: Multiple assertions

**Recommendation:** Create proper entity types and validation schemas
- **Effort:** 4-5 hours
- **Impact:** High (bug prevention, maintainability)

---

## 6. FIREBASE FUNCTIONS DETAILED ANALYSIS

### 6.1 Function Organization

**Total Firebase functions:** 26 files (~7,933 lines)

**Main functions:**
1. stripeBilling.ts (1,077 lines) - Subscription/payment management
2. processThought.ts (851 lines) - Thought processing with LLM
3. marketData.ts (413 lines) - Market data updates
4. plaidFunctions.ts (439 lines) - Plaid transaction sync
5. plaidWebhooks.ts (311 lines) - Plaid webhook handling

**Utility modules:**
- contextGatherer.ts (160 lines) - Context gathering for AI
- actionProcessor.ts (188 lines) - Action processing
- llmInsightsService.ts (302 lines) - LLM insights generation
- categorizationService.ts (258 lines) - Transaction categorization
- monthlyRollupService.ts (280 lines) - Monthly rollup calculations

### 6.2 Console Logging in Functions

**Console statements:** 86 total (not wrapped in debug flags)
- Need to wrap with environment variable check
- **Files affected:** All major Firebase functions

### 6.3 Type Safety in Functions

**Any type usage:** 11 instances
- Need proper type definitions for request/response objects
- Consider Zod schemas for validation

---

## 7. SUMMARY TABLE

| Category | Count | Priority | Effort | Status |
|----------|-------|----------|--------|--------|
| Duplicate Functions | 4 | HIGH | LOW | UNCHANGED |
| Large Files (>700 lines) | 8 | MEDIUM | HIGH | UNCHANGED |
| Identical Boilerplate (layout) | 17 | MEDIUM | LOW | IMPROVED (18→17) |
| Console Logs | 239 | MEDIUM | MEDIUM | IMPROVED (250→239) |
| Magic Numbers/Strings | 15+ | LOW | LOW | Not addressed |
| Skipped Tests | 4 | LOW | LOW | IMPROVED (8→4) |
| Any Type Usage | 228 | MEDIUM | MEDIUM | Different analysis |
| Type Assertions (as any) | 187 | MEDIUM | HIGH | IMPROVED (306→187) |
| TODOs/FIXMEs | 6 | LOW | LOW | IMPROVED (7→6) |
| Large Functions (>400 lines) | 5 | MEDIUM | HIGH | UNCHANGED |
| Zustand Store Files | 29 | MEDIUM | MEDIUM | UNCHANGED |
| Import-Export Lines | 2,387 | MEDIUM | HIGH | New finding |
| React Hooks Max | 20 | MEDIUM | MEDIUM | New finding |

---

## RECOMMENDATIONS PRIORITY (FINAL)

**Phase 1 (Quick Wins - < 2 hours):**
- Remove duplicate normalizeMerchantName
- Consolidate settings stores
- Fix formatDate naming
- Remove/complete skipped tests

**Phase 2 (Medium Effort - 4-8 hours):**
- Remove boilerplate layouts
- Extract magic numbers to constants
- Wrap console.log with debug flag
- Complete useTasksV2 migration
- Consolidate date utilities

**Phase 3 (Major Refactors - 8+ hours):**
- Split large components (Packing, Modals)
- Split large Firebase functions
- Implement store factory pattern
- Improve type safety across codebase
- Consolidate validation logic
- Split import-export services
