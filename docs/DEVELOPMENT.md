# Local Development Workflow

This guide explains the optimized local development workflow that reduces GitHub Actions costs while maintaining code quality.

## 🎯 Philosophy

**Run expensive tests locally, use GitHub Actions for fast validation.**

GitHub Actions is now optimized to run only fast validation checks (~8-10 min per PR). All expensive operations (screenshot tests, integration tests, performance audits) should be run locally before pushing.

---

## ⚡ Quick Pre-Push Checklist

Before pushing code, run this locally:

```bash
# Basic validation (2-3 minutes)
npm run lint && npm test && npm run build
```

If you changed UI or added features:

```bash
# Add screenshot tests (5-10 minutes)
npm run test:screenshots
```

---

## 🧪 Running Tests Locally

### Unit Tests (Fast)

```bash
# Run all unit tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run only changed tests
npm run test:changed

# Run tests since main branch
npm run test:since

# Run with coverage
npm run test:ci
```

### Screenshot Tests (Slow - Run When Needed)

```bash
# Run all screenshot tests
npm run test:screenshots

# Interactive UI mode (recommended for development)
npm run test:screenshots:ui

# Debug mode (step through tests)
npm run test:screenshots:debug

# Update baselines (after intentional UI changes)
npm run test:screenshots:update
```

**When to run screenshot tests:**
- ✅ Before submitting PRs with UI changes
- ✅ After updating component styles
- ✅ After changing layouts or responsive design
- ❌ Not needed for backend/logic changes

### Integration Tests (Slow - Run When Needed)

```bash
# Start Firebase emulators
firebase emulators:start --only auth,firestore,functions

# In another terminal, run integration tests
npm run test:integration  # If this script exists
```

**When to run integration tests:**
- ✅ Before major feature PRs
- ✅ Before releases to main
- ✅ After changing Firebase functions
- ❌ Not needed for UI-only changes

---

## 🏗️ Building Locally

```bash
# Development server (with hot reload)
npm run dev

# Production build (verifies build succeeds)
npm run build

# Run production build locally
npm run start
```

**Always verify build succeeds before pushing:**
```bash
npm run build
```

---

## 🎨 Linting & Type Checking

```bash
# Run ESLint
npm run lint

# Run TypeScript type check
npx tsc --noEmit

# Run both
npm run lint && npx tsc --noEmit
```

**Auto-fix linting issues:**
```bash
npx eslint . --fix
```

---

## 📊 Performance Audits (Optional)

### Lighthouse (No Installation Needed)

**Option 1: Chrome DevTools (Recommended)**
1. Open your app in Chrome
2. Open DevTools (F12)
3. Go to "Lighthouse" tab
4. Click "Generate report"

**Option 2: CLI (If Needed)**
```bash
# Install temporarily (not saved to package.json)
npx lighthouse https://localhost:3000 --view

# Or test production
npx lighthouse https://focus.yourthoughts.ca --view
```

**When to run Lighthouse:**
- ✅ Before performance-related releases
- ✅ After major UI refactors
- ✅ Quarterly performance checks
- ❌ Not needed for every PR

---

## 🤖 What GitHub Actions Does

GitHub Actions now runs ONLY fast validation checks:

### On Every PR & Push
- ✅ Linting (~1 min)
- ✅ Type checking (~1 min)
- ✅ Unit tests (~2 min)
- ✅ Build verification (~3 min)
- ✅ Security audit (~1 min)

**Total: ~8-10 minutes**

### On PRs with UI Changes
- ✅ Screenshot tests (if `src/`, `app/`, `components/`, or `e2e/` files changed)

**Total: ~20 minutes**

### On Main Branch Only
- ✅ Integration tests (Firebase emulators)
- ✅ Deploy to production

**Total: ~15 minutes**

### Never (Removed)
- ❌ Lighthouse CI (now run locally)
- ❌ Duplicate Node version testing (now only 22.x)
- ❌ Redundant push triggers

---

## 🚀 Recommended Workflow

### For Small Changes (Bug Fixes, Minor Updates)

```bash
# 1. Make your changes
# 2. Run quick checks
npm run lint && npm test

# 3. Verify build
npm run build

# 4. Push
git push
```

**GitHub Actions will handle the rest** (~8 min)

---

### For UI Changes

```bash
# 1. Make your changes
# 2. Test in browser
npm run dev

# 3. Run screenshot tests
npm run test:screenshots:ui

# 4. Update baselines if changes are intentional
npm run test:screenshots:update

# 5. Run quick checks
npm run lint && npm test

# 6. Push
git push
```

**GitHub Actions will run screenshot tests** (~20 min)

---

### For Major Features

```bash
# 1. Make your changes
# 2. Test locally
npm run dev

# 3. Run all tests
npm test
npm run test:screenshots

# 4. Start Firebase emulators and test integration
firebase emulators:start --only auth,firestore,functions

# 5. Verify production build
npm run build

# 6. Optional: Run Lighthouse
npx lighthouse https://localhost:3000 --view

# 7. Push
git push
```

---

## 💡 Tips & Tricks

### Git Pre-Push Hook (Optional)

Add this to `.git/hooks/pre-push` to automatically run checks:

```bash
#!/bin/bash
echo "Running pre-push checks..."
npm run lint && npm test && npm run build
```

Make it executable:
```bash
chmod +x .git/hooks/pre-push
```

### Skip CI for Documentation Changes

```bash
# Add [skip ci] to commit message
git commit -m "docs: update README [skip ci]"
```

### VS Code Integration

Install these extensions for faster feedback:
- **ESLint** - Shows linting errors in editor
- **TypeScript** - Shows type errors inline
- **Jest** - Run tests from editor

### Faster Screenshot Tests

```bash
# Run specific test file
npx playwright test e2e/dashboard.spec.ts

# Run tests matching a pattern
npx playwright test --grep "mobile"

# Run in headed mode (see browser)
npx playwright test --headed
```

---

## 📈 Expected Time Savings

| Task | Before | After | Savings |
|------|--------|-------|---------|
| **Quick PR (no UI)** | 25 min | 8 min | **-68%** |
| **UI Change PR** | 25 min | 20 min | **-20%** |
| **Main Branch Push** | 30 min | 15 min | **-50%** |
| **Monthly Total** | 3,150 min | 750 min | **-76%** |

---

## ❓ FAQ

### Q: Will this reduce code quality?

**A:** No! You're running the same tests, just locally instead of in CI. This actually:
- ✅ Catches issues faster (no waiting for CI)
- ✅ Saves GitHub Actions credits
- ✅ Reduces notification noise

### Q: What if I forget to run tests?

**A:**
- Core validation still runs in CI (lint, test, build)
- Add a git pre-push hook (see above)
- CI will catch issues, but faster to catch locally

### Q: Can I still use GitHub Actions for everything?

**A:** Yes, but it will use more credits. Current setup:
- **Free tier:** 2,000 min/month
- **Old usage:** 3,150 min/month (over limit)
- **New usage:** ~750 min/month (well under limit)

### Q: How do I run tests in parallel?

**A:** Screenshot tests already run in parallel (Playwright handles this). For unit tests:
```bash
npm test -- --maxWorkers=4
```

---

## 🎓 Learning Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)

---

## 📝 Summary

**Before pushing code:**
1. Run `npm run lint && npm test && npm run build` (always)
2. Run `npm run test:screenshots` (if UI changed)
3. Run integration tests manually (if major feature)

**GitHub Actions will:**
- Run fast validation checks automatically
- Run screenshot tests on UI changes
- Deploy on main branch

**Result:**
- ✅ 76% reduction in GitHub Actions usage
- ✅ Faster feedback loop (local testing)
- ✅ Same code quality guarantees
- ✅ Under free tier limit

---

**Questions or issues?** Open an issue on GitHub or check the [main README](README.md).
