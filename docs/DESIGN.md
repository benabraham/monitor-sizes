# Design system

The design system is the shared visual language and accessible UI primitives used by
every feature component. It lives in three places:

| Path                           | What                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `src/styles/tokens.css`        | Custom properties: colour (light + dark), spacing, type, radii, shadows, z-index, motion       |
| `src/styles/global.css`        | Reset, base typography, focus ring, `.visually-hidden`, table base, reduced motion, safe areas |
| `src/components/ui/*`          | Primitives: `Button`, `Chip`, `Dialog`, `Segmented`, `NumberField`, `Slider`, `Icon`           |
| `src/components/help-popover/` | `HelpPopover`, the `?` button with a Popover API panel                                         |

Everything is plain modern CSS, one stylesheet per component, class names in BEM-ish kebab
case and prefixed per component (`button--primary`, `number-field__unit`). Components are
functional Preact, with JSDoc on every export.

## Wiring

The styles are not imported by the primitives. The app entry imports them once, before
the first render:

```js
// src/main.jsx (app entry, not part of this package)
import './styles/tokens.css'
import './styles/global.css'
```

Each primitive imports its own stylesheet (`button.css`, `chip.css`, …). Nothing in a
component hard-codes a colour, so a theme change is a token change.

Import primitives from the barrel:

```js
import {
  Button,
  Chip,
  Dialog,
  Icon,
  NumberField,
  Segmented,
  Slider,
} from './components/ui/index.js'
import { HelpPopover } from './components/help-popover/help-popover.jsx'
```

## Theming

Light is the default. Dark applies when the system asks for it:

- `@media (prefers-color-scheme: dark)` on `:root:not([data-theme='light'])`,
- or `:root[data-theme='dark']`, to force dark regardless of the system,
- or `:root[data-theme='light']`, to force light regardless of the system.

`tokens.css` sets `color-scheme` in each block, so native controls, scrollbars and the
`::backdrop` follow the theme too. The dark values are written in two blocks. Change both
when a dark token changes.

## Tokens

### Colour

| Token                          | Light                  | Dark                   | Role                                                                   |
| ------------------------------ | ---------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `--color-bg`                   | `#f8fafc`              | `#0f172a`              | Page background (matches the manifest theme colour)                    |
| `--color-surface`              | `#ffffff`              | `#1e293b`              | Cards, panels, inputs, dialogs                                         |
| `--color-surface-2`            | `#f1f5f9`              | `#334155`              | Hover, zebra rows, sunken areas                                        |
| `--color-text`                 | `#0f172a`              | `#f1f5f9`              | Body text                                                              |
| `--color-text-muted`           | `#475569`              | `#cbd5e1`              | Labels, units, secondary text                                          |
| `--color-border`               | `#e2e8f0`              | `#334155`              | Decorative dividers. Not needed to identify controls                   |
| `--color-control`              | `#6b7689`              | `#94a3b8`              | Borders that identify a control (inputs, segments, candidate outlines) |
| `--color-backdrop`             | 60 % slate             | 70 % near-black        | Dialog backdrop                                                        |
| `--color-accent`               | `#0369a1`              | `#38bdf8`              | Baseline, primary action, selected state, slider fill                  |
| `--color-accent-hover`         | `#075985`              | `#7dd3fc`              | Hover on accent surfaces                                               |
| `--color-accent-contrast`      | `#ffffff`              | `#082f49`              | Text and icons on the accent                                           |
| `--color-accent-subtle`        | `#e0f2fe`              | `#0c4a6e`              | Selected chip fill                                                     |
| `--color-accent-subtle-text`   | `#075985`              | `#e0f2fe`              | Text on accent-subtle                                                  |
| `--color-positive`             | `#15803d`              | `#4ade80`              | Positive signed values                                                 |
| `--color-positive-subtle`      | `#dcfce7`              | `#14532d`              | Comfortable highlight (matrix cells, comfortable rows)                 |
| `--color-positive-subtle-text` | `#14532d`              | `#bbf7d0`              | Text on comfortable highlight                                          |
| `--color-negative`             | `#b91c1c`              | `#f87171`              | Negative signed values, destructive actions                            |
| `--color-negative-contrast`    | `#ffffff`              | `#450a0a`              | Text on the negative fill                                              |
| `--color-familiar`             | `#6d28d9`              | `#c4b5fd`              | Dashed outlines for familiar displays                                  |
| `--color-focus-ring`           | `#0369a1`              | `#7dd3fc`              | `:focus-visible` ring                                                  |
| `--color-baseline`             | = accent               | = accent               | Alias for the baseline role (use this in comparison components)        |
| `--color-comfortable-bg`       | = positive-subtle      | = positive-subtle      | Alias: comfortable highlight background                                |
| `--color-comfortable-text`     | = positive-subtle-text | = positive-subtle-text | Alias: text on the comfortable highlight                               |

### Spacing, radii, type, elevation, motion

| Group       | Tokens                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Spacing     | `--space-1` 4 px, `-2` 8 px, `-3` 12 px, `-4` 16 px (gutter), `-5` 20 px, `-6` 24 px, `-8` 32 px, `-10` 40 px                 |
| Radii       | `--radius-sm` 4 px, `--radius-md` 6 px, `--radius-lg` 10 px, `--radius-pill` 999 px                                           |
| Font        | `--font-sans` (system UI stack), `--font-numeric` (`tabular-nums`)                                                            |
| Sizes       | `--font-size-xs` 12 px, `-sm` 13 px, `-base` 14 px (dense desktop), `-md` 16 px (phones and inputs), `-lg` 18 px, `-xl` 24 px |
| Weights     | `--font-weight-regular` 400, `-medium` 500, `-semibold` 600                                                                   |
| Line height | `--line-height-tight` 1.2, `--line-height-base` 1.45                                                                          |
| Focus       | `--focus-ring-width` 2 px, `--focus-ring-offset` 2 px                                                                         |
| Elevation   | `--shadow-sm`, `--shadow-md`, `--shadow-lg` (stronger in dark)                                                                |
| Stacking    | `--z-sticky` 10, `--z-popover` 100, `--z-dialog` 200                                                                          |
| Motion      | `--duration-fast` 120 ms, `--duration-base` 200 ms                                                                            |

Breakpoints are documented in a comment in `tokens.css`, not as custom properties: custom
properties cannot be used inside `@media`, so the values are written literally in the
queries.

| Breakpoint | Width   | Use                                                                                  |
| ---------- | ------- | ------------------------------------------------------------------------------------ |
| sm         | 600 px  | Phone ↔ desktop: cards ↔ table, bottom sheet ↔ popover, full-screen ↔ centred dialog |
| md         | 900 px  | Two-column compare layout                                                            |
| lg         | 1200 px | Wide desktop: sticky visualization panel beside metrics                              |

### Utilities (`global.css`)

| Class              | Use                                                      |
| ------------------ | -------------------------------------------------------- |
| `.visually-hidden` | Content for assistive technology only                    |
| `.table-wrap`      | Wrapper that scrolls a wide table horizontally on phones |
| `.table-numeric`   | Right-aligned, non-wrapping numeric table cell           |
| `.numeric`         | `tabular-nums` for any number in running text            |

## Colour roles

Colour is never the only signal. Every role below also has a shape, a dash pattern, a label
or an icon.

| Role                | Shown as                                                                 | Signal beyond colour                                                   |
| ------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Baseline            | `--color-accent`, solid outline, `Chip isAccent`, accent row/outline     | Label "Baseline", 2 px outline                                         |
| Familiar            | `--color-familiar`, **dashed** outline, `Chip isDashed`                  | Dash pattern, star icon                                                |
| Candidate           | `--color-control`, **solid** outline                                     | Solid stroke, label on every outline                                   |
| Comfortable         | `--color-positive-subtle` background with `--color-positive-subtle-text` | Cell text stays readable; the matrix component should add a marker too |
| Selected / on       | `--color-accent-subtle` fill (chips), `--color-accent` fill (segments)   | Check icon on chips; `aria-pressed`, checked radio                     |
| Positive / negative | `--color-positive` / `--color-negative` text                             | Sign (`+`, `−`) and the word "same"                                    |

## Accessibility

Target: WCAG 2.2 AA.

**Contrast.** Every text/background pair in `tokens.css` is measured, with the ratios in the
file header (4.5:1 for text, 3:1 for non-text UI). Summary of the lowest light and dark
pairs for text: text on bg 17.06:1 / 16.30:1; muted on surface-2 6.92:1 / 6.97:1;
accent-contrast on accent 5.93:1 / 6.48:1; positive on bg 4.79:1 / 10.25:1. Non-text:
`--color-control` on surface 4.59:1 / 5.71:1; focus ring on surface 5.93:1 / 8.77:1.

**Focus.** `:focus-visible` shows a 2 px ring with a 2 px offset (`global.css`). Focus is
never removed. Segments and slider thumbs have their own ring, because their native input is
visually hidden or styled.

**Targets.** Buttons are 28 px (`sm`) and 36 px (`md`), above the 24 px minimum of WCAG 2.5.8.
`md` grows to 44 px on coarse pointers. Chips are 28 px tall.

**Names and states.**

- `Button` and `Chip` (toggle) use native buttons. Toggle chips expose `aria-pressed`.
- Icon-only buttons need `aria-label`. In development the component warns when it is missing.
- `Segmented` is a `fieldset`/`legend` with native radios, so arrow keys and the group name
  come from the browser.
- `NumberField` has a visible `label` (`for`), and the unit is linked with `aria-describedby`.
- `Slider` has `aria-valuetext`, so "60 cm" is announced, not "60".
- `Dialog` is a native `<dialog>`, labelled by its title. `showModal()` traps focus and returns
  it to the opener on close. Esc and backdrop clicks call `onClose`.
- `HelpPopover` is a `?` button with `aria-label`, `aria-controls` and `aria-expanded`. The
  panel is `role="dialog"`, labelled by its title. The title is a `<p>` styled as a heading,
  not an `h*` element, and `aria-labelledby` points at it.

**Motion.** `prefers-reduced-motion: reduce` disables transitions and animations globally
(`global.css`).

**Touch.** Inputs are 16 px on phones so iOS does not zoom on focus. Safe-area insets pad
the body and the bottom sheet and full-screen dialog.

## Baseline 2024 constraints

Allowed: custom properties, `:has()`, container queries, CSS nesting, the Popover API,
`color-mix()`, logical properties, `dvh`, `text-wrap: balance`.

Not used: CSS anchor positioning (`anchor-name`, `position-anchor`, `anchor()`),
`interestfor` (hover-triggered popovers), `field-sizing`.

`HelpPopover` positions its panel from JavaScript. It reads the trigger's
`getBoundingClientRect()` on the panel's `toggle` event, places it below the trigger (above
when there is no room) and clamps it into the viewport. Below 600 px the JavaScript leaves
the offsets empty and the CSS bottom sheet applies. Where the Popover API is missing
(jsdom, very old engines) the trigger toggles a `hidden` attribute instead.

## Components

Each block lists the props and one usage. JSDoc in each file is the full reference.

### `Button`

```jsx
<Button variant="primary" icon="plus">Add display</Button>
<Button variant="ghost" size="sm" icon="close" aria-label="Close" />
```

| Prop       | Default       | Notes                                                                    |
| ---------- | ------------- | ------------------------------------------------------------------------ |
| `variant`  | `'secondary'` | `'primary'`, `'secondary'`, `'ghost'`, `'danger'`                        |
| `size`     | `'md'`        | `'md'` 36 px, `'sm'` 28 px                                               |
| `icon`     | —             | Icon name from the set, or any node. Decorative.                         |
| `children` | —             | Visible label. Omit for icon-only, and then pass `aria-label`.           |
| `type`     | `'button'`    | Overridable (`'submit'` for forms).                                      |
| `...rest`  | —             | Passed to the native `<button>`, including `ref`, `onClick`, `disabled`. |

### `Chip`

```jsx
<Chip isDashed isSelected onClick={toggleFamiliar}>24″ FHD</Chip>
<Chip isAccent>Baseline</Chip>
```

| Prop         | Default | Notes                                                                   |
| ------------ | ------- | ----------------------------------------------------------------------- |
| `isSelected` | `false` | Selected fill and a check icon. `aria-pressed` when `onClick` is set.   |
| `isAccent`   | `false` | Baseline: accent outline, 2 px.                                         |
| `isDashed`   | `false` | Familiar: dashed familiar outline.                                      |
| `onClick`    | —       | Makes the chip a toggle `<button>`. Without it, the chip is a `<span>`. |

### `Dialog`

```jsx
<Dialog
  isOpen={isAddOpen}
  onClose={() => setAddOpen(false)}
  title={t('add.title')}
  closeLabel={t('common.close')}
  footer={
    <Button variant="primary" onClick={save}>
      {t('common.save')}
    </Button>
  }
>
  <AddDisplayForm />
</Dialog>
```

| Prop         | Default   | Notes                                                                                  |
| ------------ | --------- | -------------------------------------------------------------------------------------- |
| `isOpen`     | —         | Controls `showModal()` and `close()`.                                                  |
| `onClose`    | —         | Esc, close button, backdrop click and native close. The parent sets `isOpen` to false. |
| `title`      | —         | Heading and accessible name.                                                           |
| `footer`     | —         | Action row.                                                                            |
| `closeLabel` | `'Close'` | Accessible name of the close button. Pass a translated string.                         |

Below 600 px the dialog is a full-screen sheet with safe-area padding.

### `Segmented`

```jsx
<Segmented
  name="units"
  label={t('toolbar.units')}
  options={[
    { value: 'metric', label: 'cm' },
    { value: 'imperial', label: 'in' },
  ]}
  value={units}
  onChange={setUnits}
/>
```

| Prop            | Default | Notes                                 |
| --------------- | ------- | ------------------------------------- |
| `name`          | —       | Radio group name, unique on the page. |
| `label`         | —       | Legend.                               |
| `isLabelHidden` | `false` | Legend for assistive technology only. |
| `options`       | —       | `{ value, label, isDisabled? }[]`.    |
| `value`         | —       | Selected value (controlled).          |
| `onChange`      | —       | Called with the option's `value`.     |

### `NumberField`

```jsx
<NumberField
  label={t('compare.distance')}
  unit="cm"
  value={distanceCm}
  min={20}
  max={150}
  decimals={0}
  locale={locale.value}
  onChange={setDistanceCm}
/>
```

| Prop         | Default   | Notes                                                           |
| ------------ | --------- | --------------------------------------------------------------- |
| `label`      | —         | Visible label, also the accessible name.                        |
| `value`      | —         | Number.                                                         |
| `onChange`   | —         | Called with the committed number, only when it changed.         |
| `unit`       | —         | Shown after the input, described to assistive technology.       |
| `min`, `max` | —         | Committed values are clamped.                                   |
| `step`       | `1`       | ArrowUp and ArrowDown step.                                     |
| `decimals`   | `0`       | Rounding on commit (half away from zero) and display precision. |
| `locale`     | `'en'`    | `'en'` shows `23.6`, `'cs'` shows `23,6`.                       |
| `id`         | generated | Input id.                                                       |

Behaviour: the text is free while typing. Blur or Enter commits. Invalid text is discarded
and the last value restored. An unedited field never calls `onChange`.

`parseLocaleNumber(text)` is exported as a pure helper (`→ number | null`). It accepts `.` and
`,` as decimals, spaces (including no-break) as grouping, and `−` as minus. A single separator
followed by three digits is read as a decimal (`"1,234"` → `1.234`), because the locale is
not known to the helper.

### `Slider`

```jsx
<Slider
  label={t('compare.distance')}
  value={distance}
  min={20}
  max={150}
  valueText={formatLength({ inches: distance, units, locale })}
  onInput={setDistance}
/>
```

| Prop                 | Default         | Notes                                                   |
| -------------------- | --------------- | ------------------------------------------------------- |
| `label`              | —               | Visible label and accessible name.                      |
| `value`              | —               | Number.                                                 |
| `onInput`            | —               | Called with the number while the thumb moves.           |
| `min`, `max`, `step` | `0`, `100`, `1` |                                                         |
| `valueText`          | the number      | Visible next to the label and used as `aria-valuetext`. |

### `Icon`

```jsx
<Icon name="star-filled" title={t('browse.familiar')} />
<Icon name="chevron-down" size={12} />
```

Names: `star`, `star-filled`, `plus`, `close`, `help`, `link`, `compare`, `check`, `trash`,
`edit`, `chevron-down`, `sort-asc`, `sort-desc`, `monitor`, `laptop`, `settings`, `upload`,
`download`, `eye`, `eye-off` (also exported as `ICON_NAMES`).

Drawn on a 24 × 24 grid with 2 px `currentColor` strokes. Decorative (`aria-hidden`) unless
`title` is given, which makes it `role="img"`. An unknown name renders nothing and warns in
development.

### `HelpPopover`

```jsx
<HelpPopover id="help-ppi" label={t('help.ppiLabel')} title={t('metrics.ppi')}>
  <p>{t('help.ppiText')}</p>
</HelpPopover>
```

| Prop       | Notes                                                                 |
| ---------- | --------------------------------------------------------------------- |
| `id`       | Unique id. The trigger points to the panel with `popovertarget`.      |
| `label`    | Accessible name of the `?` button, for example `"Help: PPI"`.         |
| `title`    | Title of the panel, styled as a heading; the panel's accessible name. |
| `children` | Explanatory text.                                                     |

Click or keyboard only. There is no hover. Esc and an outside click close the panel.

## Known limits

- `HelpPopover` and the other components take all text as props. Nothing here imports i18n.
  The English defaults (`closeLabel`, the `Icon` title) are fallbacks only.
- `NumberField` reads `1,234` as `1.234`. Callers that need grouping input should pass
  already-separated text, or accept the decimal reading.
- Icon paths are hand-drawn. Add a name by extending `ICONS` in `icon.jsx` and the test list.
