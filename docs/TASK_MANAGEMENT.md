# Task Management System

Your personal notebook now includes a comprehensive task management tool to help you organize and track your work effectively.

## Features

### 📋 Enhanced Task Model

Each task now supports:

- **Title**: What needs to be done
- **Priority**: `low`, `medium`, `high`, or `urgent`
- **Category**: `mastery` (skill development) or `pleasure` (enjoyment)
- **Status**: `active`, `backlog`, or `completed`
- **Due Date**: Optional deadline
- **Notes**: Detailed description or context
- **Tags**: Comma-separated labels for organization
- **Estimated Time**: How long you expect it to take (in minutes)
- **Timestamps**: Created date and completion date

### 🎯 Dedicated Tasks Page

Navigate to `/tasks` to access the full task manager with:

- **Statistics Dashboard**: View total, active, completed, backlog, and overdue tasks
- **Advanced Filtering**: Filter by status, category, or priority
- **Flexible Sorting**: Sort by priority, due date, created date, or title
- **Quick Actions**: Create, edit, or delete tasks with ease

### 🔍 Filtering & Sorting

- **Filter by Status**: View only active, completed, or backlog tasks
- **Filter by Category**: Focus on mastery or pleasure tasks
- **Filter by Priority**: See urgent, high, medium, or low priority items
- **Sort Options**: Organize by priority (default), due date, created date, or alphabetically

### ✏️ Task Details Modal

Click any task to open a detailed view where you can:

- Toggle completion status
- Edit all task properties
- Add or modify notes
- Manage tags
- Set due dates and time estimates
- View creation and completion timestamps
- Delete tasks

### 🏠 Home Page Integration

The home page shows:

- **Today's Tasks**: Tasks due or created today
- **Quick Task Creation**: Simple button to add new tasks
- **Priority Badges**: Visual indicators for task priority
- **Category Tags**: Color-coded mastery/pleasure labels

## How to Use

### Creating a Task

1. Click the "**New Task**" button on the home page or tasks page
2. Fill in the task details:
   - Enter a descriptive title
   - Add optional notes for context
   - Select category (Mastery or Pleasure)
   - Choose priority level
   - Decide whether to add to "Today" or "Backlog"
   - Optionally set a due date
   - Estimate time required
   - Add tags for organization
3. Click the **+** button or press Enter to create

### Managing Tasks

- **Complete a Task**: Check the checkbox next to any task
- **Edit a Task**: Click on the task card to open the detail modal
- **Delete a Task**: Open the task detail modal and click the trash icon
- **Filter Tasks**: Use the filters panel on the tasks page
- **Sort Tasks**: Select your preferred sorting method from the dropdown

### Task Organization Tips

1. **Use Priority Wisely**:
   - `urgent`: Must be done immediately
   - `high`: Important and time-sensitive
   - `medium`: Normal priority (default)
   - `low`: Nice to have, can wait

2. **Categories**:
   - `mastery`: Learning, skill development, career growth
   - `pleasure`: Hobbies, relaxation, enjoyment

3. **Tags**: Use consistent tags like:
   - `work`, `personal`, `urgent`
   - `quick-win`, `deep-work`
   - Project names or areas of life

4. **Time Estimates**: Help plan your day by estimating task duration

## Navigation

- **Home** (`/`): Dashboard with thoughts and today's tasks
- **Tasks** (`/tasks`): Full task management interface

## Keyboard Tips

- Tab through form fields for quick task entry
- Use date picker for setting due dates
- Comma-separated values for multiple tags

## Data Storage

All tasks are stored locally in your browser using IndexedDB, ensuring:
- ✅ Fast access
- ✅ Works offline
- ✅ Privacy (data never leaves your device)
- ✅ Persistent across sessions

## Color Coding

### Priority Colors
- 🔴 **Urgent**: Red
- 🟠 **High**: Orange
- 🟡 **Medium**: Yellow
- 🟢 **Low**: Green

### Category Colors
- 🔵 **Mastery**: Blue
- 💗 **Pleasure**: Pink

---

**Pro Tip**: Start your day by reviewing the Tasks page, filtering for active tasks, and sorting by priority to focus on what matters most!
