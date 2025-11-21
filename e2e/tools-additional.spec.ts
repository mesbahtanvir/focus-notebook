import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import {
  takeScreenshot,
  waitForPageReady,
  hideDynamicElements,
  mockDateTime,
} from './helpers/screenshot';

/**
 * Additional Tools - Screenshot Tests
 *
 * Tests for:
 * - CBT (Cognitive Behavioral Therapy) tool
 * - Deep Reflection tool
 * - Notes tool
 * - Mood Tracker
 * - Errands
 * - Packing List
 * - Tools marketplace
 * - LLM Logs
 */

test.describe('CBT Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('cbt page - initial state', async ({ page }) => {
    await page.goto('/tools/cbt');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'cbt-initial',
      fullPage: true,
    });
  });

  test('cbt page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/cbt');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'cbt-mobile',
      fullPage: true,
    });
  });
});

test.describe('Deep Reflection Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('deep reflect page - initial state', async ({ page }) => {
    await page.goto('/tools/deepreflect');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'deepreflect-initial',
      fullPage: true,
    });
  });

  test('deep reflect page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/deepreflect');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'deepreflect-mobile',
      fullPage: true,
    });
  });
});

test.describe('Notes Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('notes page - initial state', async ({ page }) => {
    await page.goto('/tools/notes');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'notes-initial',
      fullPage: true,
    });
  });

  test('notes page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/notes');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'notes-mobile',
      fullPage: true,
    });
  });
});

test.describe('Mood Tracker Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('mood tracker page - initial state', async ({ page }) => {
    await page.goto('/tools/moodtracker');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'moodtracker-initial',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('mood tracker page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/moodtracker');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'moodtracker-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});

test.describe('Errands Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('errands page - initial state', async ({ page }) => {
    await page.goto('/tools/errands');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'errands-initial',
      fullPage: true,
    });
  });

  test('errands page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/errands');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'errands-mobile',
      fullPage: true,
    });
  });
});

test.describe('Tools Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('tools page - grid view', async ({ page }) => {
    await page.goto('/tools');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tools-marketplace-grid',
      fullPage: true,
    });
  });

  test('tools marketplace page', async ({ page }) => {
    await page.goto('/tools/marketplace');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tools-marketplace',
      fullPage: true,
    });
  });

  test('tools page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tools-marketplace-mobile',
      fullPage: true,
    });
  });
});

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('admin page - initial state', async ({ page }) => {
    await page.goto('/admin');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'admin-panel',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('admin page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'admin-panel-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});
