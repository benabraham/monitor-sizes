# Calculations

This is the maths reference for Pixely a monitory. It lists every formula the app uses, with
its symbols and units, the rounding rules, and worked examples.

The formulas come from the Calculation spec in [`PRD.md`](./PRD.md). They are implemented as
pure functions in `src/lib/calc/` (raw, unrounded results) and in `src/lib/format.js` and
`src/lib/math.js` (rounding and display). The examples below were computed with those modules.
The acceptance test in `src/lib/calc/sheet-fixture.test.js` checks the whole chain against the
original spreadsheet (section 12).

## Contents

1. [Inputs, symbols and units](#1-inputs-symbols-and-units)
2. [Rounding and display](#2-rounding-and-display)
3. [Display metrics](#3-display-metrics)
4. [Aspect label](#4-aspect-label)
5. [Relative metrics](#5-relative-metrics)
6. [OS scales](#6-os-scales)
7. [Comfort window and best scale](#7-comfort-window-and-best-scale)
8. [Angular metrics](#8-angular-metrics)
9. [Equivalent distances](#9-equivalent-distances)
10. [Unit conversion](#10-unit-conversion)
11. [Changes from the sheet](#11-changes-from-the-sheet)
12. [Acceptance test](#12-acceptance-test)

## 1. Inputs, symbols and units

Each display stores only its inputs: name, diagonal, width and height (PRD F1). Every other
value is derived when it is needed.

| Symbol   | Meaning                                                 | Unit in `lib/calc` |
| -------- | ------------------------------------------------------- | ------------------ |
| `w`, `h` | Native width and height                                 | px                 |
| `d`      | Diagonal                                                | in                 |
| `PPI`    | Pixels per inch                                         | px / in            |
| `s`      | OS scale factor, so 1.25 means 125 %                    | (no unit)          |
| `v`      | Viewing distance                                        | in                 |
| `W`, `H` | Physical width and height                               | in                 |
| `A`      | Physical area                                           | in²                |
| `L`      | Length used for the same-size match (height by default) | in                 |
| `PPD`    | Pixels per degree at distance `v`                       | px / °             |
| `PPD_s`  | Logical pixels per degree, `PPD / s`                    | px / °             |
| `ref`    | Subscript for the active baseline                       | (no unit)          |

Rules that apply everywhere:

- Lengths are stored in inches and areas in square inches. Scales are factors (1.25, not 125).
  Conversion to centimetres, dm² and percentages happens only in the format layer.
- Diagonal and PPI stay in inches in both unit systems. Angles are always in degrees.
- `CM_PER_INCH = 2.54` exactly. 1 in² = 6.4516 cm² = 0.064516 dm².
- Default viewing distance: 60 cm (23.622 in) for monitors and ultrawides, and 45 cm (17.717 in)
  for laptops. A display without a tag counts as a monitor.

## 2. Rounding and display

### 2.1 `round()`

`round({ value, digits })` in `src/lib/math.js` rounds half away from zero, like Google Sheets
`ROUND()`. A tiny epsilon (`Number.EPSILON` scaled by the value) absorbs binary floating-point
error, so a decimal half rounds the way a person expects.

- `round(2.5)` is 3, and `round(-2.5)` is -3. `Math.round(-2.5)` gives -2, which is why it is not
  used.
- `round({ value: 1.005, digits: 2 })` is 1.01, although 1.005 is stored as 1.00499….
- `round({ value: 3072, digits: -1 })` is 3070. This rounds logical resolutions to tens.
- The result is never `-0`.

### 2.2 Display precision

The app rounds every value only when it displays it. The precision is:

| Quantity                    | Shown as                                 | Example     |
| --------------------------- | ---------------------------------------- | ----------- |
| PPI                         | integer                                  | 163         |
| Relative pixel size         | signed integer percent                   | −44 %       |
| Width, height (metric)      | whole centimetres                        | 60 cm       |
| Width, height (imperial)    | inches, 1 decimal                        | 23.5 in     |
| Width, height difference    | signed, whole cm (1 decimal in imperial) | +7 cm       |
| Area                        | whole dm² (imperial: whole in²)          | 20 dm²      |
| Area ratio, megapixel ratio | signed integer percent                   | +27 %       |
| Raw megapixels, workspace   | 1 decimal                                | 8.3, 3.7    |
| Logical resolution          | rounded to 10 px, per side               | 2190 × 1230 |
| Effective PPI               | integer                                  | 93          |
| Scale                       | integer percent                          | 175 %       |
| Field of view               | degrees, 1 decimal                       | 53.0°       |
| PPD, logical PPD            | integer                                  | 67, 45      |
| Viewing distance (metric)   | whole centimetres                        | 80 cm       |
| Viewing distance (imperial) | inches, 1 decimal                        | 31.5 in     |

Logical resolutions are only rounded for display. The stored values stay unrounded.

### 2.3 Signed values and "same"

A negative value uses U+2212 (`−`), never a hyphen-minus. A positive value gets a leading `+`
and no space. A value that rounds to zero at its shown precision is displayed as **same** (or
"stejné" in Czech), never as `+0 %` or `−0`. The sheet used "same" only for an exact zero. The
PRD changed this rule (section 11).

### 2.4 Other display rules

- A value that is not a finite number (`NaN`, `±Infinity`) shows as an em dash (`—`).
- A space (U+00A0) separates a number from `%` and from a unit, so they never wrap. Resolutions
  use `×` (U+00D7) with normal spaces around it, and no thousands separator.

## 3. Display metrics

From `src/lib/calc/geometry.js`:

```
PPI  = √(w² + h²) / d
W    = w / PPI                 H = h / PPI
A    = W × H                   (in²)
Mpix = w × h / 10⁶             (native, unscaled)
```

Worked example, 27″ 3840 × 2160:

- Diagonal in pixels: √(3840² + 2160²) = √19,411,200 = 4,405.81 px.
- PPI = 4,405.81 ÷ 27 = **163.18**.
- W = 3840 ÷ 163.18 = 23.533 in = **59.8 cm** (the app shows 60 cm).
- H = 2160 ÷ 163.18 = 13.237 in = **33.6 cm** (the app shows 34 cm).
- A = 23.533 × 13.237 in² = 311.5 in² = **20.1 dm²** (the app shows 20 dm²).
- Mpix = 3840 × 2160 ÷ 10⁶ = 8.2944, shown as **8.3**.

Reference check: 42″ 3840 × 2160 has PPI = 104.90034…, which matches the value in
`data/sheet-snapshot/README.md`.

## 4. Aspect label

From `src/lib/calc/aspect.js`. The width and height are reduced by their greatest common
divisor, and the reduced ratio is looked up in a table:

| Reduced ratio | Label | Quoted (approximate)? |
| ------------- | ----- | --------------------- |
| 16:9          | 16:9  | no                    |
| 8:5           | 16:10 | no                    |
| 7:3           | 21:9  | no (exact)            |
| 64:27         | 21:9  | yes, “21:9”           |
| 43:18         | 21:9  | yes, “21:9”           |
| 32:9          | 32:9  | no                    |
| 12:5          | 24:10 | no                    |
| 21:10         | 21:10 | no                    |
| 16:5          | 32:10 | no                    |

Any other ratio gets its raw value as the label, `(w/h).toFixed(2) + ":1"`, with `isMapped: false`.

Examples:

- 3840 × 2160: gcd 240, reduced 16:9 → **16:9**.
- 2560 × 1600: gcd 320, reduced 8:5 → **16:10**.
- 10080 × 4320: gcd 1440, reduced 7:3 → **21:9** (exact).
- 3440 × 1440: gcd 80, reduced 43:18 → **“21:9”** (quoted, approximate).
- 3456 × 2234: gcd 2, reduced 1728:1117, which is not in the table → **1.55:1**.
- 3024 × 1964 → 1.54:1, and 2560 × 1664 → 1.54:1 (both unmapped).

The sheet used float equality on the ratio, plus a catch-all `1.5 < r < 1.6 → "16:9"`. That
mislabelled four MacBook panels as "16:9". The GCD mapping labels them with their real ratio
instead.

The `toFixed(2)` in the raw label rounds the binary value directly, not through `round()`. For
the 51 built-in displays, both give the same label, so no current label is affected.

## 5. Relative metrics

From `src/lib/calc/geometry.js`. Every value is relative to the active baseline (PRD F3):

```
relative pixel size = PPI_ref / PPI − 1
width difference    = W − W_ref          (in)
height difference   = H − H_ref          (in)
area ratio          = A / A_ref − 1
megapixel ratio     = Mpix / Mpix_ref − 1
```

Sign convention: a positive relative pixel size means the display's pixels are larger
(coarser) than the baseline's. A negative one means they are smaller and smoother.

Worked example, 27″ 4K against a 24″ Full HD baseline (PPI 91.79, W = 20.92 in, H = 11.77 in):

- Relative pixel size: 91.79 ÷ 163.18 − 1 = −0.4375, shown as **−44 %**. The 27″ 4K's pixels are
  44 % smaller than the baseline's, in linear size.
- Width difference: 59.77 cm − 53.13 cm = +6.64 cm, shown as **+7 cm**.
- Height difference: 33.62 cm − 29.89 cm = +3.73 cm, shown as **+4 cm**.
- Area ratio: 20.10 dm² ÷ 15.88 dm² − 1 = +26.6 %, shown as **+27 %**.
- Megapixel ratio: 8.2944 ÷ 2.0736 − 1 = +300 %.

The sheet wrapped the area and megapixel ratios in `ABS()`. Both ratios are positive, so `ABS`
changes nothing, and the app drops it (section 11).

## 6. OS scales

### 6.1 Scale lists

From `src/lib/calc/scaling.js`. `getScaleOptions()` builds the list for a display:

| Preset    | Values                                                                                  |
| --------- | --------------------------------------------------------------------------------------- |
| `windows` | 1, 1.25, 1.5, 1.75, 2                                                                   |
| `linux`   | 1, 1.1, 1.25, 1.5, 1.75, 2                                                              |
| `macos`   | "looks like" widths 1280, 1440, 1512, 1680, 1728, 1920, 2048, 2304, 2560, 3008, 3200 px |

Custom scales (factors, 0.5 to 4, rounded to 4 decimals) are added to any preset. The list is
sorted ascending, and a duplicate keeps the preset's entry.

### 6.2 macOS "looks like" scales

For each "looks like" width `L`, the scale of a display is `s = w / L`, rounded to 4 decimals.
Only scales with `1 ≤ s ≤ 2` are kept. So the scale depends on the display's native width.

- 3024 px (MacBook Pro 14″): 1512 → 200 %, 1680 → 180 %, 1728 → 175 %, 1920 → 158 %,
  2048 → 148 %, 2304 → 131 %, 2560 → 118 %, 3008 → 101 %. The 3200 entry gives 94.5 % and is
  dropped.
- 3840 px (27″ 4K): 1920 → 200 %, 2048 → 188 %, 2304 → 167 %, 2560 → 150 %, 3008 → 128 %,
  3200 → 120 %. The 1280 to 1728 entries give more than 2× and are dropped.
- 5120 px (27″ 5K): 2560 → 200 %, 3008 → 170 %, 3200 → 160 %.

### 6.3 Parsing a custom scale

`parseScaleInput()` in `src/lib/scales.js` accepts `133`, `133 %`, `1.33` and `1,33`. It reads a
bare number of 10 or more as a percentage, and a smaller one as a factor. Results must lie in
0.5 to 4 inclusive, or the input is refused. `40` is refused (0.4), and so is `450` (4.5).

### 6.4 Logical geometry at scale `s`

```
logical width   = w / s
logical height  = h / s
effective PPI   = PPI / s
workspace Mpix  = (w / s) × (h / s) / 10⁶ = w × h / (s² × 10⁶)
logical PPD     = PPD / s                  (when a distance is set)
```

Workspace uses `s²`, because scaling shrinks both sides. The sheet divided by `s` (section 11).

27″ 4K at the Windows scales (values rounded for display):

| `s`  | Logical resolution | Effective PPI | Workspace Mpix |
| ---- | ------------------ | ------------- | -------------- |
| 1    | 3840 × 2160        | 163           | 8.3            |
| 1.25 | 3070 × 1730        | 131           | 5.3            |
| 1.5  | 2560 × 1440        | 109           | 3.7            |
| 1.75 | 2190 × 1230        | 93            | 2.7            |
| 2    | 1920 × 1080        | 82            | 2.1            |

At 150 %: 3840 ÷ 1.5 = 2560 and 2160 ÷ 1.5 = 1440. The effective PPI is 163.18 ÷ 1.5 = 108.79,
which shows as 109. The workspace is 2560 × 1440 ÷ 10⁶ = 3.686, shown as 3.7.

## 7. Comfort window and best scale

### 7.1 The comfort rule

Defaults: `minPpi` 90, `maxPpi` 105, `minPpd` 37, `maxPpd` 43 and `minWidth` 1024 px. All bounds
are inclusive. Exactly one rule is active at a time (PRD F7, F23).

- **PPI mode** (default): comfortable when `minPpi ≤ PPI / s ≤ maxPpi` and `w / s ≥ minWidth`.
- **PPD mode**: comfortable when `minPpd ≤ PPD_s ≤ maxPpd` and `w / s ≥ minWidth`, where
  `PPD_s = PPI × v × π / 180 / s`. Without a distance, the PPD rule is never met.

The default PPD window of 37 to 43 is about 90 to 105 PPI at 60 cm (90 PPI gives 37.1 PPD, and
105 PPI gives 43.3 PPD).

The distance `v` depends on where the matrix is shown:

- **Browse** uses the baseline's distance, as F23 requires.
- **Compare** uses each display's own distance: a familiar display's saved distance, then a
  candidate's setting, then the baseline's distance (`src/state/selectors.js`).

For the 27″ 4K at the default window:

| `s`  | PPI / s | In PPI window | PPD_s at 60 cm | In PPD window |
| ---- | ------- | ------------- | -------------- | ------------- |
| 1    | 163.2   | no            | 67.3           | no            |
| 1.25 | 130.5   | no            | 53.8           | no            |
| 1.5  | 108.8   | no            | 44.9           | no            |
| 1.75 | 93.2    | **yes**       | 38.4           | **yes**       |
| 2    | 81.6    | no            | 33.6           | no            |

### 7.2 The best scale

`getBestScale()` picks the scale the app recommends (PRD F13):

1. Use only rows where the active metric (`PPI / s`, or `PPD_s` in PPD mode) is a finite number.
   If none are left, the result is `null`.
2. If some rows are comfortable, pick the one whose metric is closest to the middle of the
   window, `(min + max) / 2`. That is 97.5 in PPI mode and 40 in PPD mode.
3. If no row is comfortable, pick the one closest to the window. Its score is
   `max(min − x, x − max, 0)`.
4. A tie goes to the larger logical width.

Examples:

- 27″ 4K, default window: 175 % is the only comfortable scale, so it is recommended.
- 42″ 4K (the sheet's reference row): 100 % gives 104.9 PPI. That is the only comfortable scale,
  so it is recommended.
- 13.3″ 2560 × 1600 (227 PPI): no Windows scale is comfortable. The effective PPIs are 181.6 at
  125 %, 151.3 at 150 %, 129.7 at 175 % and 113.5 at 200 %. 200 % is closest to the window, and
  it is recommended.
- 24″ Full HD at 90 cm: in PPI mode, 100 % (91.8 PPI) is comfortable and is recommended. In PPD
  mode, 100 % gives 56.8 PPD, which is above the window. 150 % gives 37.8 PPD, which is inside it,
  so 150 % is recommended.

## 8. Angular metrics

From `src/lib/calc/angular.js`.

### 8.1 Field of view

```
horizontal FOV = 2 · atan(W / (2v)) (degrees)
vertical FOV   = 2 · atan(H / (2v)) (degrees)
```

These use the exact `atan`, not an approximation.

- 24″ Full HD at 60 cm (23.622 in): W = 20.92 in gives 47.8° horizontally. H = 11.77 in gives
  28.0° vertically.
- 27″ 4K at 60 cm: W = 23.53 in gives 53.0°, and H = 13.24 in gives 31.3°.

### 8.2 Pixels per degree

```
PPD = PPI × v × π / 180        (v in inches)
```

This is the small-angle form. One degree at distance `v` spans `v × π / 180` inches, and that
times the PPI gives the number of pixels in it.

- 24″ Full HD at 60 cm: 91.79 × 23.622 × π / 180 = 37.84, shown as 38 PPD.
- 27″ 4K at 60 cm: 163.18 × 23.622 × π / 180 = 67.28, shown as 67 PPD.

The approximation is accurate. The exact angle of one pixel is `2 · atan(1 / (2 · PPI · v))`, so the
exact PPD is the reciprocal of that angle in degrees. For the 27″ 4K at 60 cm, the approximate
and exact PPD differ by about 6 × 10⁻⁹ relative. That is far below the 0.1 % bound in the PRD.

### 8.3 Logical PPD

`logical PPD = PPD / s`. For the 27″ 4K at 150 %: 67.28 ÷ 1.5 = 44.85, shown as 45.

A value of about 60 PPD is often quoted as the limit of normal 20/20 vision. The in-app help
uses it as a rule of thumb.

## 9. Equivalent distances

From `src/lib/calc/angular.js`. Each distance is the one at which the candidate matches the
baseline in one way. The baseline is `(PPI_ref, s_ref, v_ref)` and the candidate is `(PPI, s, L)`.

**Same apparent size.** For a flat screen seen head-on, `tan(θ/2) = L / (2v)`. Equal angles
therefore mean equal `L / v`, exactly:

```
sameSize = v_ref × L / L_ref
```

`L` is height by default. Width, or diagonal `√(W² + H²)`, can be chosen instead (`sizeMatchBy`).

**Same sharpness (PPD).** Equal PPD means `PPI × v` is equal, so:

```
sameSharpness = v_ref × PPI_ref / PPI
```

This uses the small-angle form, and it does not depend on the scales.

**Same text size.** One logical pixel covers `s / PPI` inches on the screen. Equal angles mean
equal `(s / PPI) / v`, so:

```
sameTextSize = v_ref × (PPI_ref / s_ref) / (PPI / s)
```

This is the same as equal logical PPD, because the logical PPD is `PPI × v / s`. So "same text size"
means "same logical pixels per degree".

**Worked example.** Baseline 24″ Full HD (PPI 91.79) at 60 cm and 100 %. Candidate 32″ 4K (PPI
137.68) at 150 %. The candidate's height is 39.85 cm, and the baseline's is 29.89 cm.

- Same size: 60 × 39.85 ÷ 29.89 = **80.0 cm**. At 80 cm the candidate covers 27.97°
  vertically, which is exactly what the baseline covers at 60 cm.
- Same sharpness: 60 × 91.79 ÷ 137.68 = **40.0 cm**.
- Same text size: 60 × (91.79 ÷ 1) ÷ (137.68 ÷ 1.5) = 60 × 91.79 ÷ 91.79 = **60.0 cm**.

The width and diagonal options also give 80.0 cm here. Both screens have a 16:9 shape, so the
width, height and diagonal all scale by the same factor. In general they differ.

## 10. Unit conversion

From `src/lib/units.js`, applied only in the format layer:

- Metric: centimetres = inches × 2.54, and dm² = in² × 0.064516.
- Imperial: inches and in², unchanged.
- The stored values are never rounded. Switching units therefore never accumulates rounding
  error.
- Diagonal and PPI stay in inches in both systems. Angles stay in degrees.

## 11. Changes from the sheet

The port reproduces the sheet exactly, except for these deliberate changes (PRD, "Sheet issues to
fix in the port").

| Topic                | Sheet                                       | App                                                           | Example                                              |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| Workspace megapixels | Mpix ÷ `s`                                  | Mpix ÷ `s²`, the logical pixel count                          | 42″ 4K at 110 %: sheet 7.5 Mpix, app 6.9 Mpix        |
| Workspace cut-off    | Blank "like Mpix" cell below 5 Mpix         | No cut-off. Only the comfort window decides what is shown     | 27″ 4K at 175 % has 2.7 Mpix, shown when comfortable |
| Aspect labels        | Float equality, plus `1.5 < r < 1.6 → 16:9` | GCD reduction and a table. Unmapped ratios keep their value   | MacBook 3456 × 2234: sheet 16:9, app 1.55:1          |
| Reference row        | One checkbox per row, first one wins        | One active baseline from the familiar set                     | Two ticked rows no longer pick silently              |
| Names                | Inconsistent                                | Normalised in the seed                                        | 3440 × 1440 is "UWQHD" at 34″ and at 40″             |
| `ABS()` in ratios    | Area and Mpix ratios wrapped in `ABS`       | Removed. The ratios are positive, so the results are the same | Area ratio +27 % is unchanged                        |
| "same"               | Exact zero only                             | Any value that rounds to zero at the shown precision          | 0.4 % shows as "same" (the sheet showed "+0 %")      |

The 42″ 4K at 110 % row needs a note. The unrounded workspace is 3840 ÷ 1.1 × 2160 ÷ 1.1 ÷ 10⁶
= 6.855 Mpix, which shows as 6.9. Computing it from the rounded logical size, 3490 × 1960 (which
is 6.84 Mpix), would give 6.8. The app uses the unrounded value.

## 12. Acceptance test

`src/lib/calc/sheet-fixture.test.js` is the acceptance test (PRD, Acceptance). It loads the frozen
sheet, `data/sheet-snapshot/monitory.values.json`, which holds the formatted values of
`monitory!A1:AK54`. The reference row is 42″ 4K (3840 × 2160), in row 45.

How it works:

1. Each sheet cell is parsed back into a number. `same` becomes 0, the U+2212 minus becomes `-`, and
   spaces and `%` are dropped.
2. Each metric is computed with the calc layer, then rounded with `round()` to the sheet's displayed
   precision.
3. The rounded value must equal the sheet cell. So "within rounding" means the same displayed value.

Coverage of the 771 test cases in the file:

- **51 rows × 9 metrics.** PPI, relative pixel size, width and height in cm, width and height
  difference, area in dm², area ratio, raw megapixels, megapixel ratio, and the aspect label. The
  four MacBook rows that the sheet labels "16:9" are asserted to be unmapped, with the raw ratio.
- **51 rows × 6 scales.** For each of 100, 110, 125, 150, 175 and 200 %, the row is comfortable
  exactly when the sheet shows a logical resolution. In that case the logical resolution and the
  "like" PPI must match.
- **Structure.** There are 51 display rows, one reference row, the comfort controls (90 PPI, 105 PPI,
  1024 px), the six scale headers, and the Linux preset that equals the six fixture scales.

Not asserted: the sheet's "like Mpix" columns, which are the bug fixed in section 11.

## 13. Known differences

- **PPD distance in Compare.** The settings help text in `settings.comfort.help` says that the PPD rule
  uses the baseline's distance. That is true for Browse only. Compare uses each display's own distance
  (section 7.1).
- **Aspect label rounding.** The label uses `toFixed(2)`, not `round()`. The two agree for every
  built-in display. A custom ratio that falls exactly on a half at the third decimal could be labelled
  differently by the two methods.
