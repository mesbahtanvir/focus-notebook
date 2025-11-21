import { Page } from '@playwright/test';

/**
 * Cloud Sync Helpers
 *
 * Utilities for handling Firebase sync states and loading indicators
 * in screenshot tests. These ensure tests wait for data to be fully
 * loaded before taking screenshots.
 */

/**
 * Wait for Firebase to be initialized and ready
 */
export async function waitForFirebaseReady(page: Page, timeout: number = 10000) {
  await page.waitForFunction(
    () => {
      // Check if Firebase is initialized
      const firebase = (window as any).firebase;
      if (!firebase) return false;

      // Check if auth is ready
      const auth = firebase.auth?.();
      if (!auth) return false;

      return true;
    },
    { timeout }
  );
}

/**
 * Wait for sync indicators to disappear
 * Looks for common loading/syncing UI elements
 */
export async function waitForSyncComplete(page: Page, timeout: number = 15000) {
  try {
    // Wait for any sync indicators to disappear
    await page.waitForSelector(
      '[data-testid="syncing"], [data-testid="loading"], .syncing, .loading, [aria-label*="Syncing"], [aria-label*="Loading"]',
      { state: 'hidden', timeout: 5000 }
    );
  } catch (e) {
    // If no sync indicators found, that's fine - continue
  }

  // Wait for network idle to ensure all API calls complete
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    // Network might not go idle, continue anyway
  }

  // Additional wait for any pending renders
  await page.waitForTimeout(500);
}

/**
 * Wait for specific data to be loaded
 * Useful when you know what data should appear
 */
export async function waitForDataLoaded(
  page: Page,
  options: {
    /**
     * Selector that should be visible when data is loaded
     */
    dataSelector?: string;
    /**
     * Text content that should appear
     */
    expectedText?: string;
    /**
     * Minimum number of items that should be present
     */
    minItems?: number;
    /**
     * Maximum time to wait in ms
     */
    timeout?: number;
  } = {}
) {
  const { dataSelector, expectedText, minItems, timeout = 10000 } = options;

  if (dataSelector) {
    await page.waitForSelector(dataSelector, { state: 'visible', timeout });
  }

  if (expectedText) {
    await page.waitForFunction(
      (text) => document.body.textContent?.includes(text),
      expectedText,
      { timeout }
    );
  }

  if (minItems && dataSelector) {
    await page.waitForFunction(
      ({ selector, count }) => {
        const elements = document.querySelectorAll(selector);
        return elements.length >= count;
      },
      { selector: dataSelector, count: minItems },
      { timeout }
    );
  }
}

/**
 * Mock Firebase to prevent real network calls
 * This makes tests faster and more reliable
 */
export async function mockFirebase(page: Page) {
  await page.addInitScript(() => {
    // Flag that Firebase should be mocked
    (window as any).__MOCK_FIREBASE__ = true;

    // Mock Firebase initialization
    const mockFirebase = {
      apps: [],
      initializeApp: () => mockFirebase,
      auth: () => ({
        currentUser: null,
        onAuthStateChanged: (callback: Function) => {
          // Call with mock user if set
          const mockUser = localStorage.getItem('mockAuthUser');
          if (mockUser) {
            callback(JSON.parse(mockUser));
          } else {
            callback(null);
          }
          return () => {}; // Unsubscribe function
        },
        signInWithEmailAndPassword: async () => ({}),
        signOut: async () => {},
      }),
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => null }),
            set: async () => {},
            update: async () => {},
            delete: async () => {},
            onSnapshot: (callback: Function) => {
              callback({ exists: false, data: () => null });
              return () => {}; // Unsubscribe
            },
          }),
          where: () => ({
            get: async () => ({ empty: true, docs: [] }),
            onSnapshot: (callback: Function) => {
              callback({ empty: true, docs: [] });
              return () => {};
            },
          }),
          orderBy: () => ({
            get: async () => ({ empty: true, docs: [] }),
            limit: () => ({
              get: async () => ({ empty: true, docs: [] }),
            }),
          }),
          get: async () => ({ empty: true, docs: [] }),
          onSnapshot: (callback: Function) => {
            callback({ empty: true, docs: [] });
            return () => {};
          },
        }),
      }),
    };

    // Override Firebase
    (window as any).firebase = mockFirebase;
  });
}

/**
 * Disable offline mode indicators
 * Prevents "You are offline" banners from appearing
 */
export async function disableOfflineIndicators(page: Page) {
  await page.addInitScript(() => {
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: false,
    });

    // Prevent offline event listeners
    window.addEventListener = new Proxy(window.addEventListener, {
      apply(target, thisArg, args) {
        const [event] = args;
        if (event === 'offline' || event === 'online') {
          return; // Ignore offline/online listeners
        }
        return Reflect.apply(target, thisArg, args);
      },
    });
  });
}

/**
 * Wait for skeleton loaders to disappear
 * Many apps show skeleton screens while loading
 */
export async function waitForSkeletonsGone(page: Page, timeout: number = 10000) {
  try {
    await page.waitForSelector(
      '.skeleton, [data-testid="skeleton"], .skeleton-loader, [class*="skeleton"]',
      { state: 'hidden', timeout }
    );
  } catch (e) {
    // No skeletons found or they didn't disappear in time
    // Continue anyway
  }
}

/**
 * Wait for spinners to disappear
 */
export async function waitForSpinnersGone(page: Page, timeout: number = 10000) {
  try {
    await page.waitForSelector(
      '.spinner, [data-testid="spinner"], [role="progressbar"], .loading-spinner',
      { state: 'hidden', timeout }
    );
  } catch (e) {
    // No spinners found - continue
  }
}

/**
 * Comprehensive wait for all loading indicators
 * Use this as a catch-all before taking screenshots
 */
export async function waitForAllLoadingComplete(page: Page, timeout: number = 15000) {
  const startTime = Date.now();

  // Wait for network idle
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (e) {
    // Continue if network doesn't idle
  }

  // Wait for sync indicators
  await waitForSyncComplete(page, timeout);

  // Wait for skeletons
  await waitForSkeletonsGone(page, 3000);

  // Wait for spinners
  await waitForSpinnersGone(page, 3000);

  // Wait for Firebase ready (if using Firebase)
  try {
    await waitForFirebaseReady(page, 3000);
  } catch (e) {
    // Firebase might not be present, continue
  }

  // Final wait for any pending renders
  await page.waitForTimeout(500);

  const elapsed = Date.now() - startTime;
  console.log(`⏱️  Waited ${elapsed}ms for loading to complete`);
}

/**
 * Check if page is still loading
 * Useful for conditional waits
 */
export async function isPageLoading(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    // Check for common loading indicators
    const hasLoadingIndicator =
      document.querySelector('.loading') ||
      document.querySelector('[data-testid="loading"]') ||
      document.querySelector('.syncing') ||
      document.querySelector('[data-testid="syncing"]') ||
      document.querySelector('.skeleton') ||
      document.querySelector('[role="progressbar"]');

    return !!hasLoadingIndicator;
  });
}

/**
 * Force sync completion by setting flags
 * Use this when mock data is loaded to signal sync is "complete"
 */
export async function markSyncComplete(page: Page) {
  await page.evaluate(() => {
    // Set flags that the app might check
    (window as any).__SYNC_COMPLETE__ = true;
    (window as any).__DATA_LOADED__ = true;

    // Dispatch custom event that app might listen for
    window.dispatchEvent(new CustomEvent('syncComplete'));
    window.dispatchEvent(new CustomEvent('dataLoaded'));
  });
}

/**
 * Disable real-time sync updates
 * Prevents Firebase listeners from triggering during tests
 */
export async function disableRealtimeSync(page: Page) {
  await page.addInitScript(() => {
    // Flag to disable real-time listeners
    (window as any).__DISABLE_REALTIME_SYNC__ = true;

    // Override Firestore onSnapshot to prevent real-time updates
    if ((window as any).firebase?.firestore) {
      const originalFirestore = (window as any).firebase.firestore;
      (window as any).firebase.firestore = () => {
        const db = originalFirestore();
        const originalCollection = db.collection;

        db.collection = (path: string) => {
          const collection = originalCollection.call(db, path);
          const originalOnSnapshot = collection.onSnapshot;

          // Override onSnapshot to not trigger real-time updates
          collection.onSnapshot = (callback: Function) => {
            // Call once with empty data
            callback({ empty: true, docs: [] });
            // Return unsubscribe function
            return () => {};
          };

          return collection;
        };

        return db;
      };
    }
  });
}
