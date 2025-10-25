# 🚀 Refactoring Quick Start Guide

## TL;DR - What You Need to Know

The codebase now uses **Repository Pattern** + **Dependency Injection** for better testability.

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Testing | 50+ lines of mocks | 5 lines of setup |
| Data Access | Direct Firebase calls | Repository abstraction |
| Business Logic | Mixed with data layer | Extracted to services |
| Testability | Hard (requires Firebase mocks) | Easy (use mock repositories) |

## ⚡ Quick Examples

### 1. Write a Test (5 minutes)

```typescript
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { MockAuthService } from '@/repositories/mock/MockAuthService';
import { aTask } from '@/__tests__/utils/builders';

test('should create a task', async () => {
  // Setup
  const authService = new MockAuthService();
  const repository = new MockTaskRepository(authService);
  
  // Test
  const task = aTask().withTitle('Buy milk').build();
  const id = await repository.create(task);
  
  // Verify
  const saved = await repository.getById(id);
  expect(saved?.title).toBe('Buy milk');
});
```

### 2. Use Test Builders (1 minute)

```typescript
// Instead of this verbose setup:
const task = {
  id: '1',
  title: 'Test',
  done: false,
  status: 'active',
  priority: 'medium',
  createdAt: new Date().toISOString(),
  // ... 20 more fields
};

// Just do this:
const task = aTask()
  .withTitle('Test')
  .withPriority('high')
  .asDaily()
  .build();

// Multiple tasks
const tasks = aTask().buildMany(5);
```

### 3. Test Component with DI (3 minutes)

```typescript
import { renderWithProviders } from '@/__tests__/utils/testHelpers';
import { createTestContainer } from '@/di/testSetup';
import { ServiceKeys } from '@/di/ServiceKeys';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';

test('component displays tasks', () => {
  const container = createTestContainer();
  const mockRepo = container.resolve<MockTaskRepository>(ServiceKeys.TASK_REPOSITORY);
  
  mockRepo.setMockData([
    aTask().withTitle('Task 1').build(),
    aTask().withTitle('Task 2').build(),
  ]);

  const { getByText } = renderWithProviders(<MyComponent />, { container });
  
  expect(getByText('Task 1')).toBeInTheDocument();
});
```

## 📁 Key Files to Know

### Interfaces (What things should do)
- `src/repositories/interfaces/IRepository.ts` - CRUD operations
- `src/repositories/interfaces/IAuthService.ts` - Auth operations

### Implementations (How they actually work)
- `src/repositories/firebase/*` - Real Firebase implementations
- `src/repositories/mock/*` - Test implementations

### DI Setup
- `src/di/Container.ts` - DI container
- `src/di/setup.ts` - Production setup
- `src/di/testSetup.ts` - Test setup

### Helpers
- `src/__tests__/utils/builders/*` - Test data builders
- `src/__tests__/utils/testHelpers.ts` - Render utilities

### Examples
- `src/__tests__/repositories/TaskRepository.test.ts` - Repository test
- `src/__tests__/services/RecurringTaskService.test.ts` - Service test
- `src/__tests__/examples/TaskStoreIntegration.test.ts` - Full example

## 🎯 Common Tasks

### Add a New Test

```typescript
// 1. Import helpers
import { aTask } from '@/__tests__/utils/builders';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { MockAuthService } from '@/repositories/mock/MockAuthService';

// 2. Setup
beforeEach(() => {
  authService = new MockAuthService();
  repository = new MockTaskRepository(authService);
});

// 3. Test!
test('your test', async () => {
  const task = aTask().build();
  await repository.create(task);
  expect(repository.getMockData()).toHaveLength(1);
});
```

### Test Business Logic

```typescript
// 1. Import service
import { RecurringTaskService } from '@/services/RecurringTaskService';

// 2. Create with mock repo
const service = new RecurringTaskService(mockRepository);

// 3. Test pure logic (no mocking needed!)
const shouldCreate = service.shouldCreateTaskForToday(task, []);
expect(shouldCreate).toBe(true);
```

### Use in Production Code

```typescript
// Old way (direct Firebase)
const userId = auth.currentUser?.uid;
await createAt(`users/${userId}/tasks/${id}`, task);

// New way (through repository)
const taskRepo = container.resolve<IRepository<Task>>(ServiceKeys.TASK_REPOSITORY);
await taskRepo.create(task);
```

## 🔄 Migration Checklist

When migrating a store:

- [ ] Create Firebase repository implementation
- [ ] Create mock repository implementation  
- [ ] Register in DI container (`src/di/setup.ts`)
- [ ] Create V2 store using repository
- [ ] Write unit tests for repository
- [ ] Write unit tests for business logic
- [ ] Update components to use V2 store
- [ ] Delete old implementation

## 🧪 Running Tests

```bash
# All tests
npm test

# Specific file
npm test TaskRepository

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## 💡 Tips

### 1. Use Builders for All Test Data
```typescript
// ✅ Good - maintainable
const task = aTask().withTitle('Test').build();

// ❌ Bad - brittle
const task = { id: '1', title: 'Test', /* 50 more fields */ };
```

### 2. Test Repositories in Isolation
```typescript
// ✅ Good - fast, isolated
const mockRepo = new MockTaskRepository(mockAuth);
await mockRepo.create(task);

// ❌ Bad - slow, complex
jest.mock('firebase/firestore', () => ({ /* mocks */ }));
```

### 3. Test Business Logic Without Data Layer
```typescript
// ✅ Good - pure logic
const service = new RecurringTaskService(mockRepo);
const result = service.shouldCreateTaskForToday(task, []);

// ❌ Bad - mixed concerns
// (business logic inside store with Firebase)
```

### 4. Keep Tests Simple
```typescript
// ✅ Good - one thing per test
test('should create task', async () => {
  const id = await repo.create(aTask().build());
  expect(id).toBeTruthy();
});

// ❌ Bad - testing too much
test('should do everything', async () => {
  // 100 lines of setup and assertions
});
```

## 🆘 Troubleshooting

### "Service not registered" error
```typescript
// Make sure you initialized the container
import { initializeContainer } from '@/di/setup';
initializeContainer();

// In tests, use createTestContainer
const container = createTestContainer();
```

### "Not authenticated" error in tests
```typescript
// Make sure mock auth is set up
const authService = new MockAuthService();
authService.simulateLogin('test-user-123');
```

### Tests are slow
```typescript
// ✅ Use mock repositories (fast)
const mockRepo = new MockTaskRepository(mockAuth);

// ❌ Don't use Firebase in tests (slow)
// const realRepo = new FirebaseTaskRepository(auth);
```

## 📚 Learn More

- Full Guide: `REFACTORING_IMPLEMENTATION.md`
- Summary: `REFACTORING_SUMMARY.md`
- Examples: `src/__tests__/examples/*`

## 🎉 You're Ready!

Start writing tests with the new pattern. It's:
- ✅ **Faster** - No complex mocking
- ✅ **Easier** - Use builders and helpers
- ✅ **Better** - Test real behavior

Questions? Check the full implementation guide!
