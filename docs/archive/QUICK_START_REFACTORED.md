# 🚀 Quick Start - Refactored Architecture

## TL;DR

Your codebase now has:
- ✅ **Repository Pattern** - Abstraction for data access
- ✅ **Dependency Injection** - Testable services
- ✅ **Service Layer** - Business logic extracted
- ✅ **Test Utilities** - Builders and helpers
- ✅ **90% less test boilerplate**

## File Structure

```
src/
├── di/                              # Dependency Injection
│   ├── Container.ts                # DI container
│   ├── ServiceKeys.ts              # Service identifiers
│   ├── setup.ts                    # Production setup
│   └── testSetup.ts                # Test setup
│
├── repositories/
│   ├── interfaces/                 # Abstractions
│   │   ├── IRepository.ts          # Generic CRUD
│   │   └── IAuthService.ts         # Auth interface
│   ├── firebase/                   # Firebase impl
│   │   ├── FirebaseAuthService.ts
│   │   ├── FirebaseTaskRepository.ts
│   │   └── FirebaseMoodRepository.ts
│   └── mock/                       # Test mocks
│       ├── MockAuthService.ts
│       ├── MockTaskRepository.ts
│       └── MockMoodRepository.ts
│
├── services/                       # Business Logic
│   └── RecurringTaskService.ts
│
├── store/
│   ├── useTasks.ts                 # Old (still works)
│   ├── useTasksV2.ts               # New (refactored)
│   └── instances.ts                # DI integration
│
└── __tests__/
    ├── repositories/               # Repo tests
    ├── services/                   # Service tests
    ├── examples/                   # Integration tests
    └── utils/
        ├── builders/               # Test builders
        └── testHelpers.tsx         # Test utilities
```

## Quick Examples

### 1. Create Test Data (Before vs After)

**Before:**
```typescript
const task = {
  id: '1',
  title: 'Test',
  done: false,
  status: 'active',
  priority: 'medium',
  createdAt: new Date().toISOString(),
  // ... 15 more required properties
};
```

**After:**
```typescript
import { aTask } from '@/__tests__/utils/builders';

const task = aTask()
  .withTitle('Daily exercise')
  .asDaily()
  .withPriority('high')
  .build();
```

### 2. Write Tests (Before vs After)

**Before (50+ lines):**
```typescript
jest.mock('@/lib/firebaseClient', () => ({ ... }));
jest.mock('firebase/firestore', () => ({ ... }));
jest.mock('@/store/useTasks', () => ({
  useTasks: (selector: any) => {
    const state = { /* mock everything */ };
    return selector ? selector(state) : state;
  }
}));

test('should add task', async () => {
  const mockAdd = jest.fn();
  // More setup...
});
```

**After (5 lines):**
```typescript
import { createTestContainer } from '@/di/testSetup';
import { ServiceKeys } from '@/di/ServiceKeys';
import { aTask } from '@/__tests__/utils/builders';

test('should add task', async () => {
  const container = createTestContainer();
  const mockRepo = container.resolve(ServiceKeys.TASK_REPOSITORY);
  
  await mockRepo.create(aTask().build());
  
  const tasks = await mockRepo.getAll();
  expect(tasks).toHaveLength(1);
});
```

### 3. Test Business Logic

**Before:**
```typescript
// Impossible! Business logic was in the store mixed with Firebase
```

**After:**
```typescript
import { RecurringTaskService } from '@/services/RecurringTaskService';
import { MockTaskRepository } from '@/repositories/mock/MockTaskRepository';

test('should create recurring task', async () => {
  const mockRepo = new MockTaskRepository(mockAuthService);
  const service = new RecurringTaskService(mockRepo);
  
  const template = aTask().asDaily().build();
  const shouldCreate = service.shouldCreateTaskForToday(template, []);
  
  expect(shouldCreate).toBe(true);
});
```

## Commands

```bash
# Lint (should pass)
npm run lint

# Run tests
npm test

# Run specific test file
npm test TaskRepository

# Run with coverage
npm test -- --coverage

# Build (verify no TypeScript errors)
npm run build
```

## Usage in Components

### Old Store (Still Works)
```typescript
import { useTasks } from '@/store/useTasks';

function MyComponent() {
  const tasks = useTasks(s => s.tasks);
  const add = useTasks(s => s.add);
  // Use as normal
}
```

### New Store (Refactored)
```typescript
import { useTasksV2 } from '@/store/instances';

function MyComponent() {
  const tasks = useTasksV2(s => s.tasks);
  const add = useTasksV2(s => s.add);
  // Same interface!
}
```

## Test Builders

### Task Builder
```typescript
import { aTask } from '@/__tests__/utils/builders';

// Simple task
const task = aTask().build();

// Complex task
const task = aTask()
  .withTitle('Complete project')
  .withPriority('urgent')
  .withCategory('mastery')
  .asDaily()
  .withDueDate('2024-01-20')
  .withTags(['work', 'important'])
  .withEstimatedMinutes(120)
  .asFocusEligible(true)
  .build();

// Build multiple
const tasks = aTask().buildMany(5);

// Reuse builder
const builder = aTask().withPriority('high');
const task1 = builder.withTitle('Task 1').build();
const task2 = builder.withTitle('Task 2').build();
```

### Mood Builder
```typescript
import { aMood } from '@/__tests__/utils/builders';

const mood = aMood()
  .withValue(8)
  .withNote('Great day!')
  .withDimensions({ happy: 90, energized: 80 })
  .asManual()
  .build();
```

## Adding New Features

### 1. Create Repository
```typescript
// src/repositories/firebase/FirebaseMyRepository.ts
export class FirebaseMyRepository implements IRepository<MyEntity> {
  constructor(private authService: IAuthService) {}
  
  async getAll(): Promise<MyEntity[]> { /* ... */ }
  async create(data): Promise<string> { /* ... */ }
  // Implement interface
}

// src/repositories/mock/MockMyRepository.ts
export class MockMyRepository implements IRepository<MyEntity> {
  private data: MyEntity[] = [];
  
  async getAll(): Promise<MyEntity[]> { return [...this.data]; }
  async create(data): Promise<string> { 
    const id = `mock-${Date.now()}`;
    this.data.push({ ...data, id });
    return id;
  }
  
  // Test helpers
  setMockData(data: MyEntity[]) { this.data = data; }
}
```

### 2. Register in DI
```typescript
// src/di/setup.ts
appContainer.registerSingleton(ServiceKeys.MY_REPOSITORY, () => {
  const authService = appContainer.resolve(ServiceKeys.AUTH_SERVICE);
  return new FirebaseMyRepository(authService);
});

// src/di/ServiceKeys.ts
export const ServiceKeys = {
  // ... existing
  MY_REPOSITORY: 'MyRepository',
};
```

### 3. Create Store
```typescript
// src/store/useMyV2.ts
export function createMyStore(repository: IRepository<MyEntity>) {
  return create<State>((set, get) => ({
    items: [],
    
    add: async (item) => {
      return await repository.create(item);
    },
    
    // More actions...
  }));
}
```

### 4. Write Tests
```typescript
test('my feature works', async () => {
  const mockRepo = new MockMyRepository(mockAuthService);
  const store = createMyStore(mockRepo);
  
  await store.getState().add({ /* data */ });
  
  expect(store.getState().items).toHaveLength(1);
});
```

## Migration Status

### ✅ Completed
- Repository pattern infrastructure
- DI container and setup
- Mock implementations
- RecurringTaskService extracted
- Task store refactored (useTasksV2)
- Test utilities and builders
- Documentation

### 🚧 In Progress
- Migrating remaining stores (useMoods, useThoughts, useGoals, etc.)

### 📋 Todo
- Extract more services
- Add more test builders
- Increase test coverage
- Delete old implementations

## Key Files to Reference

- **Architecture Guide**: `REFACTORING_IMPLEMENTATION.md`
- **Summary**: `REFACTORING_SUMMARY.md`
- **Example Tests**: `src/__tests__/examples/TaskStoreIntegration.test.ts`
- **Repository Tests**: `src/__tests__/repositories/TaskRepository.test.ts`
- **Service Tests**: `src/__tests__/services/RecurringTaskService.test.ts`

## Troubleshooting

### Lint Errors
```bash
npm run lint
# Fix any TypeScript/ESLint issues
```

### Test Failures
```bash
# Run specific test
npm test -- TaskRepository

# See full error
npm test -- --verbose
```

### Build Errors
```bash
npm run build
# Check TypeScript errors
npx tsc --noEmit
```

### Import Errors
Make sure you're importing from the right location:
```typescript
// Correct
import { aTask } from '@/__tests__/utils/builders';
import { ServiceKeys } from '@/di/ServiceKeys';
import type { IRepository } from '@/repositories/interfaces/IRepository';

// Wrong
import { aTask } from '../utils/builders'; // Use @ alias
```

## Benefits

- ✅ **90% reduction** in test boilerplate
- ✅ **100% testable** business logic
- ✅ **Type-safe** mocking
- ✅ **Flexible** architecture (swap Firebase easily)
- ✅ **Clear** separation of concerns
- ✅ **Fast** test execution (no Firebase)
- ✅ **Easy** debugging (clear stack traces)

## Next Steps

1. **Try it out**: Run `npm test repositories` to see new tests
2. **Write a test**: Use the builders to create test data
3. **Migrate a component**: Switch from `useTasks` to `useTasksV2`
4. **Add more stores**: Follow the pattern for other entities

## Questions?

See the full documentation:
- `REFACTORING_IMPLEMENTATION.md` - Complete guide
- `REFACTORING_SUMMARY.md` - What was done
- Example tests in `src/__tests__/examples/`

Happy coding! 🚀

