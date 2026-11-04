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

- [ ] Design tokens, global CSS, UI primitives, help popover
- [ ] `state/store.js` (signals, computed rows, actions, persistence, URL sync)
  - [ ] Locale precedence: URL → saved preference → `detectLocale()`
  - [ ] Baseline enforcement: exactly one, from the familiar set (F3)
- [ ] App shell + toolbar (units, language, preset, custom scales, comfort window, copy link)

## Wave 3 — feature views

- [ ] Onboarding: pick ≥ 1 familiar display, distance + scale each, units (F2)
- [ ] Browse: familiar strip, search/filters, sortable table / phone cards (F4, F5, F8, F9)
- [ ] Compare: always-visible visualization, Physical ⇄ As seen (F10–F13)
  - [ ] Distance + scale controls, match buttons, equivalence line (F15)
- [ ] Compare: metric grid incl. angular metrics, full scaling matrix (F6, F14)
- [ ] Add/edit/delete custom display, live preview, presets (F17)
- [ ] Import/export JSON (F18)
- [ ] "Like my screen" helper (F22)

## Wave 4 — integration and release

- [ ] E2E: onboarding, compare flow, share-link round trip, offline reload, install check
- [ ] Accessibility pass (keyboard, labels, contrast, text equivalent of the overlay)
- [ ] Performance check: 200 displays recalculated < 16 ms; JS < 50 kB gzipped
- [ ] README with screenshots and user guide
- [ ] Deploy to GitHub Pages
  - [ ] Repo owner: make the repo public (or a plan with private Pages)
  - [ ] Repo owner: Settings → Pages → Source "GitHub Actions"
  - [ ] Verify the live app installs and works offline
