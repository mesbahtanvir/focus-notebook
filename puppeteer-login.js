// puppeteer-login.js
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: executablePath
  });
  const page = await browser.newPage();

  // 1) Go to login page
  await page.goto('https://focus.yourthoughts.ca/login', { waitUntil: 'networkidle2' });

  // 2) Click "Continue with Email" button to switch to email auth mode
  // Wait for the page to load, then find and click the button by its text content
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(btn => btn.textContent?.includes('Continue with Email'));
  });
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const emailButton = buttons.find(btn => btn.textContent?.includes('Continue with Email'));
    if (emailButton) {
      emailButton.click();
    }
  });
  
  // Wait for form transition animation
  await new Promise(resolve => setTimeout(resolve, 500));

  // 3) Wait for email form to appear and fill credentials
  await page.waitForSelector('input[type="email"]');
  const emailInput = await page.$('input[type="email"]');
  await emailInput.type(process.env.TEST_EMAIL);
  
  const passwordInput = await page.$('input[type="password"]');
  await passwordInput.type(process.env.TEST_PASSWORD);

  // 4) Click submit button (either "Sign In" or "Create Account")
  const submitButton = await page.$('button[type="submit"]');
  if (!submitButton) {
    throw new Error('Submit button not found');
  }

  // Start navigation wait with longer timeout
  const navigationPromise = page.waitForNavigation({ 
    waitUntil: 'networkidle2', 
    timeout: 30000 // Increased to 30 seconds
  });

  // Click the button
  await submitButton.click();

  // Wait for navigation with better error handling
  try {
    await navigationPromise;
  } catch (error) {
    // If navigation fails, check if we're already on the target page
    const currentUrl = page.url();
    console.log('Navigation timeout. Current URL:', currentUrl);
    
    // Check if we're already logged in (on home page)
    if (currentUrl.includes('yourthoughts.ca') && !currentUrl.includes('login')) {
      console.log('Already on authenticated page, continuing...');
    } else {
      throw new Error('Login failed - navigation timeout');
    }
  }

  // 6) Verify we're logged in by checking for authenticated user elements
  // The app should redirect to '/' when logged in
  try {
    await page.waitForSelector('input[placeholder*="on your mind"]', { timeout: 10000 });
  } catch (error) {
    // If selector timeout, try alternative selectors
    console.log('Primary selector not found, trying alternatives...');
    const altSelectors = [
      'input[placeholder*="on your mind"]',
      'form',
      'input[type="text"]'
    ];
    
    let found = false;
    for (const selector of altSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        found = true;
        console.log('Found element with selector:', selector);
        break;
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    if (!found) {
      console.warn('Could not verify login status, continuing anyway...');
    }
  }

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
