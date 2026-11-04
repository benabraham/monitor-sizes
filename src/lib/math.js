/**
 * Numeric helpers shared by the calculation and formatting layers.
 *
 * Google Sheets' `ROUND()` rounds half away from zero (−2.5 → −3), while
 * JavaScript's `Math.round()` rounds half towards +∞ (−2.5 → −2). The port must
 * match the sheet (PRD: Calculation spec), so every displayed rounding goes
 * through {@link round}.
 *
 * @module lib/math
 */

/**
 * Round half away from zero, like Google Sheets `ROUND(value, digits)`.
 *
 * A tiny epsilon compensates for binary floating point (1.005 is stored as
 * 1.00499999…), so values that print as an exact half round the way a human
 * (and the sheet) expects.
 *
 * @param {object} params
 * @param {number} params.value Number to round.
 * @param {number} [params.digits=0] Decimal places. Negative values round to
 *   tens, hundreds…, e.g. `-1` rounds 3072 → 3070 (used for logical
 *   resolutions).
 * @returns {number} The rounded number (never `-0`).
 *
 * @example
 * round({ value: 2.5 }) // 3
 * round({ value: -2.5 }) // -3
 * round({ value: 3072, digits: -1 }) // 3070
 * round({ value: 8.2944, digits: 1 }) // 8.3
 */
export const round = ({ value, digits = 0 }) => {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** digits
  const scaled = Math.abs(value) * factor
  const rounded = Math.round(scaled + Number.EPSILON * scaled) / factor
  const signed = Math.sign(value) * rounded
  return signed === 0 ? 0 : signed
}

/**
 * Greatest common divisor of two non-negative integers (Euclid).
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 *
 * @example
 * gcd(3840, 2160) // 240
 */
export const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b))

/**
 * Clamp a number into an inclusive range.
 *
 * @param {object} params
 * @param {number} params.value
 * @param {number} params.min
 * @param {number} params.max
 * @returns {number}
 */
export const clamp = ({ value, min, max }) => Math.min(max, Math.max(min, value))
