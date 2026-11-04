/**
 * Cell formatting for the Browse table and cards (PRD: F4, F6, UX "Browse").
 *
 * Everything here is pure: it takes the locale, unit system and "same" label as
 * arguments and returns text, so tests can run both languages without the signal.
 * Plain numbers go straight through `lib/format.js`; this module only adds the
 * cases the views share: the dash for a missing baseline, signed values with a
 * tone, the diagonal mark and the comfortable-scale labels.
 *
 * Signed values carry their tone (`positive`, `negative`, `same`, `none`) next to
 * the text, so the view can colour them while the sign and the word "same" still
 * carry the meaning (colour is never the only signal).
 *
 * @module components/browse/browse-format
 */

import { round } from '../../lib/math.js'
import {
  formatNumber,
  formatResolution,
  formatScale,
  formatSignedNumber,
  formatSignedPercent,
} from '../../lib/format.js'
import { toDisplayLength } from '../../lib/units.js'

/** Text for a value that cannot be shown, such as a relative value with no baseline. */
export const NO_VALUE = '—'

/** Joins a scale and its logical resolution in a chip, e.g. `125 % → 3070 × 1730`. */
const ARROW = '→'

/**
 * One display row as the store builds it (ARCHITECTURE: `browseRows`). The views
 * only read these fields. `matrix` holds every scale option, and `isComfortable`
 * marks the ones inside the comfort window.
 *
 * @typedef {object} BrowseRow
 * @property {{ id: string, name: string, diagonal: number, width: number, height: number, tag?: string, isCustom?: boolean }} display
 * @property {{ ppi: number, widthIn: number, heightIn: number, areaIn2: number, megapixels: number, aspect: { label: string, isApprox: boolean, isMapped: boolean } }} metrics
 * @property {{ relativePixelSize: number, widthDiffIn: number, heightDiffIn: number, areaRatio: number, megapixelRatio: number } | null} relative Null without a baseline.
 * @property {Array<{ scale: number, logicalWidth: number, logicalHeight: number, effectivePpi: number, isComfortable: boolean }>} matrix
 * @property {{ scale: number, logicalWidth: number, logicalHeight: number, isComfortable: boolean } | null} bestScale
 * @property {boolean} isFamiliar
 * @property {boolean} isBaseline
 * @property {boolean} isCompared
 */

/**
 * @typedef {'positive'|'negative'|'same'|'none'} SignTone
 */

/**
 * @typedef {object} CellValue
 * @property {string} text Formatted value, including sign or unit.
 * @property {SignTone} tone Sign of the rounded value; `none` when there is no value.
 */

/**
 * Tone of a value that has already been rounded to the precision shown.
 *
 * @param {number} value Rounded value, for example a whole percentage.
 * @returns {SignTone}
 *
 * @example
 * getSignTone(2) // 'positive'
 * getSignTone(-58) // 'negative'
 * getSignTone(0) // 'same'
 */
export const getSignTone = (value) => {
  if (!Number.isFinite(value)) return 'none'
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'same'
}

/**
 * Diagonal in inches with the inch mark. Whole inches have no decimals, so `27″`
 * and `13.3″` both read naturally. Diagonals stay in inches in both unit systems.
 *
 * @param {object} params
 * @param {number} params.diagonal Inches.
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string}
 *
 * @example
 * formatDiagonal({ diagonal: 27, locale: 'en' }) // '27″'
 * formatDiagonal({ diagonal: 13.3, locale: 'cs' }) // '13,3″'
 */
export const formatDiagonal = ({ diagonal, locale }) => {
  const rounded = round({ value: diagonal, digits: 1 })
  const digits = Number.isInteger(rounded) ? 0 : 1
  return `${formatNumber({ value: rounded, locale, digits })}″`
}

/**
 * A relative ratio (0.02 = +2 %) as a signed whole percentage, with its tone.
 * A missing ratio (no baseline) gives the dash and no tone.
 *
 * @param {object} params
 * @param {number|undefined|null} params.ratio Relative change, or missing.
 * @param {'en'|'cs'} params.locale UI language.
 * @param {string} params.sameLabel Translated "same".
 * @returns {CellValue}
 *
 * @example
 * formatRatioCell({ ratio: 0.02, locale: 'en', sameLabel: 'same' }) // { text: '+2 %', tone: 'positive' }
 * formatRatioCell({ ratio: undefined, locale: 'en', sameLabel: 'same' }) // { text: '—', tone: 'none' }
 */
export const formatRatioCell = ({ ratio, locale, sameLabel }) => {
  if (!Number.isFinite(ratio)) return { text: NO_VALUE, tone: 'none' }
  return {
    text: formatSignedPercent({ ratio, locale, sameLabel }),
    tone: getSignTone(round({ value: ratio * 100 })),
  }
}

/**
 * A length difference in inches, shown as a signed number in the active unit
 * system. The unit is in the column header. A missing value gives the dash.
 *
 * @param {object} params
 * @param {number|undefined|null} params.inches Difference in inches, or missing.
 * @param {'metric'|'imperial'} params.units Unit system.
 * @param {'en'|'cs'} params.locale UI language.
 * @param {string} params.sameLabel Translated "same".
 * @returns {CellValue}
 *
 * @example
 * formatLengthDiffCell({ inches: 1.2, units: 'metric', locale: 'en', sameLabel: 'same' })
 * // { text: '+3', tone: 'positive' }
 */
export const formatLengthDiffCell = ({ inches, units, locale, sameLabel }) => {
  if (!Number.isFinite(inches)) return { text: NO_VALUE, tone: 'none' }
  const value = toDisplayLength({ inches, units })
  return {
    text: formatSignedNumber({ value, locale, sameLabel }),
    tone: getSignTone(round({ value })),
  }
}

/**
 * The scale and logical resolution of one matrix row, e.g. `125 % → 3070 × 1730`.
 * Logical sizes are rounded to tens, as in the sheet and the PRD.
 *
 * @param {object} params
 * @param {{ scale: number, logicalWidth: number, logicalHeight: number }} params.row A matrix row.
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string}
 *
 * @example
 * formatScaleLabel({ row: { scale: 1.25, logicalWidth: 3072, logicalHeight: 1728 }, locale: 'en' })
 * // '125 % → 3070 × 1730'
 */
export const formatScaleLabel = ({ row, locale }) =>
  `${formatScale({ scale: row.scale, locale })} ${ARROW} ${formatResolution({
    width: row.logicalWidth,
    height: row.logicalHeight,
    roundTo: 10,
  })}`

/**
 * Every comfortable scale of a display, in matrix order, with the best one flagged.
 * The best row is matched by scale value, so an equal copy of it still matches.
 * Nothing is flagged when the best row is not comfortable.
 *
 * @param {object} params
 * @param {Array<{ scale: number, isComfortable: boolean, logicalWidth: number, logicalHeight: number }>} params.matrix
 * @param {{ scale: number, isComfortable: boolean } | null} params.bestScale
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {Array<{ scale: number, label: string, isBest: boolean }>}
 *
 * @example
 * getComfortableScales({ matrix, bestScale, locale: 'en' })
 * // [{ scale: 1.25, label: '125 % → 3070 × 1730', isBest: true }, …]
 */
export const getComfortableScales = ({ matrix, bestScale, locale }) => {
  const bestKey = bestScale?.isComfortable ? bestScale.scale : null
  return (matrix ?? [])
    .filter((row) => row.isComfortable)
    .map((row) => ({
      scale: row.scale,
      label: formatScaleLabel({ row, locale }),
      isBest: row.scale === bestKey,
    }))
}

/**
 * The best comfortable scale as one label, or `null` when the display has none.
 *
 * @param {object} params
 * @param {{ scale: number, isComfortable: boolean, logicalWidth: number, logicalHeight: number } | null} params.bestScale
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string|null}
 *
 * @example
 * getBestScaleLabel({ bestScale: null, locale: 'en' }) // null
 */
export const getBestScaleLabel = ({ bestScale, locale }) => {
  if (!bestScale?.isComfortable) return null
  return formatScaleLabel({ row: bestScale, locale })
}
