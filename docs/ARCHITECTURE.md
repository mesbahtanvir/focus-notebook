# Project Architecture

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **UI Components**: Radix UI + shadcn/ui

### State Management
- **Store**: Zustand
- **Local Database**: Dexie.js (IndexedDB wrapper)

### Backend
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Hosting**: Vercel (Frontend), Firebase (Data)

### Mobile
- **Framework**: Capacitor (iOS/Android)

## Project Structure

```
personal-notebook/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Homepage
│   │   ├── layout.tsx         # Root layout
│   │   ├── dashboard/         # Dashboard page
│   │   ├── admin/             # Admin panel
│   │   ├── settings/          # Settings page
│   │   ├── tools/             # Tool pages
│   │   │   ├── tasks/         # Task management
│   │   │   ├── focus/         # Focus sessions
│   │   │   ├── thoughts/      # Thoughts tracker
│   │   │   ├── moodtracker/   # Mood tracking
│   │   │   ├── cbt/           # CBT exercises
│   │   │   ├── brainstorming/ # AI brainstorming
│   │   │   ├── documents/     # Notes & documents
│   │   │   ├── projects/      # Project management
│   │   │   └── errands/       # Errands & out-of-office tasks
│   │   └── api/               # API routes
│   │       ├── chat/          # AI chat endpoint
│   │       └── process-thought/ # Thought processing
│   │
│   ├── components/            # React components
│   │   ├── Layout.tsx         # App layout
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── TaskList.tsx       # Task components
│   │   ├── FocusSession.tsx   # Focus session UI
│   │   ├── ThoughtProcessor*  # Thought processing
│   │   └── ui/                # shadcn/ui components
│   │
│   ├── store/                 # Zustand stores
│   │   ├── useTasks.ts        # Task state
│   │   ├── useThoughts.ts     # Thoughts state
│   │   ├── useFocus.ts        # Focus sessions state
│   │   ├── useMoods.ts        # Mood tracking state
│   │   ├── useSettings.ts     # App settings
│   │   └── useProcessQueue.ts # Thought processing queue
│   │
│   ├── lib/                   # Utilities & helpers
│   │   ├── firebase.ts        # Firebase config
│   │   ├── syncEngine.ts      # Cloud sync logic
│   │   ├── cloudSync.ts       # Sync operations
│   │   └── thoughtProcessor/  # AI processing logic
│   │
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx    # Authentication context
│   │
│   ├── hooks/                 # Custom React hooks
│   │   └── use-toast.ts       # Toast notifications
│   │
│   ├── db/                    # Database layer
│   │   └── index.ts           # Dexie schema & helpers
│   │
│   └── types/                 # TypeScript types
│
├── docs/                      # Documentation
├── .github/                   # GitHub config
│   ├── workflows/             # GitHub Actions
│   └── ISSUE_TEMPLATE/        # Issue templates
├── ios/                       # iOS app (Capacitor)
└── public/                    # Static assets
```

## Design System

### UI Principles

1. **Colorful & Engaging**
   - Gradient backgrounds
   - Bold, vibrant colors
   - Smooth animations
   - Playful emojis

2. **Accessibility**
   - Dark mode support
   - Semantic HTML
   - ARIA labels
   - Keyboard navigation

3. **Mobile-First**
   - Responsive design
   - Touch-friendly targets
   - Progressive Web App

### Component Patterns

#### Cards
```tsx
<div className="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 
                dark:from-purple-950/20 dark:to-pink-950/20 
                border-2 border-purple-200 dark:border-purple-800">
  {/* Content */}
</div>
```

#### Buttons
```tsx
<button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                   hover:from-purple-600 hover:to-pink-600 text-white 
                   font-bold rounded-xl shadow-lg transition-all 
                   transform hover:scale-105 active:scale-95">
  Action
</button>
```

#### Inputs
```tsx
<input className="input w-full px-4 py-2 rounded-lg border-2 
                  focus:border-purple-500 focus:ring-2 
                  focus:ring-purple-100 dark:focus:ring-purple-900" />
```

## Data Flow

### Local-First Architecture

```
User Action
    ↓
React Component
    ↓
Zustand Store (State Update)
    ↓
├─→ IndexedDB (Local Persistence)
└─→ Firebase (Cloud Sync - if authenticated)
```

### Key Features

1. **Offline-First**
   - All data stored locally in IndexedDB
   - Works without internet
   - Fast, responsive

2. **Cloud Sync**
   - Optional authentication
   - Automatic background sync
   - Conflict resolution
   - Multi-device support

3. **Real-Time Updates**
   - Optimistic UI updates
   - Immediate local changes
   - Background cloud sync

## Database Schema

### IndexedDB (Dexie)

**Version 10** (Current)

```typescript
// Tasks
tasks: {
  id: string (primary key)
  title: string
  done: boolean
  category: 'mastery' | 'pleasure'
  status: 'active' | 'completed' | 'backlog'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: string
  dueDate?: string
  completedAt?: string
  notes?: string
  tags?: string[] (JSON)
  estimatedMinutes?: number
  recurrence?: RecurrenceConfig (JSON)
  parentTaskId?: string
  completionCount?: number
  focusEligible?: boolean
}

// Thoughts
thoughts: {
  id: string (primary key)
  text: string
  type: 'task' | 'feeling-good' | 'feeling-bad' | 'neutral'
  done: boolean
  createdAt: string
  tags?: string[] (JSON)
  intensity?: number (1-10)
  notes?: string
  cbtAnalysis?: object (JSON)
}

// Moods
moods: {
  id: string (primary key)
  value: number (1-10)
  note?: string
  createdAt: string
}

// Focus Sessions
focusSessions: {
  id: string (primary key)
  duration: number (minutes)
  startTime: string
  endTime?: string
  tasksData: string (JSON)
  isActive?: boolean
  currentTaskIndex?: number
  pausedAt?: string
  totalPausedTime?: number (milliseconds)
  feedback?: string
  rating?: number (1-5)
}
```

### Firebase Firestore

```
users/{userId}/
  ├── tasks/{taskId}
  ├── thoughts/{thoughtId}
  ├── moods/{moodId}
  └── focusSessions/{sessionId}
```

## Resilience & Offline Infrastructure

Long-running browser sessions, background tabs, and flaky networks drove an entire resilience stack. Keep these modules in mind when debugging sync issues.

### Background Visibility Management
- `src/lib/firebase/visibility-manager.ts` exposes `visibilityManager.onVisibilityChange` for precise background/foreground events.
- `src/hooks/useVisibilityRefresh.ts` auto-refreshes data when the tab returns to the foreground and marks data as stale if the background duration exceeds a configurable threshold.
- UI helpers such as `StaleDataWarning` and the enhanced `OfflineBanner` show background staleness alongside offline state.

### Offline Queue & Retry
- `src/lib/firebase/offline-queue.ts` persists write operations (create/update/delete) into localStorage when offline. Operations register executors and replay automatically when connectivity is restored.
- `src/lib/firebase/retry.ts` + `gateway.ts` provide exponential backoff, jitter, and timeout utilities. The helper distinguishes retryable errors (network, rate-limit) from hard failures (auth, invalid-argument).

### Circuit Breakers & Resilient Operations
- `src/lib/firebase/circuit-breaker.ts` implements CLOSED → OPEN → HALF_OPEN cycles to prevent hammering Firebase during incidents.
- `src/lib/firebase/resilient-operations.ts` wraps reads/writes with the queue, retry, and circuit breaker layers so components call `resilientRead`, `resilientCreate`, etc. instead of direct SDK calls.

### Connection Health Monitoring
- `src/lib/firebase/initialize-resilience.ts` wires together the offline queue, metrics, and monitors and is invoked once from `app/layout.tsx`.
- `src/components/ConnectionHealthMonitor.tsx` + `src/hooks/useConnectionHealth.ts` surface degraded states (offline queue growth, breaker open, high latency) so users understand what’s happening.

### Metrics & Logging
- Metrics collectors track operation timings, queue depth, circuit-breaker transitions, and reconnection attempts. Logging is verbose in development and reduced in production; wrap noisy logs behind a debug flag when extending functionality.

### Background Tab Fixes
- `visibilityManager` ties into Auth token refreshes and Firestore subscription restarts, eliminating stale data when the browser tab resumes after being inactive. Use `subscribeWithAutoReconnect` from `src/lib/data/subscribe` to automatically recover listeners.

Together these pieces explain the “Sprint 2/3” markdown notes that previously lived in the repo—refer back here instead of resurrecting separate documents.

## State Management

### Zustand Stores

Each store follows this pattern:

```typescript
type State = {
  // Data
  items: Item[]
  isLoading: boolean
  
  // Actions
  loadItems: () => Promise<void>
  add: (item: Omit<Item, 'id'>) => Promise<void>
  update: (id: string, updates: Partial<Item>) => Promise<void>
  delete: (id: string) => Promise<void>
}

export const useStore = create<State>((set, get) => ({
  items: [],
  isLoading: true,
  
  loadItems: async () => {
    const items = await db.items.toArray()
    set({ items, isLoading: false })
  },
  
  add: async (item) => {
    const newItem = { ...item, id: Date.now().toString() }
    await db.items.add(newItem)
    set(state => ({ items: [...state.items, newItem] }))
    
    // Sync to cloud if authenticated
    if (auth.currentUser) {
      await pushItemToCloud('items', newItem)
    }
  },
  
  // ... other actions
}))

// Auto-load on client side
if (typeof window !== 'undefined') {
  useStore.getState().loadItems()
}
```

## Authentication & Authorization

### Firebase Auth
- Email/Password authentication
- Google OAuth (optional)
- Anonymous sessions (offline mode)

### Security Rules
```javascript
// Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

## Performance Optimizations

1. **Code Splitting**
   - Next.js automatic code splitting
   - Dynamic imports for heavy components
   - Route-based splitting

2. **Caching**
   - IndexedDB for data
   - Service Worker for assets
   - Incremental Static Regeneration

3. **Lazy Loading**
   - Images with next/image
   - Components with React.lazy()
   - Data pagination

4. **Bundle Size**
   - Tree shaking
   - Minimal dependencies
   - Route-based chunks

## Testing Strategy

### Unit Tests (Jest)
- Store logic
- Utility functions
- Helper functions

### Integration Tests
- Component + Store interactions
- Database operations
- API endpoints

### E2E Tests (To be implemented)
- Critical user flows
- Cross-browser testing
- Mobile testing

## Deployment

### Vercel (Frontend)
- Automatic deployments from main branch
- Preview deployments for PRs
- Environment variables in dashboard
- Edge functions for API routes

### Firebase (Backend)
- Authentication service
- Firestore database
- Automatic scaling
- Security rules

## Mobile Apps

### Capacitor
- Native iOS app
- Native Android app (planned)
- Web APIs mapped to native
- Shared codebase with web

## Development Workflow

1. **Feature Development**
   ```bash
   npm run dev          # Start dev server
   npm run test         # Run tests
   npm run lint         # Check code style
   npm run build        # Build for production
   ```

2. **Git Workflow**
   - Feature branches
   - Pull requests
   - Code review
   - Automated testing (CI)

3. **Release Process**
   - Version bump
   - Update CHANGELOG
   - Create GitHub release
   - Deploy to production

## Future Enhancements

- [ ] Offline AI models
- [ ] Plugin system
- [ ] Community features
- [ ] Advanced analytics
- [ ] Android app
- [ ] Desktop app (Electron)

---

*Last updated: October 2025*
