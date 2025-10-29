# Running Lighthouse CI Locally

## Quick Start

1. **Set your test credentials:**
   ```bash
   export TEST_EMAIL="your-test-email@example.com"
   export TEST_PASSWORD="your-test-password"
   ```

2. **Run Lighthouse CI:**
   ```bash
   npm run lighthouse
   ```

   Or use the script directly:
   ```bash
   ./run-lighthouse.sh
   ```

## Manual Setup

If you prefer to run it manually:

1. **Install Lighthouse CI (if not already installed):**
   ```bash
   npm install -g @lhci/cli
   ```

2. **Set Chrome path (macOS):**
   ```bash
   export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   ```

3. **Set credentials:**
   ```bash
   export TEST_EMAIL="your-email@example.com"
   export TEST_PASSWORD="your-password"
   ```

4. **Run:**
   ```bash
   lhci autorun
   ```

## Test a Single Page

To test just one page quickly:

```bash
npm run lighthouse:single
```

## View Results

Reports are generated in `lhci_reports/` directory:

```bash
open lhci_reports/*.html  # macOS
xdg-open lhci_reports/*.html  # Linux
```

## Chrome Detection

The `puppeteer-login.js` script automatically detects Chrome in common locations:

- **macOS**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Linux**: `/usr/bin/google-chrome`, `/usr/bin/chromium-browser`
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`

If Chrome is not found, it falls back to Puppeteer's bundled Chromium.

## Troubleshooting

### Chrome Not Found

If you get "Chrome installation not found", try:

```bash
# macOS
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Linux
sudo apt-get install -y google-chrome-stable
export CHROME_PATH="/usr/bin/google-chrome"
```

### Puppeteer Issues

If Puppeteer can't find Chrome:

```bash
# Skip Chromium download
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# Or explicitly set the path
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### Authentication Fails

Make sure your credentials are correct:

```bash
echo $TEST_EMAIL
echo $TEST_PASSWORD
```

The authentication flow:
1. Opens login page
2. Clicks "Continue with Email"
3. Fills email and password
4. Submits form
5. Waits for redirect to home page
6. Returns authenticated browser to Lighthouse

## What Gets Tested

The workflow tests all 22 pages in `lighthouserc.json`:

- Home page
- Login, Dashboard, Profile, Settings, Admin, Learn
- Tools page
- All tool pages (Focus, Tasks, Thoughts, Mood Tracker, etc.)

## Configuration

Configuration is in:
- `lighthouserc.json` - Main configuration
- `puppeteer-login.js` - Authentication script
- `.github/workflows/lighthouse.yml` - GitHub Actions workflow

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TEST_EMAIL` | Yes | Test account email |
| `TEST_PASSWORD` | Yes | Test account password |
| `CHROME_PATH` | No | Path to Chrome executable (auto-detected) |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | No | Skip downloading Chromium |

## Next Steps

Once local testing works:
1. Add `TEST_EMAIL` and `TEST_PASSWORD` to GitHub Secrets
2. Push to trigger the GitHub Actions workflow
3. Check the Actions tab for results

