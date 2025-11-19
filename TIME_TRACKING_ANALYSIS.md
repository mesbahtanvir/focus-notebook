# Time Tracking and Completion History System - Comprehensive Analysis

## Executive Summary
The Focus Notebook app tracks time through a multi-layered system involving:
- Task-level time tracking (actualMinutes, estimatedMinutes)
- Session-level time tracking (FocusSessions with timeSpent per task)
- Completion history for recurring tasks (completionHistory array)
- Work activity visualization (10-day calendar view)

This document provides a complete mapping of all time tracking data models, storage locations, services, and components.

---

## 1. DATA MODELS & TYPES

### 1.1 Task Time Tracking (Task Interface)
**File**: `/home/user/focus-notebook/src/store/useTasks.ts`

```typescript
interface Task {
  // Time Estimation & Actual Time
  estimatedMinutes?: number;      // User's estimate
  actualMinutes?: number;         // Total time spent across all sessions
  
  // Completion Tracking (For Recurring Tasks)
  completionCount?: number;       // Count of completions (DERIVED from completionHistory)
  completionHistory?: TaskCompletion[]; // Array of completion records
  
  // Recurrence
  recurrence?: RecurrenceConfig;  // Daily, weekly, etc.
  parentTaskId?: string;          // Link to parent recurring task template
  
  // Status Fields
  done: boolean;                  // Task completion status
  completedAt?: string;           // ISO timestamp of completion
  dueDate?: string;               // YYYY-MM-DD format
  status: TaskStatus;             // 'active' | 'completed' | 'backlog' | 'archived'
}
```

### 1.2 Task Completion Record
**File**: `/home/user/focus-notebook/src/store/useTasks.ts`

```typescript
interface TaskCompletion {
  date: string;           // ISO date string (YYYY-MM-DD)
  completedAt: string;    // ISO timestamp
  note?: string;          // Optional note for this completion
}
```

### 1.3 Focus Session Structure
**File**: `/home/user/focus-notebook/src/store/useFocus.ts`

```typescript
interface FocusSession {
  id: string;
  duration: number;                    // Total session duration in minutes
  tasks: FocusTask[];                  // Array of tasks worked on
  startTime: string;                   // ISO timestamp
  endTime?: string;                    // ISO timestamp (null if ongoing)
  currentTaskIndex: number;
  isActive: boolean;
  isOnBreak: boolean;
  currentBreak?: BreakSession;
  breaks: BreakSession[];
  feedback?: string;
  rating?: number;
  pausedAt?: string;                   // Timestamp when paused
  totalPausedTime?: number;            // Total pause time in milliseconds
  createdAt?: string;
  updatedAt?: any;
  version?: number;
}
```

### 1.4 Focus Task (Task within Session)
**File**: `/home/user/focus-notebook/src/store/useFocus.ts`

```typescript
interface FocusTask {
  task: Task;                          // Full task object
  timeSpent: number;                   // Time spent in SECONDS during this session
  completed: boolean;                  // Was this task marked complete?
  notes?: string;                      // Session notes for this task
  followUpTaskIds?: string[];          // IDs of follow-up tasks created
}
```

### 1.5 Break Session
**File**: `/home/user/focus-notebook/src/store/useFocus.ts`

```typescript
interface BreakSession {
  startTime: string;
  endTime?: string;
  duration: number;                    // in minutes
  type: 'coffee' | 'meditation' | 'stretch';
}
```

### 1.6 Session Time Entry (Historical Record)
**File**: `/home/user/focus-notebook/src/services/TimeTrackingService.ts`

```typescript
interface SessionTimeEntry {
  sessionId: string;
  date: string;                        // End time of session
  timeSpent: number;                   // in minutes
  completed: boolean;                  // Task completion status
}
```

### 1.7 Time Tracking Summary
**File**: `/home/user/focus-notebook/src/services/TimeTrackingService.ts`

```typescript
interface TimeTracking {
  totalMinutes: number;                // Total actual time
  lastSessionMinutes?: number;         // Time from last session
  sessionCount?: number;               // Number of work sessions
  lastTrackedAt?: string;              // ISO timestamp
  variance?: number;                   // actual - estimated
}
```

---

## 2. FIRESTORE STORAGE STRUCTURE

### 2.1 Tasks Collection
**Path**: `users/{userId}/tasks/{taskId}`

**Fields**:
```
{
  id: string (doc ID)
  title: string
  done: boolean
  status: 'active' | 'completed' | 'backlog' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: 'mastery' | 'pleasure'
  
  // Time Tracking
  estimatedMinutes?: number
  actualMinutes?: number
  
  // Completion Tracking (Recurring)
  completionCount?: number
  completionHistory?: [
    {
      date: string (YYYY-MM-DD)
      completedAt: string (ISO)
      note?: string
    }
  ]
  
  // Recurrence
  recurrence?: {
    type: 'none' | 'daily' | 'workweek' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'halfyearly' | 'yearly'
    frequency?: number
    frequencyMax?: number
    daysOfWeek?: number[]
  }
  parentTaskId?: string
  
  // Relationships
  projectId?: string
  thoughtId?: string
  
  // System Fields
  createdAt: timestamp
  updatedAt?: timestamp
  updatedBy?: string
  version?: number
  dueDate?: string
  completedAt?: string
  notes?: string
  tags?: string[]
  steps?: TaskStep[]
  focusEligible?: boolean
  archived?: boolean
  archivedAt?: string
}
```

### 2.2 Focus Sessions Collection
**Path**: `users/{userId}/focusSessions/{sessionId}`

**Fields**:
```
{
  id: string (doc ID)
  duration: number (minutes)
  
  // Tasks Data - STORED AS JSON STRING (not array!)
  tasksData: string (JSON.stringify(FocusTask[]))
  
  // Session Timing
  startTime: string (ISO)
  endTime?: string (ISO)
  pausedAt?: string
  totalPausedTime?: number (ms)
  
  // Status
  isActive: boolean
  isOnBreak: boolean
  currentTaskIndex: number
  currentBreak?: BreakSession
  breaks: BreakSession[]
  
  // Feedback
  feedback?: string
  rating?: number
  
  // System Fields
  createdAt: timestamp
  updatedAt?: timestamp
  updatedBy?: string
  version?: number
}
```

**NOTE**: `tasksData` is stored as a JSON string, not an array. It's parsed on retrieval:
```typescript
tasks: session.tasksData ? JSON.parse(session.tasksData) : (session.tasks || [])
```

### 2.3 Task Order Preferences Collection
**Path**: `users/{userId}/preferences/focusTaskOrder`

**Fields**:
```
{
  preferences: {
    [taskId]: {
      score: number,
      updatedAt: string
    }
  },
  updatedAt: string
}
```

---

## 3. FIRESTORE RULES

**File**: `/home/user/focus-notebook/firestore.rules`

```
match /users/{userId}/{collection}/{document} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId);
  allow update: if isOwner(userId) && isValidVersion() && hasValidTimestamp();
  allow delete: if isOwner(userId);
}
```

Key constraints:
- Version-based optimistic locking (prevents stale overwrites)
- Timestamp validation required on updates
- All data is user-scoped (userId isolation)

---

## 4. SERVICES & BUSINESS LOGIC

### 4.1 TimeTrackingService
**File**: `/home/user/focus-notebook/src/services/TimeTrackingService.ts`

**Static Methods**:

1. **updateTaskActualTime(taskId, sessionSeconds)**
   - Called when session ends for each task
   - Updates task.actualMinutes += sessionMinutes
   - Updates timeTracking fields (STORED ON TASK DOCUMENT)
   - Calculates variance (actual - estimated)
   - Only updates if sessionMinutes >= 1 (rounds to nearest minute)

2. **getTaskSessionHistory(taskId)**
   - Returns: SessionTimeEntry[]
   - Queries all focusSessions with endTime != null
   - Filters sessions containing this task with timeSpent > 0
   - Sorted by most recent first
   - Used by SessionHistory component

3. **calculateProjectTime(project, tasks)**
   - Sums actualMinutes from linked tasks
   - Calculates variance
   - Returns TimeTracking summary

4. **calculateGoalTime(goal, projects, tasks)**
   - Sums time from all linked projects
   - Returns TimeTracking summary

5. **formatTime(minutes)**
   - Converts minutes to human-readable "2h 15m" format

6. **calculateEfficiency(actual, estimated)**
   - Formula: (actual / estimated) * 100
   - Returns percentage (e.g., 150 = 50% over estimate)
   - Returns undefined if no estimate

7. **getEfficiencyStatus(efficiency)**
   - Returns: 'on-track' | 'warning' | 'over-budget'
   - on-track: <= 100%
   - warning: 100% < x <= 120%
   - over-budget: > 120%

8. **getEfficiencyColor(status)**
   - Returns Tailwind color hex codes

### 4.2 RecurringTaskService
**File**: `/home/user/focus-notebook/src/services/RecurringTaskService.ts`

**Key Methods**:

1. **generateMissingRecurringTasks(tasks)**
   - Creates new instances for recurring tasks
   - Uses completionHistory to determine next instance needed

2. **shouldCreateTaskForToday(task, existingTasks)**
   - Checks if new instance needed based on recurrence pattern
   - Validates daysOfWeek for workweek tasks

3. **createTaskForToday(task)**
   - Creates new task instance with parentTaskId pointing to template
   - Inherits properties from template
   - Resets completionCount to 0 for new instance

### 4.3 Data Flow During Session End (useFocus.ts)
**File**: `/home/user/focus-notebook/src/store/useFocus.ts`

**endSession() process**:

1. Save session to Firestore
2. For each task with timeSpent > 0:
   - Call TimeTrackingService.updateTaskActualTime()
   - If task marked complete during session:
     - **For recurring tasks**: Add to completionHistory array
     - **For one-time tasks**: Set done=true, status='completed'
3. Update task order preferences
4. Return completedSession for display

**Code snippet** (lines 364-382):
```typescript
if (isRecurring) {
  const completionHistory = focusTask.task.completionHistory || []
  const todayCompletion = completionHistory.find((c: any) => c.date === today)
  
  if (!todayCompletion) {
    const newHistory = [
      ...completionHistory,
      {
        date: today,
        completedAt: new Date().toISOString(),
        note: 'Completed during focus session'
      }
    ]
    await updateAt(`users/${userId}/tasks/${taskId}`, {
      done: true,
      completionHistory: newHistory,
      completionCount: newHistory.length, // DERIVED from array
    })
  }
}
```

---

## 5. COMPONENTS DISPLAYING TIME DATA

### 5.1 TimeDisplay Component
**File**: `/home/user/focus-notebook/src/components/TimeDisplay.tsx`

**Props**:
- `actual?: number` (minutes)
- `estimated?: number` (minutes)
- `isRecurring?: boolean` (for recurring tasks)
- `completionCount?: number` (for recurring tasks)
- `variant?: 'inline' | 'badge' | 'detailed'`
- `showProgressBar?: boolean`

**Logic**:
- For recurring tasks: displays **average time** = actual / completionCount
- Shows efficiency percentage if estimated
- Displays variance (actual - estimated)
- Uses TimeProgressBar for visual representation

**Used in**:
- TaskDetailModal (lines 469)
- TaskList
- Task cards

### 5.2 SessionHistory Component
**File**: `/home/user/focus-notebook/src/components/SessionHistory.tsx`

**Displays**:
- Summary: Total sessions count + total time
- Expandable list of recent sessions with:
  - Date/time
  - Completion status (checkmark or circle)
  - Time spent in minutes
  - Scrollable list (max-h-64)

**Data Source**: TimeTrackingService.getTaskSessionHistory(taskId)

### 5.3 WorkActivity Component
**File**: `/home/user/focus-notebook/src/components/WorkActivity.tsx`

**Displays**:
- 10-day calendar grid showing work activity
- Each day shows:
  - Day label (Today, Yesterday, Mon 12/16)
  - Date number
  - Status indicator (green check or gray circle)
  - Time spent formatted
  - Hover tooltip with session details
- Summary stats: Days active (of 10) + Total time
- Mobile view: Last 7 days only

**Data Source**: useFocus sessions, filtered by taskId and date

### 5.4 TimeProgressBar Component
**File**: `/home/user/focus-notebook/src/components/TimeProgressBar.tsx`

**Displays**:
- Colored bar showing actual vs estimated
- Width = min(actual/estimated * 100, 100)
- Color based on efficiency status
- Optional percentage text

### 5.5 FocusStatistics Component
**File**: `/home/user/focus-notebook/src/components/FocusStatistics.tsx`

**Post-Session Display**:
- Total focus time
- Completion rate %
- Tasks completed count
- Mastery vs pleasure time breakdown

### 5.6 SessionSummary Component
**File**: `/home/user/focus-notebook/src/components/SessionSummary.tsx`

**Post-Session Display**:
- Tasks completed / total
- Time focused
- Completion rate %
- Work balance (mastery/pleasure pie chart)
- Task breakdown with individual times
- Session notes display
- Star rating and feedback textarea

### 5.7 FocusSessionDetailModal
**File**: `/home/user/focus-notebook/src/components/FocusSessionDetailModal.tsx`

**Displays**:
- Session start time
- Total focus time
- Completion rate %
- Tasks completed / total
- Session rating (if set)
- Work balance breakdown (mastery/pleasure)
- Task list with individual time spent

### 5.8 TaskDetailModal
**File**: `/home/user/focus-notebook/src/components/TaskDetailModal.tsx`

**Displays**:
- TimeDisplay component with actual/estimated
- SessionHistory component
- WorkActivity component
- Session notes from focus sessions containing this task

---

## 6. DATA REDUNDANCIES & POTENTIAL ISSUES

### Issue 1: completionCount vs completionHistory Length
**Severity**: WARNING

**Problem**: 
- `task.completionCount` should always equal `task.completionHistory.length`
- But they can get out of sync if:
  - Firestore update partially fails
  - Code changes completionHistory but forgets to update completionCount
  - Historical data corruption

**Current State**:
- System derives completionCount from array length on every write (lines 382, 293 in useTasks.ts)
- DataDiagnostics tool detects and fixes mismatches
- Still potentially problematic for redundancy

**Recommendation**:
- Consider storing only completionHistory array
- Calculate completionCount on read when needed
- OR maintain single-source-of-truth with triggers

### Issue 2: actualMinutes vs timeTracking.totalMinutes
**Severity**: MODERATE

**Problem**:
- Task has `actualMinutes` field
- Task also has `timeTracking.totalMinutes` nested field
- Both supposedly track the same value
- Only actualMinutes is actually used

**Current State**:
- Code always updates both (line 59 in TimeTrackingService.ts):
  ```typescript
  'timeTracking.totalMinutes': newActual,
  ```
- But nowhere reads timeTracking object
- Unnecessary duplication

**Recommendation**:
- Remove timeTracking object
- Use only actualMinutes
- Or consolidate timeTracking fields properly

### Issue 3: tasksData Storage as JSON String
**Severity**: LOW

**Problem**:
- FocusSession.tasksData stored as JSON string in Firestore
- Requires JSON.parse() on every read
- Prevents Firestore index queries on tasks data
- Different from other arrays stored normally

**Current State**:
- Workaround implemented in useFocus.ts line 224:
  ```typescript
  tasks: session.tasksData ? JSON.parse(session.tasksData) : (session.tasks || [])
  ```
- Likely due to task object complexity (contains full Task object)

**Recommendation**:
- Document why JSON serialization needed
- Consider storing task references only, fetch full tasks separately
- Or keep as-is if Task object size is problematic for Firestore

### Issue 4: Session Status Tracking Issues
**Severity**: CRITICAL

**Problem**:
- Sessions can get stuck in `isActive: true` state
- No automatic cleanup if browser crashes during session
- DataDiagnostics marks as "stuck" if active > 12 hours

**Current State**:
- DataDiagnostics detects stuck sessions
- Manual fix available in Settings > Data Management
- When session ends, explicitly sets `isActive: false`

**Recommendation**:
- Add background service worker cleanup
- Set max session duration (e.g., 8 hours)
- Better error handling in endSession() to ensure isActive is set

---

## 7. ANALYTICS & AGGREGATIONS

### 7.1 Dashboard Analytics
**File**: `/home/user/focus-notebook/src/lib/analytics/dashboard.ts`

**Computed Data**:
- focusData: Daily minutes spent in focus sessions
- taskData: Daily tasks completed by category
- categoryData: Mastery vs pleasure breakdown
- timeOfDayData: Performance metrics by time of day
- stats: Overall aggregates

### 7.2 Progress Analytics
**File**: `/home/user/focus-notebook/src/lib/analytics/progress.ts`

**Computed Data**:
- Goal stats: Total, active, completed, progress %
- Project stats: Same structure
- Task stats: Including timeSpent aggregation
- Period-based analysis (week/month/all-time)

---

## 8. IMPORTS & EXPORTS

### 8.1 Data Flow
**Files**: 
- `/home/user/focus-notebook/src/hooks/useImportExport.ts`
- `/home/user/focus-notebook/src/services/import-export/ExportService.ts`
- `/home/user/focus-notebook/src/services/import-export/ImportService.ts`

**Handles**:
- Exporting completionHistory as part of task export
- Importing preserves completionHistory
- Validation ensures completionCount matches history length

---

## 9. KEY FILES SUMMARY TABLE

| File | Purpose | Key Contents |
|------|---------|--------------|
| useTasks.ts | Task state & logic | Task interface, completionHistory, actualMinutes |
| useFocus.ts | Focus session state | FocusSession, FocusTask, session lifecycle |
| TimeTrackingService.ts | Time calculations | updateTaskActualTime, getSessionHistory, efficiency |
| RecurringTaskService.ts | Recurring task logic | generateMissingTasks, completion tracking |
| TimeDisplay.tsx | Time rendering | Efficiency visualization, variance display |
| SessionHistory.tsx | Session history UI | Recent sessions list |
| WorkActivity.tsx | Activity calendar | 10-day work visualization |
| FocusSessionDetailModal.tsx | Session details | Session statistics & breakdown |
| TaskDetailModal.tsx | Task details | Time tracking + history display |
| dashboard.ts | Analytics | Daily aggregations |
| DataDiagnostics.tsx | Data quality | Detects stuck sessions, mismatches |

---

## 10. SUMMARY OF KEY CONSTANTS & FORMULAS

**Time Calculations**:
- Average time (recurring): `actual / completionCount`
- Efficiency: `(actual / estimated) * 100`
- Variance: `actual - estimated`

**Status Determination**:
- On-track: efficiency ≤ 100%
- Warning: 100% < efficiency ≤ 120%
- Over-budget: efficiency > 120%

**Stuck Session Threshold**: > 12 hours in active state

**Session Time Units**:
- FocusTask.timeSpent: **seconds**
- Task.actualMinutes: **minutes**
- SessionTimeEntry.timeSpent: **minutes**
- Always convert when combining different sources

---

## 11. ARCHITECTURAL RECOMMENDATIONS

1. **Resolve Redundancy**:
   - Eliminate completionCount or timeTracking.totalMinutes
   - Keep single source of truth

2. **Improve Session State Management**:
   - Add TTL (time-to-live) for active sessions
   - Implement service worker for cleanup
   - Better error recovery

3. **Better Historical Data**:
   - Consider separate collection for session archives
   - Improves query performance for completed sessions

4. **Type Safety**:
   - Create dedicated TimeData interface
   - Strongly type all analytics calculations
   - Validate time fields on write

5. **Performance**:
   - Index tasks by (userId, status, completedAt)
   - Index sessions by (userId, isActive, startTime)
   - Consider pagination for session history

