/**
 * Pure rules behind the "Add display" form: validation ranges, tag suggestion,
 * default scale, the live preview and the submit payload. The component only
 * renders and wires events; everything that decides a value lives here, so it is
 * tested without a DOM.
 *
 * Lengths are inches, as everywhere else. The distance in a draft is inches too;
 * the form converts it to and from the active unit system.
 *
 * @module components/add-display/add-display-model
 */

import {
  getAspect,
  getBestScale,
  getDisplayMetrics,
  getScalingMatrix,
} from '../../lib/calc/index.js'
import { defaultDistanceFor, inToCm } from '../../lib/units.js'

/**
 * @typedef {object} ScaleOption   Element of the list from `scaleOptionsFor`.
 * @property {number} scale        factor, e.g. 1.25
 */

/**
 * @typedef {object} FormDraft   Internal state of the form. Numbers are NaN when empty.
 * @property {string} name
 * @property {number} diagonal        inches
 * @property {number} width           native px
 * @property {number} height          native px
 * @property {'laptop'|'monitor'|'ultrawide'|null} tag   null = follow the suggestion
 * @property {boolean} isFamiliar
 * @property {number|null} distance   inches; null = default for the tag
 * @property {number|null} scale      factor; null = best comfortable scale
 */

/**
 * @typedef {object} AddDisplayPayload   What the form submits.
 * @property {string} name            trimmed
 * @property {number} diagonal        inches
 * @property {number} width           native px
 * @property {number} height          native px
 * @property {'laptop'|'monitor'|'ultrawide'} tag
 * @property {boolean} isFamiliar
 * @property {number} distance        inches
 * @property {number} scale           factor
 */

/**
 * Comfort window used to pick the default scale for a new display (PRD F7). The
 * PPI rule with the default bounds; the form has no comfort settings of its own.
 *
 * @type {Readonly<{ mode: 'ppi', minPpi: number, maxPpi: number, minPpd: number,
 *   maxPpd: number, minWidth: number }>}
 */
export const DEFAULT_COMFORT = Object.freeze({
  mode: 'ppi',
  minPpi: 90,
  maxPpi: 105,
  minPpd: 37,
  maxPpd: 43,
  minWidth: 1024,
})

/**
 * Allowed diagonal, inches.
 *
 * @type {Readonly<{ min: number, max: number }>}
 */
export const DIAGONAL_RANGE = Object.freeze({ min: 5, max: 120 })

/**
 * Allowed native width or height, whole pixels.
 *
 * @type {Readonly<{ min: number, max: number }>}
 */
export const PIXEL_RANGE = Object.freeze({ min: 320, max: 20000 })

/**
 * Allowed viewing distance for a familiar display, centimetres.
 *
 * @type {Readonly<{ min: number, max: number }>}
 */
export const DISTANCE_RANGE_CM = Object.freeze({ min: 10, max: 300 })

/** Diagonals at or below this are suggested as laptops, inches. */
const LAPTOP_MAX_DIAGONAL = 17.3

/** Width ÷ height at or above this is suggested as an ultrawide. */
const ULTRAWIDE_MIN_RATIO = 2.2

/**
 * Common resolutions offered as chips (PRD F17, presets). Order is the display
 * order.
 *
 * @type {ReadonlyArray<{ width: number, height: number }>}
 */
export const RESOLUTION_PRESETS = Object.freeze(
  [
    [1920, 1080],
    [1920, 1200],
    [2560, 1440],
    [2560, 1600],
    [2560, 1080],
    [3440, 1440],
    [3840, 1600],
    [3840, 2160],
    [5120, 1440],
    [5120, 2160],
    [5120, 2880],
    [6016, 3384],
    [7680, 4320],
  ].map(([width, height]) => Object.freeze({ width, height })),
)

/**
 * Whether a value is a finite number.
 *
 * @param {unknown} value
 * @returns {value is number}
 */
const isNumber = (value) => Number.isFinite(value)

/**
 * Whether a number lies in an inclusive range.
 *
 * @param {object} params
 * @param {number} params.value
 * @param {{ min: number, max: number }} params.range
 * @returns {boolean}
 */
const isInRange = ({ value, range }) => value >= range.min && value <= range.max

/**
 * Tag the form suggests while the person has not picked one: laptop for a
 * diagonal up to 17.3 in, ultrawide for a width ÷ height of at least 2.2, and
 * monitor otherwise. The laptop rule wins when both match.
 *
 * @param {{ diagonal: number, width: number, height: number }} display
 * @returns {'laptop'|'monitor'|'ultrawide'}
 *
 * @example
 * suggestTag({ diagonal: 14.2, width: 3024, height: 1964 }) // 'laptop'
 * suggestTag({ diagonal: 34, width: 3440, height: 1440 }) // 'ultrawide'
 * suggestTag({ diagonal: 27, width: 3840, height: 2160 }) // 'monitor'
 */
export const suggestTag = ({ diagonal, width, height }) => {
  if (isNumber(diagonal) && diagonal <= LAPTOP_MAX_DIAGONAL) return 'laptop'
  if (isNumber(width) && isNumber(height) && height > 0) {
    if (width / height >= ULTRAWIDE_MIN_RATIO) return 'ultrawide'
  }
  return 'monitor'
}

/**
 * Whether the draft describes a display that can be measured: all three numbers
 * are positive. Preview and scale defaults need this; validation reports the
 * exact problem.
 *
 * @param {{ diagonal: number, width: number, height: number }} draft
 * @returns {boolean}
 *
 * @example
 * isMeasurable({ diagonal: 27, width: 3840, height: 2160 }) // true
 * isMeasurable({ diagonal: NaN, width: 3840, height: 2160 }) // false
 */
export const isMeasurable = ({ diagonal, width, height }) =>
  [diagonal, width, height].every((value) => isNumber(value) && value > 0)

/**
 * Check the draft's fields against the allowed ranges. A field that is empty is
 * `required`; a number outside its range is `range`. Distance is checked only
 * when the display is marked familiar.
 *
 * @param {object} params
 * @param {{ name: string, diagonal: number, width: number, height: number,
 *   distance: number, isFamiliar: boolean }} params.values Distance in inches.
 * @returns {{ errors: Partial<Record<'name'|'diagonal'|'width'|'height'|'distance', string>>,
 *   isValid: boolean }} Error code per field, and whether the whole form may submit.
 *
 * @example
 * validateDraft({ values: { name: '', diagonal: 27, width: 3840, height: 2160,
 *   distance: 23.6, isFamiliar: false } })
 * // { errors: { name: 'required' }, isValid: false }
 */
export const validateDraft = ({ values }) => {
  const errors = {}

  if (values.name.trim() === '') errors.name = 'required'

  if (!isNumber(values.diagonal)) {
    errors.diagonal = 'required'
  } else if (!isInRange({ value: values.diagonal, range: DIAGONAL_RANGE })) {
    errors.diagonal = 'range'
  }

  for (const field of ['width', 'height']) {
    const value = values[field]
    if (!isNumber(value)) {
      errors[field] = 'required'
    } else if (!Number.isInteger(value) || !isInRange({ value, range: PIXEL_RANGE })) {
      errors[field] = 'range'
    }
  }

  if (values.isFamiliar) {
    if (!isNumber(values.distance)) {
      errors.distance = 'required'
    } else if (!isInRange({ value: inToCm(values.distance), range: DISTANCE_RANGE_CM })) {
      errors.distance = 'range'
    }
  }

  return { errors, isValid: Object.keys(errors).length === 0 }
}

/**
 * The scale the form starts from for a measurable display: the best comfortable
 * scale of its options (closest to the middle of the window), or 1 when nothing
 * fits or the display cannot be measured.
 *
 * @param {object} params
 * @param {{ width: number, height: number, diagonal: number }} params.display
 * @param {ScaleOption[]} params.scaleOptions Options from the caller (`scaleOptionsFor`).
 * @param {object} [params.comfort=DEFAULT_COMFORT]
 * @returns {number} Scale factor, e.g. 1.25.
 *
 * @example
 * getDefaultScale({ display: { width: 3840, height: 2160, diagonal: 27 },
 *   scaleOptions: [{ scale: 1 }, { scale: 1.25 }, { scale: 1.5 }] }) // 1.5
 */
export const getDefaultScale = ({ display, scaleOptions, comfort = DEFAULT_COMFORT }) => {
  if (!isMeasurable(display) || scaleOptions.length === 0) return 1
  const metrics = getDisplayMetrics(display)
  const rows = getScalingMatrix({ display, metrics, scaleOptions, comfort })
  const best = getBestScale({ rows, comfort })
  return best?.scale ?? 1
}

/**
 * Live preview values for a measurable display: PPI, aspect, physical size and
 * diagonal, shown while typing (PRD UX, "Add display").
 *
 * @param {{ width: number, height: number, diagonal: number }} display
 * @returns {{ ppi: number, aspect: { label: string, isApprox: boolean, isMapped: boolean },
 *   widthIn: number, heightIn: number, diagonalIn: number } | null}
 *   `null` when the display cannot be measured yet.
 *
 * @example
 * getPreview({ width: 3840, height: 2160, diagonal: 27 }).ppi // ≈ 163.2
 */
export const getPreview = ({ width, height, diagonal }) => {
  if (!isMeasurable({ width, height, diagonal })) return null
  const metrics = getDisplayMetrics({ width, height, diagonal })
  return {
    ppi: metrics.ppi,
    aspect: getAspect({ width, height }),
    widthIn: metrics.widthIn,
    heightIn: metrics.heightIn,
    diagonalIn: diagonal,
  }
}

/**
 * Build the submit payload from a draft. The effective tag, distance and scale
 * are resolved here: a picked tag wins over the suggestion, and the distance and
 * scale fall back to their defaults when the person has not set them.
 *
 * @param {object} params
 * @param {FormDraft} params.draft
 * @param {number} params.scale Effective scale factor (picked or default).
 * @returns {AddDisplayPayload}
 *
 * @example
 * buildPayload({ draft, scale: 1.5 }).tag // 'monitor'
 */
export const buildPayload = ({ draft, scale }) => {
  const tag =
    draft.tag ??
    suggestTag({ diagonal: draft.diagonal, width: draft.width, height: draft.height })
  return {
    name: draft.name.trim(),
    diagonal: draft.diagonal,
    width: draft.width,
    height: draft.height,
    tag,
    isFamiliar: draft.isFamiliar,
    distance: draft.distance ?? defaultDistanceFor({ tag }),
    scale,
  }
}
