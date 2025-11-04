import { test } from './fixtures/global-setup';
import { expect } from '@playwright/test';
import { takeScreenshot } from './helpers/screenshot';

/**
 * Example Test with Baseline Data
 *
 * This demonstrates how to use the global fixtures with realistic baseline data.
 * All tests automatically get:
 * - Authenticated user
 * - Realistic tasks, thoughts, goals, projects, and focus sessions
 * - Fixed time (2024-01-15 10:00 AM)
 * - Hidden dynamic elements
 */

test.describe('Dashboard with Baseline Data', () => {
  test('home page - shows realistic user data', async ({ page }) => {
    // The baseline data is already loaded via the fixture
    await page.goto('/');

    // Page should show the user's tasks and thoughts
    await takeScreenshot(page, {
      name: 'home-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('dashboard - shows statistics and charts', async ({ page }) => {
    await page.goto('/dashboard');

    // Dashboard should display stats from the baseline focus sessions
    await takeScreenshot(page, {
      name: 'dashboard-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.recharts-tooltip'],
    });
  });

  test('tasks page - shows organized task list', async ({ page }) => {
    await page.goto('/tools/tasks');

    // Should show mix of today's tasks, upcoming, and backlog
    await takeScreenshot(page, {
      name: 'tasks-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('focus page - shows recent sessions', async ({ page }) => {
    await page.goto('/tools/focus');

    // Should show recent focus sessions from baseline data
    await takeScreenshot(page, {
      name: 'focus-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timer"]', '[data-testid="timestamp"]'],
    });
  });

  test('goals page - shows active and completed goals', async ({ page }) => {
    await page.goto('/tools/goals');

    // Should show goals with progress indicators
    await takeScreenshot(page, {
      name: 'goals-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('thoughts page - shows journal entries', async ({ page }) => {
    await page.goto('/tools/thoughts');

    // Should show recent thoughts and reflections
    await takeScreenshot(page, {
      name: 'thoughts-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('projects page - shows active projects', async ({ page }) => {
    await page.goto('/tools/projects');

    // Should show both active and completed projects
    await takeScreenshot(page, {
      name: 'projects-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});

test.describe('Mobile Views with Baseline Data', () => {
  test('home page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await takeScreenshot(page, {
      name: 'home-mobile-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('tasks page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/tasks');

    await takeScreenshot(page, {
      name: 'tasks-mobile-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('dashboard - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');

    await takeScreenshot(page, {
      name: 'dashboard-mobile-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});

test.describe('Focus Session Detail with Baseline', () => {
  test('focus summary page - shows session history', async ({ page }) => {
    await page.goto('/tools/focus/summary');

    // Should show charts and stats from recent focus sessions
    await takeScreenshot(page, {
      name: 'focus-summary-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.recharts-tooltip'],
    });
  });

  test('focus summary - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/focus/summary');

    await takeScreenshot(page, {
      name: 'focus-summary-mobile-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});

test.describe('Progress Tracking with Baseline', () => {
  test('dashboard progress page - shows trends', async ({ page }) => {
    await page.goto('/dashboard/progress');

    // Should show progress over time based on baseline data
    await takeScreenshot(page, {
      name: 'progress-with-baseline-data',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '.recharts-tooltip'],
    });
  });
});
