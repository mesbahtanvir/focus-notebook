# Screenshot Baseline Update Required

## Background
After implementing 7 new features (#30, #31, #32, #33, #35, #37, #39), the visual appearance of several pages has changed. The screenshot baselines need to be updated to reflect these changes.

## Changes Made

### 1. Focus Page (tools-focus.spec.ts)
- **Feature #32**: Quick Focus now auto-selects tasks without showing modal immediately
- **Feature #37**: Follow-up task creation now shows visual feedback with animation

### 2. Tasks Page (tools-tasks.spec.ts)
- **Feature #31**: Tasks now have CTA buttons (leetcode, chess, headspace, etc.)
- CTA buttons appear in task list and task detail modal

### 3. Projects Page (likely in tools-additional.spec.ts)
- **Feature #30**: New compact view toggle added
- Toggle buttons with LayoutGrid and LayoutList icons
- Compact view shows 3-column grid layout

### 4. New Pages
- **Feature #33**: New LLM Playground page at `/tools/llm-playground`
  - May need new test file created

## How to Update Baselines

### Option 1: Update All Baselines (Recommended after major changes)
```bash
npm run test:screenshots:update
```

This will:
1. Start the dev server on port 3000
2. Run all Playwright tests
3. Generate new screenshot baselines for all pages
4. Update baselines in the `e2e/` directory

### Option 2: Update Specific Test Files
```bash
# Update only Focus page screenshots
npx playwright test tools-focus.spec.ts --update-snapshots

# Update only Tasks page screenshots
npx playwright test tools-tasks.spec.ts --update-snapshots

# Update only Projects/Additional pages screenshots
npx playwright test tools-additional.spec.ts --update-snapshots
```

### Option 3: Interactive Mode (Review each snapshot)
```bash
npm run test:screenshots:ui
```

This opens Playwright's UI mode where you can:
- See visual diffs between old and new screenshots
- Selectively approve or reject changes
- Review each screenshot before updating baseline

## What Changed Per Feature

### Feature #30 - Compact Project List
**Affected**: Projects page
**Visual Changes**:
- New toggle buttons in header (Compact/Detailed view)
- Compact view shows 3-column grid instead of stacked list
- Smaller cards with truncated text in compact mode

### Feature #31 - CTA Buttons in Tasks
**Affected**: Tasks page, Task detail modal
**Visual Changes**:
- CTA buttons appear at bottom of task cards
- Task detail modal has CTA button configuration section
- Buttons have icons and labels (💻 LeetCode, ♟️ Chess, etc.)

### Feature #32 - Quick Focus Auto-Select
**Affected**: Focus page
**Visual Changes**:
- Tasks auto-selected when coming from Quick Focus
- NO modal automatically shown (behavior change, may not be visible in screenshot)
- Confirmation modal only shows when user clicks "Start Focus"

### Feature #37 - Follow-up Task Feedback
**Affected**: Focus page during active session
**Visual Changes**:
- Green success banner appears when creating follow-up task
- Banner shows check icon and task title
- Banner auto-dismisses after 3 seconds

### Feature #33 - LLM Playground
**Affected**: New page at `/tools/llm-playground`
**Visual Changes**:
- New tool page (needs screenshot baseline created)
- Shows prompt builder UI
- Copy and download buttons for exporting prompts

### Feature #35 - Transaction Parser
**Affected**: None yet (no UI implemented)
**Note**: Only backend functions created

### Feature #39 - Export Registry
**Affected**: None yet (no UI changes)
**Note**: Backend registry pattern only

## Verification After Update

After updating baselines, verify the changes:

```bash
# Run tests to ensure new baselines pass
npm run test:screenshots

# Check the diff to see what changed
git diff e2e/
```

Review the changes to ensure they match the expected UI changes from the implemented features.

## Notes

- Screenshot tests are currently separated from Jest tests (Jest config ignores e2e/)
- All 667 Jest unit/integration tests are passing ✅
- Playwright tests require dev server running on port 3000
- Tests run on 3 viewports: Desktop Chrome, Tablet (iPad Pro), Mobile (iPhone 13)

## Current Status

- ✅ Jest tests: 34 suites, 667 tests passing
- ⏳ Playwright screenshot tests: Baselines need update
- 🔧 Fix applied: e2e/ directory excluded from Jest to prevent TransformStream errors
