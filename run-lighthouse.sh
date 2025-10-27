#!/bin/bash

# Run Lighthouse CI locally with proper Chrome detection

# Detect Chrome on macOS
if [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
  export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  echo "✓ Found Chrome at: $CHROME_PATH"
elif [ -f "/Applications/Chromium.app/Contents/MacOS/Chromium" ]; then
  export CHROME_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium"
  echo "✓ Found Chromium at: $CHROME_PATH"
else
  echo "⚠️  Chrome not found. Trying to use Puppeteer's bundled Chromium..."
  export CHROME_PATH=""
fi

# Check if credentials are set
if [ -z "$TEST_EMAIL" ] || [ -z "$TEST_PASSWORD" ]; then
  echo "❌ ERROR: TEST_EMAIL and TEST_PASSWORD must be set"
  echo ""
  echo "Set them before running:"
  echo "  export TEST_EMAIL=\"your-email@example.com\""
  echo "  export TEST_PASSWORD=\"your-password\""
  echo "  npm run lighthouse"
  exit 1
fi

echo ""
echo "Running Lighthouse CI..."
echo ""

# Run Lighthouse CI
lhci autorun

