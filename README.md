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

## Validation & Deploy Checklist

To reproduce CI locally, run:

```bash
npm run validate
```

This validates lint, tests, and the production build. For a full pipeline (install → lint → test → build → optional deploy), use the helper script:

```bash
./scripts/validate-and-deploy.sh
# optionally specify a deploy command
DEPLOY_COMMAND="npx vercel --prod" ./scripts/validate-and-deploy.sh
```

The shell script uses `npm ci`, runs the validation steps, and executes the deploy command only if `DEPLOY_COMMAND` is provided.

**That's it!** The app works locally without any setup.

For cloud sync, see [Setup Guide](docs/guides/setup.md).

---

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · Firebase · Zustand · Capacitor

## Mobile Photo Upload Pipeline (React Native)

- **Upload manager + queue** (`mobile/upload/*`) keeps a persistent SQLite/AsyncStorage-backed backlog so users see local previews instantly while uploads retry with exponential backoff and resumable Firebase Storage transfers.
- **Compression & thumbnails** reduce every image to ≤1080px @ ~75% quality (`mobile/upload/imageProcessor.ts`), while a Cloud Function (`functions/src/photoThumbnails.ts`) mirrors originals to `/images/thumb/*` for fast lists.
- **Signed URLs + CDN**: storage rules now target `/images/(original|thumb)/{uid}` with owner-only reads while `getSignedImageUrl` returns decade-long read URLs that Cloud CDN can cache.
- **Cached rendering** (`mobile/components/CachedImage.tsx`) shows the on-device copy, then thumbnail, then the signed original, leveraging `react-native-fast-image` for disk caching and great offline scrolling.
- **Offline-first flow**: select → compress → enqueue → display local URI → upload in background → queue resumes on next app launch; completion hook writes Firestore records with signed URLs plus thumbnail references.
- **Reference screen**: `mobile/screens/PhotoUploaderScreen.tsx` demonstrates wiring the upload manager, queue indicators, and cached gallery rendering in React Native (using `react-native-image-picker` for sourcing photos).

---

## Documentation

📚 **[Complete Documentation](docs/README.md)** - Full documentation index

### Quick Links

- **[Setup Guide](docs/guides/setup.md)** – Firebase, environment variables, deployment, iPad build steps
- **[Development Guide](docs/guides/development.md)** – Local workflow, CI strategy, troubleshooting
- **[Testing Guide](docs/guides/testing.md)** – Jest suites, Playwright, emulator setup
- **[Contributing Guide](docs/guides/contributing.md)** – How to contribute to the project

### Reference Documentation

- **[Architecture](docs/reference/architecture.md)** – Project structure, offline queue, circuit breakers
- **[Features](docs/reference/features.md)** – Complete tool-by-tool overview
- **[Cloud Functions](docs/reference/functions.md)** – Callable endpoints, Stripe, Plaid, AI services
- **[Spending API](docs/reference/spending-api.md)** – Spending tool architecture

---

## Contributing

Contributions welcome! See [Contributing Guide](docs/guides/contributing.md).

**Priority areas**: Testing, accessibility, mobile optimization, documentation

---

## License

MIT License - See [LICENSE](LICENSE)

---

**Remember**: This tool supports your mental health journey but doesn't replace professional help. If you're struggling, please reach out to a mental health professional.

*Built with ❤️ using AI assistance*
