# Project Improvement Tracker

A private, single-user board for capturing improvement ideas across many projects —
open the app, find the project, type a sentence, done. Concept in
[project-improvements-spec.md](project-improvements-spec.md); visual direction in
[DESIGN.md](DESIGN.md); module design in [ARCHITECTURE.md](ARCHITECTURE.md).

Vite + React + TypeScript + CSS Modules, Firebase (Auth + Firestore), deployed to
GitHub Pages.

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

That runs against a **seeded in-memory store** — no Firebase, no accounts. Set
`VITE_FIREBASE_TARGET` in `.env` to change backend:

| value | backend |
|---|---|
| `memory` (default) | seeded in-memory store |
| `emulator` | local Firebase Emulator Suite (`npm run emulators`) |
| `live` | production Firestore + Auth |

## Scripts

| command | what |
|---|---|
| `npm run dev` / `build` / `preview` | Vite |
| `npm test` | unit + component tests (Vitest) |
| `npm run e2e` | Playwright smoke (capture path, ⌘K) |
| `npm run test:emulator` | `FirestoreStore` + rules integration tests against the Emulator Suite |
| `npm run gen:rules` | write `firestore.rules` from the template + `VITE_ALLOWED_UID` |
| `npm run deploy:rules` | generate, then `firebase deploy --only firestore:rules` |
| `npm run lint` / `typecheck` | ESLint / `tsc` |

## Going live

```bash
./scripts/go-live.sh
```

An interactive wizard: confirms the owner account UID, sets the GitHub Actions
secrets, deploys the Firestore rules, walks through the Firebase authorized-domain
and GitHub Pages settings, and pushes `main` to deploy. Idempotent — safe to re-run.

The account UID is kept out of this repo: `firestore.rules.template` carries a
placeholder, and the real `firestore.rules` is generated locally and git-ignored.
