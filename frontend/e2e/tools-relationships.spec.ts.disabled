import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import {
  takeScreenshot,
  waitForPageReady,
  hideDynamicElements,
  mockDateTime,
} from './helpers/screenshot';

/**
 * Relationships & Social Features - Screenshot Tests
 *
 * Tests for:
 * - Friends tracking
 * - Relationships management
 */

interface MockFriend {
  id: string;
  name: string;
  email?: string;
  lastContact?: string;
  notes?: string;
  userId: string;
  createdAt: number;
}

interface MockRelationship {
  id: string;
  name: string;
  type: 'friend' | 'family' | 'partner' | 'colleague';
  notes?: string;
  userId: string;
  createdAt: number;
}

function generateMockFriends(count: number = 5, userId: string = 'test-user-123'): MockFriend[] {
  const now = Date.now();
  const friends: MockFriend[] = [];
  const names = ['Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Emma Davis'];

  for (let i = 0; i < count; i++) {
    friends.push({
      id: `friend-${i + 1}`,
      name: names[i % names.length],
      email: `${names[i % names.length].toLowerCase().replace(' ', '.')}@example.com`,
      lastContact: new Date(now - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: `Notes about ${names[i % names.length]}`,
      userId,
      createdAt: now - (count - i) * 30 * 24 * 60 * 60 * 1000,
    });
  }

  return friends;
}

function generateMockRelationships(count: number = 5, userId: string = 'test-user-123'): MockRelationship[] {
  const now = Date.now();
  const relationships: MockRelationship[] = [];
  const names = ['Sarah Miller', 'John Wilson', 'Lisa Anderson', 'Mike Taylor', 'Kate Moore'];
  const types: Array<'friend' | 'family' | 'partner' | 'colleague'> = ['friend', 'family', 'partner', 'colleague', 'friend'];

  for (let i = 0; i < count; i++) {
    relationships.push({
      id: `relationship-${i + 1}`,
      name: names[i % names.length],
      type: types[i % types.length],
      notes: `Relationship notes for ${names[i % names.length]}`,
      userId,
      createdAt: now - (count - i) * 30 * 24 * 60 * 60 * 1000,
    });
  }

  return relationships;
}

test.describe('Friends Tracking Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('friends page - list view', async ({ page }) => {
    const friends = generateMockFriends(8);
    await page.addInitScript((mockFriends) => {
      localStorage.setItem('mockFriends', JSON.stringify(mockFriends));
    }, friends);

    await page.goto('/tools/friends');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'friends-list-view',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="last-contact"]'],
    });
  });

  test('friends page - empty state', async ({ page }) => {
    await page.goto('/tools/friends');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'friends-empty-state',
      fullPage: true,
    });
  });

  test('friends page - grid view', async ({ page }) => {
    const friends = generateMockFriends(6);
    await page.addInitScript((mockFriends) => {
      localStorage.setItem('mockFriends', JSON.stringify(mockFriends));
    }, friends);

    await page.goto('/tools/friends');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to switch to grid view if toggle exists
    const gridToggle = page.locator('[data-testid="view-grid"], button:has-text("Grid")').first();
    if (await gridToggle.count() > 0) {
      await gridToggle.click();
      await page.waitForTimeout(300);
    }

    await takeScreenshot(page, {
      name: 'friends-grid-view',
      fullPage: true,
      mask: ['[data-testid="last-contact"]'],
    });
  });

  test('friends page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const friends = generateMockFriends(5);
    await page.addInitScript((mockFriends) => {
      localStorage.setItem('mockFriends', JSON.stringify(mockFriends));
    }, friends);

    await page.goto('/tools/friends');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'friends-mobile',
      fullPage: true,
      mask: ['[data-testid="last-contact"]'],
    });
  });

  test('friend detail page', async ({ page }) => {
    const friends = generateMockFriends(3);
    await page.addInitScript((mockFriends) => {
      localStorage.setItem('mockFriends', JSON.stringify(mockFriends));
    }, friends);

    await page.goto('/tools/friends/friend-1');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'friend-detail-page',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="last-contact"]'],
    });
  });

  test('friend detail page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const friends = generateMockFriends(2);
    await page.addInitScript((mockFriends) => {
      localStorage.setItem('mockFriends', JSON.stringify(mockFriends));
    }, friends);

    await page.goto('/tools/friends/friend-1');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'friend-detail-mobile',
      fullPage: true,
      mask: ['[data-testid="last-contact"]'],
    });
  });
});

test.describe('Relationships Management Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('relationships page - list view', async ({ page }) => {
    const relationships = generateMockRelationships(8);
    await page.addInitScript((mockRelationships) => {
      localStorage.setItem('mockRelationships', JSON.stringify(mockRelationships));
    }, relationships);

    await page.goto('/tools/relationships');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'relationships-list-view',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('relationships page - empty state', async ({ page }) => {
    await page.goto('/tools/relationships');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'relationships-empty-state',
      fullPage: true,
    });
  });

  test('relationships page - filtered by type', async ({ page }) => {
    const relationships = generateMockRelationships(10);
    await page.addInitScript((mockRelationships) => {
      localStorage.setItem('mockRelationships', JSON.stringify(mockRelationships));
    }, relationships);

    await page.goto('/tools/relationships');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to filter by type
    const typeFilter = page.locator('[data-testid="filter-type"], select, button:has-text("Type")').first();
    if (await typeFilter.count() > 0) {
      await typeFilter.click();
      await page.waitForTimeout(300);
    }

    await takeScreenshot(page, {
      name: 'relationships-filtered',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('relationships page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const relationships = generateMockRelationships(5);
    await page.addInitScript((mockRelationships) => {
      localStorage.setItem('mockRelationships', JSON.stringify(mockRelationships));
    }, relationships);

    await page.goto('/tools/relationships');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'relationships-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('relationship detail page', async ({ page }) => {
    const relationships = generateMockRelationships(3);
    await page.addInitScript((mockRelationships) => {
      localStorage.setItem('mockRelationships', JSON.stringify(mockRelationships));
    }, relationships);

    await page.goto('/tools/relationships/relationship-1');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'relationship-detail-page',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('relationship detail page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const relationships = generateMockRelationships(2);
    await page.addInitScript((mockRelationships) => {
      localStorage.setItem('mockRelationships', JSON.stringify(mockRelationships));
    }, relationships);

    await page.goto('/tools/relationships/relationship-1');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'relationship-detail-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});
