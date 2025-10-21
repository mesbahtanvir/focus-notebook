# Focus Tool

Deep work sessions with intelligent task selection, timer tracking, and immersive pomodoro-style interface.

## Overview

The Focus tool helps you enter a state of deep work by:
- Selecting balanced tasks (mastery vs pleasure)
- Providing an immersive, distraction-free interface
- Tracking time spent on each task
- Allowing flexible navigation between tasks

## Enhanced Features (v2)

✅ **Gentle Timer** - Shows only minutes, not stressful seconds  
✅ **Session Recording** - All sessions saved to database  
✅ **Statistics & Analytics** - Detailed post-session insights  
✅ **Feedback System** - Rate and reflect on each session  
✅ **Dark Mode Compatible** - Beautiful in both themes  
✅ **Auto-navigation** - Seamlessly transitions to stats when done  

## Features

### 1. Smart Task Selection

The Focus tool automatically selects tasks based on:
- **Balance**: Alternates between mastery and pleasure tasks
- **Priority**: Prioritizes urgent and high-priority tasks
- **Status**: Only includes active, incomplete tasks
- **Session duration**: Estimates appropriate number of tasks

#### Selection Algorithm
```
For a 60-minute session:
- Estimates ~2-3 tasks (20-30 min each)
- Picks alternating mastery/pleasure tasks
- Sorts by priority within each category
- Result: [Mastery-Urgent, Pleasure-High, Mastery-High]
```

### 2. Session Setup

**Duration Options:**
- Quick presets: 30, 60, 90, 120 minutes
- Custom duration: 15-240 minutes
- Task preview before starting

**Task Preview:**
- Shows all selected tasks with badges
- Displays category (mastery/pleasure)
- Shows priority level
- Numbered order of execution

### 3. Immersive Focus Interface

When you start a session:

**Full-screen experience:**
- Beautiful gradient background
- Minimal distractions
- Large, readable text
- Smooth animations

**Current task display:**
- Task title in large font (5xl-6xl)
- Category and priority badges
- Timer showing time spent
- Optional task notes

**Timer:**
- Real-time tracking per task
- Formatted as MM:SS or H:MM:SS
- Gentle pulsing animation
- Auto-pauses when you pause

### 4. Task Navigation

**Move between tasks:**
- Previous/Next buttons
- Click task indicators at bottom
- Time pauses automatically when switching
- Each task maintains its own timer

**Task indicator bar (bottom):**
- Circular buttons for each task
- Current task highlighted in purple/pink gradient
- Completed tasks show green with checkmark
- Click any task to jump to it

### 5. Gentle Timer Management

**Stress-free timing:**
- **Minutes only** - No seconds shown to reduce pressure
- Displays as "25m", "1h 15m", or "Starting..."
- Updates every second internally but shows rounded minutes
- Gentle pulsing animation, not distracting

**Per-task timing:**
- Each task has independent timer
- Time accumulates only when task is active
- Switching tasks pauses current timer
- Resume from where you left off

**Session controls:**
- Pause/Resume entire session
- Pause stops all timing
- Resume continues from current task

### 6. Task Completion

**Mark tasks complete:**
- Large "Complete Task" button
- Marks task done in Focus session
- Syncs with main task list
- Automatically moves to next task
- Green checkmark in indicator

**Progress tracking:**
- Shows X of Y tasks completed
- Progress bar at top
- Visual feedback on completion

### 7. Session Management & Recording

**End session:**
- Confirm before ending manually
- **Auto-ends** when all tasks completed
- Saves session to database (IndexedDB)
- Records all time spent per task
- Transitions to statistics screen

**Session persistence:**
- All sessions saved permanently
- Task completion status
- Time spent per task
- Category breakdown (mastery vs pleasure)
- User feedback and ratings

### 8. Post-Session Statistics

**Comprehensive analytics:**
- **Total focus time** - Sum of all task time
- **Completion rate** - Percentage of tasks completed
- **Task breakdown** - Individual task times
- **Work balance** - Visual ratio of mastery vs pleasure
- **Category totals** - Time spent on each category

**Interactive feedback:**
- 5-star rating system
- Optional written feedback
- Hover effects on stars
- Saves to database for future analysis

**Visual presentation:**
- Beautiful gradient cards
- Animated progress bars
- Color-coded categories
- Dark mode optimized

## Use Cases

### Morning Deep Work
```
Duration: 120 minutes
Tasks selected:
1. Write report (Mastery, Urgent)
2. Respond to emails (Pleasure, High)
3. Review code (Mastery, High)
4. Team check-in (Pleasure, Medium)

Result: Balanced workload, high focus
```

### Evening Creative Session
```
Duration: 60 minutes
Tasks selected:
1. Design mockup (Mastery, High)
2. Organize photos (Pleasure, Medium)
3. Write blog post (Mastery, Medium)

Result: Creative flow with breaks
```

### Quick Focus Sprint
```
Duration: 30 minutes
Tasks selected:
1. Fix critical bug (Mastery, Urgent)
2. Update documentation (Pleasure, Medium)

Result: Quick productive burst
```

## User Interface

### Session Setup Screen
- Header with Focus icon
- Duration selection (presets + custom)
- Task preview cards
- Start button (gradient purple-pink)

### Focus Mode Screen
- Minimal header with Pause/End buttons
- Progress bar with percentage
- Large task title (center)
- Category and priority badges
- Animated timer display
- Navigation controls (Previous/Complete/Next)
- Task indicator dots (bottom)

### Visual Design
- Gradient backgrounds (purple/pink/blue)
- Frosted glass cards (backdrop-blur)
- Smooth animations (framer-motion)
- High contrast text
- Accessible controls

## Keyboard Shortcuts (Future)

Potential shortcuts for future versions:
- Space: Pause/Resume
- ← →: Previous/Next task
- Enter: Complete task
- Esc: End session

## Technical Details

### State Management
- **Store**: `useFocus.ts` (Zustand)
- **Task selection**: `selectBalancedTasks()` function
- **Timer**: Per-task tracking with intervals
- **Persistence**: IndexedDB via Dexie

### Components
- **FocusPage**: Session setup and configuration
- **FocusSession**: Immersive focus interface
- **FocusStatistics**: Post-session analytics and feedback
- **useFocus hook**: Global state management

### Database Schema (v8)
```typescript
FocusSessionRow {
  id: string
  duration: number (planned minutes)
  startTime: ISO string
  endTime: ISO string
  tasksData: string (JSON serialized)
  feedback?: string
  rating?: number (1-5)
}
```

### Data Structure
```typescript
FocusSession {
  id: string
  duration: number (minutes)
  tasks: FocusTask[]
  startTime: ISO string
  endTime?: ISO string
  currentTaskIndex: number
  isActive: boolean
  feedback?: string
  rating?: number
}

FocusTask {
  task: Task
  timeSpent: number (seconds)
  completed: boolean
}
```

### Integration
- Reads from main task list (`useTasks`)
- Marks tasks complete in main list
- Saves sessions to database
- Independent timing per task
- Session history preserved permanently

## Benefits

1. **Reduced overwhelm**: Balanced task selection
2. **No time pressure**: Gentle timer reduces stress
3. **Deep focus**: Immersive, distraction-free interface
4. **Time awareness**: Track how long tasks actually take
5. **Flexibility**: Switch tasks without penalty
6. **Progress visibility**: Clear completion tracking
7. **Work-life balance**: Mix mastery and pleasure tasks
8. **Self-reflection**: Rate and review your sessions
9. **Data-driven**: Analytics help optimize future sessions
10. **Dark mode**: Easy on the eyes, day or night

## Tips for Best Results

1. **Set realistic duration**: Don't overcommit
2. **Trust the selection**: Balanced tasks prevent burnout
3. **Complete in order**: But feel free to skip if needed
4. **Use pause**: Take breaks between tasks
5. **Review time spent**: Learn your task durations
6. **Mix categories**: Don't force all mastery or all pleasure

## Changelog

### Version 2.0 (Current)
- ✅ Gentle timer (minutes only)
- ✅ Session recording to database
- ✅ Post-session statistics
- ✅ Feedback and rating system
- ✅ Dark mode optimization
- ✅ Auto-navigation to statistics
- ✅ Work balance analytics

### Version 1.0
- ✅ Smart task selection
- ✅ Immersive focus mode
- ✅ Per-task timing
- ✅ Task navigation
- ✅ Progress tracking

## Future Enhancements

Potential features for future versions:

- [ ] Session history page with past analytics
- [ ] Time estimates vs actual tracking
- [ ] Break reminders (true Pomodoro)
- [ ] Ambient sounds or music
- [ ] Keyboard shortcuts
- [ ] Manual task reordering
- [ ] Save favorite session configurations
- [ ] Weekly focus time goals
- [ ] Trend analysis (productivity over time)
- [ ] Export session reports
- [ ] Session templates
- [ ] Focus streaks and achievements
