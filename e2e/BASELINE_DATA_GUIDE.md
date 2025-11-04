# Baseline Data Guide

## Overview

The baseline data fixture provides **realistic, consistent test data** that simulates an active Focus Notebook user. Instead of testing against empty pages, all tests can leverage this comprehensive dataset for more meaningful visual regression testing.

## Why Baseline Data?

### Problems with Empty State Testing
- ❌ Doesn't represent real usage
- ❌ Misses layout issues with actual content
- ❌ Can't test data-dependent features properly
- ❌ Screenshots look artificial

### Benefits of Baseline Data
- ✅ **Realistic screenshots** that look like actual user data
- ✅ **Better bug detection** - catches real layout/overflow issues
- ✅ **Comprehensive scenarios** - tests with various data states
- ✅ **Consistent baseline** - all tests use same data for comparison
- ✅ **Time-efficient** - no need to manually create test data per test

## What's Included

The baseline data represents a user who has been actively using Focus Notebook for about 2-3 weeks:

### Tasks (12 total)
**Distribution:**
- 3 tasks due today (2 pending, 1 completed)
- 2 tasks due tomorrow
- 2 tasks this week
- 2 tasks in backlog (2-4 weeks out)
- 2 tasks without due dates (someday/maybe)
- 1 daily recurring task
- 1 weekly recurring task

**Categories:**
- Work tasks (code reviews, presentations, reports, meetings)
- Personal tasks (health, errands, planning)
- Learning tasks (research, courses)

**Example Tasks:**
```typescript
{
  text: 'Review pull requests',
  completed: false,
  dueDate: today,
  priority: 'high',
  tags: ['work', 'urgent'],
  recurrenceType: 'daily'
}
```

### Thoughts (5 total)
**Topics:**
- Team collaboration reflections (2 hours ago)
- Technical architecture ideas (yesterday)
- Work-life balance notes (3 days ago)
- Learning notes (5 days ago)
- Morning motivation (1 week ago)

**Example Thought:**
```typescript
{
  title: 'Reflections on Team Collaboration',
  content: 'Today\'s standup went really well. The team is communicating more effectively...',
  tags: ['work', 'reflection', 'team']
}
```

### Goals (5 total)
**Types:**
- 3 active goals with varying progress (30%, 55%, 65%)
- 1 completed goal (100%)
- 1 past-due active goal

**Categories:**
- Professional development (AWS certification, product launch)
- Personal growth (reading challenge, fitness goal)
- Learning (completed ML course)

**Example Goal:**
```typescript
{
  title: 'Launch New Product Feature',
  description: 'Complete and ship the user dashboard redesign...',
  progress: 65,
  status: 'active'
}
```

### Projects (4 total)
**Status:**
- 3 active projects at various stages
- 1 completed project

**Examples:**
- E-commerce Platform Redesign (active)
- Mobile App Development (active)
- API Documentation Portal (active)
- CI/CD Pipeline Setup (completed)

### Focus Sessions (10 total)
**Distribution:**
- 2 sessions today (25min and 50min)
- 3 sessions yesterday
- 5 sessions earlier this week

**Types:**
- Task-linked sessions (with notes)
- General focus sessions
- Break sessions (15min)
- Mix of 25min and 50min Pomodoros

## Usage

### Option 1: Global Fixture (Recommended)

The easiest way - automatically loads baseline data for every test:

```typescript
import { test, expect, gotoPage } from './fixtures/global-setup';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Dashboard Tests', () => {
  test('shows user data', async ({ page }) => {
    // Baseline data already loaded!
    await gotoPage(page, '/dashboard');

    await takeScreenshot(page, {
      name: 'dashboard-with-data',
      fullPage: true,
    });
  });
});
```

**What's Included:**
- ✅ Authenticated user (demo@focusnotebook.com)
- ✅ Fixed time (2024-01-15 10:00 AM)
- ✅ All baseline data loaded
- ✅ Dynamic elements hidden
- ✅ Page ready waiting

### Option 2: Manual Loading

For more control over when/how data is loaded:

```typescript
import { test } from '@playwright/test';
import { seedBaselineData } from './fixtures/baseline-data';
import { setupMockAuth } from './helpers/auth';
import { mockDateTime } from './helpers/screenshot';

test('custom test', async ({ page }) => {
  await mockDateTime(page);
  await setupMockAuth(page);

  // Load baseline data
  await seedBaselineData(page, 'test-user-123');

  await page.goto('/tools/tasks');
  // ... rest of test
});
```

### Option 3: Custom Data

Generate baseline data but customize it:

```typescript
import { generateBaselineData } from './fixtures/baseline-data';

test('custom scenario', async ({ page }) => {
  // Get baseline data
  const data = generateBaselineData('test-user-123');

  // Customize it
  data.tasks = data.tasks.filter(t => !t.completed); // Only incomplete tasks
  data.goals[0].progress = 100; // Mark first goal complete

  // Seed customized data
  await page.addInitScript((customData) => {
    localStorage.setItem('mockTasks', JSON.stringify(customData.tasks));
    localStorage.setItem('mockGoals', JSON.stringify(customData.goals));
    // ... etc
  }, data);

  // Continue test
});
```

## Realistic Scenarios

### Dashboard Views
With baseline data, the dashboard shows:
- **Task summary**: 9 pending tasks (3 due today)
- **Focus statistics**: 10 sessions this week, ~5 hours total
- **Goal progress**: 4 active goals with real progress bars
- **Recent activity**: Latest thoughts and completed sessions

### Task Management
The tasks page displays:
- **Today's tasks** section (3 items)
- **Upcoming** section (4 items)
- **Backlog** section (2 items)
- **Someday/Maybe** section (2 items)
- **Completed** filter (1 task today)
- Realistic mix of priorities, tags, and due dates

### Focus Page
Shows realistic focus session history:
- **Today**: 2 sessions (75 minutes total)
- **This week**: 10 sessions total
- **Session notes**: Actual work descriptions
- **Charts**: Real data for productivity trends

### Goals & Projects
- Active goals with progress bars (30-65%)
- Completed goal at 100%
- Related projects linked to goals
- Realistic target dates and descriptions

## Tips & Best Practices

### DO Use Baseline Data For:
- ✅ Main page screenshots
- ✅ Dashboard and overview pages
- ✅ List views (tasks, thoughts, goals)
- ✅ Charts and statistics pages
- ✅ Navigation and layout testing
- ✅ Responsive design testing

### DON'T Use Baseline Data For:
- ❌ Empty state testing (use no data instead)
- ❌ First-time user experience
- ❌ Onboarding flows
- ❌ Error state testing
- ❌ Edge cases (very long text, etc.)

### When to Customize:
- Testing specific data scenarios
- Testing data validation
- Testing edge cases (100+ items, very long titles, etc.)
- Testing specific filters or sorts

## Data Characteristics

### Time Context
All baseline data assumes the current time is:
```
Date: January 15, 2024
Time: 10:00 AM UTC
```

This affects:
- Task due dates (relative to this date)
- Focus session timestamps
- Thought creation dates
- Goal target dates

### User Profile
```typescript
{
  uid: 'test-user-123',
  email: 'demo@focusnotebook.com',
  displayName: 'Demo User'
}
```

### Data Realism
All baseline data is:
- **Internally consistent**: Tasks reference real projects, sessions link to real tasks
- **Temporally accurate**: Dates make sense relative to each other
- **Realistically formatted**: Titles and descriptions sound natural
- **Appropriately distributed**: Mix of statuses, priorities, and categories

## Updating Baseline Data

### When to Update

Update the baseline when:
- Adding new features that need data
- Changing data models
- Improving test realism
- Adding new data types

### How to Update

Edit [fixtures/baseline-data.ts](fixtures/baseline-data.ts):

```typescript
export function generateBaselineData(userId: string): BaselineData {
  // Add new data types
  const tasks = [...]; // Modify tasks
  const thoughts = [...]; // Modify thoughts

  // Add new entity type
  const newFeature = generateNewFeatureData();

  return {
    tasks,
    thoughts,
    goals,
    projects,
    focusSessions,
    newFeature, // Add to return
  };
}
```

### Testing Your Changes

After updating baseline data:

```bash
# Update all screenshot baselines
npm run test:screenshots:update

# Review changes in UI mode
npm run test:screenshots:ui

# Commit if changes look good
git add e2e/**/*.png
git commit -m "chore: update screenshot baselines with new data"
```

## Examples

### Example 1: Test Dashboard with Real Data

```typescript
import { test, gotoPage } from './fixtures/global-setup';
import { takeScreenshot } from './helpers/screenshot';

test('dashboard shows productivity stats', async ({ page }) => {
  await gotoPage(page, '/dashboard');

  // Will show:
  // - 10 focus sessions this week
  // - 4 active goals
  // - 9 pending tasks
  // - Recent activity
  await takeScreenshot(page, {
    name: 'dashboard-stats',
    fullPage: true,
  });
});
```

### Example 2: Test Task Filtering

```typescript
test('filter tasks by priority', async ({ page }) => {
  await gotoPage(page, '/tools/tasks');

  // Baseline has mix of high/medium/low priority tasks
  await page.click('[data-filter="priority-high"]');

  // Should show 3 high-priority tasks
  await takeScreenshot(page, {
    name: 'tasks-filtered-high-priority',
  });
});
```

### Example 3: Test Mobile Layout

```typescript
test('mobile dashboard shows data properly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoPage(page, '/dashboard');

  // Baseline data tests if mobile layout handles real content
  await takeScreenshot(page, {
    name: 'dashboard-mobile-with-data',
    fullPage: true,
  });
});
```

## See Also

- [Main README](README.md) - Full testing guide
- [fixtures/baseline-data.ts](fixtures/baseline-data.ts) - Source code
- [fixtures/global-setup.ts](fixtures/global-setup.ts) - Global fixture
- [example-with-baseline.spec.ts](example-with-baseline.spec.ts) - Example tests
