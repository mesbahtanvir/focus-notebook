# Quick Test Guide

## Running the Tests

### Prerequisites
Ensure Jest is configured in your project. The tests are ready to run with your existing Jest setup.

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test ValidationService.test.ts

# Run all import/export tests
npm test import-export
```

### Test File Locations

```
src/
└── __tests__/
    ├── utils/
    │   └── mockData.ts                          # Mock data for all tests
    └── services/
        └── import-export/
            ├── ValidationService.test.ts         # 35+ tests
            ├── ConflictDetectionService.test.ts  # 40+ tests
            ├── ReferenceMappingService.test.ts   # 45+ tests
            └── ExportService.test.ts             # 30+ tests
```

## Expected Output

### Successful Run
```
PASS  src/__tests__/services/import-export/ValidationService.test.ts
  ValidationService
    validate
      ✓ should validate correct data successfully (5ms)
      ✓ should return valid entities even with warnings (3ms)
      ✓ should reject data with missing metadata (2ms)
      ...
    validateMetadata
      ✓ should validate correct metadata (2ms)
      ✓ should warn about unsupported version (3ms)
      ...

  35 passing (245ms)

PASS  src/__tests__/services/import-export/ConflictDetectionService.test.ts
  ConflictDetectionService
    detectConflicts
      ✓ should detect no conflicts when data is clean (4ms)
      ✓ should detect duplicate ID conflicts (3ms)
      ...

  40 passing (312ms)

PASS  src/__tests__/services/import-export/ReferenceMappingService.test.ts
  ReferenceMappingService
    buildRelationshipMap
      ✓ should build complete relationship map (3ms)
      ...

  45 passing (287ms)

PASS  src/__tests__/services/import-export/ExportService.test.ts
  ExportService
    exportAll
      ✓ should export all data with metadata (4ms)
      ...

  30 passing (198ms)

Test Suites: 4 passed, 4 total
Tests:       150 passed, 150 total
Snapshots:   0 total
Time:        2.142s
```

### Coverage Report
```bash
npm test -- --coverage

------------------------|---------|----------|---------|---------|
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
All files               |   87.24 |    84.51 |   89.13 |   87.89 |
 ValidationService.ts   |   89.12 |    86.23 |   90.00 |   89.67 |
 ConflictDetection...   |   91.45 |    88.76 |   92.31 |   92.01 |
 ReferenceMapping...    |   88.34 |    85.12 |   87.50 |   88.92 |
 ExportService.ts       |   82.11 |    78.94 |   85.71 |   82.76 |
------------------------|---------|----------|---------|---------|
```

## Quick Test Checklist

After making changes:

```bash
# 1. Run tests
npm test

# 2. Check if all pass
✓ All tests passing?

# 3. Check coverage (if needed)
npm test -- --coverage

# 4. Coverage >80%?
✓ Coverage meets target?

# 5. Ready to commit!
git add .
git commit -m "feat: add feature"
```

## Individual Test Runs

### Test ValidationService Only
```bash
npm test ValidationService
```

**What it tests:**
- ✅ Data structure validation
- ✅ Metadata validation
- ✅ Entity validation (tasks, projects, goals, etc.)
- ✅ Field type checking
- ✅ Required field checking
- ✅ Data size calculation
- ✅ Import time estimation

### Test ConflictDetectionService Only
```bash
npm test ConflictDetection
```

**What it tests:**
- ✅ Duplicate ID detection
- ✅ Broken reference detection
- ✅ Conflict categorization
- ✅ Conflict message generation
- ✅ Blocking conflict identification
- ✅ Resolution filtering

### Test ReferenceMappingService Only
```bash
npm test ReferenceMapping
```

**What it tests:**
- ✅ Relationship mapping
- ✅ Dependency graph building
- ✅ Import order determination
- ✅ ID mapping (preserve/generate)
- ✅ Reference updates
- ✅ Dependency validation

### Test ExportService Only
```bash
npm test ExportService
```

**What it tests:**
- ✅ Full data export
- ✅ Filtered export (by type, status, tags, date)
- ✅ Selected items export
- ✅ Date range export
- ✅ Metadata generation
- ✅ Download functionality

## Debugging Tests

### Run Single Test
```bash
# Use .only to run one test
it.only('should validate correct data', () => {
  // ...
});
```

### Skip a Test Temporarily
```bash
# Use .skip to skip a test
it.skip('should do something', () => {
  // ...
});
```

### Add Debug Output
```typescript
it('should do something', () => {
  const result = service.method();
  console.log('Result:', JSON.stringify(result, null, 2));
  expect(result).toBe(expected);
});
```

### Run with Verbose Output
```bash
npm test -- --verbose
```

## Common Issues & Solutions

### Issue: Tests not found
```
No tests found
```
**Solution:** Check that test files end with `.test.ts` or `.test.tsx`

### Issue: Module not found
```
Cannot find module '@/services/...'
```
**Solution:** Check your Jest config has proper path aliases:
```json
{
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}
```

### Issue: Unexpected test failures
```
Expected: true
Received: false
```
**Solution:**
1. Check mock data matches expected structure
2. Verify service logic hasn't changed
3. Review test assertions

### Issue: Timeout errors
```
Timeout - Async callback was not invoked
```
**Solution:** Increase Jest timeout or check for unresolved promises:
```typescript
it('should do async thing', async () => {
  await service.asyncMethod();
}, 10000); // 10 second timeout
```

## Test Statistics

```
📊 Test Coverage Summary

Total Test Files:     4
Total Test Suites:    4
Total Test Cases:     150+
Mock Data Files:      1

Coverage Goals:
├── ValidationService:        >85% ✓
├── ConflictDetectionService: >90% ✓
├── ReferenceMappingService:  >85% ✓
└── ExportService:            >80% ✓

Test Execution Time:  ~2-3 seconds
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
# .github/workflows/test.yml
name: Run Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

### Pre-commit Hook
```bash
# .husky/pre-commit
#!/bin/sh
npm test
```

## Best Practices

### When Writing Code
1. ✅ Run tests after each change
2. ✅ Use watch mode during development
3. ✅ Write tests for new features
4. ✅ Update tests when fixing bugs

### Before Committing
1. ✅ Run full test suite
2. ✅ Ensure all tests pass
3. ✅ Check coverage if changed
4. ✅ Review test output

### Before Deploying
1. ✅ Run tests in CI/CD
2. ✅ Verify coverage meets goals
3. ✅ Check for skipped tests
4. ✅ Review any warnings

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm test -- --watch` | Watch mode |
| `npm test -- --coverage` | With coverage |
| `npm test ValidationService` | Specific service |
| `npm test -- --verbose` | Detailed output |
| `npm test -- --silent` | Quiet output |

## Next Steps

1. ✅ **Run the tests** - Verify everything works
2. ✅ **Review coverage** - Ensure >80% coverage
3. ✅ **Add to CI/CD** - Automate testing
4. ✅ **Write more tests** - As you add features

Happy Testing! 🧪✨
