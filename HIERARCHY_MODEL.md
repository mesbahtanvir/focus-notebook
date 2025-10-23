# Hierarchical Data Model

## Overview

The application now supports a complete hierarchical structure for organizing your long-term aspirations into actionable tasks:

```
Goal (Long-term prospect)
  └── Project (Major initiative)
        └── Sub-Project (Component of project)
              └── Sub-Project (Further breakdown)
                    └── Tasks (Trackable actions)
```

## Data Model Structure

### 1. **Goals**
- **Purpose**: Long-term prospects or wishlist items
- **Example**: "Improve English Proficiency"
- **Properties**:
  - `title`: Goal name
  - `objective`: What you want to achieve
  - `actionPlan`: High-level steps
  - `status`: active | completed | paused | archived
  - `priority`: urgent | high | medium | low
  - `progress`: 0-100%

### 2. **Projects**
- **Purpose**: Major initiatives or components that contribute to a goal
- **Can contain**: Sub-projects OR tasks (not both)
- **Example**: 
  - "Increase English Vocabulary" (under "Improve English Proficiency")
  - "Reduce English Accent" (under "Improve English Proficiency")
  
- **Properties**:
  - `title`: Project name
  - `objective`: Specific outcome
  - `goalId`: Reference to parent goal (for top-level projects)
  - `parentProjectId`: Reference to parent project (for sub-projects)
  - `isLeaf`: Boolean indicating if this project has tasks (true) or sub-projects (false)
  - `level`: Depth in hierarchy (0 = under goal, 1 = first sub-project, etc.)
  - `linkedTaskIds`: Array of task IDs (only for leaf projects)
  - `status`: active | on-hold | completed | cancelled
  - `timeframe`: short-term | long-term
  - `category`: health | wealth | mastery | connection

### 3. **Sub-Projects**
- **Purpose**: Breakdown of a project into smaller components
- **Can contain**: More sub-projects OR tasks
- **Example**:
  - "Read English Literature" (under "Increase English Vocabulary")
  - "Talk to more native speakers" (under "Increase English Vocabulary")
  - "Get into Accent reduction/clarity courses" (under "Reduce English Accent")

- **Properties**: Same as Projects, but with `parentProjectId` set

### 4. **Tasks**
- **Purpose**: Trackable, actionable items
- **Can only exist**: At the leaf level of the hierarchy
- **Example**: "Research about Accent reduction/clarity classes"

- **Properties**:
  - `title`: Task description
  - `projectId`: Reference to parent project (leaf project only)
  - `status`: Completion state
  - `priority`: Urgency level
  - `category`: mastery | pleasure

## Example Hierarchy

```
📋 Goal: "Improve English Proficiency"
│
├── 📁 Project: "Increase English Vocabulary"
│   ├── 📂 Sub-Project: "Read English Literature"
│   │   ├── ✅ Task: "Find 10 classic English novels"
│   │   ├── ✅ Task: "Read 1 chapter daily"
│   │   └── ✅ Task: "Maintain vocabulary journal"
│   │
│   └── 📂 Sub-Project: "Talk to more native speakers"
│       ├── ✅ Task: "Join English conversation club"
│       ├── ✅ Task: "Schedule 3 conversation sessions/week"
│       └── ✅ Task: "Practice with language exchange partners"
│
└── 📁 Project: "Reduce English Accent"
    └── 📂 Sub-Project: "Get into Accent reduction/clarity courses"
        ├── ✅ Task: "Research about Accent reduction/clarity classes"
        ├── ✅ Task: "Compare 5 online courses"
        ├── ✅ Task: "Read reviews and testimonials"
        └── ✅ Task: "Enroll in selected course"
```

## Key Rules

### 1. **Leaf Projects**
- A project is considered a "leaf" if it has **tasks** attached
- Leaf projects **cannot** have sub-projects
- Only leaf projects can have `linkedTaskIds`
- Example: "Get into Accent reduction/clarity courses" is a leaf project with tasks

### 2. **Branch Projects**
- Projects that have **sub-projects** are "branch" projects
- Branch projects **cannot** have direct tasks
- Example: "Increase English Vocabulary" is a branch project with sub-projects

### 3. **Hierarchy Navigation**
- **Top-level**: Projects directly under goals (`goalId` set, no `parentProjectId`)
- **Sub-projects**: Projects under other projects (`parentProjectId` set)
- **Depth**: Unlimited nesting supported via `level` property

### 4. **Task Assignment**
- Tasks can **only** be created under leaf projects
- Tasks always reference their parent project via `projectId`
- Tasks inherit category and priority from their project

## Helper Functions

### In `useProjects` Store:

```typescript
// Get all sub-projects of a project
getSubProjects(projectId: string): Project[]

// Get only top-level projects (under goals)
getTopLevelProjects(): Project[]

// Get full hierarchy path from root to project
getProjectHierarchy(projectId: string): Project[]

// Check if a project can have tasks
isLeafProject(projectId: string): boolean

// Get projects by goal (only top-level)
getProjectsByGoal(goalId: string): Project[]
```

## Usage Examples

### Creating a Goal with Projects

```typescript
// 1. Create the goal
const goalId = await addGoal({
  title: "Improve English Proficiency",
  objective: "Achieve native-level English fluency",
  status: "active",
  priority: "high"
});

// 2. Create top-level project
const projectId = await addProject({
  title: "Increase English Vocabulary",
  goalId: goalId,
  objective: "Learn 5000 new words",
  timeframe: "long-term",
  status: "active",
  category: "mastery",
  isLeaf: false // Will have sub-projects
});

// 3. Create sub-project
const subProjectId = await addProject({
  title: "Read English Literature",
  parentProjectId: projectId,
  objective: "Read 50 classic novels",
  timeframe: "long-term",
  status: "active",
  category: "mastery",
  isLeaf: true, // Will have tasks
  level: 1
});

// 4. Add tasks to the leaf project
await addTask({
  title: "Find 10 classic English novels",
  projectId: subProjectId,
  category: "mastery",
  priority: "high"
});
```

### Checking Project Type

```typescript
// Check if project can have tasks
const canHaveTasks = isLeafProject(projectId);

// Get sub-projects
const subProjects = getSubProjects(projectId);
const hasSubProjects = subProjects.length > 0;

// Get breadcrumb path
const hierarchy = getProjectHierarchy(projectId);
// Returns: [Goal Project, Parent Project, Current Project]
```

## Migration Notes

### Existing Data
- Existing projects will work without changes
- `parentProjectId` defaults to `undefined` (top-level)
- `isLeaf` defaults to `true` if tasks exist, `false` if sub-projects exist
- `level` defaults to `0` for top-level projects

### Best Practices
1. Define your goal first
2. Break it into major projects
3. Further break down projects into manageable sub-projects
4. Only add tasks at the deepest (leaf) level
5. Keep hierarchy depth reasonable (3-4 levels max)

## UI Implications

### Display
- Show breadcrumb navigation: Goal → Project → Sub-Project
- Indent sub-projects visually
- Different icons for branch vs leaf projects
- Disable task creation for non-leaf projects

### Forms
- When creating a project, ask: "Will this have sub-projects or tasks?"
- Show appropriate fields based on project type
- Allow converting between types (with data migration)

## Benefits

1. **Clear Organization**: Natural hierarchy matches how we think
2. **Flexibility**: Unlimited nesting for complex goals
3. **Trackability**: Tasks at leaves are concrete and actionable
4. **Progress Tracking**: Roll up progress from tasks → projects → goals
5. **Better Planning**: See the big picture and details together
