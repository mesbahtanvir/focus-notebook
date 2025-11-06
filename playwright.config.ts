import { defineConfig, devices } from '@playwright/test';

/**
 * Screenshot Testing Configuration for Focus Notebook
 *
 * This configuration sets up visual regression testing across:
 * - Multiple viewports (mobile, tablet, desktop)
 * - Various UI states (empty, loading, error, success)
 * - Firebase Local Emulator Suite for realistic data
 */
export default defineConfig({
  testDir: './e2e',

  // Global setup/teardown for Firebase emulators
  globalSetup: require.resolve('./e2e/setup/emulator-setup'),
  globalTeardown: require.resolve('./e2e/setup/emulator-teardown'),

  // Timeout for each test
  timeout: 30 * 1000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
    // Screenshot comparison tolerance
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Trace on first retry
    trace: 'on-first-retry',

    // Video on first retry
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers and viewports
  projects: [
    // Desktop - Chromium
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Desktop - Safari
    {
      name: 'Desktop Safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Desktop - Firefox
    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Desktop - Edge
    {
      name: 'Desktop Edge',
      use: {
        ...devices['Desktop Edge'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Tablet - iPad
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 },
      },
    },

    // Mobile - iPhone
    {
      name: 'Mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },

    // Mobile - Android Chrome
    {
      name: 'Mobile Chrome Android',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
