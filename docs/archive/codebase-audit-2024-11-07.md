# Codebase Audit Snapshot (Nov 7, 2025)

Focus Notebook currently spans ~80K lines of TypeScript/JavaScript across the Next.js app and Firebase Functions. The latest audit (post-main rebase on Nov 7, 2025) highlights a mix of quick wins and structural refactors that will materially improve maintainability.

---

## Executive Summary
- **Source files**: 337 (app) + 26 Firebase functions
- **Tests**: 63 Jest suites + 10 Playwright suites (140+ visual cases)
- **Stores**: 29 Zustand stores (several overlapping in responsibility)
- **Console logs in production**: 239
- **Type assertions**: 187 `as any/unknown`
- **Explicit `any` usage**: 228
- **Skipped Jest tests**: 4

---

## Highest-Risk Findings

### Duplicate / Overlapping Modules
- `normalizeMerchantName` implemented in both `functions/src/plaidFunctions.ts` and `functions/src/plaidWebhooks.ts`; logic must live in a shared util to avoid diverging merchant maps.
- Multiple `formatDate` helpers (`src/lib/cbtUtils.ts`, `src/lib/formatDateTime.ts`, `src/components/billing/InvoiceHistory.tsx`, etc.) expose different behavior under the same name, causing import mistakes.
- Settings are split across `src/store/useSettings.ts` and `src/store/useSettingsStore.ts`, while task state lives in both `useTasks.ts` and `useTasksV2.ts`. Spending state is duplicated between `useSpending.ts` and `useSpendingTool.ts`.
- Tool layout wrappers under `src/app/tools/*/layout.tsx` still repeat identical boilerplate ~17 times.

### Oversized Single Files
- `src/app/tools/packing-list/page.tsx` (≈1,828 lines) and modal components (`ThoughtDetailModal.tsx`, `TaskDetailModal.tsx`) exceed 900 lines with 17–20 `useState` hooks each.
- Firebase functions such as `functions/src/stripeBilling.ts` (1,077 lines) and `functions/src/processThought.ts` (851 lines) combine unrelated responsibilities instead of delegating to services.
- Store modules like `src/store/useInvestments.ts` (1,024 lines) and `src/store/useSpendingTool.ts` (449 lines) bundle types, persistence, and UI plumbing in single files.

### Debug & Type Debt
- 239 `console.log` calls (86 in Cloud Functions) execute in production; most are not gated behind debug flags.
- 187 `as any/unknown` assertions and 228 explicit `any` annotations hide type gaps, especially in export/import services and Firebase integrations.
- 29 Zustand stores follow identical CRUD scaffolding; extracting reusable patterns would reduce copy/paste bugs.

---

## Prioritized Actions

### Quick Wins (≤2 hours)
1. Extract `normalizeMerchantName` into `functions/src/utils/merchantNormalizer.ts` and import it in both Plaid entry points.
2. Consolidate/rename `formatDate` helpers so each function name maps to a single behavior; update InvoiceHistory to use the shared util.
3. Merge the duplicate settings stores and explicitly document the split between `useSpending` vs `useSpendingTool`.
4. Replace the repeated tool layout boilerplate with a shared layout component or higher-order wrapper.
5. Wrap Cloud Function logging behind a debug flag (e.g., `if (process.env.LOG_LEVEL === 'debug')`) to keep production logs clean.

### Medium Effort (½–1 day)
1. Split the packing list page into dedicated hooks (`usePacking`), type modules, and feature components (timeline/items/trip sections).
2. Factor Firebase functions (`stripeBilling`, `processThought`) into `services/*` modules for subscriptions, invoicing, queueing, and AI processing.
3. Adopt a store factory or shared helpers for Zustand stores to eliminate 29 copies of subscribe/CRUD logic.
4. Finish the `useTasksV2` migration (currently only imported in tests) or remove it to reduce confusion.
5. Reduce `any` usage within Export/Import services by introducing interfaces for the registry pattern.

### Major Refactors (multi-day)
1. Extract state management from the Thought/Task detail modals into custom hooks plus leaf components; current monoliths exceed 900 lines with tangled state.
2. Split `useInvestments` into portfolio, market data, and projections modules; align with Alpha Vantage refresh workflows.
3. Decide on a single spending store abstraction (classic vs Plaid-powered) and document the migration path.
4. Design a reusable schema for Cloud Function logging/metrics so queueing, retries, and circuit breakers share visibility logic.

---

## Metrics Snapshot

| Metric | Current | Notes |
| --- | --- | --- |
| Console logs | 239 | Aim to gate or remove in production |
| Type assertions | 187 | Concentrated in Export/Import services |
| Explicit `any` | 228 | Highlighted in validation utilities |
| Files > 700 LOC | 8 | Packing list page, Thought/Task modals, major functions |
| Layout boilerplate files | 17 | Identical wrappers across `app/tools/*/layout.tsx` |
| Zustand stores | 29 | Store factory or composition recommended |
| Skipped Jest tests | 4 | Complete or remove |

---

## Additional Observations

- **Import/Export services** (`ExportService.ts`, `ImportService.ts`, `ValidationService.ts`, etc.) total ~2,400 lines. The new registry API should move shared transformers/validators into discrete modules so that each tool implements only its delta.
- **E2E Coverage**: Playwright suites generate ~140 screenshots across Desktop/Tablet/Mobile plus browser-specific tests (Safari loading, dynamic routing). Keep baselines current to preserve coverage value.
- **React Hook Complexity**: `ThoughtDetailModal` (17 `useState`) and `TaskDetailModal` (20 `useState`) are primary candidates for extracting state machines/custom hooks before additional features land.
- **Documentation Debt**: Older README variants and sprint notes were removed in favor of `docs/CODEBASE_AUDIT.md`, `docs/TESTING.md`, and the existing architecture/setup guides. Keep future reports in this file to avoid littering the repo.

---

## Recommended Next Steps
1. **Lock quick wins** before tackling new product work—especially the duplicated utilities and store merges.
2. **Schedule structural refactors** (packing list, modals, Firebase services) as dedicated workstreams; each yields significant readability and testability gains.
3. **Track metrics** (console logs, `any`, skipped tests) in CI so regressions surface automatically.
4. **Document progress** by appending to this file instead of creating ad-hoc markdown notes.

Keeping this single audit source of truth will prevent the markdown sprawl that previously obscured actionable work.
