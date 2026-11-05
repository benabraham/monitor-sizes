# Testing

How Pixely a monitory is tested: which layer checks what, how to run each layer, the
coverage thresholds, the sheet acceptance fixture, and how the README screenshots are made.

Related: [`ARCHITECTURE.md`](./ARCHITECTURE.md) (Testing strategy),
[`DEPLOYMENT.md`](./DEPLOYMENT.md) (what CI runs) and [`PRD.md`](./PRD.md) (the requirements
the tests cite).

## Layers

| Layer         | Tool                              | Files                                                         | Checks                                                                                                              |
| ------------- | --------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Unit          | Vitest, jsdom                     | `src/**/*.test.js`, `scripts/**/*.test.js`                    | Calculations, state, URL codec, i18n catalogues, pure helpers                                                       |
| Component     | Vitest, Testing Library (Preact)  | `src/**/*.test.jsx`                                           | Component behaviour, keyboard handling in components (for example the dialog focus wrap)                            |
| Acceptance    | Vitest on the sheet snapshot      | `src/lib/calc/sheet-fixture.test.js`, `src/data/seed.test.js` | Every row and metric of the original sheet, within rounding (see below)                                             |
| End to end    | Playwright, Chromium              | `tests/e2e/*.spec.js`                                         | Real flows in the production build: onboarding, Browse, Compare, add and edit, share, language, offline, a11y, perf |
| Accessibility | axe-core (`@axe-core/playwright`) | `tests/e2e/a11y.spec.js`                                      | WCAG 2.0 A/AA, 2.1 A/AA and 2.2 AA on every main state, in light and dark, plus keyboard focus                      |
| Performance   | Playwright and in-page timing     | `tests/e2e/perf.spec.js`                                      | First load to onboarding, and search input to DOM update                                                            |

Unit and component tests run in jsdom. Anything that depends on layout, focus in a real
browser, service workers or IndexedDB is tested in Chromium.

## Running the tests

```sh
pnpm test                       # unit and component tests (Vitest)
pnpm coverage                   # the same, with v8 coverage and the thresholds below
pnpm e2e                        # every Playwright spec, desktop and phone projects
pnpm exec playwright test tests/e2e/a11y.spec.js   # one spec
pnpm exec playwright test --project=phone          # one viewport
pnpm exec playwright show-report                   # the HTML report (after CI=1 pnpm e2e)
pnpm check                      # format, coverage, build and bundle size (not e2e)
```

The first time on a machine, install the browser: `pnpm exec playwright install chromium`.

### Playwright projects

`playwright.config.js` defines two Chromium projects:

| Project   | Viewport   | Device base    | Runs                                       |
| --------- | ---------- | -------------- | ------------------------------------------ |
| `desktop` | 1280 × 800 | Desktop Chrome | every spec, except tests tagged `@phone`   |
| `phone`   | 390 × 844  | Pixel 7        | every spec, except tests tagged `@desktop` |

Most flows run in both projects. The tests that depend on the layout carry a tag in their
title: `@desktop` for the sortable table, `@phone` for the cards. Below 600 px Browse shows
cards and above it the table (PRD UX).

The web server is `pnpm build && pnpm preview --port 4173`. Outside CI an existing server on
4173 is reused, so stop a stale preview first (see DEPLOYMENT.md). The screenshot script uses
port 4175, so the two never clash.

### Writing an e2e spec

- Each test starts from a fresh browser context, so storage (IndexedDB) and the service
  worker start empty. Use `completeOnboarding({ page, displays, setup })` from
  `tests/e2e/helpers.js` for the first-run flow.
- Find controls by role and accessible name, as a screen reader does. Prefer
  `getByRole('row' | 'listitem' ...).filter({ has: ... })` over CSS selectors, and use
  `displayItem(page, DISPLAYS.uhd27)` to find a row or card (the names repeat, the diagonal
  does not).
- Wait with `expect` (it polls). Do not add fixed timeouts.
- A number field commits on blur. Use `fillNumber` (or blur after `fill`) so the value
  reaches the store.
- Language-dependent names change when the language does. After switching to Čeština, find
  the open dialog by role, not by its English name.

## Accessibility

`tests/e2e/a11y.spec.js` runs axe with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
and `wcag22aa` (PRD Non-functional: WCAG 2.2 AA). The states covered are onboarding steps 1
and 2 (with the add form open), Browse, Compare, the Settings dialog, the Add display
dialog and an open help popover, each in light and dark (`colorScheme`). Each state must
report zero violations.

The keyboard tests check that Tab from the top of the page reaches the skip link and then
the view switch, that the skip link moves focus to the main content, and that the two
dialogs keep Tab inside themselves and return focus to their opener on Escape.

## Performance

`tests/e2e/perf.spec.js` (desktop only):

- **First load.** A fresh context with the HTTP cache disabled through CDP. The timer is the
  moment onboarding's title appears in the DOM, read against the navigation start. Budget:
  under 1 s (PRD Non-functional). Three runs; the worst is asserted, the median is reported.
- **Search.** With two familiar displays, each search input is timed in the page, from the
  input event to the DOM update that changes the count. Budget: under 50 ms. The next painted
  frame is also reported. In headless Chromium painting is software rendering, so the frame
  figure is information, not the budget.

Figures are attached to the test report as annotations (`first-load`, `search-input`).

## Coverage thresholds

`vitest.config.js` sets the v8 coverage thresholds that `pnpm coverage` (and CI) enforce:

| Metric     | Minimum |
| ---------- | ------- |
| Lines      | 85 %    |
| Functions  | 85 %    |
| Branches   | 80 %    |
| Statements | 85 %    |

Coverage covers `src/**` and `scripts/**`, except tests, the entry point `src/main.jsx`, the
generated locale catalogues and `scripts/generate-icons.js`. The e2e specs do not count
towards coverage; they check behaviour the unit tests cannot reach.

## Sheet acceptance fixture

The calculations must reproduce the original spreadsheet (PRD: "100 % of sheet rows match
the port within rounding"). The fixture is a snapshot of the sheet's displayed values:

- `data/sheet-snapshot/monitory.values.json`: the formatted values of the `monitory` sheet,
  `monitory!A1:AK54`. This is the acceptance input.
- `data/sheet-snapshot/halp.values.json`: the help sheet, the source of the column help.
- `src/lib/calc/sheet-fixture.test.js` parses every cell (`same` is 0, the sheet's U+2212
  minus becomes `-`) and asserts that the calc layer gives each row and metric within rounding.
  It deliberately skips the sheet's "like Mpix" columns, which the PRD fixes (s² rather than
  s, no 5 Mpix cut-off).
- `src/data/seed.test.js` checks every entry of the JSON seed (`src/data/seed.json`) against
  the entry rules, and that the 51 imported rows keep the diagonal, width and height they had
  in the sheet. `scripts/import-sheet.test.js` covers the one-off import script.

When a calculation changes on purpose, change the fixture only with the PRD decision that
justifies it, and record that decision in `CALCULATIONS.md`.

## Screenshots

The README screenshots are generated, not drawn by hand:

```sh
node scripts/take-screenshots.js
```

The script builds `dist/`, serves it on port 4175 and writes into `docs/screenshots/`:

| File                       | Viewport   | Device scale | Scene                                             |
| -------------------------- | ---------- | ------------ | ------------------------------------------------- |
| `browse-desktop.png`       | 1280 × 800 | 2×           | Browse, table, familiar set                       |
| `compare-desktop.png`      | 1280 × 800 | 2×           | Compare, As seen, two familiar and two candidates |
| `compare-desktop-dark.png` | 1280 × 800 | 2×           | the same comparison in dark colour scheme         |
| `compare-phone.png`        | 390 × 844  | 3×           | Compare on a phone, drawing pinned at the top     |
| `browse-phone.png`         | 390 × 844  | 3×           | Browse cards on a phone                           |

The familiar set is 14.2″ MacBook Pro at 45 cm and 200 %, and 27″ 4K UHD at 60 cm and 150 %.
The candidates are 32″ 4K UHD and 34″ UWQHD. Every shot is a viewport, never a full page. A
PNG over 600 kB is taken again at 1.5×. After regenerating, open each image and check it
(the layout, the labels, both colour schemes), because a scene that drifts from the
description above is not caught automatically.

## Known limits

- Chromium only. Firefox and Safari are not in the e2e matrix.
- Accessibility checks run on the states listed above, not every possible state (for example
  the copy-link fallback field).
- The sheet fixture covers the values as displayed, so a change that keeps the rounded
  numbers but moves the underlying maths is not caught.
