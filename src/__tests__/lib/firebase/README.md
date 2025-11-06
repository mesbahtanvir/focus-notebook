# Firebase Client Tests

## Overview

This directory contains tests for Firebase client initialization with browser-specific cache strategies, particularly addressing Safari compatibility issues.

## Test Files

### `firebaseClient.test.ts`

Unit tests for Firebase client initialization and browser detection.

#### Test Coverage

1. **Safari Detection**
   - Detects Safari on macOS, iOS, and iPadOS
   - Correctly identifies Chrome, Firefox, Edge (not Safari)
   - Handles various user agent strings

2. **Cache Strategy Selection**
   - Safari: Uses `memoryLocalCache()` for compatibility
   - Other browsers: Uses `persistentLocalCache()` with multi-tab support
   - Proper fallback when cache initialization fails

3. **Error Handling**
   - Graceful fallback to memory cache on errors
   - Handles SSR environment (window undefined)
   - Proper error logging

4. **Browser-Specific User Agents**
   Tests against real-world user agent strings:
   - Safari 17 macOS
   - Safari 16/17 iOS (iPhone/iPad)
   - Chrome 120 Desktop & Mobile
   - Firefox 120
   - Edge 120
   - Samsung Internet

## Running Tests

```bash
# Run all Firebase tests
npm test -- firebase

# Run specific test file
npm test -- firebaseClient.test.ts

# Run with coverage
npm test -- --coverage firebaseClient.test.ts

# Run in watch mode
npm test -- --watch firebaseClient.test.ts
```

## Why These Tests Matter

### The Safari Problem

Safari has known compatibility issues with Firebase's `persistentLocalCache` API:
- Stricter IndexedDB implementation
- Intelligent Tracking Prevention (ITP) affecting storage
- Persistent cache can cause subscriptions to hang

These issues cause the app to get stuck on "Loading your workspace... Syncing with cloud" indefinitely.

### The Solution

Our implementation:
1. Detects Safari using user agent
2. Uses `memoryLocalCache()` for Safari (compatible but doesn't persist across tabs)
3. Uses `persistentLocalCache()` for other browsers (optimal performance)
4. Falls back to memory cache if persistent cache fails

### Trade-offs

**Safari:**
- ✅ Works reliably
- ✅ No loading issues
- ⚠️ Data doesn't persist when tab is closed
- ⚠️ Requires network for each new tab

**Other Browsers:**
- ✅ Offline support
- ✅ Data persists across tabs
- ✅ Faster loads from cache
- ✅ Better performance

## Test Scenarios

### 1. Browser Detection
```typescript
test('should detect Safari on macOS', () => {
  mockUserAgent('Mozilla/5.0 (Macintosh; ...) Safari/605.1.15');
  // Should use memory cache
});
```

### 2. Cache Strategy
```typescript
test('should use memory cache for Safari', () => {
  // Verifies memoryLocalCache() is called
});

test('should use persistent cache for Chrome', () => {
  // Verifies persistentLocalCache() is called
});
```

### 3. Error Handling
```typescript
test('should fallback to memory cache on error', () => {
  // Simulates initialization failure
  // Verifies fallback behavior
});
```

## Adding New Test Cases

When adding new browser support:

1. Add user agent string to test cases
2. Verify cache strategy selection
3. Test error handling
4. Document trade-offs

Example:
```typescript
test('should handle [Browser Name]', () => {
  mockUserAgent('[User Agent String]');
  jest.isolateModules(() => {
    require('@/lib/firebaseClient');
  });
  expect([expected cache type]).toHaveBeenCalled();
});
```

## Related Tests

- `src/__tests__/integration/firestoreSubscriptionLoading.test.ts` - Tests subscription behavior
- `e2e/safari-loading.spec.ts` - End-to-end browser compatibility tests

## References

- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Safari Known Issues](https://github.com/firebase/firebase-js-sdk/issues)
- [Persistent Cache API](https://firebase.google.com/docs/firestore/manage-data/enable-offline#configure_cache_size)
