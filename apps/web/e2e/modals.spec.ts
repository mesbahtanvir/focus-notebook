import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import { generateMockTasks, generateMockThoughts, generateMockGoals, seedMockData } from './helpers/data';
import {
  takeScreenshot,
  waitForPageReady,
  hideDynamicElements,
  mockDateTime,
  openModal,
} from './helpers/screenshot';

/**
 * Modal Components - Screenshot Tests
 *
 * Tests for various modal interfaces including:
 * - Task detail modal
 * - Thought detail modal
 * - Goal form modal
 * - Confirmation modals
 * - Error modals
 */

test.describe('Modal Components', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('task detail modal - open state', async ({ page }) => {
    const tasks = generateMockTasks(5);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to open task modal by clicking first task
    const firstTask = page.locator('[data-testid="task-item"], .task-item, li').first();
    if (await firstTask.count() > 0) {
      await firstTask.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-task-detail',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('task detail modal - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const tasks = generateMockTasks(3);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    const firstTask = page.locator('[data-testid="task-item"], .task-item, li').first();
    if (await firstTask.count() > 0) {
      await firstTask.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-task-detail-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('thought detail modal - open state', async ({ page }) => {
    const thoughts = generateMockThoughts(5);
    await seedMockData(page, { thoughts });

    await page.goto('/tools/thoughts');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to open thought modal
    const firstThought = page.locator('[data-testid="thought-item"], .thought-item, article').first();
    if (await firstThought.count() > 0) {
      await firstThought.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-thought-detail',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('thought detail modal - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const thoughts = generateMockThoughts(3);
    await seedMockData(page, { thoughts });

    await page.goto('/tools/thoughts');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    const firstThought = page.locator('[data-testid="thought-item"], .thought-item, article').first();
    if (await firstThought.count() > 0) {
      await firstThought.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-thought-detail-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('goal form modal - create new goal', async ({ page }) => {
    await page.goto('/tools/goals');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to open new goal modal
    const newGoalButton = page.locator('[data-testid="new-goal"], button:has-text("New Goal"), button:has-text("Add Goal"), button:has-text("Create")').first();
    if (await newGoalButton.count() > 0) {
      await newGoalButton.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-goal-form-create',
      fullPage: true,
    });
  });

  test('goal form modal - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/goals');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    const newGoalButton = page.locator('[data-testid="new-goal"], button:has-text("New Goal"), button:has-text("Add Goal"), button:has-text("Create")').first();
    if (await newGoalButton.count() > 0) {
      await newGoalButton.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-goal-form-mobile',
      fullPage: true,
    });
  });

  test('focus session detail modal', async ({ page }) => {
    const tasks = generateMockTasks(3);
    await seedMockData(page, { tasks });

    await page.goto('/tools/focus');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Look for session history item to click
    const sessionItem = page.locator('[data-testid="session-item"], .session-item').first();
    if (await sessionItem.count() > 0) {
      await sessionItem.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-focus-session-detail',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="duration"]'],
    });
  });

  test('new task modal - with form filled', async ({ page }) => {
    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to open new task modal
    const newTaskButton = page.locator('[data-testid="new-task"], button:has-text("New Task"), button:has-text("Add Task")').first();
    if (await newTaskButton.count() > 0) {
      await newTaskButton.click();
      await page.waitForTimeout(500);

      // Fill in some form fields if they exist
      const titleInput = page.locator('input[name="title"], input[placeholder*="task"], input[type="text"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill('Sample Task for Testing');
      }
    }

    await takeScreenshot(page, {
      name: 'modal-new-task-filled',
      fullPage: true,
    });
  });

  test('new thought modal - with form filled', async ({ page }) => {
    await page.goto('/tools/thoughts');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to open new thought modal
    const newThoughtButton = page.locator('[data-testid="new-thought"], button:has-text("New Thought"), button:has-text("Add"), button:has-text("Write")').first();
    if (await newThoughtButton.count() > 0) {
      await newThoughtButton.click();
      await page.waitForTimeout(500);

      // Fill in some content
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill('Sample Thought Title');
      }

      const contentInput = page.locator('textarea[name="content"], textarea[placeholder*="thought"], .editor').first();
      if (await contentInput.count() > 0) {
        await contentInput.fill('This is a sample thought content for testing the modal interface.');
      }
    }

    await takeScreenshot(page, {
      name: 'modal-new-thought-filled',
      fullPage: true,
    });
  });

  test('confirmation modal - delete confirmation', async ({ page }) => {
    const tasks = generateMockTasks(3);
    await seedMockData(page, { tasks });

    await page.goto('/tools/tasks');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to trigger delete action
    const deleteButton = page.locator('[data-testid="delete-task"], button[aria-label*="delete"], button:has-text("Delete")').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-confirmation-delete',
      fullPage: false,
    });
  });

  test('import preview modal', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to trigger import flow
    const importButton = page.locator('[data-testid="import-data"], button:has-text("Import")').first();
    if (await importButton.count() > 0) {
      await importButton.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-import-preview',
      fullPage: true,
    });
  });

  test('export modal', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    // Try to trigger export flow
    const exportButton = page.locator('[data-testid="export-data"], button:has-text("Export")').first();
    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, {
      name: 'modal-export-options',
      fullPage: false,
    });
  });
});
