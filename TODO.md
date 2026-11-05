# TODO

Task list for v1 (see [`docs/PRD.md`](./docs/PRD.md)). `- [x]` done, `- [ ]` open; nested
items are sub-tasks. Keep this file current — rules in [`CLAUDE.md`](./CLAUDE.md).

## Foundation

- [x] Import PRD into `docs/PRD.md` and record open-question decisions
- [x] Freeze the original sheet in `data/sheet-snapshot/`
- [x] Scaffold Vite + Preact + Signals + PWA + Vitest + Playwright
- [x] Architecture contract `docs/ARCHITECTURE.md`
- [x] `CLAUDE.md` + `TODO.md`

## Wave 1 — pure logic

- [x] `lib/math.js` (Sheets-compatible rounding, gcd, clamp)
- [x] `lib/calc` (geometry, aspect, scaling, angular) — F1, F4, F6, F14, F15
  - [x] Sheet acceptance test: every row and metric matches
  - [x] PRD worked example (80 / 40 / 60 cm)
- [x] Seed data + one-off import script (`src/data/seed.json`, names normalised)
- [x] `lib/units.js`, `lib/format.js` — F16
- [x] i18n infrastructure + `common` and `metrics` namespaces (en, cs) — F16, F20
- [x] `lib/scales.js` (OS presets, detection, custom scale parsing) — F21
- [x] `lib/url-state.js` (full view state in the URL, custom displays embedded) — F19
- [x] `lib/storage.js` (IndexedDB, never throws) — F2, F17
- [x] PWA icons, manifest, bundle-size guard
- [x] CI workflow + GitHub Pages deploy workflow

## Wave 2 — state and UI foundation

- [x] Design tokens, global CSS, UI primitives, help popover
- [x] `state/store.js` (signals, computed rows, actions, persistence, URL sync)
  - [x] Locale precedence: URL → saved preference → `detectLocale()`
  - [x] Baseline enforcement: exactly one, from the familiar set (F3)
- [x] App shell wiring store ⇄ components
  - [x] Header, settings panel, copy link, shared-view banner (presentational)

## Wave 3 — feature views

- [x] Onboarding: pick ≥ 1 familiar display, distance + scale each, units (F2)
- [x] Browse: familiar strip, search/filters, sortable table / phone cards (F4, F5, F8, F9)
- [x] Compare: always-visible visualization, Physical ⇄ As seen (F10–F13)
  - [x] Distance + scale controls, match buttons, equivalence line (F15)
- [x] Compare: metric grid incl. angular metrics, full scaling matrix (F6, F14)
- [x] Add/edit/delete custom display, live preview, presets (F17)
- [x] Import/export JSON (F18)
- [x] "Like my screen" helper (F22)

## Wave 4 — integration and release

- [x] E2E: onboarding, compare flow, share-link round trip, offline reload, install check
  - [x] 117 Playwright tests (desktop + phone projects), `docs/TESTING.md`
- [x] Accessibility pass (keyboard, labels, contrast, text equivalent of the overlay)
  - [x] axe (WCAG 2.2 AA) on every view, light and dark; focus traps and skip link
- [x] Performance check: 200 displays recalculated < 16 ms; JS < 50 kB gzipped
  - [x] Store perf test: 200 displays ≈ 2 ms
  - [x] Bundle back under 50 kB (lazy per-locale catalogues + lazy compare data; 53.5 → 48.5 kB)
  - [x] More headroom: lazy-load onboarding, settings and add-display dialogs
- [x] README with screenshots and user guide
  - [x] README, USER-GUIDE (en, cs), CALCULATIONS
  - [x] Screenshots in `docs/screenshots/`
- [x] Layout polish from browser review
  - [x] Familiar chips: separate name and diagonal
  - [x] Compare desktop: only the visualization sticky, controls reachable
  - [x] Compare phone: cap the pinned visualization height
  - [x] Move the `.visually-hidden` clip fix into `global.css`
- [x] Optional: long-press on a display to add it to compare (PRD key interaction; checkbox already covers it)
- [ ] Deploy to GitHub Pages
  - [x] Repo owner: make the repo public (or a plan with private Pages)
  - [ ] Repo owner: Settings → Pages → Source "GitHub Actions"
  - [ ] Verify the live app installs and works offline

## Follow-ups

- [ ] Show a message when a lazy chunk or language fails to load (currently silent)
- [ ] Consider defaulting a candidate's distance by its own type (monitor 60 cm) instead of the baseline's distance when the baseline is a laptop (PRD F13 says baseline distance)
- [ ] Bump GitHub Actions to Node 24 majors (deprecation warning)
- [ ] Investigate a NumberField typing race seen while the lazy Compare data mounts
