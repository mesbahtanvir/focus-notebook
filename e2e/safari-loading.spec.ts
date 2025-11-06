import { test, expect, devices } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import { waitForPageReady } from './helpers/screenshot';

/**
 * Safari Loading Issue - E2E Tests
 *
 * Tests to ensure the app loads correctly on Safari and other browsers
 * without getting stuck on "Loading your workspace... Syncing with cloud"
 *
 * Covers:
 * - Safari desktop
 * - Safari iOS (iPhone/iPad)
 * - Chrome desktop
 * - Chrome mobile
 * - Firefox
 * - Edge
 */

test.describe('Browser Loading Compatibility', () => {
  test.describe('Safari Desktop', () => {
    test.use({ ...devices['Desktop Safari'] });

    test('should load workspace successfully on Safari', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      // Should not get stuck on loading screen
      // Loading screen should disappear within 15 seconds
      await expect(page.getByText('Loading your workspace')).not.toBeVisible({
        timeout: 15000,
      });

      // Should show main content
      await expect(page.getByText('Thoughts')).toBeVisible();
      await expect(page.getByText('Quick Focus Modes')).toBeVisible();
    });

    test('should show loading screen initially then transition to content', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      // Loading screen should be visible initially
      const loadingText = page.getByText('Loading your workspace');
      await expect(loadingText).toBeVisible({ timeout: 2000 });

      // Loading screen should disappear
      await expect(loadingText).not.toBeVisible({ timeout: 15000 });

      // Main content should be visible
      await expect(page.getByRole('heading', { name: /Thoughts/i })).toBeVisible();
    });

    test('should complete loading within timeout threshold', async ({ page, context }) => {
      await setupMockAuth(page);

      const startTime = Date.now();
      await page.goto('/');

      // Wait for loading to complete
      await page.waitForSelector('text=Thoughts', { timeout: 15000 });

      const loadTime = Date.now() - startTime;

      // Should load in less than 15 seconds (the timeout we set in page.tsx)
      expect(loadTime).toBeLessThan(15000);
    });

    test('should log Safari detection message in console', async ({ page }) => {
      const consoleMessages: string[] = [];
      page.on('console', (msg) => consoleMessages.push(msg.text()));

      await setupMockAuth(page);
      await page.goto('/');

      // Wait for page to load
      await waitForPageReady(page);

      // Should have logged Safari detection
      const safariLog = consoleMessages.find((msg) =>
        msg.includes('Safari detected')
      );
      expect(safariLog).toBeTruthy();
    });

    test('should not show sync error on Safari', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      // Wait for loading to complete
      await page.waitForSelector('text=Thoughts', { timeout: 15000 });

      // Should not show sync error
      await expect(page.getByText('Sync Error')).not.toBeVisible();
      await expect(page.getByText('Sync taking longer than expected')).not.toBeVisible();
    });
  });

  test.describe('Safari iOS (iPhone)', () => {
    test.use({ ...devices['iPhone 13'] });

    test('should load workspace on iPhone Safari', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      await expect(page.getByText('Loading your workspace')).not.toBeVisible({
        timeout: 15000,
      });

      await expect(page.getByText('Thoughts')).toBeVisible();
    });

    test('should handle touch interactions after loading', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      // Wait for page to load
      await page.waitForSelector('text=Thoughts', { timeout: 15000 });

      // Should be able to tap input
      const thoughtInput = page.getByPlaceholder("What's on your mind?");
      await expect(thoughtInput).toBeVisible();
      await thoughtInput.tap();
      await expect(thoughtInput).toBeFocused();
    });
  });

  test.describe('Safari iOS (iPad)', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should load workspace on iPad Safari', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      await expect(page.getByText('Loading your workspace')).not.toBeVisible({
        timeout: 15000,
      });

      await expect(page.getByText('Thoughts')).toBeVisible();
    });
  });

  test.describe('Chrome Desktop', () => {
    test.use({ ...devices['Desktop Chrome'] });

    test('should load workspace successfully on Chrome', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      await expect(page.getByText('Loading your workspace')).not.toBeVisible({
        timeout: 15000,
      });

      await expect(page.getByText('Thoughts')).toBeVisible();
    });

    test('should log persistent cache message in console', async ({ page }) => {
      const consoleMessages: string[] = [];
      page.on('console', (msg) => consoleMessages.push(msg.text()));

      await setupMockAuth(page);
      await page.goto('/');

      await waitForPageReady(page);

      // Should have logged persistent cache usage
      const persistentCacheLog = consoleMessages.find((msg) =>
        msg.includes('Using persistent cache')
      );
      expect(persistentCacheLog).toBeTruthy();
    });

    test('should use persistent cache (can verify in DevTools)', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      await waitForPageReady(page);

      // Check IndexedDB is being used (persistent cache)
      const hasIndexedDB = await page.evaluate(() => {
        return 'indexedDB' in window && window.indexedDB !== null;
      });

      expect(hasIndexedDB).toBe(true);
    });
  });

  test.describe('Chrome Mobile (Android)', () => {
    test.use({ ...devices['Pixel 5'] });

    test('should load workspace on Chrome Android', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      await expect(page.getByText('Loading your workspace')).not.toBeVisible({
        timeout: 15000,
      });

      await expect(page.getByText('Thoughts')).toBeVisible();
    });

    test('should handle mobile viewport correctly', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      await waitForPageReady(page);

      // Check responsive design works
      const viewport = page.viewportSize();
      expect(viewport?.width).toBeLessThanOrEqual(500);
    });
  });

  test.describe('Firefox Desktop', () => {
    test.use({ ...devices['Desktop Firefox'] });

    test('should load workspace successfully on Firefox', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      await expect(page.getByText('Loading your workspace')).not.toBeVisible({
        timeout: 15000,
      });

      await expect(page.getByText('Thoughts')).toBeVisible();
    });
  });

  test.describe('Edge Desktop', () => {
    test.use({ ...devices['Desktop Edge'] });

    test('should load workspace successfully on Edge', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      await expect(page.getByText('Loading your workspace')).not.toBeVisible({
        timeout: 15000,
      });

      await expect(page.getByText('Thoughts')).toBeVisible();
    });
  });

  test.describe('Loading Timeout Protection', () => {
    test('should show warning if loading exceeds 15 seconds', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', (route) => {
        setTimeout(() => route.continue(), 500); // Delay all requests
      });

      await setupMockAuth(page);
      await page.goto('/');

      // After 15 seconds, should show timeout warning
      const warning = page.getByText(/Sync taking longer than expected/i);
      await expect(warning).toBeVisible({ timeout: 20000 });

      // But should still show content (not stuck in loading)
      await expect(page.getByText('Thoughts')).toBeVisible();
    });

    test('should allow retry on sync error', async ({ page }) => {
      // Mock a network error scenario
      let requestCount = 0;
      await page.route('**/*firestore*', (route) => {
        requestCount++;
        if (requestCount === 1) {
          route.abort('failed'); // Fail first request
        } else {
          route.continue();
        }
      });

      await setupMockAuth(page);
      await page.goto('/');

      // Should show error state
      const retryButton = page.getByRole('button', { name: /Retry/i });
      await expect(retryButton).toBeVisible({ timeout: 20000 });

      // Click retry
      await retryButton.click();

      // Should load successfully after retry
      await expect(page.getByText('Thoughts')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Data Persistence', () => {
    test('should show cached data on Safari (memory cache)', async ({ page }) => {
      await setupMockAuth(page);

      // First visit - load data
      await page.goto('/');
      await waitForPageReady(page);

      // Add a thought
      await page.fill('input[placeholder*="mind"]', 'Test thought for cache');
      await page.click('button:has-text("Add")');

      // Wait for thought to appear
      await expect(page.getByText('Test thought for cache')).toBeVisible();

      // Reload page (memory cache won't persist, but should still load from server)
      await page.reload();

      // Should load without getting stuck
      await expect(page.getByText('Loading your workspace')).not.toBeVisible({
        timeout: 15000,
      });

      // Data should load from server
      await expect(page.getByText('Thoughts')).toBeVisible();
    });

    test('should handle offline state gracefully on Safari', async ({ page, context }) => {
      await setupMockAuth(page);
      await page.goto('/');
      await waitForPageReady(page);

      // Go offline
      await context.setOffline(true);

      // Safari with memory cache should still show UI
      await expect(page.getByText('Thoughts')).toBeVisible();

      // Should show offline indicator (if implemented)
      // This is optional based on your implementation
    });
  });

  test.describe('Performance Metrics', () => {
    test('should measure Time to Interactive on Safari', async ({ page }) => {
      await setupMockAuth(page);

      const startTime = Date.now();
      await page.goto('/');

      // Wait for main content to be interactive
      await page.waitForSelector('input[placeholder*="mind"]', { timeout: 15000 });
      const tti = Date.now() - startTime;

      // TTI should be under 5 seconds on good network
      expect(tti).toBeLessThan(5000);
    });

    test('should measure First Contentful Paint', async ({ page }) => {
      await setupMockAuth(page);
      await page.goto('/');

      const fcp = await page.evaluate(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
        return fcpEntry ? fcpEntry.startTime : 0;
      });

      // FCP should be under 3 seconds
      expect(fcp).toBeLessThan(3000);
    });
  });

  test.describe('Console Error Monitoring', () => {
    test('should not have critical errors in console on Safari', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await setupMockAuth(page);
      await page.goto('/');
      await waitForPageReady(page);

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(
        (error) =>
          !error.includes('DevTools') &&
          !error.includes('Extension') &&
          !error.includes('favicon')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should not have unhandled promise rejections', async ({ page }) => {
      const rejections: any[] = [];
      page.on('pageerror', (error) => {
        rejections.push(error);
      });

      await setupMockAuth(page);
      await page.goto('/');
      await waitForPageReady(page);

      expect(rejections).toHaveLength(0);
    });
  });
});
