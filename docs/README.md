# Focus Notebook Documentation

Welcome to the Focus Notebook documentation! This guide will help you understand, set up, and contribute to the project.

## Quick Links

- [Main README](../README.md) - Project overview and quick start
- [Setup Guide](guides/setup.md) - Firebase configuration, environment variables, and deployment
- [Development Workflow](guides/development.md) - Local development, debugging, and best practices
- [Contributing Guide](guides/contributing.md) - How to contribute to the project

## Documentation Structure

### 📚 Guides

Step-by-step instructions for common tasks:

- **[Setup Guide](guides/setup.md)** - Firebase setup, environment variables, deployment, iPad build
- **[Development Guide](guides/development.md)** - Local workflow, CI strategy, troubleshooting
- **[Testing Guide](guides/testing.md)** - Jest, Playwright, emulator setup, running tests
- **[Contributing Guide](guides/contributing.md)** - How to contribute code, docs, and features

### 📖 Reference

Technical documentation and architecture:

- **[Architecture](reference/architecture.md)** - Project structure, offline queue, circuit breakers, resilience patterns
- **[Features Catalog](reference/features.md)** - Complete list of all tools and features
- **[Cloud Functions](reference/functions.md)** - Callable endpoints, Plaid, Stripe, AI services
- **[Spending API](reference/spending-api.md)** - Spending tool architecture and Plaid integration

### 🗄️ Archive

Historical documents and outdated references (kept for reference):

- [Codebase Audit (Nov 7, 2024)](archive/codebase-audit-2024-11-07.md)
- [PR Description Template](archive/PR_DESCRIPTION.md)
- [Storage Setup](archive/STORAGE_SETUP.md)
- [Cloud Function Permissions Fix](archive/fix-cloud-function-permissions.md)

## Getting Started

1. **New to the project?** Start with the [Main README](../README.md)
2. **Setting up locally?** Follow the [Setup Guide](guides/setup.md)
3. **Ready to develop?** Check the [Development Guide](guides/development.md)
4. **Want to contribute?** Read the [Contributing Guide](guides/contributing.md)

## Common Tasks

### Running the App Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Running Tests

```bash
npm test                    # Run Jest tests
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report
```

### Building for Production

```bash
npm run build
npm start
```

### Deploying to Firebase

```bash
firebase deploy            # Deploy everything
firebase deploy --only hosting
firebase deploy --only functions
```

## Need Help?

- Check the [Development Guide](guides/development.md) for common issues
- Look through existing [GitHub Issues](https://github.com/mesbahtanvir/focus-notebook/issues)
- Create a new issue if you can't find an answer

## Project Philosophy

Focus Notebook is a privacy-first productivity app designed to help manage anxiety, depression, and improve personal productivity through evidence-based CBT techniques. The project prioritizes:

- **Privacy First** - Your data stays yours
- **Evidence-Based** - Built on CBT principles from "Feeling Good" by Dr. David Burns
- **Offline Support** - Works without internet connection
- **Open Source** - Transparent and community-driven
