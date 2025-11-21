# Focus Notebook - Codebase Quick Reference

**Quick lookup guide for navigating the codebase**

---

## Quick Stats

| Metric | Value |
|--------|-------|
| **TypeScript/TSX Files** | 394 |
| **Go Files** | 43 |
| **Zustand Stores** | 32 |
| **Tool Pages** | 30 |
| **API Routes** | 7 |
| **Cloud Functions** | 26 |
| **Go Services** | 14 |
| **Test Files** | 50+ |

---

## Finding Things

### I need to find a Tool
```
/src/app/tools/[tool-name]/page.tsx
```
**Examples**: focus, spending, investments, tasks, trips, thoughts

### I need to modify state
```
/src/store/use[DomainName].ts
```
**Examples**: useTasks.ts, useSpending.ts, useFocus.ts

### I need to create a component
```
/src/components/[domain]/[ComponentName].tsx
```
**Examples**: `/src/components/spending/SpendingForm.tsx`

### I need to add business logic
```
/src/services/[ServiceName].ts
```
**Examples**: entityService.ts, thoughtProcessingService.ts

### I need to add data access logic
```
/src/repositories/firebase/
```

### I need utility functions
```
/src/lib/[category]/
```
**Categories**: firebase, analytics, entityGraph, utils, data, server

### I need shared types
```
/src/types/[domain].ts
```
**Examples**: entityGraph.ts, spending-tool.ts, import-export.ts

### I need to add an API route
```
/src/app/api/[endpoint]/route.ts
```
**Examples**: `/api/process-thought`, `/api/chat`

### I need to add a Cloud Function
```
/functions/src/[functionName].ts
```

### I need to modify the Go backend
```
/backend-go/internal/[package]/
```
**Packages**: handlers, services, models, repository, middleware

### I need UI components
```
/src/components/ui/
```
**Reusable**: Button, Card, Modal, Dialog, etc.

---

## Key Files

### Configuration
| File | Purpose |
|------|---------|
| `package.json` | Root dependencies |
| `tsconfig.json` | TypeScript config |
| `next.config.mjs` | Next.js config |
| `firebase.json` | Firebase deployment |
| `firestore.rules` | Firestore security |
| `playwright.config.ts` | E2E test config |

### Documentation
| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `CLAUDE.md` | Developer guide (28KB) |
| `CODEBASE_STRUCTURE_ANALYSIS.md` | Full structure breakdown |
| `REORGANIZATION_RECOMMENDATIONS.md` | Suggested improvements |
| `/docs/guides/` | How-to guides |

### Testing
| Directory | Purpose |
|-----------|---------|
| `/src/__tests__/` | Jest unit tests |
| `/e2e/` | Playwright E2E tests |
| `/functions/src/__tests__/` | Function tests |

---

## Common Commands

### Development
```bash
npm run dev                    # Start Next.js dev server
cd functions && npm run serve # Start Firebase emulator
```

### Testing
```bash
npm test                      # Run Jest tests
npm run test:watch           # Watch mode
npm run test:screenshots     # Run E2E tests
```

### Building
```bash
npm run build                # Build Next.js
npm run lint                 # ESLint check
npx tsc --noEmit            # Type check
```

### Go Backend
```bash
go run cmd/server/main.go    # Development
go build -o server ./cmd/server  # Build binary
docker-compose up            # Full stack
```

---

## Architecture Overview

### Frontend Stack
```
Next.js 14 (App Router)
├── React 18
├── TypeScript 5.6
├── Zustand (32 stores)
├── Tailwind CSS
├── Radix UI
└── Firebase SDK
```

### Backend Stack

#### Cloud Functions (Node.js/Firebase)
```
Firebase Cloud Functions 7.0
├── OpenAI
├── Anthropic
├── Stripe
├── Plaid
└── Firebase Admin
```

#### Go Backend
```
Go 1.21
├── Firestore
├── OpenAI / Anthropic
├── Stripe
├── Plaid
├── Prometheus (metrics)
└── Zap (logging)
```

### Mobile
```
Capacitor 7.4
└── iOS wrapper
    └── Firebase SDK
```

---

## Common Patterns

### Adding a new store
```typescript
// /src/store/use[Feature].ts
import { create } from 'zustand';
import { subscribe } from '@/lib/data/subscribe';

interface Store {
  items: Item[];
  isLoading: boolean;
  add: (item: Item) => Promise<void>;
  subscribe: () => () => void;
}

export const use[Feature] = create<Store>((set) => ({
  items: [],
  isLoading: false,
  add: async (item) => { /* ... */ },
  subscribe: () => {
    return subscribe('collection', (items) => {
      set({ items });
    });
  },
}));
```

### Creating a component
```typescript
'use client';

import { use[Feature] } from '@/store/use[Feature]';

interface ComponentProps {
  id: string;
  onClose: () => void;
}

export function Component({ id, onClose }: ComponentProps) {
  const data = use[Feature]((s) => s.data);
  
  return <div>{/* JSX */}</div>;
}
```

### Adding an API route
```typescript
// /src/app/api/[endpoint]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAiRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await verifyAiRequest(request);
    const data = await request.json();
    // Process data
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Using the Data Gateway
```typescript
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';

// Create
await createAt('tasks', taskId, taskData);

// Update
await updateAt('tasks', taskId, updates);

// Delete
await deleteAt('tasks', taskId);
```

---

## Directory Quick Map

```
focus-notebook/
├── src/                    # Frontend (Next.js + React)
│   ├── app/               # Pages & routing
│   ├── components/        # React components
│   ├── store/            # Zustand state (32 stores)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities & infrastructure
│   ├── services/         # Business logic
│   ├── repositories/     # Data access
│   ├── types/            # Type definitions
│   ├── contexts/         # React contexts
│   ├── di/               # Dependency injection
│   └── __tests__/        # Jest tests
│
├── functions/            # Firebase Cloud Functions
│   ├── src/             # Function implementations (26 files)
│   ├── prompts/         # AI prompt templates
│   └── __tests__/       # Function tests
│
├── backend-go/          # Go backend service (43 Go files)
│   ├── cmd/            # Executables
│   ├── internal/       # Packages
│   │   ├── handlers/   # HTTP handlers
│   │   ├── services/   # Business logic
│   │   ├── models/     # Data models
│   │   ├── repository/ # Data access
│   │   └── ...
│   └── pkg/            # Public packages
│
├── mobile/              # React Native / Capacitor
│   ├── screens/
│   ├── components/
│   └── upload/
│
├── e2e/                 # Playwright E2E tests
├── docs/                # Documentation
├── shared/              # Shared types
└── scripts/             # Build scripts
```

---

## Resilience Patterns

### Circuit Breaker
Prevents cascading failures:
```typescript
import { getCircuitBreaker } from '@/lib/firebase/circuit-breaker';
const breaker = getCircuitBreaker('endpoint-name');
```

### Offline Queue
Queues operations when offline:
```typescript
import { offlineQueue } from '@/lib/firebase/offline-queue';
await offlineQueue.enqueue(() => createAt('tasks', id, data));
```

### Retry with Backoff
```typescript
import { retryWithBackoff } from '@/lib/firebase/retry';
const result = await retryWithBackoff(() => firebaseOperation());
```

### Real-time Subscriptions
```typescript
import { subscribe } from '@/lib/data/subscribe';
const unsubscribe = subscribe('tasks', (items) => {
  set({ items });
});
```

---

## Type Safety Tips

### Always type function parameters
```typescript
// Good
function createTask(data: Partial<Task>): Task { }

// Avoid
function createTask(data: any): any { }
```

### Use interfaces for props
```typescript
interface ComponentProps {
  id: string;
  onClose: () => void;
}

export function Component(props: ComponentProps) { }
```

### Export types from index.ts
```typescript
// /src/types/index.ts
export * from './entityGraph';
export * from './spending-tool';
export * from './import-export';
```

---

## Testing Quick Start

### Running tests
```bash
npm test                    # All tests
npm test -- --watch       # Watch mode
npm test -- --coverage    # With coverage
npm test -- MyComponent   # Specific test
```

### Test file structure
```typescript
describe('Component/Feature', () => {
  beforeEach(() => {
    // Setup
  });

  it('should perform expected behavior', () => {
    // Arrange
    const input = createTestData();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

### Using test builders
```typescript
import { createTask } from '@/__tests__/utils/builders';

const task = createTask({
  title: 'Custom Title',
});
```

---

## Performance Tips

1. **Use Zustand selectors** to prevent unnecessary re-renders:
   ```typescript
   const title = useStore((s) => s.title);  // Good
   const store = useStore();                 // Triggers all changes
   ```

2. **Wrap subscriptions in useEffect**:
   ```typescript
   useEffect(() => {
     return useTasks.subscribe();
   }, []);
   ```

3. **Implement pagination** for large lists

4. **Use React.memo** for frequently rendered components

5. **Lazy load components**:
   ```typescript
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   ```

---

## Debugging Tips

1. **Check browser console** for errors
2. **Use React DevTools** to inspect state
3. **Check Network tab** for API calls
4. **View Firestore at** `localhost:4000` (emulator)
5. **Check Firebase rules** in `firestore.rules`
6. **Verify env variables** in `.env.local`

---

## Pre-Push Checklist

Before committing, always run:
```bash
npm run lint      # Check code style
npm test          # Run tests
npm run build     # Build production
npx tsc --noEmit # Type check
```

---

## Getting Help

1. **CLAUDE.md** - Comprehensive development guide
2. **README.md** - Project overview
3. **docs/** - Detailed documentation
4. **Type definitions** - Check `/src/types`
5. **Examples in code** - Look at similar implementations

---

## Key Contributors / Patterns

- **Zustand**: Used for all state management (32 stores)
- **Firebase**: Real-time database, authentication, storage
- **Tailwind CSS**: All styling via utility classes
- **TypeScript**: Strict mode, full type coverage
- **Next.js**: App Router for pages and API routes

---

## Quick Links

- **Project Root**: `/home/user/focus-notebook`
- **Frontend Source**: `/home/user/focus-notebook/src`
- **Cloud Functions**: `/home/user/focus-notebook/functions/src`
- **Go Backend**: `/home/user/focus-notebook/backend-go`
- **Tests**: `/home/user/focus-notebook/src/__tests__`
- **Docs**: `/home/user/focus-notebook/docs`

---

## Notes

- All paths use `@/` alias (configured in `tsconfig.json`)
- Firebase SDK auto-initializes on app start
- Anonymous sessions expire after 2 hours
- All user data is stored in Firestore
- Offline operations queue automatically
- Tests run before build in CI/CD

---

For more details, see:
- `CODEBASE_STRUCTURE_ANALYSIS.md` - Full structure breakdown
- `REORGANIZATION_RECOMMENDATIONS.md` - Suggested improvements
- `CLAUDE.md` - Comprehensive developer guide

