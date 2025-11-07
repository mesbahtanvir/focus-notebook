# Focus Notebook

A privacy-first productivity app designed to help manage anxiety, depression, and improve personal productivity through evidence-based CBT techniques.

**Inspired by**: *Feeling Good: The New Mood Therapy* by Dr. David Burns

---

## Features

- **Mental Health Tools**: Thoughts tracking, CBT exercises, mood tracking, AI-powered thought analysis
- **Task Management**: Smart task organization, focus sessions, recurring tasks
- **Focus & Deep Work**: Pomodoro timer, balanced task selection, session analytics
- **Privacy First**: Real-time sync with Firebase, offline support, your data stays yours

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/mesbahtanvir/personal-notebook.git
cd personal-notebook
npm install

# 2. Run development server
npm run dev

# 3. Open http://localhost:3000
```

**That's it!** The app works locally without any setup.

For cloud sync, see [Setup Guide](docs/SETUP.md).

---

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · Firebase · Zustand · Capacitor

---

## Documentation

- **[Setup Guide](docs/SETUP.md)** – Firebase, environment variables, deployment, iPad build steps
- **[Development Workflow](docs/DEVELOPMENT.md)** – Local workflow, CI strategy, troubleshooting
- **[Testing Reference](docs/TESTING.md)** – Jest suites, Safari fix coverage, Playwright + emulator setup
- **[Feature Catalog](docs/FEATURES.md)** – Tool-by-tool overview (tasks, focus, spending, investments, etc.)
- **[Architecture & Resilience](docs/ARCHITECTURE.md)** – Project structure, offline queue, circuit breakers
- **[Cloud Functions](docs/FUNCTIONS.md)** – Callable endpoints, Stripe, Plaid, and AI services
- **[Codebase Audit Snapshot](docs/CODEBASE_AUDIT.md)** – Active technical-debt findings and priorities

---

## Contributing

Contributions welcome! See [Development Guide](docs/DEVELOPMENT.md).

**Priority areas**: Testing, accessibility, mobile optimization, documentation

---

## License

MIT License - See [LICENSE](LICENSE)

---

**Remember**: This tool supports your mental health journey but doesn't replace professional help. If you're struggling, please reach out to a mental health professional.

*Built with ❤️ using AI assistance*
