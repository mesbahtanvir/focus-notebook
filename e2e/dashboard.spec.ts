import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import {
  generateMockTasks,
  generateMockThoughts,
  generateMockGoals,
  generateMockFocusSessions,
  seedMockData,
} from './helpers/data';
import {
  takeScreenshot,
  waitForPageReady,
  hideDynamicElements,
  mockDateTime,
} from './helpers/screenshot';

/**
 * Dashboard & Home Pages - Screenshot Tests
 *
 * Tests for:
 * - Home/Dashboard page (with data)
 * - Home page (empty state)
 * - Dashboard progress page
 * - Dashboard charts and statistics
 */

test.describe('Dashboard and Home Pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('home page - with tasks and thoughts', async ({ page }) => {
    const tasks = generateMockTasks(5);
    const thoughts = generateMockThoughts(3);

    await seedMockData(page, { tasks, thoughts });
    await page.goto('/');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'dashboard-home-with-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.relative-time'],
    });
  });

  test('home page - empty state', async ({ page }) => {
    await seedMockData(page, {
      tasks: [],
      thoughts: [],
    });

    await page.goto('/');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'dashboard-home-empty',
      fullPage: true,
    });
  });

  test('home page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const tasks = generateMockTasks(3);
    const thoughts = generateMockThoughts(2);

    await seedMockData(page, { tasks, thoughts });
    await page.goto('/');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'dashboard-home-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('home page - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const tasks = generateMockTasks(5);
    const thoughts = generateMockThoughts(3);

    await seedMockData(page, { tasks, thoughts });
    await page.goto('/');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'dashboard-home-tablet',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('dashboard page - overview', async ({ page }) => {
    const tasks = generateMockTasks(10);
    const goals = generateMockGoals(5);
    const focusSessions = generateMockFocusSessions(7);

    await seedMockData(page, { tasks, goals, focusSessions });
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'dashboard-overview',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.relative-time'],
    });
  });

  test('dashboard page - progress view', async ({ page }) => {
    const tasks = generateMockTasks(15);
    const goals = generateMockGoals(8);
    const focusSessions = generateMockFocusSessions(10);

    await seedMockData(page, { tasks, goals, focusSessions });
    await page.goto('/dashboard/progress');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'dashboard-progress',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('dashboard page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const tasks = generateMockTasks(10);
    const goals = generateMockGoals(5);
    const focusSessions = generateMockFocusSessions(7);

    await seedMockData(page, { tasks, goals, focusSessions });
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'dashboard-overview-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('dashboard page - with charts', async ({ page }) => {
    const focusSessions = generateMockFocusSessions(20);
    const tasks = generateMockTasks(25);

    await seedMockData(page, { tasks, focusSessions });
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await hideDynamicElements(page);

    // Wait for charts to render
    await page.waitForTimeout(2000);

    await takeScreenshot(page, {
      name: 'dashboard-with-charts',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.recharts-tooltip'],
    });
  });

  test('dashboard page - empty state', async ({ page }) => {
    await seedMockData(page, {
      tasks: [],
      goals: [],
      focusSessions: [],
    });

    await page.goto('/dashboard');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'dashboard-empty',
      fullPage: true,
    });
  });

  test('home page - with sidebar open', async ({ page }) => {
    const tasks = generateMockTasks(5);

    await seedMockData(page, { tasks });
    await page.goto('/');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to open sidebar if it exists
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"], [aria-label*="menu"], button:has-text("Menu")');
    if (await sidebarToggle.count() > 0) {
      await sidebarToggle.first().click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'dashboard-home-sidebar-open',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});
