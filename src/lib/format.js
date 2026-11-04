/**
 * Locale-aware number and label formatting (PRD: Calculation spec, Signed values;
 * UX: Key interactions; F16).
 *
 * This is the only layer that rounds for display. Values stay raw in the calc
 * layer. Every rounding goes through {@link round} from `lib/math.js`, so the
 * results match Google Sheets (half away from zero), not `Intl`'s own rules
 * applied to binary floats.
 *
 * Typography conventions used here:
 * - Minus is the real sign U+2212 (`−`), never a hyphen.
 * - A no-break space (U+00A0) separates a number from `%` and from unit labels.
 * - Resolutions use the times sign U+00D7 with plain spaces.
 * - A value that cannot be shown (NaN, Infinity) renders as an em dash `—`.
 *
 * @module lib/format
 */

import { round } from './math.js'
import {
  areaUnitLabel,
  lengthUnitLabel,
  toDisplayArea,
  toDisplayLength,
} from './units.js'

const MINUS = '−'
const NBSP = ' '
const TIMES = '×'
const NOT_A_VALUE = '—'

/** @type {Map<string, Intl.NumberFormat>} Formatters are costly, so cache per locale and digits. */
const formatterCache = new Map()

/**
 * Get (and cache) an `Intl.NumberFormat` with a fixed number of decimals.
 *
 * @param {object} params
 * @param {'en'|'cs'} params.locale
 * @param {number} params.digits Decimal places, shown even when zero.
 * @returns {Intl.NumberFormat}
 */
const getFormatter = ({ locale, digits }) => {
  const cacheKey = `${locale}:${digits}`
  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
    )
  }
  return formatterCache.get(cacheKey)
}

/**
 * Sign for a non-zero value: the real minus sign for negatives, `+` otherwise.
 *
 * @param {number} value Non-zero number.
 * @returns {'+'|'−'}
 */
const signOf = (value) => (value < 0 ? MINUS : '+')

/**
 * Format a number with a fixed number of decimals and locale separators.
 * The value is rounded half away from zero first. Negatives use U+2212.
 *
 * @param {object} params
 * @param {number} params.value Raw number.
 * @param {'en'|'cs'} params.locale UI language (decimal comma in `cs`).
 * @param {number} [params.digits=0] Decimal places.
 * @returns {string}
 *
 * @example
 * formatNumber({ value: 1234.5, locale: 'en', digits: 1 }) // '1,234.5'
 * formatNumber({ value: -2.5, locale: 'en' }) // '−3'
 * formatNumber({ value: 1234.5, locale: 'cs', digits: 1 }) // '1 234,5' (group space)
 */
export const formatNumber = ({ value, locale, digits = 0 }) => {
  if (!Number.isFinite(value)) return NOT_A_VALUE
  const rounded = round({ value, digits })
  return getFormatter({ locale, digits }).format(rounded).replace('-', MINUS)
}

/**
 * Format a ratio as a signed whole percentage, for example a relative change.
 * A value that rounds to 0 % shows `sameLabel` instead of a sign.
 *
 * @param {object} params
 * @param {number} params.ratio Relative change, where 0.02 means 2 %.
 * @param {'en'|'cs'} params.locale UI language.
 * @param {string} [params.sameLabel] Translated "same" text, for example `'stejné'`.
 *   Without it, zero shows as `0 %`.
 * @returns {string} `'+2 %'`, `'−58 %'` or `sameLabel`.
 *
 * @example
 * formatSignedPercent({ ratio: 0.02, locale: 'en', sameLabel: 'same' }) // '+2 %'
 * formatSignedPercent({ ratio: -0.58, locale: 'en', sameLabel: 'same' }) // '−58 %'
 * formatSignedPercent({ ratio: 0.001, locale: 'en', sameLabel: 'same' }) // 'same'
 */
export const formatSignedPercent = ({ ratio, locale, sameLabel }) => {
  if (!Number.isFinite(ratio)) return NOT_A_VALUE
  const percent = round({ value: ratio * 100 })
  if (percent === 0) return sameLabel ?? `0${NBSP}%`
  const magnitude = formatNumber({ value: Math.abs(percent), locale })
  return `${signOf(percent)}${magnitude}${NBSP}%`
}

/**
 * Format a signed number (no unit) rounded to `digits`. Values that round to
 * zero show `sameLabel`, so `+0` and `−0` never appear.
 *
 * @param {object} params
 * @param {number} params.value Raw number.
 * @param {'en'|'cs'} params.locale UI language.
 * @param {string} [params.sameLabel] Translated "same" text. Without it, zero
 *   shows as a plain `0`.
 * @param {number} [params.digits=0] Decimal places.
 * @returns {string} `'+2'`, `'−58'` or `sameLabel`.
 *
 * @example
 * formatSignedNumber({ value: 2, locale: 'en', sameLabel: 'same' }) // '+2'
 * formatSignedNumber({ value: -0.4, locale: 'en', sameLabel: 'same' }) // 'same'
 */
export const formatSignedNumber = ({ value, locale, sameLabel, digits = 0 }) => {
  if (!Number.isFinite(value)) return NOT_A_VALUE
  const rounded = round({ value, digits })
  if (rounded === 0) return sameLabel ?? formatNumber({ value: 0, locale, digits })
  const magnitude = formatNumber({ value: Math.abs(rounded), locale, digits })
  return `${signOf(rounded)}${magnitude}`
}

/**
 * Format a pixel resolution as `width × height`. Rounding to tens is for display
 * only (logical resolutions), and the values have no locale grouping.
 *
 * @param {object} params
 * @param {number} params.width Pixels.
 * @param {number} params.height Pixels.
 * @param {number} [params.roundTo=1] `1` keeps exact values. A power of ten such
 *   as `10` rounds each side to that place.
 * @returns {string}
 *
 * @example
 * formatResolution({ width: 3840, height: 2160 }) // '3840 × 2160'
 * formatResolution({ width: 3072, height: 1728, roundTo: 10 }) // '3070 × 1730'
 */
export const formatResolution = ({ width, height, roundTo = 1 }) => {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return NOT_A_VALUE
  const digits = roundTo > 1 ? -Math.round(Math.log10(roundTo)) : 0
  const w = round({ value: width, digits })
  const h = round({ value: height, digits })
  return `${w} ${TIMES} ${h}`
}

/**
 * Format an OS scale factor as a whole percentage, for example `1.25` → `125 %`.
 *
 * @param {object} params
 * @param {number} params.scale Factor, for example `1.25`.
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string}
 *
 * @example
 * formatScale({ scale: 1.25, locale: 'en' }) // '125 %'
 * formatScale({ scale: 1.1, locale: 'cs' }) // '110 %'
 */
export const formatScale = ({ scale, locale }) => {
  if (!Number.isFinite(scale)) return NOT_A_VALUE
  return `${formatNumber({ value: scale * 100, locale })}${NBSP}%`
}

/**
 * Format a canonical length (inches) in the active unit system, with its unit.
 *
 * @param {object} params
 * @param {number} params.inches Canonical length in inches.
 * @param {'metric'|'imperial'} params.units Unit system.
 * @param {'en'|'cs'} params.locale UI language.
 * @param {number} [params.digits=0] Decimal places. Imperial reads well with 1.
 * @returns {string}
 *
 * @example
 * formatLength({ inches: 23.622, units: 'metric', locale: 'en' }) // '60 cm'
 * formatLength({ inches: 23.622, units: 'imperial', locale: 'cs', digits: 1 }) // '23,6 in'
 */
export const formatLength = ({ inches, units, locale, digits = 0 }) => {
  if (!Number.isFinite(inches)) return NOT_A_VALUE
  const value = toDisplayLength({ inches, units })
  return `${formatNumber({ value, locale, digits })}${NBSP}${lengthUnitLabel(units)}`
}

/**
 * Format a canonical area (square inches) in the active unit system, rounded to
 * whole units. Metric shows dm², imperial in².
 *
 * @param {object} params
 * @param {number} params.squareInches Canonical area in square inches.
 * @param {'metric'|'imperial'} params.units Unit system.
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string}
 *
 * @example
 * formatArea({ squareInches: 757, units: 'imperial', locale: 'en' }) // '757 in²'
 */
export const formatArea = ({ squareInches, units, locale }) => {
  if (!Number.isFinite(squareInches)) return NOT_A_VALUE
  const value = toDisplayArea({ squareInches, units })
  return `${formatNumber({ value, locale })}${NBSP}${areaUnitLabel(units)}`
}

/**
 * Format an angle in degrees with one decimal and the degree sign, without a space.
 *
 * @param {object} params
 * @param {number} params.value Angle in degrees.
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string}
 *
 * @example
 * formatDegrees({ value: 45.23, locale: 'en' }) // '45.2°'
 * formatDegrees({ value: 45.23, locale: 'cs' }) // '45,2°'
 */
export const formatDegrees = ({ value, locale }) => {
  if (!Number.isFinite(value)) return NOT_A_VALUE
  return `${formatNumber({ value, locale, digits: 1 })}°`
}

/**
 * Format an aspect result from `getAspect`. Approximate labels (`isApprox`)
 * are wrapped in typographic double quotes, as in the sheet ("21:9").
 *
 * @param {{ label: string, isApprox: boolean, isMapped: boolean }} aspect
 * @returns {string}
 *
 * @example
 * formatAspect({ label: '21:9', isApprox: true, isMapped: true }) // '“21:9”'
 * formatAspect({ label: '16:9', isApprox: false, isMapped: true }) // '16:9'
 */
export const formatAspect = (aspect) => {
  if (!aspect) return ''
  return aspect.isApprox ? `“${aspect.label}”` : aspect.label
}
