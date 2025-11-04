import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import { generateMockTasks, generateMockFocusSessions, seedMockData } from './helpers/data';
import {
  takeScreenshot,
  waitForPageReady,
  hideDynamicElements,
  mockDateTime,
} from './helpers/screenshot';

/**
 * Focus Tool - Screenshot Tests
 *
 * Tests for the Pomodoro/Focus session interface including:
 * - Session timer interface
 * - Session history
 * - Session summary
 * - Various states (active, paused, completed)
 */

test.describe('Focus Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('focus page - initial state with task selection', async ({ page }) => {
    const tasks = generateMockTasks(5);
    await seedMockData(page, { tasks });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'focus-initial-state',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="timer"]'],
    });
  });

  test('focus page - timer interface', async ({ page }) => {
    const tasks = generateMockTasks(3);
    await seedMockData(page, { tasks });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'focus-timer-interface',
      fullPage: false,
      mask: ['[data-testid="timer"]', '[data-testid="time-remaining"]'],
    });
  });

  test('focus page - with session history', async ({ page }) => {
    const tasks = generateMockTasks(5);
    const focusSessions = generateMockFocusSessions(10);
    await seedMockData(page, { tasks, focusSessions });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    // Scroll to show history if it exists
    const historySection = page.locator('[data-testid="session-history"], .session-history, h2:has-text("History")');
    if (await historySection.count() > 0) {
      await historySection.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }

    await takeScreenshot(page, {
      name: 'focus-with-history',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="timer"]'],
    });
  });

  test('focus page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const tasks = generateMockTasks(3);
    await seedMockData(page, { tasks });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'focus-mobile',
      fullPage: true,
      mask: ['[data-testid="timer"]'],
    });
  });

  test('focus page - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const tasks = generateMockTasks(5);
    const focusSessions = generateMockFocusSessions(5);
    await seedMockData(page, { tasks, focusSessions });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'focus-tablet',
      fullPage: true,
      mask: ['[data-testid="timer"]'],
    });
  });

  test('focus page - session summary', async ({ page }) => {
    const focusSessions = generateMockFocusSessions(15);
    await seedMockData(page, { focusSessions });

    await page.goto('/tools/focus/summary');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'focus-session-summary',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.recharts-tooltip'],
    });
  });

  test('focus page - session summary mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const focusSessions = generateMockFocusSessions(10);
    await seedMockData(page, { focusSessions });

    await page.goto('/tools/focus/summary');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'focus-summary-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('focus page - statistics view', async ({ page }) => {
    const focusSessions = generateMockFocusSessions(20);
    await seedMockData(page, { focusSessions });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    // Try to navigate to stats if button exists
    const statsButton = page.locator('[data-testid="view-stats"], button:has-text("Statistics"), a:has-text("Stats")');
    if (await statsButton.count() > 0) {
      await statsButton.first().click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'focus-statistics',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.recharts-tooltip'],
    });
  });

  test('focus page - empty state no sessions', async ({ page }) => {
    await seedMockData(page, { tasks: [], focusSessions: [] });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'focus-empty-state',
      fullPage: true,
    });
  });

  test('focus page - with task selected', async ({ page }) => {
    const tasks = generateMockTasks(5);
    await seedMockData(page, { tasks });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to select a task if task selector exists
    const taskSelector = page.locator('[data-testid="task-select"], select, .task-selector').first();
    if (await taskSelector.count() > 0) {
      await taskSelector.click();
      await page.waitForTimeout(300);
    }

    await takeScreenshot(page, {
      name: 'focus-task-selected',
      fullPage: true,
      mask: ['[data-testid="timer"]'],
    });
  });
});
