# Sheet snapshot: "pixely a monitory"

A frozen copy of the original Google Sheet, taken on 2026-11-04 (sheet last modified
2026-10-29). Nothing here is edited by hand. The PRD (`docs/PRD.md`) retires the sheet,
so this snapshot is the source for:

- the one-off import script that produces the seed JSON (inputs only), and
- the acceptance test fixture: "every row and metric within rounding tolerance".

| File | Content |
| --- | --- |
| `monitory.values.json` | `monitory!A1:AK54`, **formatted** (displayed) values, as returned by the Sheets API |
| `halp.values.json` | `halp!A1:B14`, the column help texts (for F20 inline help) |

Source: spreadsheet `1Jq71Vv9gIGEDGw447YJmRM9YGESWHb0cCMSFMyRgcDc`.

## Layout

- Rows 1–3 are headers. Row 1 also holds the controls: `Y1` min "like" PPI = **90**,
  `AA1` max = **105**, `AE1` min logical width = **1024**.
- Row 3, columns `T, W, Z, AC, AF, AI` hold the scales **1, 1.1, 1.25, 1.5, 1.75, 2**.
- Rows 4–54 are the **51 displays**. Inputs: `B` diagonal, `E` name, `G` width px,
  `I` height px. `A` is the reference checkbox. In this snapshot the reference is
  **row 45, 42″ 4K (3840 × 2160)**, so every relative column below is against it.
- Each scale has three columns: logical resolution, "like" PPI, "like" Mpix.

## Formulas (row 4 shown; `ref` = `XLOOKUP(TRUE, $A:$A, col, 0)`)

| Col | Metric | Formula |
| --- | --- | --- |
| C | PPI | `SQRT(G² + I²) / B` |
| D | relative px size | `ref(C) / C − 1` |
| F | aspect | `IFS` chain on float equality of `G/I`: 16/9 → ` 16:9 `, 21/9 → ` 21:9 `, 64/27 and 43/18 → `“21:9”`, 32/9 → ` 32:9 `, 16/10 → ` 16:10`, 21/10 → ` 21:10`, 24/10 → ` 24:10`, 32/10 → ` 32:10`, `1.5 < r < 1.6` → ` “16:9”`; else the raw ratio |
| J, L | width, height cm | `G / C × 2.54`, `I / C × 2.54` |
| M, O | width, height diff | `J − ref(J)`, `L − ref(L)` |
| P | area dm² | `L × J / 100` |
| Q | area ratio | `ABS(P / ref(P)) − 1` |
| R | Mpix | `I × G / 10⁶` |
| S | Mpix ratio | `ABS(R / ref(R)) − 1` |
| T… | logical res at s | if `G/s ≥ minWidth` and `minPPI ≤ C/s ≤ maxPPI`: `ROUND(G/s, −1) & " × " & ROUND(I/s, −1)`, else blank |
| U… | "like" PPI | `ROUND(C/s, 0)` when the scale is comfortable |
| V… | "like" Mpix | `R / s`, blank if `< 5` (the bug the PRD fixes: should be `R / s²`, no cut-off) |

## Number formats

| Columns | Pattern | Renders as |
| --- | --- | --- |
| C, J, L, P, U… | `0` | integer |
| R, V… | `0.0` | 1 decimal |
| D, Q, S | `+0 %[Color10];−0 %[Color53];"same"` | `+2 %` green, `−58 %` red, `same` |
| M, O | `+ 0;− 0;"same"` | `+ 2`, `− 58` (space after sign), `same` |

The minus sign is U+2212 (`−`), not a hyphen. In Sheets the `"same"` section applies only
when the value is **exactly** 0. A value like 0.004 would render as `+0 %`.

## Findings relevant to the port

- **Raw values for tighter tests.** The formatted values are enough for the PRD's
  acceptance criterion. If tests need unrounded numbers, the Sheets API `effectiveValue`
  for `A4:S54` gives them (e.g. 42″ 4K PPI = 104.90034143249039).
- **Aspect mapping for GCD reduction** must include 7:3 (10080 × 4320, an exact 21:9),
  12:5 (shown as 24:10), 8:5 (16:10), 64:27 and 43:18 (quoted `“21:9”`), 32:9, 16:9.
  The sheet also maps 21:10 and 32:10, but no row uses them. The `halp` sheet explains the
  quotes: "quoted ones are not exact the number".
- **Row order is not strictly PPI-descending** (e.g. 13.3″ 227 sits after 15.3″ 224;
  40″ 139 sits before 31.5″ 140). The sheet was sorted by hand. The app's sort will differ
  slightly, which is fine.
- **Names to normalise**, beyond the PRD's "2K UW" / "4K UW" case: `ENDGAME 8K+`,
  `ENDGAME 8K`, `6K-`, `4K-`, `FullHD+W`, `QHD` for 5120 × 1440 (usually DQHD),
  the long MacBook names, and `2K+ (MB Air M1; MB Pro 13″ M1, M2)`.
