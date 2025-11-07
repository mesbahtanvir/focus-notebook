# Comprehensive Codebase Cleanup Plan

## Overview

This document outlines immediate actions to clean up the codebase based on your requests:
1. Remove excessive README files
2. Move expensive GitHub Actions to local machine
3. Remove Lighthouse CI infrastructure
4. Clarify mobile/responsive design (no native iOS/Android apps)

---

## 1. README File Cleanup

### Current State
**7 README files** found across the codebase - many are redundant or outdated.

### Files to KEEP (2 files)
1. `/README.md` - Main project documentation (KEEP)
2. `/functions/README.md` - Firebase Functions setup guide (KEEP)

### Files to DELETE (5 files)
3. `/docs/README.md` - Redundant index file (info already in main README)
4. `/docs/archive/README.md` - Just says "archived docs" - not useful
5. `/e2e/README.md` - 562 lines! Way too detailed, info should be in code comments
6. `/src/__tests__/lib/firebase/README.md` - Too specific, belongs in code comments
7. `/src/store/README.md` - 350 lines! Architecture docs should be consolidated

### Recommended Action
```bash
# Delete redundant READMEs
rm /docs/README.md
rm /docs/archive/README.md
rm /e2e/README.md
rm /src/__tests__/lib/firebase/README.md
rm /src/store/README.md
```

**Savings**: 5 fewer files, ~1,500 lines of documentation removed

**Result**: Only 2 essential READMEs remain (root + functions)

---

## 2. Move Expensive GitHub Actions to Local

### Current Expensive Actions

#### A. **Screenshot Tests** (~20 min per run)
- Builds entire app
- Installs Playwright + Chrome
- Runs 140+ visual regression tests
- Uploads artifacts

**Move to Local**:
```bash
# Run screenshot tests locally before pushing
npm run test:screenshots

# Only update baselines when needed
npm run test:screenshots:update
```

**GitHub Actions Change**:
```yaml
# Remove from ci.yml or make it manual-only
# Only run on manual dispatch, not on every PR/push
```

#### B. **Lighthouse Performance Audits** (~15 min per run)
- Installs Chrome + Lighthouse CLI
- Tests 30 pages
- Generates performance reports
- Currently runs DAILY + after every CI run

**Move to Local**:
```bash
# Run Lighthouse locally when needed
npm run lighthouse:single
```

**GitHub Actions Change**:
```yaml
# Change to manual-only trigger in lighthouse.yml
on:
  workflow_dispatch:  # Manual only
  # Remove: schedule (daily)
  # Remove: workflow_run (after CI)
```

#### C. **Integration Tests** (~5 min per run)
- Starts Firebase emulators
- Runs integration test suite
- Heavy setup for each run

**Move to Local**:
```bash
# Run integration tests locally
firebase emulators:start --only functions
npm run test:integration
```

### Updated GitHub Actions Strategy

**What GitHub Actions SHOULD Do** (fast validation only):
- ✅ Linting (< 1 min)
- ✅ Type checking (< 1 min)
- ✅ Unit tests (< 2 min)
- ✅ Build verification (< 3 min)
- ✅ Security audit (< 1 min)
- ✅ Deploy on main branch

**What You Do Locally** (expensive operations):
- 🏠 Screenshot tests
- 🏠 Lighthouse performance audits
- 🏠 Integration tests
- 🏠 E2E tests

**Estimated Savings**:
- Current: ~25-30 min per PR
- After: ~8-10 min per PR
- **Reduction: ~65-70%**

---

## 3. Remove Lighthouse CI Infrastructure

### What is `lhci_reports`?

`lhci_reports` is the output directory for Lighthouse CI (LHCI) performance audit reports. Lighthouse measures:
- Page load performance
- Accessibility
- Best practices
- SEO scores
- Progressive Web App compliance

**Current Setup**:
- Runs 30 pages through Lighthouse
- Generates HTML/JSON reports
- Stores in `/lhci_reports` directory
- Uploads as GitHub Actions artifacts
- Retention: 30 days

**Why Remove It?**
1. **Expensive**: 15 minutes per run, runs daily + after CI
2. **Overkill**: Most projects don't need daily performance audits
3. **Better alternatives**: Run locally when needed, use browser DevTools

### Files to DELETE

```bash
# Lighthouse CI configuration
rm lighthouserc.js
rm lighthouserc.public.json
rm run-lighthouse.sh
rm puppeteer-login.js  # If it exists

# Lighthouse workflow
rm .github/workflows/lighthouse.yml

# Documentation
rm docs/archive/LIGHTHOUSE_LOCAL.md

# Output directory (if exists)
rm -rf lhci_reports/
```

### Package.json Cleanup

Remove Lighthouse dependencies:
```bash
npm uninstall @lhci/cli
```

Remove from `package.json` scripts:
- `lighthouse:single`

### .gitignore Update

Remove these lines (no longer needed):
```
lhci_reports/
.lighthouseci/
```

**Savings**:
- 6-7 files removed
- ~440 min/month GitHub Actions time saved
- 1 fewer npm dependency

**Alternative**: Keep for local use if you want occasional audits:
```bash
# Manual local Lighthouse (no LHCI needed)
npx lighthouse https://focus.yourthoughts.ca --view
```

---

## 4. iOS/Android Clarification

### Finding: NO Native Mobile Apps

After searching the codebase, there is **NO iOS or Android native code**.

**What you have**:
- ✅ Responsive web design (mobile-friendly)
- ✅ Mobile viewport testing (Playwright)
- ✅ Tablet & mobile screenshot baselines
- ✅ PWA capabilities (can install on mobile)

**What "mobile" refers to**:
- `*-mobile-*.png` screenshot baselines = **responsive breakpoints**, not native apps
- Tests for iPhone 13 (390x844) and Tablet (1024x768) viewports
- Mobile-first CSS design patterns

### Files with "mobile" in name

All are **screenshot test baselines** for responsive design testing:
```
e2e/*/snapshots/*-mobile-*.png  (140+ files)
```

These are NOT native mobile app assets. They're visual regression test screenshots for responsive web layouts.

### No Action Needed

There's nothing to remove - your app is web-only with responsive design, which is correct!

---

## 5. Implementation Plan

### Phase 1: Immediate Cleanup (30 minutes)

```bash
# 1. Delete redundant READMEs
git rm docs/README.md \
  docs/archive/README.md \
  e2e/README.md \
  src/__tests__/lib/firebase/README.md \
  src/store/README.md

# 2. Delete Lighthouse CI infrastructure
git rm lighthouserc.js \
  lighthouserc.public.json \
  run-lighthouse.sh \
  .github/workflows/lighthouse.yml \
  docs/archive/LIGHTHOUSE_LOCAL.md

# 3. Remove Lighthouse dependency
npm uninstall @lhci/cli

# 4. Update package.json (remove lighthouse:single script)
# Edit manually or use sed

# 5. Commit changes
git add -A
git commit -m "chore: remove excessive documentation and Lighthouse CI infrastructure

- Remove 5 redundant README files (keep only root + functions)
- Remove Lighthouse CI workflow and configuration
- Remove @lhci/cli dependency
- Lighthouse audits can now be run locally when needed

Estimated savings: ~440 min/month GitHub Actions time"
```

### Phase 2: Update GitHub Actions (30 minutes)

Edit `.github/workflows/ci.yml`:

```yaml
# Change screenshot tests to manual-only
on:
  workflow_dispatch:  # Add manual trigger
  pull_request:  # Keep for PRs
    branches: [main, develop]
    paths:  # NEW: Only run on relevant changes
      - 'src/**'
      - 'app/**'
      - 'components/**'
      - 'e2e/**'
      - 'package*.json'
  # Remove: push trigger (no need to run twice)
```

Make integration tests conditional:

```yaml
integration_tests:
  # Only run on main branch, not PRs
  if: github.ref == 'refs/heads/main'
```

**Commit**:
```bash
git add .github/workflows/ci.yml
git commit -m "chore: optimize GitHub Actions for cost savings

- Screenshot tests only on PRs with relevant file changes
- Integration tests only on main branch
- Remove duplicate push triggers

Estimated savings: ~600 min/month"
```

### Phase 3: Local Development Scripts (15 minutes)

Create `.github/LOCAL_DEVELOPMENT.md`:

```markdown
# Local Development Workflows

## Before Pushing Code

Run these locally to catch issues before CI:

### Quick Validation (2 min)
\`\`\`bash
npm run lint && npm run type-check && npm test
\`\`\`

### Full Validation (10 min)
\`\`\`bash
# Run all tests
npm run test:ci

# Build verification
npm run build

# Screenshot tests (if UI changes)
npm run test:screenshots
\`\`\`

### Performance Audit (when needed)
\`\`\`bash
# Local Lighthouse
npx lighthouse https://localhost:3000 --view
\`\`\`

## CI/CD Strategy

**GitHub Actions** (fast validation):
- Linting
- Type checking
- Unit tests
- Build verification

**Local** (expensive operations):
- Screenshot tests
- Integration tests
- Performance audits
\`\`\`
```

---

## 6. Summary of Changes

### Files to Delete (11 files)
- 5 README files
- 5 Lighthouse CI files
- 1 Lighthouse workflow

### Packages to Uninstall
- `@lhci/cli`

### GitHub Actions Changes
- Screenshot tests: PR-only with path filters
- Lighthouse: REMOVED
- Integration tests: main-only

### Monthly Savings
| Item | Current | After | Savings |
|------|---------|-------|---------|
| GitHub Actions | ~3,150 min | ~750 min | **-76%** |
| Documentation files | 7 READMEs | 2 READMEs | **-71%** |
| npm dependencies | 1 unused | 0 unused | **Clean** |

### One-Time Effort
- Phase 1: 30 minutes (file cleanup)
- Phase 2: 30 minutes (workflow updates)
- Phase 3: 15 minutes (local scripts)
- **Total: 75 minutes**

---

## 7. Post-Cleanup Workflow

### Developer Workflow

**Before pushing code**:
```bash
# Quick checks (2 min)
npm run lint
npm run test

# If you changed UI
npm run test:screenshots
```

**GitHub Actions will**:
- Lint & type check (~1 min)
- Run unit tests (~2 min)
- Verify build (~3 min)
- Deploy if on main (~5 min)

**Total CI time**: ~10 minutes (down from 25-30 minutes)

### When to Run Locally

- **Screenshot tests**: Before any UI PR
- **Integration tests**: Before major feature PR
- **Lighthouse**: Before performance-related releases
- **Full suite**: Before releases to main

---

## 8. Questions & Answers

### Q: Will this reduce code quality?

**A**: No! You'll still run all the same tests - just locally instead of on every GitHub Actions run. This actually:
- ✅ Catches issues faster (no waiting for CI)
- ✅ Saves money on GitHub Actions
- ✅ Reduces notification noise

### Q: What if I forget to run tests locally?

**A**:
- Core validation (lint, tests, build) still runs in CI
- Add a pre-push git hook if needed
- Screenshot tests can remain in CI on PRs (with path filters)

### Q: Can I still run Lighthouse?

**A**: Yes! Just run locally:
```bash
# Option 1: Built-in Chrome DevTools
# Open DevTools > Lighthouse tab > Generate report

# Option 2: CLI
npx lighthouse https://your-site.com --view
```

### Q: Will removing READMEs hurt new developers?

**A**: No - you're removing redundant docs, not essential ones:
- Main README stays (setup, features, architecture)
- Functions README stays (Firebase setup)
- Code comments and inline docs remain
- Most README content was duplicated or outdated

---

## 9. Next Steps

1. **Review this plan** - Make sure you agree with the changes
2. **Run Phase 1** - Delete files and commit
3. **Run Phase 2** - Update GitHub Actions
4. **Test locally** - Verify your local workflow
5. **Monitor savings** - Check GitHub Actions usage after 1 week

---

## 10. Rollback Plan

If you need to undo these changes:

```bash
# Restore deleted files
git revert <commit-hash>

# Reinstall Lighthouse
npm install -D @lhci/cli

# Restore workflows
git checkout main -- .github/workflows/
```

All changes are in git history and can be easily restored.

---

**Ready to proceed? Let me know if you want me to implement Phase 1 now!**
