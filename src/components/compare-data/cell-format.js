/**
 * Cell formatting for the Compare data tables (PRD: Signed values, F16).
 *
 * Lengths are inches internally. These helpers convert for the active unit system
 * and reuse `lib/format.js`, so the rounding, the U+2212 minus, the "same" rule and
 * the Czech decimal comma stay in one place.
 *
 * @module components/compare-data/cell-format
 */

import { formatNumber, formatSignedNumber } from '../../lib/format.js'
import { round } from '../../lib/math.js'
import { lengthUnitLabel, toDisplayLength } from '../../lib/units.js'

/** Shown for values that do not exist, such as baseline equivalents. */
export const NO_VALUE = '—'

const NBSP = ' '

/**
 * Decimal places for a length in the active system: whole centimetres, or one
 * decimal for inches (where whole inches are too coarse).
 *
 * @param {'metric'|'imperial'} units
 * @returns {0|1}
 *
 * @example
 * lengthDigits('imperial') // 1
 */
export const lengthDigits = (units) => (units === 'imperial' ? 1 : 0)

/**
 * Diagonal in inches, always, with the inch mark. Whole inches have no decimal.
 *
 * @param {object} params
 * @param {number} params.diagonal Inches.
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string} `'27″'`, `'15,6″'` (cs).
 *
 * @example
 * formatDiagonal({ diagonal: 15.6, locale: 'en' }) // '15.6″'
 */
export const formatDiagonal = ({ diagonal, locale }) => {
  if (!Number.isFinite(diagonal)) return NO_VALUE
  const digits = Number.isInteger(diagonal) ? 0 : 1
  return `${formatNumber({ value: diagonal, locale, digits })}″`
}

/**
 * A signed length difference with its unit, for example `−16 cm`. A difference
 * that rounds to zero reads as `sameLabel`, with no unit.
 *
 * @param {object} params
 * @param {number} params.inches Difference in inches.
 * @param {'metric'|'imperial'} params.units
 * @param {'en'|'cs'} params.locale
 * @param {string} params.sameLabel Translated "same".
 * @returns {string}
 *
 * @example
 * formatSignedLength({ inches: -6.3, units: 'metric', locale: 'en', sameLabel: 'same' }) // '−16 cm'
 */
export const formatSignedLength = ({ inches, units, locale, sameLabel }) => {
  if (!Number.isFinite(inches)) return NO_VALUE
  const digits = lengthDigits(units)
  const value = round({ value: toDisplayLength({ inches, units }), digits })
  if (value === 0) return sameLabel
  const signed = formatSignedNumber({ value, locale, digits })
  return `${signed}${NBSP}${lengthUnitLabel(units)}`
}
