import { round } from '../math.js'

/**
 * @typedef {object} ScaleOption
 * @property {number} scale                 factor, e.g. 1.25
 * @property {number} [looksLikeWidth]      macOS preset only, logical width in px
 * @property {boolean} [isCustom]           true for a user-added custom scale
 */

/**
 * @typedef {object} ScaledMetrics          a display at one OS scale
 * @property {number} scale
 * @property {number} logicalWidth          w / s, unrounded logical px
 * @property {number} logicalHeight         h / s
 * @property {number} effectivePpi          ppi / s
 * @property {number} workspaceMegapixels   (w / s) × (h / s) / 10⁶ (s², PRD fix)
 * @property {number} [logicalPpd]          ppd / s, present only when a distance is given
 */

/**
 * @typedef {ScaledMetrics & ScaleOption & { isComfortable: boolean }} MatrixRow
 */

/**
 * Copy of the OS scale presets from `lib/scales.js` (ARCHITECTURE: `SCALE_PRESETS`).
 * It is duplicated on purpose so this calc module imports nothing from other new
 * modules. Keep the two in sync.
 *
 * @type {Record<string, { kind: 'factor'|'looksLike', values: number[] }>}
 */
const SCALE_PRESETS = {
  windows: { kind: 'factor', values: [1, 1.25, 1.5, 1.75, 2] },
  macos: {
    kind: 'looksLike',
    values: [1280, 1440, 1512, 1680, 1728, 1920, 2048, 2304, 2560, 3008, 3200],
  },
  linux: { kind: 'factor', values: [1, 1.1, 1.25, 1.5, 1.75, 2] },
}

/** Keep only macOS "looks like" scales within this range (PRD F21). */
const MACOS_SCALE_RANGE = { min: 1, max: 2 }

/**
 * Sort options by scale, ascending. Returns a new array.
 *
 * @param {ScaleOption[]} options
 * @returns {ScaleOption[]}
 */
const sortByScale = (options) => [...options].sort((a, b) => a.scale - b.scale)

/**
 * Drop repeated scales. The first occurrence wins, so a preset listed before a
 * custom scale keeps the preset's fields.
 *
 * @param {ScaleOption[]} options
 * @returns {ScaleOption[]}
 */
const withoutDuplicates = (options) => {
  const seen = new Set()
  return options.filter(({ scale }) => {
    if (seen.has(scale)) return false
    seen.add(scale)
    return true
  })
}

/**
 * Options for a macOS "looks like" preset. Each scale is native width ÷ looks-like
 * width, rounded to 4 decimals, and kept only inside {@link MACOS_SCALE_RANGE}.
 *
 * @param {object} params
 * @param {number} params.width Native width in pixels.
 * @param {number[]} params.values Looks-like widths in logical px.
 * @returns {ScaleOption[]}
 */
const looksLikeOptions = ({ width, values }) =>
  values
    .map((looksLikeWidth) => ({
      scale: round({ value: width / looksLikeWidth, digits: 4 }),
      looksLikeWidth,
    }))
    .filter(
      ({ scale }) => scale >= MACOS_SCALE_RANGE.min && scale <= MACOS_SCALE_RANGE.max,
    )

/**
 * List the OS scales a display can be shown at, given the active preset and any
 * custom scales the user added (F21).
 *
 * - `windows` and `linux`: the preset factors (for example 1.25) plus the custom
 *   scales.
 * - `macos`: for each looks-like width L, s = native width ÷ L, kept if
 *   1 ≤ s ≤ 2. Custom scales are appended.
 *
 * Duplicates are removed, preferring the preset entry. The result is sorted by
 * scale ascending. An unknown `presetId` falls back to `windows`.
 *
 * @param {object} params
 * @param {{ width: number }} params.display Native width is used for macOS only.
 * @param {'windows'|'macos'|'linux'} params.presetId
 * @param {number[]} [params.customScales=[]] Factors such as 1.33 or 3.
 * @returns {ScaleOption[]}
 *
 * @example
 * getScaleOptions({ display: { width: 3840 }, presetId: 'windows' })
 * // [{ scale: 1 }, { scale: 1.25 }, { scale: 1.5 }, { scale: 1.75 }, { scale: 2 }]
 *
 * getScaleOptions({ display: { width: 3840 }, presetId: 'macos' })
 * // [{ scale: 1.2, looksLikeWidth: 3200 }, …, { scale: 2, looksLikeWidth: 1920 }]
 */
export const getScaleOptions = ({ display, presetId, customScales = [] }) => {
  const preset = Object.hasOwn(SCALE_PRESETS, presetId)
    ? SCALE_PRESETS[presetId]
    : SCALE_PRESETS.windows
  const presetOptions =
    preset.kind === 'looksLike'
      ? looksLikeOptions({ width: display.width, values: preset.values })
      : preset.values.map((scale) => ({ scale }))
  const customOptions = customScales.map((scale) => ({ scale, isCustom: true }))

  return sortByScale(withoutDuplicates([...presetOptions, ...customOptions]))
}

/**
 * Derive a display's logical geometry and effective density at one OS scale.
 *
 * `logicalPpd` is returned only when `distance` is a finite number above 0,
 * so callers without a viewing distance still get the PPI-based metrics.
 *
 * The calculation uses only its arguments and imports nothing from other calc
 * modules. The PPD formula is inlined (`ppi · v · π / 180`, same as `getPpd`).
 *
 * @param {object} params
 * @param {{ width: number, height: number }} params.display Native pixels.
 * @param {{ ppi: number }} params.metrics From `getDisplayMetrics`.
 * @param {number} params.scale Factor, e.g. 1.5.
 * @param {number} [params.distance] Viewing distance in inches.
 * @returns {ScaledMetrics}
 *
 * @example
 * getScaledMetrics({ display: fourK42, metrics, scale: 1.5 })
 * // { scale: 1.5, logicalWidth: 2560, logicalHeight: 1440, effectivePpi: 69.9, … }
 */
export const getScaledMetrics = ({ display, metrics, scale, distance }) => {
  const logicalWidth = display.width / scale
  const logicalHeight = display.height / scale
  const scaled = {
    scale,
    logicalWidth,
    logicalHeight,
    effectivePpi: metrics.ppi / scale,
    workspaceMegapixels: (logicalWidth * logicalHeight) / 1e6,
  }

  if (!Number.isFinite(distance) || distance <= 0) return scaled

  return {
    ...scaled,
    logicalPpd: (metrics.ppi * distance * Math.PI) / 180 / scale,
  }
}

/**
 * Inclusive range check.
 *
 * @param {object} params
 * @param {number} params.value
 * @param {number} params.min
 * @param {number} params.max
 * @returns {boolean}
 */
const isWithin = ({ value, min, max }) => value >= min && value <= max

/**
 * Whether a scaled display falls inside the comfort window (F7, F23).
 *
 * - `ppi` mode: effective PPI within [minPpi, maxPpi].
 * - `ppd` mode: logical PPD within [minPpd, maxPpd]. False when there is no
 *   `logicalPpd` (no viewing distance).
 *
 * In both modes the logical width must be at least `minWidth`. Bounds are
 * inclusive.
 *
 * @param {object} params
 * @param {ScaledMetrics} params.scaled
 * @param {object} params.comfort Comfort window. Read fields: `mode` ('ppi' or
 *   'ppd'), `minPpi`, `maxPpi`, `minPpd`, `maxPpd`, `minWidth`.
 * @returns {boolean}
 *
 * @example
 * isComfortable({
 *   scaled: { logicalWidth: 2560, effectivePpi: 92 },
 *   comfort: { mode: 'ppi', minPpi: 90, maxPpi: 105, minWidth: 1024 },
 * }) // true
 */
export const isComfortable = ({ scaled, comfort }) => {
  if (scaled.logicalWidth < comfort.minWidth) return false

  if (comfort.mode === 'ppd') {
    if (!Number.isFinite(scaled.logicalPpd)) return false
    return isWithin({
      value: scaled.logicalPpd,
      min: comfort.minPpd,
      max: comfort.maxPpd,
    })
  }

  return isWithin({
    value: scaled.effectivePpi,
    min: comfort.minPpi,
    max: comfort.maxPpi,
  })
}

/**
 * One row per scale option, with its scaled metrics and comfort flag. Browse
 * shows only the comfortable rows. Compare shows all of them and highlights the
 * comfortable ones (PRD F6).
 *
 * Extra fields on each option (such as `looksLikeWidth`) are kept on its row.
 *
 * @param {object} params
 * @param {{ width: number, height: number }} params.display
 * @param {{ ppi: number }} params.metrics
 * @param {ScaleOption[]} params.scaleOptions From {@link getScaleOptions}.
 * @param {object} params.comfort Comfort window (see {@link isComfortable}).
 * @param {number} [params.distance] Viewing distance in inches, for logicalPpd.
 * @returns {MatrixRow[]}
 *
 * @example
 * getScalingMatrix({
 *   display, metrics, comfort,
 *   scaleOptions: [{ scale: 1 }, { scale: 1.25 }],
 * })
 * // [{ scale: 1, …, isComfortable: true }, { scale: 1.25, …, isComfortable: true }]
 */
export const getScalingMatrix = ({ display, metrics, scaleOptions, comfort, distance }) =>
  scaleOptions.map((option) => {
    const scaled = getScaledMetrics({
      display,
      metrics,
      scale: option.scale,
      distance,
    })
    return {
      ...option,
      ...scaled,
      isComfortable: isComfortable({ scaled, comfort }),
    }
  })

/**
 * Pick the row with the smallest score. A tie goes to the larger logical width.
 *
 * @param {object} params
 * @param {MatrixRow[]} params.rows Non-empty.
 * @param {(row: MatrixRow) => number} params.score Lower is better.
 * @returns {MatrixRow}
 */
const pickBest = ({ rows, score }) =>
  rows.reduce((best, row) => {
    if (best === null) return row
    const difference = score(row) - score(best)
    const isBetter =
      difference < 0 || (difference === 0 && row.logicalWidth > best.logicalWidth)
    return isBetter ? row : best
  }, null)

/**
 * The scale to recommend for a display (PRD F13, headline output).
 *
 * - Among the comfortable rows, the one whose metric is closest to the middle of
 *   the window. The metric is `effectivePpi` in `ppi` mode and `logicalPpd` in
 *   `ppd` mode. A tie goes to the larger logical width.
 * - If none is comfortable, the row closest to the window, measured as the
 *   distance to its nearest bound in the active metric. A tie also goes to the
 *   larger logical width.
 * - Rows whose active metric is not a number (ppd mode with no distance) are
 *   ignored. If nothing is left, the result is null.
 *
 * @param {object} params
 * @param {MatrixRow[]} params.rows From {@link getScalingMatrix}.
 * @param {object} params.comfort Comfort window (see {@link isComfortable}).
 * @returns {MatrixRow | null} The recommended row, or null when there is none.
 *
 * @example
 * getBestScale({ rows, comfort }) // the 1.25 row for a 4K 42″ at 96 PPI
 */
export const getBestScale = ({ rows, comfort }) => {
  const isPpd = comfort.mode === 'ppd'
  const metric = (row) => (isPpd ? row.logicalPpd : row.effectivePpi)
  const bounds = isPpd
    ? { min: comfort.minPpd, max: comfort.maxPpd }
    : { min: comfort.minPpi, max: comfort.maxPpi }

  const measured = rows.filter((row) => Number.isFinite(metric(row)))
  if (measured.length === 0) return null

  const comfortable = measured.filter(({ isComfortable }) => isComfortable)
  if (comfortable.length > 0) {
    const middle = (bounds.min + bounds.max) / 2
    return pickBest({
      rows: comfortable,
      score: (row) => Math.abs(metric(row) - middle),
    })
  }

  return pickBest({
    rows: measured,
    score: (row) => Math.max(bounds.min - metric(row), metric(row) - bounds.max, 0),
  })
}
