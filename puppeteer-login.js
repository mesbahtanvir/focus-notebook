// puppeteer-login.js
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

module.exports = async ({ url, options, config }) => {
  // Determine which Chrome to use
  let executablePath;
  if (process.env.CHROME_PATH) {
    executablePath = process.env.CHROME_PATH;
  } else {
    // Try to find Chrome in common locations
    try {
      execSync('which google-chrome', { stdio: 'ignore' });
      executablePath = '/usr/bin/google-chrome';
    } catch (e) {
      // Use Puppeteer's bundled Chromium (default)
      executablePath = null;
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
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
    submitButton.click()
  ]);

  // 6) Verify we're logged in by checking for authenticated user elements
  // The app should redirect to '/' when logged in
  await page.waitForSelector('input[placeholder*="on your mind"]', { timeout: 5000 });

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
