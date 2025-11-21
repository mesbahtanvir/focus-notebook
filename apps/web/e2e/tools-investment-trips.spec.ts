import { test, expect } from '@playwright/test';
import { setupMockAuth } from './helpers/auth';
import { seedMockData } from './helpers/data';
import {
  takeScreenshot,
  waitForPageReady,
  hideDynamicElements,
  mockDateTime,
} from './helpers/screenshot';

/**
 * Investment & Trip Planning - Screenshot Tests
 *
 * Tests for:
 * - Investment portfolio management
 * - Asset horizon planning
 * - Trip planning and budgeting
 * - Subscription management
 */

interface MockInvestment {
  id: string;
  name: string;
  symbol?: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  userId: string;
  createdAt: number;
}

interface MockTrip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  userId: string;
  createdAt: number;
}

function generateMockInvestments(count: number = 5, userId: string = 'test-user-123'): MockInvestment[] {
  const now = Date.now();
  const investments: MockInvestment[] = [];
  const stocks = [
    { name: 'Apple Inc.', symbol: 'AAPL' },
    { name: 'Microsoft', symbol: 'MSFT' },
    { name: 'Tesla', symbol: 'TSLA' },
    { name: 'Amazon', symbol: 'AMZN' },
    { name: 'Google', symbol: 'GOOGL' },
  ];

  for (let i = 0; i < count; i++) {
    const stock = stocks[i % stocks.length];
    investments.push({
      id: `investment-${i + 1}`,
      name: stock.name,
      symbol: stock.symbol,
      quantity: (i + 1) * 10,
      purchasePrice: 100 + i * 50,
      currentPrice: 100 + i * 50 + (Math.random() * 40 - 20),
      userId,
      createdAt: now - (count - i) * 24 * 60 * 60 * 1000,
    });
  }

  return investments;
}

function generateMockTrips(count: number = 3, userId: string = 'test-user-123'): MockTrip[] {
  const now = Date.now();
  const trips: MockTrip[] = [];
  const destinations = ['Tokyo, Japan', 'Paris, France', 'New York, USA', 'London, UK', 'Sydney, Australia'];

  for (let i = 0; i < count; i++) {
    const startDate = new Date(now + (i + 1) * 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const budget = 2000 + i * 1000;

    trips.push({
      id: `trip-${i + 1}`,
      title: `Trip to ${destinations[i % destinations.length].split(',')[0]}`,
      destination: destinations[i % destinations.length],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      budget,
      spent: Math.floor(budget * (0.3 + Math.random() * 0.4)),
      userId,
      createdAt: now - (count - i) * 24 * 60 * 60 * 1000,
    });
  }

  return trips;
}

test.describe('Investment Portfolio Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('investments page - portfolio overview', async ({ page }) => {
    const investments = generateMockInvestments(6);
    await page.addInitScript((mockInvestments) => {
      localStorage.setItem('mockInvestments', JSON.stringify(mockInvestments));
    }, investments);

    await page.goto('/tools/investments');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'investments-portfolio-overview',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="price"]'],
    });
  });

  test('investments page - empty state', async ({ page }) => {
    await page.goto('/tools/investments');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'investments-empty-state',
      fullPage: true,
    });
  });

  test('investments page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const investments = generateMockInvestments(4);
    await page.addInitScript((mockInvestments) => {
      localStorage.setItem('mockInvestments', JSON.stringify(mockInvestments));
    }, investments);

    await page.goto('/tools/investments');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'investments-mobile',
      fullPage: true,
      mask: ['[data-testid="price"]'],
    });
  });

  test('investment detail page', async ({ page }) => {
    const investments = generateMockInvestments(3);
    await page.addInitScript((mockInvestments) => {
      localStorage.setItem('mockInvestments', JSON.stringify(mockInvestments));
    }, investments);

    await page.goto('/tools/investments/investment-1');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'investment-detail-page',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="price"]'],
    });
  });

  test('asset horizon page - planning view', async ({ page }) => {
    const investments = generateMockInvestments(8);
    await page.addInitScript((mockInvestments) => {
      localStorage.setItem('mockInvestments', JSON.stringify(mockInvestments));
    }, investments);

    await page.goto('/tools/asset-horizon');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(2000);

    await takeScreenshot(page, {
      name: 'asset-horizon-planning',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="price"]'],
    });
  });

  test('asset horizon page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const investments = generateMockInvestments(5);
    await page.addInitScript((mockInvestments) => {
      localStorage.setItem('mockInvestments', JSON.stringify(mockInvestments));
    }, investments);

    await page.goto('/tools/asset-horizon');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'asset-horizon-mobile',
      fullPage: true,
      mask: ['[data-testid="price"]'],
    });
  });
});

test.describe('Trip Planning Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('trips page - list view', async ({ page }) => {
    const trips = generateMockTrips(5);
    await page.addInitScript((mockTrips) => {
      localStorage.setItem('mockTrips', JSON.stringify(mockTrips));
    }, trips);

    await page.goto('/tools/trips');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'trips-list-view',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="date"]'],
    });
  });

  test('trips page - empty state', async ({ page }) => {
    await page.goto('/tools/trips');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'trips-empty-state',
      fullPage: true,
    });
  });

  test('trips page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const trips = generateMockTrips(3);
    await page.addInitScript((mockTrips) => {
      localStorage.setItem('mockTrips', JSON.stringify(mockTrips));
    }, trips);

    await page.goto('/tools/trips');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'trips-mobile',
      fullPage: true,
      mask: ['[data-testid="date"]'],
    });
  });

  test('trip detail page - with budget breakdown', async ({ page }) => {
    const trips = generateMockTrips(3);
    await page.addInitScript((mockTrips) => {
      localStorage.setItem('mockTrips', JSON.stringify(mockTrips));
    }, trips);

    await page.goto('/tools/trips/trip-1');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'trip-detail-budget',
      fullPage: true,
      mask: ['[data-testid="timestamp"]', '[data-testid="date"]'],
    });
  });

  test('trip detail page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const trips = generateMockTrips(2);
    await page.addInitScript((mockTrips) => {
      localStorage.setItem('mockTrips', JSON.stringify(mockTrips));
    }, trips);

    await page.goto('/tools/trips/trip-1');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1500);

    await takeScreenshot(page, {
      name: 'trip-detail-mobile',
      fullPage: true,
      mask: ['[data-testid="date"]'],
    });
  });
});

test.describe('Subscription Management Tool', () => {
  test.beforeEach(async ({ page }) => {
    await mockDateTime(page);
    await setupMockAuth(page);
  });

  test('subscriptions page - list view', async ({ page }) => {
    await page.goto('/tools/subscriptions');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'subscriptions-list-view',
      fullPage: true,
      mask: ['[data-testid="timestamp"]'],
    });
  });

  test('subscriptions page - empty state', async ({ page }) => {
    await page.goto('/tools/subscriptions');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'subscriptions-empty-state',
      fullPage: true,
    });
  });

  test('subscriptions page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/subscriptions');
    await waitForPageReady(page);
    await hideDynamicElements(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, {
      name: 'subscriptions-mobile',
      fullPage: true,
    });
  });
});
