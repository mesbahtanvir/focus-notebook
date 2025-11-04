import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import { generateMockTasks, seedMockData } from './helpers/data';
import {
  takeScreenshot,
  waitForPageReady,
  hideDynamicElements,
  mockDateTime,
} from './helpers/screenshot';

/**
 * Tasks Tool - Screenshot Tests
 *
 * Tests for the task management interface including:
 * - Task list views
 * - Filtering and sorting
 * - Empty states
 * - Various viewport sizes
 */

test.describe('Tasks Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('tasks page - list view with tasks', async ({ page }) => {
    const tasks = generateMockTasks(10);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tasks-list-view',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.relative-time'],
    });
  });

  test('tasks page - empty state', async ({ page }) => {
    await seedMockData(page, { tasks: [] });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tasks-empty-state',
      fullPage: true,
    });
  });

  test('tasks page - with completed tasks', async ({ page }) => {
    const tasks = generateMockTasks(8).map((task, i) => ({
      ...task,
      completed: i < 4, // First 4 are completed
    }));
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tasks-with-completed',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('tasks page - filtered by priority', async ({ page }) => {
    const tasks = generateMockTasks(12);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to filter by priority if filter exists
    const priorityFilter = page.locator('[data-testid="filter-priority"], select:has-text("Priority"), button:has-text("Priority")');
    if (await priorityFilter.count() > 0) {
      await priorityFilter.first().click();
      await page.waitForTimeout(300);
    }

    await takeScreenshot(page, {
      name: 'tasks-filtered-priority',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('tasks page - with due dates visible', async ({ page }) => {
    const tasks = generateMockTasks(8);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tasks-with-due-dates',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="due-date"]'],
    });
  });

  test('tasks page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const tasks = generateMockTasks(5);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tasks-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('tasks page - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const tasks = generateMockTasks(8);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tasks-tablet',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('tasks page - with tags', async ({ page }) => {
    const tasks = generateMockTasks(6);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tasks-with-tags',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('tasks page - task input visible', async ({ page }) => {
    const tasks = generateMockTasks(5);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to focus on task input to show it
    const taskInput = page.locator('input[placeholder*="task"], input[placeholder*="Task"], textarea[placeholder*="task"]');
    if (await taskInput.count() > 0) {
      await taskInput.first().click();
      await page.waitForTimeout(300);
    }

    await takeScreenshot(page, {
      name: 'tasks-input-focused',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('tasks page - recurring tasks', async ({ page }) => {
    const tasks = generateMockTasks(6).map((task, i) => ({
      ...task,
      recurrenceType: i % 2 === 0 ? 'daily' : i % 3 === 0 ? 'weekly' : 'none',
    }));
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'tasks-recurring',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});
