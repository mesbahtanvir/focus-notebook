# Test Documentation - Import/Export System

## Overview

Comprehensive unit tests for the import/export system, covering all services with extensive edge case testing.

## Test Coverage

### Summary Statistics
- **Total Test Files**: 5
- **Total Test Suites**: 4 services + utilities
- **Total Test Cases**: 150+
- **Code Coverage Target**: >80%

## Test Files

### 1. ValidationService Tests
**File**: `src/__tests__/services/import-export/ValidationService.test.ts`
**Test Cases**: 35+

#### Test Categories:
- ✅ **validate()** - Main validation function
  - Valid data validation
  - Invalid data rejection
  - Metadata validation
  - Entity collection validation
  - Empty collections
  - Minimal valid data

- ✅ **validateMetadata()** - Metadata validation
  - Version checking
  - ExportedAt field
  - Missing metadata detection
  - Unsupported version warnings

- ✅ **Entity Validation** - Per-entity type validation
  - Task validation (title, done, status)
  - Project validation (title required)
  - Goal validation (title required)
  - Thought validation (text required)
  - Mood validation (value required, range checking)
  - Focus session validation (duration, tasks array)
  - Person validation (name required)

- ✅ **Utility Functions**
  - Data size calculation
  - Import time estimation
  - Edge cases (null, undefined, non-arrays)

#### Key Scenarios Tested:
```typescript
✓ Validates correct data successfully
✓ Rejects data with missing metadata
✓ Rejects data with missing data object
✓ Validates minimal valid data
✓ Handles empty entity collections
✓ Warns about unsupported versions
✓ Rejects entities without required fields
✓ Warns about invalid field types
✓ Calculates data size correctly
✓ Estimates import time based on item count and size
```

### 2. ConflictDetectionService Tests
**File**: `src/__tests__/services/import-export/ConflictDetectionService.test.ts`
**Test Cases**: 40+

#### Test Categories:
- ✅ **detectConflicts()** - Main conflict detection
  - No conflicts when data is clean
  - Duplicate ID detection
  - Broken reference detection
  - Conflict categorization

- ✅ **detectDuplicateIds()** - Duplicate detection
  - Duplicate task IDs
  - Duplicate across all entity types
  - Conflict message generation
  - Suggested resolution (SKIP)

- ✅ **detectBrokenReferences()** - Reference validation
  - Broken projectId in tasks
  - Broken thoughtId in tasks
  - Broken goalId in projects
  - Broken parentProjectId in projects
  - Broken linkedTaskIds in thoughts
  - Broken linkedProjectIds in thoughts
  - Broken linkedMoodIds in thoughts
  - Broken linkedThoughtIds in people

- ✅ **Helper Functions**
  - isBlockingConflict() - Identifies blocking conflicts
  - getConflictsNeedingResolution() - Filters unresolved conflicts

- ✅ **Edge Cases**
  - Missing reference fields
  - Circular references
  - Empty arrays in reference fields

#### Key Scenarios Tested:
```typescript
✓ Detects no conflicts when data is clean
✓ Detects duplicate ID conflicts with proper messages
✓ Identifies broken references as blocking conflicts
✓ Handles circular references gracefully
✓ Filters conflicts needing resolution
✓ Categorizes conflicts by type
✓ Generates proper conflict messages
✓ Handles empty entity collections
```

### 3. ReferenceMappingService Tests
**File**: `src/__tests__/services/import-export/ReferenceMappingService.test.ts`
**Test Cases**: 45+

#### Test Categories:
- ✅ **buildRelationshipMap()** - Relationship mapping
  - Complete relationship map creation
  - Task-to-project mapping
  - Task-to-thought mapping
  - Project-to-goal mapping
  - Project-to-parent mapping
  - Thought-to-task mapping
  - Thought-to-project mapping
  - Empty collection handling

- ✅ **buildDependencyGraph()** - Graph construction
  - All entities as nodes
  - Edges for dependencies
  - Entity type mapping

- ✅ **determineImportOrder()** - Import ordering
  - Correct dependency ordering
  - Goals before projects
  - Projects before tasks
  - Thoughts before tasks
  - Only includes types with items

- ✅ **createIdMapping()** - ID mapping
  - Preserve IDs when requested
  - Generate new IDs when needed
  - Bidirectional mapping
  - Only maps selected items
  - Empty selection handling

- ✅ **updateReferences()** - Reference updates
  - Task reference updates
  - Project reference updates
  - Thought reference updates
  - Mood metadata updates
  - Preserves unmapped references
  - Empty mapping handling

- ✅ **Dependency Validation**
  - hasDependencies() - Detects dependencies
  - getDependencies() - Returns dependency list
  - validateDependencies() - Validates satisfaction

- ✅ **Edge Cases**
  - Circular references
  - Undefined references
  - Empty arrays

#### Key Scenarios Tested:
```typescript
✓ Builds complete relationship map with all mappings
✓ Creates dependency graph with correct edges
✓ Determines correct import order (goals → projects → tasks)
✓ Preserves or generates IDs as requested
✓ Updates all references with new IDs
✓ Creates bidirectional ID mappings
✓ Validates dependency satisfaction
✓ Handles circular references without crashing
✓ Handles undefined and empty references
```

### 4. ExportService Tests
**File**: `src/__tests__/services/import-export/ExportService.test.ts`
**Test Cases**: 30+

#### Test Categories:
- ✅ **exportAll()** - Full export
  - Exports all data with metadata
  - Calculates total items correctly
  - Calculates entity counts correctly
  - Handles empty collections

- ✅ **exportWithFilters()** - Filtered export
  - Filters by entity types
  - Filters tasks by status
  - Filters tasks by category
  - Filters tasks by tags
  - Excludes completed items
  - Filters by date range
  - Filters projects by status
  - Filters goals by status
  - Filters thoughts by tags
  - Multiple simultaneous filters
  - No matches scenario

- ✅ **exportSelected()** - Selection export
  - Exports only selected items
  - Handles empty selection
  - Handles non-existent IDs

- ✅ **exportByDateRange()** - Date-based export
  - Exports items within range
  - No matches handling
  - Focus sessions by startTime

- ✅ **downloadAsJson()** - Download functionality
  - Triggers download with default filename
  - Uses custom filename
  - Creates blob and anchor element

- ✅ **Edge Cases**
  - Missing createdAt fields
  - Undefined optional fields
  - Partial entity collections
  - Very large date ranges

#### Key Scenarios Tested:
```typescript
✓ Exports all data with correct metadata
✓ Filters by multiple criteria simultaneously
✓ Exports only selected items by ID
✓ Filters by date range correctly
✓ Downloads JSON file with proper filename
✓ Handles empty collections
✓ Handles missing fields gracefully
✓ Calculates counts correctly
```

### 5. Mock Data & Utilities
**File**: `src/__tests__/utils/mockData.ts`

#### Provided Mock Data:
- ✅ **mockMetadata** - Valid export metadata
- ✅ **mockGoals** - Sample goals
- ✅ **mockProjects** - Sample projects with relationships
- ✅ **mockTasks** - Sample tasks with various states
- ✅ **mockThoughts** - Sample thoughts with links
- ✅ **mockMoods** - Sample mood entries
- ✅ **mockEntityCollection** - Complete collection
- ✅ **mockExportedData** - Full export data structure
- ✅ **invalidData** - For validation testing
- ✅ **duplicateIdData** - For conflict testing
- ✅ **emptyEntityCollection** - Empty data set
- ✅ **minimalValidData** - Minimal valid structure

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test ValidationService.test.ts
npm test ConflictDetectionService.test.ts
npm test ReferenceMappingService.test.ts
npm test ExportService.test.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests for Specific Service
```bash
npm test -- ValidationService
```

## Test Structure

### Typical Test Pattern
```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
  });

  describe('methodName', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = {...};

      // Act
      const result = service.method(input);

      // Assert
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      // Test edge case
    });
  });
});
```

## Coverage Goals

### Target Coverage by Service
- **ValidationService**: >85% coverage
  - All validation methods tested
  - All entity types covered
  - Edge cases included

- **ConflictDetectionService**: >90% coverage
  - All conflict types tested
  - All entity relationships covered
  - Edge cases included

- **ReferenceMappingService**: >85% coverage
  - All mapping methods tested
  - Dependency graph fully tested
  - Edge cases included

- **ExportService**: >80% coverage
  - All export methods tested
  - All filter types covered
  - Edge cases included

## Test Principles

### 1. Arrange-Act-Assert Pattern
All tests follow the AAA pattern:
```typescript
it('should validate correct data', () => {
  // Arrange - Set up test data
  const testData = mockExportedData;

  // Act - Execute the method
  const result = service.validate(testData);

  // Assert - Verify the outcome
  expect(result.isValid).toBe(true);
});
```

### 2. Descriptive Test Names
Test names clearly describe what is being tested:
- ✅ `'should validate correct data successfully'`
- ✅ `'should detect duplicate ID conflicts'`
- ✅ `'should handle empty entity collections'`

### 3. Comprehensive Edge Cases
Each service includes edge case testing:
- Null/undefined inputs
- Empty collections
- Missing fields
- Invalid data types
- Circular references
- Boundary values

### 4. Isolated Tests
Each test is independent:
- No shared state between tests
- `beforeEach` sets up fresh instances
- Mock data doesn't mutate

### 5. Realistic Test Data
Mock data represents real-world scenarios:
- Valid entity relationships
- Realistic field values
- Edge cases based on actual use

## Common Assertions

### Validation Tests
```typescript
expect(result.isValid).toBe(true);
expect(result.errors).toHaveLength(0);
expect(result.errors.some(e => e.field === 'fieldName')).toBe(true);
expect(result.errors.some(e => e.severity === 'error')).toBe(true);
```

### Conflict Tests
```typescript
expect(result.totalConflicts).toBe(expected);
expect(result.hasBlockingConflicts).toBe(true);
expect(result.conflicts.some(c => c.type === ConflictType.DUPLICATE_ID)).toBe(true);
```

### Mapping Tests
```typescript
expect(map.taskToProject.get('task-1')).toBe('project-1');
expect(map.importOrder).toContain('goals');
expect(mapping.oldToNew.get('old-id')).toBe('new-id');
```

### Export Tests
```typescript
expect(result.metadata).toBeDefined();
expect(result.data.tasks?.length).toBe(expected);
expect(result.metadata.totalItems).toBe(calculated);
```

## Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
```

### Pre-commit Hook
```bash
#!/bin/sh
npm test
```

## Future Test Additions

### Planned Tests
1. **ImportService Tests** - Test import execution with progress
2. **Component Tests** - React component testing
3. **Integration Tests** - End-to-end import/export flows
4. **Performance Tests** - Large dataset handling
5. **Hook Tests** - useImportExport hook testing

### Component Testing
- ImportProgressModal rendering
- EntityPreviewTable interactions
- ConflictResolutionPanel state
- Modal workflows

### Integration Testing
- Complete import flow
- Complete export flow
- Progress tracking
- Error handling

## Troubleshooting

### Tests Failing
1. **Check mock data** - Ensure mock data matches expected structure
2. **Check imports** - Verify all imports are correct
3. **Check Jest config** - Ensure Jest is configured properly
4. **Check dependencies** - Ensure all test dependencies installed

### Coverage Not Meeting Goals
1. **Add edge cases** - Include more boundary conditions
2. **Test error paths** - Ensure error handling is tested
3. **Test async code** - Use async/await properly
4. **Test all branches** - Ensure all if/else paths tested

## Best Practices

### DO:
- ✅ Write descriptive test names
- ✅ Test one thing per test
- ✅ Use arrange-act-assert pattern
- ✅ Test edge cases
- ✅ Keep tests isolated
- ✅ Use meaningful assertions

### DON'T:
- ❌ Test implementation details
- ❌ Share state between tests
- ❌ Write flaky tests
- ❌ Skip edge cases
- ❌ Ignore test failures
- ❌ Write tests without assertions

## Summary

The test suite provides comprehensive coverage of the import/export system's core functionality:

- **150+ test cases** covering all major services
- **Extensive edge case testing** for robustness
- **Realistic mock data** for accurate testing
- **Clear test structure** for maintainability
- **High coverage goals** (>80%) for quality

All tests follow best practices and provide confidence in the system's reliability.
