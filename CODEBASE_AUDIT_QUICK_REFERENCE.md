# FOCUS NOTEBOOK - QUICK REFERENCE & FILE LOCATIONS (UPDATED)

**Last Updated:** November 7, 2025
**Status:** Post-main branch rebase analysis

---

## CRITICAL DUPLICATES - Remove/Consolidate

### 1. Duplicate `normalizeMerchantName()` Function
```
Priority: HIGH - Quick fix (15 minutes)

Files with duplicate:
- /home/user/focus-notebook/functions/src/plaidFunctions.ts:424-429
- /home/user/focus-notebook/functions/src/plaidWebhooks.ts:286-310

Difference:
- plaidFunctions: MERCHANT_PATTERNS at module level (13 items including 'SBX')
- plaidWebhooks: MERCHANT_PATTERNS inside function (12 items, no 'SBX')

Action: 
1. Create /home/user/focus-notebook/functions/src/utils/merchantNormalizer.ts
2. Export MERCHANT_PATTERNS and normalizeMerchantName()
3. Import and use in both plaidFunctions.ts and plaidWebhooks.ts
4. Delete duplicate functions
```

### 2. Duplicate `formatDate()` Function (Different Implementations)
```
Priority: HIGH - Confusing API (1 hour)

CONFUSING: Same function name, different behavior

Locations:
- /home/user/focus-notebook/src/lib/cbtUtils.ts:73-118
  → Handles Firestore Timestamp objects
  
- /home/user/focus-notebook/src/lib/formatDateTime.ts:2-16
  → Formats to ordinal date format "10th Oct 2025"
  
- /home/user/focus-notebook/src/components/billing/InvoiceHistory.tsx
  → Local date formatting implementation
  
- /home/user/focus-notebook/src/app/tools/llm-logs/page.tsx
  → Local date formatting implementation

Action: 
1. Rename cbtUtils version to parseFirestoreDate() or normalizeDate()
2. Consolidate formatDateTime as the ordinal format function
3. Remove local duplicates in InvoiceHistory.tsx and llm-logs/page.tsx
4. Update all imports
```

### 3. Duplicate Settings Stores
```
Priority: MEDIUM (30 minutes consolidation)

Files:
- /home/user/focus-notebook/src/store/useSettings.ts (54 lines)
  → Manages: openaiApiKey, theme, aiModel

- /home/user/focus-notebook/src/store/useSettingsStore.ts (35 lines)
  → Manages: cloudSyncEnabled, syncInterval, lastSyncTime

Usage:
- useSettings: 1 file
- useSettingsStore: 4 files

Action: Merge into single store or create composed store
```

### 4. Duplicate Task Stores
```
Priority: MEDIUM (depends on migration status)

Files:
- /home/user/focus-notebook/src/store/useTasks.ts (360 lines)
  → Current production store (56 imports)
  → Status: Marked for deprecation
  
- /home/user/focus-notebook/src/store/useTasksV2.ts (133 lines)
  → Refactored version (2 imports in tests only)
  → Status: Awaiting migration

Action: Complete useTasksV2 migration or consolidate
```

### 5. Overlapping Spending Stores
```
Priority: MEDIUM (2-3 hours decision + implementation)

Files:
- /home/user/focus-notebook/src/store/useSpending.ts (273 lines)
  → Transaction/account based tracking
  → Used by: /home/user/focus-notebook/src/app/tools/spending/page.tsx
  
- /home/user/focus-notebook/src/store/useSpendingTool.ts (449 lines)
  → Plaid-integrated spending tool
  → Used by: /home/user/focus-notebook/src/app/tools/spending-unified/page.tsx

Action: Determine single source of truth or document separation clearly
```

---

## OVERLY LARGE FILES - Needs Splitting

### Priority 1: Massive Component Files

#### Packing List Page (1,828 lines)
```
File: /home/user/focus-notebook/src/app/tools/packing-list/page.tsx
Priority: HIGH (8-10 hours)

Split into:
- components/packing/PackingListTypes.ts (type definitions)
- components/packing/usePacking.ts (Zustand store)
- components/packing/PackingListUI.tsx (main component ~400 lines)
- components/packing/TimelineSection.tsx (timeline handling)
- components/packing/ItemsSection.tsx (items management)
- components/packing/TripDetailsSection.tsx (trip form)
```

#### Thought Detail Modal (954 lines)
```
File: /home/user/focus-notebook/src/components/ThoughtDetailModal.tsx
Priority: HIGH (4-5 hours)
React Hooks: 17 useState + 1 useMemo
Complexity: Very High

Split into:
- useThoughtModal.ts (state management - 17 hooks extracted)
- ThoughtEditPanel.tsx (editing functionality)
- ThoughtAIProcessing.tsx (AI processing actions)
- ThoughtLinking.tsx (linking UI for tasks/moods/projects)
- ThoughtDeleteConfirm.tsx (deletion confirmation)
- ThoughtDetailModal.tsx (orchestration)

Or: Extract all state management into useThoughtModal.ts custom hook
```

#### Task Detail Modal (936 lines)
```
File: /home/user/focus-notebook/src/components/TaskDetailModal.tsx
Priority: HIGH (4-5 hours)
React Hooks: 20 useState (MOST COMPLEX)

Similar split to ThoughtDetailModal - extract custom hooks first
```

### Priority 2: Large Firebase Functions

#### stripeBilling.ts (1,077 lines)
```
File: /home/user/focus-notebook/functions/src/stripeBilling.ts
Priority: MEDIUM (6-8 hours)

Functions to extract:
- Subscription management: getSubscriptionSnapshot(), mapSubscriptionToSnapshot()
- Invoicing: getStripeInvoices()
- Payment methods: getStripePaymentMethod()
- Usage tracking: getUsageStats(), incrementUsageStats()
- Portal: createStripePortalSession()
- Webhook: stripeWebhook()

Recommendation: Create services subdirectory
- services/stripeSubscription.ts (250 lines)
- services/stripeInvoicing.ts (200 lines)
- services/stripePaymentMethods.ts (150 lines)
- services/stripeUsageTracking.ts (200 lines)
```

#### processThought.ts (851 lines)
```
File: /home/user/focus-notebook/functions/src/processThought.ts
Priority: MEDIUM (6-8 hours)

Functions to extract:
- Thought validation
- LLM processing logic
- Queue management
- Status updates
- Daily/interval limits enforcement

Recommendation: Create services
- services/thoughtValidation.ts
- services/thoughtLLM.ts
- services/thoughtQueueManager.ts
```

### Priority 3: Large Store Files

#### useInvestments.ts (1,024 lines)
```
File: /home/user/focus-notebook/src/store/useInvestments.ts
Priority: MEDIUM (5-7 hours)

Concerns to separate:
- Portfolio CRUD: createPortfolio(), updatePortfolio(), deletePortfolio()
- Currency conversion: convertPortfolioValue(), getExchangeRates()
- Historical data: portfolio snapshots
- Projections: projection calculations

Consider:
- useInvestmentPortfolios.ts (core CRUD)
- useInvestmentCurrency.ts (currency logic)
- useInvestmentProjections.ts (calculation logic)
```

#### useSpendingTool.ts (449 lines)
```
File: /home/user/focus-notebook/src/store/useSpendingTool.ts
Priority: LOW-MEDIUM (3-4 hours)

Areas for splitting:
- Account/connection management
- Transaction querying/filtering
- Subscription handling
- Analytics/rollups
```

#### Import-Export Services (2,387 lines total) [NEW]
```
Priority: MEDIUM (8-10 hours for refactoring)

Files:
- ImportService.ts (665 lines) - LARGEST
- ValidationService.ts (528 lines)
- ExportService.ts (390 lines)
- ReferenceMappingService.ts (422 lines)
- ConflictDetectionService.ts (382 lines)

Recommendation: Split ImportService and ValidationService further
```

---

## BOILERPLATE TO ELIMINATE

### 17 Identical Tool Layout Files (6 lines each)
```
Priority: MEDIUM (30-45 minutes)

Pattern (all identical except toolId parameter):
/home/user/focus-notebook/src/app/tools/*/layout.tsx

Affected tools (17 total):
- /home/user/focus-notebook/src/app/tools/focus/layout.tsx
- /home/user/focus-notebook/src/app/tools/brainstorming/layout.tsx
- /home/user/focus-notebook/src/app/tools/cbt/layout.tsx
- /home/user/focus-notebook/src/app/tools/deepreflect/layout.tsx
- /home/user/focus-notebook/src/app/tools/errands/layout.tsx
- /home/user/focus-notebook/src/app/tools/investments/layout.tsx
- /home/user/focus-notebook/src/app/tools/goals/layout.tsx
- /home/user/focus-notebook/src/app/tools/friends/layout.tsx
- /home/user/focus-notebook/src/app/tools/moodtracker/layout.tsx
- /home/user/focus-notebook/src/app/tools/notes/layout.tsx
- /home/user/focus-notebook/src/app/tools/packing-list/layout.tsx
- /home/user/focus-notebook/src/app/tools/projects/layout.tsx
- /home/user/focus-notebook/src/app/tools/relationships/layout.tsx
- /home/user/focus-notebook/src/app/tools/subscriptions/layout.tsx
- /home/user/focus-notebook/src/app/tools/tasks/layout.tsx
- /home/user/focus-notebook/src/app/tools/thoughts/layout.tsx
- /home/user/focus-notebook/src/app/tools/trips/layout.tsx

Action Options:
A: Delete all and add ToolAccessGate logic to parent layout
B: Use route groups to handle access control
C: Use middleware for access checking
```

---

## EXCESSIVE CONSOLE LOGGING (239 instances, improved)

```
Priority: MEDIUM (2-3 hours)

Current Status: 239 console.log statements (down from 250+)
Firebase Functions: 86 console statements not wrapped in debug flags

Solution:
Create logger utility:
// src/lib/logger.ts
const logger = {
  log: (msg: string) => process.env.DEBUG === 'true' && console.log(msg),
  error: (msg: string) => console.error(msg),
  warn: (msg: string) => console.warn(msg),
}

Then replace all console.log with logger.log()
```

---

## TYPE SAFETY ISSUES

### 228 Instances of `: any` Type Annotation
```
Priority: HIGH (10-15 hours improvement)
Status: Improved from 306 to 187 assertions

High-risk files:
- /home/user/focus-notebook/src/services/import-export/ExportService.ts
  → 10+ 'as any' assertions in filter methods
  
- /home/user/focus-notebook/src/services/import-export/ValidationService.ts
  → 8+ any types in validation methods
  
- /home/user/focus-notebook/src/services/import-export/ImportService.ts
  → Multiple assertions

Action: Replace with proper types or use Partial<T> / Record<string, unknown>
```

---

## SKIPPED TESTS (Remove or Complete) [IMPROVED]

### ValidationService.test.ts
```
Location: /home/user/focus-notebook/src/__tests__/services/import-export/ValidationService.test.ts

Skipped tests (3):
- it.skip('should handle empty entity collections')
- it.skip('should return 0 for invalid data')
- it.skip('should handle empty arrays gracefully')

Action: Complete or remove these 3 tests
Priority: LOW (1 hour)
```

### TaskStoreIntegration.test.ts
```
Location: /home/user/focus-notebook/src/__tests__/examples/TaskStoreIntegration.test.ts

Skipped test (1):
- it.skip('should reset daily tasks - implementation dependent')

Action: Complete based on useTasksV2 implementation
Priority: LOW (1 hour)
```

---

## UNFINISHED TODO/FIXME COMMENTS (6 total, improved)

### In Application Code
```
1. /home/user/focus-notebook/src/store/useSpendingTool.ts (3 TODOs):
   - TODO: Implement API call to fetch rollup
   - TODO: Implement Cloud Function call
   - TODO: Get from user settings

2. /home/user/focus-notebook/src/store/instances.ts:
   - TODO: Add other stores as they are migrated

3. /home/user/focus-notebook/src/di/setup.ts:
   - TODO: Register other repositories as they are migrated
```

### In Firebase Functions
```
1. /home/user/focus-notebook/functions/src/services/subscriptionDetection.ts:
   - TODO: Get from transaction

2. /home/user/focus-notebook/functions/src/plaidWebhooks.ts:
   - TODO: implement in production (webhook verification)
```

Action: Address all TODOs or formally document as out-of-scope
Priority: LOW (1-2 hours)

---

## MAGIC NUMBERS & STRINGS TO EXTRACT

### In Code
```
Priority: LOW (1-2 hours)

Found:
1. Date formats: '10th Oct 2025' (formatDateTime.ts)
2. Math operations: Math.max(0, ...) - repeated 10+ times
3. Sync interval: 5 minutes (useSettingsStore.ts:23)
4. Stripe API version: '2023-10-16' (stripeBilling.ts)
5. MERCHANT_PATTERNS object - duplicated in 2 files
6. Various hardcoded indices and thresholds

Action: Create src/constants/ directory:
- constants/formats.ts
- constants/api.ts
- constants/timing.ts
- constants/validation.ts
```

---

## COMPLEX FUNCTIONS NEEDING DOCUMENTATION

### Firebase Functions (No JSDoc) [NEW ANALYSIS]
```
Priority: MEDIUM (3-4 hours)

Functions lacking documentation:
1. /home/user/focus-notebook/functions/src/utils/contextGatherer.ts (160 lines)
2. /home/user/focus-notebook/functions/src/services/llmInsightsService.ts (302 lines)
3. /home/user/focus-notebook/functions/src/utils/actionProcessor.ts (188 lines)
4. /home/user/focus-notebook/functions/src/services/categorizationService.ts (258 lines)
5. /home/user/focus-notebook/functions/src/services/monthlyRollupService.ts (280 lines)

Action: Add JSDoc with @param, @returns, @description
```

---

## ZUSTAND STORE BOILERPLATE (29 TOTAL)

### Stores Following Identical Pattern
```
Priority: HIGH (15-20 hours for factory pattern)
Impact: Potential 5,000+ lines of boilerplate reduction

Largest stores:
1. useInvestments.ts (1,024 lines)
2. useFocus.ts (710 lines)
3. useEntityRelationships.ts (482 lines)
4. useSpendingTool.ts (449 lines)
5. useTrips.ts (368 lines)
6. useTasks.ts (360 lines)

Total: 29 stores with repeated CRUD patterns

Recommendation: Implement store factory pattern to reduce boilerplate
```

---

## E2E TEST FILES [NEW FINDING]

```
Priority: MEDIUM (3-4 hours for modularization)

Files: 11 e2e test files (~2,963 lines total)

Largest:
- safari-loading.spec.ts (399 lines)
- tools-investment-trips.spec.ts (345 lines)
- tools-goals-thoughts.spec.ts (329 lines)
- tools-additional.spec.ts (328 lines)

Action: Modularize long e2e tests
```

---

## REACT HOOK COMPLEXITY [NEW FINDING]

```
Priority: MEDIUM (4-5 hours to extract hooks)

Components with excessive hooks:
- ThoughtDetailModal: 17 useState + 1 useMemo
- TaskDetailModal: 20 useState (MOST COMPLEX)
- FocusSession.tsx: Complex state management

Recommendation: Extract state management to custom hooks
- useThoughtModal.ts (consolidates 17 hooks)
- useTaskModal.ts (consolidates 20 hooks)
```

---

## OPTIMIZATION CHECKLIST

### Phase 1: Quick Wins (< 2 hours total)
- [ ] Remove duplicate normalizeMerchantName (15 min)
- [ ] Rename cbtUtils formatDate() to parseDate() (15 min)
- [ ] Merge useSettings + useSettingsStore (30 min)
- [ ] Complete or remove 4 skipped tests (30 min)

### Phase 2: Medium Effort (4-8 hours)
- [ ] Remove/consolidate 17 tool layout files (30 min)
- [ ] Extract debug logging to proper logger (1 hour)
- [ ] Create constants directory (1 hour)
- [ ] Consolidate date utilities (1 hour)
- [ ] Extract validation patterns (2 hours)

### Phase 3: Major Refactors (8+ hours)
- [ ] Extract state hooks from ThoughtDetailModal (3 hours)
- [ ] Extract state hooks from TaskDetailModal (3 hours)
- [ ] Split packing-list page (8 hours)
- [ ] Split useInvestments store (5 hours)
- [ ] Complete useTasksV2 migration (3 hours)
- [ ] Split large Firebase functions (12 hours)
- [ ] Implement store factory pattern (20 hours)

---

## KEY METRICS SUMMARY

| Metric | Current | Previous | Change |
|--------|---------|----------|--------|
| Console logs | 239 | 250+ | -11 (4%) |
| Type assertions | 187 | 306 | -119 (39%) |
| Skipped tests | 4 | 8 | -4 (50%) |
| Tool layouts | 17 | 18 | -1 (6%) |
| TODOs | 6 | 7 | -1 (14%) |

---

**Last Updated:** November 7, 2025
**Audit Confidence:** High
**No functionality changes recommended**
