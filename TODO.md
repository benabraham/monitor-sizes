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
- [x] Deploy to GitHub Pages
  - [x] Repo owner: make the repo public (or a plan with private Pages)
  - [x] Repo owner: Settings → Pages → Source "GitHub Actions"
  - [x] Verify the live app installs and works offline
  - [x] Interim test build published as a private claude.ai artifact (no offline/install there)
  - [x] Store survives refused `history.replaceState` (sandboxed frames)

## Wave 5 — layout and comparison polish

- [x] Drawing labels in the top-left inner corner of each outline, nudged down one line where two would clash (F11, F12)
  - [x] `getOutlineLayout` returns label positions; `placeLabels` is pure and tested (no overlap, inside the viewBox)
  - [x] Browser check: no two labels overlap at 1920, 1280 and 390 px, light and dark
- [x] Layout uses the full window width: the 80 rem cap of the main column is gone; gutters stay (16 px, safe-area aware)
- [x] Compare: "Set as baseline" on every membership row except the baseline (familiar, candidate and hidden rows) (F3, F13)
  - [x] `promoteToBaseline(id)`: a candidate becomes familiar with its compare distance and scale, then the baseline
  - [x] `setBaseline` shows a hidden display, so the baseline is always in Compare
- [x] Compare layout: the preview (mode switch and drawing) is full width at the top, sticky, at most 60 dvh (F11)
  - [x] Controls and membership side by side from 900 px, stacked below; metrics and matrix full width
  - [x] The scaling matrix is one column until two fit (no inner scroll at 1280 px)
- [x] OS scale preset switch in the app header (Windows, macOS, Linux), in sync with the Settings preset group (F21)
- [x] Fix: a label clash check that could loop forever on floating point error (regression test)
- [x] Fix: label widths were estimated too narrow for capitals; now 9 px a character
- [x] Verification: unit tests, e2e (desktop and phone), browser screenshots, `docs/DESIGN.md` and `docs/ARCHITECTURE.md` updated

## Follow-ups

- [x] Physical drawing: labels crowd when outlines are nearly the same size (e.g. 13–15.6″ laptops); stagger or use a legend (resolved in Wave 5: labels sit in the top-left corner and move down a line when they would clash)
- [ ] Measure label text in the browser instead of estimating its width (`LABEL_CHAR_WIDTH`), if the estimate proves too narrow or too wide
- [ ] Phone header is three rows (about 150 px tall): look for a more compact layout, so more of the preview stays visible
- [ ] Compare preview at 1280 × 800: the 60 dvh cap leaves the drawing about 640 px wide. Check whether the caption can be shorter
- [ ] `--compare-preview-chrome` (7.5 rem) is a hand-measured budget for the title, switch and caption. Re-measure it in the browser when those change
- [ ] Header preset: the segment says "Linux", so its accessible name is not "Linux (Wayland)" as in Settings. Consider a title or a hint
- [ ] Running text (help and onboarding paragraphs) may take a 70ch reading measure. Not done in Wave 5
- [ ] Build warns that `ui/dialog/dialog.jsx` is both dynamically and statically imported (`INEFFECTIVE_DYNAMIC_IMPORT`)
- [ ] Show a message when a lazy chunk or language fails to load (currently silent)
- [ ] Consider defaulting a candidate's distance by its own type (monitor 60 cm) instead of the baseline's distance when the baseline is a laptop (PRD F13 says baseline distance)
- [ ] Bump GitHub Actions to Node 24 majors (deprecation warning)
- [ ] Investigate a NumberField typing race seen while the lazy Compare data mounts
