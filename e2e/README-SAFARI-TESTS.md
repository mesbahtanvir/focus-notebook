# Safari Loading Issue - E2E Tests

## Overview

These E2E tests verify that the Safari loading fix works correctly across all major browsers and devices.

## Test File

`safari-loading.spec.ts` - Comprehensive browser compatibility tests for the loading issue fix

## What We're Testing

### The Problem
Safari had issues with Firebase's `persistentLocalCache` that caused the app to hang on:
```
Loading your workspace...
Syncing with cloud
```

### The Fix
We detect Safari and use `memoryLocalCache()` instead of `persistentLocalCache()`.

### What These Tests Verify
1. **Safari works** - No infinite loading
2. **Other browsers work** - Still use optimal persistent cache
3. **Loading transitions** - Proper loading → content flow
4. **Error handling** - Timeouts and retries work
5. **Performance** - Loads within acceptable time

## Browser Coverage

### Desktop Browsers
- ✅ Safari (macOS)
- ✅ Chrome (Windows/macOS/Linux)
- ✅ Firefox
- ✅ Edge

### Mobile Browsers
- ✅ Safari iOS (iPhone)
- ✅ Safari iOS (iPad)
- ✅ Chrome Android

## Running the Tests

### Run all Safari loading tests
```bash
npm run test:screenshots -- safari-loading.spec.ts
```

### Run on specific browser
```bash
# Safari only
npm run test:screenshots -- safari-loading.spec.ts --project="Desktop Safari"

# iPhone only
npm run test:screenshots -- safari-loading.spec.ts --project="Mobile"

# Chrome only
npm run test:screenshots -- safari-loading.spec.ts --project="Desktop Chrome"
```

### Run with UI (interactive mode)
```bash
npm run test:screenshots:ui -- safari-loading.spec.ts
```

### Debug mode
```bash
npm run test:screenshots:debug -- safari-loading.spec.ts
```

### Run all browsers in parallel
```bash
npm run test:screenshots -- safari-loading.spec.ts
```

## Test Suites

### 1. Safari Desktop
```typescript
test('should load workspace successfully on Safari')
test('should show loading screen initially then transition to content')
test('should complete loading within timeout threshold')
test('should log Safari detection message in console')
test('should not show sync error on Safari')
```

**What it tests:**
- Safari loads without hanging
- Loading screen appears and disappears properly
- Console shows "Safari detected, using memory cache"
- No error messages appear

### 2. Safari iOS (iPhone)
```typescript
test('should load workspace on iPhone Safari')
test('should handle touch interactions after loading')
```

**What it tests:**
- Mobile Safari loads correctly
- Touch interactions work after loading

### 3. Safari iOS (iPad)
```typescript
test('should load workspace on iPad Safari')
```

**What it tests:**
- iPad Safari loads correctly
- Tablet viewport works

### 4. Chrome Desktop
```typescript
test('should load workspace successfully on Chrome')
test('should log persistent cache message in console')
test('should use persistent cache (can verify in DevTools)')
```

**What it tests:**
- Chrome still uses persistent cache
- Console shows "Using persistent cache with multi-tab support"
- IndexedDB is available and used

### 5. Chrome Mobile (Android)
```typescript
test('should load workspace on Chrome Android')
test('should handle mobile viewport correctly')
```

**What it tests:**
- Mobile Chrome loads correctly
- Responsive design works

### 6. Firefox Desktop
```typescript
test('should load workspace successfully on Firefox')
```

### 7. Edge Desktop
```typescript
test('should load workspace successfully on Edge')
```

### 8. Loading Timeout Protection
```typescript
test('should show warning if loading exceeds 15 seconds')
test('should allow retry on sync error')
```

**What it tests:**
- Timeout protection works (15s limit)
- Warning message appears if loading is slow
- Retry button works on errors

### 9. Data Persistence
```typescript
test('should show cached data on Safari (memory cache)')
test('should handle offline state gracefully on Safari')
```

**What it tests:**
- Memory cache behavior on Safari
- Offline handling

### 10. Performance Metrics
```typescript
test('should measure Time to Interactive on Safari')
test('should measure First Contentful Paint')
```

**What it tests:**
- TTI < 5 seconds
- FCP < 3 seconds

### 11. Console Error Monitoring
```typescript
test('should not have critical errors in console on Safari')
test('should not have unhandled promise rejections')
```

**What it tests:**
- No JavaScript errors in console
- No unhandled promise rejections

## Expected Results

### Safari
- ✅ Loads within 5-15 seconds
- ✅ Shows loading screen briefly
- ✅ Transitions to main content
- ✅ Console: "Safari detected, using memory cache"
- ✅ No errors or warnings
- ⚠️ Data doesn't persist across tab reloads

### Chrome/Firefox/Edge
- ✅ Loads within 3-5 seconds
- ✅ Shows loading screen briefly
- ✅ Transitions to main content
- ✅ Console: "Using persistent cache with multi-tab support"
- ✅ No errors or warnings
- ✅ Data persists across tab reloads

## Troubleshooting

### Test Failures

**"Loading your workspace" never disappears**
- The fix might not be working
- Check browser detection logic
- Verify cache initialization

**Test times out**
- Network might be slow
- Firebase emulator might not be running
- Check if baseURL is correct

**Console errors appear**
- Check if Firebase config is correct
- Verify environment variables are set
- Check for network issues

### Running Locally

1. **Start Firebase emulators** (if using emulators)
   ```bash
   firebase emulators:start
   ```

2. **Start dev server**
   ```bash
   npm run dev
   ```

3. **Run tests**
   ```bash
   npm run test:screenshots -- safari-loading.spec.ts
   ```

### CI/CD Integration

Tests automatically run on:
- Pull requests
- Main branch commits
- Release builds

Browsers tested in CI:
- Desktop Chrome (primary)
- Desktop Safari (Safari fix validation)
- Mobile (iPhone 13)

## Debugging Tips

### View test in browser
```bash
npm run test:screenshots:ui
```
Then select a test and click "Pick Locator" to debug selectors.

### Slow motion
Add to test:
```typescript
test.use({ launchOptions: { slowMo: 1000 } });
```

### Take screenshots
```typescript
await page.screenshot({ path: 'debug.png' });
```

### Console logs
```typescript
page.on('console', msg => console.log(msg.text()));
```

### Network traffic
```typescript
page.on('request', request => console.log(request.url()));
page.on('response', response => console.log(response.status()));
```

## Metrics to Watch

### Performance Thresholds
- **FCP (First Contentful Paint):** < 3s
- **TTI (Time to Interactive):** < 5s
- **Total Load Time:** < 15s

### Success Criteria
- ✅ 100% pass rate on all browsers
- ✅ No console errors
- ✅ No infinite loading states
- ✅ Proper cache strategy per browser

## Related Documentation

- [Firebase Client Tests](../src/__tests__/lib/firebase/README.md) - Unit tests
- [Integration Tests](../src/__tests__/integration/firestoreSubscriptionLoading.test.ts) - Subscription tests
- [Playwright Config](../playwright.config.ts) - Browser configurations

## Contributing

When adding new tests:

1. **Follow naming convention:**
   ```typescript
   test('should [expected behavior] on [browser]')
   ```

2. **Use helpers:**
   ```typescript
   import { setupMockAuth, waitForPageReady } from './helpers/auth';
   ```

3. **Add timeout context:**
   ```typescript
   await expect(element).toBeVisible({ timeout: 15000 });
   ```

4. **Document what you're testing:**
   ```typescript
   // Test that Safari loads without hanging on loading screen
   test('should load workspace successfully on Safari', async ({ page }) => {
     // ...
   });
   ```

## Support

For issues or questions:
- Check test output for specific error messages
- Review browser console in Playwright UI
- Check if issue is browser-specific
- Verify Firebase connection is working

## Version History

- **v1.0** - Initial Safari loading fix tests
  - Safari detection and memory cache verification
  - Chrome persistent cache verification
  - Cross-browser loading tests
  - Performance metrics
  - Error handling and timeout protection
