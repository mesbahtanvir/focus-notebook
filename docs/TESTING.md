# Testing Guide

This document outlines the comprehensive testing strategy and practices for the Personal Notebook application.

## Table of Contents
- [Testing Philosophy](#testing-philosophy)
- [Testing Stack](#testing-stack)
- [Test Organization](#test-organization)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

## Testing Philosophy

Our testing approach follows these principles:

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Write Tests First**: Consider TDD for critical features
3. **Maintain High Coverage**: Aim for >80% coverage on core functionality
4. **Fast Feedback Loop**: Tests should run quickly
5. **Clear Test Names**: Test names should describe the behavior being tested

## Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing (user-centric)
- **@testing-library/react-hooks**: Hook testing
- **@testing-library/user-event**: User interaction simulation
- **MSW (Mock Service Worker)**: API mocking (when needed)

## Test Organization

```
src/
├── __tests__/
│   ├── integration/          # Integration tests
│   │   ├── task-workflow.test.tsx
│   │   ├── focus-session-workflow.test.tsx
│   │   └── sync-workflow.test.tsx
│   └── e2e/                  # End-to-end tests (future)
├── store/
│   └── __tests__/            # Store unit tests
│       ├── useTasks.test.ts
│       ├── useFocus.test.ts
│       ├── useThoughts.test.ts
│       └── useMoods.test.ts
├── lib/
│   └── __tests__/            # Utility function tests
│       ├── syncEngine.test.ts
│       └── formatDateTime.test.ts
└── components/
    └── __tests__/            # Component tests
        ├── FocusSession.test.tsx
        └── TaskList.test.tsx
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test src/store/__tests__/useTasks.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="Task Creation"

# Run tests for changed files only
npm test -- --onlyChanged

# Update snapshots (use carefully)
npm test -- -u

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Writing Tests

### Unit Tests

Located in `src/__tests__/`, organized by component or module:

- **Component Tests**: `Sidebar.test.tsx`, `page.test.tsx`
- **Store Tests**: `useTasks.test.ts`, `useThoughts.test.ts`, `useRequestLog.test.ts`
- **Utility Tests**: `cloudSync.test.ts`
- **Integration Tests**: `integration.test.tsx`

### Test Coverage

Current test suites cover:

1. **UI Components**
   - Sidebar navigation
   - Page rendering
   - User interactions

2. **State Management (Zustand)**
   - Task management (CRUD operations)
   - Thought management with CBT processing
   - Request logging and queue management

3. **Cloud Sync**
   - Firebase authentication checks
   - Request lifecycle tracking
   - Error handling

4. **Integration Workflows**
   - Complete user workflows (thought → CBT → processed)
   - Request queue management
   - Store interactions

## Mocking Strategy

### Firebase

Firebase is mocked in `jest.setup.ts` to prevent actual Firebase initialization during tests:

```typescript
jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: null, ... },
  db: {},
  googleProvider: {},
}))
```

### AuthContext

The auth context is mocked to provide controlled user states:

```typescript
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  }),
}))
```

### IndexedDB

IndexedDB is disabled in tests since we're testing logic, not persistence:

```typescript
Object.defineProperty(global, 'indexedDB', {
  writable: true,
  value: undefined,
})
```

## Writing New Tests

### Component Test Template

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    render(<MyComponent />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Assert expected behavior
  });
});
```

### Store Test Template

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyStore } from '@/store/useMyStore';

describe('useMyStore', () => {
  beforeEach(() => {
    // Clear store state
    const { result } = renderHook(() => useMyStore());
    act(() => {
      result.current.clearState();
    });
  });

  it('performs action', async () => {
    const { result } = renderHook(() => useMyStore());
    
    await act(async () => {
      await result.current.performAction();
    });

    expect(result.current.state).toBeDefined();
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clear Setup**: Use `beforeEach` to reset state
3. **Descriptive Names**: Test names should describe behavior
4. **Act Pattern**: Wrap state changes in `act()`
5. **Async Handling**: Use `async/await` for async operations
6. **Mock External Dependencies**: Don't test third-party libraries
7. **Test User Behavior**: Focus on what users do, not implementation

## Common Issues

### "Cannot find module" errors

Make sure path aliases in `jest.config.js` match `tsconfig.json`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

### Firebase initialization errors

Ensure Firebase is mocked in `jest.setup.ts` before any tests run.

### State not updating

Wrap state changes in `act()`:

```typescript
await act(async () => {
  await result.current.someAction();
});
```

## CI/CD Integration

Tests run automatically in CI pipeline:

```yaml
- name: Run tests
  run: npm test -- --ci --coverage
```

## Future Improvements

- [ ] Add visual regression tests with Playwright
- [ ] Increase code coverage to 90%+
- [ ] Add E2E tests for critical user paths
- [ ] Add performance benchmarks
- [ ] Test accessibility compliance
- [ ] Add snapshot tests for complex UI

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
