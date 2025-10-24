# Codebase Refactoring Proposal
**Focus Notebook - Code Quality & Maintainability Improvements**

> **Goal**: Make the codebase easier to read, understand, and modify for both humans and AI assistants
> 
> **Last Updated**: January 2025

---

## 🎯 Executive Summary

This document outlines strategic refactoring opportunities to improve code maintainability, reduce technical debt, and establish consistent patterns across the codebase. The proposals are prioritized by impact and organized into actionable phases.

### Current State Assessment

**Strengths**:
- Well-structured Next.js App Router architecture
- Clean separation of concerns (components, stores, lib, types)
- Good use of TypeScript for type safety
- Consistent use of Zustand for state management
- Firebase integration with real-time sync

**Areas for Improvement**:
- Type inconsistencies between stores and types folder
- Mixed component patterns (some overly complex, some well-factored)
- Utility functions scattered across multiple files
- Inconsistent error handling
- Limited JSDoc documentation
- Some large files that could be split

---

## 📋 Priority 1: Type System Consolidation

### Issue
Multiple sources of truth for data types, causing confusion and potential bugs:
- `/src/types/index.ts` has outdated Task interface
- `/src/store/useTasks.ts` has the actual Task interface being used
- Similar issues with other entities

### Proposed Solution

**1. Create a centralized types directory structure:**

```
src/types/
├── index.ts              # Re-exports all types
├── entities/
│   ├── task.ts          # Task, TaskStatus, TaskPriority, etc.
│   ├── thought.ts       # Thought, ThoughtType, etc.
│   ├── project.ts       # Project types
│   ├── goal.ts          # Goal types
│   ├── mood.ts          # Mood types
│   └── focus.ts         # FocusSession types
├── common.ts            # Shared types (Timestamps, Meta, etc.)
└── store.ts             # Store-specific types (StoreState, etc.)
```

**2. Extract types from stores:**

```typescript
// Before (in useTasks.ts)
export type TaskStatus = 'active' | 'completed' | 'backlog'
export interface Task { ... }

// After (in types/entities/task.ts)
export type TaskStatus = 'active' | 'completed' | 'backlog'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskCategory = 'mastery' | 'pleasure'
export type RecurrenceType = 'none' | 'daily' | 'workweek' | 'weekly' | 'monthly'

export interface RecurrenceConfig { ... }
export interface TaskStep { ... }
export interface Task { ... }

// Store imports the types
import { Task, TaskStatus, TaskPriority } from '@/types/entities/task'
```

**Benefits**:
- Single source of truth for all data models
- Easier for AI to understand data structures
- Reduces circular dependency risks
- Makes API boundaries clearer

---

## 📋 Priority 2: Component Architecture Improvements

### Issue
Some components are monolithic and handle too many responsibilities:
- `page.tsx` files are large and mix UI logic with business logic
- Some components like `FocusSession.tsx` (359 lines) could be split
- Inconsistent component patterns

### Proposed Solution

**1. Establish clear component patterns:**

```
src/components/
├── ui/                  # Pure UI components (buttons, cards, etc.)
├── features/            # Feature-specific components
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskDetailModal.tsx
│   │   └── TaskInput.tsx
│   ├── thoughts/
│   │   ├── ThoughtList.tsx
│   │   ├── ThoughtCard.tsx
│   │   └── ThoughtDetailModal.tsx
│   ├── focus/
│   │   ├── FocusSession/
│   │   │   ├── index.tsx
│   │   │   ├── FocusTimer.tsx
│   │   │   ├── FocusTaskList.tsx
│   │   │   └── FocusControls.tsx
│   │   ├── FocusStatistics.tsx
│   │   └── FocusSessionDetailModal.tsx
│   └── ...
├── layout/              # Layout components (Navbar, Sidebar, etc.)
└── shared/              # Cross-feature shared components
```

**2. Split large components:**

```typescript
// Before: FocusSession.tsx (359 lines, handles everything)

// After: Split into focused components
// FocusSession/index.tsx - Orchestration (100 lines)
// FocusSession/FocusTimer.tsx - Timer logic (80 lines)
// FocusSession/FocusTaskList.tsx - Task display (80 lines)
// FocusSession/FocusControls.tsx - Pause/play controls (50 lines)
```

**3. Extract custom hooks for complex logic:**

```typescript
// src/hooks/useFocusTimer.ts
export function useFocusTimer(session: FocusSession | null) {
  const [currentTime, setCurrentTime] = useState(0)
  // Timer logic here
  return { currentTime, ... }
}

// src/hooks/useTaskSelection.ts
export function useTaskSelection(tasks: Task[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Selection logic here
  return { selectedIds, toggleSelection, ... }
}
```

**Benefits**:
- Easier to test individual components
- Clearer separation of concerns
- Reduced cognitive load when reading code
- Better code reusability

---

## 📋 Priority 3: Utility Functions Organization

### Issue
Utility functions are scattered:
- Date utilities in multiple files
- Firebase utilities mixed with business logic
- Helper functions defined inline in components

### Proposed Solution

**Create a comprehensive utils structure:**

```
src/lib/
├── utils/
│   ├── date.ts          # All date/time utilities
│   ├── string.ts        # String manipulation
│   ├── array.ts         # Array helpers
│   ├── validation.ts    # Input validation
│   └── formatting.ts    # Display formatting
├── firebase/
│   ├── config.ts        # Firebase configuration
│   ├── auth.ts          # Auth utilities
│   ├── firestore.ts     # Firestore helpers
│   └── storage.ts       # Storage utilities
├── data/
│   ├── gateway.ts       # CRUD operations (existing)
│   ├── subscribe.ts     # Subscription helpers (existing)
│   └── transformers.ts  # Data transformation utilities
└── constants/
    ├── app.ts           # App-wide constants
    ├── colors.ts        # Theme colors
    └── durations.ts     # Time durations
```

**Example consolidation:**

```typescript
// src/lib/utils/date.ts
/**
 * Date utility functions for the application
 */

/** Check if two dates are the same day */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Check if an ISO string represents today */
export function isTodayISO(iso?: string): boolean {
  if (!iso) return false
  return isSameDay(new Date(iso), new Date())
}

/** Get date string in YYYY-MM-DD format */
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

/** Check if a date is a workday (Monday-Friday) */
export function isWorkday(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5
}
```

**Benefits**:
- Easy to find and reuse utilities
- Consistent implementations across codebase
- Better testability
- Clear documentation in one place

---

## 📋 Priority 4: Error Handling & Logging

### Issue
- Inconsistent error handling across the codebase
- Silent failures in some async operations
- No centralized error logging

### Proposed Solution

**1. Create error handling utilities:**

```typescript
// src/lib/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage?: string,
    public metadata?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class AuthError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, 'AUTH_ERROR', userMessage)
  }
}

export class FirestoreError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, 'FIRESTORE_ERROR', userMessage)
  }
}

// Error handler
export function handleError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error
  }
  
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${context}]:`, message, error)
  
  return new AppError(
    message,
    'UNKNOWN_ERROR',
    'An unexpected error occurred. Please try again.'
  )
}
```

**2. Use consistent error handling in stores:**

```typescript
// Before
add: async (task) => {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Not authenticated')
  // ... rest
}

// After
add: async (task) => {
  const userId = auth.currentUser?.uid
  if (!userId) {
    throw new AuthError('User not authenticated', 'Please sign in to add tasks')
  }
  
  try {
    // ... create task
  } catch (error) {
    throw handleError(error, 'useTasks.add')
  }
}
```

**Benefits**:
- Consistent error messages
- Better debugging with context
- User-friendly error displays
- Easier error tracking/monitoring

---

## 📋 Priority 5: Documentation & Code Comments

### Issue
- Limited JSDoc comments
- Missing documentation for complex logic
- No README in key directories

### Proposed Solution

**1. Add JSDoc to all public APIs:**

```typescript
/**
 * Creates a new task in the user's task list
 * 
 * @param task - Task data (without id, done, timestamps)
 * @returns Promise resolving to the new task ID
 * @throws {AuthError} If user is not authenticated
 * @throws {FirestoreError} If database operation fails
 * 
 * @example
 * ```typescript
 * const taskId = await addTask({
 *   title: 'Complete project',
 *   status: 'active',
 *   priority: 'high',
 *   category: 'mastery'
 * })
 * ```
 */
add: async (task) => { ... }
```

**2. Add README files to key directories:**

```markdown
# src/store/README.md
# Store Architecture

This directory contains Zustand stores for global state management.

## Store Pattern

Each store follows this structure:
1. Type definitions
2. Helper functions (private)
3. Store creation with initial state
4. Actions grouped by functionality

## Available Stores

- `useTasks.ts` - Task management
- `useThoughts.ts` - Thought tracking
- `useFocus.ts` - Focus session management
...
```

**3. Add inline comments for complex logic:**

```typescript
// Before
if (shouldCreateTaskForToday(template, tasks)) {
  const newTask = createTaskForToday(template)
  await createAt(`users/${userId}/tasks/${taskId}`, newTask)
}

// After
// Generate recurring task instances for templates that need one for today
// This runs on subscription updates to ensure users always see their recurring tasks
if (shouldCreateTaskForToday(template, tasks)) {
  const newTask = createTaskForToday(template)
  await createAt(`users/${userId}/tasks/${taskId}`, newTask)
}
```

**Benefits**:
- AI can better understand code intent
- New developers onboard faster
- Reduces need for external documentation
- Improves IDE autocomplete

---

## 📋 Priority 6: Constants & Configuration

### Issue
- Magic numbers and strings scattered throughout code
- No centralized configuration
- Inconsistent styling values

### Proposed Solution

**Create constants files:**

```typescript
// src/lib/constants/app.ts
export const APP_NAME = 'Focus Notebook'
export const APP_VERSION = '0.1.0'

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Limits
export const MAX_TASK_TITLE_LENGTH = 200
export const MAX_NOTE_LENGTH = 5000
export const MAX_TAGS_PER_TASK = 10

// src/lib/constants/durations.ts
export const FOCUS_DURATIONS = {
  QUICK: 5,
  POMODORO: 25,
  DEEP_WORK: 50,
  EXTENDED: 90,
} as const

export const TIMER_UPDATE_INTERVAL = 1000 // ms
export const AUTO_SAVE_DELAY = 2000 // ms

// src/lib/constants/colors.ts
export const PRIORITY_COLORS = {
  low: 'green',
  medium: 'yellow',
  high: 'orange',
  urgent: 'red',
} as const

export const CATEGORY_COLORS = {
  mastery: 'blue',
  pleasure: 'pink',
} as const
```

**Benefits**:
- Easy to update values in one place
- Clear what values are configurable
- Better type safety with `as const`
- Reduces duplication

---

## 📋 Priority 7: Testing Infrastructure

### Issue
- Limited test coverage
- No integration tests
- Tests don't cover critical paths

### Proposed Solution

**1. Add test utilities:**

```typescript
// src/__tests__/utils/testHelpers.ts
export function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: 'test-task-1',
    title: 'Test Task',
    done: false,
    status: 'active',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockUser(overrides?: Partial<User>): User {
  return {
    uid: 'test-user-1',
    email: 'test@example.com',
    ...overrides,
  }
}
```

**2. Establish testing patterns:**

```
src/__tests__/
├── unit/              # Unit tests for utilities
├── integration/       # Integration tests for stores
├── components/        # Component tests
└── e2e/              # End-to-end tests (future)
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (1-2 weeks)
- [ ] Consolidate types into types/ directory
- [ ] Create utility function structure
- [ ] Add constants files
- [ ] Update imports across codebase

### Phase 2: Components (1-2 weeks)
- [ ] Split large components
- [ ] Extract custom hooks
- [ ] Organize components by feature
- [ ] Add component documentation

### Phase 3: Reliability (1 week)
- [ ] Implement error handling system
- [ ] Add error boundaries
- [ ] Add logging utilities
- [ ] Update stores with error handling

### Phase 4: Documentation (1 week)
- [ ] Add JSDoc to all public APIs
- [ ] Create README files for directories
- [ ] Add inline comments for complex logic
- [ ] Update PROJECT_OVERVIEW.md

### Phase 5: Testing (Ongoing)
- [ ] Add test utilities
- [ ] Increase test coverage to 60%
- [ ] Add integration tests for critical paths
- [ ] Set up CI/CD testing

---

## 📊 Success Metrics

**Code Quality**:
- TypeScript strict mode: 100% compliant
- Test coverage: >60% (currently ~20%)
- ESLint warnings: <10 (currently ~50)

**Developer Experience**:
- Average time to understand a feature: <30 min
- Time to add new feature: Reduced by 30%
- Bug fix time: Reduced by 40%

**AI Readability**:
- AI can explain any file accurately: >90% success rate
- AI can make changes without introducing bugs: >85% success rate

---

## 🔧 Tools & Automation

**Recommended additions**:
1. **Prettier** - Consistent code formatting
2. **Husky** - Pre-commit hooks
3. **lint-staged** - Lint only changed files
4. **TypeDoc** - Auto-generate API documentation
5. **Bundle analyzer** - Monitor bundle size

---

## 💡 Quick Wins (Do First)

These can be done immediately with minimal risk:

1. **Extract date utilities** - 1 hour
2. **Add JSDoc to gateway.ts** - 30 mins
3. **Create constants/durations.ts** - 30 mins
4. **Add README to src/store/** - 30 mins
5. **Split TaskList into TaskCard** - 1 hour

---

## 🤝 Contribution Guidelines

When implementing these refactorings:

1. **One PR per refactoring** - Don't mix multiple changes
2. **Add tests** - Ensure functionality doesn't break
3. **Update docs** - Keep documentation in sync
4. **Use feature flags** - For risky changes
5. **Get reviews** - At least one other person should review

---

## 📝 Notes

- This is a living document - update as refactoring progresses
- Prioritize based on current team capacity
- Some refactorings can happen incrementally
- Don't refactor everything at once - do it iteratively
- Always have working code on main branch

---

## 🔗 Related Documents

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - Complete project documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute
- [Architecture Decision Records](./docs/adr/) - Key architectural decisions (future)
