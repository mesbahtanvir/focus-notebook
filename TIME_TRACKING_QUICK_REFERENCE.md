# Time Tracking System - Quick Reference Guide

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER ACTIONS                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Start Focus Session → 2. Work on Tasks → 3. End Session  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              useFocus.ts (Zustand Store)                     │
├─────────────────────────────────────────────────────────────┤
│ currentSession: FocusSession                                 │
│  ├─ tasks[]: FocusTask[]                                     │
│  │  ├─ task: Task (full object)                             │
│  │  ├─ timeSpent: number (SECONDS)                          │
│  │  ├─ completed: boolean                                    │
│  │  └─ notes?: string                                        │
│  ├─ startTime, endTime, duration                            │
│  ├─ isActive, isOnBreak, breaks[]                           │
│  └─ pausedAt, totalPausedTime                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            Firestore: users/{userId}/focusSessions           │
├─────────────────────────────────────────────────────────────┤
│ {                                                            │
│   id, duration, startTime, endTime,                         │
│   tasksData: string (JSON),  ← PARSED to FocusTask[]       │
│   isActive, breaks[], feedback, rating                      │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
                   TimeTrackingService
                updateTaskActualTime()
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          Firestore: users/{userId}/tasks/{taskId}            │
├─────────────────────────────────────────────────────────────┤
│ {                                                            │
│   id, title, done, status,                                  │
│   actualMinutes: +=timeSpent/60,  ← INCREMENTED            │
│   estimatedMinutes, variance,                               │
│   completionHistory?: [{date, completedAt, note}],         │
│   completionCount: newLength  ← DERIVED                    │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              DISPLAY COMPONENTS                              │
├─────────────────────────────────────────────────────────────┤
│ ✓ TimeDisplay (inline/badge/detailed variants)             │
│ ✓ SessionHistory (recent sessions list)                    │
│ ✓ WorkActivity (10-day calendar grid)                      │
│ ✓ FocusStatistics (post-session summary)                   │
│ ✓ SessionSummary (detailed session breakdown)              │
│ ✓ FocusSessionDetailModal (session inspector)              │
│ ✓ TaskDetailModal (task + time tracking view)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Time Units Quick Reference

| Source | Unit | Conversion |
|--------|------|-----------|
| FocusTask.timeSpent | SECONDS | ÷60 = minutes |
| Task.actualMinutes | MINUTES | ×60 = seconds |
| SessionTimeEntry.timeSpent | MINUTES | - |
| Task.estimatedMinutes | MINUTES | - |
| BreakSession.duration | MINUTES | - |
| session.totalPausedTime | MILLISECONDS | ÷1000 = seconds |

**⚠️ CRITICAL**: Always convert when mixing sources!

---

## Collections Reference

### Tasks Collection
```
users/{userId}/tasks/{taskId}
├─ actualMinutes: number
├─ estimatedMinutes: number
├─ completionCount: number (=completionHistory.length)
├─ completionHistory: [
│  ├─ date: "2024-12-18" (YYYY-MM-DD)
│  ├─ completedAt: ISO timestamp
│  └─ note?: string
├─ recurrence: { type, frequency, daysOfWeek }
├─ parentTaskId?: string (for recurring instances)
└─ projectId?, thoughtId?, done, status, dueDate, etc.
```

### Focus Sessions Collection
```
users/{userId}/focusSessions/{sessionId}
├─ tasksData: string ← MUST JSON.parse()!
├─ startTime: ISO timestamp
├─ endTime: ISO timestamp
├─ isActive: boolean
├─ breaks: BreakSession[]
├─ feedback?: string
├─ rating?: number
├─ duration: number (minutes)
├─ pausedAt?: string
└─ totalPausedTime?: number (ms)
```

### Preferences Collection
```
users/{userId}/preferences/focusTaskOrder
├─ preferences: {
│  [taskId]: {
│    score: number,
│    updatedAt: string
│  }
}
└─ updatedAt: string
```

---

## Key Calculations

### Efficiency Percentage
```typescript
efficiency = (actual / estimated) * 100

Results:
  ≤100%   → ✅ On-track (green)
  100-120% → ⚠️  Warning (amber)
  >120%   → ❌ Over-budget (red)
```

### Average Time (Recurring Tasks)
```typescript
average = actual / completionCount

Example: 300 minutes / 5 completions = 60m average
```

### Variance
```typescript
variance = actual - estimated

Positive = over estimate
Negative = under estimate
```

### Daily Focus Time
```typescript
totalMinutes = SUM(session.tasks.map(t => t.timeSpent / 60))
              for all sessions on that date
```

---

## Session Lifecycle

```
START                 DURING                    END
│                      │                         │
├─ Create session      ├─ Track timeSpent       ├─ Save session
├─ Set isActive=true   ├─ Update notes          ├─ updateTaskActualTime()
├─ Duration set        ├─ Mark tasks complete   ├─ Update completionHistory
├─ tasks[]=[]          ├─ Pause/Resume          ├─ Set isActive=false
│                      ├─ Take breaks           ├─ Save feedback/rating
│                      ├─ Switch tasks          └─ Display SessionSummary
│                      └─ Persist (auto-save)
```

---

## Recurring Task Completion Flow

```
1. User completes task during session
                ↓
2. Check if task.recurrence.type !== 'none'
                ↓
3. If YES (recurring):
   ├─ Get completionHistory array
   ├─ Check if entry for today exists
   ├─ If NO:
   │  ├─ Add: { date: today, completedAt: now, note: "..." }
   │  ├─ Update completionHistory field
   │  └─ Update completionCount = newArray.length
   └─ Done, don't create next instance yet
                ↓
4. If NO (one-time):
   ├─ Set done=true
   ├─ Set status='completed'
   ├─ Set completedAt
   └─ Done
                ↓
5. RecurringTaskService.generateMissingTasks():
   ├─ Runs on app load
   ├─ Finds recurring templates
   ├─ Checks completionHistory
   ├─ Creates new instance if pattern matched
   └─ Sets parentTaskId to original task
```

---

## Data Quality Issues & Checks

### Issue 1: Stuck Sessions
**Detection**: Session isActive=true for >12 hours
**Location**: DataDiagnostics.tsx
**Severity**: CRITICAL
**Fix**: Set isActive=false, endTime=now()

### Issue 2: Completion Mismatch
**Detection**: completionCount ≠ completionHistory.length
**Location**: DataDiagnostics.tsx
**Severity**: WARNING
**Fix**: completionCount = completionHistory.length

### Issue 3: Missing completionHistory
**Detection**: Recurring task has no completionHistory array
**Location**: DataDiagnostics.tsx
**Severity**: WARNING
**Fix**: Create empty completionHistory=[], completionCount=0

### Issue 4: JSON Parse Errors
**Detection**: session.tasksData is not valid JSON
**Location**: useFocus.ts line 224
**Severity**: CRITICAL
**Fallback**: Use session.tasks if tasksData parse fails

---

## Component Usage Matrix

| Component | Data Source | Displays | Used In |
|-----------|-------------|----------|---------|
| TimeDisplay | Task (actual, estimated) | Efficiency bar + variance | TaskDetailModal, TaskList |
| SessionHistory | TimeTrackingService.getTaskSessionHistory() | Recent sessions list | TaskDetailModal |
| WorkActivity | useFocus.sessions + filter | 10-day calendar | TaskDetailModal |
| TimeProgressBar | actual, estimated | Colored progress bar | TimeDisplay |
| FocusStatistics | useFocus.completedSession | Post-session summary | Focus finish screen |
| SessionSummary | FocusSession object | Full breakdown + feedback | Focus finish screen |
| FocusSessionDetailModal | FocusSession from history | Session inspector | Session list |
| TaskDetailModal | Task + useFocus.sessions | All time data for task | Task view |

---

## Common Operations

### Get All Sessions for a Task
```typescript
const sessions = await TimeTrackingService.getTaskSessionHistory(taskId)
// Returns: SessionTimeEntry[]
// sorted by date DESC, most recent first
```

### Update Task Time After Session
```typescript
await TimeTrackingService.updateTaskActualTime(taskId, sessionSeconds)
// Internally:
// 1. Converts seconds to minutes
// 2. Adds to task.actualMinutes
// 3. Updates timeTracking fields
// 4. Calculates variance
```

### Mark Recurring Task Complete
```typescript
// In useFocus.endSession():
const completionHistory = task.completionHistory || []
const newHistory = [
  ...completionHistory,
  { date: today, completedAt: now(), note: "..." }
]
await updateAt(`users/${userId}/tasks/${taskId}`, {
  completionHistory: newHistory,
  completionCount: newHistory.length
})
```

### Calculate Average Time
```typescript
const average = task.actualMinutes / task.completionCount
// Used in TimeDisplay for recurring tasks
```

### Get Daily Focus Statistics
```typescript
const dailyStats = await computeDashboardAnalytics({
  tasks, sessions, goals, projects,
  period: 'today'
})
// Returns: focusData, taskData, stats, etc.
```

---

## Firestore Query Examples

### Get Active Sessions
```typescript
collection(db, `users/${userId}/focusSessions`)
query(..., where('isActive', '==', true))
```

### Get Completed Sessions
```typescript
collection(db, `users/${userId}/focusSessions`)
query(..., where('endTime', '!=', null))
```

### Get Tasks Completed Today
```typescript
collection(db, `users/${userId}/tasks`)
query(..., where('completedAt', '>=', startOfDay(now)))
```

### Find Stuck Sessions (>12h)
```typescript
const sessions = await getDocs(activeSessionsQuery)
const hoursSinceStart = (now - startTime) / (1000*60*60)
if (hoursSinceStart > 12) { /* stuck */ }
```

---

## Performance Considerations

### Indexes Needed
- tasks: (userId, status, completedAt)
- focusSessions: (userId, isActive, startTime)
- focusSessions: (userId, endTime)

### Query Costs
- getTaskSessionHistory(): Fetches ALL sessions, filters in code
- WorkActivity: Recalculates 10 days every render
- Dashboard: Aggregates all time data in memory

### Optimization Opportunities
- Paginate session history (currently unbounded)
- Cache dashboard calculations
- Add database-level aggregation functions

---

## Testing Scenarios

### Test Completion History
1. Create recurring daily task
2. Complete it in focus session
3. Verify completionHistory has entry
4. Verify completionCount incremented
5. Check TimeDisplay shows average time
6. Run DataDiagnostics (should pass)

### Test Time Tracking
1. Create task with estimate (30m)
2. Start session, work 45m, end
3. Verify actualMinutes = 45
4. Verify efficiency = 150%
5. Verify status = over-budget

### Test Data Recovery
1. Open DataDiagnostics
2. Create stuck session (manually set isActive=true, old startTime)
3. Run scan
4. Click fix
5. Verify isActive=false

---

## Emergency Fixes

### Unlock Stuck Session
```typescript
// In browser console while authenticated
db.collection('users').doc(uid).collection('focusSessions')
  .doc(stuckSessionId)
  .update({ isActive: false, endTime: firebase.firestore.Timestamp.now() })
```

### Fix Completion Count
```typescript
const historyLength = task.completionHistory?.length || 0
await updateAt(`users/${userId}/tasks/${taskId}`, {
  completionCount: historyLength
})
```

### Clear Bad tasksData
```typescript
await updateAt(`users/${userId}/focusSessions/${sessionId}`, {
  tasksData: JSON.stringify([])
})
```

---

## Related Documentation
- Full analysis: `/home/user/focus-notebook/TIME_TRACKING_ANALYSIS.md`
- Project guide: `/home/user/focus-notebook/CLAUDE.md`
- Type definitions: `/home/user/focus-notebook/src/store/useTasks.ts`
- Service logic: `/home/user/focus-notebook/src/services/TimeTrackingService.ts`
- Data diagnostics: `/home/user/focus-notebook/src/components/DataDiagnostics.tsx`

