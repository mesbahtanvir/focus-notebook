# Recurring Tasks Feature

Enhanced task management with support for recurring tasks that repeat daily, weekly, or monthly.

## Features

### 1. Recurrence Types

- **One-time**: Standard tasks that need to be done once
- **Daily**: Tasks that repeat every day
- **Work Week**: Tasks that repeat Monday-Friday (skips weekends)
- **Weekly**: Tasks that repeat weekly
- **Monthly**: Tasks that repeat monthly

### 2. Frequency Goals

Set targets for how many times you want to complete a task within a period:

- **Daily with frequency**: "Take medicine 3 times per day"
- **Weekly with frequency**: "Go to gym 4 times per week"
- **Monthly with frequency**: "Meet new people 2-3 times per month"

### 3. Smart On-Demand Task Creation

Tasks are created intelligently when you visit the page:

1. **On-demand generation**: Recurring tasks are only created when you visit the page on the appropriate day
2. **No clutter**: Tasks for future days aren't pre-created
3. **Automatic detection**: 
   - When you open the app, it checks if any recurring tasks need instances for today
   - Daily tasks: Creates one for today if you've completed yesterday's or if it's your first time
   - Work week tasks: Only creates on Monday-Friday, skips weekends automatically
   - Weekly/monthly tasks: Creates when due date has passed
4. **Progress tracking**: Completion count increments each time you complete a task

### 4. Visual Indicators

- **Purple badge**: Shows recurrence type and progress
- **Completion counter**: Displays "X/Y" for frequency-based tasks
- **Repeat icon**: Visual indicator for recurring tasks

## Use Cases

### Example 1: Daily Medicine
```
Title: Take vitamins
Recurrence: Daily (no frequency)
→ When you open the app tomorrow, it creates tomorrow's task
→ No task is pre-created until you actually visit the app
```

### Example 2: Work Week Tasks
```
Title: Check work emails
Recurrence: Work Week (Mon-Fri)
→ Only creates tasks on weekdays
→ Saturday/Sunday: No task is created
→ Monday: New task appears automatically
```

### Example 3: Gym Routine
```
Title: Workout session
Recurrence: Weekly
Frequency: 4 times per week
→ Tracks 0/4, 1/4, 2/4, etc. as you complete
→ Task persists until you complete it 4 times
```

### Example 4: Social Activities
```
Title: Meet new people
Recurrence: Monthly
Frequency: 2 times per month
→ Tracks progress: 0/2, 1/2, 2/2
→ New instance created at start of next month
```

### Example 5: Regular Chores
```
Title: Clean kitchen
Recurrence: Weekly (no frequency)
→ When you complete it, task stays done
→ Next week when you visit, a new one is created
```

## How It Works

### Creating a Recurring Task

1. Click **"New Task"**
2. Fill in task details (title, priority, category, etc.)
3. In the **Recurrence** section:
   - Select recurrence type: Daily, Weekly, or Monthly
   - Optionally set a frequency goal (e.g., 4 for "4 times per week")
4. Click save

### Completing a Recurring Task

When you check off a recurring task:

- **Completion is recorded**: Task is marked as done with timestamp
- **Progress counter increases**: If it has a frequency goal
- **No immediate regeneration**: New instance is NOT created immediately
- **Next visit creates new instance**: When you open the app on the next appropriate day (tomorrow for daily, next weekday for work week, etc.), a fresh task instance is created automatically

### Editing Recurrence

1. Click on any task to open details
2. Click **"Edit"**
3. Modify the recurrence settings
4. Click **"Save"**

## Database Schema

### New Task Fields

- `recurrence`: Object containing recurrence configuration
  - `type`: 'none' | 'daily' | 'weekly' | 'monthly'
  - `frequency`: Optional number for frequency goals
- `completionCount`: Tracks how many times completed in current period
- `parentTaskId`: Links recurring instances to their parent task

## Technical Details

- **Database Version**: v7 (added recurrence fields)
- **Storage**: IndexedDB with JSON serialization for recurrence config
- **On-demand generation**: Handled in the `loadTasks` method when app loads
- **Smart detection**: Checks if today needs a recurring task instance
- **Workday logic**: Detects Monday-Friday for work week tasks (day 1-5 of week)
- **Progress tracking**: Completion count increments with each completion
- **Parent-child linking**: Instances track their parent task via `parentTaskId`

## Benefits

1. **Never forget daily habits**: Medicine, vitamins, meditation
2. **Work-life balance**: Work week tasks respect your weekends
3. **Track exercise goals**: Gym 4x/week, run 3x/week
4. **Social accountability**: Meet people regularly
5. **Household maintenance**: Weekly/monthly chores
6. **Flexible goals**: Set targets without rigid schedules
7. **No clutter**: Only see tasks for today, not future days
8. **Automatic**: Tasks appear when you need them, no manual recreation

## Future Enhancements

Potential features for future versions:

- [ ] Specific days of week (e.g., Monday, Wednesday, Friday only)
- [ ] Custom intervals (every 2 days, every 3 weeks)
- [ ] Range frequencies (2-3 times instead of exact number)
- [ ] Skip/postpone functionality
- [ ] Streak tracking and statistics
- [ ] Reminders and notifications
