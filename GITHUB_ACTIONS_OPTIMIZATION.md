# GitHub Actions Optimization Guide

## Current Credit Usage Analysis

### Workflows Running:
1. **CI/CD Pipeline** (`ci.yml`) - Runs on every PR and push to main/develop
2. **Lighthouse CI** (`lighthouse.yml`) - Runs daily + after CI completes + manual
3. **Screenshot Tests** (`screenshots.yml`) - Runs on every PR and push

### Estimated Monthly Runtime (assuming 30 PRs + 30 pushes):
- **CI/CD**: ~60 runs × 25 minutes = **1,500 minutes/month**
- **Lighthouse**: ~30 runs × 15 minutes = **450 minutes/month**
- **Screenshots**: ~60 runs × 20 minutes = **1,200 minutes/month**
- **TOTAL**: ~**3,150 minutes/month** (~52 hours)

---

## 🚀 QUICK WINS (Reduce by 50-60%)

### 1. Remove Duplicate Node Version Testing (Save ~750 min/month)

**Current Issue**: CI runs tests on BOTH Node 20.x and 22.x
- This literally **doubles** your runtime for the validate_web job

**Fix**: Only test on Node 22.x (your production version)

**Impact**: ⚡ **50% faster CI** for web validation

### 2. Make Lighthouse Manual-Only (Save ~440 min/month)

**Current Issue**:
- Runs daily at 3 AM (30 runs/month)
- ALSO runs after every CI completion (redundant)

**Fix**: Only run on manual trigger or weekly schedule

**Impact**: ⚡ **~97% reduction** in Lighthouse runs

### 3. Screenshot Tests Only on PRs (Save ~600 min/month)

**Current Issue**: Runs on BOTH PRs AND pushes to main/develop

**Fix**: Only run on PRs (pushes to main already tested via PR)

**Impact**: ⚡ **50% fewer** screenshot test runs

### 4. Reduce Artifact Retention (No runtime saved, but storage cost)

**Current Issue**:
- Coverage reports: 30 days
- Build artifacts: 7-30 days
- Lighthouse reports: 30 days
- Screenshots: 30 days

**Fix**: Reduce to 7 days (or 3 days for most)

**Impact**: 💾 Lower storage costs

---

## 💰 MEDIUM EFFORT OPTIMIZATIONS (Save 15-25%)

### 5. Skip Tests for Documentation-Only Changes

Add path filters to skip CI for doc changes:

```yaml
on:
  pull_request:
    branches: [main, develop]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/**'
      - '!.github/workflows/**'
```

**Impact**: ⚡ Skip ~10-15% of runs

### 6. Run Only Changed Tests on PRs

You already have this in `test:ci:changed` but functions still run all tests.

**Fix**: Add changed-file detection for functions tests too

**Impact**: ⚡ **30-50% faster test runs** on PRs

### 7. Parallelize Jobs Better

**Current Issue**: `integration_tests` waits for ALL jobs to complete

**Fix**: Only require `validate_functions` to complete (not web)

**Impact**: ⚡ Save 2-5 minutes per run

### 8. Cache Playwright Browsers

**Current Issue**: Screenshot workflow reinstalls Playwright browsers every time

**Fix**: Cache the browser binaries

**Impact**: ⚡ Save 1-2 minutes per run

### 9. Skip Lighthouse on Non-UI Changes

Add path filters to Lighthouse workflow:

```yaml
on:
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types: [completed]
    branches: [main]
    paths:
      - 'app/**'
      - 'components/**'
      - 'public/**'
```

**Impact**: ⚡ Skip ~30% of Lighthouse runs

---

## 🎯 ADVANCED OPTIMIZATIONS (Save 10-20%)

### 10. Use Turborepo/Nx for Caching

Cache build outputs between runs using remote caching.

**Impact**: ⚡ 30-50% faster builds on cache hits

### 11. Run Linting Separately from Tests

**Current Issue**: If lint fails, you still wait for it before tests fail

**Fix**: Run lint + typecheck + tests in parallel

**Impact**: ⚡ Fail faster, save credits on failed runs

### 12. Conditional Job Execution

Only run integration tests on main branch pushes, not PRs:

```yaml
if: github.ref == 'refs/heads/main'
```

**Impact**: ⚡ Skip integration tests on PRs

### 13. Reduce Build Artifacts

**Current Issue**: Uploading entire `.next` folder (large)

**Fix**: Only upload standalone build or skip artifacts on PRs

**Impact**: 💾 Faster artifact upload/download

---

## 📊 ESTIMATED SAVINGS

| Optimization | Time Saved/Month | Difficulty | Priority |
|--------------|------------------|------------|----------|
| Remove Node 20.x matrix | 750 min | Easy | ⭐⭐⭐ |
| Lighthouse manual-only | 440 min | Easy | ⭐⭐⭐ |
| Screenshots PR-only | 600 min | Easy | ⭐⭐⭐ |
| Skip doc changes | 150 min | Easy | ⭐⭐ |
| Changed tests only | 200 min | Medium | ⭐⭐ |
| Cache Playwright | 60 min | Easy | ⭐ |
| Integration tests conditional | 120 min | Medium | ⭐⭐ |
| Parallel lint/test | 80 min | Medium | ⭐ |

**Total Potential Savings**: ~2,400 minutes/month (~75% reduction!)

**New Estimated Monthly Usage**: ~750 minutes (~12.5 hours)

---

## 🚦 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Immediate (5 minutes to implement)
1. Change Node matrix from `[20.x, 22.x]` → `[22.x]`
2. Change Lighthouse schedule from daily → weekly
3. Remove `workflow_run` trigger from Lighthouse
4. Change screenshot workflow to `pull_request` only (remove `push`)

**Expected Savings**: ~1,790 minutes/month (57%)

### Phase 2: Quick Wins (30 minutes to implement)
5. Add path filters to skip doc changes
6. Reduce artifact retention to 7 days
7. Cache Playwright browsers
8. Make integration tests conditional on main only

**Expected Savings**: Additional ~330 minutes/month (10%)

### Phase 3: Medium Effort (2-4 hours)
9. Improve changed-file test detection for functions
10. Parallelize lint/typecheck/test jobs
11. Add path filters to Lighthouse

**Expected Savings**: Additional ~280 minutes/month (9%)

---

## 🛠️ QUICK IMPLEMENTATION

Would you like me to implement Phase 1 optimizations right now? This would:

✅ **Save ~1,800 minutes/month** (60% reduction)
✅ **Take 5 minutes** to implement
✅ **Zero risk** - just removing redundancy

The changes would be:
1. `ci.yml` line 20: Change `[20.x, 22.x]` → `[22.x]`
2. `lighthouse.yml` lines 4-14: Change to weekly + manual only
3. `screenshots.yml` lines 9-12: Remove push trigger

**Alternative: Disable Workflows Temporarily**

If you want IMMEDIATE credit savings while we optimize:
- Disable `lighthouse.yml` entirely (save 450 min/month)
- Disable screenshot tests on pushes (save 600 min/month)
- Keep only CI on PRs

This gives you instant relief while we implement proper optimizations.

---

## 📝 OTHER CONSIDERATIONS

### Free Tier Limits
- GitHub Free: 2,000 minutes/month for private repos
- Current usage: ~3,150 minutes (over limit)
- After Phase 1: ~750 minutes (well under limit)

### Test Quality vs Speed Trade-offs
- Removing Node 20.x: Low risk (you deploy on 22.x)
- Screenshots PR-only: Low risk (main is already tested)
- Lighthouse weekly: Low risk (performance doesn't change daily)
- Integration tests conditional: Medium risk (PRs not fully tested)

### What NOT to Skip
- Unit tests (critical for catching bugs)
- Type checking (prevents runtime errors)
- Build verification (ensures deployability)
- Security audits (prevents vulnerabilities)
