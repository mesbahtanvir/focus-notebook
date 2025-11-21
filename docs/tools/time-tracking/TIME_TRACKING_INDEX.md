# Time Tracking System - Complete Documentation Index

## Documents Created

### 1. **TIME_TRACKING_ANALYSIS.md** (Comprehensive Reference)
   - Full data model specifications
   - Complete Firestore schema documentation
   - All services and business logic
   - Detailed component descriptions
   - Data redundancies and issues identified
   - Analytics and aggregation functions
   - Architecture recommendations

### 2. **TIME_TRACKING_QUICK_REFERENCE.md** (Developer Guide)
   - Visual data flow diagrams
   - Time unit conversions
   - Collections reference with ASCII trees
   - Key calculation formulas
   - Session lifecycle diagrams
   - Recurring task completion flow
   - Component usage matrix
   - Common operations code examples
   - Firestore query examples
   - Performance considerations
   - Testing scenarios
   - Emergency fixes

---

## Key File Locations

### Type Definitions
- **Task Types**: `/home/user/focus-notebook/src/store/useTasks.ts`
  - Task, TaskCompletion, TaskStatus, TaskPriority, TaskCategory
  - RecurrenceConfig, TaskStep, CTAButton

- **Focus Session Types**: `/home/user/focus-notebook/src/store/useFocus.ts`
  - FocusSession, FocusTask, BreakSession

- **Service Types**: `/home/user/focus-notebook/src/services/TimeTrackingService.ts`
  - TimeTracking, SessionTimeEntry

### State Management (Stores)
- **Task Store**: `/home/user/focus-notebook/src/store/useTasks.ts`
  - subscribe(), add(), updateTask(), toggle(), resetDailyTasks()
  - Manages task lifecycle and time fields

- **Focus Store**: `/home/user/focus-notebook/src/store/useFocus.ts`
  - startSession(), endSession(), pauseSession(), resumeSession()
  - markTaskComplete(), updateTaskTime(), updateTaskNotes()
  - addTaskToSession(), deleteSession(), persistActiveSession()

### Services
- **TimeTrackingService**: `/home/user/focus-notebook/src/services/TimeTrackingService.ts`
  - updateTaskActualTime() - core time update logic
  - getTaskSessionHistory() - fetch session history
  - calculateProjectTime(), calculateGoalTime()
  - formatTime(), calculateEfficiency(), getEfficiencyStatus()

- **RecurringTaskService**: `/home/user/focus-notebook/src/services/RecurringTaskService.ts`
  - generateMissingRecurringTasks()
  - shouldCreateTaskForToday()
  - createTaskForToday()

### Components
- **TimeDisplay**: `/home/user/focus-notebook/src/components/TimeDisplay.tsx`
  - Renders actual vs estimated time with efficiency indicators
  - Variants: inline, badge, detailed

- **SessionHistory**: `/home/user/focus-notebook/src/components/SessionHistory.tsx`
  - List of recent sessions for a task
  - Expandable details with timestamps

- **WorkActivity**: `/home/user/focus-notebook/src/components/WorkActivity.tsx`
  - 10-day calendar grid visualization
  - Daily summary and hover tooltips

- **TimeProgressBar**: `/home/user/focus-notebook/src/components/TimeProgressBar.tsx`
  - Visual progress bar with color coding

- **FocusStatistics**: `/home/user/focus-notebook/src/components/FocusStatistics.tsx`
  - Post-session statistics display

- **SessionSummary**: `/home/user/focus-notebook/src/components/SessionSummary.tsx`
  - Detailed session breakdown with feedback form

- **FocusSessionDetailModal**: `/home/user/focus-notebook/src/components/FocusSessionDetailModal.tsx`
  - Modal for viewing completed session details

- **TaskDetailModal**: `/home/user/focus-notebook/src/components/TaskDetailModal.tsx`
  - Task detail view with TimeDisplay, SessionHistory, WorkActivity

### Database & Analytics
- **Dashboard Analytics**: `/home/user/focus-notebook/src/lib/analytics/dashboard.ts`
  - computeDashboardAnalytics() - daily aggregations
  - focusData, taskData, categoryData, timeOfDayData

- **Progress Analytics**: `/home/user/focus-notebook/src/lib/analytics/progress.ts`
  - computeProgressAnalytics() - period-based analysis
  - Goal, project, task statistics

- **Firestore Rules**: `/home/user/focus-notebook/firestore.rules`
  - Schema validation and access control

- **Data Diagnostics**: `/home/user/focus-notebook/src/components/DataDiagnostics.tsx`
  - runDiagnostics() - detect data issues
  - fixAllIssues() - automatic repair

### Import/Export
- **useImportExport Hook**: `/home/user/focus-notebook/src/hooks/useImportExport.ts`
- **ExportService**: `/home/user/focus-notebook/src/services/import-export/ExportService.ts`
- **ImportService**: `/home/user/focus-notebook/src/services/import-export/ImportService.ts`

---

## Critical Data Paths

### Firestore Collections
```
users/{userId}/
├── tasks/{taskId}
│   ├── actualMinutes: number
│   ├── estimatedMinutes: number
│   ├── completionHistory: TaskCompletion[]
│   ├── completionCount: number
│   └── recurrence: RecurrenceConfig
│
├── focusSessions/{sessionId}
│   ├── tasksData: string (JSON)
│   ├── startTime: timestamp
│   ├── endTime: timestamp
│   ├── isActive: boolean
│   └── breaks: BreakSession[]
│
└── preferences/focusTaskOrder
    └── preferences: Record<taskId, {score, updatedAt}>
```

---

## Key Formulas & Constants

### Time Calculations
- **Efficiency**: `(actual / estimated) * 100`
- **Variance**: `actual - estimated`
- **Average (Recurring)**: `actual / completionCount`
- **Stuck Session Threshold**: `> 12 hours`

### Efficiency Status
- **On-track**: efficiency ≤ 100% (green)
- **Warning**: 100% < efficiency ≤ 120% (amber)
- **Over-budget**: efficiency > 120% (red)

### Time Unit Conversions
- `FocusTask.timeSpent` (seconds) → ÷60 = minutes
- `Task.actualMinutes` (minutes) → ×60 = seconds
- `session.totalPausedTime` (ms) → ÷1000 = seconds

---

## Critical Issues & Fixes

### Issue 1: Stuck Sessions
- **Problem**: Session isActive=true for >12 hours
- **Detection**: DataDiagnostics.tsx (lines 44-71)
- **Fix**: Set isActive=false, endTime=now()

### Issue 2: Completion Count Mismatch
- **Problem**: completionCount ≠ completionHistory.length
- **Detection**: DataDiagnostics.tsx (lines 77-96)
- **Fix**: completionCount = completionHistory.length

### Issue 3: Missing completionHistory
- **Problem**: Recurring task without completionHistory array
- **Detection**: DataDiagnostics.tsx (lines 100-115)
- **Fix**: Initialize completionHistory=[], completionCount=0

### Issue 4: Redundant timeTracking Fields
- **Problem**: actualMinutes AND timeTracking.totalMinutes both updated
- **Impact**: Data duplication, confusing code
- **Recommendation**: Remove timeTracking object

---

## Common Development Tasks

### Adding Time Tracking to New Feature
1. Add time fields to Task interface (actualMinutes, estimatedMinutes)
2. Add completionHistory for recurring functionality
3. Call TimeTrackingService.updateTaskActualTime() when session ends
4. Use TimeDisplay component to render time data
5. Add tests for time calculations

### Modifying Time Calculations
1. Update formulas in TimeTrackingService.ts
2. Update TimeDisplay rendering logic
3. Update analytics calculations if needed
4. Run tests: `npm test -- TimeTrackingService`
5. Test in browser with test data

### Debugging Time Issues
1. Open DataDiagnostics (Settings > Data Management)
2. Run diagnostics scan
3. Check issues list for specific problems
4. Click "Fix All Issues" to auto-repair
5. Verify fixes in browser console

### Adding New Time Visualization
1. Create new component in `/src/components/`
2. Import time-related types
3. Use TimeTrackingService or useFocus for data
4. Follow TimeDisplay pattern for formatting
5. Add to appropriate parent component

---

## Testing Checklist

- [ ] Task created with actualMinutes updated after session
- [ ] completionHistory array populated for recurring tasks
- [ ] completionCount equals history length
- [ ] Efficiency percentage calculated correctly
- [ ] Variance (actual - estimated) computed accurately
- [ ] TimeDisplay shows correct format (h m)
- [ ] SessionHistory lists all past sessions
- [ ] WorkActivity shows 10-day calendar correctly
- [ ] Recurring task generates new instances
- [ ] Average time shown for recurring tasks
- [ ] DataDiagnostics detects all issue types
- [ ] Emergency fixes resolve issues
- [ ] Session persists correctly on pause/resume
- [ ] Break sessions tracked properly
- [ ] Import/Export preserves completionHistory

---

## Performance Tuning

### Current Bottlenecks
- getTaskSessionHistory(): O(n) where n = all sessions
- WorkActivity: Recalculates every render
- Dashboard: Aggregates all sessions in memory
- JSON parsing of tasksData on every session read

### Recommended Indexes
```
tasks: (userId, status, completedAt)
focusSessions: (userId, isActive, startTime)
focusSessions: (userId, endTime)
```

### Optimization Opportunities
- Implement pagination for session history
- Cache dashboard calculations
- Use service worker for background aggregation
- Store sessionData as array instead of JSON string

---

## References

### CLAUDE.md Project Guide
- Full project architecture
- Development workflows
- Testing guidelines
- Code conventions
- Common development tasks

### Related Collections
- Tasks: `/home/user/focus-notebook/src/store/useTasks.ts`
- Focus: `/home/user/focus-notebook/src/store/useFocus.ts`
- Projects: `/home/user/focus-notebook/src/store/useProjects.ts`
- Goals: `/home/user/focus-notebook/src/store/useGoals.ts`

### External Documentation
- Firebase Docs: https://firebase.google.com/docs
- Zustand Docs: https://docs.pmnd.rs/zustand
- TypeScript Docs: https://www.typescriptlang.org/docs

---

## Quick Links by Role

### For Developers Adding Features
1. Read: TIME_TRACKING_QUICK_REFERENCE.md
2. Look at: TimeDisplay component (example)
3. Reference: useFocus.ts (state management)
4. Test with: TimeTrackingService tests

### For Debugging Issues
1. Run: DataDiagnostics component
2. Check: TIME_TRACKING_ANALYSIS.md (Issues section)
3. Review: useFocus.ts endSession() logic
4. Inspect: Firestore data directly

### For Performance Tuning
1. Check: Performance Considerations section
2. Profile: Dashboard analytics calculations
3. Review: Firestore query patterns
4. Consider: Index recommendations

### For Understanding System
1. Start: TIME_TRACKING_QUICK_REFERENCE.md diagrams
2. Study: Data models section
3. Review: Component usage matrix
4. Deep dive: TIME_TRACKING_ANALYSIS.md

---

## Document Version
- Created: 2025-11-18
- Codebase: Focus Notebook
- Branch: claude/add-time-tracking-history-016HZ1gGWd4kp3m8vDiW4fb2

