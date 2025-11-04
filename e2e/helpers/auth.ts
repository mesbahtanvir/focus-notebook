import { Page } from '@playwright/test';

/**
 * Authentication helpers for screenshot tests
 *
 * These helpers manage authentication state for visual regression testing.
 * They use local storage to simulate Firebase authentication without
 * requiring actual network requests.
 */

export interface MockUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

/**
 * Set up a mock authenticated user session
 * This bypasses Firebase Auth for faster, more reliable screenshot tests
 */
export async function setupMockAuth(page: Page, user?: Partial<MockUser>) {
  const defaultUser: MockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: undefined,
    ...user,
  };

  // Mock Firebase Auth state in localStorage
  await page.addInitScript((mockUser) => {
    // Set mock auth state
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));

    // Mock Firebase Auth methods
    (window as any).__MOCK_AUTH__ = true;
  }, defaultUser);
}

/**
 * Navigate to a page with authentication
 */
export async function gotoAuthenticated(page: Page, url: string, user?: Partial<MockUser>) {
  await setupMockAuth(page, user);
  await page.goto(url);
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Wait for authentication to be ready
 */
export async function waitForAuthReady(page: Page) {
  await page.waitForFunction(() => {
    return (window as any).__AUTH_READY__ === true;
  }, { timeout: 5000 });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!localStorage.getItem('mockAuthUser');
  });
}
