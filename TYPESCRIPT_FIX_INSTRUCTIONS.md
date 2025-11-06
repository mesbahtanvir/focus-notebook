# Fix for TypeScript Error: Cannot find module 'react-plaid-link'

## The Issue

You're seeing this error:
```
src/components/spending/PlaidLinkButton.tsx:9:71 - error TS2307: Cannot find module 'react-plaid-link'
```

## Root Cause

The `react-plaid-link` package is properly defined in `package.json`, but your local `node_modules` may be out of sync with the latest changes.

## Solution

Run these commands in your terminal from the project root:

```bash
# Pull the latest changes from the remote branch
git pull origin claude/unified-spending-tool-mvp-011CUrKhKLQhyW1xaWH2bvWs

# Remove node_modules and package-lock.json to start fresh
rm -rf node_modules package-lock.json

# Reinstall all dependencies
npm install

# Verify TypeScript compilation
npx tsc --noEmit
```

## What This Does

1. **git pull**: Gets the latest package.json with react-plaid-link dependency
2. **rm -rf node_modules package-lock.json**: Clears any corrupted or cached installations
3. **npm install**: Reinstalls all packages from scratch
4. **npx tsc --noEmit**: Verifies TypeScript can find all modules

## Verification

After running these commands, you should see:
- No output from `npx tsc --noEmit` (meaning no errors)
- `node_modules/react-plaid-link/` directory exists
- TypeScript can import from 'react-plaid-link'

## Alternative Quick Fix (If Above Doesn't Work)

If you're still seeing the error, try:

```bash
# Install react-plaid-link explicitly
npm install react-plaid-link@4.1.1

# Clear TypeScript cache
rm -rf node_modules/.cache

# Try compilation again
npx tsc --noEmit
```

## Note

The `react-plaid-link` package includes its own TypeScript definitions, so you should **NOT** install `@types/react-plaid-link`. If you have it installed, remove it:

```bash
npm uninstall @types/react-plaid-link
```
