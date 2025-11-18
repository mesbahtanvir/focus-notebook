# CLAUDE.md - Focus Notebook Development Guide

> **Comprehensive guide for AI assistants and developers working on Focus Notebook**

This document provides essential information about the codebase structure, development workflows, testing requirements, and architectural patterns. It is designed to help AI assistants understand the project and make effective contributions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Pre-Push Requirements](#pre-push-requirements)
3. [Codebase Structure](#codebase-structure)
4. [Tech Stack](#tech-stack)
5. [Key Architectural Patterns](#key-architectural-patterns)
6. [Development Workflows](#development-workflows)
7. [Testing Guidelines](#testing-guidelines)
8. [Code Conventions](#code-conventions)
9. [Common Development Tasks](#common-development-tasks)
10. [Important Guidelines for AI Assistants](#important-guidelines-for-ai-assistants)

---

## Project Overview

**Focus Notebook** is a privacy-first productivity and mental health application that helps users manage anxiety, depression, and improve personal productivity through evidence-based Cognitive Behavioral Therapy (CBT) techniques.

**Inspired by**: *Feeling Good: The New Mood Therapy* by Dr. David Burns

### Key Features
- **Mental Health Tools**: Thought tracking, CBT exercises, mood tracking, AI-powered thought analysis
- **Task Management**: Smart task organization, focus sessions, recurring tasks
- **Focus & Deep Work**: Pomodoro timer, balanced task selection, session analytics
- **Financial Tools**: Spending tracking, investment tracking, trip planning
- **Privacy First**: Real-time sync with Firebase, offline support, user data ownership

### Project Philosophy
- **Offline-First**: App works without internet, syncs when connected
- **Privacy-Focused**: User controls their data, optional anonymous usage
- **Evidence-Based**: Features grounded in CBT and productivity research
- **Progressive Enhancement**: Core features work without advanced services

---

## Pre-Push Requirements

**Always run these commands before pushing or opening a PR.**

### Root (Web App)

From the repository root:

```bash
npm install
npm run build
npm test
npx tsc
```

### Functions (Cloud Functions Backend)

From the repository root:

```bash
cd functions
npm install
npm run build
npm test
npx tsc
```

### Quick Pre-Push Checklist

For **basic changes** (bug fixes, logic updates):
```bash
npm run lint && npm test && npm run build
```

For **UI changes**:
```bash
npm run lint && npm test && npm run build
npm run test:screenshots  # Visual regression tests
```

For **major features**:
```bash
# Run all tests
npm test
npm run test:screenshots

# Start Firebase emulators and test
firebase emulators:start --only auth,firestore,functions

# Verify production build
npm run build

# Optional: Run Lighthouse for performance
npx lighthouse http://localhost:3000 --view
```

---

## Codebase Structure

### Root Directory

```
/focus-notebook/
├── src/                    # Main Next.js application
├── functions/              # Firebase Cloud Functions
├── e2e/                    # Playwright end-to-end tests
├── docs/                   # Documentation
├── public/                 # Static assets
├── shared/                 # Shared types/utilities
├── .github/                # GitHub workflows
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
├── storage.rules           # Firebase Storage rules
└── [config files]          # tsconfig, jest, playwright, tailwind, etc.
```

### `/src` Directory Structure

```
/src/
├── app/                    # Next.js App Router (pages & routes)
│   ├── api/               # API routes (/api/*)
│   ├── tools/             # Tool pages (28 different tools)
│   ├── dashboard/         # Dashboard routes
│   ├── settings/          # Settings pages
│   ├── admin/             # Admin pages
│   └── [root files]       # layout.tsx, page.tsx, globals.css
│
├── components/            # React components
│   ├── ui/               # Reusable UI components (buttons, cards, dialogs)
│   ├── billing/          # Billing-related components
│   ├── dashboard/        # Dashboard components
│   ├── entity-graph/     # Entity relationship visualization
│   ├── spending/         # Spending tool components
│   ├── tools/            # Tool-specific components
│   └── [feature dirs]    # Task, Goal, Trip, Visa, Investment, etc.
│
├── store/                # Zustand state management (31 stores)
│   ├── useTasks.ts       # Task management
│   ├── useFocus.ts       # Focus sessions
│   ├── useThoughts.ts    # Thought tracking
│   ├── useInvestments.ts # Investment tracking
│   └── [others]          # Domain-specific stores
│
├── hooks/                # Custom React hooks (31 hooks)
│   ├── useFocus.ts       # Focus session logic
│   ├── useEntityGraph.ts # Entity relationships
│   ├── useLLMQueue.ts    # LLM request queueing
│   └── [others]          # Domain-specific hooks
│
├── lib/                  # Utilities and services
│   ├── firebase/         # Firebase resilience layer
│   │   ├── circuit-breaker.ts      # Circuit breaker pattern
│   │   ├── offline-queue.ts        # Offline operation queueing
│   │   ├── retry.ts                # Retry logic with backoff
│   │   ├── gateway.ts              # CRUD operations wrapper
│   │   ├── subscription-health.ts  # Real-time subscription health
│   │   ├── connection-monitor.ts   # Connection tracking
│   │   └── metrics.ts              # Operation metrics
│   ├── data/            # Data access layer
│   ├── entityGraph/     # Entity graph utilities
│   ├── analytics/       # Analytics utilities
│   ├── services/        # Service utilities
│   ├── utils/           # General utilities
│   └── [helpers]        # Firebase client, CBT utils, device detection
│
├── services/            # Business logic services
│   ├── entityService.ts              # Centralized entity management
│   ├── thoughtProcessingService.ts   # Thought processing logic
│   ├── TimeTrackingService.ts        # Time tracking
│   ├── RecurringTaskService.ts       # Recurring task logic
│   └── import-export/               # Data import/export service
│
├── repositories/        # Data repository pattern
│   ├── firebase/        # Firebase repositories
│   ├── interfaces/      # Repository interfaces
│   └── mock/            # Mock repositories for testing
│
├── contexts/            # React Context providers
│   ├── AuthContext.tsx  # Authentication (user, signing, session)
│   └── DIContext.tsx    # Dependency injection
│
├── di/                  # Dependency injection container
│   ├── Container.ts     # Service container
│   ├── ServiceKeys.ts   # Service identifiers
│   └── setup.ts         # DI setup
│
├── types/               # TypeScript type definitions
│   ├── entityGraph.ts   # Entity graph types
│   ├── spending-tool.ts # Spending types
│   ├── import-export.ts # Import/export types
│   └── [others]         # Domain-specific types
│
└── __tests__/           # Jest test suites
    ├── lib/             # Library tests
    ├── integration/     # Integration tests
    ├── routes/          # Route tests
    └── utils/           # Test utilities and builders
```

### `/functions` Directory (Cloud Functions)

```
/functions/
├── src/
│   ├── index.ts                      # Entry point, exports all functions
│   ├── processThought.ts             # AI-powered thought processing
│   ├── stripeBilling.ts              # Stripe billing integration
│   ├── plaidFunctions.ts             # Plaid API integration
│   ├── plaidWebhooks.ts              # Plaid webhook handlers
│   ├── csvStorageTrigger.ts          # CSV file processing
│   ├── marketData.ts                 # Stock market data updates
│   ├── visaDataUpdater.ts            # Visa requirement updates
│   ├── portfolioSnapshots.ts         # Daily portfolio snapshots
│   ├── cleanupAnonymous.ts           # Anonymous user cleanup
│   │
│   ├── services/                     # Specialized services
│   │   ├── categorizationService.ts  # Transaction categorization
│   │   ├── llmInsightsService.ts     # LLM-based insights
│   │   ├── plaidService.ts           # Plaid API wrapper
│   │   └── subscriptionDetection.ts  # Subscription detection
│   │
│   ├── utils/                        # Utility functions
│   │   ├── openaiClient.ts           # OpenAI integration
│   │   ├── encryption.ts             # Data encryption
│   │   ├── aiPromptLogger.ts         # AI request logging
│   │   └── contextGatherer.ts        # Context data gathering
│   │
│   ├── prompts/                      # YAML prompt templates
│   ├── types/                        # TypeScript types
│   ├── __tests__/                    # Jest tests for functions
│   └── config.ts                     # Configuration
│
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14.2.33 (App Router)
- **Language**: TypeScript 5.6.3
- **React**: 18.3.1
- **State Management**: Zustand 4.5.4
- **Forms**: react-hook-form 7.53.0
- **Animation**: framer-motion 11.0.0
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS 3.4.10 + CSS variables
- **Icons**: lucide-react 0.545.0
- **Rich Text**: TipTap 3.10.7
- **Charts**: recharts 3.3.0
- **Maps**: react-simple-maps 3.0.0
- **PWA**: next-pwa 5.6.0

### Backend & Data
- **Firebase**: 12.4.0 (Auth, Firestore, Storage)
- **Firebase Admin**: 12.7.0
- **Firebase Functions**: 7.0.0
- **Database**: Firestore (real-time, document-based)

### Mobile
- **Capacitor**: 7.4.3 (iOS native wrapper)
- **Haptics**: Capacitor Haptics 7.0.2

### Third-party Services
- **Payment**: Stripe 14.24.0
- **Banking**: Plaid 39.1.0
- **AI**: OpenAI 6.9.0, Anthropic SDK 0.68.0
- **PDF**: pdf-parse 2.4.5
- **Data**: YAML 2.8.1

### Testing
- **Jest**: 29.7.0 (unit & integration tests)
- **Testing Library**: React 14.3.1
- **Playwright**: 1.56.1 (E2E & visual regression)
- **Puppeteer**: 24.26.1 (PDF automation)

### Build & Dev
- **Node**: >= 22
- **TypeScript**: 5.6.3
- **ESLint**: 8.57.0
- **PostCSS**: 8.4.41
- **Tailwind**: 3.4.10

---

## Key Architectural Patterns

### 1. State Management with Zustand

- **31 domain-specific stores** (tasks, thoughts, investments, spending, etc.)
- Each store manages: data, loading states, cache, subscriptions
- Real-time Firebase subscriptions integrated into stores
- Store pattern:

```typescript
interface StoreState {
  items: Item[];
  isLoading: boolean;
  fromCache: boolean;
  syncError: Error | null;
  isSubscribed: boolean;

  // Actions
  add: (item: Item) => Promise<void>;
  update: (id: string, changes: Partial<Item>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  subscribe: () => () => void; // Returns unsubscribe function
}
```

### 2. Firebase Resilience Layer

Located in `src/lib/firebase/`, provides production-grade reliability:

#### Circuit Breaker (`circuit-breaker.ts`)
- Prevents cascading failures
- Automatic recovery with exponential backoff
- Per-endpoint circuit breaker management

#### Offline Queue (`offline-queue.ts`)
- Queues operations when offline
- Retries on reconnection
- Priority-based processing

#### Retry Logic (`retry.ts`)
- Configurable retry strategies
- Exponential backoff
- Error classification (retryable vs. permanent)

#### Subscription Health (`subscription-health.ts`)
- Real-time subscription monitoring
- Auto-reconnect on failures
- Health status tracking

#### Connection Monitor (`connection-monitor.ts`)
- Network connectivity tracking
- Latency measurement
- Automatic recovery triggers

#### Metrics Collection (`metrics.ts`)
- Operation performance tracking
- Connection health metrics
- Error rate monitoring

### 3. Data Access Layer

- **Gateway Pattern** (`lib/data/gateway.ts`): Wraps CRUD operations with resilience
- **Subscribe Pattern** (`lib/data/subscribe.ts`): Real-time data synchronization
- **Automatic Metadata**: createdAt, updatedAt, updatedBy, version tracking
- **Example**:

```typescript
import { createAt, updateAt, deleteAt } from '@/lib/data/gateway';

// Create with resilience
await createAt('tasks', taskId, taskData);

// Update with retry
await updateAt('tasks', taskId, updates);

// Delete with circuit breaker
await deleteAt('tasks', taskId);
```

### 4. Entity Service Pattern

- **Centralized Entity Management** (`services/entityService.ts`)
- All entity creation/linking goes through central service
- Enforces data consistency
- Manages entity graph relationships
- **Never directly mutate stores from UI**

```typescript
import { getContainer } from '@/di/Container';

const entityService = getContainer().get('entityService');
await entityService.createEntity('task', taskData, options);
```

### 5. Entity Graph System

- Graph-based relationship management
- Tracks relationships between entity types (tasks, thoughts, goals, etc.)
- Relationship types: `created-from`, `linked-to`, `related-to`
- Enables AI-powered linking and insights
- Located in: `lib/entityGraph/`

### 6. Authentication Context

- OAuth (Google) and Email/Password authentication
- Anonymous sessions (2-hour duration, configurable)
- Session management: Token refresh (45-min interval)
- User profile tracking in Firestore
- Located in: `contexts/AuthContext.tsx`

### 7. Dependency Injection

- Service locator pattern for testability
- Container-based DI system
- Mock implementations for testing
- Located in: `di/`

---

## Development Workflows

### Starting Development

```bash
# Web app
npm run dev                # Start Next.js dev server (port 3000)

# Cloud Functions (separate terminal)
cd functions
npm run serve              # Start functions emulator

# Full Firebase emulators (separate terminal)
firebase emulators:start   # Start auth, firestore, functions
```

### Building

```bash
# Web app
npm run build              # Next.js production build
npm run start              # Serve production build
npm run lint               # ESLint check
npx tsc --noEmit          # TypeScript check

# Cloud Functions
cd functions
npm run build              # Compile TypeScript
```

### Running Tests

```bash
# Jest unit tests
npm test                   # Run all tests
npm run test:watch        # Watch mode
npm run test:changed      # Changed files only
npm run test:since        # Since main branch
npm run test:ci           # CI mode with coverage

# Playwright E2E tests
npm run test:screenshots          # Run all
npm run test:screenshots:ui       # UI mode
npm run test:screenshots:debug    # Debug mode
npm run test:screenshots:update   # Update snapshots

# Functions tests
cd functions
npm test                   # Run all function tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### Environment Setup

Create `.env.local` in the root directory (use `.env.local.example` as template):

```bash
# Required Firebase variables
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY=

# Optional (for local dev)
NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=
OPENAI_API_KEY=
ALPHA_VANTAGE_API_KEY=
```

---

## Testing Guidelines

### Unit Tests (Jest)

**Location**: `src/__tests__/` and `functions/src/__tests__/`

**Key test files**:
- `useTrips.test.ts` - Trip store logic
- `cbtUtils.test.ts` - CBT utility functions
- `gateway.test.ts` - Firebase operations
- `retry.test.ts` - Retry mechanism
- `circuit-breaker.test.ts` - Circuit breaker pattern
- `dashboardAnalytics.test.ts` - Dashboard calculations

**Test structure**:
```typescript
describe('Component/Feature Name', () => {
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

**Test helpers**: Located in `src/__tests__/utils/`
- `builders/` - Data builders for test fixtures
- `testHelpers/` - Common test utilities

### E2E Tests (Playwright)

**Location**: `e2e/`

**Test suites**:
- `auth.spec.ts` - Authentication flows
- `dashboard.spec.ts` - Dashboard functionality
- `tools-tasks.spec.ts` - Task management
- `tools-goals-thoughts.spec.ts` - Goals and thoughts
- `tools-focus.spec.ts` - Focus sessions
- `tools-investment-trips.spec.ts` - Investments and trips

**Setup**: Firebase emulator with seed data in `e2e/setup/emulator-data.ts`

**Running specific tests**:
```bash
# Run specific test file
npx playwright test e2e/dashboard.spec.ts

# Run tests matching pattern
npx playwright test --grep "mobile"

# Run in headed mode
npx playwright test --headed
```

### Test Coverage Goals

- **Unit Tests**: 70%+ coverage
- **Critical Paths**: 90%+ coverage (auth, payments, data sync)
- **Edge Cases**: Test error conditions and boundaries

### When to Run Which Tests

**Always (before every push)**:
- Unit tests: `npm test`
- TypeScript: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`

**For UI changes**:
- Screenshot tests: `npm run test:screenshots`

**For major features**:
- Integration tests with Firebase emulators
- E2E tests: `npm run test:screenshots`
- Manual testing in multiple browsers

---

## Code Conventions

### File Naming

- **Components**: PascalCase (`TaskList.tsx`, `GoalFormModal.tsx`)
- **Stores**: `use<Domain>.ts` (`useTasks.ts`, `useFocus.ts`)
- **Hooks**: `use<Feature>.ts` (`useImportExport.ts`, `useLLMQueue.ts`)
- **Services**: camelCase with suffix (`entityService.ts`, `thoughtProcessingService.ts`)
- **Utilities**: camelCase (`cbtUtils.ts`, `deviceDetection.ts`)
- **Types**: camelCase or descriptive (`entityGraph.ts`, `spending-tool.ts`)
- **Tests**: `*.test.ts(x)` or `*.spec.ts`

### Component Structure

```typescript
'use client'; // Required for client components

import { useState } from 'react';
import { useStore } from '@/store/useStore';

interface ComponentProps {
  id: string;
  onClose: () => void;
}

export function ComponentName({ id, onClose }: ComponentProps) {
  // 1. Hooks (state, stores, effects)
  const data = useStore((s) => s.data);
  const [local, setLocal] = useState<string>('');

  // 2. Event handlers
  const handleSubmit = () => {
    // Logic
  };

  // 3. Render
  return (
    <div className="space-y-4">
      {/* JSX */}
    </div>
  );
}
```

### TypeScript Guidelines

- **Always use explicit types** for function parameters and returns
- **Use interfaces** for component props and data structures
- **Prefer type inference** for simple local variables
- **Use enums** for fixed sets of values
- **Avoid `any`** - use `unknown` if type is truly unknown

```typescript
// Good
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

function createTask(data: Partial<Task>): Task {
  // Implementation
}

// Avoid
function createTask(data: any): any {
  // Implementation
}
```

### Styling with Tailwind

- Use utility classes for styling
- Group related utilities together
- Use custom classes for repeated patterns
- Support dark mode with `dark:` prefix

```tsx
// Good - grouped utilities
<button className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 transition-colors">
  Submit
</button>

// Avoid inline styles
<button style={{ padding: '8px 16px', backgroundColor: '#9333ea' }}>
  Submit
</button>
```

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyAiRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    await verifyAiRequest(request);

    // 2. Parse and validate input
    const data = await request.json();

    // 3. Process request
    const result = await processData(data);

    // 4. Return response
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // 5. Handle errors
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Import Organization

```typescript
// 1. External packages
import { useState, useEffect } from 'react';
import { collection, query, where } from 'firebase/firestore';

// 2. Internal absolute imports (using @/ alias)
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/store/useTasks';
import { createAt } from '@/lib/data/gateway';

// 3. Types
import type { Task, TaskStatus } from '@/types';

// 4. Relative imports (if needed)
import { TaskCard } from './TaskCard';
```

---

## Common Development Tasks

### Adding a New Tool

1. **Create page**: `src/app/tools/<tool-name>/page.tsx`
2. **Create store**: `src/store/use<ToolName>.ts`
3. **Create components**: `src/components/<tool-name>/`
4. **Add to navigation**: Update navigation components
5. **Integrate entity graph** (if relationships needed)
6. **Add analytics**: Use `useToolUsage` hook
7. **Write tests**: `src/__tests__/<tool-name>.test.ts`
8. **Update documentation**

### Adding AI Features

1. **Create prompt**: `functions/src/prompts/<feature>.yaml`
2. **Implement service**: `functions/src/services/<feature>Service.ts`
3. **Create API route**: `src/app/api/<feature>/route.ts`
4. **Add verification**: Use `verifyAiRequest` in API route
5. **Handle rate limiting**: Track token usage
6. **Queue operations**: Use LLM queue if batch needed
7. **Test with emulator**
8. **Write tests**

### Modifying Data Schema

1. **Update Firestore rules**: `firestore.rules`
2. **Update TypeScript types**: `src/types/`
3. **Update stores**: Add new fields to stores
4. **Update components**: Use new fields
5. **Write migration** (if needed): `src/lib/migrations/`
6. **Test thoroughly**: Especially existing data
7. **Deploy rules**: `firebase deploy --only firestore:rules`

### Adding Third-Party Integration

1. **Add dependency**: `npm install <package>`
2. **Add types**: `npm install -D @types/<package>` (if needed)
3. **Create service wrapper**: `src/lib/services/<service>.ts`
4. **Add environment variables**: `.env.local` and `.env.local.example`
5. **Add security rules** (if Firebase involved)
6. **Document setup**: Add to `docs/guides/setup.md`
7. **Write tests with mocks**

---

## Important Guidelines for AI Assistants

### General Principles

1. **Read Before Editing**: Always read files before making changes
2. **Run Tests**: Always run tests after making changes
3. **Check Types**: Run `npx tsc --noEmit` to check for type errors
4. **Build Verification**: Run `npm run build` before committing
5. **Follow Patterns**: Use existing patterns in the codebase
6. **Ask When Uncertain**: Clarify requirements before implementing

### Code Quality Standards

1. **Type Safety**: Use TypeScript strictly, avoid `any`
2. **Error Handling**: Always handle errors gracefully
3. **Loading States**: Show loading indicators for async operations
4. **Offline Support**: Consider offline scenarios
5. **Accessibility**: Use semantic HTML and ARIA labels
6. **Performance**: Minimize re-renders, use React.memo when needed
7. **Security**: Never expose API keys, validate user input

### Data Flow Rules

1. **Never bypass gateway**: Use `createAt`, `updateAt`, `deleteAt` for Firestore
2. **Never mutate stores directly**: Use store actions
3. **Use entity service**: For entity creation with relationships
4. **Subscribe in useEffect**: Real-time subscriptions in effects
5. **Unsubscribe properly**: Return cleanup function from useEffect

### Testing Requirements

1. **Write tests for new features**: Unit tests minimum
2. **Test edge cases**: Empty states, errors, loading
3. **Mock Firebase**: Use test utilities from `__tests__/utils/`
4. **Test offline behavior**: Important for resilience
5. **Update snapshots**: When UI intentionally changes

### Security Considerations

1. **Validate input**: Always validate user input
2. **Verify authentication**: Use `verifyAiRequest` in API routes
3. **Check authorization**: Ensure user owns data
4. **Sanitize output**: Prevent XSS attacks
5. **Rate limiting**: Implement for expensive operations
6. **Never log sensitive data**: API keys, tokens, passwords

### Performance Best Practices

1. **Lazy load components**: Use React.lazy for large components
2. **Optimize images**: Use Next.js Image component
3. **Debounce input**: For search and autocomplete
4. **Paginate lists**: Don't render thousands of items
5. **Use indexes**: Firestore queries need indexes
6. **Cache data**: Use store caching, don't fetch repeatedly

### Common Pitfalls to Avoid

1. ❌ **Don't use Firebase directly**: Use gateway/subscribe helpers
2. ❌ **Don't mutate state directly**: Use setState or store actions
3. ❌ **Don't forget cleanup**: Unsubscribe from listeners
4. ❌ **Don't skip error handling**: Always handle promise rejections
5. ❌ **Don't use `any` type**: Use proper types or `unknown`
6. ❌ **Don't commit secrets**: Use environment variables
7. ❌ **Don't skip tests**: Write tests for new code

### Debugging Tips

1. **Check browser console**: Look for errors and warnings
2. **Use React DevTools**: Inspect component state and props
3. **Check Network tab**: Verify API calls and responses
4. **Use Firebase Emulator UI**: View emulator data at `localhost:4000`
5. **Check Firestore rules**: Ensure rules allow operation
6. **Verify environment variables**: Check `.env.local` is loaded

### Git Workflow

1. **Create feature branch**: `git checkout -b feature/description`
2. **Make small commits**: Atomic, focused commits
3. **Write clear messages**: Use conventional commit format
4. **Run pre-push checks**: lint, test, build
5. **Create descriptive PRs**: Explain what and why
6. **Link issues**: Reference related issues in PR

### Documentation

1. **Update CLAUDE.md**: If architecture changes
2. **Update README.md**: If setup process changes
3. **Add JSDoc comments**: For complex functions
4. **Update inline docs**: Keep comments accurate
5. **Create guides**: For new features or integrations

---

## Additional Resources

### Internal Documentation
- [Complete Documentation](docs/README.md)
- [Setup Guide](docs/guides/setup.md)
- [Development Guide](docs/guides/development.md)
- [Testing Guide](docs/guides/testing.md)
- [Contributing Guide](docs/guides/contributing.md)
- [Architecture](docs/reference/architecture.md)
- [Features](docs/reference/features.md)
- [Cloud Functions](docs/reference/functions.md)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)

---

## Questions or Issues?

- **GitHub Issues**: [Report bugs or request features](https://github.com/mesbahtanvir/focus-notebook/issues)
- **Documentation**: Check the `docs/` directory
- **Code Examples**: Look at existing implementations in the codebase

---

**Remember**: This is a mental health and productivity tool. Code quality, reliability, and user privacy are paramount. When in doubt, prioritize user safety and data security.

*Last updated: 2025-11-18*
