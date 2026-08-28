# Design Plan — Project Improvement Tracker

Companion to [project-improvements-spec.md](project-improvements-spec.md). This is the
visual direction for sign-off before any UI is built. Architecture lives in
[ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. The subject, pinned

**What it is:** a private control board where one developer files half-formed
improvement ideas into the right project, fast, and finds them again weeks later.

**Who uses it:** exactly one person — the developer who built it. No onboarding, no
empty-state hand-holding beyond a single line, no explaining what a "tag" is.

**The page's one job:** *get a sentence into the right bucket in seconds, and make the
last three weeks of ideas legible at a glance.* Everything visual serves that or gets cut.

The subject's own world supplies the vocabulary: self-hosted dashboards (Homepage,
Heimdall, Homarr) with their monogram tiles and labelled group panels; GitHub's issue
labels and their colours; the physical feel of **rack-mounted studio equipment** —
labelled bays, machined knobs, a status lamp per module.

---

## 2. Calibration — defaults refused

Current AI design clusters around three looks. Here is what this brief does with each:

| Default | Verdict here |
|---|---|
| Cream bg + high-contrast serif + terracotta | **Rejected.** This is an instrument panel, not an essay. A serif display face would misread the product. |
| Near-black bg + one acid accent | **Half-briefed, half-refused.** The spec asks for "dark cards, Homepage style", so a dark UI is correct. But the identity is *not* carried by one bright accent. Colour here means one of two specific things (see §4) and is used nowhere else. |
| Broadsheet hairlines + newspaper columns + zero radius | **Rejected.** No dense column grid. One hairline does real work (the stamp gutter); the rest is space. |

---

## 3. Signature — the status stamp gutter

The spec's most-defended idea is that **`done` and `dismissed` are not the same thing**
and must never look alike. That distinction becomes the thing the app is remembered by.

Every issue — in the dashboard feed and in project detail — sits against a narrow
`2ch` monospace **gutter** on its left, separated from the text by the one vertical
hairline in the product. In that gutter sits a hand-set mark:

```
  ▪   open        filled square, full-contrast ink
  ✓   done        drawn check, and the issue text is struck through
  ╱   dismissed   single forward slash, issue text muted but NOT struck through
```

The marks align into a vertical ledger down the feed. Scanning the gutter alone tells
you the state of everything without reading a word or finding a status label.
Strikethrough is spent only on `done`, because a strike reads as "finished" and that is
the wrong story for something you deliberately chose not to build.

Nothing else in the UI gets to be this expressive. The stamp is the one accessory.

---

## 4. Tokens

### Colour — a desaturated slate board, one brass control, meaning-only hues

```
--vault-900   #14171C   app background
--vault-800   #1B1F26   panel / bay background
--vault-700   #232833   card background
--vault-600   #2E3440   hover / raised surface
--rule        #3A414F   hairlines, card borders, the stamp gutter rule

--ink-100     #E8EBF0   primary text
--ink-300     #A6AFBE   secondary text, metadata
--ink-500     #6B7482   muted text — dismissed issues, timestamps, disabled

--brass       #E0C878   THE capture affordance + focus rings. Nothing else.
--brass-dim   #8A7B4A   brass, pressed
```

**Two colour systems that must never be confused** (the spec calls this out explicitly),
kept apart by *shape*, not just hue:

- **Tag colour** — fixed, GitHub-derived, for recognisability. Always rendered as a
  **filled pill with a text label**. Never just a dot.

  ```
  bug            fg #F1707B  bg #37181D
  enhancement    fg #4FD1B5  bg #10322C
  documentation  fg #6CA9F5  bg #16283F
  question       fg #C99BF0  bg #291E3C
  Untagged       fg #8A93A2  bg transparent  1px #3A414F outline
  ```

- **Category colour** — user-chosen, from a **curated dark-legible set** (a free colour
  picker will produce unreadable panels on `#14171C`). Always rendered as a **2px edge
  rule** — the top border of a category bay, or a 6px dot on the top-right corner of a
  flat-view card. Never a filled pill.

  ```
  slate #7C8CA1   moss  #6FAE82   clay #C98A6B   iris #8E8AD9
  rust  #C2705A   fern  #86A96A   plum #A87BA8   steel #6E9BB0
  ```

Pill = tag. Edge rule = category. They can never be mistaken for each other even at a
glance, even for a colour-blind reader, because they are different objects.

### Type — Bricolage Grotesque against IBM Plex

The pairing *is* the type story: Bricolage brings irregular, almost hand-cut warmth;
Plex answers with technical precision. Neither is the Space-Grotesk-or-a-serif reflex.

| Role | Face | Use |
|---|---|---|
| Display | **Bricolage Grotesque** 600 / 700 | Wordmark, screen headings, wizard step titles. Large sizes only, tracking `-0.01em`. Used maybe four times per screen. |
| Body / UI | **IBM Plex Sans** 400 / 500 / 600 | Issue text, card names, buttons, form fields, labels. The workhorse. |
| Data / utility | **IBM Plex Mono** 400 / 500 | Timestamps (`2h`, `3d`), counts (`Deleted issues: 14`), card monograms, the status stamps, `⌘K` hints, category tab labels. |

All three are on Google Fonts and self-hosted via `@fontsource` (no runtime CDN).

**Scale** (px / line-height):

```
Display XL   34 / 1.10   Bricolage 700   wordmark, wizard step title
Display L    24 / 1.20   Bricolage 600   screen heading
Heading M    16 / 1.30   Plex Sans 600   card project name
Body         15 / 1.50   Plex Sans 400   issue text, fields
Small        13 / 1.40   Plex Sans 400   secondary metadata
Mono XS      12 / 1.40   Plex Mono 400   timestamps, counts, kbd  (+0.02em)
Tab label    11 / 1.00   Plex Mono 500   category tab, section eyebrows  (UPPERCASE, +0.14em)
```

### Layout — labelled bays on a dark board

- App max-width `1180px`, `32px` gutters, centred. Single column of stacked regions.
- **Top bar** (sticky): wordmark left; `flat / category` view toggle centre; search
  (`⌘K`) and the brass **Add** button right.
- **Projects region**: mono uppercase eyebrow + sort control, then the grid.
  - *Flat view* — one grid, `repeat(auto-fill, minmax(132px, 1fr))`, 3–8 per row by
    viewport. Pager (`‹ 2 / 4 ›`) bottom-right when count exceeds `cards_per_page`.
    **Only the grid re-renders on page change** — local state, nothing else moves.
  - *Category view* — the grid region becomes stacked **bays**: a bordered panel, the
    category name in a mono tab notched into its top-left edge, a 2px accent rule along
    the top. Bays size to contents. `Uncategorised` bay last. Collapsible to the tab
    bar; collapsed state persists per category. This view **scrolls, never paginates** —
    pager and `cards_per_page` are hidden while it is on.
- **Hairline divider** (the only full-width rule) between projects and the feed.
- **Recent feed**: eyebrow `RECENT · OPEN ISSUES · ALL PROJECTS` + `show resolved`
  toggle, then rows against the stamp gutter. Global — no category filter, by design.

**Card:**

```
┌──────────────┐   · 132px min, square-ish
│           ●  │   category dot (flat view only), top-right
│              │
│     DA       │   monogram, Plex Mono 500, 22px, --ink-100
│              │
│   dashboard  │   name, Plex Sans 600, 13px, --ink-300, truncates
└──────────────┘
   border --rule → category accent on hover (100ms)
```

---

## 5. Screen wireframes

### Screen 1 — Dashboard (flat view)

```
┌────────────────────────────────────────────────────────────────────┐
│  ◧ IMPROVEMENTS              ‹ flat │ category ›        ⌘K   [ + Add ]│
├────────────────────────────────────────────────────────────────────┤
│  PROJECTS                                     sort  last activity ▾  │
│                                                                     │
│   ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐            │
│   │ DA │  │ CO │  │ MX │  │ PF │  │ QZ │  │ LB │  │ SN │            │
│   │dash│  │core│  │mixr│  │pdf │  │quiz│  │lab │  │sync│            │
│   └────┘  └────┘  └────┘  └────┘  └────┘  └────┘  └────┘            │
│                                                    ‹  2 / 4  ›       │
├────────────────────────────────────────────────────────────────────┤
│  RECENT · OPEN ISSUES · ALL PROJECTS                 show resolved ○ │
│  ┆                                                                  │
│  ▪ ┆ swap the auth guard for a hook        [enhancement]  core · 2h  │
│  ▪ ┆ favicon 404s on deep links            [bug]          dash · 1d  │
│  ▪ ┆ document the seed script              [documentation] mixr · 3d │
│  ▪ ┆ do we even need the pager?            [question]     dash · 4d  │
│  ✓ ┆ s̶e̶t̶ ̶u̶p̶ ̶t̶h̶e̶ ̶e̶m̶u̶l̶a̶t̶o̶r̶ ̶s̶u̶i̶t̶e̶         [enhancement]  core · 5d  │  ← only if
│  ╱ ┆ rewrite in rust                        —            core · 1w   │     resolved on
└────────────────────────────────────────────────────────────────────┘
```

### Screen 1 — Dashboard (category view)

```
│  PROJECTS                                     sort  last activity ▾  │
│                                                                     │
│  ┌─ WORK ─────────────────────────────────────────────┐  (moss)     │
│  │  ┌────┐  ┌────┐  ┌────┐                             │             │
│  │  │ DA │  │ CO │  │ SN │                             │             │
│  │  └────┘  └────┘  └────┘                             │             │
│  └────────────────────────────────────────────────────┘             │
│  ┌─ PERSONAL ─────────────────┐  ▸  (iris)   ← collapsed: tab only   │
│                                                                     │
│  ┌─ FOR FUN ──────────────────────────┐  (clay)                     │
│  │  ┌────┐  ┌────┐                     │                             │
│  │  │ QZ │  │ MX │                     │                             │
│  │  └────┘  └────┘                     │                             │
│  └────────────────────────────────────┘                             │
│  ┌─ UNCATEGORISED ────────────┐  (slate)                            │
│  │  ┌────┐                     │                                     │
│  │  │ LB │                     │                                     │
│  │  └────┘                     │                                     │
│  └────────────────────────────┘                                     │
```

### Screen 1c / ⌘K — Quick add (capture path, keyboard-first)

```
              ┌─────────────────────────────────────────┐
              │  FILE AN IDEA                            │
              │  ┌───────────────────────────────────┐  │
              │  │ swap the auth guard for a hook_   │  │  ← autofocus
              │  └───────────────────────────────────┘  │
              │  → project   ┌──────────────────────┐   │  ← Tab here; type to filter
              │              │ CO  core             │   │
              │              │ DA  dashboard        │   │
              │              └──────────────────────┘   │
              │  tag  [ bug ][ enh ][ doc ][ que ]  skip│  ← keys 1–4, or Enter to skip
              │                              ⏎ File     │
              └─────────────────────────────────────────┘
```

`A` or `⌘K` opens it from anywhere. `⌘K` alone widens the same overlay into search
(project names + issue text). No warning on submit-without-tag — it is a first-class path.

### Screen 2 — Project detail

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ back     ┌────┐   dashboard                         [ edit meta ] │
│            │ DA │   github.com/me/dashboard · macbook-pro           │
│            └────┘                                                   │
├────────────────────────────────────────────────────────────────────┤
│  tag   all · bug · enhancement · documentation · question · untagged│
│  status   open · done · dismissed                                   │
│                                                                     │
│  ┆ + add an issue…                                        [ tag ▾ ] │  ← always at top
│  ┆                                                                  │
│  ▪ ┆ favicon 404s on deep links               [bug]         1d   ⋯  │
│  ▪ ┆ the sort dropdown loses focus on Esc     [bug]         2d   ⋯  │
│  ✓ ┆ s̶e̶t̶ ̶u̶p̶ ̶t̶h̶e̶ ̶e̶m̶u̶l̶a̶t̶o̶r̶ ̶s̶u̶i̶t̶e̶              [enhancement]  3d   ⋯  │
│  ╱ ┆ rewrite the router                        —            1w   ⋯  │
└────────────────────────────────────────────────────────────────────┘
```

`⋯` row menu: edit text · set/change/clear tag · mark done · dismiss · delete.
Done and dismissed stay visible here (filter defaults to all statuses); they render
per the stamp rules above.

### Screen 3 — New project wizard

```
              ┌─────────────────────────────────────────┐
              │  ■ ■ □ □                    step 2 of 4  │  ← progress = filled squares
              │                                         │
              │  Which category?                        │  ← Bricolage Display XL
              │                                         │
              │  ( work )  ( personal )  ( for fun )     │
              │  ┌───────────────────────────────────┐  │
              │  │ + new category…                   │  │  ← inline, no trip to settings
              │  └───────────────────────────────────┘  │
              │                                         │
              │              ‹ back        continue ›   │
              └─────────────────────────────────────────┘
```

Steps: **1** name + one-line description · **2** category · **3** links (repo URL,
website URL, host machine — all optional) · **4** first issue (optional). Numbering
is used here and nowhere else in the product, because this is the one place where
order is real information. Free-form links and Markdown maintenance notes are added
later from the project screen's **More details** panel / **edit meta**.

---

## 6. Motion — one orchestrated load, then near-silence

| Moment | Treatment |
|---|---|
| First paint | Top bar + eyebrows fade-up 8px over 120ms; cards fade in on a 20ms stagger. Happens once. |
| View toggle flat ↔ category | Cards hold position where they can (FLIP); bays expand 180ms ease-out. |
| Quick-add / search overlay | Backdrop fade + panel scale from 98%, 120ms. |
| Card hover | Border `--rule` → category accent, 100ms. Nothing moves. |
| Status change | Stamp glyph draws in 90ms; strike-through wipes across 140ms on `done`. |
| `prefers-reduced-motion` | Everything above becomes an instant opacity swap. No transforms. |

Nothing loops. No ambient drift. No scroll-jacking.

---

## 7. Copy deck

| Where | Text |
|---|---|
| Capture button | `Add` |
| Filed toast | `Filed to core` |
| Quick-add title | `File an idea` |
| Quick-add tag hint | `Tag — optional. Press 1–4, or skip.` |
| Dashboard empty | `No projects yet. Create one to start filing ideas.` → `New project` |
| Feed empty | `Nothing open. Every idea you've filed is done or dismissed.` |
| Project issues empty | `No issues here yet. Add the first one above.` |
| Resolved toggle | `show resolved` |
| Sort options | `name` · `date added` · `last activity` |
| Purge line (settings) | `Deleted issues: 14 · Purge` |
| Purge confirm | `Permanently remove 14 deleted issues? This can't be undone.` → `Purge 14` / `Cancel` |
| Wizard step titles | `Name the project` · `Which category?` · `Where does it live?` · `First idea?` |
| Back link | `‹ back` |

Voice: plain verbs, sentence case, no filler, no apologies. Actions keep their name
across the flow — the button says `Add`, the toast says `Filed`, and that is the only
place tense shifts (imperative → confirmation).

---

## 8. Plan reviewed against the brief

Ran the brief a second time as if fresh, to catch anything that is a reflex rather than
a choice.

- **Dark UI** — kept. Not a default reach; the spec names Homepage/Heimdall directly.
- **Single accent** — *changed.* First pass had one bright accent doing everything
  (default #2). Revised: brass is confined to the capture affordance and focus rings;
  all other colour is either a tag pill or a category edge, and both encode meaning.
- **Numbered markers** — *constrained.* First pass had `01 / 02 / 03` eyebrows on the
  dashboard sections. Cut — projects and issues are not a sequence. Numbering survives
  only in the wizard, where the steps genuinely are ordered.
- **Type** — *changed.* First pass was Space Grotesk + Inter, which is now its own
  cliché. Revised to Bricolage Grotesque + IBM Plex Sans/Mono, where the irregular/
  precise contrast is deliberate and tied to the "hand-set marks on an instrument
  panel" idea.
- **Ledger metaphor** — *trimmed.* First pass had full-width row ruling under every
  issue *plus* the stamp gutter *plus* mono figures — three cues for one idea. Cut the
  row ruling. The gutter and its single hairline carry it; row hover is a faint
  `--vault-800` fill only.
- **Signature** — confirmed unique to this brief: the open/done/dismissed stamp gutter
  is a direct render of the spec's most-defended distinction, and would not appear in a
  design for any other kind of dashboard.

### Accessory removed

Per the "take one thing off" rule: the card monogram was also going to nudge up 1px on
hover. Cut. The border-colour shift to the category accent is enough, and it doubles as
a preview of which bay the card belongs to.

---

## 9. Open questions before build

**Settled:**

- **Category colour** — curated dark-legible set (§4). No free colour picker.
- **Hosting / routing** — GitHub Pages + `HashRouter`. See [ARCHITECTURE.md §6](ARCHITECTURE.md).
- **Firebase** — project `progress-board-d03d1` exists, Google auth on. Remaining setup
  items tracked in [ARCHITECTURE.md §7](ARCHITECTURE.md).

**Still open:**

1. **Purge confirmation.** *Settled: one confirm step.* Pressing `Purge` opens
   `Permanently remove 14 deleted issues? This can't be undone.` → `Purge 14` / `Cancel`.
   A deliberate deviation from the spec's "no prompt", since the action is an
   irreversible hard delete.

2. **Category-view extras — first build or fast-follow?** *Recommendation stands:
   fast-follow (build 2).* Two behaviours the spec lists
   for category view:
   - *Drag to reorder groups* — grab a category bay and drag it above/below another to
     set the order the groups appear in; the order is saved. Fiddly to do accessibly
     (keyboard + touch + persistence).
   - *Collapse a group* — click a category's tab to fold its bay down to just the label;
     that collapsed/expanded state is remembered per category between sessions.

   Everything else in category view (grouping, the labelled bays, per-category accent,
   `Uncategorised` last, scroll-not-paginate) ships in the first build regardless.
   **Recommendation: ship category view in build 1 with a fixed order (by creation) and
   always-expanded bays; add drag-reorder + collapse-persistence as build 2.** Say if
   you want them both in the first pass.
