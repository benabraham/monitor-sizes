/**
 * Unit conversion between the canonical inch values and the metric or imperial
 * display systems (PRD: Units, F16).
 *
 * Every stored value is canonical: lengths and distances in inches, areas in
 * square inches. Conversion happens only at the edges (display and input), so
 * switching the unit system never accumulates rounding error.
 *
 * Metric shows lengths in centimetres and areas in square decimetres. Imperial
 * shows inches and square inches. Diagonal and PPI stay inch-based in both
 * systems, so this module does not touch them.
 *
 * @module lib/units
 */

/** Centimetres in one inch (exact by definition). */
export const CM_PER_INCH = 2.54

/** Square decimetres in one square inch: 1 in² = 6.4516 cm² = 0.064516 dm². */
const DM2_PER_IN2 = CM_PER_INCH ** 2 / 100

/**
 * Default viewing distance in inches: 60 cm for monitors, 45 cm for laptops
 * (PRD decision). Frozen, because it is shared configuration.
 *
 * @type {Readonly<{ monitor: number, laptop: number }>}
 *
 * @example
 * DEFAULT_DISTANCE.monitor // 23.622… (60 cm)
 */
export const DEFAULT_DISTANCE = Object.freeze({
  monitor: 60 / CM_PER_INCH,
  laptop: 45 / CM_PER_INCH,
})

/**
 * True only for the imperial system. Any other value is treated as metric,
 * which is the default (F16).
 *
 * @param {string} units
 * @returns {boolean}
 */
const isImperial = (units) => units === 'imperial'

/**
 * Convert centimetres to inches.
 *
 * @param {number} cm Length in centimetres.
 * @returns {number} Length in inches.
 *
 * @example
 * cmToIn(2.54) // 1
 */
export const cmToIn = (cm) => cm / CM_PER_INCH

/**
 * Convert inches to centimetres.
 *
 * @param {number} inches Length in inches.
 * @returns {number} Length in centimetres.
 *
 * @example
 * inToCm(1) // 2.54
 */
export const inToCm = (inches) => inches * CM_PER_INCH

/**
 * Convert a canonical length (inches) into the number shown for a unit system.
 *
 * @param {object} params
 * @param {number} params.inches Canonical length in inches.
 * @param {'metric'|'imperial'} params.units Unit system.
 * @returns {number} Centimetres for metric, inches for imperial.
 *
 * @example
 * toDisplayLength({ inches: 23.622047, units: 'metric' }) // ≈ 60
 * toDisplayLength({ inches: 23.5, units: 'imperial' }) // 23.5
 */
export const toDisplayLength = ({ inches, units }) =>
  isImperial(units) ? inches : inToCm(inches)

/**
 * Convert a length typed in the active unit system back to canonical inches.
 *
 * @param {object} params
 * @param {number} params.value Number as the user entered it.
 * @param {'metric'|'imperial'} params.units Unit system of the value.
 * @returns {number} Length in inches.
 *
 * @example
 * fromDisplayLength({ value: 60, units: 'metric' }) // ≈ 23.622
 */
export const fromDisplayLength = ({ value, units }) =>
  isImperial(units) ? value : cmToIn(value)

/**
 * Convert a canonical area (square inches) into the number shown for a unit
 * system.
 *
 * @param {object} params
 * @param {number} params.squareInches Canonical area in square inches.
 * @param {'metric'|'imperial'} params.units Unit system.
 * @returns {number} Square decimetres for metric, square inches for imperial.
 *
 * @example
 * toDisplayArea({ squareInches: 100, units: 'metric' }) // ≈ 6.4516
 */
export const toDisplayArea = ({ squareInches, units }) =>
  isImperial(units) ? squareInches : squareInches * DM2_PER_IN2

/**
 * Short unit label for lengths. Not translated: the abbreviations are the same
 * in both languages.
 *
 * @param {'metric'|'imperial'} units
 * @returns {'cm'|'in'}
 *
 * @example
 * lengthUnitLabel('metric') // 'cm'
 */
export const lengthUnitLabel = (units) => (isImperial(units) ? 'in' : 'cm')

/**
 * Short unit label for areas.
 *
 * @param {'metric'|'imperial'} units
 * @returns {'dm²'|'in²'}
 *
 * @example
 * areaUnitLabel('imperial') // 'in²'
 */
export const areaUnitLabel = (units) => (isImperial(units) ? 'in²' : 'dm²')

/**
 * Default viewing distance for a display, in inches. Laptops sit closer
 * (45 cm). Monitors, ultrawides and untagged displays use 60 cm.
 *
 * @param {{ tag?: string }} display Display record (only `tag` is read).
 * @returns {number} Distance in inches.
 *
 * @example
 * defaultDistanceFor({ tag: 'laptop' }) === DEFAULT_DISTANCE.laptop // true
 * defaultDistanceFor({ tag: 'ultrawide' }) === DEFAULT_DISTANCE.monitor // true
 */
export const defaultDistanceFor = (display) =>
  display?.tag === 'laptop' ? DEFAULT_DISTANCE.laptop : DEFAULT_DISTANCE.monitor
