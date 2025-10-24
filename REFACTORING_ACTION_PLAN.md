# Refactoring Action Plan
**Step-by-step implementation guide**

## 🎯 Overview

This document provides concrete, actionable steps to implement the refactorings proposed in `REFACTORING_PROPOSAL.md`. Each task is designed to be completed independently without breaking existing functionality.

---

## ✅ Week 1: Quick Wins & Foundation

### Day 1-2: Utility Consolidation

#### Task 1.1: Create Date Utilities Module
**Time**: 1 hour | **Risk**: Low | **Impact**: High

```bash
# Create the file
touch src/lib/utils/date.ts
```

**Implementation checklist**:
- [ ] Create `src/lib/utils/date.ts`
- [ ] Move date functions from `TaskList.tsx` (isSameDay, isTodayISO)
- [ ] Move date functions from `useTasks.ts` (isWorkday, getDateString)
- [ ] Add JSDoc comments to all functions
- [ ] Update imports in affected files
- [ ] Run tests to verify nothing broke

**Files to modify**:
- `src/components/TaskList.tsx`
- `src/store/useTasks.ts`
- Any other files using these functions

---

#### Task 1.2: Create Constants Files
**Time**: 1 hour | **Risk**: Low | **Impact**: Medium

```bash
# Create directories and files
mkdir -p src/lib/constants
touch src/lib/constants/durations.ts
touch src/lib/constants/app.ts
```

**Implementation checklist**:
- [ ] Create `src/lib/constants/durations.ts`
- [ ] Extract magic numbers from focus pages (25, 50, 5, etc.)
- [ ] Create `src/lib/constants/app.ts`
- [ ] Extract app-wide constants (limits, defaults)
- [ ] Update imports across codebase
- [ ] Verify all pages still work

**Files to scan for magic numbers**:
- `src/app/page.tsx` (duration links)
- `src/app/tools/focus/page.tsx`
- `src/components/FocusSession.tsx`

---

#### Task 1.3: Add Store Documentation
**Time**: 30 minutes | **Risk**: None | **Impact**: High

```bash
# Create README
touch src/store/README.md
```

**Implementation checklist**:
- [ ] Document store architecture pattern
- [ ] List all stores with brief descriptions
- [ ] Add usage examples
- [ ] Document subscription pattern
- [ ] Add troubleshooting section

---

### Day 3-4: Type System Consolidation

#### Task 1.4: Create Types Directory Structure
**Time**: 2 hours | **Risk**: Medium | **Impact**: Very High

```bash
# Create type directories
mkdir -p src/types/entities
touch src/types/entities/task.ts
touch src/types/entities/thought.ts
touch src/types/entities/project.ts
touch src/types/entities/goal.ts
touch src/types/entities/mood.ts
touch src/types/entities/focus.ts
touch src/types/common.ts
```

**Implementation checklist**:
- [ ] Create all entity type files
- [ ] Extract Task types from `useTasks.ts` to `types/entities/task.ts`
- [ ] Extract Thought types from `useThoughts.ts` to `types/entities/thought.ts`
- [ ] Extract other entity types similarly
- [ ] Create common types (Timestamps, Meta, etc.)
- [ ] Update `types/index.ts` to re-export everything
- [ ] Update all imports across codebase
- [ ] Run TypeScript compiler to check for errors
- [ ] Run all tests

**Critical**: Do this in a separate branch and test thoroughly!

---

#### Task 1.5: Add JSDoc to Gateway Functions
**Time**: 30 minutes | **Risk**: None | **Impact**: Medium

**Implementation checklist**:
- [ ] Add JSDoc to `createAt`
- [ ] Add JSDoc to `setAt`
- [ ] Add JSDoc to `updateAt`
- [ ] Add JSDoc to `deleteAt`
- [ ] Add usage examples
- [ ] Document error cases

---

### Day 5: Error Handling Foundation

#### Task 1.6: Create Error Handling System
**Time**: 2 hours | **Risk**: Low | **Impact**: High

```bash
# Create error utilities
mkdir -p src/lib/errors
touch src/lib/errors/index.ts
touch src/lib/errors/AppError.ts
touch src/lib/errors/types.ts
```

**Implementation checklist**:
- [ ] Create custom error classes
- [ ] Create error handler function
- [ ] Create error logger utility
- [ ] Add error boundary component (optional)
- [ ] Document error handling pattern

---

## ✅ Week 2: Component Architecture

### Day 6-7: Split Large Components

#### Task 2.1: Refactor FocusSession Component
**Time**: 3 hours | **Risk**: Medium | **Impact**: High

```bash
# Create component directory
mkdir -p src/components/features/focus/FocusSession
touch src/components/features/focus/FocusSession/index.tsx
touch src/components/features/focus/FocusSession/FocusTimer.tsx
touch src/components/features/focus/FocusSession/FocusTaskList.tsx
touch src/components/features/focus/FocusSession/FocusControls.tsx
touch src/components/features/focus/FocusSession/hooks.ts
```

**Implementation checklist**:
- [ ] Extract timer logic to `FocusTimer.tsx`
- [ ] Extract task display to `FocusTaskList.tsx`
- [ ] Extract controls to `FocusControls.tsx`
- [ ] Extract custom hooks to `hooks.ts`
- [ ] Keep orchestration in `index.tsx`
- [ ] Update imports in pages
- [ ] Test all focus session functionality
- [ ] Verify timer works correctly
- [ ] Verify pause/resume works

---

#### Task 2.2: Create Custom Hooks
**Time**: 2 hours | **Risk**: Low | **Impact**: Medium

```bash
# Create hooks directory
mkdir -p src/hooks
touch src/hooks/useFocusTimer.ts
touch src/hooks/useTaskSelection.ts
touch src/hooks/useAutoSave.ts
```

**Implementation checklist**:
- [ ] Extract timer logic to `useFocusTimer`
- [ ] Extract selection logic to `useTaskSelection`
- [ ] Extract auto-save logic to `useAutoSave`
- [ ] Add tests for hooks
- [ ] Update components to use hooks

---

### Day 8-9: Organize Components by Feature

#### Task 2.3: Reorganize Component Directory
**Time**: 3 hours | **Risk**: Medium | **Impact**: Medium

```bash
# Create feature directories
mkdir -p src/components/features/tasks
mkdir -p src/components/features/thoughts
mkdir -p src/components/features/focus
mkdir -p src/components/features/goals
mkdir -p src/components/features/projects
mkdir -p src/components/layout
mkdir -p src/components/shared
```

**Implementation checklist**:
- [ ] Move task components to `features/tasks/`
- [ ] Move thought components to `features/thoughts/`
- [ ] Move focus components to `features/focus/`
- [ ] Move layout components to `layout/`
- [ ] Move shared components to `shared/`
- [ ] Update all imports
- [ ] Verify all pages still work
- [ ] Update component documentation

---

### Day 10: Testing & Documentation

#### Task 2.4: Add Component Tests
**Time**: 3 hours | **Risk**: Low | **Impact**: Medium

**Implementation checklist**:
- [ ] Add tests for TaskList component
- [ ] Add tests for ThoughtDetailModal
- [ ] Add tests for FocusTimer
- [ ] Add tests for custom hooks
- [ ] Aim for >60% coverage on new code

---

## ✅ Week 3: Store Improvements

### Task 3.1: Add Error Handling to Stores
**Time**: 4 hours | **Risk**: Medium | **Impact**: High

**Implementation checklist**:
- [ ] Update `useTasks` with error handling
- [ ] Update `useThoughts` with error handling
- [ ] Update `useFocus` with error handling
- [ ] Add try-catch blocks around Firebase operations
- [ ] Use custom error classes
- [ ] Add user-friendly error messages
- [ ] Test error scenarios

---

### Task 3.2: Add Store Documentation
**Time**: 2 hours | **Risk**: None | **Impact**: Medium

**Implementation checklist**:
- [ ] Add JSDoc to all store actions
- [ ] Document state shape
- [ ] Add usage examples
- [ ] Document subscription patterns

---

## ✅ Week 4: Polish & Testing

### Task 4.1: Comprehensive Testing
**Time**: 8 hours | **Risk**: Low | **Impact**: High

**Implementation checklist**:
- [ ] Add integration tests for task management
- [ ] Add integration tests for focus sessions
- [ ] Add integration tests for thought processing
- [ ] Test error scenarios
- [ ] Test offline functionality
- [ ] Achieve >60% overall coverage

---

### Task 4.2: Documentation Update
**Time**: 2 hours | **Risk**: None | **Impact**: Medium

**Implementation checklist**:
- [ ] Update PROJECT_OVERVIEW.md with new structure
- [ ] Add architecture diagrams
- [ ] Document new patterns
- [ ] Update CONTRIBUTING.md

---

## 🔄 Continuous Tasks

These should be done as you go:

### Code Review Checklist
- [ ] All new code has JSDoc comments
- [ ] All new functions have tests
- [ ] No magic numbers (use constants)
- [ ] Error handling is consistent
- [ ] Types are properly defined
- [ ] No TypeScript `any` types
- [ ] No console.logs (use proper logging)

### Before Each PR
- [ ] Run `npm run lint`
- [ ] Run `npm run test`
- [ ] Run `npm run build`
- [ ] Check bundle size hasn't increased significantly
- [ ] Update relevant documentation
- [ ] Add migration notes if needed

---

## 🚨 Risk Mitigation

### High-Risk Tasks
Tasks marked as "Medium" or "High" risk should:
1. Be done in separate branches
2. Have comprehensive tests
3. Be reviewed by another developer
4. Have a rollback plan
5. Be deployed to staging first

### Rollback Plan
For each major refactoring:
1. Keep the old code in comments initially
2. Use feature flags if possible
3. Deploy incrementally (not all at once)
4. Monitor error logs closely
5. Have a quick revert commit ready

---

## 📊 Progress Tracking

### Week 1 Progress
- [ ] Task 1.1: Date Utilities
- [ ] Task 1.2: Constants Files
- [ ] Task 1.3: Store Documentation
- [ ] Task 1.4: Type System
- [ ] Task 1.5: Gateway JSDoc
- [ ] Task 1.6: Error Handling

### Week 2 Progress
- [ ] Task 2.1: FocusSession Refactor
- [ ] Task 2.2: Custom Hooks
- [ ] Task 2.3: Component Organization
- [ ] Task 2.4: Component Tests

### Week 3 Progress
- [ ] Task 3.1: Store Error Handling
- [ ] Task 3.2: Store Documentation

### Week 4 Progress
- [ ] Task 4.1: Comprehensive Testing
- [ ] Task 4.2: Documentation Update

---

## 💬 Communication

### Team Updates
- Daily standup: Share what refactoring you're working on
- Weekly summary: Report completed tasks and blockers
- Document decisions: Update this file with learnings

### When to Ask for Help
- Uncertain about architecture decision
- Breaking change affects multiple files
- Tests are failing and you don't know why
- Estimated time is significantly off

---

## 🎓 Learning Resources

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Testing
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

### React Patterns
- [React Patterns](https://reactpatterns.com/)
- [Kent C. Dodds Blog](https://kentcdodds.com/blog)

---

## ✨ Success Criteria

You'll know the refactoring is successful when:
- [ ] Any developer can understand a component in <15 minutes
- [ ] AI can accurately explain any file's purpose
- [ ] Adding a new feature takes <4 hours (vs 8+ hours currently)
- [ ] Bug fixes take <1 hour (vs 2-3 hours currently)
- [ ] Test coverage is >60%
- [ ] No TypeScript `any` types in new code
- [ ] All public APIs have JSDoc
- [ ] Build time hasn't increased >10%
- [ ] Bundle size hasn't increased >5%

---

**Next Steps**: Start with Task 1.1 (Date Utilities) - it's low risk and high impact!
