# 🚀 Quick Start: New Testing Architecture

## TL;DR

We've added a repository pattern + dependency injection to make testing 10x easier.

### Before
```typescript
// 50 lines of mocking nightmare 😫
jest.mock('@/lib/firebaseClient', () => ({ ... }));
jest.mock('firebase/firestore', () => ({ ... }));
// ... more mocking ...
```

### After
```typescript
// 5 lines of clean setup 🎉
const mockRepo = new MockTaskRepository(new MockAuthService());
mockRepo.setMockData([aTask().build()]);
// Test away!
```

---

## New File Structure

```
src/
├── repositories/           # Data access layer
│   ├── interfaces/        # Contracts (IRepository, IAuthService)
│   ├── firebase/          # Production implementations
│   └── mock/              # Test implementations
├── services/              # Business logic
├── di/                    # Dependency injection
└── __tests__/
    └── utils/builders/    # Test data builders
```

---

## Writing Tests: Cheat Sheet

### 1. Testing a Repository

```typescript
import { MockAuthService } from '@/repositories/mock/MockAuthService';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { aTask } from '../utils/builders';

describe('My Test', () => {
  let mockRepo: MockTaskRepository;

  beforeEach(() => {
    const mockAuth = new MockAuthService();
    mockAuth.simulateLogin('test-user');
    mockRepo = new MockTaskRepository(mockAuth);
  });

  it('should create a task', async () => {
    const task = aTask().withTitle('Test').build();
    const id = await mockRepo.create(task);
    
    const tasks = await mockRepo.getAll();
    expect(tasks).toHaveLength(1);
  });
});
```

### 2. Testing a Service

```typescript
import { RecurringTaskService } from '@/services/RecurringTaskService';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { aTask } from '../utils/builders';

describe('RecurringTaskService', () => {
  let service: RecurringTaskService;
  let mockRepo: MockTaskRepository;

  beforeEach(() => {
    const mockAuth = new MockAuthService();
    mockRepo = new MockTaskRepository(mockAuth);
    service = new RecurringTaskService(mockRepo);
  });

  it('should generate recurring tasks', async () => {
    const template = aTask().asDaily().build();
    await mockRepo.create(template);
    
    await service.generateMissingRecurringTasks([template]);
    
    const tasks = await mockRepo.getAll();
    expect(tasks.length).toBeGreaterThan(1);
  });
});
```

### 3. Testing a Component

```typescript
import { renderWithProviders } from '../utils/testHelpers';
import { createTestContainer } from '@/di/testSetup';
import { ServiceKeys } from '@/di/ServiceKeys';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';
import { aTask } from '../utils/builders';

describe('MyComponent', () => {
  it('should display tasks', () => {
    const container = createTestContainer();
    const mockRepo = container.resolve<MockTaskRepository>(
      ServiceKeys.TASK_REPOSITORY
    );
    
    mockRepo.setMockData([
      aTask().withTitle('Task 1').build(),
      aTask().withTitle('Task 2').build(),
    ]);

    const { getByText } = renderWithProviders(<MyComponent />, { container });

    expect(getByText('Task 1')).toBeInTheDocument();
    expect(getByText('Task 2')).toBeInTheDocument();
  });
});
```

---

## Test Data Builders

### TaskBuilder

```typescript
import { aTask } from '@/__tests__/utils/builders';

// Simple task
const task = aTask().build();

// Complex task
const task = aTask()
  .withTitle('Complete project')
  .withPriority('high')
  .withCategory('mastery')
  .withTags(['work', 'important'])
  .withEstimatedMinutes(120)
  .withNotes('This is a critical task')
  .asDaily()              // Make it recurring
  .asDone()               // Mark as completed
  .build();

// Multiple tasks
const tasks = aTask().buildMany(5);

// Chain for readability
const urgentTask = aTask()
  .withTitle('Fix bug')
  .withPriority('urgent')
  .withDueDate(new Date())
  .asFocusEligible()
  .build();
```

### MoodBuilder

```typescript
import { aMood } from '@/__tests__/utils/builders';

// Simple mood
const mood = aMood().build();

// Detailed mood
const mood = aMood()
  .withValue(8)
  .withNote('Great day!')
  .withDimensions({ happy: 90, energized: 80 })
  .asManual()
  .build();

// Multiple moods
const moods = aMood().buildMany(10);
```

---

## Common Testing Patterns

### Pattern 1: Setup Mock Data

```typescript
beforeEach(() => {
  const tasks = [
    aTask().withStatus('active').build(),
    aTask().withStatus('completed').asDone().build(),
    aTask().withStatus('backlog').build(),
  ];
  mockRepo.setMockData(tasks);
});
```

### Pattern 2: Test State Changes

```typescript
it('should update state', async () => {
  const task = aTask().asNotDone().build();
  const id = await mockRepo.create(task);
  
  await mockRepo.update(id, { done: true });
  
  const updated = await mockRepo.getById(id);
  expect(updated?.done).toBe(true);
});
```

### Pattern 3: Test Subscriptions

```typescript
it('should notify on changes', async () => {
  const callback = jest.fn();
  mockRepo.subscribe(callback);
  
  callback.mockClear();
  await mockRepo.create(aTask().build());
  
  expect(callback).toHaveBeenCalledWith(
    expect.arrayContaining([expect.any(Object)]),
    expect.any(Object)
  );
});
```

### Pattern 4: Test Authentication

```typescript
it('should require authentication', async () => {
  mockAuth.simulateLogout();
  
  await expect(
    mockRepo.create(aTask().build())
  ).rejects.toThrow('Not authenticated');
});
```

---

## Mock Repository Methods

### MockTaskRepository

```typescript
// Query
await mockRepo.getAll()
await mockRepo.getById(id)

// Mutate
await mockRepo.create(task)
await mockRepo.update(id, updates)
await mockRepo.delete(id)

// Subscribe
const unsubscribe = mockRepo.subscribe(callback)
unsubscribe()

// Test Helpers
mockRepo.setMockData(tasks)    // Set test data
mockRepo.getMockData()         // Get current data
mockRepo.clear()               // Clear all data
```

### MockAuthService

```typescript
// Query
mockAuth.getCurrentUserId()
mockAuth.isAuthenticated()

// Subscribe
mockAuth.onAuthChange(callback)

// Test Helpers
mockAuth.simulateLogin('user-id')
mockAuth.simulateLogout()
mockAuth.setUserId('user-id')
```

---

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test TaskRepository

# Pattern match
npm test repositories

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Verbose
npm test -- --verbose
```

---

## Adding a New Feature

### Step 1: Create Repository

```typescript
// src/repositories/firebase/MyFeatureRepository.ts
export class FirebaseMyFeatureRepository implements IRepository<MyEntity> {
  constructor(private authService: IAuthService) {}
  
  async getAll(): Promise<MyEntity[]> {
    // Implementation
  }
  // ... other methods
}
```

### Step 2: Create Mock Repository

```typescript
// src/repositories/mock/MockMyFeatureRepository.ts
export class MockMyFeatureRepository implements IRepository<MyEntity> {
  private data: MyEntity[] = [];
  
  async getAll(): Promise<MyEntity[]> {
    return [...this.data];
  }
  
  setMockData(data: MyEntity[]): void {
    this.data = [...data];
  }
}
```

### Step 3: Register in DI

```typescript
// src/di/setup.ts
appContainer.registerSingleton(ServiceKeys.MY_FEATURE, () => {
  const auth = appContainer.resolve(ServiceKeys.AUTH_SERVICE);
  return new FirebaseMyFeatureRepository(auth);
});

// src/di/testSetup.ts
const mockRepo = new MockMyFeatureRepository(mockAuthService);
container.registerInstance(ServiceKeys.MY_FEATURE, mockRepo);
```

### Step 4: Create Store

```typescript
// src/store/useMyFeatureV2.ts
export function createMyFeatureStore(repository: IRepository<MyEntity>) {
  return create<State>((set, get) => ({
    items: [],
    
    add: async (item) => {
      await repository.create(item);
    },
  }));
}
```

### Step 5: Write Tests

```typescript
// src/__tests__/MyFeature.test.ts
describe('MyFeature', () => {
  let mockRepo: MockMyFeatureRepository;
  
  beforeEach(() => {
    mockRepo = new MockMyFeatureRepository(new MockAuthService());
  });
  
  it('should work', async () => {
    // Test!
  });
});
```

---

## Need Help?

### Full Guides
- 📖 `REFACTORING_IMPLEMENTATION.md` - Complete guide with examples
- 📊 `REFACTORING_SUMMARY.md` - What was built and why

### Example Tests
- `src/__tests__/repositories/TaskRepository.test.ts`
- `src/__tests__/services/RecurringTaskService.test.ts`
- `src/__tests__/examples/TaskStoreIntegration.test.ts`

### Key Files
- `src/repositories/interfaces/IRepository.ts` - Repository interface
- `src/di/Container.ts` - DI container
- `src/__tests__/utils/builders/TaskBuilder.ts` - Test data builder

---

## Tips & Tricks

### ✅ Do
- Use builders for test data: `aTask().withTitle('Test').build()`
- Mock at the repository level, not Firebase
- Test business logic in services separately
- Use descriptive test names
- Keep tests focused and isolated

### ❌ Don't
- Don't mock Firebase directly anymore
- Don't mix test concerns (unit vs integration)
- Don't test implementation details
- Don't forget to cleanup after tests
- Don't skip edge cases

---

## Common Issues

### "Service not registered"
```typescript
// Make sure to initialize DI
import { initializeContainer } from '@/di/setup';
initializeContainer();

// Or use test container
const container = createTestContainer();
```

### "Not authenticated"
```typescript
// Mock auth must be logged in
const mockAuth = new MockAuthService();
mockAuth.simulateLogin('test-user-id');
```

### Tests are slow
```typescript
// Use mocks, not real Firebase
const mockRepo = new MockTaskRepository(mockAuth);
// Fast! ⚡
```

---

## What's Next?

1. **Try it out**: Write a test using the new pattern
2. **Migrate a store**: Pick one store to refactor
3. **Add builders**: Create builders for your entities
4. **Share feedback**: What works? What doesn't?

Happy testing! 🎉
