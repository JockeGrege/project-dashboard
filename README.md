# Hypomone

**Improve, never stop.**

A private, single-user board for capturing improvement ideas across many projects —
open the app, find the project, type a sentence, done. Concept in
[project-improvements-spec.md](project-improvements-spec.md); visual direction in
[DESIGN.md](DESIGN.md); module design in [ARCHITECTURE.md](ARCHITECTURE.md).

The name is Greek — *hypomonē*, endurance under pressure. The mark is an anvil
under a raised hammer, sparks between them: something shaped and strengthened by
repeated blows. Palette is warm charcoal `#151617`, antique gold `#C59A55`, warm
ivory `#F2EEE6`; the wordmark is Cinzel, the UI keeps IBM Plex Sans / Mono. Logo
source is [`public/symbol.svg`](public/symbol.svg) and
[`src/ui/AnvilMark.tsx`](src/ui/AnvilMark.tsx) (the favicon falls back to the
anvil alone, which stays legible at tab size); `node scripts/gen-icons.mjs`
rebuilds the PNG app icons.

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
