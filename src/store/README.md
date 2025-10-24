# Store Architecture

This directory contains Zustand stores for global state management with Firebase real-time synchronization.

## Overview

Focus Notebook uses Zustand for client-side state management and Firebase Firestore for persistence. Each store follows a consistent pattern that provides:

- Real-time synchronization with Firestore
- Optimistic updates
- Offline support with cache
- TypeScript type safety
- Pending writes tracking

## Store Pattern

Each store follows this structure:

```typescript
// 1. Type definitions
export type EntityStatus = 'active' | 'completed'
export interface Entity { ... }

// 2. Helper functions (private to the store)
function helperFunction() { ... }

// 3. Store state type
type State = {
  // Data
  entities: Entity[]
  
  // Meta state
  isLoading: boolean
  fromCache: boolean
  hasPendingWrites: boolean
  unsubscribe: (() => void) | null
  
  // Actions
  subscribe: (userId: string) => void
  add: (entity: Omit<Entity, 'id'>) => Promise<void>
  update: (id: string, updates: Partial<Entity>) => Promise<void>
  delete: (id: string) => Promise<void>
}

// 4. Store creation
export const useEntityStore = create<State>((set, get) => ({
  // Initial state
  entities: [],
  isLoading: true,
  // ... other initial values
  
  // Actions
  subscribe: (userId) => { ... },
  add: async (entity) => { ... },
  // ... other actions
}))
```

## Available Stores

### Core Entity Stores

#### `useTasks.ts`
Manages tasks with support for:
- Task CRUD operations
- Recurring tasks (daily, workweek, weekly, monthly)
- Task status (active, completed, backlog)
- Priority levels (urgent, high, medium, low)
- Categories (mastery, pleasure)
- Focus eligibility
- Task steps/subtasks

**Key Actions**:
- `add(task)` - Create a new task
- `toggle(id)` - Toggle task completion
- `updateTask(id, updates)` - Update task fields
- `deleteTask(id)` - Delete a task
- `getTasksByStatus(status)` - Filter tasks by status

#### `useThoughts.ts`
Manages thought tracking with:
- Thought CRUD operations
- AI processing queue
- CBT-style thought records
- Intensity ratings

**Key Actions**:
- `add(thought)` - Add a new thought
- `update(id, updates)` - Update thought
- `deleteThought(id)` - Delete a thought

#### `useProjects.ts`
Manages projects with:
- Project CRUD operations
- Task and thought linking
- Milestone tracking
- Goal association

#### `useGoals.ts`
Manages goals with:
- Goal CRUD operations
- Action plan tracking
- Progress monitoring
- Project linking

#### `useMoods.ts`
Manages mood tracking:
- Daily mood ratings (1-10)
- Mood notes
- Historical data

#### `useFriends.ts`
Manages friend relationships:
- Friend profiles
- Check-in tracking
- Contact information

### Workflow Stores

#### `useFocus.ts`
Manages focus sessions with:
- Session lifecycle (start, pause, resume, end)
- Task time tracking
- Balanced task selection algorithm
- Session history
- Active session recovery

**Key Actions**:
- `startSession(tasks, duration)` - Start a new focus session
- `pauseSession()` - Pause current session
- `resumeSession()` - Resume paused session
- `endSession()` - Complete and save session
- `switchToTask(index)` - Change active task
- `markTaskComplete(index)` - Mark task as done

#### `useProcessQueue.ts`
Manages AI thought processing:
- Processing queue management
- Approval workflow
- Result handling

### Settings Stores

#### `useSettings.ts`
Manages user settings (local storage):
- Theme preferences
- Notification settings
- Display preferences

#### `useSettingsStore.ts`
Alternative settings management (consider consolidating)

#### `useRequestLog.ts`
Tracks API requests for debugging:
- Request logging
- Error tracking
- Rate limiting info

## Subscription Pattern

All entity stores use a subscription pattern for real-time updates:

```typescript
// In your component
const { user } = useAuth()
const subscribe = useEntityStore(s => s.subscribe)

useEffect(() => {
  if (user?.uid) {
    subscribe(user.uid)
  }
}, [user?.uid, subscribe])
```

The `FirestoreSubscriber` component in the app layout automatically subscribes to all stores, so individual components typically don't need to call subscribe manually.

## Data Flow

```
User Action
    ↓
Store Action (optimistic update)
    ↓
Firebase Gateway (createAt/updateAt/deleteAt)
    ↓
Firestore
    ↓
Real-time Listener
    ↓
Store Update
    ↓
Component Re-render
```

## Firebase Integration

### Gateway Functions

All stores use the gateway functions from `@/lib/data/gateway`:

- `createAt(path, data)` - Create new document
- `setAt(path, data)` - Set/merge document
- `updateAt(path, partial)` - Update specific fields
- `deleteAt(path)` - Delete document

These functions automatically add:
- `createdAt` timestamp
- `updatedAt` timestamp
- `updatedBy` user ID
- `version` number (for optimistic concurrency)

### Subscription Helper

Stores use `subscribeCol` from `@/lib/data/subscribe` to listen to Firestore collections:

```typescript
const unsub = subscribeCol<Entity>(query, (entities, meta) => {
  set({
    entities,
    isLoading: false,
    fromCache: meta.fromCache,
    hasPendingWrites: meta.hasPendingWrites,
  })
})
```

## Best Practices

### 1. Error Handling

Always wrap async operations in try-catch:

```typescript
add: async (entity) => {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Not authenticated')
  
  try {
    await createAt(`users/${userId}/entities/${id}`, entity)
  } catch (error) {
    console.error('Failed to create entity:', error)
    throw error
  }
}
```

### 2. Optimistic Updates

For better UX, update local state before Firestore operation completes. The subscription will sync the final state.

### 3. Subscription Cleanup

Always store and call the unsubscribe function:

```typescript
subscribe: (userId) => {
  const currentUnsub = get().unsubscribe
  if (currentUnsub) {
    currentUnsub() // Clean up previous subscription
  }
  
  const unsub = subscribeCol(...)
  set({ unsubscribe: unsub })
}
```

### 4. Selector Pattern

Use selectors in components to avoid unnecessary re-renders:

```typescript
// Good - only re-renders when tasks change
const tasks = useTasks(s => s.tasks)

// Bad - re-renders on any store change
const { tasks } = useTasks()
```

### 5. Derived State

Compute derived state in components with `useMemo`, not in stores:

```typescript
const activeTasks = useMemo(() => 
  tasks.filter(t => t.status === 'active'),
  [tasks]
)
```

## Testing

Each store should have associated tests in `src/store/__tests__/`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useEntityStore } from '../useEntityStore'

describe('useEntityStore', () => {
  it('should add entity', async () => {
    const { result } = renderHook(() => useEntityStore())
    
    await act(async () => {
      await result.current.add({ name: 'Test' })
    })
    
    expect(result.current.entities).toHaveLength(1)
  })
})
```

## Migration Notes

### From Local State to Store

If you need to migrate a feature from local component state to a global store:

1. Create the store following the pattern above
2. Add types to `src/types/entities/`
3. Add Firebase subscription
4. Update components to use the store
5. Add tests
6. Update documentation

## Troubleshooting

### "Not authenticated" errors
- Ensure user is logged in before calling store actions
- Check that `FirebaseAuthProvider` wraps your app

### Stale data
- Check that subscription is active (`isLoading` should be false)
- Verify Firestore rules allow read access
- Check browser console for Firestore errors

### Memory leaks
- Ensure unsubscribe is called on component unmount
- Don't create subscriptions in render functions

### Performance issues
- Use selectors to limit re-renders
- Consider pagination for large collections
- Use indices in Firestore for complex queries

## Related Documentation

- [PROJECT_OVERVIEW.md](../../PROJECT_OVERVIEW.md) - Complete project documentation
- [REFACTORING_PROPOSAL.md](../../REFACTORING_PROPOSAL.md) - Proposed improvements
- [Firebase Gateway](../lib/data/gateway.ts) - CRUD utilities
- [Subscription Helper](../lib/data/subscribe.ts) - Real-time sync utilities
