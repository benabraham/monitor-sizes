# Deployment

Pixely a monitory is a static PWA. CI checks every push and pull request. Pushes to the
deploy branches publish the built app to GitHub Pages. This document covers how both
workflows run, the base-path rule that makes the app work under `/monitor-sizes/`, the
one-time repository setup, and the local checks that mirror CI.

Related: [`PRD.md`](./PRD.md) (Hosting and licence, Non-functional requirements) and
[`ARCHITECTURE.md`](./ARCHITECTURE.md) (Stack, Testing strategy).

## Overview

| Piece        | File                           | Runs on                                                          |
| ------------ | ------------------------------ | ---------------------------------------------------------------- |
| CI           | `.github/workflows/ci.yml`     | every push and pull request                                      |
| Deploy       | `.github/workflows/deploy.yml` | push to `main` or `claude/blissful-lovelace-9afpsd`, or manually |
| Build config | `vite.config.js`               | `base`, PWA manifest, service worker                             |
| E2E config   | `playwright.config.js`         | local runs and CI                                                |
| E2E specs    | `tests/e2e/*.spec.js`          | Chromium only                                                    |
| Icons        | `scripts/generate-icons.js`    | run by hand after editing `public/favicon.svg`                   |
| Bundle guard | `scripts/check-bundle-size.js` | `pnpm size`, after `pnpm build`                                  |

Tool versions: Node 24 (`.nvmrc` says 24; `engines` requires `>=22.12`) and pnpm, taken
from the `packageManager` field in `package.json`. Both workflows install with
`pnpm install --frozen-lockfile`, so `pnpm-lock.yaml` must be up to date.

## Continuous integration

`ci.yml` runs on every push (all branches) and on every pull request. It runs on
`ubuntu-latest` and stops at the first failing step:

1. `pnpm install --frozen-lockfile`
2. `pnpm format:check`: Prettier, no semicolons and single quotes (`.prettierrc.json`)
3. `pnpm coverage`: unit tests with v8 coverage and the thresholds in `vitest.config.js`
4. `pnpm build`: production build, which also generates the service worker
5. `pnpm size`: fails when the first load (the scripts `dist/index.html` loads, plus the largest
   locale catalogue) exceeds 50 kB gzipped
6. `pnpm exec playwright install --with-deps chromium`
7. `pnpm e2e`: Playwright specs against `pnpm preview`
8. On failure only: uploads `playwright-report/` as an artifact, kept 14 days

## Deployment to GitHub Pages

`deploy.yml` publishes through the GitHub Pages Actions source (no `gh-pages` branch).

- **Triggers:** push to `main`, push to `claude/blissful-lovelace-9afpsd`, and
  `workflow_dispatch` (Actions tab, "Run workflow").
- **Permissions:** `contents: read`, `pages: write`, `id-token: write`. Nothing else.
- **Concurrency:** group `pages` with `cancel-in-progress: false`. If two deploys are
  queued, the running one finishes and the next one then deploys. A deploy is never
  cancelled part-way through the upload.
- **`build` job:** checkout, pnpm, Node 24, install, `pnpm test`, `pnpm build`,
  `actions/configure-pages@v5`, then `actions/upload-pages-artifact@v3` with `path: dist`.
- **`deploy` job:** needs `build`, runs in the `github-pages` environment and publishes
  with `actions/deploy-pages@v4`. The environment URL is the deployed page.

The deploy job does not re-run the e2e suite. CI already ran it on the same commit, so
the deploy only repeats the unit tests and the build.

## Base path rule

The app is served from `https://<owner>.github.io/<repo>/`, so every URL the app
generates must start with `/monitor-sizes/`. Four settings must agree:

| Setting              | Where                                     | Value             |
| -------------------- | ----------------------------------------- | ----------------- |
| Vite base            | `vite.config.js`, `base`                  | `/monitor-sizes/` |
| Manifest `start_url` | `vite.config.js`, `manifest.start_url`    | `/monitor-sizes/` |
| Manifest `scope`     | `vite.config.js`, `manifest.scope`        | `/monitor-sizes/` |
| Service worker scope | generated `registerSW.js` (from the base) | `/monitor-sizes/` |

All four come from one constant in `vite.config.js`:

```js
const base = process.env.BASE_PATH ?? '/monitor-sizes/'
```

Change the repository name and update that default. For a root deployment (a custom
domain or a `<owner>.github.io` repository), build with `BASE_PATH=/`. The Playwright
config and the e2e specs assume `/monitor-sizes/`, so run e2e only with the default
base, or update `BASE_URL` in `playwright.config.js` and `APP_PATH` in
`tests/e2e/pwa.spec.js` as well.

The manifest's icon paths are relative (`pwa-192x192.png`), so they resolve against the
manifest URL and follow the base automatically.

## One-time repository setup

The repository owner does this once. The workflows cannot do it.

1. **Visibility.** The repository must be public, or be on a GitHub plan that allows
   Pages on private repositories. The PRD requires a public, MIT-licensed repo.
2. **Pages source.** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
   Until this is set, `actions/deploy-pages` fails.
3. **Environment rules.** Settings → Environments → `github-pages`. Its deployment branch
   rules must allow the branches that deploy: `main` and `claude/blissful-lovelace-9afpsd`.
   If the rule is limited to protected branches, a deploy from a branch that is not
   protected is refused. Add the branch, or remove the restriction.
4. **First run.** Push to `main`, or open the Actions tab and run "Deploy to GitHub Pages"
   manually. The site appears at `https://<owner>.github.io/monitor-sizes/`.

## Running the checks locally

Install dependencies once, with the pnpm and Node versions above:

```sh
pnpm install --frozen-lockfile
```

Run the same checks CI runs, in the same order:

```sh
pnpm format:check
pnpm coverage
pnpm build
pnpm size
pnpm e2e
```

Or the combined `pnpm check` (format, coverage, build, size). It does not run e2e.

### End-to-end tests

`pnpm e2e` runs `tests/e2e/*.spec.js` in Chromium. The `webServer` entry in
`playwright.config.js` runs `pnpm build && pnpm preview --port 4173 --strictPort` and waits
for `http://localhost:4173/monitor-sizes/`.

- The first time on a machine, install the browser: `pnpm exec playwright install chromium`.
  If the sandbox provides browsers elsewhere, set `PLAYWRIGHT_BROWSERS_PATH`.
- Outside CI, an already-running server on port 4173 is reused. A stale preview server
  therefore tests an old build. Stop it first, or run `CI=1 pnpm e2e` to force a fresh
  build and server.
- CI sets `CI`, which also enables one retry and an HTML report in `playwright-report/`.
  Open it with `pnpm exec playwright show-report`.

### Bundle size

`pnpm size` measures the **first load** and fails when it exceeds 51200 bytes (50 kB, where
1 kB is 1024 bytes). It reads `dist/`, so it needs a build first. With no build, or with a
build that has no locale catalogue, it fails with a message, so it cannot pass silently.
To measure a build made into another folder, run `pnpm size -- --dir <folder>`.

The first load is what the browser downloads before first paint:

- every script that `dist/index.html` references (`<script src>` and
  `<link rel="modulepreload">`), and every chunk those scripts import statically. This is the
  entry chunk, the Vite runtime and the service-worker registration;
- the **largest locale catalogue**, with the chunks it imports statically. The app loads one
  language at start (`src/main.jsx`), so only one is counted. Vite names a chunk after its
  folder, so a language chunk is `en-<hash>.js` or `cs-<hash>.js`, one for each folder in
  `src/i18n/locales/`.

Lazy chunks are listed in a second table and are **not** counted. They are the other language,
and the views and dialogs that a first paint does not need: onboarding, the Compare view and
its data, the display actions, the Add display dialog, and the settings dialog with its data
transfer. Each loads the first time it is wanted, through `useLazyModule`
(`src/lib/use-lazy-module.js`, used in `src/app.jsx`). Workbox precaches them, so they work
offline (see [`I18N.md`](./I18N.md), "Loading the catalogues"). The shared chunk named
`button-*.js` holds the Preact runtime and the icons that the entry and the lazy chunks both
use. Output looks like this, with the numbers of the build at the time of writing:

```
First load (counted)
File                                      Gzip
----------------------------------------------
index-D0EpYqZK.js                     25.53 kB
rolldown-runtime-DK3Fl9T5.js           0.15 kB
button-ChYhX0pc.js                     6.88 kB
format-CSVUwSdG.js                     0.89 kB
registerSW.js                          0.13 kB
cs-CWqgBfNX.js  (largest locale)       6.10 kB
----------------------------------------------
Total                                 39.69 kB

Lazy, loaded on demand (not counted)
----------------------------------------------
add-display-dialog-Y1M86xQP.js         0.28 kB
add-display-form-L0VoIQB8.js           3.36 kB
compare-data-DEbxoIPb.js               2.71 kB
compare-view-BZpnEQqR.js               4.96 kB
data-transfer-Ddrl4-DM.js              0.95 kB
display-actions-DzFQCJVe.js            0.93 kB
en-D5LiQkIm.js                         5.40 kB
onboarding-dMBmPe-p.js                 2.38 kB
settings-panel-BWicen1V.js             2.07 kB

OK: 39.69 kB of 50.00 kB budget
```

Service-worker and Workbox files (`sw.js`, `workbox-*.js`) are excluded, because Workbox
writes them outside the app's own chunks.

If a legitimate change pushes the bundle over budget, do not raise the budget in the same
change. Find out what grew first. The budget is the PRD's, and changing it needs a PRD decision.
The cheapest lever is to load a view or dialog that only some visits open on demand, as the
Compare view and the dialogs already are (`useLazyModule` in `src/app.jsx`). Before these
were lazy, the first load was 48.51 kB.

The unit tests for the guard live in `scripts/check-bundle-size.test.js`:

```sh
pnpm vitest run scripts/check-bundle-size
```

### Icons

The PWA icons are PNGs generated from `public/favicon.svg`, so they are not hand-edited.
After changing the SVG, regenerate them and commit the PNGs with it:

```sh
node scripts/generate-icons.js
```

The script uses the Playwright Chromium that the project already installs, so it needs no
image library. It writes four files to `public/`:

| File                   | Size      | Notes                                                                      |
| ---------------------- | --------- | -------------------------------------------------------------------------- |
| `pwa-192x192.png`      | 192 × 192 | `any` purpose, transparent outside the rounded corners                     |
| `pwa-512x512.png`      | 512 × 512 | `any` purpose, transparent outside the rounded corners                     |
| `apple-touch-icon.png` | 180 × 180 | opaque, because iOS shows transparency as black                            |
| `maskable-512x512.png` | 512 × 512 | opaque full-bleed; artwork fills the central 80 % (the maskable safe zone) |

The maskable icon is opaque and its artwork stays inside the central 80 % so that
Android's circular or squircle masks cannot crop the monitors.

## Troubleshooting

- **`deploy-pages` fails.** Check that the Pages source is GitHub Actions (step 2 above).
- **Deploy refused for a branch.** Check the `github-pages` environment's deployment
  branch rules (step 3 above).
- **App loads but is blank under `/monitor-sizes/`.** Check the base path rule above. A
  wrong base makes the JS and CSS URLs point at the domain root, which returns 404.
- **Install prompt missing.** Check the manifest's `start_url`, `scope` and icons. The
  e2e manifest spec covers these, so run `pnpm e2e`.
- **Offline reload fails locally.** The service worker only controls the page after a
  reload. Run `pnpm build` again after a change, so the precache matches the new files.
