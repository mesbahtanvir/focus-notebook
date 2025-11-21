# GPT.md - Focus Notebook Guide for GPT-based Assistants

> **Purpose**: Provide GPT-family models with the context, guardrails, and workflows needed to contribute safely to the Focus Notebook monorepo.

---

## 1. Product Snapshot

- **Focus Notebook** blends CBT-inspired journaling, accountability tools, and financial insights inside a Next.js 14 + Firebase stack.
- **Data sensitivity**: everything (thoughts, finances, health). Treat every mutation as irreversible—defensive coding and predictable rollouts are mandatory.
- **Deployment**: Vercel for the web app, Firebase for auth/storage/firestore, Cloud Functions sub-project under `/functions`.

---

## 2. Golden Rules

1. **Never write `undefined` into Firestore** – sanitize payloads before `setDoc/updateDoc`.
2. **Always respect auth context** – anonymous users can browse, but protected flows (photo sessions, billing, exports) must require `user && !user.isAnonymous`.
3. **Prefer progressive enhancement** – pages must render on slow devices, offline-first when feasible.
4. **Keep UI mobile friendly** – Photo gallery is 2×2 on phones, 3×3 (or 4×?) on desktop, supports infinite scroll.
5. **Surface meaningful errors** – No default alerts; use our toast presets or local modals.

---

## 3. Validation Checklist

Run from repo root unless stated otherwise.

```bash
npm install
npm run lint
npm test
npm run build
npx tsc
```

For Cloud Functions:

```bash
cd functions
npm install
npm test
npm run build
npx tsc
```

CI is not guaranteed to run—developers depend on you to execute the full suite locally. Mention any command you skip (and why) in your handoff.

---

## 4. Codebase Lightning Tour

| Path | Notes |
| --- | --- |
| `src/app` | Next.js App Router, 28+ tools under `/tools/*`, API routes under `/api`. |
| `src/components` | Shared UI primitives (`/ui`), tool-specific widgets, Enhanced Data Management. |
| `src/store` | Zustand stores; `usePhotoFeedback` powers gallery/sessions. |
| `src/hooks` | Custom hooks inc. `useInfiniteGallery` (with tests). |
| `src/lib` | Firebase helpers, analytics, `photoGallery.ts` with picker utilities. |
| `functions` | Firebase functions (Plaid, Stripe, AI processing, cleanup jobs). |

Use `rg` for search, keep edits scoped, and avoid touching unrelated dirty files.

---

## 5. Firebase & Storage Dos/Don'ts

- **Reads/Writes**: Use the thin wrappers in `src/lib/firebaseClient`. Never instantiate your own app.
- **Storage uploads**: Respect the 10 MB limit, auto-resize to 1024px longest side (see `resizeImageIfNeeded`).
- **Security rules**: assume locked-down defaults. Validate server errors instead of suppressing them.
- **Bulk deletes**: Firestore deletes must stay under quota; batch or sequential loops are fine but always `await`.

---

## 6. Photo Feedback Quick Facts

- Gallery files live under `users/{uid}/photo-library/*`. Each item stores `stats` (votes, sessions, timestamps).
- Sessions expire after 3 days and optionally surface on the public “Voting Market”.
- Voting requires swipes + keyboard arrows + optional comments; aggregate stats live on the results page.
- Any new Firestore document must include deterministic IDs (`Date.now()` + randomness) and ISO date strings.

---

## 7. UX Expectations

- **Gallery**: Card grid, inline upload tile, delete buttons, infinite scroll hook, progress toasts.
- **Voting session**: Hide sidebars, keep swiping full bleed, arrow keys mapped (← nope / → yes), gestures on touch.
- **Results page**: Comments feed, shareable link, positive reinforcement at completion (“All done” summary).
- **Settings → Data Management**: Import/export actions, destructive controls require confirmations and backup reminders.

---

## 8. Patterns & Anti-Patterns

| Do | Avoid |
| --- | --- |
| Extract helpers in `/lib` with matching Jest coverage. | Adding logic directly in components without tests. |
| Use `toastSuccess/Error/Warning` for feedback. | `alert()` or silent failures. |
| Create reusable hooks (`useInfiniteGallery`) for scroll/keyboard behavior. | Copy/paste event handlers across components. |
| Keep accessibility in mind (aria labels, keyboard toggles). | Click-only interactions. |

---

## 9. Test Strategy

- **Unit**: Add tests beside helpers (`src/__tests__/lib` / `hooks`). Use Jest + RTL where appropriate.
- **Integration**: For state stores, mock Firebase modules.
- **E2E**: Use Playwright specs under `/e2e` only when flows are stable.
- **CI**: Mention any skipped suites; prefer partial verification to none.

---

## 10. Assistant Workflow

1. **Understand context** – skim linked files, existing TODOs, and `CLAUDE.md`.
2. **Plan openly** – share steps when work > trivial.
3. **Work incrementally** – small commits, preserve user edits.
4. **Validate** – lint + tests + type check + build.
5. **Document** – note new configs, scripts, or workflows in README/CLAUDE/GPT guides.

Stuck? Describe constraints plus proposed workaround rather than guessing.

---

## 11. Common Gotchas

- Forgetting to unsubscribe inside `useEffect`. Always return a cleanup.
- Missing dependencies in hooks – follow exhaustive-deps unless there is a documented reason.
- Using `<img>` inside Next.js pages – prefer `next/image`.
- Upload payloads lacking deterministic order -> keep arrays sorted when presenting data.

---

## 12. Contact

No external services. Communicate via PR comments / task output. Keep instructions synchronized with this guide and `CLAUDE.md`.

