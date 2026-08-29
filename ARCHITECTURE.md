# Architecture — Project Improvement Tracker

Companion to [project-improvements-spec.md](project-improvements-spec.md) and
[DESIGN.md](DESIGN.md). For sign-off before build.

Stack (decided): **Vite + React + TypeScript + CSS Modules**, **React Router**
(`HashRouter` — see §6), **Firebase** (Auth + Firestore) with the **Emulator Suite** for
dev and test, deployed to **GitHub Pages** via a GitHub Action, **Vitest + Testing
Library** for unit/component, **`@firebase/rules-unit-testing`** for rules, one
**Playwright** smoke test.

---

## 1. The shape in one sentence

Everything that talks to Firestore lives behind **one deep module — the `Store`** — and
everything above it is pure: views are derived from an in-memory snapshot by pure
selector functions. This is the spec's own "Read strategy" (hold the whole dataset in
memory, derive every view) expressed as a module boundary.

```
 routes/  ── read ──▶  useStore()  ─────────────┐
   │                                            │  reactive snapshot
   │  derive                                    ▼
   ▼                              ┌───────────────────────────┐
 selectors/  (pure, no React)     │         Store             │  ◀── the deep module
   │                              │  interface: ~14 functions │
   ▼                              ├───────────────────────────┤
 ui/  (presentational)            │ FirestoreStore  │ InMemory │  ◀── two adapters = real seam
                                  └────────┬────────┴──────────┘
                                           ▼
                                  firebase/  (init ordering, auth, emulator)
```

---

## 2. Modules

Each is **deep**: a large amount of behaviour behind a small interface, testable through
that interface.

### `domain/` — types and invariants

The vocabulary, in one place, imported everywhere.

- `Project`, `Issue`, `Category`, `Settings` types.
- `Tag = 'bug' | 'enhancement' | 'documentation' | 'question'` — closed union.
- `IssueStatus = 'open' | 'done' | 'dismissed'` — closed union, explicit string (the
  spec rejects null-timestamp-as-status because Firestore `== null` skips absent fields).
- `TAG_META` — label + light/dark hex for each tag. **Single source of truth** shared by
  the design layer (§DESIGN.md §4) and filter logic. Categories' colours are data, not
  code.
- **Zod schemas** for each Firestore document, applied on read. Defends against schema
  drift and half-written docs in a database that a public repo's rules are the only
  guard on.

**Interface:** just the exported types + `TAG_META` + `parseIssueDoc` / `parseProjectDoc`
etc. **Depth:** every "what shape is valid" question resolves here; callers never
hand-check fields.

### `firebase/` — the connection module

**Interface:**
```ts
getDb(): Firestore
getAuthClient(): Auth
onUser(cb: (uid: string | null) => void): Unsubscribe
signInWithGoogle(): Promise<void>
signOut(): Promise<void>
```

**Implementation (hidden):**
- `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager:
  persistentMultipleTabManager() }) })` — **run before any read or write**, or it
  silently doesn't apply (spec §Read strategy step 1).
- Emulator wiring (`connectFirestoreEmulator`, `connectAuthEmulator`) gated on
  `import.meta.env.DEV`.
- Google provider; after sign-in, assert `uid === VITE_ALLOWED_UID` and sign out + throw
  otherwise (defence in depth alongside the rules).
- Reads `VITE_FIREBASE_*` from env; `.env.example` documents the set.

**Invariant this module enforces by construction:** it is the *only* file that imports
`firebase/firestore`'s app-level init. Everything else receives `getDb()`. That is how
"cache config before first access" is guaranteed rather than hoped for.

**Deletion test:** delete it and every caller re-implements init ordering + emulator
gating + the UID pin. It earns its keep.

### `store/` — the live dataset (THE deep module)

**Interface** — small, domain-typed, no Firestore types leak across it (no `Query`,
`DocumentReference`, or `Timestamp` — timestamps cross as `number` epoch millis):

```ts
interface Store {
  // reactive read — one subscription, whole dataset, tombstones already filtered
  subscribe(listener: (snap: StoreSnapshot) => void): Unsubscribe
  getSnapshot(): StoreSnapshot            // { projects, issues, categories, settings, status }

  // issues
  createIssue(input: { projectId: string; text: string; tag: Tag | null }): Promise<string>
  updateIssueText(id: string, text: string): Promise<void>
  setIssueTag(id: string, tag: Tag | null): Promise<void>
  setIssueStatus(id: string, status: IssueStatus): Promise<void>   // owns resolved_at
  deleteIssue(id: string): Promise<void>                           // soft
  purgeDeletedIssues(): Promise<number>                            // the only hard delete

  // projects
  createProject(input: NewProject): Promise<string>
  updateProject(id: string, patch: ProjectPatch): Promise<void>
  deleteProject(id: string): Promise<void>                         // soft

  // categories
  createCategory(input: { name: string; colour: string }): Promise<string>
  updateCategory(id: string, patch: CategoryPatch): Promise<void>
  deleteCategory(id: string): Promise<void>       // reassigns its projects to Uncategorised
  reorderCategories(orderedIds: string[]): Promise<void>

  // settings (single doc)
  updateSettings(patch: Partial<Settings>): Promise<void>
}
```

`useStore()` is a thin React hook over `subscribe` / `getSnapshot` via
`useSyncExternalStore`.

**Implementation (large, hidden):**
- Two `onSnapshot` listeners — `projects`, and **all** `issues` (tombstones must sync so
  the cache learns of soft-deletes; `deleted_at != null` rows are filtered in memory).
  Categories and settings ride along on cheap doc listeners.
- With persistence on, a reconnecting listener resumes from a stored token and bills only
  changed docs (spec §Read strategy step 2). No `getDocs()` anywhere (step 4).
- `serverTimestamp()` on writes; `updated_at` maintained on every mutation.
- **`resolved_at` bookkeeping lives only in `setIssueStatus`:** `open → done|dismissed`
  stamps it, `→ open` clears it. One place, per the spec.
- Optimistic local application; Firestore's own offline queue covers no-signal capture.
- Converts `Timestamp` ⇄ `number` at this seam so nothing above imports Firestore.

**Seam:** `Store` has **two adapters** — `FirestoreStore` (production) and
`InMemoryStore` (tests, Storybook, offline demo). Two adapters means the seam is real,
not hypothetical. Tests swap the adapter at the provider and run the *real* component
code path — no Firestore mocking anywhere in component tests.

**Leverage:** no route ever writes a query, a batch, or a timestamp conversion.
**Locality:** every rule about status, `resolved_at`, tombstones, and cache ordering is
in this one module.

### `selectors/` — pure derivation

Plain functions. No React, no `Date.now()` inside (callers pass `now`), no I/O. One file
per concern, each with a co-located `*.test.ts`. This is where "derive every view from
memory" actually happens — pagination, sorting, grouping, search, the feed: all array
operations, zero reads.

```ts
sortProjects(projects, issuesByProject, mode, now): Project[]
  // 'last activity' = latest created_at/updated_at among that project's OPEN issues only;
  // done + dismissed are ignored so a fully-resolved project is not "active".

paginate<T>(items: T[], perPage: number, page: number): { slice: T[]; pageCount: number }

groupByCategory(projects, categories): CategoryGroup[]
  // ordered by Category.sort_order; Uncategorised group synthesised last.

recentOpenIssues(issues, projects, { limit: 100, includeResolved }): FeedRow[]
  // sorted by created_at (never updated_at — the feed answers "when did I write this");
  // resolved excluded unless includeResolved.

filterProjectIssues(issues, { tag, status }): Issue[]
  // tag: Tag | 'untagged' | 'all'  — 'untagged' matches tag === null and always appears
  // as an option so hurried captures stay reachable.

search(query, projects, issues): { projects: Project[]; issues: FeedRow[] }
  // substring match on project name AND issue text; an issue hit carries its project.

monogram(name: string): string        // 1–2 chars, derived, never stored
relativeTime(epochMs: number, now: number): string   // "2h", "3d", "1w"
```

**Depth:** each hides a rule the spec argues for at length (last-activity-ignores-
resolved; untagged-bucket-always-present; feed-sorts-by-created) behind a one-line call.
**Testability:** pure in, pure out — no setup, no mocks.

### `ui/` — presentational primitives

`Card`, `Bay` (the tabbed category panel), `StatusStamp`, `TagChip`, `CategoryEdge`,
`MonogramAvatar`, `Field`, `Button`, `Overlay`, `Pager`, `Toggle`, `SortMenu`. Each: a
small prop surface, a `*.module.css` file, tokens from `styles/tokens.css`, zero business
logic. No primitive imports `store/` or `selectors/`.

### `routes/` — thin composition

`Dashboard/`, `ProjectDetail/`, `NewProjectWizard/`, plus `QuickAdd` and `CommandSearch`
overlays mounted on the app shell. A route: call `useStore()`, run selectors with a
single `now` captured per render, render primitives, call `Store` mutations from
handlers. No route holds derived state that a selector could compute; the only local
state is genuinely view-local (current page number, which overlay is open, form drafts).

### `app/` — shell

`AppShell`, router config, `<StoreProvider>` (+ `<AuthGate>`), and the keyboard map
(`A` and `⌘K` → QuickAdd/CommandSearch). One place owns global shortcuts.

---

## 3. Folder layout

```
src/
  domain/          types.ts  tags.ts  schemas.ts  index.ts
  firebase/        init.ts  auth.ts  env.ts
  store/           store.ts (interface + types)
                   firestore-store.ts   in-memory-store.ts
                   provider.tsx  use-store.ts
  selectors/       sort-projects.ts  paginate.ts  group-by-category.ts
                   recent-open-issues.ts  filter-project-issues.ts  search.ts
                   monogram.ts  relative-time.ts   (+ *.test.ts each)
  uploads/         image-uploader.ts (interface)  worker-image-uploader.ts
                   fake-image-uploader.ts  attachment-list.ts (pure)
                   use-issue-attachments.ts  AttachmentStrip.tsx  provider.tsx
  ui/              <Primitive>.tsx  <Primitive>.module.css  (flat; one pair per primitive)
  routes/          Dashboard/  ProjectDetail/  NewProjectWizard/
                   overlays/QuickAdd.tsx  overlays/CommandSearch.tsx
  styles/          tokens.css  reset.css  fonts.css
  app/             AppShell.tsx  router.tsx  keyboard.ts
  test/            in-memory-fixtures.ts  emulator-setup.ts  render-with-store.tsx
worker/                     # Cloudflare Worker: image-upload proxy to imgbb (own package.json)
.env.example                # VITE_FIREBASE_*  +  VITE_ALLOWED_UID  +  VITE_IMAGE_UPLOAD_URL
scripts/setup-image-upload.sh  # wizard: imgbb key + Cloudflare Worker deploy + env wiring
firestore.rules.template    # UID-pinned rules with an __ALLOWED_UID__ placeholder (tracked)
firestore.rules            # generated by scripts/gen-firestore-rules.mjs; git-ignored
firestore.indexes.json
firebase.json               # emulator ports (Firestore + Auth); no hosting block — GH Pages
.env.example                # VITE_FIREBASE_*  +  VITE_ALLOWED_UID
scripts/gen-firestore-rules.mjs  # substitutes the UID from env/.env into firestore.rules
scripts/go-live.sh          # interactive wizard: secrets, rules deploy, Pages, first deploy
.github/workflows/deploy.yml # lint + unit + e2e, then publish dist/ to GitHub Pages on push to main
playwright/                  # capture-path + ⌘K smoke tests
```

**Why the rules are templated:** the account UID isn't a secret (it ships in the
client bundle), but it's a persistent personal identifier, so it's kept out of the
public repo. `firestore.rules.template` carries a placeholder;
`scripts/gen-firestore-rules.mjs` bakes in `VITE_ALLOWED_UID` (from the environment
or `.env`) to produce the git-ignored `firestore.rules`. `npm run gen:rules` runs
it; `npm run deploy:rules` generates then `firebase deploy --only firestore:rules`;
`pretest:emulator` and `npm run emulators` generate it first so the Emulator Suite
has a rules file. If the placeholder is left unsubstituted the rules deny everyone.

`vite.config.ts` sets `base: '/<repo-name>/'` so asset URLs resolve under the GitHub
Pages project path (or `base: '/'` for a custom domain / user-site repo).

---

## 4. Invariants (enforced, not just documented)

| Invariant | How it holds |
|---|---|
| Firestore cache config runs before first access | `firebase/init.ts` is the sole importer of app init; all access via `getDb()`. |
| Nothing above `store/` imports `firebase/firestore` | Lint rule (`no-restricted-imports`) on `routes/`, `selectors/`, `ui/`. |
| `resolved_at` changes in exactly one function | Only `setIssueStatus` writes it; reviewed + unit-tested. |
| Hard delete happens in exactly one function | Only `purgeDeletedIssues`; everything else sets `deleted_at`. |
| Selectors are pure | No `Date`/`Math.random`/I/O imports in `selectors/` (lint); `now` is a parameter. |
| Tag vocabulary is closed | `Tag` union + `TAG_META`; no string tags anywhere else. |
| Data belongs to one UID | `firestore.rules` pins every read/write to `VITE_ALLOWED_UID`; `firebase/auth.ts` re-checks on sign-in. |

---

## 5. Testing strategy — replace the adapter, don't mock

| Layer | How it's tested | Doubles |
|---|---|---|
| `selectors/` | Pure unit tests, table-driven | none |
| `ui/` primitives | Render + assert DOM/ARIA | none |
| `routes/` + overlays | Render inside `<StoreProvider adapter={InMemoryStore}>`, drive real handlers | adapter swap only |
| `store/` `FirestoreStore` | Integration against Emulator Suite: seed, assert snapshot output, assert `resolved_at` + tombstone behaviour | emulator |
| `firestore.rules` | `@firebase/rules-unit-testing` against emulator — wrong-UID denied, right-UID allowed | emulator |
| Capture path | One Playwright smoke against the emulator (spec warns e2e on real Firestore is the likeliest way to burn read quota) | emulator |

CI runs Vitest + the emulator suite; Playwright smoke gated to pre-deploy.

---

## 6. Hosting on GitHub Pages

GitHub Pages is static-only and 404s on a hard refresh of a deep client-side route. Two
standard fixes; this project takes the first:

- **`HashRouter`** (chosen) — URLs look like `…github.io/progress-board/#/project/abc123`.
  Zero deploy config, no refresh bugs, and for a single-user tool the URL cosmetics don't
  matter. Only `app/router.tsx` knows this.
- `404.html` redirect trick — clean URLs, but a moving part in the deploy. Kept as a
  documented fallback, not used.

Consequences, all acceptable here:

- The Firebase web config ships in the JS bundle. Those keys are not secrets; the
  **UID-pinned `firestore.rules` are the only data protection**, which is why they get
  their own emulator test suite.
- Deploy is a GitHub Action: `npm ci && npm run build`, publish `dist/` to Pages. Firebase
  config is injected at build time from repo **Actions secrets** (`VITE_FIREBASE_*`,
  `VITE_ALLOWED_UID`).
- The Pages domain must be added under Firebase → Authentication → Settings → Authorized
  domains, or Google sign-in is rejected there.
- Firebase Hosting stays a drop-in alternative (also free, native SPA rewrites) if the
  hash URLs ever grate — it would swap `HashRouter` back to `BrowserRouter` and add a
  `firebase.json` hosting block, nothing else.

---

## 7. Project coordinates (supplied)

| Thing | Value |
|---|---|
| Firebase project | `progress-board-d03d1` |
| Auth provider | Google (only) |
| Firestore database | created |
| Web config | `apiKey AIzaSyDiaeiBFM5RetsJpYXdJ_1jXKqfa_msg5o` · `authDomain progress-board-d03d1.firebaseapp.com` · `storageBucket progress-board-d03d1.firebasestorage.app` · `messagingSenderId 742672862359` · `appId 1:742672862359:web:05222ffb0783ad916cadd2` |
| GitHub repo | `github.com/JockeGrege/project-dashboard` |
| Pages URL | `https://jockegrege.github.io/project-dashboard/` |
| Vite `base` | `/project-dashboard/` |
| Firebase authorized domain to add | `jockegrege.github.io` (console → Authentication → Settings → Authorized domains) |

The web API key is public by design (it ships in the bundle); it still lives in `.env`
locally and in GitHub **Actions secrets** so the repo stays clean and the Action injects
it at build time. `.env` is git-ignored; `.env.example` carries placeholders.

### `VITE_ALLOWED_UID` and going live

`AuthGate` shows a banner with your UID (and a copy button) when `VITE_ALLOWED_UID`
is unset or `__REPLACE_ME__`, instead of enforcing the pin — so you can capture it
by signing into the app once against a live target. From then on `auth.ts` enforces
`uid === VITE_ALLOWED_UID` and the rules reject every other UID.

`scripts/go-live.sh` is the wizard for the rest: it confirms the owner UID, sets the
seven GitHub Actions secrets, runs `npm run deploy:rules`, walks you through adding
the Pages domain to Firebase authorized domains and setting the repo's Pages source
to "GitHub Actions", then pushes `main` to trigger the deploy. It is idempotent —
re-run it any time.

Local dev stays in `memory` mode (no quota, no setup); the live config is exercised
only by the deployed site.

### `VITE_IMAGE_UPLOAD_URL` and pasted images

The image-paste feature needs a Cloudflare Worker (`worker/`) that proxies uploads
to imgbb so the **imgbb API key** never ships in the bundle — it lives only as a
Worker secret (`wrangler secret put IMGBB_API_KEY`). `scripts/setup-image-upload.sh`
is the 6-stage wizard: get an imgbb API key, `wrangler login`, set the secret,
`wrangler deploy`, then write the deployed URL to `.env` as `VITE_IMAGE_UPLOAD_URL`
and to the matching GitHub Actions secret (added to `deploy.yml`). Unset ⇒ the app
uses `FakeImageUploader` (local preview only, nothing uploaded), which is the
`memory`-mode default. imgbb links are effectively public — don't paste secrets.

---

## 8. Build order (once approved)

1. ✅ Scaffold Vite + TS + Router + CSS Modules; `styles/tokens.css` + `fonts.css` from
   DESIGN.md; `domain/` types + `TAG_META` + Zod schemas.
2. ✅ `store/` interface + `InMemoryStore` + provider/hook + fixtures.
3. ✅ `selectors/` with full unit tests (pure, fast, no Firebase yet).
4. ✅ `ui/` primitives + the status-stamp signature.
5. 🚧 Screen 1 Dashboard — flat grid, category bays, recent feed, QuickAdd overlay,
   ✅ ⌘K `CommandSearch`, ✅ `A` / `⌘K` global shortcuts, `Filed to …` toast. Still to
   do: page-load motion, the flat↔category FLIP transition.
6. ✅ Screen 2 Project detail — inline composer, per-row menu (edit text, retag,
   complete, dismiss/reopen, delete), editable project meta, tag/status filters, the
   stamp rendering rules. ✅ Screen 3 wizard — the guided 4-step flow with progress
   pips and inline category creation (name + colour swatch).
7. ✅ `firebase/` (init with persistent multi-tab cache, Google auth + UID pin, emulator
   wiring) + `FirestoreStore` adapter + `firestore-mappers` (snake_case ⇄ camelCase,
   `Timestamp` ⇄ millis) + `AuthGate` + `firestore.rules` + `firebase.json` + `.firebaserc`.
   `VITE_FIREBASE_TARGET` picks `memory` / `emulator` / `live`. 10 integration tests
   against the Emulator Suite + 3 rules tests, run by `npm run test:emulator`.
   ✅ `.github/workflows/deploy.yml` runs lint + unit + e2e, then publishes `dist/` to
   GitHub Pages.
8. ✅ Settings screen — cards-per-page, default view, default sort, category management
   (rename / recolour / reorder by arrows / delete-to-Uncategorised / add), and
   `Deleted issues: N · Purge` with the one confirm dialog. `deletedIssueCount` added to
   the store snapshot for the purge line. ✅ Playwright capture-path + ⌘K smoke
   (`npm run e2e`). Still deferred to build 2: category-view drag-reorder + collapse
   persistence (DESIGN.md §9).

### Post-launch follow-ups (shipped)

- **PWA** — `vite-plugin-pwa` (`generateSW`, `autoUpdate`): manifest, generated
  icons in `public/`, offline app-shell precache, `navigateFallback` to
  `index.html` (hash routing). SW registered in `src/app/pwa.ts`, which also
  exposes `useInstallPrompt()` for the header "install" button.
- **Mobile** — a fixed floating "Add" button (a dedicated element at the shell
  root, because the header's `backdrop-filter` traps `position: fixed`
  descendants); "New project" is a ghost `ui/NewProjectTile` in the project grid
  (first cell in flat view, a compact dashed row above the bays in category view,
  and in the empty state) — it was hidden on mobile with no replacement;
  feed/detail readability pass
  (larger text, higher-contrast metadata, row menu pinned instead of wrapping,
  horizontally-scrolling filter chips).
- **Multi-line issue text** — new `ui/IssueTextArea` primitive: autogrowing
  `textarea` (min 5 rows in capture, 2 inline), caps at ~50vh then scrolls, an
  expand control opens a full-screen editor. Enter inserts a newline; submit is
  Cmd/Ctrl+Enter or the button. Used by QuickAdd, `IssueComposer`, and the
  `IssueListRow` edit mode. `IssueRow` renders `white-space: pre-wrap`, clamped
  to 3 lines in the feed/search.
- **Delete-issue confirm** — `RowMenu`'s Delete now calls up to `IssueListRow`,
  which shows the shared `ConfirmDialog` before the soft delete (matches the
  purge safety click).
- **⌘⏎ from anywhere in QuickAdd** — the shortcut was only bound to the
  `textarea`, so once a project was picked the result button unmounted and focus
  fell to `<body>`, outside the panel. QuickAdd now listens for ⌘⏎ on `document`
  (capture phase, like `Modal`'s Escape) with a `filingRef` guard so it fires
  exactly once wherever focus sits.
- **Hypomone brand** — the app took on the Hypomone identity: `ui/AnvilMark`
  (solid vector — anvil, three sparks, a raised hammer on a rotated `<g>`;
  `currentColor`) in the header and auth splash, `--font-wordmark` (Cinzel) for
  the wordmark only, retuned charcoal/gold/ivory token *values* (roles
  unchanged) in `styles/tokens.css`. `public/symbol.svg` is the logo master;
  `favicon.svg` uses the anvil alone (the full mark muddies below ~24px);
  `scripts/gen-icons.mjs` rasterises the PWA/Apple PNGs via Playwright's
  Chromium.
- **Project detail** — the `Project` schema gained `description`, `websiteUrl`,
  `links: {label,url}[]`, and Markdown `notes`, threaded through both Store
  adapters and `firestore-mappers` (`store/project-links.ts` holds the shared
  `normaliseText` / `sanitizeLinks` hygiene). The screen shows the description
  and clickable `ui/ExternalLink`s for repo/site under the name; a **More
  details** disclosure expands `ProjectDetailsPanel` with the full link list and
  `ui/Markdown` notes (`marked` + `dompurify`, pulled in a lazy chunk). `linkify`
  selector + `ui/LinkText` turn bare URLs in plain text into links. The new
  wizard and `ProjectMetaEditor` edit all of it (repeatable link rows).
- **Bulk delete** — with the project's status filter on `done` or `dismissed`, a
  discrete "Delete all done / dismissed (N)" button soft-deletes the whole
  filtered set at once (`Promise.all` of `deleteIssue`) behind a `ConfirmDialog`.
  They land in Deleted issues; Settings still purges. (There is no restore view,
  so the label stays "Delete", not "Archive".)
- **Settings `cards per page`** — edited via local text state committed on blur,
  so the field can be cleared to retype; a fully controlled number input snapped
  back to the last valid value on every keystroke and a lone digit could not be
  deleted on mobile.
- **Mobile floating Add** — lifted ~40px into the thumb arc (`--sp-6 + 8px`),
  with `main` bottom padding raised to match so nothing hides behind it.
- **Back button closes overlays** — on touch there is no Escape key, and the
  device Back button used to navigate the route while leaving the overlay up.
  `ui/back-close.ts`'s `useBackClose(onClose)` pushes a throwaway history entry
  when an overlay opens and closes the topmost one on `popstate`; closing any
  other way rewinds that entry. One shared listener + a stack handle nesting
  (Back closes the full-screen editor before its parent `QuickAdd`); the
  teardown rewind is deferred a tick so StrictMode's double-mount doesn't churn
  `history`. Wired into `Modal` (so `QuickAdd`, `CommandSearch`, `ConfirmDialog`,
  `Lightbox` all get it) and `IssueTextArea`'s full-screen editor.
- **`IssueTextArea` corner controls** — the `＋` / `⤢` buttons float over the
  field; the textarea now reserves right padding (`data-tools`) so a long line
  wraps before it, instead of running invisibly behind a button.
- **Mobile `Lightbox`** — the close and prev/next controls sat at negative
  offsets that fell off a phone screen; under `620px` they move inside the image
  bounds so an opened image can always be dismissed.
- **`IssueRow` content column** — on the project screen a row now reads as one
  left-aligned column under the text: text, then the thumbnail strip, then the
  tag chip + time (`trailing` was pulled out of the flex `.row` into the
  `.group` for the attachment case). Every part — thumbnails and the wrapped
  `trailing` on mobile — lines up with the text column
  (`row padding-left + stamp width + flex gap`) rather than the stamp gutter.
- **Issue image attachments** — paste a screenshot, drop image files, or pick
  them with the `＋` control in either composer (`IssueComposer` or `QuickAdd`)
  and they upload, preview, and file with the issue (`IssueTextArea`'s
  `onImageFiles` prop covers all three input paths).
  A second deep module, the **`ImageUploader`** seam (`src/uploads/`),
  mirrors the Store: one `upload(blob) → url` method, two adapters —
  `WorkerImageUploader` (POSTs to the Cloudflare Worker in `worker/`, which holds
  the imgbb API key as a secret and returns only the URL) and
  `FakeImageUploader` (the offline `memory` demo and tests). It is injected via
  `ImageUploaderProvider` / `useImageUploader()` from the composition root; the
  `src/uploads/**` tree is under the same no-Firebase ESLint fence as
  routes/ui/selectors. `IssueTextArea` gained an `onImagePaste` prop; the pure
  attachment state machine (`attachment-list.ts`) plus a thin side-effecting hook
  (`use-issue-attachments.ts`, owns object-URL previews and one `AbortController`
  per upload) drive `AttachmentStrip`. The composer's Add is blocked while any
  upload is in flight **or** errored — a failed one must be retried or removed.
  `Issue` gained `attachments: string[]` (Zod `.url().max(8).default([])`),
  sanitised by `store/attachments.ts` (`http(s)` only) on both write paths and in
  `firestore-mappers`; the image bytes never touch Firestore. Filed issues show a
  thumbnail strip on the project screen (`ui/Lightbox` on click); the dashboard
  feed shows a plain "N images" marker instead, since its rows are links.
  `scripts/setup-image-upload.sh` is a 6-stage wizard for the one-time imgbb +
  Cloudflare setup. `VITE_IMAGE_UPLOAD_URL` (env / GitHub secret) selects the
  adapter; unset falls back to the fake. **imgbb links are effectively public.**
  *Known limitation:* deleting or purging an issue removes it from Firestore only
  — the imgbb image is left as an unlinked orphan. imgbb has no delete API (just
  a human `delete_url`), and for a private single-user board the orphan costs
  nothing; a real lifecycle would mean moving uploads to storage we control
  (e.g. Cloudflare R2).

Covered by **138 unit tests** + **13 emulator tests** (10 `FirestoreStore` integration,
3 rules) + **10 Playwright smoke tests**. `tsc`, `eslint` (architectural fences
included), and `vite build` are clean.
