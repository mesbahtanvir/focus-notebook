# Cloud Sync & Loading State Handling Guide

## Overview

When testing apps with Firebase/cloud syncing, you need to handle various loading states to ensure screenshots are taken when the page is fully loaded and stable. This guide explains how to manage sync states in your screenshot tests.

## The Problem

Apps with cloud syncing have several loading states:
- 🔄 **Initial Firebase connection**
- 🔄 **Authentication check**
- 🔄 **Data fetching from Firestore**
- 🔄 **Real-time listener setup**
- 🔄 **Skeleton loaders**
- 🔄 **Sync indicators ("Syncing...", spinners)**

If you take screenshots during these loading states, you'll get:
- ❌ Inconsistent screenshots
- ❌ Loading spinners in baselines
- ❌ Empty content before data loads
- ❌ "Syncing..." indicators visible

## The Solution

We provide comprehensive sync handling utilities in [helpers/sync.ts](helpers/sync.ts) that:
- ✅ Mock Firebase to prevent real network calls
- ✅ Wait for all loading indicators to disappear
- ✅ Disable offline mode banners
- ✅ Prevent real-time sync updates during tests
- ✅ Mark sync as complete automatically

## Automatic Sync Handling (Recommended)

The **global fixture** handles everything automatically:

```typescript
import { test, gotoPage } from './fixtures/global-setup';
import { takeScreenshot } from './helpers/screenshot';

test('my test', async ({ page }) => {
  // All sync handling is done automatically!
  await gotoPage(page, '/dashboard');

  // Page is fully loaded, sync complete, no spinners
  await takeScreenshot(page, {
    name: 'dashboard-loaded',
    fullPage: true,
  });
});
```

### What Happens Automatically:

1. **Firebase is mocked** - No real API calls
2. **Offline indicators disabled** - No "You are offline" banners
3. **Real-time sync disabled** - No live updates during test
4. **Baseline data preloaded** - Data appears instantly
5. **Sync marked complete** - App thinks sync is done
6. **All loading waits** - Waits for spinners, skeletons, etc.

## Manual Sync Handling

For custom scenarios or tests without global fixture:

### Wait for All Loading

```typescript
import { waitForAllLoadingComplete } from './helpers/sync';

test('manual sync handling', async ({ page }) => {
  await page.goto('/tools/tasks');

  // Wait for everything to load
  await waitForAllLoadingComplete(page);

  await takeScreenshot(page, { name: 'tasks-loaded' });
});
```

### Wait for Specific Indicators

```typescript
import {
  waitForSyncComplete,
  waitForSkeletonsGone,
  waitForSpinnersGone,
} from './helpers/sync';

test('wait for specific loaders', async ({ page }) => {
  await page.goto('/dashboard');

  // Wait for sync indicator
  await waitForSyncComplete(page);

  // Wait for skeleton loaders
  await waitForSkeletonsGone(page);

  // Wait for spinners
  await waitForSpinnersGone(page);

  await takeScreenshot(page, { name: 'dashboard' });
});
```

### Wait for Specific Data

```typescript
import { waitForDataLoaded } from './helpers/sync';

test('wait for data to appear', async ({ page }) => {
  await page.goto('/tools/tasks');

  // Wait for at least 5 task items
  await waitForDataLoaded(page, {
    dataSelector: '[data-testid="task-item"]',
    minItems: 5,
    timeout: 10000,
  });

  await takeScreenshot(page, { name: 'tasks-with-data' });
});
```

### Check if Page is Loading

```typescript
import { isPageLoading } from './helpers/sync';

test('conditional wait', async ({ page }) => {
  await page.goto('/dashboard');

  // Check if still loading
  if (await isPageLoading(page)) {
    console.log('Page is still loading, waiting...');
    await waitForAllLoadingComplete(page);
  }

  await takeScreenshot(page, { name: 'dashboard' });
});
```

## Mocking Firebase

### Automatic Mocking (Global Fixture)

The global fixture automatically mocks Firebase, but you can also do it manually:

```typescript
import { mockFirebase } from './helpers/sync';

test('mock firebase manually', async ({ page }) => {
  // Mock Firebase before navigation
  await mockFirebase(page);

  await page.goto('/tools/tasks');
  // No real Firebase calls will be made
});
```

### What Gets Mocked:

- `firebase.auth()` - Returns mock auth with your test user
- `firebase.firestore()` - Returns mock Firestore (no network calls)
- `onSnapshot()` - Listeners call once with empty data, then stop
- `get()` - Returns empty results immediately

### Benefits:

- ⚡ **Faster tests** - No network latency
- 🎯 **More reliable** - No network failures
- 🔒 **No rate limits** - No quota concerns
- 📸 **Consistent screenshots** - Same data every time

## Handling Loading Indicators

### Common Selectors

The sync utilities look for these common loading indicators:

```typescript
// Sync indicators
'[data-testid="syncing"]'
'[data-testid="loading"]'
'.syncing'
'.loading'
'[aria-label*="Syncing"]'
'[aria-label*="Loading"]'

// Skeleton loaders
'.skeleton'
'[data-testid="skeleton"]'
'.skeleton-loader'
'[class*="skeleton"]'

// Spinners
'.spinner'
'[data-testid="spinner"]'
'[role="progressbar"]'
'.loading-spinner'
```

### Custom Selectors

If your app uses different selectors:

```typescript
// Wait for your custom loading indicator
await page.waitForSelector('.my-custom-loader', {
  state: 'hidden',
  timeout: 10000
});
```

## Disabling Real-Time Updates

Real-time Firebase listeners can cause screenshots to change during tests. Disable them:

```typescript
import { disableRealtimeSync } from './helpers/sync';

test('no real-time updates', async ({ page }) => {
  // Disable before navigation
  await disableRealtimeSync(page);

  await page.goto('/dashboard');
  // Firestore onSnapshot won't trigger updates
});
```

This is **automatic** with the global fixture.

## Offline Mode Handling

Prevent "You are offline" banners:

```typescript
import { disableOfflineIndicators } from './helpers/sync';

test('always online', async ({ page }) => {
  // Force online status
  await disableOfflineIndicators(page);

  await page.goto('/tools/tasks');
  // navigator.onLine will always be true
});
```

This is **automatic** with the global fixture.

## Best Practices

### ✅ DO:

1. **Use global fixture** for most tests (handles everything)
2. **Wait for loading complete** before screenshots
3. **Mock Firebase** to prevent real API calls
4. **Disable real-time sync** for stable tests
5. **Use specific waits** when you know what to wait for
6. **Add timeout logs** to debug slow tests

### ❌ DON'T:

1. **Take screenshots during loading** - Use waits
2. **Rely on fixed timeouts** - Use element waits
3. **Allow real Firebase calls** in tests - Mock it
4. **Forget to wait for animations** - Add small delays
5. **Use too short timeouts** - Network can be slow

## Debugging Loading Issues

### Test is Timing Out?

```typescript
// Add debug logging
test('debug loading', async ({ page }) => {
  console.log('🔍 Navigating...');
  await page.goto('/dashboard');

  console.log('🔍 Checking if loading...');
  const loading = await isPageLoading(page);
  console.log(`Loading: ${loading}`);

  console.log('🔍 Waiting for load complete...');
  await waitForAllLoadingComplete(page);

  console.log('✅ Page ready!');
});
```

### Screenshot Shows Loading Spinner?

```typescript
// Add extra waits
await waitForAllLoadingComplete(page);
await page.waitForTimeout(1000); // Extra safety margin
```

### Data Not Appearing?

```typescript
// Check if data is actually loaded
await waitForDataLoaded(page, {
  dataSelector: '[data-testid="task-item"]',
  minItems: 1, // At least one item
  expectedText: 'Review pull requests', // Specific task
  timeout: 15000,
});
```

### Page Keeps Showing "Syncing..."?

```typescript
// Manually mark sync complete
import { markSyncComplete } from './helpers/sync';

await page.goto('/dashboard');
await markSyncComplete(page);
await page.waitForTimeout(500);
```

## Advanced Scenarios

### Testing Actual Loading States

To test loading states themselves (not common for screenshots):

```typescript
test('show loading state', async ({ page }) => {
  // Don't use global fixture
  await page.goto('/dashboard');

  // Take screenshot immediately (will show loading)
  await takeScreenshot(page, {
    name: 'dashboard-loading',
  });

  // Then wait and show loaded state
  await waitForAllLoadingComplete(page);
  await takeScreenshot(page, {
    name: 'dashboard-loaded',
  });
});
```

### Testing Offline Mode

```typescript
test('offline banner', async ({ page }) => {
  // Don't disable offline indicators
  await page.goto('/dashboard');

  // Simulate going offline
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });

  await page.waitForTimeout(500);
  await takeScreenshot(page, {
    name: 'dashboard-offline',
  });
});
```

### Custom Loading Detection

```typescript
// If your app uses a custom loading flag
await page.waitForFunction(() => {
  return (window as any).__APP_LOADED__ === true;
}, { timeout: 10000 });
```

## Complete Example

Here's a complete test with all sync handling:

```typescript
import { test, gotoPage } from './fixtures/global-setup';
import { takeScreenshot } from './helpers/screenshot';
import {
  waitForAllLoadingComplete,
  waitForDataLoaded
} from './helpers/sync';

test.describe('Dashboard with Sync Handling', () => {
  test('shows loaded data', async ({ page }) => {
    // Navigate (includes automatic sync handling)
    await gotoPage(page, '/dashboard');

    // Extra specific wait for dashboard data
    await waitForDataLoaded(page, {
      dataSelector: '[data-testid="stat-card"]',
      minItems: 4, // Expect 4 stat cards
      timeout: 5000,
    });

    // Page is fully loaded, stable, and ready
    await takeScreenshot(page, {
      name: 'dashboard-fully-loaded',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('shows task list', async ({ page }) => {
    await gotoPage(page, '/tools/tasks');

    // Wait for tasks to load
    await waitForDataLoaded(page, {
      dataSelector: '[data-testid="task-item"]',
      minItems: 3, // At least 3 tasks from baseline
      timeout: 5000,
    });

    await takeScreenshot(page, {
      name: 'tasks-with-data',
      fullPage: true,
    });
  });
});
```

## Summary

**The global fixture handles everything automatically!**

For most tests, just use:
```typescript
import { test, gotoPage } from './fixtures/global-setup';

test('my test', async ({ page }) => {
  await gotoPage(page, '/my-page');
  // Everything is loaded and ready!
});
```

Only use manual sync utilities for:
- Tests without global fixture
- Custom loading scenarios
- Debugging loading issues
- Testing loading states themselves

## See Also

- [helpers/sync.ts](helpers/sync.ts) - Source code
- [fixtures/global-setup.ts](fixtures/global-setup.ts) - Global fixture
- [README.md](README.md) - Main testing guide
- [BASELINE_DATA_GUIDE.md](BASELINE_DATA_GUIDE.md) - Baseline data guide
