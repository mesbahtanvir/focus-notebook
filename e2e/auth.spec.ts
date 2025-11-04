import { test, expect } from '@playwright/test';
import { setupMockAuth, clearAuth } from './helpers/auth';
import { takeScreenshot, waitForPageReady, hideDynamicElements, mockDateTime } from './helpers/screenshot';

/**
 * Authentication Pages - Screenshot Tests
 *
 * Tests for:
 * - Login page (various states)
 * - Profile page (authenticated)
 * - Settings page (authenticated)
 */

test.describe('Authentication Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Mock consistent date/time for screenshots
    await mockDateTime(page);
  });

  test('login page - initial state', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/login');
    await waitForPageReady(page);
    await hideDynamicElements(page);

    await takeScreenshot(page, {
      name: 'auth-login-initial',
      fullPage: true,
    });
  });

  test('login page - with email entered', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/login');
    await waitForPageReady(page);

    // Fill in email field
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill('test@example.com');
    }

    await hideDynamicElements(page);

    await takeScreenshot(page, {
      name: 'auth-login-email-entered',
      fullPage: true,
    });
  });

  test('login page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await clearAuth(page);
    await page.goto('/login');
    await waitForPageReady(page);
    await hideDynamicElements(page);

    await takeScreenshot(page, {
      name: 'auth-login-mobile',
      fullPage: true,
    });
  });

  test('login page - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await clearAuth(page);
    await page.goto('/login');
    await waitForPageReady(page);
    await hideDynamicElements(page);

    await takeScreenshot(page, {
      name: 'auth-login-tablet',
      fullPage: true,
    });
  });

  test('profile page - authenticated user', async ({ page }) => {
    await setupMockAuth(page, {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    });

    await page.goto('/profile');
    await waitForPageReady(page);
    await hideDynamicElements(page);

    // Wait for profile content to load
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'auth-profile-authenticated',
      fullPage: true,
    });
  });

  test('profile page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMockAuth(page, {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    });

    await page.goto('/profile');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'auth-profile-mobile',
      fullPage: true,
    });
  });

  test('settings page - authenticated user', async ({ page }) => {
    await setupMockAuth(page, {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    });

    await page.goto('/settings');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'auth-settings-page',
      fullPage: true,
    });
  });

  test('settings page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMockAuth(page, {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    });

    await page.goto('/settings');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'auth-settings-mobile',
      fullPage: true,
    });
  });
});
