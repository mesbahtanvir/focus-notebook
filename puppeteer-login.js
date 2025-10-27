// puppeteer-login.js
const puppeteer = require('puppeteer');

module.exports = async ({ url, options, config }) => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // 1) Go to login page
  await page.goto('https://focus.yourthoughts.ca/login', { waitUntil: 'networkidle2' });

  // 2) Click "Continue with Email" button to switch to email auth mode
  // Wait for the button and click it using XPath to find button with "Continue with Email" text
  await page.waitForXPath('//button[contains(text(), "Continue with Email")]');
  const [emailButton] = await page.$x('//button[contains(text(), "Continue with Email")]');
  await emailButton.click();
  await page.waitForTimeout(500); // Wait for form transition animation

  // 3) Wait for email form to appear and fill credentials
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', process.env.TEST_EMAIL);
  await page.type('input[type="password"]', process.env.TEST_PASSWORD);

  // 4) Click submit button (either "Sign In" or "Create Account")
  await page.click('button[type="submit"]');

  // 5) Wait for successful navigation - the app redirects to home page after login
  // Look for the main app container or any authenticated element
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });

  // 6) Verify we're logged in by checking for authenticated user elements
  // The app should redirect to '/' when logged in
  await page.waitForSelector('input[placeholder*="on your mind"]', { timeout: 5000 });

  // 7) Hand off the *authenticated* browser to Lighthouse
  const wsEndpoint = browser.wsEndpoint();
  // LHCI will connect to this running instance under the hood
  process.env.CHROME_PATH = ''; // ensure Puppeteer Chromium is used
  process.env.LHCI_REMOTE_DEBUGGING_ADDRESS = new URL(wsEndpoint).host;

  // Keep browser open while LHCI collects pages, it will close later
};
