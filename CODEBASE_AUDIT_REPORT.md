# FOCUS NOTEBOOK - COMPREHENSIVE CODEBASE AUDIT

## Executive Summary
This is a Next.js + React + Firebase application with Cloud Functions. Total ~80K lines of TypeScript/JavaScript code.

**Key Metrics:**
- Source files: 226 TypeScript/JavaScript files
- Test files: 53 total
- Store files (Zustand): 29 separate store modules
- API routes: 7
- Firebase functions: 25 files (~5,764 lines)
- Console.log statements in production: 250+ (debug code)

---

## 1. DELETABLE CODE

### 1.1 Duplicate Functions (CRITICAL)

#### Duplicate: `normalizeMerchantName()`
- **Files:** `/home/user/focus-notebook/functions/src/plaidFunctions.ts:424` (5 lines)
- **Files:** `/home/user/focus-notebook/functions/src/plaidWebhooks.ts:286` (15 lines)
- **Issue:** Identical merchant normalization logic duplicated across two files
- **Impact:** Code maintenance nightmare if patterns change
- **Action:** Extract to shared utility file `functions/src/utils/merchantNormalizer.ts`

#### Duplicate: `formatDate()` Functions (CONFUSING NAMING)
- **File 1:** `/home/user/focus-notebook/src/lib/cbtUtils.ts:73` - Handles Firestore Timestamps, returns generic format
- **File 2:** `/home/user/focus-notebook/src/lib/formatDateTime.ts:2` - Formats to "10th Oct 2025" format
- **Issue:** Same function name doing different things causes confusion and import errors
- **Recommendation:** Rename cbtUtils version to `parseDate()` or `normalizeDateFormat()`

#### Multiple Settings Stores
- **useSettings.ts** (54 lines) - Manages API keys, theme, AI model
- **useSettingsStore.ts** (35 lines) - Manages cloud sync settings
- **Issue:** Two separate stores for different settings aspects; could be consolidated
- **Recommendation:** Merge into single configurable settings store

#### Duplicate Task Store (Legacy + New)
- **useTasks.ts** (360 lines) - Current production store (56 imports across codebase)
- **useTasksV2.ts** (133 lines) - Refactored version using Repository pattern (only 2 imports)
- **Status:** useTasksV2 is marked "will replace useTasks.ts once tested"
- **Action:** Complete migration or remove old store once v2 is validated

### 1.2 Overly Large, Single-Purpose Files

#### Packing List Tool Page
- **File:** `/home/user/focus-notebook/src/app/tools/packing-list/page.tsx`
- **Size:** 1,828 lines in single component
- **Contents:** Type definitions, data structures, state management, UI rendering
- **Recommendation:** Split into:
  - `components/packing/PackingListTypes.ts` (type definitions)
  - `components/packing/usePacking.ts` (Zustand store for state)
  - `components/packing/PackingListUI.tsx` (UI component ~400 lines)
  - `components/packing/TimelineSection.tsx` (timeline rendering)
  - `components/packing/ItemsSection.tsx` (items management)

#### Firebase Function Files (Large & Complex)
- **stripeBilling.ts:** 1,077 lines - Stripe integration with multiple operations
- **processThought.ts:** 851 lines - Thought processing with multiple sub-operations
- **marketData.ts:** 413 lines - Market data sync
- **plaidFunctions.ts:** 439 lines - Plaid operations

**Recommendation:** Break into smaller, single-responsibility functions

### 1.3 Boilerplate Tool Layout Files (18 files)

All these files are 6 lines of identical boilerplate:
```
/home/user/focus-notebook/src/app/tools/*/layout.tsx (18 instances)
```

**Affected tools:** focus, brainstorming, cbt, deepreflect, errands, investments, goals, friends, moodtracker, notes, packing-list, projects, relationships, subscriptions, tasks, thoughts, trips, asset-horizon

**Current pattern:**
```tsx
import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function ToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="TOOL_ID">{children}</ToolAccessGate>;
}
```

**Recommendation:** Remove all layout files and move ToolAccessGate logic to parent layout or middleware

### 1.4 Duplicate Spending Stores (Overlapping)

- **useSpending.ts** (273 lines) - Transaction/account based spending tracking
- **useSpendingTool.ts** (449 lines) - Plaid-integrated spending tool
- **Issue:** Both manage transactions and accounts; different implementations
- **Used by:** 
  - `spending/page.tsx` uses `useSpending`
  - `spending-unified/page.tsx` uses `useSpendingTool`
- **Recommendation:** Decide on single source of truth or clarify separation of concerns

### 1.5 Unused/Untested Code

#### Skipped Tests (4 instances)
- `/home/user/focus-notebook/src/__tests__/services/import-export/ValidationService.test.ts` - 3 skipped tests
- `/home/user/focus-notebook/src/__tests__/examples/TaskStoreIntegration.test.ts` - 1 skipped test
- **Action:** Either complete tests or remove them

#### TODOs & FIXMEs Still in Code
- 7 TODO/FIXME comments found:
  - `useSpendingTool.ts`: 3x "TODO: Implement API call"
  - `useSettings.ts`: 1x "TODO comment"
  - `instances.ts`: 1x "TODO comment"
  - `subscriptionDetection.ts`: 1x "TODO: Get from user settings"
  - `plaidWebhooks.ts`: 1x "TODO: implement in production"

### 1.6 Excessive Debug Code

- **Console.log statements:** 250+ in production code (not wrapped in debug conditionals)
- **Files with heavy logging:**
  - Investment related files
  - Spending analysis files
  - Connection health monitoring
- **Recommendation:** Implement proper logging with environment-based filtering or wrap in `if (process.env.DEBUG === 'true')`

### 1.7 Console Assertions & Questionable Patterns

- **Index barrel files:** Only 4 found (good practice)
- **Namespace imports:** None in app pages (good)

---

## 2. CODE COMPLEXITY & REPETITIVENESS

### 2.1 Duplicate Validation Logic

**Pattern found in multiple files:**
- Export Service validates entities with ~8 filter methods (filterTasks, filterProjects, filterGoals, etc.)
- Each filter follows same pattern but manually coded
- **File:** `/home/user/focus-notebook/src/services/import-export/ExportService.ts`
- **Lines:** Multiple `any[]` filter methods doing similar work

**Recommendation:** Create generic filter factory:
```ts
function createEntityFilter(entityType: EntityType, filters: ExportFilterOptions) {
  return (entity: any) => validateEntityAgainstFilters(entity, filters);
}
```

### 2.2 Store Boilerplate (29 Zustand Stores)

**Stores using similar patterns:**
- `useTasks` (360 lines)
- `useInvestments` (1,024 lines) 
- `useSpending` (273 lines)
- `useSpendingTool` (449 lines)
- `useProjects` (211 lines)
- `useGoals` (123 lines)
- `useThoughts` (237 lines)
- etc.

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

### 2.3 Deeply Nested Conditional Logic

**Example:** Investment projection calculations have nested conditionals:
- `/home/user/focus-notebook/src/lib/utils/projections.ts` - Multiple nested Math.max/min checks
- `/home/user/focus-notebook/src/components/investment/AssetHorizonPanel.tsx` - Scenario calculations

**Recommendation:** Extract to named utility functions:
```ts
// Instead of: Math.max(0, Math.trunc(months))
const validateMonthCount = (months: number): number => Math.max(0, Math.trunc(months));
```

### 2.4 Repetitive Date/Currency Formatting

**Found in multiple files:**
- Date formatting logic in analytics, components, utils
- Currency conversion scattered across store and component files
- Time-of-day logic duplicated in dashboard and analytics

**Location examples:**
- `/home/user/focus-notebook/src/lib/utils/date.ts` - 10 date utility functions
- `/home/user/focus-notebook/src/lib/utils/currency.ts` - 3 currency functions
- `/home/user/focus-notebook/src/lib/formatDateTime.ts` - Separate date formatting
- `/home/user/focus-notebook/src/lib/analytics/dashboard.ts` - Custom time-of-day logic

**Recommendation:** Consolidate all date utilities into single module with clear exports

### 2.5 Map/Filter/Reduce Patterns (28 instances in components)

Many components manually implement data transformations that could use reusable utilities:

Examples:
- Transaction filtering in multiple components
- Task status filtering and sorting
- Relationship/friend filtering

**Recommendation:** Create transformation utilities module for common patterns

---

## 3. CODE READABILITY

### 3.1 Inconsistent Naming Conventions

#### Type Naming Inconsistency
- `RecurrenceType` vs `TripLength` vs `PackingSectionId`
- `Task` interface defined in multiple places (store, types, repositories)
- Transaction-related: `PlaidTransaction`, `Transaction` (in different files)

#### Function Naming Confusion
- `formatDate()` - exists in 2 files with different behaviors
- `normalizeMerchantName()` - duplicated in 2 files
- `calculateCBTStats()` vs `generateProjectionSeries()` - inconsistent naming

#### Store Action Naming
- `useInvestments`: delete, update, add
- `useProjects`: delete, update, add
- `useThoughts`: deleteThought, updateThought, addThought
- **Issue:** Inconsistent use of entity names in methods

### 3.2 Magic Numbers & Strings

**Found throughout codebase:**
- `'10th Oct 2025'` - Hard-coded date format without constant
- `Math.max(0, ...)` - Repeated 10+ times without explanation
- `MERCHANT_PATTERNS` - Duplicated object literal in 2 files
- Sync intervals: `5` minutes hard-coded in `useSettingsStore.ts:23`
- `STRIPE_API_VERSION: '2023-10-16'` - Should be constant

**Recommendation:** Create `constants/` directory:
```ts
// src/constants/formats.ts
export const DATE_FORMAT_ORDINAL = 'Do MMM YYYY';

// src/constants/api.ts
export const STRIPE_API_VERSION = '2023-10-16';

// src/constants/timing.ts
export const DEFAULT_SYNC_INTERVAL_MINUTES = 5;
```

### 3.3 Missing JSDoc Comments

**Complex functions without documentation:**
- `/home/user/focus-notebook/functions/src/utils/contextGatherer.ts` (160 lines)
- `/home/user/focus-notebook/functions/src/services/llmInsightsService.ts` (302 lines)
- `/home/user/focus-notebook/functions/src/utils/actionProcessor.ts` (188 lines)
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

### 3.5 Type Safety Issues

**Excessive `any` usage:**
- 51 instances of `: any` in codebase
- `/home/user/focus-notebook/src/services/import-export/ExportService.ts` - Heavy any usage in filter methods
- `/home/user/focus-notebook/src/services/import-export/ValidationService.ts` - 10+ any types

**Type Assertions:**
- 306 instances of `as any` / `as unknown` type assertions
- Indicates inadequate type definitions or schema validation

---

## 4. TEST PERFORMANCE

### 4.1 Test Coverage Metrics

**Total test files:** 53
**Total test lines:** 18,324

**Largest test files:**
1. `cbtUtils.test.ts` - 696 lines
2. `exportRegistry.test.ts` - 683 lines
3. `transactionParser.test.ts` - 664 lines
4. `useEntityRelationships.test.ts` - 654 lines
5. `taskFiltering.test.ts` - 645 lines

### 4.2 Skipped/Only Tests

**Skipped tests found:** 8 instances
- 3 in `ValidationService.test.ts` (empty validation tests)
- 1 in `TaskStoreIntegration.test.ts` (daily task reset)
- 4 in feature tests (feature validation, feature examples)

**Recommendation:** Complete or remove skipped tests

### 4.3 Test Redundancy

**Multiple test files testing similar concerns:**
- Task filtering: `taskFiltering.test.ts`, `TaskStoreIntegration.test.ts`
- Entity relationships: `useEntityRelationships.test.ts`, `RelationshipsList.test.tsx`
- Export functionality: `exportRegistry.test.ts`, `ExportService.test.ts`, `ReferenceMappingService.test.ts`

**Recommendation:** Review test organization and consolidate related tests

### 4.4 Heavy Test Fixtures & Mock Setup

**File:** `/home/user/focus-notebook/jest.setup.ts` - 61 lines of global mocks

**Mocked modules:**
- Firebase (firebaseClient, firestore functions)
- Firebase Auth Context
- Data gateway functions
- Data subscribe functions

**Issue:** Global mocks may shadow real issues or prevent refactoring

**Firebase functions tests:** 8 test files (~1500 lines total)
- Heavy Stripe mocking
- Firebase Admin mocking
- Cloud Functions mocking

### 4.5 Jest Configuration Optimization Opportunities

**Current config:** `/home/user/focus-notebook/jest.config.js`

**Current settings:**
- `maxWorkers: process.env.CI ? 2 : '50%'` - CI is limited
- `bail: process.env.CI ? 1 : false` - Good for fast failure
- `cache: true` - Good

**Recommendations:**
1. Increase CI workers from 2 to 4 (unless constrained)
2. Add test timeout profiles for slow tests
3. Enable `--logHeapUsage` to detect memory leaks in tests
4. Consider test sharding strategy

---

## 5. SPECIFIC FINDINGS BY AREA

### 5.1 Firebase Functions Issues

**File Issues:**
- **stripeBilling.ts (1,077 lines):** Could split into:
  - Subscription management
  - Invoicing
  - Usage tracking
  - Payment methods

- **processThought.ts (851 lines):** Could split into:
  - Thought validation
  - LLM processing
  - Queue management
  - Status updates

- **Duplicate Logic:** `normalizeMerchantName()` in plaidFunctions.ts & plaidWebhooks.ts

### 5.2 Component Issues

**ThoughtDetailModal.tsx (954 lines):**
- 10 useState hooks (high complexity)
- Multiple concerns: editing, processing, linking, deletion
- Should split into:
  - ThoughtEditPanel
  - AIProcessingPanel
  - LinkingUI
  - ConfirmDeleteDialog

**TaskDetailModal.tsx (936 lines):** Similar issue - too many concerns

**FocusSession.tsx (768 lines):** Multiple state management concerns

### 5.3 Store Issues

**useInvestments.ts (1,024 lines):** Largest store
- Portfolio management
- Currency conversion
- Stock data
- Historical tracking
- Projections

**Recommendation:** Split into:
- useInvestmentPortfolios (core CRUD)
- useInvestmentCurrency (conversion logic)
- useInvestmentProjections (calculations)

### 5.4 Type Safety

**Missing type definitions:**
- `any` used in 51+ places
- `any` type assertions in 306 places
- Some complex data structures lack proper types

**Recommendation:** Create comprehensive type definitions for:
- API responses
- Firestore documents
- Firebase function parameters
- Component props (audit shows 98 prop interfaces - good coverage)

---

## 6. OPTIMIZATION QUICK WINS

### High Impact (< 1 hour each)

1. **Remove duplicate normalizeMerchantName** - Extract to shared util
2. **Consolidate settings stores** - useSettings + useSettingsStore
3. **Fix formatDate naming conflict** - Rename one function
4. **Remove 18 identical layout files** - Use parent layout or factory
5. **Remove/complete skipped tests** - Clean up 8 skipped test cases
6. **Extract magic numbers to constants** - Create constants directory

### Medium Impact (1-4 hours each)

7. **Extract boilerplate layout components** - Template tool layouts
8. **Consolidate validation logic** - Create filter factory
9. **Merge duplicate spending stores** - Choose single source of truth
10. **Wrap console.log statements** - Add debug flag or logger
11. **Create date utility consolidation** - Single date module
12. **Extract complex calculations** - Named utility functions

### Larger Refactors (4+ hours each)

13. **Migrate useTasks → useTasksV2** - Complete or remove old store
14. **Split large components** - Packing list (1,828), Thought modal (954), Task modal (936)
15. **Split large functions** - stripeBilling, processThought
16. **Create store factory pattern** - Reduce 29 stores boilerplate
17. **Improve type safety** - Replace 51+ `any` uses with proper types

---

## SUMMARY TABLE

| Category | Count | Priority | Effort |
|----------|-------|----------|--------|
| Duplicate Functions | 4 | HIGH | LOW |
| Large Files (>700 lines) | 8 | MEDIUM | HIGH |
| Identical Boilerplate (layout) | 18 | MEDIUM | LOW |
| Console Logs | 250+ | MEDIUM | MEDIUM |
| Magic Numbers/Strings | 15+ | LOW | LOW |
| Skipped Tests | 8 | LOW | LOW |
| `any` Type Usage | 51 | MEDIUM | MEDIUM |
| Type Assertions (as any) | 306 | MEDIUM | HIGH |
| TODOs/FIXMEs | 7 | LOW | LOW |
| Large Functions (>400 lines) | 5 | MEDIUM | HIGH |
| Zustand Store Files | 29 | MEDIUM | MEDIUM |

---

## RECOMMENDATIONS PRIORITY

**Phase 1 (Quick Wins - < 2 hours):**
- Remove duplicate normalizeMerchantName
- Consolidate settings stores
- Fix formatDate naming
- Create constants directory
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

