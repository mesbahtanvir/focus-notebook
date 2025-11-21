# Codebase Restructuring Plan

**Date**: November 21, 2025
**Branch**: claude/organize-codebase-structure-01HpjS5zmcAHQN4dzmba9rQr
**Goal**: Migrate to industry-standard monorepo with apps/backend/packages structure

---

## Current Structure → New Structure

### Phase 1: Create New Directories

```
New directories to create:
- apps/
- apps/web/
- apps/functions/
- apps/mobile/
- backend/
- packages/
- packages/shared-types/
- config/
```

### Phase 2: Frontend Migration

```
FROM: /src/                    →  TO: /apps/web/src/
FROM: /public/                 →  TO: /apps/web/public/
FROM: /e2e/                    →  TO: /apps/web/e2e/

Configs to move to /apps/web/:
- next.config.mjs
- next-env.d.ts
- tailwind.config.ts
- postcss.config.js
- components.json
- tsconfig.json (create web-specific)
- package.json (extract web dependencies)
```

### Phase 3: Go Backend Migration

```
FROM: /backend-go/             →  TO: /backend/

Reorganize internally to:
/backend/
  ├── cmd/server/main.go
  ├── internal/
  │   ├── api/
  │   ├── domain/
  │   └── infrastructure/
  ├── pkg/
  ├── go.mod
  └── Makefile
```

### Phase 4: Functions Migration

```
FROM: /functions/              →  TO: /apps/functions/

Files to move:
- All /functions/src content
- functions/package.json
- functions/tsconfig.json
```

### Phase 5: Mobile Migration

```
FROM: /mobile/                 →  TO: /apps/mobile/

Files to move:
- All /mobile content
- capacitor.config.ts → apps/mobile/
```

### Phase 6: Shared Types

```
FROM: /shared/                 →  TO: /packages/shared-types/

Create new package structure:
/packages/shared-types/
  ├── src/
  │   ├── entities/
  │   ├── api/
  │   └── index.ts
  ├── package.json
  └── tsconfig.json
```

### Phase 7: Configuration

```
Shared configs to /config/:
- .eslintrc.json → config/eslint/
- jest.config.js → config/jest/
- playwright.config.ts → config/playwright/

Keep at root:
- .github/
- firebase.json
- firestore.rules
- firestore.indexes.json
- storage.rules
- cors.json
- .firebaserc
- .gitignore
- .nvmrc
```

### Phase 8: Documentation

```
Consolidate docs:
FROM: TIME_TRACKING_*.md (5 files)  →  TO: /docs/tools/time-tracking/
FROM: VISA_SETUP.md                →  TO: /docs/tools/visa-setup.md
FROM: GPT.md                       →  TO: /docs/ai/gpt.md
FROM: CLAUDE.md                    →  TO: Keep at root (primary dev guide)
FROM: README.md                    →  TO: Keep at root
```

---

## Execution Steps

### Step 1: Backup and Safety

```bash
# Current commit
git add -A
git commit -m "backup: before restructuring"

# Create backup branch
git branch backup-before-restructure
```

### Step 2: Create Directory Structure

```bash
mkdir -p apps/web
mkdir -p apps/functions
mkdir -p apps/mobile
mkdir -p backend
mkdir -p packages/shared-types/src
mkdir -p config/{eslint,jest,playwright,typescript}
mkdir -p docs/{ai,tools,guides,reference}
```

### Step 3: Move Frontend

```bash
# Move source code
git mv src apps/web/
git mv public apps/web/
git mv e2e apps/web/

# Move configs
git mv next.config.mjs apps/web/
git mv next-env.d.ts apps/web/
git mv tailwind.config.ts apps/web/
git mv postcss.config.js apps/web/
git mv components.json apps/web/
```

### Step 4: Move Backend

```bash
git mv backend-go backend
cd backend
# Reorganize internal structure (separate task)
```

### Step 5: Move Functions

```bash
git mv functions/* apps/functions/
rmdir functions
```

### Step 6: Move Mobile

```bash
git mv mobile apps/mobile/
git mv capacitor.config.ts apps/mobile/
```

### Step 7: Create Shared Types Package

```bash
# Move shared types
git mv shared packages/shared-types/src/

# Create package.json for shared-types
```

### Step 8: Move Configs

```bash
git mv .eslintrc.json config/eslint/
git mv jest.config.js config/jest/
git mv jest.setup.ts config/jest/
git mv playwright.config.ts config/playwright/
```

### Step 9: Reorganize Docs

```bash
# Time tracking docs
mkdir -p docs/tools/time-tracking
git mv TIME_TRACKING_*.md docs/tools/time-tracking/

# Other docs
git mv VISA_SETUP.md docs/tools/
git mv GPT.md docs/ai/

# Move analysis docs to docs/architecture
mkdir -p docs/architecture
git mv CODEBASE_*.md docs/architecture/
git mv REORGANIZATION_RECOMMENDATIONS.md docs/architecture/
git mv PROPOSED_MONOREPO_LAYOUT.md docs/architecture/
git mv MONOLITHIC_GO_LAYOUT.md docs/architecture/
```

### Step 10: Create Root Configuration Files

Create:
- `/package.json` (root workspace)
- `/pnpm-workspace.yaml` or update npm workspaces
- `/turbo.json` (optional, for Turborepo)
- `/tsconfig.base.json` (shared TypeScript config)

### Step 11: Update Import Paths

Update imports in:
- apps/web/src/**/*.ts(x)
- apps/functions/src/**/*.ts
- Any cross-package imports

### Step 12: Update GitHub Workflows

Update `.github/workflows/*.yml`:
- Update paths to apps/web
- Update build commands
- Update test paths

### Step 13: Create Package-Specific Configs

Create:
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/functions/package.json`
- `apps/functions/tsconfig.json`
- `apps/mobile/package.json`
- `packages/shared-types/package.json`
- `packages/shared-types/tsconfig.json`
- `backend/go.mod` (already exists, just verify)

---

## Updated File Structure (Final)

```
focus-notebook/
├── apps/
│   ├── web/                          # Next.js application
│   │   ├── src/
│   │   ├── public/
│   │   ├── e2e/
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── functions/                    # Firebase Functions
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/                       # Capacitor mobile
│       ├── ios/
│       ├── src/
│       ├── capacitor.config.ts
│       └── package.json
│
├── backend/                          # Go monolith
│   ├── cmd/server/
│   ├── internal/
│   ├── pkg/
│   ├── go.mod
│   ├── go.sum
│   ├── Makefile
│   └── README.md
│
├── packages/
│   └── shared-types/                 # Shared TypeScript types
│       ├── src/
│       ├── tsconfig.json
│       └── package.json
│
├── config/                           # Shared configuration
│   ├── eslint/
│   ├── jest/
│   ├── playwright/
│   └── typescript/
│
├── docs/                             # Documentation
│   ├── architecture/
│   ├── tools/
│   ├── ai/
│   ├── guides/
│   └── reference/
│
├── .github/                          # GitHub workflows
│
├── scripts/                          # Build scripts
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── cors.json
│
├── package.json                      # Root workspace
├── tsconfig.base.json               # Base TypeScript config
├── turbo.json                       # Turborepo config (optional)
│
├── CLAUDE.md                        # Primary dev guide
├── README.md                        # Project README
└── LICENSE
```

---

## Configuration Updates Required

### 1. Root package.json

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
    "dev": "npm run dev --workspace=apps/web",
    "dev:functions": "npm run dev --workspace=apps/functions",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  }
}
```

### 2. apps/web/package.json

Extract web-specific dependencies from root package.json

### 3. apps/web/tsconfig.json

```json
{
  "extends": "../../config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@focus-notebook/shared-types": ["../../packages/shared-types/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### 4. packages/shared-types/package.json

```json
{
  "name": "@focus-notebook/shared-types",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint ."
  }
}
```

### 5. GitHub Workflows Updates

Update paths in all workflow files:
- `.github/workflows/test.yml`
- `.github/workflows/build.yml`
- `.github/workflows/deploy.yml`

Change:
```yaml
FROM: npm run build
TO:   npm run build --workspace=apps/web
```

### 6. Firebase.json Updates

```json
{
  "functions": {
    "source": "apps/functions",
    ...
  },
  "hosting": {
    "public": "apps/web/out",
    ...
  }
}
```

---

## Testing Checklist

After migration:

- [ ] `npm install` works at root
- [ ] `npm run build --workspace=apps/web` works
- [ ] `npm run dev --workspace=apps/web` works
- [ ] `npm run test --workspace=apps/web` works
- [ ] `npm run build --workspace=apps/functions` works
- [ ] Go backend compiles: `cd backend && go build ./cmd/server`
- [ ] Firebase deploy works: `firebase deploy --only functions`
- [ ] TypeScript types resolve correctly
- [ ] Imports work across packages
- [ ] GitHub Actions pass

---

## Rollback Plan

If anything goes wrong:

```bash
# Abort and restore
git reset --hard backup-before-restructure
git clean -fd
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Broken imports | Systematic find/replace, TypeScript will catch |
| Config path issues | Test each app independently |
| GitHub Actions fail | Update workflows before pushing |
| Lost git history | Use `git mv` to preserve history |
| Build breaks | Test locally before committing |

---

## Timeline Estimate

- Directory creation: 5 minutes
- Moving files: 15 minutes
- Creating configs: 30 minutes
- Updating imports: 45 minutes
- Updating workflows: 20 minutes
- Testing: 30 minutes
- Documentation: 20 minutes

**Total: ~3 hours**

---

## Post-Migration Tasks

1. Update CLAUDE.md with new structure
2. Update README.md with new build instructions
3. Create individual README.md files for apps/web, backend, etc.
4. Update contributing guide
5. Create architecture diagram
6. Add migration notes to CHANGELOG

---

## Questions Before Starting

- [x] Backup created?
- [x] All tests passing currently?
- [x] Ready to commit 2-3 hours to this?
- [x] Team notified (if applicable)?

---

## Execution Log

Track progress here as we go:

- [ ] Step 1: Backup
- [ ] Step 2: Create directories
- [ ] Step 3: Move frontend
- [ ] Step 4: Move backend
- [ ] Step 5: Move functions
- [ ] Step 6: Move mobile
- [ ] Step 7: Create shared-types
- [ ] Step 8: Move configs
- [ ] Step 9: Reorganize docs
- [ ] Step 10: Root configs
- [ ] Step 11: Update imports
- [ ] Step 12: Update workflows
- [ ] Step 13: Package configs
- [ ] Step 14: Test everything
- [ ] Step 15: Commit and push

---

**Ready to begin!**
