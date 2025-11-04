import { Page, expect } from '@playwright/test';

/**
 * Screenshot testing utilities
 *
 * Provides helpers for taking consistent, reliable screenshots
 * across different viewports and themes.
 */

export interface ScreenshotOptions {
  /**
   * Name for the screenshot (without extension)
   */
  name: string;

  /**
   * Wait for specific selector before taking screenshot
   */
  waitFor?: string;

  /**
   * Hide specific elements (useful for hiding dynamic content like timestamps)
   */
  mask?: string[];

  /**
   * Full page screenshot (default: false)
   */
  fullPage?: boolean;

  /**
   * Animations to disable (default: 'allow')
   */
  animations?: 'disabled' | 'allow';

  /**
   * Wait time in ms after page load (default: 0)
   */
  waitTime?: number;
}

/**
 * Take a screenshot with consistent settings
 */
export async function takeScreenshot(page: Page, options: ScreenshotOptions) {
  const {
    name,
    waitFor,
    mask = [],
    fullPage = false,
    animations = 'disabled',
    waitTime = 0,
  } = options;

  // Wait for selector if specified
  if (waitFor) {
    await page.waitForSelector(waitFor, { state: 'visible', timeout: 10000 });
  }

  // Wait for additional time if specified
  if (waitTime > 0) {
    await page.waitForTimeout(waitTime);
  }

  // Disable animations for consistent screenshots
  if (animations === 'disabled') {
    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  }

  // Wait for network idle
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Take screenshot with masking
  const maskSelectors = mask.length > 0 ? await Promise.all(
    mask.map(selector => page.locator(selector).first())
  ) : undefined;

  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage,
    mask: maskSelectors,
  });
}

/**
 * Wait for page to be fully loaded and stable
 */
export async function waitForPageReady(page: Page) {
  // Wait for DOM to be ready
  await page.waitForLoadState('domcontentloaded');

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Wait for any pending React renders
  await page.waitForTimeout(500);
}

/**
 * Hide dynamic elements that change between test runs
 */
export async function hideDynamicElements(page: Page) {
  await page.addStyleTag({
    content: `
      /* Hide elements that change dynamically */
      [data-testid="timestamp"],
      [data-testid="current-time"],
      [data-testid="date-now"],
      .timestamp,
      .current-time,
      .relative-time {
        visibility: hidden !important;
      }
    `,
  });
}

/**
 * Set viewport size
 */
export async function setViewport(page: Page, preset: 'mobile' | 'tablet' | 'desktop') {
  const viewports = {
    mobile: { width: 390, height: 844 },
    tablet: { width: 1024, height: 768 },
    desktop: { width: 1280, height: 720 },
  };

  await page.setViewportSize(viewports[preset]);
}

/**
 * Enable dark mode
 */
export async function enableDarkMode(page: Page) {
  await page.emulateMedia({ colorScheme: 'dark' });

  // Also set localStorage theme preference
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
  });
}

/**
 * Enable light mode
 */
export async function enableLightMode(page: Page) {
  await page.emulateMedia({ colorScheme: 'light' });

  // Also set localStorage theme preference
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
  });
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // Wait for scroll animation
}

/**
 * Open a modal and wait for it to be visible
 */
export async function openModal(page: Page, triggerSelector: string, modalSelector: string) {
  await page.click(triggerSelector);
  await page.waitForSelector(modalSelector, { state: 'visible' });
  await page.waitForTimeout(300); // Wait for modal animation
}

/**
 * Close a modal
 */
export async function closeModal(page: Page, closeButtonSelector: string) {
  await page.click(closeButtonSelector);
  await page.waitForTimeout(300); // Wait for close animation
}

/**
 * Fill form and wait for updates
 */
export async function fillFormField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  await page.waitForTimeout(100); // Debounce time
}

/**
 * Click and wait for navigation
 */
export async function clickAndNavigate(page: Page, selector: string) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(selector),
  ]);
}

/**
 * Mock date/time for consistent screenshots
 */
export async function mockDateTime(page: Page, date: Date = new Date('2024-01-15T10:00:00Z')) {
  await page.addInitScript((timestamp) => {
    // Mock Date
    const OriginalDate = Date;
    const mockDate = new OriginalDate(timestamp);

    // Override Date constructor
    (global as any).Date = class extends OriginalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(timestamp);
        } else {
          // @ts-ignore - TypeScript doesn't like spreading args to Date constructor
          super(...args);
        }
      }

      static now() {
        return timestamp;
      }
    };

    // Copy static methods
    Object.setPrototypeOf(Date, OriginalDate);
  }, date.getTime());
}

/**
 * Wait for all images to load
 */
export async function waitForImages(page: Page) {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => !img.complete)
        .map(img => new Promise(resolve => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        }))
    );
  });
}

/**
 * Take screenshot of specific element
 */
export async function takeElementScreenshot(page: Page, selector: string, name: string) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  await expect(element).toHaveScreenshot(`${name}.png`);
}
