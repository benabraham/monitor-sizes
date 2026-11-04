# Contributing to Pixely a monitory

Thanks for helping. Pixely a monitory is an offline, installable PWA that answers one
question: how will this display look and feel compared with the displays I already know,
from which distance, and at which OS scale does it feel right?

Before you change code, read the two design documents:

- [`PRD.md`](./PRD.md): what the app does and why. Requirement IDs (F1 to F23) are
  referenced throughout the code and tests.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): the contract between modules, the directory
  layout, the data model and the code conventions. If you change a signature listed
  there, update that file in the same change.

The most common contribution is a new built-in display. It is a small JSON edit, described
in [Adding a built-in display](#adding-a-built-in-display) below.

## Setup

1. Install **Node 24**. The version is pinned in [`.nvmrc`](../.nvmrc). The minimum that
   `package.json` allows is Node 22.12.
2. Enable pnpm through corepack, which ships with Node. It uses the exact version pinned by
   the `packageManager` field in `package.json` (pnpm 10.28.0):

   ```sh
   corepack enable
   ```

3. Install dependencies:

   ```sh
   pnpm install
   ```

4. For end-to-end tests only, install the Chromium build that Playwright drives:

   ```sh
   pnpm exec playwright install chromium
   ```

## Scripts

Run them from the project root with `pnpm <script>`.

| Command             | What it does                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Starts the Vite dev server with hot module reload.                                                                                                                    |
| `pnpm build`        | Builds the static app into `dist/`. The base path is `/monitor-sizes/` (GitHub Pages project site).                                                                   |
| `pnpm preview`      | Serves `dist/` locally. Use it to check the built PWA: offline reload, install prompt, service worker.                                                                |
| `pnpm test`         | Runs all unit and component tests once (Vitest, jsdom).                                                                                                               |
| `pnpm test:watch`   | Runs the tests in watch mode while you work.                                                                                                                          |
| `pnpm coverage`     | Runs the tests with V8 coverage. Thresholds: 85 % lines, functions and statements; 80 % branches.                                                                     |
| `pnpm e2e`          | Runs the Playwright specs in `tests/e2e/` (Chromium). What they cover is listed in [`ARCHITECTURE.md`, Testing strategy](./ARCHITECTURE.md#testing-strategy).         |
| `pnpm format`       | Formats the whole repository with Prettier.                                                                                                                           |
| `pnpm format:check` | Fails if any file is not Prettier-formatted. Run `pnpm format` to fix.                                                                                                |
| `pnpm size`         | Checks the bundle budget: JS under 50 kB gzipped (PRD, non-functional requirements). Runs `scripts/check-bundle-size.js`.                                             |
| `pnpm check`        | The full gate: format check, coverage, build and bundle size. Run it before you open a pull request.                                                                  |
| `pnpm import-sheet` | **One-off, historical.** Regenerates `src/data/seed.json` from the frozen sheet snapshot. See the warning in [Adding a built-in display](#adding-a-built-in-display). |

## Project layout

The full tree and the role of each module is in
[`ARCHITECTURE.md`, Directory layout](./ARCHITECTURE.md#directory-layout). The short version:

- `src/lib/`: pure, framework-free calculation and formatting logic. It is tested to
  about 100 %.
- `src/components/`: one folder per component, `<kebab-name>/<kebab-name>.jsx` with its
  `.css` and `.test.jsx` next to it.
- `src/i18n/locales/{en,cs}/`: one file per namespace per language. Czech and English must
  have the same keys; a test enforces it.
- `src/data/seed.json`: the built-in displays. Inputs only.
- `scripts/`: developer tooling (the sheet import and the bundle-size check).
- `data/sheet-snapshot/`: a frozen copy of the original spreadsheet. It is a test fixture
  and is never edited by hand.
- `tests/`: shared test setup and the Playwright specs.

## Test first (TDD)

We write the test first where practical:

1. Write a test for the behaviour you want. Keep it at the level the architecture asks for:
   pure functions in `lib/` are tested directly; components are tested at the user level
   (roles, labels, visible text), not through implementation details.
2. Run it and watch it **fail for the right reason**. A test that errors on a typo or a
   missing import has not shown anything yet.
3. Write the smallest code that makes it pass, then tidy up with the tests green.
4. Run `pnpm coverage` before you open a pull request. New `lib/` code should be fully
   covered.

Colocated tests are named `foo.test.js` next to `foo.js`. Edge cases (boundaries, empty
input, invalid input) belong in the test, not only the happy path.

## Code style

Most of this is enforced by Prettier (`.prettierrc.json`) and `.editorconfig`. The rest
is convention, and [`ARCHITECTURE.md`, Code conventions](./ARCHITECTURE.md#code-conventions)
is the authority.

- **Functional, no classes.** Use arrow functions and plain objects.
- **No semicolons, single quotes, trailing commas**, 90-column lines, two-space indent,
  LF line endings, a final newline. `pnpm format` does all of this.
- **RORO**: a function with two or more parameters takes one object and returns an
  object, e.g. `getScaledMetrics({ display, metrics, scale, distance })`. A single-parameter
  function takes the value directly.
- **Guard clauses first.** Return early for invalid input, then write the happy path last.
- **Descriptive booleans** with an auxiliary verb: `isComfortable`, `hasError`, `isLoading`.
- **JSDoc on every export**: a description, `@param` and `@returns`, and an `@example` for
  anything non-trivial. Shapes are documented with `@typedef`, not TypeScript.
- **Lowercase-dash file and folder names**, e.g. `scaling-matrix/scaling-matrix.jsx`.
- **Store inputs, never derived values.** A display record holds diagonal, width, height,
  name, tag and id. PPI, aspect and megapixels are computed when needed.
- **Canonical units**: lengths and distances in inches, areas in square inches, scales as
  factors (`1.25`, not `125`). Convert to centimetres or percentages only in the format
  layer (`lib/format.js`).
- **Rounding** goes through `round()` in `lib/math.js`. It rounds half away from zero,
  like Google Sheets. `Math.round` does not.

## Adding a built-in display

The app ships with a seed of built-in displays in `src/data/seed.json`. The seed is the
source of truth now that the spreadsheet is retired (PRD, Data source and maintenance).
New displays arrive as pull requests that edit this file.

> **Do not run `pnpm import-sheet` after you have added displays.** It rebuilds
> `seed.json` from the frozen 2026-11-04 snapshot and overwrites the file. Any display you
> added by hand would be lost.

### Steps

1. **Collect the four inputs** from a spec sheet or the manufacturer's page:
   - `diagonal`: inches, as printed (for example `15.6`).
   - `width` and `height`: native pixels, the panel resolution (not a scaled value).
   - `name`: the canonical name from the table below.
2. **Pick the name.** Use the first row of the table that matches the panel:
   - MacBook panels keep their model name, matched on resolution and diagonal.
   - Otherwise use the resolution name from the table.
   - Otherwise use `W × H` with the multiplication sign U+00D7 and a space on each side,
     for example `1600 × 900`.

   Do not reuse the sheet's old names. They were inconsistent, and the table fixes them
   (for example, 3440 × 1440 is always `UWQHD`).

3. **Compute the id**: `${diagonal}-${width}x${height}`, with the decimal point of the
   diagonal replaced by a dash. Examples: `15.6` at 3840 × 2160 gives `15-6-3840x2160`;
   `27` at 3840 × 2160 gives `27-3840x2160`. The id must be unique in the file.
4. **Set the tag**:
   - `"laptop"` if the diagonal is 17.3 or less.
   - `"ultrawide"` if the diagonal is more than 17.3 and width ÷ height is 2.2 or more.
   - `"monitor"` otherwise.
5. **Insert the object at its PPI position.** PPI is √(width² + height²) ÷ diagonal. The
   array runs from the highest PPI to the lowest, so find the first entry with a lower PPI
   and insert in front of it. Do not store the PPI itself.
6. **Format and test:**

   ```sh
   pnpm format
   pnpm test
   ```

7. **Open the pull request.** Say where the numbers came from (a spec sheet link is ideal),
   and name any resolution you had to name with `W × H`.

### Example

A 24″ QHD panel (2560 × 1440) would be added like this. It is an example only, and its
position in the array depends on the PPI of its neighbours:

```json
  {
    "id": "24-2560x1440",
    "name": "QHD",
    "diagonal": 24,
    "width": 2560,
    "height": 1440,
    "tag": "monitor"
  },
```

### What the tests check

`pnpm test` runs `src/data/seed.test.js`. It checks that:

- every entry has exactly the six fields `id`, `name`, `diagonal`, `width`, `height`, `tag`,
  and no derived values;
- ids are unique and well formed, names are non-empty and trimmed;
- sizes are positive numbers and pixels are whole numbers;
- tags come from the `laptop | monitor | ultrawide` set;
- the array is sorted by PPI, highest first;
- the 51 imported rows still have their exact inputs (diagonal, width, height);
- the file is formatted the way the generator writes it.

Names and tags of the imported rows may be refined in a pull request, and new displays
may be added. Changing the inputs of an imported row fails the test on purpose: those
numbers come from the original sheet.

### Naming table

| Resolution (W × H)   | Canonical name                    |
| -------------------- | --------------------------------- |
| 1920 × 1080          | `Full HD`                         |
| 1920 × 1200          | `WUXGA`                           |
| 2560 × 1440          | `QHD`                             |
| 2560 × 1600          | `WQXGA`                           |
| 2560 × 1080          | `UW Full HD`                      |
| 3440 × 1440          | `UWQHD`                           |
| 3840 × 1600          | `UW4K`                            |
| 3840 × 2160          | `4K UHD`                          |
| 2880 × 1800          | `3K`                              |
| 5120 × 1440          | `DQHD`                            |
| 5120 × 2160          | `5K2K`                            |
| 5120 × 2880          | `5K`                              |
| 6016 × 3384          | `6K`                              |
| 6144 × 3456          | `6K`                              |
| 6144 × 2560          | `UW6K`                            |
| 7680 × 2160          | `DUHD`                            |
| 7680 × 3240          | `8K UW`                           |
| 7680 × 4320          | `8K UHD`                          |
| 10080 × 4320         | `10K UW`                          |
| 3456 × 2234 at 16.2″ | `MacBook Pro 16″`                 |
| 3024 × 1964 at 14.2″ | `MacBook Pro 14″`                 |
| 2560 × 1664 at 13.6″ | `MacBook Air 13″`                 |
| 2880 × 1864 at 15.3″ | `MacBook Air 15″`                 |
| 2560 × 1600 at 13.3″ | `MacBook Air/Pro 13″ (M1, M2)`    |
| anything else        | `W × H`, for example `1600 × 900` |

The table is also in `scripts/import-sheet.js`, which is where the import and the tests
read it from. A new resolution name is a small change there, with a test next to it in
`scripts/import-sheet.test.js`.

## Pull requests

- Keep a change focused. A new display, a fix to a name, or a new feature each belong in
  their own pull request.
- Run `pnpm format:check`, `pnpm test` and `pnpm coverage` before you push.
- Describe what you changed and why, and link the PRD requirement (F-number) if there is
  one.

## Historical note: the sheet import

The original "pixely a monitory" Google Sheet was converted once into `src/data/seed.json`
by `scripts/import-sheet.js`. Its source is the frozen snapshot in `data/sheet-snapshot/`,
taken on 2026-11-04. The script and its tests are kept as the record of how the 51 rows
were named, tagged and ordered, and as the regression fixture for the calculations. You
do not need to run it to contribute.
