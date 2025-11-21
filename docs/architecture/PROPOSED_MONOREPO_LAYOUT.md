# Proposed Monorepo Layout for Focus Notebook

**Goal**: Clear separation of concerns while maintaining shared code and types

---

## Recommended Structure

```
focus-notebook/                       # Root monorepo
│
├── apps/                             # All runnable applications
│   ├── web/                         # Next.js web application
│   │   ├── src/                     # Current /src content moves here
│   │   ├── public/                  # Static assets
│   │   ├── e2e/                     # E2E tests specific to web
│   │   ├── package.json             # Web dependencies
│   │   ├── next.config.mjs
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── mobile/                      # Capacitor iOS app
│   │   ├── ios/
│   │   ├── src/
│   │   ├── capacitor.config.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── functions/                   # Firebase Cloud Functions
│       ├── src/
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── services/                        # Backend services
│   └── api/                         # Go backend service
│       ├── cmd/                     # Main applications
│       │   └── server/
│       │       └── main.go
│       ├── internal/                # Private application code
│       │   ├── handlers/
│       │   ├── middleware/
│       │   ├── models/
│       │   ├── repository/
│       │   └── services/
│       ├── pkg/                     # Public libraries
│       ├── go.mod
│       ├── go.sum
│       ├── Makefile
│       └── README.md
│
├── packages/                        # Shared libraries/packages
│   ├── shared-types/                # TypeScript types shared across apps
│   │   ├── src/
│   │   │   ├── entities/           # Entity types
│   │   │   ├── api/                # API contracts
│   │   │   ├── enums/              # Shared enums
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui-components/               # Shared React components (optional)
│   │   ├── src/
│   │   │   └── components/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── firebase-utils/              # Shared Firebase utilities
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── config/                          # Shared configuration
│   ├── eslint/                      # ESLint configs
│   ├── typescript/                  # Shared tsconfig bases
│   └── tailwind/                    # Tailwind presets
│
├── docs/                            # Documentation
│   ├── architecture/
│   ├── guides/
│   ├── api/
│   └── README.md
│
├── scripts/                         # Build and deployment scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── dev.sh
│
├── .github/                         # GitHub workflows
├── firebase.json                    # Firebase config
├── firestore.rules                  # Firestore rules
├── storage.rules                    # Storage rules
├── package.json                     # Root workspace config
├── pnpm-workspace.yaml             # Workspace definition (if using pnpm)
├── turbo.json                       # Turbo config (if using Turborepo)
├── README.md
└── LICENSE
```

---

## Key Design Principles

### 1. **Clear Boundaries**
- `apps/` - Everything that runs independently
- `services/` - Backend services (Go, Python, etc.)
- `packages/` - Shared, reusable code

### 2. **Technology Grouping**
- **Frontend Apps**: `apps/web/`, `apps/mobile/`
- **Backend Services**: `services/api/` (Go)
- **Serverless**: `apps/functions/` (Firebase)

### 3. **Shared Code Strategy**
- `packages/shared-types/` - Single source of truth for types
- Import like: `import { Task } from '@focus-notebook/shared-types'`

---

## Why This Structure?

### ✅ Benefits Over Current Layout

1. **Independent Deployment**
   - Each app/service has its own package.json
   - Can deploy web without touching backend
   - Clear dependency boundaries

2. **Scalability**
   - Easy to add new apps (admin dashboard, public site)
   - Easy to add new services (Python ML service, etc.)
   - Room to grow without refactoring

3. **Developer Experience**
   - Clear where to find things
   - New devs understand structure immediately
   - Follows industry patterns (Nx, Turborepo, Vercel)

4. **Build Optimization**
   - Can cache builds per app/package
   - Parallel builds across apps
   - Only rebuild what changed

5. **Team Structure**
   - Frontend team works in `apps/web/`
   - Backend team works in `services/api/`
   - Clear ownership

---

## Migration from Current Structure

### Current → Proposed Mapping

```
Current                              →  Proposed
─────────────────────────────────────────────────────────────
/src/                                →  /apps/web/src/
/functions/                          →  /apps/functions/
/backend-go/                         →  /services/api/
/mobile/                             →  /apps/mobile/
/shared/                             →  /packages/shared-types/
/public/                             →  /apps/web/public/
/e2e/                                →  /apps/web/e2e/
/docs/                               →  /docs/ (stays)
[root configs]                       →  /config/ or /apps/web/
```

---

## Detailed Layout Breakdown

### A. Frontend (`apps/web/`)

```
apps/web/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (routes)/
│   │   ├── api/
│   │   │   ├── ai/                 # Grouped by domain
│   │   │   ├── investments/
│   │   │   └── spending/
│   │   └── tools/                  # 30 tool pages
│   │
│   ├── components/
│   │   ├── ui/                     # Shadcn/Radix primitives
│   │   └── shared/                 # Cross-tool components
│   │
│   ├── features/                   # Feature-based organization (optional)
│   │   ├── tasks/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   └── types/
│   │   ├── focus/
│   │   └── [other features]/
│   │
│   ├── lib/                        # Utilities & infrastructure
│   │   ├── firebase/               # Firebase resilience layer
│   │   ├── utils/
│   │   └── services/
│   │
│   ├── hooks/                      # Global hooks
│   ├── contexts/                   # React contexts
│   ├── styles/                     # Global styles
│   └── types/                      # Web-specific types
│
├── public/                          # Static assets
├── e2e/                            # Playwright tests
├── __tests__/                      # Jest tests
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

**Key Points**:
- Self-contained Next.js app
- All frontend code in one place
- Can be deployed independently
- Clear separation of concerns

---

### B. Go Backend (`services/api/`)

```
services/api/
├── cmd/
│   ├── server/                      # Main HTTP server
│   │   └── main.go
│   └── worker/                      # Background workers (if needed)
│       └── main.go
│
├── internal/                        # Private application code
│   ├── handlers/                    # HTTP handlers
│   │   ├── auth.go
│   │   ├── tasks.go
│   │   ├── investments.go
│   │   └── spending.go
│   │
│   ├── middleware/                  # HTTP middleware
│   │   ├── auth.go
│   │   ├── cors.go
│   │   └── logging.go
│   │
│   ├── models/                      # Data models
│   │   ├── task.go
│   │   ├── user.go
│   │   └── investment.go
│   │
│   ├── repository/                  # Data access layer
│   │   ├── firestore/
│   │   │   ├── tasks.go
│   │   │   └── users.go
│   │   └── interfaces.go
│   │
│   ├── services/                    # Business logic
│   │   ├── task_service.go
│   │   ├── auth_service.go
│   │   └── investment_service.go
│   │
│   └── config/                      # Configuration
│       └── config.go
│
├── pkg/                             # Public libraries (reusable)
│   ├── httperrors/
│   ├── validator/
│   └── logger/
│
├── api/                             # API specs (optional)
│   └── openapi.yaml
│
├── scripts/                         # Build/deployment scripts
├── deployments/                     # Deployment configs (Docker, K8s)
│   └── Dockerfile
│
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

**Key Points**:
- Standard Go project layout (golang-standards/project-layout)
- `internal/` for private code (can't be imported by other modules)
- `pkg/` for reusable libraries
- Clear separation: handlers → services → repository

---

### C. Firebase Functions (`apps/functions/`)

```
apps/functions/
├── src/
│   ├── index.ts                     # Function exports
│   ├── triggers/                    # Firebase triggers
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   └── storage.ts
│   │
│   ├── scheduled/                   # Scheduled functions
│   │   ├── portfolio-snapshots.ts
│   │   └── cleanup.ts
│   │
│   ├── api/                         # Callable functions
│   │   ├── process-thought.ts
│   │   ├── billing.ts
│   │   └── plaid.ts
│   │
│   ├── services/                    # Business logic
│   ├── utils/                       # Utilities
│   ├── prompts/                     # AI prompts
│   └── types/                       # Function-specific types
│
├── __tests__/                       # Jest tests
├── package.json
├── tsconfig.json
└── README.md
```

---

### D. Shared Types (`packages/shared-types/`)

```
packages/shared-types/
├── src/
│   ├── entities/                    # Domain entities
│   │   ├── task.ts
│   │   ├── goal.ts
│   │   ├── investment.ts
│   │   └── index.ts
│   │
│   ├── api/                         # API contracts
│   │   ├── requests/
│   │   │   ├── task-requests.ts
│   │   │   └── investment-requests.ts
│   │   ├── responses/
│   │   │   ├── task-responses.ts
│   │   │   └── investment-responses.ts
│   │   └── index.ts
│   │
│   ├── enums/                       # Shared enums
│   │   ├── task-status.ts
│   │   └── investment-type.ts
│   │
│   └── index.ts                     # Main barrel export
│
├── package.json                     # "@focus-notebook/shared-types"
├── tsconfig.json
└── README.md
```

**Usage**:
```typescript
// In apps/web/
import { Task, TaskStatus } from '@focus-notebook/shared-types';

// In apps/functions/
import { InvestmentRequest } from '@focus-notebook/shared-types/api';

// In services/api/ (Go)
// Generate Go types from TypeScript using tools like:
// - quicktype
// - typeshare
// - or manual definitions
```

---

## Workspace Configuration

### Option 1: npm/pnpm Workspaces

**`package.json`** (root):
```json
{
  "name": "focus-notebook",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

**`pnpm-workspace.yaml`** (if using pnpm):
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Option 2: Turborepo Configuration

**`turbo.json`**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Development Workflow

### Starting Development

```bash
# Install all dependencies
npm install

# Start all apps in dev mode
npm run dev

# Or start specific apps
npm run dev --filter=web
npm run dev --filter=functions

# Go backend
cd services/api
make dev
```

### Building

```bash
# Build all apps
npm run build

# Build specific app
npm run build --filter=web

# Build Go service
cd services/api
make build
```

### Testing

```bash
# Test all apps
npm test

# Test specific app
npm test --filter=web

# Go tests
cd services/api
make test
```

---

## Migration Strategy

### Phase 1: Preparation (Low Risk)
1. Create new directory structure (empty folders)
2. Create `packages/shared-types/` and move shared types
3. Update imports to use new package
4. Test that everything still works

### Phase 2: Move Frontend (Medium Risk)
1. Create `apps/web/`
2. Move `/src` → `/apps/web/src`
3. Move `/public` → `/apps/web/public`
4. Update all configs (next.config.mjs, tsconfig.json)
5. Test build and deployment

### Phase 3: Reorganize Backend (Low Risk)
1. Reorganize Go code within `backend-go/`
2. Follow standard Go layout
3. Move to `services/api/`
4. Update build scripts

### Phase 4: Functions & Mobile (Low Risk)
1. Move `/functions` → `/apps/functions`
2. Move `/mobile` → `/apps/mobile`
3. Update Firebase config
4. Test deployments

### Phase 5: Cleanup (Low Risk)
1. Remove old directories
2. Update documentation
3. Update CI/CD pipelines
4. Archive old branches

---

## CI/CD Adjustments

### GitHub Actions Changes

**Before**:
```yaml
- run: npm install
- run: npm run build
```

**After**:
```yaml
- run: npm install
- run: npm run build --filter=web
- run: npm run build --filter=functions
```

Or use Turborepo:
```yaml
- run: npm install
- run: turbo run build
```

---

## Comparison: Current vs Proposed

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Structure** | Flat monorepo | Nested workspaces |
| **Frontend** | `/src` | `/apps/web/src` |
| **Backend** | `/backend-go` | `/services/api` |
| **Functions** | `/functions` | `/apps/functions` |
| **Shared Code** | `/shared` (minimal) | `/packages/*` |
| **Scalability** | Moderate | High |
| **Clarity** | Good | Excellent |
| **Build Caching** | Limited | Optimized (Turbo) |
| **Team Structure** | Mixed | Clear boundaries |

---

## When to Make This Change

### ✅ Good Time to Migrate
- Planning a major feature
- Onboarding new team members
- Adding new services/apps
- Have good test coverage (you do!)

### ❌ Bad Time to Migrate
- In the middle of a release
- Critical bugs to fix
- Short on time
- Team capacity is low

---

## Alternative: Minimal Change Option

If full migration is too much, consider this **minimal improvement**:

```
focus-notebook/                      # Keep most structure
├── apps/
│   └── web/                        # Just wrap Next.js
│       └── [current /src content]
├── backend-go/                     # Keep as-is, just rename
├── functions/                      # Keep as-is
├── packages/
│   └── shared-types/               # Extract shared types only
└── [other current structure]
```

**Benefits**:
- Less disruption
- Gets you 70% of the value
- Can iterate later

---

## My Recommendation

**For Focus Notebook specifically:**

1. **Short term (next 1-2 weeks)**:
   - Extract shared types to `packages/shared-types/`
   - Reorganize Go backend within current location
   - Add README documentation

2. **Medium term (1-3 months)**:
   - Move to full `apps/` + `services/` + `packages/` structure
   - Implement Turborepo for build optimization
   - Update CI/CD

3. **Why this approach?**:
   - Incremental, lower risk
   - Each step adds value
   - Can stop at any point
   - Maintains velocity

---

## Questions?

Before implementing, consider:

1. **Team size**: How many developers? More people = more benefit from structure
2. **Deployment**: Do you deploy frontend/backend independently?
3. **Growth plans**: Adding more apps/services in next 6 months?
4. **Time availability**: How much time can you allocate?

**What's your preference?**
- Full migration to apps/services/packages?
- Minimal shared-types extraction?
- Keep current structure with documentation improvements?
