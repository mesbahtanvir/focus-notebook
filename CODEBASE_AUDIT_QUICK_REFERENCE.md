# FOCUS NOTEBOOK - QUICK REFERENCE & FILE LOCATIONS

## CRITICAL DUPLICATES - Remove/Consolidate

### 1. Duplicate `normalizeMerchantName()` Function
```
Remove from one file, extract to shared utility:
- /home/user/focus-notebook/functions/src/plaidFunctions.ts:424-429
- /home/user/focus-notebook/functions/src/plaidWebhooks.ts:286-305

Action: Create /home/user/focus-notebook/functions/src/utils/merchantNormalizer.ts
```

### 2. Duplicate `formatDate()` Function (Different Implementations)
```
CONFUSING: Same function name, different behavior

cbtUtils version (Firestore Timestamp handling):
- /home/user/focus-notebook/src/lib/cbtUtils.ts:73-118

formatDateTime version (Ordinal date format):
- /home/user/focus-notebook/src/lib/formatDateTime.ts:2-16

Action: Rename cbtUtils version to parseDate() or normalizeDateFormat()
```

### 3. Duplicate Settings Stores
```
useSettings.ts: API keys, theme, AI model
- /home/user/focus-notebook/src/store/useSettings.ts (54 lines)

useSettingsStore.ts: Cloud sync settings
- /home/user/focus-notebook/src/store/useSettingsStore.ts (35 lines)

Action: Merge into single store or clarify separation of concerns
```

### 4. Duplicate Task Stores
```
Old (production): /home/user/focus-notebook/src/store/useTasks.ts (360 lines)
- Used in 56 files across codebase

New (refactored): /home/user/focus-notebook/src/store/useTasksV2.ts (133 lines)
- Only used in 2 test files

Action: Complete migration of useTasksV2, then remove useTasks.ts
```

### 5. Overlapping Spending Stores
```
useSpending.ts: Transaction/account based
- /home/user/focus-notebook/src/store/useSpending.ts (273 lines)
- Used by: /home/user/focus-notebook/src/app/tools/spending/page.tsx

useSpendingTool.ts: Plaid-integrated tool
- /home/user/focus-notebook/src/store/useSpendingTool.ts (449 lines)
- Used by: /home/user/focus-notebook/src/app/tools/spending-unified/page.tsx

Action: Determine single source of truth or document separation clearly
```

---

## OVERLY LARGE FILES - Needs Splitting

### Priority 1: Massive Component Files

#### Packing List Page (1,828 lines)
```
File: /home/user/focus-notebook/src/app/tools/packing-list/page.tsx

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
Lines: 954, useState hooks: 10, Complex logic: High

Split into:
- ThoughtEditPanel.tsx (editing functionality)
- ThoughtAIProcessing.tsx (AI processing actions)
- ThoughtLinking.tsx (linking UI for tasks/moods/projects)
- ThoughtDeleteConfirm.tsx (deletion confirmation)
- useThoughtModal.ts (state management)
```

#### Task Detail Modal (936 lines)
```
File: /home/user/focus-notebook/src/components/TaskDetailModal.tsx
Lines: 936, Similar issues as ThoughtDetailModal

Split similarly to ThoughtDetailModal
```

### Priority 2: Large Firebase Functions

#### stripeBilling.ts (1,077 lines)
```
File: /home/user/focus-notebook/functions/src/stripeBilling.ts

Functions to extract:
- Subscription management: getSubscriptionSnapshot(), mapSubscriptionToSnapshot()
- Invoicing: getStripeInvoices()
- Payment methods: getStripePaymentMethod()
- Usage tracking: getUsageStats(), incrementUsageStats()
- Portal: createStripePortalSession()
- Webhook: stripeWebhook()

Consider: Create services/stripeSubscription.ts, services/stripeInvoice.ts
```

#### processThought.ts (851 lines)
```
File: /home/user/focus-notebook/functions/src/processThought.ts

Functions to extract:
- Thought validation
- LLM processing logic
- Queue management
- Status updates
- Daily/interval limits enforcement

Consider: Create services/thoughtValidation.ts, services/thoughtLLM.ts
```

### Priority 3: Large Store Files

#### useInvestments.ts (1,024 lines)
```
File: /home/user/focus-notebook/src/store/useInvestments.ts

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

Areas for splitting:
- Account/connection management
- Transaction querying/filtering
- Subscription handling
- Analytics/rollups
```

---

## BOILERPLATE TO ELIMINATE

### 18 Identical Tool Layout Files (6 lines each)
```
Pattern (all identical except toolId parameter):
/home/user/focus-notebook/src/app/tools/*/layout.tsx

Affected:
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
- /home/user/focus-notebook/src/app/tools/asset-horizon/layout.tsx

Action:
Option A: Delete all and add to parent layout
Option B: Use route groups to handle access control
Option C: Use middleware for access checking
```

---

## EXCESSIVE CONSOLE LOGGING (250+ instances)

```
Audit command: grep -r "console\." /home/user/focus-notebook/src --include="*.ts" --include="*.tsx"

Action: Wrap all with DEBUG flag or implement proper logger

Pattern to implement:
const logger = {
  log: (msg: string) => process.env.DEBUG === 'true' && console.log(msg),
  error: (msg: string) => console.error(msg),
  warn: (msg: string) => console.warn(msg),
}

Then replace all console.log with logger.log()
```

---

## TYPE SAFETY ISSUES

### 51+ Instances of `: any`
```
High-risk file: /home/user/focus-notebook/src/services/import-export/ExportService.ts
- Line: Multiple filter functions using any[]

High-risk file: /home/user/focus-notebook/src/services/import-export/ValidationService.ts
- Lines: 10+ any types in validation methods

Action: Replace with proper types or use Partial<T> / Record<string, unknown>
```

### 306+ Instances of `as any` / `as unknown`
```
Indicates inadequate type definitions or schema validation

Priority files for type improvement:
1. ExportService.ts - Create EntityFilter<T> generic
2. ValidationService.ts - Create proper validation schema
3. API routes - Create ZodSchema for validation
4. Component props - Already good coverage (98 interfaces)
```

---

## SKIPPED TESTS (Remove or Complete)

### File 1: ValidationService.test.ts
```
Location: /home/user/focus-notebook/src/__tests__/services/import-export/ValidationService.test.ts

Skipped tests:
- it.skip('should handle empty entity collections')
- it.skip('should return 0 for invalid data')
- it.skip('should handle empty arrays gracefully')

Action: Complete or remove these 3 tests
```

### File 2: TaskStoreIntegration.test.ts
```
Location: /home/user/focus-notebook/src/__tests__/examples/TaskStoreIntegration.test.ts

Skipped test:
- it.skip('should reset daily tasks - implementation dependent')

Action: Complete based on useTasksV2 implementation
```

### Feature Tests with it.skip
```
- transactionParser.test.ts: 'should skip invalid rows' - contains "skip" in name, not actually skipped
- exportRegistry.test.ts: 'should skip sources with no data' - contains "skip" in name, not actually skipped
- RecurringTaskService.test.ts: 'should skip non-recurring tasks' - contains "skip" in name

These are FALSE POSITIVES - tests are actually running
```

---

## UNFINISHED TODO/FIXME COMMENTS

### In Application Code
```
1. /home/user/focus-notebook/src/store/useSpendingTool.ts:
   - Line: TODO: Implement API call to fetch rollup
   - Line: TODO: Implement Cloud Function call (3 instances)
   - Line: currency: 'USD', // TODO: Get from user settings

2. /home/user/focus-notebook/src/store/instances.ts:
   - // TODO: Add other stores as they are migrated

3. /home/user/focus-notebook/src/di/setup.ts:
   - // TODO: Register other repositories as they are migrated

4. /home/user/focus-notebook/src/store/useTasks.ts:
   - parentTaskId?: string // DEPRECATED - For backward compatibility
```

### In Firebase Functions
```
1. /home/user/focus-notebook/functions/src/services/subscriptionDetection.ts:
   - currency: 'USD', // TODO: Get from transaction

2. /home/user/focus-notebook/functions/src/plaidWebhooks.ts:
   - // Verify webhook signature (TODO: implement in production)
```

Action: Address all TODOs or formally document as out-of-scope

---

## MAGIC NUMBERS & STRINGS TO EXTRACT

### In Code
```
1. Date formats: '10th Oct 2025' (formatDateTime.ts:2)
2. Math operations: Math.max(0, ...) - repeated 10+ times
3. Sync interval: 5 minutes (useSettingsStore.ts:23)
4. Stripe API version: '2023-10-16' (stripeBilling.ts:13)
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

### Firebase Functions (No JSDoc)
```
1. /home/user/focus-notebook/functions/src/utils/contextGatherer.ts (160 lines)
2. /home/user/focus-notebook/functions/src/services/llmInsightsService.ts (302 lines)
3. /home/user/focus-notebook/functions/src/utils/actionProcessor.ts (188 lines)
4. /home/user/focus-notebook/functions/src/services/categorizationService.ts (258 lines)
5. /home/user/focus-notebook/functions/src/services/monthlyRollupService.ts (280 lines)

Add JSDoc with @param, @returns, @description
```

### Validation Methods (Missing Documentation)
```
File: /home/user/focus-notebook/src/services/import-export/ExportService.ts

Methods needing docs:
- filterTasks()
- filterProjects()
- filterGoals()
- filterThoughts()
- filterPeople()
- filterMoods()
- filterFocusSessions()
```

---

## ZUSTAND STORE BOILERPLATE (29 TOTAL)

### Stores Following Identical Pattern
```
List of all 29 stores (mostly follow subscribe → CRUD pattern):

Large (300+ lines):
1. useInvestments.ts (1,024 lines)
2. useFocus.ts (710 lines)
3. useEntityRelationships.ts (482 lines)
4. useSpendingTool.ts (449 lines)
5. useTrips.ts (368 lines)
6. useTasks.ts (360 lines)
7. useLLMQueue.ts (334 lines)
8. useToolEnrollment.ts (282 lines)
9. useSpending.ts (273 lines)
10. useThoughts.ts (237 lines)
11. useSubscriptions.ts (219 lines)
12. useProjects.ts (211 lines)
13. useTokenUsage.ts (195 lines)

Medium (100-200 lines):
14. useRelationships.ts (160 lines)
15. useToolUsage.ts (152 lines)
16. useRequestLog.ts (136 lines)
17. useTasksV2.ts (133 lines)
18. useSubscriptionStatus.ts (131 lines)
19. useFriends.ts (124 lines)
20. useGoals.ts (123 lines)
21. useBillingData.ts (122 lines)
22. useUsageStats.ts (113 lines)
23. useMoods.ts (87 lines)
24. useLLMLogs.ts (77 lines)
25. useAnonymousSession.ts (58 lines)
26. useSettings.ts (54 lines)
27. useSettingsStore.ts (35 lines)
28. instances.ts (38 lines)
29. useCurrency.ts (12 lines)

Recommendation: Implement store factory pattern
```

---

## OPTIMIZATION CHECKLIST

### Phase 1: Quick Wins (< 2 hours total)
- [ ] Remove duplicate normalizeMerchantName (1 file)
- [ ] Rename cbtUtils formatDate() to parseDate() (1 file update)
- [ ] Merge useSettings + useSettingsStore (2 files)
- [ ] Create src/constants/api.ts, timing.ts, formats.ts (3 new files)
- [ ] Complete or remove 4 skipped tests (4 test updates)
- [ ] Document all TODOs or remove them (7 comments)

### Phase 2: Medium Effort (4-8 hours)
- [ ] Remove/consolidate 18 tool layout files
- [ ] Extract debug logging to proper logger
- [ ] Split packing-list into 5 files
- [ ] Create date utility consolidation
- [ ] Decide: useSpending vs useSpendingTool
- [ ] Extract validation logic to factory

### Phase 3: Major Refactors (8+ hours)
- [ ] Complete useTasksV2 migration
- [ ] Split ThoughtDetailModal into components
- [ ] Split TaskDetailModal into components
- [ ] Split useInvestments store
- [ ] Refactor large Firebase functions
- [ ] Implement store factory pattern
- [ ] Replace 306 'as any' type assertions

