# Testing Reference

This guide condenses all testing documentation: Safari verification, screenshot workflows, Firebase emulator setup, baseline data, CI/CD integration, and specialty suites that previously lived across many markdown files.

---

## Quick Commands

```bash
# Fast local validation (≈3 min)
npm run lint && npm test && npm run build

# Unit + integration tests (Jest)
npm test

# Run a specific Jest file
npm test -- src/__tests__/routes/dynamic-routing.test.tsx

# Playwright visual tests (all browsers/viewports)
npm run test:screenshots

# Interactive Playwright UI
npm run test:screenshots:ui

# Update screenshot baselines
npm run test:screenshots:update
```

Stats (Nov 2025):
- **Jest**: 34 suites / 667 tests passing (4 skipped) after adding 232 new feature-focused tests (`src/__tests__/features/*.test.tsx`).
- **Playwright**: 10 suites / 140+ screenshot checkpoints across Desktop Chrome, Tablet (iPad), Mobile (iPhone), plus the dedicated `safari-loading.spec.ts`.

---

## Safari Loading Fix Coverage

The Safari fix forces `memoryLocalCache()` while non-Safari browsers keep `persistentLocalCache()`.

| Layer | Files | Highlights |
| --- | --- | --- |
| **Unit** | `src/__tests__/lib/utils/browserDetection.test.ts`, `src/__tests__/lib/firebase/firebaseClient.test.ts` | 30+ tests covering user agents, cache selection, SSR handling, fallback logging |
| **Integration** | `src/__tests__/integration/firestoreSubscriptionLoading.test.ts` | Ensures subscription loading transitions complete even when cache strategy differs |
| **E2E** | `e2e/safari-loading.spec.ts` | Desktop Safari + iOS Safari + Chrome/Firefox/Edge; verifies loading timeout protections and console messaging |

Manual verification checklist:
1. Launch Safari (macOS or iOS) and load the app fresh.
2. Confirm console logs show `Safari detected, using memory cache`.
3. Ensure “Loading your workspace…” disappears within 15 seconds and the UI becomes interactive.
4. Repeat on Chrome/Firefox/Edge to ensure persistent cache path still works (`Using persistent cache with multi-tab support`).

---

## Screenshot & Visual Regression Suite

### What’s Covered
- Authentication, dashboard, every tool surface (tasks, focus, thoughts, goals, projects, mood, brainstorming, CBT, packing list, subscriptions, trips, investments, admin, etc.)
- Modals, empty states, and responsive designs (Desktop/Tablet/Mobile viewports).
- Unified spending tool dashboards once data is available.

### Keeping Baselines Current
```bash
# Update everything (after large UI changes)
npm run test:screenshots:update

# Update a single file
npx playwright test e2e/tools-tasks.spec.ts --update-snapshots

# Review diffs interactively
npm run test:screenshots:ui
```

### When to Update
- UI additions (e.g., CTA buttons, compact project view, new LLM playground).
- Visual polish on focus sessions or follow-up task banners.
- Newly added pages (e.g., `/tools/llm-playground`).

Always re-run `npm run test:screenshots` after approving baselines and verify changes with `git diff e2e/`.

---

## Firebase Emulator & Java Requirements

Screenshot tests prefer the Firebase Local Emulator Suite but fall back gracefully if Java is missing.

| Environment | Behavior | Notes |
| --- | --- | --- |
| **Java 17 available** | Auth + Firestore emulators start automatically via `e2e/setup/emulator-setup.ts`. Baseline data seeds into Firestore. Emulator UI exposed at http://localhost:4000. | Recommended for the most realistic tests and for CI. |
| **Java missing** | Setup logs `Java is not installed…` and switches to mocked Firebase helpers. Baseline data loads from in-memory fixtures/localStorage. | All tests still pass; realism is lower but great for quick runs. |

Install Java locally:
```bash
brew install openjdk@17
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
java -version
```

The Playwright config also installs Java 17 inside GitHub Actions, so CI always exercises the emulator path.

---

## Baseline Data & Sync Handling

Baseline fixtures (see `e2e/fixtures/baseline-data.ts`) simulate an active user:
- **Tasks**: 12 entries (today, upcoming, backlog, recurring).
- **Thoughts**: 5 thoughtful journal entries.
- **Goals**: 5 (mix of active/completed with varying progress).
- **Projects**: 4 with milestones.
- **Focus sessions**: 10 across multiple days.

The global Playwright fixture automatically:
1. Authenticates a demo user (`demo@focusnotebook.com`).
2. Sets the clock to a fixed moment for deterministic screenshots.
3. Seeds all baseline data.
4. Mocks Firebase or connects to emulators.
5. Waits for sync indicators, skeletons, and spinners to disappear using helpers in `e2e/helpers/sync.ts`.

Need manual control? Use:
```typescript
import { waitForAllLoadingComplete, waitForDataLoaded } from '../helpers/sync';

await waitForAllLoadingComplete(page);
await waitForDataLoaded(page, { dataSelector: '[data-testid="task-item"]', minItems: 5 });
```

---

## Specialty Jest Suites

- **Dynamic Routing** (`src/__tests__/routes/dynamic-routing.test.tsx`): 28 tests verify `/tools/*/[id]` routes handle direct loads, router navigation, history, and exotic IDs (UUID, Firebase IDs, hyphenated).
- **Feature Suites** (`src/__tests__/features/*.test.tsx`): 232 new cases covering Quick Focus, CTA buttons, follow-up task feedback, compact project view, LLM prompt builder, transaction parser, and the export registry.
- **Safari detection & Firebase client**: ensure cache selection, SSR guard rails, and logging remain correct as the platform evolves.

If Jest ever tries to execute Playwright tests (leading to `TransformStream is not defined`), confirm `jest.config.js` includes `testPathIgnorePatterns: ['<rootDir>/e2e/']`.

---

## CI & Baseline Automation

- `.github/workflows/screenshots.yml` runs Playwright on PRs and pushes (Node 22 + Java 17 + Firebase CLI).
- Artifacts include the Playwright HTML report plus `*-actual.png`/`*-diff.png` assets for failures.
- Add `[update-screenshots]` to a commit message or trigger the “Update Screenshot Baselines” workflow to regenerate images in CI.
- Regular CI (`ci.yml`) only runs lint/type-check/unit/build for speed (~8–10 minutes).

For documentation-only commits, append `[skip ci]` to avoid spending credits.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `TransformStream is not defined` in Jest | Ensure e2e folder is ignored by Jest (see note above). |
| Playwright warns “Java is not installed” | Install Java 17 or ignore if you’re fine with mocked Firebase. |
| Baselines contain spinners/loading screens | Use `waitForAllLoadingComplete` or ensure helpers/sync is imported. |
| TypeScript can’t resolve `react-plaid-link` | Delete `node_modules` + `package-lock.json`, reinstall, then rerun `npx tsc --noEmit` (see Development guide). |
| Screenshot workflow slow locally | Use `npx playwright test e2e/<file>.spec.ts --project="Desktop Chrome"` to target a single suite/viewport. |

---

Keeping this single testing reference up to date prevents the markdown sprawl that previously lived across 10+ files (`TESTING-GUIDE.md`, `SCREENSHOT_*`, `SAFARI-FIX-*`, `e2e/*.md`, etc.). When new suites land, add a short subsection here instead of creating another standalone document.
