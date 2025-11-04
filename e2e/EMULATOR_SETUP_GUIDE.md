# Firebase Emulator Setup for Screenshot Testing

## Overview

Focus Notebook screenshot tests use the **Firebase Local Emulator Suite** instead of mocking Firebase. This provides:

- **Real Firebase behavior** - Not mocked, actual Firebase SDK
- **Fast tests** - Local, no network latency
- **Consistent data** - Isolated test database
- **No quotas** - No production limits
- **Works offline** - No internet required
- **Easy debugging** - Web UI at http://localhost:4000

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Playwright Tests                      │
│  (e2e/*.spec.ts using fixtures/global-setup.ts)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Emulator Suite                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Emulator│  │   Firestore  │  │  Web UI      │  │
│  │ Port: 9099   │  │   Port: 8080 │  │  Port: 4000  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               Next.js Test App                           │
│        (Points to localhost emulators)                   │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Initialize Emulators (One-time)

The emulators are already configured in [firebase.json](../firebase.json):

```json
{
  "emulators": {
    "auth": {
      "port": 9099,
      "host": "localhost"
    },
    "firestore": {
      "port": 8080,
      "host": "localhost"
    },
    "ui": {
      "enabled": true,
      "port": 4000,
      "host": "localhost"
    }
  }
}
```

### 3. Run Screenshot Tests

```bash
# Emulators start automatically when tests run
npm run test:screenshots

# Or with UI
npm run test:screenshots:ui
```

That's it! The emulators start automatically before tests and clean up after.

## How It Works

### Global Setup (Automatic)

When you run tests, [playwright.config.ts](../playwright.config.ts) triggers:

1. **globalSetup** ([e2e/setup/emulator-setup.ts](setup/emulator-setup.ts))
   - Starts Auth and Firestore emulators
   - Waits for emulators to be ready
   - Clears any existing data

2. **Test Fixture** ([e2e/fixtures/global-setup.ts](fixtures/global-setup.ts))
   - Configures Firebase SDK to use emulators
   - Creates test user in Auth emulator
   - Seeds baseline data into Firestore emulator
   - Each test gets isolated, consistent data

3. **globalTeardown** ([e2e/setup/emulator-teardown.ts](setup/emulator-teardown.ts))
   - Clears emulator data after all tests
   - Emulators keep running (can be reused)

### Test Execution Flow

```typescript
// Each test automatically gets:

1. Firebase connects to localhost emulators (not production)
2. Test user created: demo@focusnotebook.com
3. Baseline data seeded:
   - 12 tasks (today's, upcoming, completed, recurring)
   - 5 thoughts (journal entries)
   - 5 goals (active and completed)
   - 4 projects
   - 10 focus sessions
4. Time mocked to: 2024-01-15 10:00:00 AM
5. Page navigates with all data ready
6. Screenshot taken with consistent state
```

## Emulator Management

### Manual Start/Stop

```bash
# Start emulators manually (useful for development)
firebase emulators:start --only auth,firestore

# Stop emulators
firebase emulators:stop

# Or use Ctrl+C in the terminal
```

### View Emulator UI

When emulators are running, open:

**http://localhost:4000**

This shows:
- All test users in Auth
- All documents in Firestore
- Real-time updates during tests
- Data export/import tools

### Check if Running

```bash
# Check emulator status
curl http://localhost:4000

# Or in tests
await areEmulatorsRunning() // returns boolean
```

### Clear Data Manually

```bash
# In browser
curl -X DELETE http://localhost:8080/emulator/v1/projects/demo-test/databases/(default)/documents
curl -X DELETE http://localhost:9099/emulator/v1/projects/demo-test/accounts

# Or programmatically
import { clearEmulatorData } from './e2e/setup/emulator-setup';
await clearEmulatorData();
```

## Configuration

### Firebase Emulator Ports

From [firebase.json](../firebase.json):

| Emulator  | Port | URL                        |
|-----------|------|----------------------------|
| Auth      | 9099 | http://localhost:9099      |
| Firestore | 8080 | http://localhost:8080      |
| UI        | 4000 | http://localhost:4000      |

### Next.js App Configuration

The app automatically detects emulators via [e2e/setup/emulator-data.ts](setup/emulator-data.ts):

```typescript
// Injected into each test page
window.__USE_FIREBASE_EMULATORS__ = true;
window.__EMULATOR_CONFIG__ = {
  auth: { host: 'localhost', port: 9099 },
  firestore: { host: 'localhost', port: 8080 },
};

// Firebase SDK connects to emulators
firebase.auth().useEmulator('http://localhost:9099');
firebase.firestore().useEmulator('localhost', 8080);
```

## Baseline Data

### What's Included

Each test gets realistic baseline data from [fixtures/baseline-data.ts](fixtures/baseline-data.ts):

**Tasks (12 total)**
- 3 due today
- 2 upcoming
- 2 completed
- 3 recurring (daily, workweek, weekly)
- 2 backlog

**Thoughts (5 total)**
- Recent journal entries
- Mix of personal and work reflections

**Goals (5 total)**
- Active goals with progress
- Completed goals
- Various categories (Health, Career, Learning)

**Projects (4 total)**
- Active and completed
- Realistic task counts

**Focus Sessions (10 total)**
- Recent Pomodoro sessions
- Varied tasks and durations

### Data Generation

```typescript
// From fixtures/baseline-data.ts
export function generateBaselineData(userId: string): BaselineData {
  // All dates relative to test time: 2024-01-15 10:00 AM
  // All data internally consistent
  // All IDs deterministic for screenshot comparison
}
```

### Seeding Data

```typescript
// Automatic in global fixture
await seedDataToEmulator(page, {
  tasks: baselineData.tasks,
  thoughts: baselineData.thoughts,
  goals: baselineData.goals,
  projects: baselineData.projects,
  focusSessions: baselineData.focusSessions,
});
```

## Writing Tests with Emulators

### Example Test

```typescript
import { test, gotoPage } from './fixtures/global-setup';
import { takeScreenshot } from './helpers/screenshot';

test('dashboard shows tasks', async ({ page }) => {
  // Navigate - data already loaded in emulator
  await gotoPage(page, '/dashboard');

  // Screenshot with real data from emulator
  await takeScreenshot(page, {
    name: 'dashboard-with-tasks',
    fullPage: true,
  });
});
```

### Custom Data for Specific Tests

```typescript
import { seedDataToEmulator } from './setup/emulator-data';

test('empty state', async ({ page }) => {
  // Seed empty data
  await seedDataToEmulator(page, {
    tasks: [],
    thoughts: [],
    goals: [],
  });

  await gotoPage(page, '/tools/tasks');
  await takeScreenshot(page, { name: 'tasks-empty' });
});
```

### Modifying Data During Tests

```typescript
test('create task', async ({ page }) => {
  await gotoPage(page, '/tools/tasks');

  // Interact with real Firebase
  await page.click('[data-testid="add-task"]');
  await page.fill('input[name="title"]', 'New task');
  await page.click('[data-testid="save"]');

  // Data saved to emulator, persists in test
  await takeScreenshot(page, { name: 'task-created' });
});
```

## Troubleshooting

### Emulators Won't Start

```bash
# Check if ports are already in use
lsof -i :9099
lsof -i :8080
lsof -i :4000

# Kill processes using these ports
kill -9 <PID>

# Or restart your computer
```

### Data Not Appearing in Tests

```typescript
// Add logging to debug
import { exportEmulatorData } from './setup/emulator-data';

test('debug data', async ({ page }) => {
  await gotoPage(page, '/tools/tasks');

  // Export and log current data
  const data = await exportEmulatorData(page);
  console.log('Emulator data:', JSON.stringify(data, null, 2));
});
```

### Tests Timeout

```typescript
// Increase wait time for emulator sync
import { waitForEmulatorSync } from './setup/emulator-data';

await waitForEmulatorSync(page, 15000); // 15 seconds
```

### Screenshots Show Loading Spinners

```typescript
// Ensure all loading completes
import { waitForAllLoadingComplete } from './helpers/sync';

await gotoPage(page, '/dashboard');
await waitForAllLoadingComplete(page);
await page.waitForTimeout(1000); // Extra safety
```

### Emulator UI Shows Wrong Data

```bash
# Clear and restart
firebase emulators:stop
rm -rf .firebase/emulators-data
firebase emulators:start --only auth,firestore
```

## Comparison: Emulators vs Mocking

| Aspect | Firebase Emulators | Mocking |
|--------|-------------------|---------|
| **Realism** | Real Firebase SDK behavior | Approximation |
| **Speed** | Fast (localhost) | Faster (in-memory) |
| **Debugging** | Web UI, real data | Console logs only |
| **Data Persistence** | Yes (during test run) | No |
| **Real-time Listeners** | Work correctly | Need manual triggers |
| **Setup Complexity** | Moderate (one-time) | Low |
| **Maintenance** | Low | High (keep mocks updated) |

**Verdict:** Emulators provide better test accuracy with minimal performance cost.

## CI/CD Integration

### GitHub Actions

The emulators work in CI automatically:

```yaml
# .github/workflows/screenshots.yml
- name: Run screenshot tests
  run: npm run test:screenshots
  # Emulators start automatically, no extra setup needed
```

### Environment Variables

```bash
# Optional: Override emulator ports
export FIRESTORE_EMULATOR_HOST=localhost:8080
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

## Performance

### Typical Test Run

- **Emulator startup**: ~3-5 seconds (one-time)
- **Data seeding**: ~100-200ms per test
- **Test execution**: Same as before
- **Teardown**: ~500ms

### Optimization Tips

```typescript
// Reuse emulator across test runs (default behavior)
// Don't stop emulators after tests

// Share baseline data across tests (automatic)
// Use global fixture for common setup

// Only seed data you need for specific tests
await seedDataToEmulator(page, {
  tasks: [], // Skip if test doesn't need tasks
});
```

## Best Practices

### ✅ DO:

1. **Use global fixture** for most tests (automatic setup)
2. **Let emulators run** between test runs (faster)
3. **Check emulator UI** when debugging data issues
4. **Seed consistent data** for reliable screenshots
5. **Use realistic data** from baseline-data.ts

### ❌ DON'T:

1. **Point tests to production** - Always use emulators
2. **Manually start/stop** emulators for each test
3. **Seed random data** - Use deterministic baseline
4. **Skip loading waits** - Firebase needs sync time
5. **Share emulators** across projects (use different ports)

## Advanced Usage

### Custom Emulator Configuration

```typescript
// e2e/setup/emulator-setup.ts
export const CUSTOM_CONFIG: EmulatorConfig = {
  auth: { host: 'localhost', port: 9199 },
  firestore: { host: 'localhost', port: 8180 },
  ui: { host: 'localhost', port: 4100 },
};
```

### Multiple Test Users

```typescript
import { createTestUser } from './setup/emulator-data';

test('multi-user scenario', async ({ page }) => {
  // Create first user
  await createTestUser(page, {
    uid: 'user-1',
    email: 'user1@test.com',
  });

  // Create second user
  await createTestUser(page, {
    uid: 'user-2',
    email: 'user2@test.com',
  });

  // Switch between users in test
});
```

### Export/Import Emulator Data

```typescript
import { exportEmulatorData } from './setup/emulator-data';

// Export current state
const data = await exportEmulatorData(page);

// Save to file
fs.writeFileSync('test-data.json', JSON.stringify(data, null, 2));

// Import later
const data = JSON.parse(fs.readFileSync('test-data.json'));
await seedDataToEmulator(page, data);
```

## Resources

### Documentation

- [Firebase Emulator Suite Docs](https://firebase.google.com/docs/emulator-suite)
- [Playwright Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Baseline Data Guide](BASELINE_DATA_GUIDE.md)
- [Sync Handling Guide](SYNC_HANDLING_GUIDE.md)

### Files

- [firebase.json](../firebase.json) - Emulator configuration
- [e2e/setup/emulator-setup.ts](setup/emulator-setup.ts) - Start/stop emulators
- [e2e/setup/emulator-data.ts](setup/emulator-data.ts) - Seed data
- [e2e/fixtures/global-setup.ts](fixtures/global-setup.ts) - Test fixture
- [e2e/fixtures/baseline-data.ts](fixtures/baseline-data.ts) - Test data

### Commands

```bash
# Run tests
npm run test:screenshots

# Run with UI
npm run test:screenshots:ui

# Update baselines
npm run test:screenshots:update

# Debug mode
npm run test:screenshots:debug

# Manual emulator control
firebase emulators:start --only auth,firestore
firebase emulators:stop
```

## Summary

Firebase Local Emulator Suite provides:

1. **Realistic testing** - Real Firebase SDK
2. **Fast execution** - Local, no network
3. **Consistent data** - Same baseline every time
4. **Easy debugging** - Web UI at localhost:4000
5. **Automatic setup** - Just run tests
6. **CI/CD ready** - Works in GitHub Actions

**Just run your tests** - emulators handle the rest!
