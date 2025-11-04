# Screenshot Testing Guide

Comprehensive visual regression testing for Focus Notebook using Playwright and Firebase Local Emulator Suite.

## Overview

This test suite provides extensive screenshot coverage across:
- **Authentication pages** (login, profile, settings)
- **Dashboard pages** (home, overview, progress)
- **Core tools** (tasks, focus sessions, goals, thoughts, projects)
- **Feature tools** (investments, trips, relationships, friends)
- **Additional tools** (brainstorming, CBT, mood tracker, notes, errands, etc.)
- **Modal interfaces** (task details, thought editor, forms, confirmations)
- **Responsive layouts** (mobile, tablet, desktop)

**Key Features:**
- Uses Firebase Local Emulator Suite for realistic data
- Automatic baseline data seeding
- Consistent timestamps and data for reliable screenshots
- Fast local testing with no network calls

## Test Structure

```
e2e/
├── setup/                        # Emulator setup utilities
│   ├── emulator-setup.ts        # Start/stop Firebase emulators
│   ├── emulator-teardown.ts     # Cleanup after tests
│   └── emulator-data.ts         # Seed data to emulators
├── fixtures/                     # Test fixtures and baseline data
│   ├── baseline-data.ts         # Realistic user data fixture
│   └── global-setup.ts          # Global test setup with emulators
├── helpers/                      # Test utilities
│   ├── auth.ts                  # Authentication helpers (deprecated)
│   ├── data.ts                  # Mock data generators (deprecated)
│   ├── screenshot.ts            # Screenshot utilities
│   ├── sync.ts                  # Loading state helpers
│   └── index.ts                 # Central exports
├── auth.spec.ts                 # Authentication pages
├── dashboard.spec.ts            # Dashboard & home pages
├── tools-tasks.spec.ts          # Task management
├── tools-focus.spec.ts          # Focus/Pomodoro sessions
├── tools-goals-thoughts.spec.ts # Goals, thoughts, projects
├── tools-investment-trips.spec.ts  # Investment & trip planning
├── tools-relationships.spec.ts  # Friends & relationships
├── tools-additional.spec.ts     # All other tools
├── modals.spec.ts               # Modal components
├── example-with-baseline.spec.ts  # Example using baseline data
├── README.md                    # This file
├── EMULATOR_SETUP_GUIDE.md      # Firebase emulator guide
├── BASELINE_DATA_GUIDE.md       # Baseline data guide
└── SYNC_HANDLING_GUIDE.md       # Loading state guide
```

## Running Tests

### Prerequisites

**Required:**
- Firebase CLI (one-time setup):
  ```bash
  npm install -g firebase-tools
  ```

**Optional (for Firebase emulators):**
- Java 17 or later (for realistic Firebase testing):
  ```bash
  # macOS
  brew install openjdk@17

  # Verify
  java -version
  ```

**Note:** If Java is not installed, tests automatically fall back to mocked Firebase (still works fine, just less realistic). See [JAVA_INSTALLATION.md](JAVA_INSTALLATION.md) for details.

### Local Development

```bash
# Run all screenshot tests (emulators start automatically)
npm run test:screenshots

# Run in UI mode (interactive)
npm run test:screenshots:ui

# Run in debug mode
npm run test:screenshots:debug

# Update screenshot baselines (after intentional UI changes)
npm run test:screenshots:update

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests matching a pattern
npx playwright test --grep "mobile"
```

### Manual Emulator Control

```bash
# Start emulators manually (useful for development/debugging)
firebase emulators:start --only auth,firestore

# View emulator UI (while running)
open http://localhost:4000

# Stop emulators
firebase emulators:stop
```

### CI/CD Integration

Screenshot tests run automatically in GitHub Actions with **Firebase emulators**:

**Automatic runs on:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

**The CI workflow:**
1. Installs Java 17 (for Firebase emulators)
2. Installs Firebase CLI
3. Builds the application
4. Runs screenshot tests with emulators
5. Uploads test reports and diffs
6. Comments on PRs with results

**See [CI_CD_GUIDE.md](CI_CD_GUIDE.md) for complete CI/CD documentation.**

## Test Configuration

Configuration is in [playwright.config.ts](../playwright.config.ts):

- **Test timeout**: 30 seconds per test
- **Screenshot tolerance**: 100 pixels max difference, 0.2 threshold
- **Retries**: 2 on CI, 0 locally
- **Browsers**: Chromium (desktop, mobile, tablet)
- **Viewports**:
  - Desktop: 1280x720
  - Tablet: 1024x768 (iPad Pro)
  - Mobile: 390x844 (iPhone 13)
- **Firebase Emulators**:
  - Auth: localhost:9099
  - Firestore: localhost:8080
  - UI: localhost:4000

## Firebase Emulator Suite

### Why Emulators?

Instead of mocking Firebase, we use the **Firebase Local Emulator Suite** for realistic testing. This provides:

- **Real Firebase behavior**: Actual Firebase SDK, not mocked
- **Fast execution**: Local emulators, no network calls
- **Consistent data**: Same baseline data every time
- **Easy debugging**: Web UI at http://localhost:4000
- **No quotas**: No production limits or costs
- **Works offline**: No internet required

For detailed information, see [EMULATOR_SETUP_GUIDE.md](EMULATOR_SETUP_GUIDE.md).

### How It Works

1. **Automatic Start**: Emulators start automatically when you run tests
2. **Data Seeding**: Baseline data is seeded to emulators before each test
3. **Isolated Testing**: Each test gets a clean, consistent dataset
4. **Automatic Cleanup**: Data is cleared after tests complete

### Emulator Ports

- **Auth**: http://localhost:9099
- **Firestore**: http://localhost:8080
- **UI Dashboard**: http://localhost:4000

## Baseline Data Approach

### What's Included?

The baseline fixture ([fixtures/baseline-data.ts](fixtures/baseline-data.ts)) includes realistic user data:

- **12 tasks**: Mix of today's tasks, upcoming, completed, recurring, and backlog items
- **5 thoughts**: Recent journal entries and reflections spanning the last week
- **5 goals**: Active and completed goals with realistic progress tracking
- **4 projects**: Active development projects at various stages
- **10 focus sessions**: Recent Pomodoro sessions from the past week

All data is **seeded into Firebase emulators** automatically, providing real Firebase behavior with consistent test data.

### Writing Tests (Recommended Pattern)

Use the global fixture that handles everything automatically:

```typescript
import { test, gotoPage } from './fixtures/global-setup';
import { takeScreenshot } from './helpers/screenshot';

test.describe('My Feature', () => {
  // Emulators + baseline data loaded automatically!
  test('feature page with realistic data', async ({ page }) => {
    await gotoPage(page, '/my-feature');

    await takeScreenshot(page, {
      name: 'my-feature-with-data',
      fullPage: true,
    });
  });
});
```

### Custom Data for Specific Tests

Override baseline data when needed:

```typescript
import { test, gotoPage } from './fixtures/global-setup';
import { seedDataToEmulator } from './setup/emulator-data';

test('empty state', async ({ page }) => {
  // Seed empty data instead of baseline
  await seedDataToEmulator(page, {
    tasks: [],
    thoughts: [],
    goals: [],
  });

  await page.goto('/my-feature');
  // ... rest of test
});
```

For complete details on baseline data, see [BASELINE_DATA_GUIDE.md](BASELINE_DATA_GUIDE.md).

## Cloud Sync & Loading States

Firebase sync and loading indicators can cause inconsistent screenshots. Our helpers automatically handle:

- **Loading spinners**: Waits for all spinners to disappear
- **Skeleton loaders**: Waits for skeleton screens to load
- **Sync indicators**: Waits for "Syncing..." messages to clear
- **Network idle**: Ensures all API calls complete
- **Emulator sync**: Waits for data to load from emulators

For complete details, see [SYNC_HANDLING_GUIDE.md](SYNC_HANDLING_GUIDE.md).

### Example

```typescript
import { waitForAllLoadingComplete } from './helpers/sync';

test('wait for loading', async ({ page }) => {
  await page.goto('/dashboard');

  // Wait for all loading to complete
  await waitForAllLoadingComplete(page);

  await takeScreenshot(page, { name: 'dashboard-loaded' });
});
```

## Best Practices

1. **Use Global Fixture**: Handles emulators, auth, and baseline data automatically
2. **Mock Time**: Always use `mockDateTime()` for consistent timestamps
3. **Wait for Loading**: Use `waitForAllLoadingComplete()` before screenshots
4. **Hide Dynamic Content**: Mask timestamps, prices, or other changing data
5. **Name Consistently**: Use descriptive, kebab-case screenshot names
6. **Test Responsiveness**: Include mobile/tablet variants for key pages
7. **Check Emulator UI**: Debug data issues at http://localhost:4000

### Masking Dynamic Content

```typescript
await takeScreenshot(page, {
  name: 'my-screenshot',
  mask: [
    '[data-testid="timestamp"]',
    '[data-testid="price"]',
    '.relative-time',
    '.recharts-tooltip', // Chart tooltips
  ],
});
```

## Helpers API

### Emulator Management (`setup/emulator-setup.ts`)

```typescript
// Start emulators manually
import { startEmulators, stopEmulators, clearEmulatorData } from './setup/emulator-setup';

await startEmulators();
await clearEmulatorData();
await stopEmulators();
```

### Emulator Data Seeding (`setup/emulator-data.ts`)

```typescript
// Create test user
import { createTestUser, seedDataToEmulator } from './setup/emulator-data';

await createTestUser(page, {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
});

// Seed data to emulators
await seedDataToEmulator(page, {
  tasks: [...],
  thoughts: [...],
  goals: [...],
});
```

### Baseline Data (`fixtures/baseline-data.ts`)

```typescript
// Generate baseline data
import { generateBaselineData } from './fixtures/baseline-data';

const data = generateBaselineData('user-id');
// Returns: { tasks, thoughts, goals, projects, focusSessions }
```

### Screenshot Utilities (`helpers/screenshot.ts`)

```typescript
// Take screenshot with options
await takeScreenshot(page, {
  name: 'screenshot-name',
  waitFor: 'selector', // Wait for element
  mask: ['[data-testid="dynamic"]'], // Hide elements
  fullPage: true, // Full page scroll
  animations: 'disabled', // Disable animations
  waitTime: 1000, // Wait time in ms
});

// Utility functions
await waitForPageReady(page);
await hideDynamicElements(page);
await setViewport(page, 'mobile' | 'tablet' | 'desktop');
await scrollIntoView(page, selector);
await openModal(page, triggerSelector, modalSelector);
await mockDateTime(page, new Date('2024-01-15T10:00:00Z'));
await waitForImages(page);
```

### Sync Utilities (`helpers/sync.ts`)

```typescript
// Wait for all loading to complete
import { waitForAllLoadingComplete, waitForSyncComplete } from './helpers/sync';

await waitForAllLoadingComplete(page);
await waitForSyncComplete(page);
```

## Troubleshooting

### Emulators Won't Start

```bash
# Check if ports are in use
lsof -i :9099
lsof -i :8080
lsof -i :4000

# Kill processes using these ports
kill -9 <PID>

# Or manually start
firebase emulators:start --only auth,firestore
```

### Data Not Appearing in Tests

1. **Check Emulator UI**: Visit http://localhost:4000
2. **Verify seeding**: Add logging to see if data was seeded
3. **Wait for sync**: Increase timeout in `waitForEmulatorSync()`

### Tests Failing Locally

1. **Update baselines**: `npm run test:screenshots:update`
2. **Check emulators**: Ensure they're running
3. **Clear emulator data**: Restart emulators with clean state
4. **Check viewport**: Ensure correct screen size

### Tests Failing in CI

1. **Firebase CLI**: Ensure Firebase CLI is installed in CI
2. **Timing issues**: Increase `waitTime` for loading
3. **Emulator startup**: Increase timeout for emulator ready check

### Baseline Mismatch

If intentional UI changes cause failures:

```bash
# Update all baselines
npm run test:screenshots:update

# Update specific test
npx playwright test e2e/dashboard.spec.ts --update-snapshots

# Commit updated baselines
git add e2e/**/*.png
git commit -m "chore: update screenshot baselines"
```

### Debugging Failed Tests

```bash
# Run with UI
npm run test:screenshots:ui

# Run with debug
npm run test:screenshots:debug

# View test report
npx playwright show-report
```

## Coverage Summary

### Total Tests: 140+

- **Authentication**: 8 tests (login, profile, settings)
- **Dashboard**: 10 tests (home, overview, progress, charts)
- **Tasks**: 10 tests (list, empty, filtered, recurring)
- **Focus**: 10 tests (timer, history, summary, statistics)
- **Goals**: 7 tests (grid, detail, progress)
- **Thoughts**: 7 tests (list, detail, tags)
- **Projects**: 4 tests (list, detail)
- **Investments**: 6 tests (portfolio, detail, asset horizon)
- **Trips**: 5 tests (list, detail, budget)
- **Relationships**: 6 tests (friends, relationships, detail pages)
- **Additional Tools**: 20 tests (brainstorming, CBT, notes, mood, etc.)
- **Modals**: 12 tests (task, thought, goal, confirmation modals)
- **Responsive**: Included in all test suites (mobile/tablet/desktop)

### Viewports Tested

- **Desktop**: 1280x720 (default)
- **Tablet**: 1024x768 (iPad Pro)
- **Mobile**: 390x844 (iPhone 13)

## Maintenance

### When to Update Baselines

Update baselines when you've made intentional UI changes:
- New features added
- Design updates
- Layout improvements
- Color scheme changes

### When NOT to Update Baselines

Don't update if changes are:
- Unintentional
- Regressions
- Bugs
- Incorrect rendering

### Baseline Management

```bash
# View diffs
npm run test:screenshots:ui

# Accept specific changes
npx playwright test <test-file> --update-snapshots

# Accept all changes
npm run test:screenshots:update
```

## CI/CD Workflow

### Automatic Runs

Screenshot tests run on:
- Every PR to `main` or `develop`
- Every push to `main` or `develop`

### Manual Baseline Updates

To update baselines in CI, include `[update-screenshots]` in your commit message:

```bash
git commit -m "feat: update button styles [update-screenshots]"
```

Or manually trigger the workflow in GitHub Actions.

## Performance

- **Emulator startup**: 3-5 seconds (one-time)
- **Average test duration**: 2-3 seconds per test
- **Data seeding**: 100-200ms per test
- **Total suite runtime**: ~8-12 minutes (140+ tests)
- **Parallel execution**: Tests run in parallel per project
- **CI timeout**: 30 minutes

## Best Practices Summary

✅ **DO**
- Use global fixture for automatic setup
- Let emulators run between test runs
- Mock time consistently
- Wait for loading to complete
- Hide dynamic content
- Use descriptive screenshot names
- Check emulator UI for debugging
- Test key viewports

❌ **DON'T**
- Point tests to production Firebase
- Manually start/stop emulators for each test
- Include timestamps in screenshots
- Test without waiting for load
- Use random/dynamic data
- Skip mobile testing
- Forget to mask animations

## Resources

### 📘 Detailed Documentation

- **[EMULATOR_SETUP_GUIDE.md](EMULATOR_SETUP_GUIDE.md)** - Complete guide to Firebase Local Emulator Suite
- **[BASELINE_DATA_GUIDE.md](BASELINE_DATA_GUIDE.md)** - Complete guide to using realistic baseline data
- **[SYNC_HANDLING_GUIDE.md](SYNC_HANDLING_GUIDE.md)** - How to handle Firebase sync and loading states
- **[CI_CD_GUIDE.md](CI_CD_GUIDE.md)** - GitHub Actions integration and workflow documentation
- **[JAVA_INSTALLATION.md](JAVA_INSTALLATION.md)** - Java installation for Firebase emulators

### 🔗 External Links

- [Playwright Documentation](https://playwright.dev/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Visual Regression Testing Best Practices](https://playwright.dev/docs/test-snapshots)

### 🎯 Quick Reference

- **Emulators**: Firebase Local Emulator Suite for realistic testing
- **Baseline Data**: Realistic user data seeded into emulators
- **Sync Handling**: Automatic waiting for Firebase/cloud loading states
- **Global Fixture**: Automatic setup with emulators, auth, and baseline data
- [Visual Comparison Guide](https://playwright.dev/docs/test-snapshots)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Support

For issues or questions:
1. Check this README
2. Read [BASELINE_DATA_GUIDE.md](BASELINE_DATA_GUIDE.md) for data questions
3. Read [SYNC_HANDLING_GUIDE.md](SYNC_HANDLING_GUIDE.md) for loading issues
4. View test examples in spec files
5. Check Playwright docs
6. Open an issue on GitHub
