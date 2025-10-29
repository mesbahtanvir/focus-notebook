# Visual Guide: Hierarchical Model

## 🎯 Your English Proficiency Example - Complete Implementation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📋 GOAL: Improve English Proficiency                                       │
│  ├─ Status: active                                                          │
│  ├─ Priority: high                                                          │
│  └─ Progress: Auto-calculated from projects                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
       │
       ├─────────────────────────────────────────────────────────────────┐
       │                                                                 │
       ▼                                                                 ▼
┌──────────────────────────────────┐         ┌──────────────────────────────────┐
│ 📁 PROJECT 1                     │         │ 📁 PROJECT 2                     │
│ Increase English Vocabulary      │         │ Reduce English Accent            │
│ ├─ goalId: ✅                    │         │ ├─ goalId: ✅                    │
│ ├─ parentProjectId: ❌           │         │ ├─ parentProjectId: ❌           │
│ ├─ isLeaf: false (has children) │         │ ├─ isLeaf: false (has children) │
│ └─ level: 0                      │         │ └─ level: 0                      │
└──────────────────────────────────┘         └──────────────────────────────────┘
       │                                             │
       ├──────────────┬──────────────┐              │
       ▼              ▼              │              ▼
┌─────────────┐ ┌─────────────┐     │      ┌──────────────────────────┐
│ 📂 SUB 1.1  │ │ 📂 SUB 1.2  │     │      │ 📂 SUB 2.1               │
│ Read Lit.   │ │ Talk Native │     │      │ Accent Courses           │
│ ├─ parent:  │ │ ├─ parent:  │     │      │ ├─ parentProjectId: ✅   │
│ │  proj-1   │ │ │  proj-1   │     │      │ ├─ goalId: ❌            │
│ ├─ isLeaf:  │ │ ├─ isLeaf:  │     │      │ ├─ isLeaf: true          │
│ │  true     │ │ │  true     │     │      │ └─ level: 1              │
│ └─ level: 1 │ │ └─ level: 1 │     │      └──────────────────────────┘
└─────────────┘ └─────────────┘     │              │
       │              │              │              │
       │              │              │              │
       ▼              ▼              ▼              ▼
    ┌────┐        ┌────┐        ┌────┐         ┌────┐
    │TASK│        │TASK│        │TASK│         │TASK│
    │ 1  │        │ 4  │        │ X  │         │ 6  │
    └────┘        └────┘        └────┘         └────┘
    ┌────┐        ┌────┐                       ┌────┐
    │TASK│        │TASK│                       │TASK│
    │ 2  │        │ 5  │                       │ 7  │
    └────┘        └────┘                       └────┘
    ┌────┐                                     ┌────┐
    │TASK│                                     │TASK│
    │ 3  │                                     │ 8  │
    └────┘                                     └────┘

Task 6: "Research about Accent reduction/clarity classes" ⭐
```

## 🔍 Field-by-Field Breakdown

### Goal Level
```javascript
{
  id: "goal-001",
  title: "Improve English Proficiency",
  objective: "Achieve native-level fluency",
  status: "active",
  priority: "high",
  progress: 42  // Calculated from all linked projects
}
```

### Project Level (Top-level under Goal)
```javascript
{
  id: "proj-001",
  title: "Increase English Vocabulary",
  
  // Hierarchy Links
  goalId: "goal-001",           // ✅ Links UP to goal
  parentProjectId: undefined,    // ❌ No parent project
  
  // Structure Metadata  
  isLeaf: false,                // Has sub-projects, not tasks
  level: 0,                     // First level under goal
  
  // Project Details
  objective: "Learn 5000 new words",
  timeframe: "long-term",
  status: "active",
  category: "mastery",
  priority: "high",
  
  // Collections
  linkedTaskIds: [],            // Empty - not a leaf
  linkedThoughtIds: ["thought-123"]
}
```

### Sub-Project Level (Under Project)
```javascript
{
  id: "subproj-001",
  title: "Read English Literature",
  
  // Hierarchy Links
  goalId: undefined,             // ❌ Not directly under goal
  parentProjectId: "proj-001",   // ✅ Links UP to parent project
  
  // Structure Metadata
  isLeaf: true,                  // Has tasks, not sub-projects
  level: 1,                      // Nested one level
  
  // Project Details
  objective: "Read 50 classic novels",
  timeframe: "long-term",
  status: "active",
  category: "mastery",
  priority: "high",
  
  // Collections
  linkedTaskIds: ["task-001", "task-002", "task-003"],  // ✅ Has tasks
  linkedThoughtIds: []
}
```

### Task Level (Only under Leaf Projects)
```javascript
{
  id: "task-001",
  title: "Find 10 classic English novels",
  
  // Link to parent
  projectId: "subproj-001",     // ✅ Links to leaf project only
  
  // Task Details
  category: "mastery",
  priority: "high",
  status: "active",
  done: false,
  dueDate: "2025-11-01",
  estimatedMinutes: 60
}
```

## 🎨 Visual Hierarchy Indicators

### Project Card Display

```
┌─────────────────────────────────────────────────┐
│ 📁 Increase English Vocabulary          BRANCH │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                 │
│ 🎯 Improve English Proficiency                 │
│ ├─ Type: Top-level Project                     │
│ ├─ Contains: 2 sub-projects                    │
│ ├─ Total Tasks: 5 (across all sub-projects)    │
│ └─ Progress: ████████░░ 42%                    │
│                                                 │
│ 📂 Sub-Projects:                                │
│   • Read English Literature (3 tasks)          │
│   • Talk to more native speakers (2 tasks)     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 📂 Read English Literature               LEAF  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                 │
│ Improve English > Vocabulary > Read Literature │
│ ├─ Type: Sub-Project (Level 1)                 │
│ ├─ Parent: Increase English Vocabulary         │
│ ├─ Tasks: 3 total, 1 completed                 │
│ └─ Progress: ███░░░░░░░ 33%                    │
│                                                 │
│ ✅ Tasks:                                       │
│   ✓ Find 10 classic novels                     │
│   ○ Read 1 chapter daily                       │
│   ○ Maintain vocabulary journal                │
└─────────────────────────────────────────────────┘
```

### Breadcrumb Navigation

```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Home > 📋 Goals > 🎯 Improve English > 📁 Vocabulary >   │
│   📂 Read Literature > ✅ Find novels                        │
└─────────────────────────────────────────────────────────────┘
```

### Tree View (Collapsible)

```
📋 Goals
  ├─ 🎯 Improve English Proficiency                    [Expand ▼]
  │   ├─ 📁 Increase English Vocabulary                [Expand ▼]
  │   │   ├─ 📂 Read English Literature                     [3 tasks]
  │   │   └─ 📂 Talk to more native speakers                [2 tasks]
  │   └─ 📁 Reduce English Accent                      [Expand ▼]
  │       └─ 📂 Get into Accent courses                     [3 tasks]
  ├─ 🎯 Learn Spanish                                  [Collapsed ▶]
  └─ 🎯 Get Fit                                        [Collapsed ▶]
```

## 🔄 Data Flow

### Creating Items (Top-Down)

```
User Creates Goal
       ↓
    [Goal Form]
       ↓
   ┌─────────┐
   │ Goal DB │
   └─────────┘
       ↓
User Creates Project (under Goal)
       ↓
   [Project Form]
   ├─ Select: Under which goal?
   └─ Select: Branch or Leaf?
       ↓
   ┌─────────────┐
   │ Project DB  │
   │ goalId: ✓   │
   │ isLeaf: ✗   │
   └─────────────┘
       ↓
User Creates Sub-Project (under Project)
       ↓
   [Sub-Project Form]
   ├─ Select: Under which project?
   └─ Select: Branch or Leaf?
       ↓
   ┌─────────────────┐
   │ Project DB      │
   │ parentId: ✓     │
   │ isLeaf: ✓       │
   └─────────────────┘
       ↓
User Creates Task (under Leaf Project)
       ↓
   [Task Form]
   └─ Select: Under which project? (only shows leaf projects)
       ↓
   ┌─────────────┐
   │ Task DB     │
   │ projectId:✓ │
   └─────────────┘
```

### Progress Calculation (Bottom-Up)

```
   Tasks (Leaf Level)
   ├─ Task 1: ✓ Done
   ├─ Task 2: ✗ Pending
   └─ Task 3: ✗ Pending
       ↓
   Leaf Project: 33% (1/3 tasks done)
       ↓
   Parent Project: 42% (avg of all sub-projects)
       ↓
   Goal: 42% (avg of all top-level projects)
```

## 🎯 Query Patterns

### Get Everything Under a Goal

```typescript
const goal = getGoal(goalId);
const topProjects = getProjectsByGoal(goalId);

for (const project of topProjects) {
  const subProjects = getSubProjects(project.id);
  
  for (const subProject of subProjects) {
    if (isLeafProject(subProject.id)) {
      const tasks = getTasks().filter(t => t.projectId === subProject.id);
      console.log(`  Tasks: ${tasks.length}`);
    } else {
      const nestedSubProjects = getSubProjects(subProject.id);
      console.log(`  Sub-projects: ${nestedSubProjects.length}`);
    }
  }
}
```

### Get Breadcrumb Path from Task

```typescript
const task = getTask(taskId);
const leafProject = getProject(task.projectId);
const hierarchy = getProjectHierarchy(leafProject.id);

// hierarchy = [topProject, subProject, leafProject]

const topProject = hierarchy[0];
const goal = getGoal(topProject.goalId);

// Full path:
const breadcrumb = [
  goal.title,
  ...hierarchy.map(p => p.title),
  task.title
];

console.log(breadcrumb.join(' > '));
// "Improve English > Increase Vocabulary > Read Literature > Find novels"
```

## 📊 Progress Dashboard

```
┌────────────────────────────────────────────────────────────┐
│                  GOAL PROGRESS OVERVIEW                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎯 Improve English Proficiency                     42%    │
│  ████████████████░░░░░░░░░░░░░░░░                         │
│                                                            │
│  📁 Projects (2)                                           │
│  ├─ Increase English Vocabulary              ████░ 33%    │
│  │  ├─ Read English Literature (3 tasks)     ███░░ 33%    │
│  │  └─ Talk to native speakers (2 tasks)     ████░ 50%    │
│  │                                                         │
│  └─ Reduce English Accent                    ████░ 50%    │
│     └─ Accent courses (3 tasks)              ████░ 50%    │
│                                                            │
│  ✅ Total Tasks: 8                                         │
│  ✓  Completed: 4                                           │
│  ○  Pending: 4                                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 🎨 Color Coding

```
📋 Goal            → Purple/Violet   #8B5CF6
📁 Top Project     → Blue            #3B82F6
📂 Sub-Project     → Green           #10B981
✅ Task            → Gray            #6B7280

Completed          → Green check     ✓
In Progress        → Yellow circle   ●
Pending            → Gray circle     ○
On Hold            → Orange pause    ⏸
Cancelled          → Red cross       ✗
```

## 🎯 Summary

This visual guide shows how your hierarchical model is implemented:

- **4 Levels**: Goal → Project → Sub-Project → Task
- **Clear Relationships**: Each level links to its parent
- **Type Safety**: Leaf vs Branch projects enforced
- **Progress Tracking**: Rolls up from tasks to goal
- **Navigation**: Breadcrumbs and tree view support
- **Flexibility**: Unlimited nesting depth

Your exact example "Improve English Proficiency" is fully supported! 🎉
