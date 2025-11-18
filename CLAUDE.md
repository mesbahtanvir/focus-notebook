# Local checks for Focus Notebook

Run these commands **before pushing** or opening a PR.

## Root (web app)

From the repository root:

```bash
npm install
npm run build
npm test
npx tsc
```

## Functions (Cloud Functions backend)

From the repository root:

```bash
cd functions
npm install
npm run build
npm test
npx tsc
```

