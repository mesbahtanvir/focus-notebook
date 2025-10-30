// puppeteer-login.js
const puppeteer = require('puppeteer');

module.exports = async ({ url, options, config }) => {
  // Check if credentials are set
  if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD environment variables must be set');
  }

  // Check if using placeholder credentials
  if (process.env.TEST_EMAIL.includes('example.com') || process.env.TEST_PASSWORD.includes('password')) {
    console.warn('⚠️  Using placeholder credentials. This will likely fail. Please set real TEST_EMAIL and TEST_PASSWORD.');
  }

  // Determine which Chrome to use
  let executablePath;
  
  if (process.env.CHROME_PATH) {
    // Use explicitly set Chrome path
    executablePath = process.env.CHROME_PATH;
  } else {
    // Try to find Chrome in common locations
    const fs = require('fs');
    const possiblePaths = [
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      // Windows
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    
    // Check which path exists
    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      } catch (e) {
        // Continue checking other paths
      }
    }
    
    // Use Puppeteer's bundled Chromium as fallback
    if (!executablePath) {
      console.log('Using Puppeteer\'s bundled Chromium');
      executablePath = null;
    } else {
      console.log('Using Chrome at:', executablePath);
    }
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: executablePath
  });
  const page = await browser.newPage();

  // Set a reasonable viewport
  await page.setViewport({ width: 1280, height: 800 });

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const sanitizeText = (text) => (text || '').replace(/\s+/g, ' ').trim();

  async function waitForAuthResult(timeoutMs = 45000) {
    const startTime = Date.now();
    let lastSuccessMessage = '';

    while (Date.now() - startTime < timeoutMs) {
      const state = await page.evaluate(() => {
        const url = window.location.href;
        const errorEl = document.querySelector('[data-testid="email-auth-error"]');
        const successEl = document.querySelector('[data-testid="email-auth-success"]');
        const dashboardInput =
          document.querySelector('input[placeholder*="on your mind"]') ||
          document.querySelector('form input[type="text"]');

        return {
          url,
          errorText: errorEl ? errorEl.textContent || '' : '',
          successText: successEl ? successEl.textContent || '' : '',
          loggedIn: !!dashboardInput || !url.includes('/login'),
        };
      });

      if (state.loggedIn) {
        return { status: 'success', url: state.url };
      }

      if (state.errorText) {
        return {
          status: 'error',
          message: sanitizeText(state.errorText),
          url: state.url,
        };
      }

      if (state.successText) {
        const message = sanitizeText(state.successText);
        if (message && message !== lastSuccessMessage) {
          console.log('Authentication status:', message);
          lastSuccessMessage = message;
        }
      }

      await wait(500);
    }

    return { status: 'timeout', url: await page.url() };
  }

  async function attemptAccountCreation() {
    console.log('Attempting to create test account since it was not found...');

    const toggled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toggle = buttons.find((btn) => btn.textContent && btn.textContent.includes("Don't have an account"));
      if (toggle) {
        toggle.click();
        return true;
      }
      return false;
    });

    if (!toggled) {
      throw new Error('Could not switch to account creation form');
    }

    await wait(500);

    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) {
      throw new Error('Sign up submit button not found');
    }

    const buttonLabel = sanitizeText(await submitBtn.evaluate((el) => el.textContent || ''));
    if (buttonLabel) {
      console.log(`Submitting "${buttonLabel}" to create the account...`);
    }

    await submitBtn.click();

    const creationResult = await waitForAuthResult(60000);
    if (creationResult.status === 'success') {
      console.log('Account created and authenticated! Current URL:', creationResult.url);
      return;
    }

    if (creationResult.status === 'error') {
      throw new Error(`Account creation failed - ${creationResult.message}`);
    }

    try {
      await page.screenshot({ path: 'login-error.png', fullPage: true });
      console.log('Screenshot saved to login-error.png');
    } catch (e) {
      // Ignore screenshot errors
    }

    throw new Error(`Account creation timeout at ${creationResult.url}`);
  }

  console.log('Navigating to login page...');

  // 1) Go to login page with longer timeout
  try {
    await page.goto('https://focus.yourthoughts.ca/login', {
      waitUntil: 'networkidle2',
      timeout: 60000 // 60 seconds for initial page load
    });
  } catch (error) {
    console.error('Failed to load login page:', error.message);
    throw new Error('Could not load login page - site may be down or slow');
  }

  console.log('Login page loaded successfully');

  // 2) Click "Continue with Email" button to switch to email auth mode
  console.log('Looking for "Continue with Email" button...');

  try {
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.textContent?.includes('Continue with Email'));
    }, { timeout: 15000 });

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const emailButton = buttons.find(btn => btn.textContent?.includes('Continue with Email'));
      if (emailButton) {
        emailButton.click();
      }
    });

    console.log('Clicked "Continue with Email" button');
  } catch (error) {
    console.log('Could not find "Continue with Email" button - may already be on email form');
  }

  // Wait for form transition animation
  await wait(1000);

  // 3) Wait for email form to appear and fill credentials
  console.log('Waiting for email form...');

  try {
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    console.log('Email input found');

    const emailInput = await page.$('input[type="email"]');
    await emailInput.type(process.env.TEST_EMAIL, { delay: 50 });
    console.log('Email entered');

    const passwordInput = await page.$('input[type="password"]');
    if (!passwordInput) {
      throw new Error('Password input not found');
    }
    await passwordInput.type(process.env.TEST_PASSWORD, { delay: 50 });
    console.log('Password entered');
  } catch (error) {
    console.error('Failed to fill credentials:', error.message);
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: 'form-error.png', fullPage: true });
      console.log('Screenshot saved to form-error.png');
    } catch (e) {
      // Ignore screenshot errors
    }
    throw error;
  }

  // 4) Click submit button (either "Sign In" or "Create Account")
  console.log('Looking for submit button...');

  const submitButton = await page.$('button[type="submit"]');
  if (!submitButton) {
    throw new Error('Submit button not found');
  }

  console.log('Clicking submit button...');

  // Click the button
  await submitButton.click();

  // Wait for authentication to complete - Firebase auth may not trigger traditional navigation
  console.log('Waiting for authentication to complete...');
  let authResult = await waitForAuthResult(45000);

  if (authResult.status === 'success') {
    console.log('Authentication successful! Current URL:', authResult.url);
  } else if (authResult.status === 'error') {
    console.log('Authentication error detected:', authResult.message);
    const lowerMessage = authResult.message.toLowerCase();

    if (lowerMessage.includes('no account found')) {
      await attemptAccountCreation();
    } else {
      try {
        await page.screenshot({ path: 'login-error.png', fullPage: true });
        console.log('Screenshot saved to login-error.png');
      } catch (e) {
        // Ignore screenshot errors
      }
      throw new Error(`Login failed - ${authResult.message}`);
    }
  } else {
    console.log('Authentication wait timeout. Current URL:', authResult.url);
    try {
      await page.screenshot({ path: 'login-error.png', fullPage: true });
      console.log('Screenshot saved to login-error.png');
    } catch (e) {
      // Ignore screenshot errors
    }
    throw new Error(`Login failed - authentication timeout at ${authResult.url}`);
  }

  // Give Firebase some extra time to settle
  await wait(2000);

  // 5) Verify we're logged in by checking for authenticated user elements
  console.log('Verifying login status...');
  const currentUrl = page.url();
  console.log('Final URL:', currentUrl);

  // Check if we're NOT on the login page
  if (currentUrl.includes('/login')) {
    throw new Error('Still on login page after authentication attempt');
  }

  // Try to find any authenticated content
  try {
    // Wait for any sign that we're on an authenticated page
    const altSelectors = [
      'input[placeholder*="on your mind"]',
      '[href="/dashboard"]',
      '[href="/profile"]',
      'nav a[href*="/tools"]',
      'button[aria-label*="menu"]',
      'form input[type="text"]'
    ];

    let found = false;
    for (const selector of altSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        found = true;
        console.log('✓ Login verified with selector:', selector);
        break;
      } catch (e) {
        // Continue trying other selectors
      }
    }

    if (!found) {
      console.warn('⚠️  Could not verify login with selectors, but URL indicates success');
    }
  } catch (error) {
    console.warn('⚠️  Verification failed, but continuing anyway');
  }

  console.log('✓ Authentication complete, handing off to Lighthouse...');

  // 7) Hand off the *authenticated* browser to Lighthouse
  const wsEndpoint = browser.wsEndpoint();
  // LHCI will connect to this running instance under the hood
  // Use system Chrome if available, otherwise let Lighthouse CI handle it
  if (process.env.CHROME_PATH) {
    // Already set by the environment (CI)
  } else {
    // Use Puppeteer's bundled Chromium for local development
    process.env.CHROME_PATH = '';
  }
  process.env.LHCI_REMOTE_DEBUGGING_ADDRESS = new URL(wsEndpoint).host;

  // Keep browser open while LHCI collects pages, it will close later
};
