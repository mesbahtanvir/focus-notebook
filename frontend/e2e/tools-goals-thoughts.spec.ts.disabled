import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import { generateMockGoals, generateMockThoughts, generateMockProjects, seedMockData } from './helpers/data';
import {
  takeScreenshot,
  waitForPageReady,
  hideDynamicElements,
  mockDateTime,
} from './helpers/screenshot';

/**
 * Goals & Thoughts Tools - Screenshot Tests
 *
 * Tests for:
 * - Goals management interface
 * - Thoughts/Journal interface
 * - Projects management
 */

test.describe('Goals Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('goals page - grid view with goals', async ({ page }) => {
    const goals = generateMockGoals(8);
    await seedMockData(page, { goals });

    await page.goto('/tools/goals');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'goals-grid-view',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('goals page - empty state', async ({ page }) => {
    await seedMockData(page, { goals: [] });

    await page.goto('/tools/goals');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'goals-empty-state',
      fullPage: true,
    });
  });

  test('goals page - with progress indicators', async ({ page }) => {
    const goals = generateMockGoals(6);
    await seedMockData(page, { goals });

    await page.goto('/tools/goals');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'goals-with-progress',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('goals page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const goals = generateMockGoals(4);
    await seedMockData(page, { goals });

    await page.goto('/tools/goals');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'goals-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('goals page - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const goals = generateMockGoals(6);
    await seedMockData(page, { goals });

    await page.goto('/tools/goals');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'goals-tablet',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('goal detail page - with linked items', async ({ page }) => {
    const goals = generateMockGoals(3);
    await seedMockData(page, { goals });

    // Navigate to first goal detail
    await page.goto(`/tools/goals/goal-1`);
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'goal-detail-page',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('goal detail page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const goals = generateMockGoals(3);
    await seedMockData(page, { goals });

    await page.goto(`/tools/goals/goal-1`);
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'goal-detail-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});

test.describe('Thoughts/Journal Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('thoughts page - list view with entries', async ({ page }) => {
    const thoughts = generateMockThoughts(10);
    await seedMockData(page, { thoughts });

    await page.goto('/tools/thoughts');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'thoughts-list-view',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('thoughts page - empty state', async ({ page }) => {
    await seedMockData(page, { thoughts: [] });

    await page.goto('/tools/thoughts');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'thoughts-empty-state',
      fullPage: true,
    });
  });

  test('thoughts page - with tags visible', async ({ page }) => {
    const thoughts = generateMockThoughts(8);
    await seedMockData(page, { thoughts });

    await page.goto('/tools/thoughts');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'thoughts-with-tags',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('thoughts page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const thoughts = generateMockThoughts(5);
    await seedMockData(page, { thoughts });

    await page.goto('/tools/thoughts');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'thoughts-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('thoughts page - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const thoughts = generateMockThoughts(8);
    await seedMockData(page, { thoughts });

    await page.goto('/tools/thoughts');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'thoughts-tablet',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('thought detail page', async ({ page }) => {
    const thoughts = generateMockThoughts(3);
    await seedMockData(page, { thoughts });

    await page.goto(`/tools/thoughts/thought-1`);
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'thought-detail-page',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('thought detail page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const thoughts = generateMockThoughts(3);
    await seedMockData(page, { thoughts });

    await page.goto(`/tools/thoughts/thought-1`);
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'thought-detail-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});

test.describe('Projects Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('projects page - list view', async ({ page }) => {
    const projects = generateMockProjects(6);
    await seedMockData(page, { projects });

    await page.goto('/tools/projects');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'projects-list-view',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('projects page - empty state', async ({ page }) => {
    await seedMockData(page, { projects: [] });

    await page.goto('/tools/projects');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'projects-empty-state',
      fullPage: true,
    });
  });

  test('projects page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const projects = generateMockProjects(4);
    await seedMockData(page, { projects });

    await page.goto('/tools/projects');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'projects-mobile',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('project detail page', async ({ page }) => {
    const projects = generateMockProjects(3);
    await seedMockData(page, { projects });

    await page.goto(`/tools/projects/project-1`);
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'project-detail-page',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });
});
