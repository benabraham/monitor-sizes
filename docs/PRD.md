# Pixely a monitory — PWA PRD

Oct 30, 2026 · @Daniel

## Summary and problem

Turn the "pixely a monitory" spreadsheet into an installable, offline, open-source (MIT) PWA that answers one question fast: **how will this display look and feel compared to the displays I know, from which distance, and at which OS scale does it feel right?**

Today the sheet holds about 50 displays, from 13.3″ laptops to a 55.5″ 10080 × 4320 panel. Each row has only four inputs: name, diagonal, width px and height px. Every other column is derived against one reference row ticked in column A. The most valuable part is the scaling matrix: for scales 100–200 %, it shows the logical resolution and effective PPI, filtered to a "feels like" PPI window (90–105) and a minimum logical width (1024 px).

What the spreadsheet does badly:

- Hard to use on a phone, for example in a shop or reading a spec sheet.
- Single reference selection is a convention only. Two ticked rows silently pick the first one.
- Adding a display means copying formula rows by hand.
- Physical size difference is shown as numbers only, when it is really a visual question.
- Column help lives on a separate sheet ("halp").
- You can't share a specific comparison as a link.

## Goals and non-goals

**Goals**

1. Reproduce every calculation the sheet does, with identical results, except for the fixes listed under Calculation spec.
2. Let users keep a set of **familiar displays**, ones they own or have used, each with the distance they sit at. Every comparison is anchored to these.
3. Compare any number of displays at once, with a visualization that is always on screen rather than optional.
4. Compare by **viewing angle**, not just physical size. For example: "this 32″ 4K looks like your 24″ FHD if you sit at 60 cm instead of 40 cm."
5. Make the scaling recommendation (which scale gives \~90–105 effective PPI) the headline output per display.
6. Support metric and imperial units (metric by default), and a Czech and English UI.
7. Work fully offline once installed.
8. Let users add their own displays from anywhere in the app, without touching code.

**Non-goals (v1)**

- No accounts, sync or backend.
- No price, panel type, refresh rate, HDR or colour data. This is geometry only.
- No scraping of retailer or manufacturer specs.
- No measurement of the user's real screen. Browsers expose logical pixels and scale, but not the physical diagonal. No curved-screen correction either: all screens are treated as flat.

## Users and use cases

The primary user is a developer, designer or power user choosing a monitor or laptop, who already owns a display they know well. Secondary users are people sent a shared comparison link.

| As a…                 | I want to…                                                                                               | So that…                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| buyer                 | mark several displays I know (my desk monitor, my laptop, the office screen) and how far I sit from each | candidates are described against experiences I actually have       |
| buyer                 | switch which familiar display is the active baseline with one tap                                        | I can ask "vs my laptop" and "vs my monitor" without re-setup      |
| buyer                 | see which scale makes a candidate feel like \~100 PPI                                                    | I know my usable workspace before I buy                            |
| buyer                 | filter to displays that hit my PPI window at some scale                                                  | I only see realistic candidates                                    |
| buyer                 | see all compared displays drawn together, always                                                         | I judge size differences at a glance, not by reading numbers       |
| buyer                 | see at which distance a candidate looks as big, as sharp, or with text as large as my familiar display   | I can tell whether a bigger screen just means sitting further back |
| buyer                 | set how far I'd sit from a candidate and see it drawn as it would appear from my seat                    | I can check it against my real desk depth                          |
| buyer in a shop       | add a display from its spec sheet in under 30 s                                                          | I can evaluate a model that isn't in the list                      |
| user on Linux/Wayland | see fractional scales like 110 % and 175 %                                                               | the results match what my compositor offers                        |
| user in the US or UK  | switch to inches                                                                                         | distances and sizes read naturally                                 |
| sharer                | send a link that opens the same familiar set, candidates, distances and filters                          | a friend sees exactly my comparison                                |
| any user              | read what each metric means in place                                                                     | I don't need a separate help sheet                                 |

## Functional requirements

Everything ships together in v1, all at once. **P0** = release blocker, **P1** = ships in v1 but doesn't block it.

| ID  | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Priority |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F1  | A display record stores only inputs: name, diagonal (inch), width px, height px, plus an optional tag (laptop / monitor / ultrawide). All metrics are derived.                                                                                                                                                                                                                                                                                                       | P0       |
| F2  | **Familiar displays**: the user marks one or more displays as familiar, each with their usual viewing distance (default 60 cm for monitors, 45 cm for laptops) and the OS scale they use on it. If their display isn't in the list, they add it right there (F17). The set persists locally and is chosen during onboarding. There is no built-in default: the app asks which displays the user is familiar with, and at least one must be chosen before continuing. | P0       |
| F3  | **Active baseline**: exactly one familiar display drives the relative columns (% and diff) at a time. Switching is one tap. The other familiar displays stay visible as secondary references. The first familiar display picked during onboarding becomes the baseline.                                                                                                                                                                                              | P0       |
| F4  | List view shows per display: diagonal, PPI, relative pixel size, aspect label, resolution, physical width × height, size diff vs baseline, area and ratio, raw megapixels and ratio (native, unscaled).                                                                                                                                                                                                                                                              | P0       |
| F5  | Sort by any metric. Default sort is PPI descending, matching the sheet.                                                                                                                                                                                                                                                                                                                                                                                              | P0       |
| F6  | Scaling matrix per display for every scale in the active preset (F21): logical resolution, effective PPI, effective workspace. Browse shows only scales inside the comfort window; Compare shows every scale in the preset with the comfortable ones highlighted (not by colour alone).                                                                                                                                                                              | P0       |
| F7  | Editable comfort window: min and max effective PPI (default 90–105) and min logical width (default 1024 px). A toggle switches the rule between PPI (default) and logical PPD (F23); exactly one rule is active at a time and it drives the filter (F8), the best-scale chip and the matrix highlighting.                                                                                                                                                            | P0       |
| F8  | Filter toggle: "only displays with at least one comfortable scale".                                                                                                                                                                                                                                                                                                                                                                                                  | P0       |
| F9  | Text search by name and filter by tag, aspect and diagonal range.                                                                                                                                                                                                                                                                                                                                                                                                    | P1       |
| F10 | **Compare**: any number of displays (practical limit about 8). All familiar displays are included automatically and can be hidden individually.                                                                                                                                                                                                                                                                                                                      | P0       |
| F11 | **Visualization is always shown** in Compare: every compared display drawn together, on desktop beside the metrics and on phones pinned above them. It cannot be collapsed away.                                                                                                                                                                                                                                                                                     | P0       |
| F12 | Visualization has two modes: **Physical** (true relative size, one length scale) and **As seen** (relative angular size at each display's viewing distance).                                                                                                                                                                                                                                                                                                         | P0       |
| F13 | **Viewing distance** per compared display, editable. A candidate defaults to the active baseline's distance. Each compared display also has an editable **scale**: familiar displays use their saved scale; a candidate starts at its best comfortable scale (closest to the middle of the comfort window), falling back to the scale nearest the window if none fits.                                                                                               | P0       |
| F14 | **Angular metrics** per display: horizontal and vertical field of view (°), pixels per degree (PPD), and logical pixels per degree at the chosen scale.                                                                                                                                                                                                                                                                                                              | P0       |
| F15 | **Equivalent distance** vs the baseline, three variants: same apparent size, same sharpness (PPD), same text/UI size at the chosen scales. One tap applies a variant to the candidate's distance.                                                                                                                                                                                                                                                                    | P0       |
| F16 | **Units and language**: metric (default) or imperial, and a Czech or English UI (default from the browser language) with locale number formatting, such as decimal commas in Czech. Both are remembered locally and stored in the URL.                                                                                                                                                                                                                               | P0       |
| F17 | Add your own display from onboarding, the familiar picker, Browse and Compare, and mark it familiar in the same step. Edit and delete custom displays, stored locally. Built-in displays can be hidden but not edited.                                                                                                                                                                                                                                               | P0       |
| F18 | Import and export custom displays and the familiar set as JSON.                                                                                                                                                                                                                                                                                                                                                                                                      | P1       |
| F19 | URL holds the full view state: familiar set, baseline, compared set, distances, scales, units, comfort window, filters, sort. Opening the link restores it. Custom displays referenced by the state travel inside the link as their inputs (name, diagonal, width, height), so the recipient sees the same comparison and can save them as their own with one tap.                                                                                                   | P0       |
| F20 | Inline help per metric, replacing the "halp" sheet.                                                                                                                                                                                                                                                                                                                                                                                                                  | P1       |
| F21 | Scale presets: a radio group switches between Windows (100–200 % in 25 % steps), macOS ("looks like" widths 1280, 1440, 1512, 1680, 1728, 1920, 2048, 2304, 2560, 3008 and 3200 px; per display s = native width ÷ looks-like width, shown only for 1 ≤ s ≤ 2) and Linux/Wayland (100, 110, 125, 150, 175, 200 %). It defaults to the detected OS, and users can add and remove custom scales such as 133 % or 300 %.                                                | P0       |
| F22 | "Like my screen" helper that pre-fills logical resolution and scale from the browser and asks only for the diagonal.                                                                                                                                                                                                                                                                                                                                                 | P1       |
| F23 | Comfort window expressed in logical pixels per degree, so it accounts for viewing distance. Selected via the F7 toggle; in Browse it uses the active baseline's distance.                                                                                                                                                                                                                                                                                            | P1       |

## Calculation spec

All metrics derive from w, h (px), d (inch diagonal), the active baseline (subscript ref) and scale s. Results must match the sheet to the displayed precision, except where a fix below says otherwise.

| Metric                         | Definition                                                                                                                                                                      | Display                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| PPI                            | √(w² + h²) / d                                                                                                                                                                  | integer                              |
| Relative pixel size            | PPI\_ref / PPI − 1                                                                                                                                                              | signed %, "same" when it rounds to 0 |
| Aspect label                   | w:h reduced by GCD, mapped to a marketing name: 16:9, 8:5 → 16:10, 7:3 → 21:9 (exact), 64:27 and 43:18 → “21:9” (quoted = approximate), 32:9, 12:5 → 24:10, 21:10, 16:5 → 32:10 | label, or "1.55:1" if unmapped       |
| Width, height (cm)             | px / PPI × 2.54                                                                                                                                                                 | integer                              |
| Width, height diff (cm)        | cm − cm\_ref                                                                                                                                                                    | signed integer, bold if positive     |
| Area (dm²)                     | width cm × height cm / 100                                                                                                                                                      | integer                              |
| Area ratio                     | area / area\_ref − 1                                                                                                                                                            | signed %                             |
| Raw megapixels                 | w × h / 10⁶                                                                                                                                                                     | 1 decimal                            |
| Raw megapixel ratio            | Mpix / Mpix\_ref − 1                                                                                                                                                            | signed %                             |
| Logical resolution at s        | w / s × h / s                                                                                                                                                                   | rounded to 10 px for display only    |
| Effective PPI at s             | PPI / s                                                                                                                                                                         | integer                              |
| Comfortable at s               | effective PPI within \[min, max\] and w / s ≥ min width                                                                                                                         | boolean                              |
| Workspace at s (scaled pixels) | (w / s) × (h / s) / 10⁶                                                                                                                                                         | 1 decimal                            |

With the macOS preset, s is derived per display as w / looks-like width, so the matrix rows are looks-like resolutions rather than a shared percentage grid.

**Signed values.** Any signed value that displays as 0 at its precision reads "same", never "+0 %" or "− 0". (The sheet shows "same" only for an exact 0; no current row is affected, so the tests still match.)

**Angular metrics.** v is the viewing distance in the same length unit as W and H. Equal angle means equal L / v, so the size match is exact. The sharpness and text matches use the small-angle approximation, which is off by under 0.1 % at desk distances.

| Metric                                  | Definition                                                                       | Display            |
| --------------------------------------- | -------------------------------------------------------------------------------- | ------------------ |
| Horizontal / vertical field of view     | 2 · atan(W / 2v), 2 · atan(H / 2v)                                               | degrees, 1 decimal |
| Pixels per degree (PPD)                 | ≈ PPI · v(in) · π / 180                                                          | integer            |
| Logical PPD at s                        | PPD / s                                                                          | integer            |
| Equivalent distance, same apparent size | v\_ref × L / L\_ref, where L is height by default (width or diagonal selectable) | length             |
| Equivalent distance, same sharpness     | v\_ref × PPI\_ref / PPI                                                          | length             |
| Equivalent distance, same text/UI size  | v\_ref × (PPI\_ref / s\_ref) / (PPI / s)                                         | length             |

Worked example, used as a test fixture. Baseline is a 24″ FHD (92 PPI) at 60 cm and 100 %. Candidate is a 32″ 4K (138 PPI) at 150 %.

| Match              | Candidate distance | Reading                                                 |
| ------------------ | ------------------ | ------------------------------------------------------- |
| Same apparent size | 80 cm              | 33 % taller, so sit 20 cm further back to see it as big |
| Same sharpness     | 40 cm              | 1.5× sharper at equal distance                          |
| Same text/UI size  | 60 cm              | at 150 %, text matches at your current distance         |

**Units.** Metric is the default and imperial is the alternative. The switch converts physical sizes (cm ↔ in), diffs, area (dm² ↔ in²) and viewing distances (cm ↔ in). Diagonal and PPI stay inch-based in both systems, following industry convention. Angles are always degrees. Values are stored in one canonical unit (inches) and converted only for display, so switching never accumulates rounding.

**Sheet issues to fix in the port**

- **Workspace megapixels are overstated.** The sheet divides Mpix by s, but logical pixels scale with s². Example: 42″ 4K at 110 % shows 7.5 Mpix, while 3490 × 1960 is about 6.8. Decided: keep two separate comparisons. Raw megapixels compare native panels with no scaling. Workspace uses the s² formula, per scale. The 5 Mpix cut-off is dropped, because the comfort window and min logical width already hide unusable scales, such as a 6K panel scaled down to 720p-like sizes.
- **Aspect labels**: float equality plus a 1.5–1.6 catch-all labels MacBook panels (≈1.55:1) as "16:9". Use GCD reduction instead.
- **Single reference**: the familiar set replaces the checkbox, and exactly one active baseline is enforced in the UI.
- **Naming**: 3440 × 1440 is "2K UW" at 34″ but "4K UW" at 40″. Normalise names in the seed data, including `ENDGAME 8K+`, `ENDGAME 8K`, `6K-`, `4K-`, `FullHD+W`, `QHD` for 5120 × 1440, the long MacBook names and `2K+ (MB Air M1; …)`.
- **Redundant ABS()** in the area and megapixel ratios. Drop it; the results don't change.

Acceptance: a unit test suite seeded from the current sheet values (frozen in `data/sheet-snapshot/`, reference row 42″ 4K), asserting every row and metric within rounding tolerance. The 42″ 4K reference is a test fixture only; the app has no default baseline.

## UX

The app has three views. On first launch, onboarding asks which displays the user is familiar with: they pick one or more from the list, or add their own if it's missing, then set the distance and scale for each. At least one is required and onboarding can't be skipped; nothing is preselected. Distance and scale are prefilled per display, and the unit system is chosen here too.

1. **Browse.** A dense, sortable table on desktop. On phones it becomes cards: name, diagonal, resolution, PPI and the best comfortable scale as a chip, for example "125 % → 3070 × 1730". Familiar displays sit in a pinned strip at the top; the active baseline is in the accent colour. A sticky toolbar holds search, filters, the comfort window, and the units, language and scale-preset switches.
2. **Compare.** Any number of displays, with the familiar ones included by default:
   - **The visualization is always on screen.** On desktop it sits in a sticky panel beside the metrics. On phones it is pinned at the top and the metrics scroll beneath it.
   - The visualization has a **Physical ↔ As seen** toggle. Physical draws outlines to one length scale, aligned bottom-centre like monitors on a desk. As seen draws each outline at its angular size from its viewing distance, so a bigger screen further back can look identical. Familiar displays are dashed and candidates solid, and every outline is labelled.
   - A distance control per display: a slider plus a number field, with "match size", "match sharpness" and "match text size" buttons that apply the equivalent distance to the baseline.
   - A metric grid with the baseline column first, including angular metrics.
   - The full scaling matrix with comfortable cells highlighted.
3. **Add display.** Four fields: name, diagonal, width px and height px. A live preview of PPI, aspect and size shows while typing, plus presets for common resolutions. An "I know this one" checkbox adds it to the familiar set with a distance and scale.

Key interactions:

- A star on any display marks it as familiar. Tapping a familiar chip makes it the baseline.
- Long-press or a checkbox adds a display to compare.
- An equivalence line under each candidate reads in plain words, for example: "Looks like your 24″ FHD at 80 cm · as sharp at 40 cm · same text size at 60 cm (150 %)".
- Every metric header has a help popover.
- "Copy link" shares the current state.
- Signed values use the sheet's convention: "+2 %", "−58", "same".
- The UI is in Czech and English, defaulting to the browser language, with a switch in the toolbar. An "Add display" button is always one tap away in Browse and Compare.

## Non-functional requirements

| Area            | Requirement                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline         | Everything works offline after the first visit. The service worker precaches the app shell and seed data, and new versions apply on the next launch.                       |
| Install         | A valid web app manifest with standalone display, maskable icons and theme colour. Installable in Chromium browsers and on iOS and Android home screens.                   |
| Performance     | Interactive in under 1 s on a mid-range phone. Recalculating 200 displays after any input takes under 16 ms. JS bundle under 50 kB gzipped.                                |
| Storage         | Custom displays, the familiar set (with distances and scales) and preferences persist locally (IndexedDB). Losing storage only loses custom entries, never breaks the app. |
| Accessibility   | WCAG 2.2 AA. Full keyboard use of table, compare and form. The overlay has a text equivalent. Colour is never the only signal.                                             |
| Browser support | Baseline 2024. Not allowed: CSS anchor positioning, hover-triggered popovers (`interestfor`) and `field-sizing`. The Popover API, `:has()` and container queries are fine. |
| Theming         | Light and dark, following the system setting.                                                                                                                              |
| Privacy         | No analytics, cookies or network calls beyond the static host.                                                                                                             |

One caveat: Firefox desktop's support for installing PWAs is limited, so it gets a cached website rather than an installed app.

**Hosting and licence.** The static build is published to GitHub Pages from a public, MIT-licensed repo, deployed by a GitHub Actions workflow. Without a custom domain, Pages serves the app under `/<repo>/`. The Vite base path, the manifest's `start_url` and `scope`, and the service worker scope must all follow that base path. New built-in displays are contributed by pull request to the seed JSON.

## Data source and maintenance

**Decision: a bundled JSON seed plus user-local custom displays.** The spreadsheet is retired after a one-off import script converts its rows. From then on, the seed JSON in the repo is the source of truth, and new built-in displays arrive as pull requests.

Rejected options:

- Syncing from the sheet, at build time or runtime: we're moving off it.
- A Django backend: overkill for static data.
- No-code tools over the sheet: no control over the scaling and angular UX.

The seed format is inputs only. Derived columns are never stored.

## Release, success metrics and decisions

Everything is built and released at once in v1, with no phases and nothing deferred. The release is gated on the success metrics below plus complete Czech and English strings.

**Success metrics**

- 100 % of sheet rows match the port within rounding, verified by tests.
- Answering "which scale should I use on display X?" takes under 10 s from a cold launch on a phone.
- Adding a new display from a spec sheet takes under 30 s.
- The app passes an offline reload and an install check in Chromium.

**Decisions**

| Question                          | Decision                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Workspace values                  | Raw pixels and scaled workspace (s²) are separate comparisons. No 5 Mpix cut-off; the comfort window hides unusable scales. |
| Scale presets per OS              | Yes. A radio group switches between Windows, macOS and Linux/Wayland presets, and custom scales can be added (F21).         |
| Default viewing distance          | 60 cm for monitors, 45 cm for laptops.                                                                                      |
| Same apparent size match          | By height by default; width or diagonal selectable.                                                                         |
| Curved screens                    | Treated as flat.                                                                                                            |
| Data source                       | JSON seed in the repo. The Google Sheet is retired.                                                                         |
| UI language                       | Czech and English in v1.                                                                                                    |
| Release scope                     | All features ship together in v1.                                                                                           |
| Hosting and licence               | GitHub Pages, MIT-licensed open source.                                                                                     |
| Default baseline                  | None. Onboarding requires at least one familiar display; the first one picked becomes the baseline.                         |
| Custom displays in shared links   | Embedded in the URL as inputs; the recipient can save them with one tap.                                                    |
| macOS preset                      | "Looks like" widths; s = native width ÷ looks-like width, per display, 1× to 2×.                                            |
| Comfort rule                      | Toggle between PPI (default) and logical PPD; one rule active at a time.                                                    |
| Matrix outside the comfort window | Hidden in Browse, shown and highlighted in Compare.                                                                         |
| Candidate scale in Compare        | Best comfortable scale, editable; familiar displays use their saved scale.                                                  |
| "same" label                      | Whenever the value rounds to 0.                                                                                             |
