/**
 * @typedef {object} AngularMetrics   how a display looks from a viewing distance
 * @property {number} horizontalFov   degrees, 2 · atan(W / 2v)
 * @property {number} verticalFov     degrees, 2 · atan(H / 2v)
 * @property {number} ppd             pixels per degree at the viewing distance
 * @property {number} logicalPpd      ppd / scale
 */

/**
 * @typedef {object} EquivalentDistances   viewing distances, in the same unit as the inputs
 * @property {number} sameSize        v_ref × L / L_ref, where L is height, width or diagonal
 * @property {number} sameSharpness   v_ref × ppi_ref / ppi
 * @property {number} sameTextSize    v_ref × (ppi_ref / s_ref) / (ppi / s)
 */

/**
 * Radians to degrees.
 *
 * @type {number}
 */
const DEGREES_PER_RADIAN = 180 / Math.PI

/**
 * Horizontal or vertical field of view: the angle the display covers from a
 * given distance.
 *
 * Size and distance must share a unit, and the result is in degrees. The sheet
 * does not show this; the port adds it for F14.
 *
 * @param {object} params
 * @param {number} params.size Width or height of the display (inches).
 * @param {number} params.distance Viewing distance (inches).
 * @returns {number} Degrees, unrounded.
 *
 * @example
 * getFieldOfView({ size: 20.92, distance: 23.62 }) // ≈ 47.76
 */
export const getFieldOfView = ({ size, distance }) =>
  2 * Math.atan(size / (2 * distance)) * DEGREES_PER_RADIAN

/**
 * Pixels per degree at a viewing distance, using the small-angle approximation
 * (off by under 0.1 % at desk distances, PRD).
 *
 * @param {object} params
 * @param {number} params.ppi Pixels per inch.
 * @param {number} params.distance Viewing distance in inches.
 * @returns {number} Pixels per degree, unrounded.
 *
 * @example
 * getPpd({ ppi: 91.79, distance: 60 / 2.54 }) // ≈ 37.84
 */
export const getPpd = ({ ppi, distance }) => (ppi * distance * Math.PI) / 180

/**
 * Angular metrics of one display at a viewing distance and OS scale (F14).
 *
 * @param {object} params
 * @param {import('./geometry.js').DisplayMetrics} params.metrics
 * @param {number} params.distance Viewing distance in inches.
 * @param {number} params.scale OS scale factor, e.g. 1.5.
 * @returns {AngularMetrics}
 *
 * @example
 * getAngularMetrics({ metrics, distance: 60 / 2.54, scale: 1.25 })
 * // { horizontalFov: 47.76, verticalFov: 27.97, ppd: 37.84, logicalPpd: 30.27 }
 */
export const getAngularMetrics = ({ metrics, distance, scale }) => {
  const ppd = getPpd({ ppi: metrics.ppi, distance })
  return {
    horizontalFov: getFieldOfView({ size: metrics.widthIn, distance }),
    verticalFov: getFieldOfView({ size: metrics.heightIn, distance }),
    ppd,
    logicalPpd: ppd / scale,
  }
}

/**
 * Physical length used to match apparent size, per `sizeMatchBy` (PRD).
 *
 * @type {Record<'height'|'width'|'diagonal', (metrics: import('./geometry.js').DisplayMetrics) => number>}
 */
const SIZE_OF = {
  height: ({ heightIn }) => heightIn,
  width: ({ widthIn }) => widthIn,
  diagonal: ({ widthIn, heightIn }) => Math.hypot(widthIn, heightIn),
}

/**
 * Viewing distances at which a candidate matches the baseline in three ways
 * (F15): apparent size, sharpness (PPD) and text/UI size at the chosen scales.
 *
 * The apparent-size match is exact: equal angle means equal L / v. The sharpness
 * and text matches use the small-angle approximation.
 *
 * Inputs and outputs use one length unit, inches. Convert at the format layer.
 * An unknown `sizeMatchBy` falls back to height.
 *
 * @param {object} params
 * @param {{ metrics: import('./geometry.js').DisplayMetrics, distance: number, scale: number }} params.baseline
 *   Reference display, its viewing distance (inches) and its OS scale.
 * @param {{ metrics: import('./geometry.js').DisplayMetrics, scale: number }} params.candidate
 *   Candidate display and its OS scale.
 * @param {'height'|'width'|'diagonal'} [params.sizeMatchBy='height']
 * @returns {EquivalentDistances}
 *
 * @example
 * // Baseline 24″ FHD at 60 cm and 100 %; candidate 32″ 4K at 150 %.
 * getEquivalentDistances({ baseline, candidate })
 * // { sameSize: 80 cm, sameSharpness: 40 cm, sameTextSize: 60 cm } (in inches)
 */
export const getEquivalentDistances = ({
  baseline,
  candidate,
  sizeMatchBy = 'height',
}) => {
  const sizeOf = Object.hasOwn(SIZE_OF, sizeMatchBy)
    ? SIZE_OF[sizeMatchBy]
    : SIZE_OF.height
  const referenceSize = sizeOf(baseline.metrics)
  const candidateSize = sizeOf(candidate.metrics)
  const referencePpi = baseline.metrics.ppi
  const candidatePpi = candidate.metrics.ppi

  return {
    sameSize: (baseline.distance * candidateSize) / referenceSize,
    sameSharpness: (baseline.distance * referencePpi) / candidatePpi,
    sameTextSize:
      (baseline.distance * (referencePpi / baseline.scale)) /
      (candidatePpi / candidate.scale),
  }
}
