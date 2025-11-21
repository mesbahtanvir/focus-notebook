# Focus Notebook - Reorganization Recommendations

**Document**: Structure improvement suggestions based on industry standards  
**Date**: November 21, 2025  
**Status**: Recommendations for consideration (non-breaking)

---

## Overview

The Focus Notebook codebase is **well-organized and follows industry best practices**. This document presents optional reorganization suggestions to further improve maintainability, discoverability, and alignment with common monorepo patterns.

All recommendations are **non-breaking** and can be implemented incrementally.

---

## Current Strengths

1. ✅ **Clear monorepo structure** - Separate backend, frontend, functions, mobile
2. ✅ **Feature-driven organization** - 30 tools organized by domain
3. ✅ **Strong typing** - TypeScript throughout, dedicated `/src/types`
4. ✅ **State management clarity** - 32 well-named Zustand stores
5. ✅ **Resilience patterns** - Circuit breakers, offline queue, retry logic
6. ✅ **Excellent documentation** - CLAUDE.md, README, comprehensive guides
7. ✅ **CI/CD infrastructure** - GitHub Actions with linting, testing, security checks
8. ✅ **Testing coverage** - Jest, Playwright, comprehensive test suites

---

## Recommendation 1: API Routes Organization

### Current State
```
/src/app/api/
├── chat/route.ts
├── process-thought/route.ts
├── predict-investment/route.ts
├── stock-history/route.ts
├── stock-price/route.ts
└── spending/[action]/route.ts
```

### Recommended: Domain-organized API Routes
```
/src/app/api/
├── ai/                          # AI-related endpoints
│   ├── chat/route.ts
│   ├── process-thought/route.ts
│   └── [ai endpoints]
│
├── investments/                 # Investment endpoints
│   ├── predict/route.ts
│   ├── stock-history/route.ts
│   └── stock-price/route.ts
│
├── spending/                    # Spending endpoints
│   ├── [action]/route.ts
│   └── [other spending routes]
│
└── [other domain routes]
```

### Benefits
- Parallel structure with `/src/app/tools`
- Easier to locate API handlers
- Mirrors backend (Go) handler organization
- Scale better as more endpoints are added

### Implementation
- Create domain subdirectories
- Move and update route.ts files (no logic changes)
- Update import paths in components

---

## Recommendation 2: Services Organization

### Current State (Split across two locations)
```
/src/services/
├── TimeTrackingService.ts
├── entityService.ts
├── thoughtProcessingService.ts
└── import-export/

/src/lib/services/
├── [Service utilities]
```

### Recommended: Unified Services Layer
```
/src/services/
├── domain/                      # Domain business logic
│   ├── entity/
│   │   └── entityService.ts
│   ├── time-tracking/
│   │   └── TimeTrackingService.ts
│   ├── thought/
│   │   └── thoughtProcessingService.ts
│   ├── import-export/
│   │   └── [import-export services]
│   └── [other domains]
│
├── utilities/                   # Shared service utilities
│   ├── logger.ts
│   ├── cache.ts
│   └── [shared utilities]
│
└── index.ts                    # Barrel export for easy imports
```

### Benefits
- Single clear "services" location
- Reduces cognitive load
- Easier to understand service dependencies
- Scales better with growth

### Migration Path
1. Rename `/src/lib/services` to `/src/services/utilities`
2. Move domain services to `/src/services/domain/<domain>/`
3. Create barrel export in `/src/services/index.ts`
4. Update all imports (automated via find-replace)

---

## Recommendation 3: Component Co-location by Feature

### Current State (Central components directory)
```
/src/components/
├── ui/                          # Generic UI
├── billing/
├── dashboard/
├── spending/
├── investment/
├── trip/
└── [14 more domain directories]
```

### Recommended: Optional Feature-based Co-location
For larger features, consider:

```
/src/app/tools/spending/
├── page.tsx
├── layout.tsx
├── components/                  # Spending-specific components
│   ├── SpendingForm.tsx
│   ├── SpendingChart.tsx
│   └── [spending components]
├── hooks/                       # Spending-specific hooks
│   └── useSpendingValidation.ts
├── types/                       # Spending-specific types
│   └── index.ts
└── __tests__/

/src/components/
├── ui/                          # Shared UI primitives (global use)
├── shared/                      # Truly shared components (2+ tools)
│   ├── ModalsShared/
│   ├── FormsShared/
│   └── [cross-tool components]
└── [deprecated - move to shared or tools]
```

### Benefits
- Reduced indirection for feature-specific components
- Easier to see what's used in each tool
- Clearer dependencies
- Can delete features without orphaning components

### Migration Path
- Start with new features
- Gradually move large feature components (FocusSession.tsx, LandingPage.tsx)
- Keep shared components in `/src/components/shared`
- Optional: implement over time

---

## Recommendation 4: Hooks Organization

### Current State (Hooks in two places)
```
/src/store/                     # 32 domain hooks
├── useFocus.ts
├── useTasks.ts
├── [30 other domain hooks]

/src/hooks/                     # 9 UI/utility hooks
├── use-toast.ts
├── useImportExport.ts
├── [7 other utility hooks]
```

### Recommended: Clear Separation
```
/src/hooks/
├── domain/                      # Domain-specific hooks (previously in /store)
│   ├── useFocus.ts
│   ├── useTasks.ts
│   └── [30 other domain hooks]
│
├── ui/                          # UI/Form hooks
│   ├── use-toast.ts
│   ├── useConfirm.tsx
│   └── [UI hooks]
│
├── utils/                       # Utility hooks
│   ├── useConnectionHealth.ts
│   ├── useHaptics.ts
│   └── [utility hooks]
│
└── index.ts                    # Barrel exports by category
```

### Benefits
- Single location for all hooks
- Clear categorization
- Easier to find what you need
- Follows React best practices

### Alternative: Keep Current Structure
The current split isn't wrong:
- `/src/store/` for Zustand stores with data + subscriptions
- `/src/hooks/` for pure React hooks (UI, utilities)

**If keeping current structure**, consider adding clear documentation explaining the distinction.

---

## Recommendation 5: Type Organization

### Current State (Types scattered)
```
/src/types/
├── entityGraph.ts
├── import-export.ts
├── spending-tool.ts
└── [5 more type files]

/functions/src/types/
├── [Function types]

/backend-go/internal/models/
├── [Go model definitions]
```

### Recommended: Organized by Domain
```
/src/types/
├── ai/                          # AI-related types
│   ├── thought.ts
│   └── llm.ts
│
├── data/                        # Data types
│   ├── spending.ts
│   ├── investment.ts
│   ├── entityGraph.ts
│   └── [data types]
│
├── shared/                      # Truly shared types
│   ├── index.ts
│   ├── common.ts
│   └── [shared types]
│
├── api/                         # API request/response types
│   ├── request.ts
│   └── response.ts
│
└── index.ts                    # Main barrel export
```

### Benefits
- Parallel structure to services/components
- Easier to find types
- Clear ownership of types
- Facilitates code generation

### Migration Strategy
- Refactor over time as code is touched
- Use TypeScript path aliases to minimize import changes
- Consider `tsconfig.json` path mapping:
  ```json
  {
    "paths": {
      "@types/*": ["src/types/*"]
    }
  }
  ```

---

## Recommendation 6: Test Organization

### Current State (Tests separated from source)
```
/src/__tests__/
├── lib/
├── integration/
├── routes/
└── utils/

/src/components/
├── [No co-located tests]

/src/services/
├── [No co-located tests]
```

### Option A: Keep Current (Simple, Clear, Current Best Practice)
- Pros: Clear test directory, easier to organize test utilities
- Cons: Switch between files during development
- **Recommended**: Maintain current structure

### Option B: Consider Co-location for Complex Components
```
/src/components/
├── ui/
│   ├── Button.tsx
│   ├── Button.test.tsx
│   └── Button.stories.tsx
```

### Note
Current approach is **industry standard** for monorepos and works well. Only change if team preference shifts.

---

## Recommendation 7: Lib Directory Clarity

### Current State (Good, but could be clearer)
```
/src/lib/
├── firebase/                    # Firebase resilience patterns
├── analytics/
├── data/
├── entityGraph/
├── migrations/
├── server/
├── services/                    # <-- Utility services (confusing)
├── utils/
└── [individual files]
```

### Recommended: Document Purpose
Add `/src/lib/README.md`:

```markdown
# /src/lib - Shared Utilities & Infrastructure

## Directory Structure

- **firebase/** - Firebase resilience layer (circuit breaker, offline queue, etc.)
- **data/** - Data access patterns (gateway, subscribe)
- **entityGraph/** - Entity relationship utilities
- **analytics/** - Analytics utilities
- **services/** - Shared service utilities (not domain logic)
- **utils/** - General utility functions
- **migrations/** - Data migration scripts
- **server/** - Server-side utilities

## Key Patterns

### Circuit Breaker
```ts
import { getCircuitBreaker } from '@/lib/firebase/circuit-breaker';
```

### Offline Queue
```ts
import { offlineQueue } from '@/lib/firebase/offline-queue';
```

## When to Use

- **Services in `/src/services`** - Domain business logic
- **Utilities in `/src/lib`** - Reusable infrastructure and patterns
```

### Benefits
- Clarifies purpose of each directory
- Guides developers on what goes where
- Reduces confusion about services vs utilities

---

## Recommendation 8: Store Architecture Documentation

### Add `/src/store/README.md`:
```markdown
# State Management with Zustand

32 domain-specific stores managing application state.

## Store Pattern

Each store follows this pattern:

```typescript
interface StoreState {
  items: Item[];
  isLoading: boolean;
  fromCache: boolean;
  syncError: Error | null;
  isSubscribed: boolean;
  
  // Actions
  add: (item: Item) => Promise<void>;
  update: (id: string, changes: Partial<Item>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  subscribe: () => () => void;
}
```

## Stores by Category

### Core Stores
- `useSettings.ts` - User settings
- `useAnonymousSession.ts` - Anonymous session

### Domain Stores (30+)
- Task: `useTasks.ts`
- Focus: `useFocus.ts`
- Financial: `useSpending.ts`, `useInvestments.ts`
- ...and 27 more
```

### Benefits
- Helps new developers understand patterns
- Documents 32 stores in one place
- Reduces onboarding time

---

## Recommendation 9: Simplify Root Configuration

### Current Root (Good, but becoming crowded)
```
focus-notebook/
├── .eslintrc.json
├── jest.config.js
├── jest.setup.ts
├── next.config.mjs
├── tsconfig.json
├── postcss.config.js
├── tailwind.config.ts
├── playwright.config.ts
├── components.json
├── capacitor.config.ts
├── cors.json
├── [+15 markdown docs]
├── [+7 time tracking docs]
├── [+5 more files]
├── package.json
├── package-lock.json
└── [More files...]
```

### Recommended: Config Directory
```
focus-notebook/
├── config/                      # All configs in one place
│   ├── eslint.config.js
│   ├── jest.config.js
│   ├── jest.setup.ts
│   ├── next.config.mjs
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   ├── playwright.config.ts
│   ├── components.json
│   ├── capacitor.config.ts
│   └── cors.json
│
├── docs/                        # All docs in one place
│   ├── guides/
│   ├── reference/
│   └── [docs structure]
│
├── [Essential files only]
├── package.json
├── package-lock.json
├── README.md
├── LICENSE
└── [Minimal root]
```

### Alternative: Keep Current (Also Valid)
- Current structure follows "files at root" convention
- Some teams prefer this for visibility
- Works fine if not too crowded

### Benefits (if reorganized)
- Cleaner root directory
- Easier to onboard developers
- Clear separation of configuration concerns

---

## Recommendation 10: Documentation Organization

### Current (Comprehensive, scattered)
```
Root level:
├── CLAUDE.md                    # AI dev guide
├── README.md
├── GPT.md
├── TIME_TRACKING_*.md           # 5 time tracking docs
├── VISA_SETUP.md
├── [20+ markdown files]

/docs directory:
├── README.md
├── guides/
├── reference/
```

### Recommended: Consolidate
```
/docs/
├── README.md                    # Documentation index
├── guides/
│   ├── setup.md
│   ├── development.md
│   ├── testing.md
│   ├── contributing.md
│   └── [guides]
│
├── reference/
│   ├── architecture.md
│   ├── features.md
│   ├── functions.md
│   └── [references]
│
├── ai/                          # AI-specific docs
│   ├── claude.md               # From CLAUDE.md
│   ├── gpt.md                  # From GPT.md
│   └── [AI docs]
│
├── tools/                       # Tool-specific docs
│   ├── visa-setup.md           # From VISA_SETUP.md
│   ├── time-tracking.md        # From TIME_TRACKING_*.md
│   └── [tool docs]
│
└── [Better organization]
```

### Benefits
- Single documentation root
- Clear organization
- Easier to navigate
- Reduced root clutter

### Note: Keep README.md at Root
- Standard convention
- First place developers look

---

## Implementation Priority

### High Priority (Quick wins, high value)
1. **Recommendation 1**: API routes organization (2-3 hours)
   - Clear structure, aligns with Go backend
   - Good first refactor

2. **Documentation** (4-5 files):
   - Add `/src/store/README.md`
   - Add `/src/lib/README.md`
   - Add `/src/hooks/README.md`
   - Helps immediately without code changes

3. **Organize documentation** (2-3 hours):
   - Move docs to `/docs`
   - Create index

### Medium Priority (Good to have)
4. **Recommendation 2**: Services organization (4-5 hours)
   - Consolidates scattered business logic
   - Impacts many files, needs careful refactoring

5. **Recommendation 5**: Type organization (3-4 hours)
   - Adds clarity as codebase grows
   - Can be done incrementally

### Low Priority (Nice to have)
6. **Recommendation 3**: Component co-location
   - Applies to new features primarily
   - Can implement gradually

7. **Recommendation 7-9**: Configuration/cleanup
   - Cosmetic improvements
   - Not urgent

---

## Implementation Strategy

### Phase 1: Documentation (No Code Changes)
- [ ] Add `/src/store/README.md`
- [ ] Add `/src/lib/README.md`
- [ ] Add `/src/hooks/README.md`
- [ ] Add `/src/services/README.md`
- [ ] Add `CONTRIBUTING.md` guidelines

**Time**: 2-3 hours  
**Risk**: None (documentation only)  
**Benefit**: Immediate improvement to onboarding

### Phase 2: Quick Wins (Isolated Changes)
- [ ] Reorganize API routes (Recommendation 1)
- [ ] Add `/docs/` subdirectories for tools, ai, guides
- [ ] Update `.github/workflows` documentation

**Time**: 4-5 hours  
**Risk**: Low (isolated to specific directories)  
**Benefit**: Clearer code structure

### Phase 3: Services Consolidation (Bigger Refactor)
- [ ] Create `/src/services/domain/` subdirectories
- [ ] Move domain services
- [ ] Update imports across codebase
- [ ] Update tests

**Time**: 8-10 hours (in phases)  
**Risk**: Medium (many import changes)  
**Benefit**: Single clear services layer

### Phase 4: Types Organization (Optional)
- [ ] Organize types by domain
- [ ] Set up TypeScript path aliases
- [ ] Update imports gradually

**Time**: 6-8 hours (over time)  
**Risk**: Low if using aliases  
**Benefit**: Parallel to services structure

---

## Testing Strategy for Refactoring

### Before Starting Any Refactor
```bash
npm run test        # Ensure all tests pass
npm run build       # Ensure build works
npx tsc --noEmit   # Check types
npm run lint        # Check linting
```

### After Each Small Change
```bash
npm test -- --onlyChanged        # Test changed files
npx tsc --noEmit                # Type check
```

### Before Committing
```bash
npm run lint
npm test
npm run build
```

---

## Configuration for Future Growth

### Add `workspace.json` (Optional)
```json
{
  "projects": {
    "web": {
      "path": "src",
      "type": "next-app",
      "description": "Main web application"
    },
    "functions": {
      "path": "functions",
      "type": "node-functions",
      "description": "Firebase Cloud Functions"
    },
    "backend": {
      "path": "backend-go",
      "type": "go-service",
      "description": "Go backend service"
    },
    "mobile": {
      "path": "mobile",
      "type": "react-native",
      "description": "iOS Capacitor app"
    }
  }
}
```

### Benefits
- Clarifies workspace structure
- Useful for tools (Nx, Turbo, etc.)
- Documents project organization
- Helps with monorepo management

---

## Checklist for Implementation

- [ ] Review recommendations with team
- [ ] Prioritize based on team preferences
- [ ] Assign owner for each phase
- [ ] Create tracking issues/PRs
- [ ] Document decisions in wiki/docs
- [ ] Update CLAUDE.md with any changes
- [ ] Update this document as you implement

---

## Key Principles for Reorganization

1. **Don't break functionality** - All refactoring should preserve behavior
2. **Automate migrations** - Use find-replace and IDE refactoring tools
3. **Document decisions** - Explain why structure changed
4. **Provide examples** - Show patterns in README files
5. **Do it gradually** - Don't try to reorganize everything at once
6. **Test thoroughly** - Run full test suite after each batch of changes
7. **Consider git history** - Big refactors show in blame; use appropriate commit messages

---

## Questions Before Starting

1. **Team preference**: Does team prefer centralized (current) or co-located component structure?
2. **API organization**: Is domain-based API routing important for your backend developers?
3. **Documentation**: Is improving onboarding documentation a priority?
4. **Growth plans**: Are there specific pain points that refactoring would solve?
5. **Timeline**: Is refactoring a priority vs. feature development?

---

## Conclusion

Focus Notebook's codebase is **already well-organized**. These recommendations are suggestions for **incremental improvement** based on industry patterns, not critiques of current structure.

**Start with**: Documentation (high value, no risk)  
**Then consider**: API route organization (aligns with Go backend)  
**Optional**: Services consolidation (as codebase grows)

The current structure has many strengths and works well. Any reorganization should add clear value for your team.

