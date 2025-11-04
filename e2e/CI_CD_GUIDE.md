# CI/CD Integration for Screenshot Tests

## Overview

Screenshot tests are fully integrated with GitHub Actions and will run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

## What Happens in CI

### Automatic Setup

The workflow ([.github/workflows/screenshots.yml](../.github/workflows/screenshots.yml)) automatically:

1. **Sets up Java 17** → Firebase emulators can run
2. **Installs Firebase CLI** → Emulator management
3. **Installs dependencies** → Node packages and Playwright
4. **Builds the app** → Production build for testing
5. **Runs screenshot tests** → With Firebase emulators
6. **Uploads results** → Test reports and diff images

### Firebase Emulators in CI

✅ **CI uses Firebase Local Emulator Suite** (real Firebase SDK)

Because Java is installed in the CI environment, your tests will run with:
- Real Firebase behavior
- Seeded data in actual Firestore emulator
- Most realistic testing possible

### Fallback Behavior

If Java setup fails for any reason:
- ⚠️ Automatically falls back to mocked Firebase
- ✅ Tests still run successfully
- 📝 You'll see a warning in the logs

## CI Workflow Structure

```yaml
jobs:
  screenshot_tests:
    name: Visual Regression Tests
    runs-on: ubuntu-latest

    steps:
      1. Checkout code
      2. Setup Node.js 22.x
      3. Setup Java 17 (for emulators)
      4. Install Firebase CLI
      5. Install npm dependencies
      6. Install Playwright browsers
      7. Build application
      8. Run screenshot tests
      9. Upload test results
      10. Comment on PR with results
```

## Test Results

### When Tests Pass ✅

The PR will get a comment:

```markdown
## ✅ Screenshot Tests Passed

All visual regression tests passed successfully! No unexpected UI changes detected.
```

### When Tests Fail ❌

The PR will get a detailed comment:

```markdown
## 📸 Screenshot Tests Failed

Visual regression tests have detected differences. Please review:

1. Check the test report
2. Download the `screenshot-diffs` artifact to see differences
3. If changes are intentional, update baselines with: `npm run test:screenshots:update`

**Note:** This is expected for new features or intentional UI changes.
```

## Artifacts

### Test Reports

Uploaded on every run:
- **playwright-report/** - HTML test report with all results
- Retention: 30 days

### Screenshot Diffs

Uploaded on failure:
- **test-results/** - All test artifacts
- **e2e/**/*-actual.png** - Actual screenshots
- **e2e/**/*-diff.png** - Diff images
- Retention: 30 days

## Updating Baselines in CI

### Method 1: Commit Message

Include `[update-screenshots]` in your commit message:

```bash
git commit -m "feat: redesign dashboard layout [update-screenshots]"
git push
```

The workflow will:
1. Run tests with `--update-snapshots`
2. Commit updated baselines
3. Push changes back to the branch

### Method 2: Manual Dispatch

1. Go to Actions tab in GitHub
2. Select "Screenshot Tests" workflow
3. Click "Run workflow"
4. Choose the branch
5. Run the "Update Screenshot Baselines" job

### Method 3: Local Update

Update baselines locally and commit:

```bash
# Update baselines
npm run test:screenshots:update

# Commit changes
git add e2e/**/*.png
git commit -m "chore: update screenshot baselines"
git push
```

## Environment Variables

The CI workflow uses these environment variables:

```yaml
env:
  CI: true                                  # Enables CI mode in Playwright
  NODE_ENV: production                      # Production build
  PLAYWRIGHT_BASE_URL: http://localhost:3000 # Test server URL
```

## Timeouts

- **Job timeout**: 30 minutes
- **Test timeout**: 30 seconds per test (configured in playwright.config.ts)
- **Web server timeout**: 120 seconds

## Parallelization

- **Workers**: Uses all available CPU cores (default Playwright behavior)
- **Projects**: Tests run for each configured viewport (Desktop, Tablet, Mobile)
- **Typical runtime**: ~10-15 minutes for 380+ tests

## Troubleshooting CI Failures

### Tests timeout in CI

Increase timeout in [playwright.config.ts](../playwright.config.ts):

```typescript
export default defineConfig({
  timeout: 60 * 1000, // 60 seconds instead of 30
});
```

### Emulators fail to start

Check the CI logs for Java setup:

```yaml
- name: Setup Java (for Firebase emulators)
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '17'
```

If this fails, tests will automatically fall back to mocked Firebase.

### Different screenshots in CI vs local

This can happen due to:
- Different fonts
- Different system rendering
- Timing differences

**Solution**: Always generate baselines in CI or use the same OS locally.

### Out of disk space

CI has limited disk space. If you hit limits:
- Reduce screenshot retention days
- Clean up old artifacts
- Use selective testing for large PRs

## Cost Optimization

### Free Tier Limits

GitHub Actions free tier:
- **Public repos**: Unlimited minutes
- **Private repos**: 2,000 minutes/month

### Reducing CI Time

1. **Skip on draft PRs**:
   ```yaml
   if: github.event.pull_request.draft == false
   ```

2. **Run only on changed files**:
   ```yaml
   paths:
     - 'src/**'
     - 'e2e/**'
     - 'package.json'
   ```

3. **Use workflow concurrency**:
   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true
   ```

## Security

### Secrets

No secrets required! The workflow uses:
- ✅ `GITHUB_TOKEN` - Automatically provided
- ✅ Public repository access
- ✅ No Firebase production credentials

### Permissions

Minimal permissions required:

```yaml
permissions:
  contents: read        # Read code
  pull-requests: write  # Comment on PRs
```

## Integration with Other Workflows

### Existing Workflows

Your repository has these workflows:
- **ci.yml** - Unit tests with Jest
- **lighthouse.yml** - Performance testing
- **screenshots.yml** - Visual regression (this workflow)
- **codex-review.yml** - Code review automation

### Combined Status Checks

All workflows must pass for PR merging. Configure branch protection:

1. Go to Settings → Branches
2. Add branch protection rule for `main`
3. Require status checks:
   - ✅ Visual Regression Tests
   - ✅ Unit Tests
   - ✅ Lighthouse

## Best Practices

### ✅ DO

1. **Always update baselines** after intentional UI changes
2. **Review diffs carefully** before updating baselines
3. **Use descriptive commit messages** when updating baselines
4. **Test locally first** before pushing
5. **Keep tests fast** (< 30 seconds per test)
6. **Use selective testing** for large changesets

### ❌ DON'T

1. **Don't ignore test failures** without investigation
2. **Don't update baselines blindly** in CI
3. **Don't commit temporary files** (e.g., *-actual.png, *-diff.png)
4. **Don't run tests on every commit** (use draft PRs for WIP)
5. **Don't store large artifacts** for extended periods

## Monitoring

### GitHub Actions Dashboard

Monitor test runs:
1. Go to Actions tab
2. Filter by workflow: "Screenshot Tests"
3. View run history and trends

### Metrics to Track

- **Pass rate**: Should be > 95%
- **Runtime**: Should be < 15 minutes
- **Flakiness**: Tests should not fail randomly

### Alerts

Set up notifications:
1. Watch repository
2. Custom → Workflows
3. Get notified on failures

## Example CI Run

Successful run output:

```
🔧 Setting up Firebase emulators for tests...
🚀 Starting Firebase emulators...
.....
✅ Firebase emulators ready!
✅ Firebase emulators ready for tests

Running 384 tests using 7 workers

  ✓ 380 tests passed
  ✘ 4 tests failed (expected for new features)

Test run completed in 12m 34s
```

## Next Steps

1. **Push a change** to trigger the workflow
2. **Review the PR comment** with test results
3. **Download artifacts** if tests fail
4. **Update baselines** if changes are intentional

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Screenshot Testing Guide](README.md)
- [Firebase Emulator Guide](EMULATOR_SETUP_GUIDE.md)

## Support

If you encounter issues:
1. Check the [GitHub Actions logs](https://github.com/mesbahtanvir/focus-notebook/actions)
2. Review this guide
3. Check [troubleshooting section](#troubleshooting-ci-failures)
4. Open an issue with the workflow run URL

---

Your screenshot tests are now fully integrated with CI/CD! 🚀
