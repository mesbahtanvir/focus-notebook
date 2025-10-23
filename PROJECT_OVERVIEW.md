# Personal Notebook - Complete Project Documentation

> **Last Updated**: January 2025  
> **Purpose**: Comprehensive reference for LLMs, developers, and contributors  
> **Audience**: AI agents analyzing/modifying this codebase, new developers, contributors

## 📖 Document Guide

This document provides everything you need to understand this project:

1. **Executive Summary** - What this project is and does
2. **Current Implementation** - What's actually built (vs planned)
3. **Technical Architecture** - How it's built
4. **Data Models** - Data structures and relationships
5. **Feature Documentation** - How features work
6. **Setup Guides** - How to configure and run
7. **Development Guide** - How to contribute
8. **Known Gaps** - What's missing vs planned

> **📝 Note on Code Examples**: This document focuses on **logic and patterns** rather than exact code snippets. Code may change over time. Where code is shown (e.g., data models), treat it as a reference for the current structure, not a definitive implementation. Always check the actual source files for the latest code.

## 📖 Quick Navigation

- [Executive Summary](#executive-summary)
- [Current Implementation State](#current-implementation-state)
- [Technical Architecture](#technical-architecture)
- [Data Models & Relationships](#data-models--relationships)
- [Feature Documentation](#feature-documentation)
- [Setup & Configuration](#setup--configuration)
- [Development Guide](#development-guide)
- [Known Gaps & Roadmap](#known-gaps--roadmap)

---

# Executive Summary

## What is This Project?

A **privacy-first mental health and productivity app** combining:
- 📝 **Thought tracking** with AI-powered analysis
- ✅ **Task management** with focus sessions
- 🧠 **CBT tools** for anxiety/depression management
- 📊 **Mood tracking** and analytics
- 🎯 **Goal & project management**

**Inspired by**: *Feeling Good: The New Mood Therapy* by Dr. David Burns

## Core Philosophy

1. **Privacy-First**: Local storage by default, optional cloud sync
2. **Evidence-Based**: CBT techniques backed by research
3. **Offline-First**: Works without internet
4. **User Agency**: Manual control over AI features
5. **Mental Health Focus**: Designed for people managing depression/anxiety

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand + Firebase real-time sync
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth
- **Animation**: Framer Motion
- **Mobile**: Capacitor (iOS)

---

# Current Implementation State

## ✅ Fully Implemented Features

### Core Data Entities
| Entity | CRUD | Firebase Sync | Real-time | Notes |
|--------|------|---------------|-----------|-------|
| **Tasks** | ✅ | ✅ | ✅ | Recurring tasks, mastery/pleasure, focus-eligible flag |
| **Thoughts** | ✅ | ✅ | ✅ | Types, intensity, CBT analysis, AI processing |
| **Projects** | ✅ | ✅ | ✅ | Goal linkage, task/thought linking, milestones |
| **Goals** | ✅ | ✅ | ✅ | Action plans, progress tracking |
| **Moods** | ✅ | ✅ | ✅ | 1-10 rating, notes |
| **Focus Sessions** | ✅ | ✅ | ✅ | Balanced task selection, time tracking, pause/resume |

### Core Features
- ✅ **Home Page**: Quick thought entry, recent thoughts, task list
- ✅ **Focus Sessions**: Zen Mode UI (redesigned Jan 2025), balanced task selection
- ✅ **LLM Processing**: Manual thought processing with approval workflow
- ✅ **CBT Framework**: Thought records, evidence gathering, reframing
- ✅ **Dashboard**: Trends (7/30/90 days), productivity by time, mood charts
- ✅ **Recurring Tasks**: Daily, workweek, weekly, monthly patterns
- ✅ **Dark Mode**: Full dark theme support
- ✅ **Mobile**: iOS app structure (Capacitor)
- ✅ **Revert Functionality**: Undo AI processing actions

## ⚠️ Partially Implemented

- ⚠️ **Notes Tool**: Just aggregates task notes, not standalone
- ⚠️ **Deep Thought Tool**: Local state only, NOT Firebase synced
- ⚠️ **Data Export/Import**: Basic implementation, needs enhancement
- ⚠️ **Project Milestones**: Created but minimal UI

## ❌ NOT Implemented (vs Draft Plan)

- ❌ **Sub-project hierarchy**: Projects are flat, no nesting
- ❌ **Automatic thought processing**: Requires manual trigger
- ❌ **Similar thought detection/merging**: Not implemented
- ❌ **Deep Thought integration**: Separate from main Thought system
- ❌ **Focus mode tool access**: Can't use CBT/Brainstorming/Deep Thought from focus session
- ❌ **Goal progress visualization**: No graphs/charts for goals
- ❌ **Keyboard shortcuts**: Not implemented

---

# Technical Architecture

## System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│            (Next.js 14 App Router + React)              │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                  Zustand Stores                          │
│  (useTasks, useThoughts, useFocus, useProjects, etc.)  │
└──────────┬────────────────────┬─────────────────────────┘
           │                    │
┌──────────▼────────┐  ┌───────▼──────────┐
│   Firebase         │  │  LLM Processing  │
│   Firestore        │  │  Queue           │
│   (Cloud Sync)     │  │  (useProcessQueue│
└────────────────────┘  └──────────────────┘
\`\`\`

## Data Flow

\`\`\`
User Action (e.g., create task)
    ↓
React Component
    ↓
Zustand Store Action (add)
    ↓
├─→ Optimistic UI Update (immediate)
├─→ Firebase Write (if authenticated)
└─→ Real-time Listener Update (confirms)
\`\`\`

## File Structure

\`\`\`
src/
├── app/                          # Next.js routes
│   ├── page.tsx                 # Home page
│   ├── dashboard/page.tsx       # Analytics dashboard
│   ├── login/page.tsx           # Authentication
│   ├── tools/                   # Tool pages
│   │   ├── tasks/page.tsx
│   │   ├── thoughts/page.tsx
│   │   ├── focus/page.tsx
│   │   ├── goals/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── errands/page.tsx
│   │   ├── moodtracker/page.tsx
│   │   ├── brainstorming/page.tsx
│   │   ├── cbt/page.tsx
│   │   ├── notes/page.tsx
│   │   └── deepthought/page.tsx  # ⚠️ Local state only!
│   └── api/
│       └── process-thought/route.ts  # LLM endpoint
├── components/
│   ├── FocusSession.tsx         # Zen Mode UI
│   ├── ThoughtDetailModal.tsx
│   ├── TaskList.tsx
│   ├── SummaryPanel.tsx
│   └── ui/                      # shadcn components
├── store/                        # Zustand stores
│   ├── useTasks.ts
│   ├── useThoughts.ts
│   ├── useFocus.ts
│   ├── useProjects.ts
│   ├── useGoals.ts
│   ├── useMoods.ts
│   └── useProcessQueue.ts       # LLM processing
├── lib/
│   ├── firebaseClient.ts
│   ├── data/
│   │   ├── gateway.ts           # CRUD operations
│   │   └── subscribe.ts         # Real-time subscriptions
│   └── thoughtProcessor/
│       ├── toolRegistry.ts      # LLM tool definitions
│       ├── actionExecutor.ts
│       ├── manualProcessor.ts
│       └── cascadingDelete.ts
└── contexts/
    └── AuthContext.tsx
\`\`\`

---

# Data Models & Relationships

> **Note**: The interfaces below represent the current schema. Field names and types may evolve. Refer to the actual TypeScript files in `src/store/` for the latest definitions.

## Core Data Types

### 1. Thought
\`\`\`typescript
interface Thought {
  id: string
  text: string
  type: 'task' | 'feeling-good' | 'feeling-bad' | 'neutral'
  done: boolean
  createdAt: string
  tags?: string[]                // e.g., ['processed', 'brainstorming', 'cbt']
  intensity?: number             // 1-10 for feelings
  notes?: string
  // Deep thought fields (added but NOT in UI yet)
  isDeepThought?: boolean
  deepThoughtNotes?: string
  deepThoughtSessionsCount?: number
  // CBT Analysis
  cbtAnalysis?: {
    situation?: string
    automaticThought?: string
    emotion?: string
    evidence?: string
    alternativeThought?: string
    outcome?: string
    analyzedAt?: string
  }
}
\`\`\`

**Purpose**: Central entry point for all user input. Thoughts can spawn tasks, projects, goals, or mood entries through AI processing.

### 2. Task
\`\`\`typescript
interface Task {
  id: string
  title: string
  done: boolean
  status: 'active' | 'completed' | 'backlog'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: 'mastery' | 'pleasure'        // For focus session balance
  estimatedMinutes?: number
  actualMinutes?: number
  focusEligible?: boolean                   // ⭐ Key: determines Focus vs Errand
  projectId?: string                        // Links to project
  thoughtId?: string                        // Links to originating thought
  recurrence?: {
    type: 'none' | 'daily' | 'workweek' | 'weekly' | 'monthly'
    frequency?: number
    daysOfWeek?: number[]  // 0-6 (Sun-Sat)
  }
  notes?: string
  tags?: string[]
  dueDate?: string
  completedAt?: string
  parentTaskId?: string          // For recurring task instances
  completionCount?: number
}
\`\`\`

**Key Concept**: `focusEligible` flag determines:
- `true` → Can be done in focus sessions (laptop/desk work)
- `false` → Treated as "Errand" (out-of-office task)

### 3. Project
\`\`\`typescript
interface Project {
  id: string
  title: string
  objective: string
  actionPlan: string[]
  description?: string
  goalId?: string                     // Links to goal
  timeframe: 'short-term' | 'long-term'
  status: 'active' | 'on-hold' | 'completed' | 'cancelled'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  category: 'health' | 'wealth' | 'mastery' | 'connection'
  linkedThoughtIds: string[]          // ⭐ Bidirectional linking
  linkedTaskIds: string[]             // ⭐ Bidirectional linking
  progress?: number  // 0-100
  tags?: string[]
  milestones?: {
    id: string
    title: string
    completed: boolean
    completedAt?: string
  }[]
  source?: 'manual' | 'ai' | 'thought'
}
\`\`\`

**⚠️ Important**: No sub-project hierarchy. Projects are FLAT.

### 4. Goal
\`\`\`typescript
interface Goal {
  id: string
  title: string
  objective: string
  actionPlan: string[]
  status: 'active' | 'completed' | 'paused' | 'archived'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  progress?: number  // 0-100
  targetDate?: string
  tags?: string[]
  source?: 'manual' | 'ai' | 'thought'
}
\`\`\`

**Note**: Projects link TO goals, but no reverse UI navigation.

### 5. FocusSession
\`\`\`typescript
interface FocusSession {
  id: string
  duration: number  // minutes
  tasks: FocusTask[]
  startTime: string
  endTime?: string
  currentTaskIndex: number
  isActive: boolean
  feedback?: string
  rating?: number  // 1-5
  pausedAt?: string
  totalPausedTime?: number  // milliseconds
}

interface FocusTask {
  task: Task                    // Snapshot of task at start
  timeSpent: number            // seconds
  completed: boolean
  notes?: string               // Session notes for this task
  followUpTaskIds?: string[]   // Tasks created during session
}
\`\`\`

**Zen Mode**: Recently redesigned (Jan 2025) with centered layout, task dots navigation.

### 6. Mood
\`\`\`typescript
interface Mood {
  id: string
  value: number  // 1-10
  notes?: string
  createdAt: string
}
\`\`\`

Simple mood tracking.

### 7. ProcessQueueItem (LLM Processing)
\`\`\`typescript
interface ProcessQueueItem {
  id: string
  thoughtId: string
  timestamp: string
  mode: 'auto' | 'safe' | 'manual'
  status: 'pending' | 'processing' | 'awaiting-approval' | 'completed' | 'reverted'
  actions: ProcessAction[]
  revertData: RevertData         // ⭐ Allows undo
}

interface ProcessAction {
  type: 'createTask' | 'addTag' | 'enhanceThought' | 'changeType' | 
        'setIntensity' | 'createMoodEntry' | 'createProject' | 'linkToProject'
  data: any
  status: 'pending' | 'approved' | 'executed' | 'reverted'
  aiReasoning?: string
}
\`\`\`

**Processing Modes**:
- **Manual**: User approves every action
- **Safe**: Auto-executes low-confidence, asks for high-impact
- **Auto**: Executes everything

## Data Relationships

\`\`\`
Thought (source of truth)
  ├── Can create → Task (via LLM processing)
  ├── Can create → Project (via LLM processing)
  ├── Can create → Goal (via LLM processing)
  └── Can create → Mood Entry (via LLM processing)

Task
  ├── projectId → links to Project
  ├── thoughtId → links to originating Thought
  └── focusEligible → determines Focus Session vs Errand

Project
  ├── goalId → links to Goal
  ├── linkedTaskIds[] → tracks related Tasks
  └── linkedThoughtIds[] → tracks related Thoughts

Goal
  └── (Projects link to Goals, no reverse navigation in UI)

FocusSession
  └── tasks[] → contains Task snapshots + time tracking

ProcessQueueItem
  └── thoughtId → links to Thought being processed
      └── actions[] → can create Tasks, Projects, Goals
\`\`\`

## Firebase Firestore Structure

\`\`\`
/users/{userId}/
  ├── /thoughts/{thoughtId}
  ├── /tasks/{taskId}
  ├── /projects/{projectId}
  ├── /goals/{goalId}
  ├── /moods/{moodId}
  ├── /sessions/{sessionId}        # Focus sessions
  └── /requestLogs/{logId}         # API debugging
\`\`\`

**Security Rules**:
\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
\`\`\`

---

# Feature Documentation

## 1. Home Page (`/`)

**Purpose**: Quick capture hub and daily overview

**Components**:
- 💭 **Thought Input**: "What's on your mind?" - instant thought capture
- 📝 **Recent Thoughts**: Last 3 thoughts with type badges
- ✅ **Active Tasks**: Current task list
- 🚗 **Errands**: Count of non-focus-eligible tasks
- ⚡ **Quick Focus**: Start focus session button

**User Flow**:
1. User types thought → clicks "Add"
2. Thought appears as 'neutral' type by default
3. Click thought → opens detail modal
4. Can process, edit, or delete

**Note**: No automatic LLM processing on creation (manual trigger required)

---

## 2. Focus Sessions (`/tools/focus`)

**Purpose**: Distraction-free deep work with balanced task selection

### Setup Flow
1. Select duration (25/50/90/120 min or custom)
2. System auto-suggests balanced tasks:
   - Filters: `active`, `!done`, `focusEligible === true`
   - Sorts by priority: urgent > high > medium > low
   - Alternates: mastery → pleasure → mastery → pleasure
   - Stops when time budget exceeded
3. User can add/remove tasks
4. Click "Start Session" → Enters Zen Mode

### Zen Mode (NEW - Jan 2025)
**Design**: Centered, minimal, distraction-free

**Layout**:
```
┌──────────────────────────────────────┐
│ ⏸  2/5 completed    [End Session]   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ Progress bar
│                                      │
│      Write quarterly report          │ Task title
│      🧠 mastery · high               │ Metadata
│      ⏱ 12m                           │ Timer
│                                      │
│   [✓ Mark Complete]    [Next →]     │ Actions
│                                      │
│   Notes:                             │
│   ┌────────────────────────────────┐│
│   │                                ││ Notes area
│   └────────────────────────────────┘│
│                                      │
│         ○ ○ ● ○ ○                   │ Task dots
└──────────────────────────────────────┘
```

**Features**:
- ⏱ **Timer**: Counts time per task (not countdown)
- ⏸ **Pause/Resume**: Tracks total paused time
- 📝 **Session Notes**: Auto-saved to task notes every 1.5s
- ○ **Task Dots**: Click to switch tasks (current = purple pill, completed = green, pending = gray)
- ✓ **Mark Complete**: Auto-advances to next task
- 📊 **End Session**: Optional feedback/rating

**Persistence**: Sessions survive browser close/reload

---

## 3. Thought Processing System

**Trigger**: Manual button click on thought detail modal

### Processing Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Manual** | User approves every action | Full control, review each suggestion |
| **Safe** | Auto-executes low-confidence, asks for high-impact | Balanced automation |
| **Auto** | Executes everything automatically | Trust AI fully |

### Process Flow

```
1. User clicks "Process" on thought
2. Select mode (manual/safe/auto)
3. LLM analyzes thought via /api/process-thought
4. Returns suggested actions:
   - enhanceThought: Improve text clarity
   - addTag: Add processing tags (brainstorming, cbt, deepthought)
   - changeType: Update thought type
   - setIntensity: Set emotional intensity
   - createTask: Generate actionable task
   - createProject: Create project from idea
   - createMoodEntry: Log mood from feeling
   - linkToProject: Connect to existing project
5. User approves (manual/safe) or auto-executes (auto)
6. Actions execute → creates tasks, updates thought, etc.
7. Queue item status → 'completed'
8. User can revert later (undo all changes)
```

### Revert Functionality

**Purpose**: Undo AI processing actions

**What it reverts**:
- ✅ Deletes created tasks/projects
- ✅ Restores original thought text
- ✅ Removes added tags
- ✅ Reverts type/intensity changes

**How**: Click "Revert" in thought detail modal

**Implementation**: `ProcessQueueItem.revertData` tracks all changes

---

## 4. CBT (Cognitive Behavioral Therapy) Tool

**Path**: `/tools/cbt` or from thought detail modal (feeling-bad thoughts)

**Framework**: Based on Dr. David Burns' "Feeling Good"

### CBT Thought Record Steps

1. **Situation**: What triggered the feeling?
   - Objective description (who, what, when, where)
   
2. **Automatic Thought**: What went through your mind?
   - The negative thought that arose
   
3. **Emotion**: What did you feel?
   - Name the emotion + intensity (1-10)
   
4. **Evidence**: What supports the automatic thought?
   - Facts that seem to confirm it
   
5. **Alternative Thought**: What's a more balanced perspective?
   - Challenge cognitive distortions
   - Look for evidence against
   
6. **Outcome**: Re-rate emotion
   - Typically decreases after reframing

**Storage**: Saved to `thought.cbtAnalysis` object

---

## 5. Dashboard (`/dashboard`)

**Purpose**: Analytics and trends visualization

### Summary Panel (Time-based)
- **Selector**: Today | This Week | This Month
- **Metrics**:
  - Tasks completed
  - Mastery vs Pleasure breakdown (pie chart)
  - Average mood
  - Total focus time

### Trends (Historical)
- **Selector**: 7 days | 30 days | 90 days
- **Charts**:
  - 📈 Task completion over time (line chart)
  - 🎯 Mastery vs Pleasure over time (stacked area)
  - 😊 Mood trends (line chart)
  - ⏱ Focus time trends (bar chart)

### Productivity by Time of Day
- **Selector**: 7 days | 30 days | 90 days
- **Buckets**: Morning, Afternoon, Evening, Night, Late Night
- **Shows**: Task completions per time bucket
- **Based on**: Task `completedAt` timestamp

---

## 6. Tasks (`/tools/tasks`)

### Tabs
1. **Active**: Current tasks (`status === 'active'`, `!done`)
2. **Completed**: Done tasks (`done === true`)
3. **Backlog**: Deferred tasks (`status === 'backlog'`)

### Filters
- All / Mastery / Pleasure / Errands

### Task Creation
- Title (required)
- Priority: low/medium/high/urgent
- Category: mastery/pleasure
- Due date
- Estimated minutes
- Focus eligible toggle (default: ON)
- Recurrence pattern
- Notes
- Tags

### Recurring Tasks

**Patterns**:
- **Daily**: Every day
- **Workweek**: Monday-Friday only
- **Weekly**: Specific days (e.g., Mon, Wed, Fri)
- **Monthly**: Once per month

**Behavior**:
- System auto-creates instances based on pattern
- Each instance has `parentTaskId` pointing to template
- `completionCount` tracks completions this period

---

## 7. Projects (`/tools/projects`)

**Features**:
- Create projects with objective + action plan
- Link to goals (optional)
- Track linked tasks and thoughts
- Basic milestones
- Progress percentage (0-100)
- Categories: health, wealth, mastery, connection

**⚠️ Limitation**: NO sub-projects. Flat structure only.

---

## 8. Goals (`/tools/goals`)

**Features**:
- Define long-term objectives
- Multiple action plan steps
- Priority and status tracking
- Progress percentage
- Target date
- Can be created from thought processing

**⚠️ Limitation**: No UI to view linked projects (projects link to goals, not reverse)

---

## 9. Errands (`/tools/errands`)

**Purpose**: Manage out-of-office tasks separately

**What are Errands?**
- Tasks where `focusEligible === false`
- Shopping, appointments, pickups, etc.
- Cannot be done during focus sessions

**How to Create**:
1. Create task in `/tools/tasks`
2. Toggle "Focus Eligible" OFF
3. Appears in Errands tool

---

## 10. Mood Tracker (`/tools/moodtracker`)

**Simple Implementation**:
- 1-10 slider
- Optional notes
- Historical chart
- Weekly/monthly averages

---

## 11. Brainstorming (`/tools/brainstorming`)

**Requires**: OpenAI API key

**Features**:
- AI-powered ideation
- Conversational interface
- Generate action items
- Save ideas as thoughts/tasks

---

## 12. Notes (`/tools/notes`)

**⚠️ Minimal Implementation**:
- Shows all task notes aggregated
- NOT a standalone note-taking system
- Just a view of notes from tasks

---

## 13. Deep Thought (`/tools/deepthought`)

**⚠️ CRITICAL**: LOCAL STATE ONLY - NOT SYNCED TO FIREBASE!

**Features**:
- Philosophical reflection tool
- Category organization
- Tag system
- **Data lost on refresh!**

**⚠️ Not Integrated**:
- Separate from main Thought system
- Not linked to focus sessions
- `Thought.isDeepThought` field exists but unused

---

# Setup & Configuration

## Quick Start

### 1. Clone & Install
- Clone repository from GitHub
- Run `npm install` to install dependencies

### 2. Environment Variables (Optional - for Cloud Sync)

Create `.env.local` file with Firebase configuration:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Get these values from Firebase Console → Project Settings → Your apps → Web app config

### 3. Run Development Server
- Command: `npm run dev`
- Opens at `http://localhost:3000`

### 4. Optional: OpenAI API Key (In-App)
- Go to Settings
- Enter OpenAI API key
- Enables AI features (brainstorming, thought processing)

---

## Firebase Setup (Detailed)

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter name (e.g., "personal-notebook")
4. Enable/skip Google Analytics
5. Click "Create project"

### Enable Authentication

1. Firebase Console → **Authentication**
2. Click "Get started"
3. Enable **Email/Password**:
   - Toggle "Enable"
   - Save
4. **(Optional)** Enable **Google** sign-in

### Create Firestore Database

1. Firebase Console → **Firestore Database**
2. Click "Create database"
3. Choose **"Start in production mode"**
4. Select location (closest to users)
5. Click "Enable"

### Configure Security Rules

Firestore → **Rules** tab:

**Security Model**:
- User data stored under `/users/{userId}/` path
- Allow read/write ONLY if authenticated user's UID matches path userId
- Use wildcard `{document=**}` to cover all subcollections
- Deny all access to paths outside `/users/` structure

**Key Points**:
- Complete data isolation between users
- Authentication required for all operations
- No public data access
- Protects all nested collections automatically

Click "Publish" to activate rules

### Get Firebase Config

1. Firebase Console → **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click web icon `</>`
4. Register app (name: "Personal Notebook Web")
5. Copy config values to `.env.local`

---

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import GitHub repository
5. Add environment variables:
   - All `NEXT_PUBLIC_FIREBASE_*` variables
6. Click "Deploy"
7. Auto-deploys on every push to `main`

### Manual Build

- Run `npm run build` to create production build
- Run `npm start` to start production server
- Requires Node.js environment for hosting

---

## Development Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint code linting
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

---

# Development Guide

## Architecture Patterns

### Zustand Store Pattern

All stores follow this consistent structure:

**State Shape**:
- Array of items (tasks, thoughts, etc.)
- Loading and cache status flags (isLoading, fromCache, hasPendingWrites)
- Unsubscribe function for cleanup

**Core Actions**:
1. **subscribe(userId)**: Set up Firebase real-time listener
   - Cleans up previous subscription if exists
   - Creates Firestore query for user's collection
   - Calls `subscribeCol` helper with callback
   - Callback updates state with items and metadata

2. **add(data)**: Create new item
   - Generates unique ID using timestamp
   - Adds `createdAt` field
   - Calls `createAt` gateway function
   - Real-time listener automatically updates UI

3. **update(id, updates)**: Update existing item
   - Calls `updateAt` gateway function
   - Gateway adds `updatedAt` and `version` fields
   - Real-time listener reflects changes

4. **delete(id)**: Remove item
   - Calls `deleteAt` gateway function
   - Real-time listener removes from UI

**Key Pattern**: All mutations go through gateway functions, never direct Firestore calls. Real-time subscriptions handle state updates automatically.`

### CRUD Gateway Pattern

All Firebase operations go through `lib/data/gateway.ts`:

**createAt(path, data)**: Create document
- Adds automatic fields: `createdAt`, `updatedAt`, `updatedBy`, `version: 1`
- Sets document at specified path

**updateAt(path, updates)**: Update document  
- Increments `version` number
- Updates `updatedAt` timestamp
- Merges updates with existing data

**deleteAt(path)**: Delete document
- Removes document from Firestore

**Why Gateway?**: Centralized CRUD ensures consistent metadata, versioning, and easier debugging. Never call Firestore directly from stores.

### Real-time Subscription Pattern

**subscribeCol(query, callback)**: Subscribe to collection changes

**How it works**:
1. Creates Firestore `onSnapshot` listener
2. On each change, calls callback with:
   - Typed array of documents
   - Metadata (fromCache, hasPendingWrites)
3. Returns unsubscribe function

**Metadata Usage**:
- `fromCache`: True if data loaded from offline cache (show indicator)
- `hasPendingWrites`: True if local writes not yet synced (show sync status)

**Cleanup**: Always call returned unsubscribe function when component unmounts or user logs out

---

## UI Component Patterns

### Tool Page Layout

**Standard Structure**:
1. **Container**: Max-width centered container with responsive padding
2. **Header Section**: 
   - Tool title and description
   - Inline statistics (compact badges/pills)
   - Primary action button ("Add New")
   - Gradient background with tool-specific color scheme
3. **Stats Cards** (optional): Key metrics in card grid
4. **Filters Section**: Dropdowns, toggles, or tabs for filtering
5. **Content Area**: List or grid of items
6. **Modals**: Detail views, creation forms

**UI Consistency Notes**:
- Most tools use gradient backgrounds with thick borders (border-4)
- Zen Mode (Focus) uses minimal centered design (newer pattern)
- Consider migrating to Zen Mode style for consistency

### Modal Pattern

**Implementation**:
- Uses Framer Motion's `AnimatePresence` for enter/exit animations
- Full-screen backdrop with semi-transparent overlay
- Centered modal with max-width constraint
- Scale animation: starts at 95%, animates to 100%
- Close button (X icon) in top-right
- Dark mode support with conditional styling

**Animation Timing**: Smooth fade-in/out with slight scale effect for polish

---

## Testing

### Current State
- ✅ Unit tests for some utilities
- ✅ Integration tests for stores
- ⚠️ E2E tests (placeholder, not implemented)

### Running Tests

- `npm run test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode (re-runs on file changes)
- `npm run test:ci` - CI mode with coverage reports

### Adding Tests

**Testing Approach**:
- Use `@testing-library/react` for component and hook testing
- Use `renderHook` for testing Zustand stores
- Wrap async operations in `act()` to ensure state updates complete
- Mock Firebase operations to avoid external dependencies
- Test user interactions, not implementation details

**Focus on**:
- Store actions (add, update, delete)
- Component rendering with different states
- User interactions (clicks, form submissions)
- Error handling

---

## Code Style

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if necessary)
- Interfaces for data models
- Types for props

### React
- Functional components only
- Hooks for state management
- Custom hooks for reusable logic
- Props destructuring

### File Naming
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Pages: `page.tsx` (Next.js convention)

---

# Known Gaps & Roadmap

## Major Differences: Draft vs Implementation

### 1. Goal → Project → Task Hierarchy

**Draft Description**:
```
Goal: "Improve English Proficiency"
  └── Project: "Increase Vocabulary"
      ├── Sub-Project: "Read Literature"
      ├── Sub-Project: "Talk to Native Speakers"
  └── Project: "Reduce Accent"
      └── Sub-Project: "Accent Reduction Courses"
          └── Task: "Research courses"
```

**Actual Implementation**:
```
Goal: "Improve English Proficiency"
  └── Project: "Increase Vocabulary" (FLAT - no sub-projects)
      └── Task: "Read 30 minutes daily"
  └── Project: "Reduce Accent" (FLAT - no sub-projects)
      └── Task: "Research courses"
```

**Gap**: No sub-project hierarchy. Projects cannot have child projects.

---

### 2. Automatic Thought Processing

**Draft**: "The system will be using LLM to process the thought"

**Actual**: 
- ❌ No automatic processing on thought creation
- ✅ Manual trigger via "Process" button
- ✅ Requires OpenAI API key setup
- ✅ User must select processing mode (manual/safe/auto)

**Gap**: Background automatic processing not implemented as default behavior.

---

### 3. Similar Thought Detection & Merging

**Draft**: "A Thought can be very close to existing thoughts, in that case merge two thoughts into one with enhanced text."

**Actual**: ❌ NOT IMPLEMENTED

**Gap**: No similar thought detection, no automatic merging, no merge UI.

---

### 4. Deep Thought Integration

**Draft**: "Thought can be selected for deep thought, where I will spend time thinking about the topic deeply and take notes for the future."

**Actual**:
- ✅ `Thought.isDeepThought` field added to schema
- ✅ `Thought.deepThoughtNotes` field added
- ✅ Separate Deep Thought tool exists (`/tools/deepthought`)
- ❌ Deep Thought tool uses LOCAL STATE only (not synced to Firebase!)
- ❌ No UI to mark thoughts for deep thought
- ❌ No integration with main Thought system
- ❌ Deep thought data lost on page refresh

**Gap**: Deep Thought completely disconnected from Thought system.

---

### 5. Focus Mode Tool Integration

**Draft**: "While performing a task while in focus mode. The task should be able to use different tools, like notes, deepthought, brainstorming, cbt etc without leaving the focus page."

**Actual**:
- ✅ Notes: Integrated (can take notes on tasks)
- ❌ Deep Thought: NOT accessible from focus mode
- ❌ Brainstorming: NOT accessible from focus mode
- ❌ CBT: NOT accessible from focus mode

**Gap**: Only notes accessible during focus sessions.

---

### 6. Consistent UI Across Tools

**Draft**: "Each tools should use consistent UI, where it list a bunch of item of the tool in first page, and once an item is clicked the magic starts."

**Actual**:
- ✅ Most tools follow list → detail pattern
- ⚠️ Inconsistent styling:
  - Heavy gradients and `border-4` on some tools
  - Zen Mode (Focus) uses minimal design
  - Deep Thought has excessive stat cards
- ⚠️ Statistics display varies by tool

**Gap**: UI patterns not fully standardized.

---

### 7. Statistics Space Efficiency

**Draft**: "Statistics of each tool should not invade the space, each tools should have text to explain the tools and its limitation but it should use space efficiently."

**Actual**: ⚠️ Mixed implementation
- Tasks tool: Efficient stats
- Deep Thought: 3 large stat cards (excessive)
- Focus tool: Recently simplified (good)
- Thoughts tool: Balanced

**Gap**: Some tools have heavy stats that take up space.

---

## Prioritized Implementation Roadmap

### Phase 1: Core Gap Closure (High Priority)

#### 1.1 Deep Thought Integration ⭐⭐⭐
**Goal**: Connect Deep Thought to main Thought system

**Tasks**:
- [ ] Migrate Deep Thought to Firebase storage
- [ ] Add "Mark for Deep Thought" button in Thought detail modal
- [ ] Create Deep Thought session interface (like Focus Mode)
- [ ] Link deep thought sessions to thoughts
- [ ] Add deep thought notes to Thought detail view
- [ ] Allow accessing from Focus Mode

**Estimated Effort**: 1-2 weeks

---

#### 1.2 Sub-Project Hierarchy ⭐⭐
**Goal**: Enable Projects → Sub-Projects → Tasks

**Tasks**:
- [ ] Add `parentProjectId` field to Project schema
- [ ] Update Project store with hierarchy methods
- [ ] Create tree view UI for project navigation
- [ ] Enforce tasks only at leaf projects
- [ ] Update project detail to show sub-projects
- [ ] Migration script for existing projects

**Estimated Effort**: 2-3 weeks

---

#### 1.3 Automatic Thought Processing ⭐⭐
**Goal**: Background LLM processing option

**Tasks**:
- [ ] Add "Auto-process new thoughts" toggle in Settings
- [ ] Create background job (every 2 min) to process unprocessed thoughts
- [ ] Add confidence thresholds for auto-execution
- [ ] Notification system for completed processing
- [ ] Queue management UI (view/cancel pending)

**Estimated Effort**: 1-2 weeks

---

### Phase 2: Enhanced Features (Medium Priority)

#### 2.1 Similar Thought Detection ⭐
**Goal**: Detect and suggest merging similar thoughts

**Tasks**:
- [ ] Implement semantic similarity (embeddings)
- [ ] Background job to detect similar thoughts
- [ ] "Similar Thoughts" section in Thought detail
- [ ] Merge UI with preview
- [ ] Test with large thought datasets

**Estimated Effort**: 2-3 weeks

---

#### 2.2 Focus Mode Tool Access ⭐
**Goal**: Use CBT, Brainstorming, Deep Thought without leaving Focus

**Tasks**:
- [ ] Add tool menu in Zen Mode
- [ ] Modal overlays for each tool
- [ ] Context-aware tool suggestions
- [ ] Save tool outputs to session
- [ ] Keyboard shortcuts for quick access

**Estimated Effort**: 1-2 weeks

---

#### 2.3 Goal Progress Visualization ⭐
**Goal**: Dashboard charts for goal tracking

**Tasks**:
- [ ] Goal progress over time chart
- [ ] Project timeline view
- [ ] Milestone completion visualization
- [ ] Goal vs actual progress comparison
- [ ] Export goal reports

**Estimated Effort**: 1 week

---

### Phase 3: Polish & Optimization (Lower Priority)

#### 3.1 UI Consistency
- [ ] Standardize gradient usage (minimize)
- [ ] Unified stat card design
- [ ] Consistent spacing and padding
- [ ] Mobile-first responsive improvements
- [ ] Dark mode polish

**Estimated Effort**: 1-2 weeks

---

#### 3.2 Keyboard Shortcuts
- [ ] Global shortcuts (n: new task, f: focus mode, etc.)
- [ ] Modal navigation (Esc, Tab, Enter)
- [ ] Quick search (Cmd+K)
- [ ] Shortcuts help menu

**Estimated Effort**: 1 week

---

#### 3.3 Enhanced Notes Tool
- [ ] Rich text editor (Markdown support)
- [ ] Standalone note creation
- [ ] Note categorization
- [ ] Search across all notes
- [ ] Link notes to tasks/projects/thoughts

**Estimated Effort**: 2-3 weeks

---

## Troubleshooting Guide

### Common Issues

#### 1. Firebase Connection Errors

**Problem**: "Firebase: Error (auth/invalid-api-key)"

**Solutions**:
- Verify `NEXT_PUBLIC_FIREBASE_API_KEY` in `.env.local`
- Restart dev server after changing env variables
- Check Firebase Console → Project Settings for correct values

---

**Problem**: "Firebase: Error (auth/unauthorized-domain)"

**Solutions**:
- Firebase Console → Authentication → Settings → Authorized domains
- Add `localhost` and your deployment domain (e.g., `your-app.vercel.app`)

---

#### 2. Data Not Syncing

**Problem**: Data saves locally but not to cloud

**Solutions**:
- Check internet connection
- Verify user is logged in (`auth.currentUser` exists)
- Check browser console for Firebase errors
- Verify Firestore security rules are correct

---

**Problem**: Old data not loading from cloud

**Solutions**:
- Log out and log back in
- Clear browser cache
- Check Firestore Console to verify data exists
- Check Firestore security rules allow read access

---

#### 3. Focus Session Issues

**Problem**: Focus session not persisting after browser close

**Solutions**:
- Check browser supports IndexedDB (all modern browsers do)
- Verify no browser extensions blocking storage
- Check browser's private/incognito mode settings

---

**Problem**: Timer stops when switching tabs

**Expected behavior**: Timer uses elapsed time, not intervals, so it continues tracking even in background

---

#### 4. LLM Processing Errors

**Problem**: "OpenAI API error"

**Solutions**:
- Verify API key is correct (Settings → OpenAI API Key)
- Check API key has credits/billing enabled
- Verify rate limits not exceeded
- Check browser console for detailed error

---

**Problem**: Processing stuck in "pending" status

**Solutions**:
- Check browser console for errors
- Refresh page (processing queue persists in localStorage)
- Manually cancel stuck items in Debug page

---

### Performance Issues

#### Slow Page Load

**Causes & Solutions**:
- **Large dataset**: Implement pagination for lists > 100 items
- **Too many real-time listeners**: Unsubscribe when leaving pages
- **Bundle size**: Check with `npm run build` and analyze

---

#### High Firebase Usage

**Monitor in Firebase Console**:
- Reads: Should be < 50K/day (free tier)
- Writes: Should be < 20K/day (free tier)

**Optimization**:
- Enable offline persistence (already enabled)
- Reduce sync frequency if needed
- Use Firebase Emulator for local development

---

## Best Practices for LLMs Analyzing This Codebase

### When Modifying Code

1. **Check Current State**: This document reflects actual implementation, not aspirational features
2. **Data Relationships**: Review "Data Models & Relationships" section before modifying schemas
3. **Zustand Pattern**: Follow existing store patterns for consistency
4. **Firebase Operations**: Always use `gateway.ts` (createAt/updateAt/deleteAt), never direct Firestore calls
5. **Real-time Sync**: Use `subscribeCol` for real-time data, not one-time queries
6. **Type Safety**: Add TypeScript interfaces for all new data models

### When Adding Features

1. **Reference Gaps**: Check "Known Gaps" section to understand what's intentionally missing
2. **UI Patterns**: Follow existing tool page layouts for consistency
3. **Mobile-First**: Always consider mobile experience
4. **Dark Mode**: Test both light and dark themes
5. **Testing**: Add tests for new stores and utilities

### When Debugging

1. **Firebase Rules**: User-scoped data (`/users/{userId}`) only
2. **Auth Check**: All Firestore operations require authentication
3. **State Management**: Zustand stores are the source of truth, not component state
4. **Queue System**: Process queue managed by `useProcessQueue` (localStorage)

---

## Key Insights for AI Agents

### What This Project IS

✅ **Mental health support tool** using evidence-based CBT  
✅ **Privacy-first** with local storage and optional cloud sync  
✅ **Productivity system** with focus sessions and balanced task selection  
✅ **Thought processing pipeline** with manual LLM integration  
✅ **Multi-device sync** via Firebase real-time updates  

### What This Project IS NOT

❌ **Automatic AI assistant** - requires manual triggers  
❌ **Social platform** - no sharing or community features  
❌ **Offline-first PWA** - requires Firebase connection for sync  
❌ **Complete CBT replacement** - supports but doesn't replace therapy  
❌ **Hierarchical project manager** - flat project structure  

### Critical Implementation Details

🔴 **Deep Thought tool is NOT synced** - local state only, data lost on refresh  
🔴 **Projects are FLAT** - no sub-projects despite draft description  
🔴 **LLM processing is MANUAL** - no automatic background processing by default  
🔴 **Errands are just tasks** - `focusEligible: false` flag, not separate entity  
🔴 **Notes tool is minimal** - aggregates task notes, not standalone  

---

## Future Vision

### Long-Term Goals

1. **Full Offline Support**: Progressive Web App with service workers
2. **Mobile Apps**: Polished iOS and Android apps
3. **Plugin System**: Allow community extensions
4. **Collaboration**: Optional shared goals/projects (privacy-preserving)
5. **Advanced Analytics**: ML-powered insights and patterns
6. **Voice Input**: Capture thoughts hands-free
7. **Wearable Integration**: Apple Watch, Fitbit mood tracking
8. **Research Integration**: Stay current with latest CBT research

---

## Document Maintenance

### When to Update This Document

- ✏️ After implementing major features (update "Current Implementation")
- ✏️ When data models change (update "Data Models")
- ✏️ When architectural decisions change (update "Technical Architecture")
- ✏️ When closing gaps (update "Known Gaps")
- ✏️ Every 3 months (review and refresh)

### Version History

- **v1.0** (Jan 2025): Initial comprehensive documentation combining all docs
- **v0.1** (Jan 2025): First overview based on codebase analysis

---

## Contact & Resources

**Repository**: [github.com/mesbahtanvir/personal-notebook](https://github.com/mesbahtanvir/personal-notebook)  
**Author**: Mesbah Tanvir  
**License**: MIT  

**Key Resources**:
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [Feeling Good by Dr. David Burns](https://www.amazon.com/Feeling-Good-New-Mood-Therapy/dp/0380810336)

---

## Summary: Quick Reference

### For LLMs
- This is a **mental health + productivity app** with Firebase sync
- **NOT** fully automatic - LLM features require manual triggers
- **Zen Mode** (focus sessions) recently redesigned - use as reference
- **Deep Thought NOT integrated** - separate local-only tool
- **Projects are FLAT** - no hierarchy despite draft plans

### For Developers
- **Tech**: Next.js 14 + TypeScript + Zustand + Firebase
- **Pattern**: Zustand stores → Firebase real-time sync
- **CRUD**: Use `gateway.ts` (createAt/updateAt/deleteAt)
- **Auth**: Firebase Auth with user-scoped Firestore rules
- **Testing**: Jest + React Testing Library

### For Users
- **Privacy**: Local-first, optional cloud sync
- **Offline**: Works without internet (except AI features)
- **CBT**: Evidence-based anxiety/depression management
- **Focus**: Balanced mastery/pleasure task sessions
- **Free**: Open source, free tier Firebase sufficient

---

*This document is the single source of truth for understanding this codebase. Keep it updated as the project evolves.*

**Last Updated**: January 2025  
**Document Version**: 1.0  
**Codebase State**: Production-ready with known gaps documented
