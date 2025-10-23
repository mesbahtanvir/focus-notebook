# Hierarchy Model - Quick Reference

## 🎯 Your Example Implemented

### Goal Structure
```
📋 GOAL: Improve English Proficiency
│
├── 📁 PROJECT 1: Increase English Vocabulary
│   │   ├── 📂 SUB-PROJECT 1: Read English Literature
│   │   │   ├── ✅ Task: Find 10 classic novels
│   │   │   ├── ✅ Task: Read 1 chapter daily
│   │   │   └── ✅ Task: Maintain vocabulary journal
│   │   │
│   │   └── 📂 SUB-PROJECT 2: Talk to more native speakers
│   │       ├── ✅ Task: Join conversation club
│   │       └── ✅ Task: Schedule 3 sessions/week
│   │
│   └── 📁 PROJECT 2: Reduce English Accent
│       └── 📂 SUB-PROJECT 1: Get into Accent reduction/clarity courses
│           ├── ✅ Task: Research about Accent reduction/clarity classes ⭐
│           ├── ✅ Task: Compare 5 online courses
│           └── ✅ Task: Enroll in selected course
```

## 📊 Data Structure Overview

### Goals (Long-term)
```typescript
{
  id: "goal-001",
  title: "Improve English Proficiency",
  objective: "Achieve native-level fluency",
  status: "active",
  priority: "high"
}
```

### Projects (Under Goals)
```typescript
{
  id: "proj-001",
  title: "Increase English Vocabulary",
  goalId: "goal-001",                    // ✅ Links to goal
  parentProjectId: undefined,             // ✅ Top-level project
  isLeaf: false,                          // ✅ Has sub-projects
  level: 0,                               // ✅ First level under goal
  category: "mastery",
  status: "active"
}
```

### Sub-Projects (Under Projects)
```typescript
{
  id: "subproj-001",
  title: "Read English Literature",
  goalId: undefined,                      // ❌ Not directly under goal
  parentProjectId: "proj-001",            // ✅ Links to parent project
  isLeaf: true,                           // ✅ Has tasks
  level: 1,                               // ✅ Second level
  linkedTaskIds: ["task-001", "task-002"], // ✅ Task references
  category: "mastery",
  status: "active"
}
```

### Tasks (At Leaf Level)
```typescript
{
  id: "task-001",
  title: "Research about Accent reduction/clarity classes",
  projectId: "subproj-002",              // ✅ Links to leaf project
  category: "mastery",
  priority: "high",
  status: "pending"
}
```

## 🔑 Key Properties Explained

| Property | Purpose | When Set |
|----------|---------|----------|
| `goalId` | Links project to goal | Top-level projects only |
| `parentProjectId` | Links sub-project to parent | All sub-projects |
| `isLeaf` | Can have tasks? | `true` = tasks, `false` = sub-projects |
| `level` | Depth in tree | 0 = under goal, 1+ = nested |
| `linkedTaskIds` | Task references | Leaf projects only |

## ✅ Rules & Validations

### Rule 1: Exclusive Relationships
```
Project can have:
  - Either sub-projects (isLeaf = false)
  - OR tasks (isLeaf = true)
  - NOT both!
```

### Rule 2: Task Placement
```
Tasks ONLY on leaf projects:
  ✅ Leaf project → Can add tasks
  ❌ Branch project → Cannot add tasks
```

### Rule 3: Hierarchy Levels
```
Level 0: goalId set, no parentProjectId
Level 1+: parentProjectId set, no goalId
```

## 🛠️ Common Operations

### 1. Create Complete Hierarchy
```typescript
// Step 1: Create Goal
const goalId = await addGoal({
  title: "Improve English Proficiency",
  objective: "Achieve fluency",
  status: "active"
});

// Step 2: Create Project
const proj1Id = await addProject({
  title: "Increase English Vocabulary",
  goalId: goalId,          // Link to goal
  isLeaf: false,           // Will have sub-projects
  level: 0
});

// Step 3: Create Sub-Project
const subProj1Id = await addProject({
  title: "Read English Literature",
  parentProjectId: proj1Id, // Link to parent
  isLeaf: true,            // Will have tasks
  level: 1
});

// Step 4: Create Task
await addTask({
  title: "Find 10 classic novels",
  projectId: subProj1Id    // Link to leaf project
});
```

### 2. Query Operations
```typescript
// Get all top-level projects under a goal
const topProjects = getProjectsByGoal(goalId);

// Get sub-projects of a project
const subProjects = getSubProjects(projectId);

// Check if project can have tasks
const canHaveTasks = isLeafProject(projectId);

// Get breadcrumb path
const path = getProjectHierarchy(projectId);
// Returns: [Goal's Project, Parent, Current]
```

### 3. Navigation Example
```typescript
// Start from a task
const task = getTask(taskId);
const leafProject = getProject(task.projectId);

// Get full path to goal
const hierarchy = getProjectHierarchy(leafProject.id);
// Result: [Top Project, Sub-Project, Leaf Project]

// Get goal
const topProject = hierarchy[0];
const goal = getGoal(topProject.goalId);

// Full path now:
// Goal → Top Project → Sub-Project → Leaf Project → Task
```

## 📱 UI Display Patterns

### Breadcrumb Navigation
```
Home > Goals > Improve English > Increase Vocabulary > Read Literature > Task
```

### Tree View
```
📋 Improve English Proficiency
  📁 Increase English Vocabulary
    📂 Read English Literature (3 tasks)
    📂 Talk to native speakers (2 tasks)
  📁 Reduce English Accent
    📂 Accent courses (3 tasks)
```

### Project Card Indicators
```
┌─────────────────────────────────┐
│ 📂 Read English Literature      │
│ ├─ Level: 1                     │
│ ├─ Type: Leaf Project           │
│ ├─ Tasks: 3/3 completed         │
│ └─ Parent: Increase Vocabulary  │
└─────────────────────────────────┘
```

## 🎨 Visual Hierarchy

### Color/Icon Coding
- 📋 **Goal** - Purple/Violet (strategic)
- 📁 **Top Project** - Blue (tactical)  
- 📂 **Sub-Project** - Green (operational)
- ✅ **Task** - Gray (actionable)

### Indentation
```
Goal
  ↳ Project (0px indent)
    ↳ Sub-Project (20px indent)
      ↳ Sub-Sub-Project (40px indent)
        ↳ Tasks (60px indent)
```

## 🚀 Implementation Checklist

### Backend/Data
- [x] Updated Project interface with hierarchy fields
- [x] Added helper methods (getSubProjects, isLeafProject, etc.)
- [x] Migration safe for existing data
- [x] Build successful

### Frontend (To Do)
- [ ] Update project creation form (ask: sub-projects or tasks?)
- [ ] Show breadcrumb navigation
- [ ] Visual hierarchy in project list
- [ ] Disable task creation for non-leaf projects
- [ ] Project type converter (branch ↔ leaf)
- [ ] Tree view component
- [ ] Progress rollup (tasks → projects → goal)

### Validation
- [ ] Prevent tasks on non-leaf projects
- [ ] Prevent sub-projects on leaf projects
- [ ] Prevent circular references
- [ ] Ensure goalId XOR parentProjectId
- [ ] Auto-calculate level from hierarchy

## 💡 Pro Tips

1. **Start Simple**: Create goal → project → tasks first
2. **Add Depth Later**: Convert projects to have sub-projects when needed
3. **Limit Nesting**: Keep to 3-4 levels max for clarity
4. **Use Templates**: Save common project structures
5. **Auto Progress**: Calculate from tasks up to goal

## 🔄 Migration Path

### For Existing Projects
```typescript
// Auto-detect project type
project.isLeaf = project.linkedTaskIds.length > 0;
project.level = project.parentProjectId ? 1 : 0;
project.goalId = project.goalId || undefined;
```

All existing projects will:
- Default to `level: 0` (top-level)
- Set `isLeaf: true` if they have tasks
- Continue working without changes
