# Testing Guide - Safari Loading Fix

## Overview

This guide explains how to run the tests for the Safari loading fix and verify everything works correctly.

## Quick Start

```bash
# Run all tests
npm test

# Run specific test files
npm test -- browserDetection.test.ts
npm test -- firebaseClient.test.ts
npm test -- firestoreSubscriptionLoading.test.ts

# Run E2E tests
npm run test:screenshots -- safari-loading.spec.ts
```

## Test Structure

### Unit Tests

#### 1. Browser Detection Tests
**File:** `src/__tests__/lib/utils/browserDetection.test.ts`

Tests the browser detection utility:
- Safari detection (macOS, iOS, iPad)
- Non-Safari detection (Chrome, Firefox, Edge)
- Edge cases (SSR, empty user agent)
- Real-world user agents

```bash
npm test -- browserDetection.test.ts
```

**Expected Output:**
```
✓ isSafariBrowser › Safari Detection
  ✓ should detect Safari on macOS
  ✓ should detect Safari on iOS iPhone
  ✓ should detect Safari on iOS iPad
  ✓ should detect Safari 16 on macOS

✓ isSafariBrowser › Non-Safari Detection
  ✓ should NOT detect Safari for Chrome on macOS
  ✓ should NOT detect Safari for Chrome on Windows
  ✓ should NOT detect Safari for Chrome on Android
  ✓ should NOT detect Safari for Firefox
  ✓ should NOT detect Safari for Edge
  ✓ should NOT detect Safari for Samsung Internet

✓ isSafariBrowser › Edge Cases
  ✓ should return false in SSR environment
  ✓ should handle empty user agent

✓ getBrowserName
  ✓ should return "Safari" for Safari on macOS
  ✓ should return "Chrome" for Chrome
  ✓ should return "Firefox" for Firefox
  ✓ should return "Edge" for Edge
  ✓ should return "SSR" in server environment
  ✓ should return "Unknown" for unrecognized browser

✓ Real World User Agents (7 tests)

Test Suites: 1 passed
Tests: 20+ passed
```

#### 2. Firebase Client Tests
**File:** `src/__tests__/lib/firebase/firebaseClient.test.ts`

Tests Firebase initialization:
- Module exports (auth, db, functionsClient, providers)
- Cache strategy selection (Safari vs others)
- Error handling and fallbacks
- Console logging

```bash
npm test -- firebaseClient.test.ts
```

**Expected Output:**
```
✓ Module Exports
  ✓ should export auth instance
  ✓ should export db instance
  ✓ should export functionsClient instance
  ✓ should export googleProvider
  ✓ should export emailProvider
  ✓ should export default app

✓ Cache Strategy Selection
  ✓ should use memory cache when Safari is detected
  ✓ should use persistent cache when non-Safari browser is detected

✓ Error Handling
  ✓ should fallback to memory cache if Firestore initialization fails

✓ Firebase App Initialization
  ✓ should initialize Firebase app with correct config
  ✓ should reuse existing app if already initialized

✓ Google Provider Configuration
  ✓ should configure Google provider with select_account prompt

✓ Console Logging
  ✓ should log Safari detection for Safari browser
  ✓ should log persistent cache for non-Safari browser

Test Suites: 1 passed
Tests: 14 passed
```

### Integration Tests

#### 3. Firestore Subscription Loading Tests
**File:** `src/__tests__/integration/firestoreSubscriptionLoading.test.ts`

Tests subscription behavior:
- Loading state transitions
- Cache behavior (memory vs persistent)
- Error recovery
- Subscription lifecycle

```bash
npm test -- firestoreSubscriptionLoading.test.ts
```

**Expected Output:**
```
✓ Tasks Store Subscription
  ✓ should transition from loading to loaded when snapshot received
  ✓ should handle cached data correctly
  ✓ should handle subscription errors gracefully
  ✓ should not get stuck in loading state

✓ Thoughts Store Subscription
  ✓ should transition from loading to loaded when snapshot received
  ✓ should handle cached data from memory cache (Safari)

✓ Subscription Lifecycle
  ✓ should cleanup previous subscription when resubscribing
  ✓ should handle rapid resubscriptions

✓ Loading State Edge Cases
  ✓ should handle empty snapshots without hanging
  ✓ should handle pending writes correctly
  ✓ should handle network reconnection

Test Suites: 1 passed
Tests: 15+ passed
```

### E2E Tests

#### 4. Safari Loading E2E Tests
**File:** `e2e/safari-loading.spec.ts`

Tests real browsers:
- Safari Desktop, iOS (iPhone/iPad)
- Chrome Desktop, Android
- Firefox, Edge
- Performance metrics
- Error handling

```bash
# Run all E2E tests
npm run test:screenshots -- safari-loading.spec.ts

# Run on specific browser
npm run test:screenshots -- safari-loading.spec.ts --project="Desktop Safari"

# Run with UI (interactive mode)
npm run test:screenshots:ui -- safari-loading.spec.ts
```

**Expected Output:**
```
Running 25 tests using 7 workers

✓ Safari Desktop
  ✓ should load workspace successfully on Safari
  ✓ should show loading screen initially then transition to content
  ✓ should complete loading within timeout threshold
  ✓ should log Safari detection message in console
  ✓ should not show sync error on Safari

✓ Safari iOS (iPhone)
  ✓ should load workspace on iPhone Safari
  ✓ should handle touch interactions after loading

✓ Chrome Desktop
  ✓ should load workspace successfully on Chrome
  ✓ should log persistent cache message in console
  ✓ should use persistent cache

... (and more)

25 passed (45s)
```

## Test Scenarios

### Scenario 1: Safari Detection Works

**What to test:**
1. Browser detection identifies Safari correctly
2. Memory cache is used for Safari
3. Loading completes without hanging

**How to test:**
```bash
# Unit test
npm test -- browserDetection.test.ts

# E2E test
npm run test:screenshots -- safari-loading.spec.ts --project="Desktop Safari"
```

**Expected behavior:**
- ✅ isSafariBrowser() returns true for Safari user agents
- ✅ Console logs "Safari detected, using memory cache"
- ✅ Page loads within 15 seconds
- ✅ No "Loading your workspace" stuck state

### Scenario 2: Chrome Uses Persistent Cache

**What to test:**
1. Browser detection identifies Chrome correctly
2. Persistent cache is used for Chrome
3. Loading works optimally

**How to test:**
```bash
# Unit test
npm test -- browserDetection.test.ts

# E2E test
npm run test:screenshots -- safari-loading.spec.ts --project="Desktop Chrome"
```

**Expected behavior:**
- ✅ isSafariBrowser() returns false for Chrome
- ✅ Console logs "Chrome detected, using persistent cache"
- ✅ Page loads within 5 seconds
- ✅ IndexedDB is used for caching

### Scenario 3: Error Handling Works

**What to test:**
1. Fallback to memory cache on errors
2. Timeout protection (15s)
3. Retry functionality

**How to test:**
```bash
# Unit test (error fallback)
npm test -- firebaseClient.test.ts

# E2E test (timeout and retry)
npm run test:screenshots -- safari-loading.spec.ts --grep="timeout|retry"
```

**Expected behavior:**
- ✅ Falls back to memory cache if persistent cache fails
- ✅ Shows warning after 15 seconds
- ✅ Retry button appears on errors
- ✅ Page never stays stuck in loading forever

## Troubleshooting

### Tests Fail to Run

**Problem:** `sh: 1: jest: not found`

**Solution:** Use npm scripts instead of direct jest command:
```bash
# ✅ Correct
npm test -- browserDetection.test.ts

# ❌ Wrong
jest browserDetection.test.ts
```

### Tests Pass But Browser Still Hangs

**Problem:** Tests pass but Safari still shows loading screen

**Solution:**
1. Clear browser cache and cookies
2. Check browser console for errors
3. Verify the fix is deployed:
   ```bash
   # Check if browserDetection.ts exists
   ls src/lib/utils/browserDetection.ts

   # Check if firebaseClient imports it
   grep "browserDetection" src/lib/firebaseClient.ts
   ```
4. Rebuild the app:
   ```bash
   npm run build
   npm start
   ```

### E2E Tests Timeout

**Problem:** E2E tests exceed timeout

**Solution:**
1. Ensure dev server is running:
   ```bash
   npm run dev
   ```
2. Check Firebase emulators (if using):
   ```bash
   firebase emulators:start
   ```
3. Increase timeout in playwright.config.ts:
   ```typescript
   timeout: 60 * 1000, // 60 seconds
   ```

### Tests Pass Locally But Fail in CI

**Problem:** Tests pass on your machine but fail in CI

**Solution:**
1. Check if all dependencies are installed in CI
2. Verify environment variables are set
3. Ensure Firebase emulators are running in CI
4. Check browser availability in CI (Safari requires macOS)

## CI/CD Integration

### GitHub Actions

Add to your workflow:

```yaml
- name: Run Unit Tests
  run: npm test

- name: Run E2E Tests
  run: npm run test:screenshots
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm test -- --bail --findRelatedTests
```

## Coverage Report

Generate coverage report:

```bash
npm test -- --coverage
```

**Expected coverage:**
- **browserDetection.ts:** 100%
- **firebaseClient.ts:** 95%+
- **Overall:** 90%+

Coverage report will be in `coverage/lcov-report/index.html`

## Performance Benchmarks

Run performance tests:

```bash
npm run test:screenshots -- safari-loading.spec.ts --grep="Performance"
```

**Expected metrics:**
- **Time to Interactive (TTI):** < 5s
- **First Contentful Paint (FCP):** < 3s
- **Total Load Time:** < 15s

## Best Practices

### Writing New Tests

1. **Follow naming convention:**
   ```typescript
   test('should [expected behavior] when [condition]', () => {
     // ...
   });
   ```

2. **Use descriptive test names:**
   - ✅ `should detect Safari on iOS and use memory cache`
   - ❌ `safari test`

3. **Test one thing per test:**
   - Each test should verify a single behavior

4. **Use appropriate timeouts:**
   - Unit: 5s (default)
   - Integration: 5s
   - E2E: 15s for loading

### Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run specific test
npm test -- -t "should detect Safari on macOS"

# Run in watch mode
npm test -- --watch

# E2E with UI
npm run test:screenshots:ui

# E2E with debug
npm run test:screenshots:debug
```

## Summary

- ✅ **Unit Tests:** Test browser detection and Firebase initialization
- ✅ **Integration Tests:** Test subscription loading behavior
- ✅ **E2E Tests:** Test real browsers across platforms
- ✅ **80+ Test Cases:** Comprehensive coverage
- ✅ **Performance Metrics:** TTI, FCP monitoring
- ✅ **Error Handling:** Timeout protection and retry

For more details, see:
- [Unit Test README](src/__tests__/lib/firebase/README.md)
- [E2E Test README](e2e/README-SAFARI-TESTS.md)
- [Test Summary](SAFARI-FIX-TEST-SUMMARY.md)
