# Testing Guide for AI Processing System

## Overview

This document describes the testing strategy for the AI thought processing system, including unit tests, integration tests, and CI/CD validation.

---

## Cloud Functions Tests

### Location
`functions/src/__tests__/`

### Running Tests

```bash
cd functions
npm install
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

Target coverage: 70% for all metrics (branches, functions, lines, statements)

### Unit Tests

#### 1. Action Processor (`utils/actionProcessor.test.ts`)

**Tests:**
- ✅ Auto-apply high confidence actions (95%+)
- ✅ Create suggestions for medium confidence (70-94%)
- ✅ Ignore low confidence actions (<70%)
- ✅ Prevent duplicate tags
- ✅ Handle entity tag linking (goal, project, person)
- ✅ Build complete update object with all fields
- ✅ Add "processed" tag automatically
- ✅ Preserve existing tags while adding new ones
- ✅ Count changes correctly (text + tags)

**Run specific test:**
```bash
npm test actionProcessor.test.ts
```

#### 2. Context Gatherer (`utils/contextGatherer.test.ts`)

**Tests:**
- ✅ Format context with all sections
- ✅ Handle empty context gracefully
- ✅ Handle partial context
- ✅ Limit tasks to 10 in output
- ✅ Handle missing optional fields

**Run specific test:**
```bash
npm test contextGatherer.test.ts
```

#### 3. OpenAI Client (`utils/openaiClient.test.ts`)

**Tests:**
- ✅ Call OpenAI API with correct parameters
- ✅ Handle markdown-wrapped JSON responses
- ✅ Handle non-markdown JSON responses
- ✅ Throw error on API failure
- ✅ Throw error on invalid JSON response
- ✅ Throw error when no response content
- ✅ Include context in prompt

**Run specific test:**
```bash
npm test openaiClient.test.ts
```

---

## Frontend Tests

### Location
`src/__tests__/aiProcessing/`

### Running Tests

```bash
# From project root
npm test aiProcessing
```

### Manual Edit Tracking (`manualEditTracking.test.ts`)

**Tests:**
- ✅ Track text edits after AI processing
- ✅ Track tag additions after AI processing
- ✅ Track tag removals after AI processing
- ✅ NOT track edits for thoughts without AI processing
- ✅ Track both text and tag edits together

**Example:**
```typescript
// AI processes thought
thought.text = "Enhanced by AI"
thought.aiAppliedChanges = { textEnhanced: true, ... }

// User edits manually
updateThought({ text: "User edited" })

// System tracks manual edit
thought.manualEdits = {
  textEditedAfterAI: true,
  lastManualEditAt: "2025-01-15T..."
}
```

---

## Integration Tests

### Firebase Emulator Tests

Test cloud functions with Firebase emulator:

```bash
# Start emulator
cd functions
npm run serve

# In another terminal, run integration tests
npm run test:integration
```

### Manual Integration Testing

#### 1. Test Auto-Processing

1. Start Firebase emulator
2. Create a new thought in Firestore
3. Check that `processNewThought` function triggers
4. Verify thought is updated with:
   - Enhanced text
   - Added tags
   - AI suggestions
   - Processing history

#### 2. Test Manual Processing

```bash
# Call function directly
firebase functions:shell
> manualProcessThought({thoughtId: 'test-thought-id'})
```

#### 3. Test Reprocess with Revert

```bash
> reprocessThought({thoughtId: 'test-thought-id', revertFirst: true})
```

#### 4. Test Revert

```bash
> revertThoughtProcessing({thoughtId: 'test-thought-id'})
```

---

## GitHub Actions CI/CD

### Workflow: Cloud Functions CI

**File:** `.github/workflows/cloud-functions-ci.yml`

**Triggers:**
- Pull requests affecting `functions/**`
- Pushes to `main` branch

**Jobs:**

#### 1. Lint and Test
- ✅ TypeScript type checking
- ✅ Run unit tests with coverage
- ✅ Upload coverage to Codecov

#### 2. Build
- ✅ Build TypeScript to JavaScript
- ✅ Verify build artifacts exist

#### 3. Security Check
- ✅ Run `npm audit`
- ✅ Check for hardcoded secrets/API keys

#### 4. Validate Config
- ✅ Check required files exist
- ✅ Validate environment variables documented

#### 5. Integration Test (Emulator)
- ✅ Start Firebase emulator
- ✅ Run integration tests

#### 6. Notify on Failure
- ✅ Comment on PR if CI fails

### Viewing CI Results

1. Go to GitHub repository
2. Click "Actions" tab
3. View workflow runs

### Required Secrets

None required for testing (uses mock OpenAI key)

For deployment:
- `FIREBASE_TOKEN` (for production deployments)

---

## Testing Best Practices

### 1. Test Structure

```typescript
describe('Component/Feature', () => {
  beforeEach(() => {
    // Setup
    jest.clearAllMocks();
  });

  it('should do something specific', () => {
    // Arrange
    const input = {...};

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### 2. Mocking Firebase

```typescript
// Mock Firestore
jest.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: jest.fn(),
    doc: jest.fn()
  })
}));
```

### 3. Mocking OpenAI API

```typescript
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    choices: [{ message: { content: '...' } }]
  })
});
```

### 4. Testing Async Functions

```typescript
it('should handle async operations', async () => {
  await act(async () => {
    await asyncFunction();
  });

  expect(result).toBeDefined();
});
```

---

## Coverage Goals

### Cloud Functions
- **Target:** 70% coverage minimum
- **Current:** Run `npm run test:coverage` to see

**Coverage by file:**
- `actionProcessor.ts`: 90%+
- `contextGatherer.ts`: 85%+
- `openaiClient.ts`: 80%+
- `processThought.ts`: 70%+ (integration tested)

### Frontend
- **Target:** 80% coverage for AI processing features
- **Current:** Run `npm test -- --coverage` to see

---

## Running All Tests

### Quick Test (Unit Only)

```bash
# Cloud functions
cd functions && npm test

# Frontend
npm test aiProcessing
```

### Full Test Suite

```bash
# Cloud functions with coverage
cd functions
npm run test:coverage

# Frontend with coverage
npm test -- --coverage

# Integration tests with emulator
cd functions
npm run serve &
sleep 10
npm run test:integration
```

### Pre-Deployment Checklist

- [ ] All unit tests pass (`npm test`)
- [ ] Coverage meets 70% threshold
- [ ] Integration tests pass with emulator
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No hardcoded secrets
- [ ] GitHub Actions CI passes

---

## Debugging Failed Tests

### 1. View detailed output

```bash
npm test -- --verbose
```

### 2. Run single test file

```bash
npm test actionProcessor.test.ts
```

### 3. Watch mode (auto-rerun on changes)

```bash
npm run test:watch
```

### 4. Debug with breakpoints

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then attach debugger from VS Code.

---

## Adding New Tests

### For Cloud Functions

1. Create test file: `functions/src/__tests__/myFeature.test.ts`
2. Import function to test
3. Write test cases
4. Run `npm test` to verify

### For Frontend

1. Create test file: `src/__tests__/aiProcessing/myFeature.test.ts`
2. Mock Firebase dependencies
3. Write test cases with React Testing Library
4. Run `npm test myFeature` to verify

---

## CI/CD Integration

### Local Pre-Commit Check

Install pre-commit hook:

```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
cd functions && npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed, commit aborted"
  exit 1
fi
echo "✅ Tests passed"
```

### Pull Request Checks

All PRs must pass:
1. Unit tests
2. Type checking
3. Build verification
4. Security audit

### Deployment Pipeline

```
PR Created → CI Tests → Manual Review → Merge → Deploy to Staging → Integration Tests → Deploy to Production
```

---

## Troubleshooting

### "Cannot find module" errors

```bash
cd functions
rm -rf node_modules package-lock.json
npm install
```

### "TypeError: fetch is not defined"

Add global fetch mock:
```typescript
global.fetch = jest.fn();
```

### Firebase emulator won't start

```bash
# Kill existing processes
lsof -ti:9099 | xargs kill -9

# Restart
firebase emulators:start --only functions
```

### Tests timeout

Increase timeout in jest.config.js:
```javascript
testTimeout: 10000  // 10 seconds
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [GitHub Actions](https://docs.github.com/en/actions)
