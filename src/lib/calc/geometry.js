import { getAspect } from './aspect.js'

/**
 * @typedef {object} DisplayMetrics
 * @property {number} ppi            √(w² + h²) / d, pixels per inch
 * @property {number} widthIn        w / ppi, physical width in inches
 * @property {number} heightIn       h / ppi, physical height in inches
 * @property {number} areaIn2        widthIn × heightIn, square inches
 * @property {number} megapixels     w × h / 10⁶ (native, unscaled)
 * @property {import('./aspect.js').Aspect} aspect
 */

/**
 * @typedef {object} RelativeMetrics   relative to the active baseline
 * @property {number} relativePixelSize   ppi_ref / ppi − 1
 * @property {number} widthDiffIn         widthIn − widthIn_ref, inches
 * @property {number} heightDiffIn        heightIn − heightIn_ref, inches
 * @property {number} areaRatio           areaIn2 / areaIn2_ref − 1 (no ABS, PRD fix)
 * @property {number} megapixelRatio      megapixels / megapixels_ref − 1
 */

/**
 * Pixels per inch of a display from its resolution and diagonal.
 *
 * Inputs are not validated: a zero or negative diagonal yields `Infinity` or a
 * negative number. The UI validates before calling.
 *
 * @param {object} params
 * @param {number} params.width Native width in pixels.
 * @param {number} params.height Native height in pixels.
 * @param {number} params.diagonal Physical diagonal in inches.
 * @returns {number} Pixels per inch (raw, unrounded).
 *
 * @example
 * getPpi({ width: 3840, height: 2160, diagonal: 42 }) // ≈ 104.90
 */
export const getPpi = ({ width, height, diagonal }) =>
  Math.sqrt(width ** 2 + height ** 2) / diagonal

/**
 * Every derived metric of a display, computed from its inputs (F1). Nothing here
 * is stored; call it again whenever the inputs change.
 *
 * @param {{ width: number, height: number, diagonal: number }} display
 *   Native width and height in pixels, diagonal in inches. Other fields
 *   (name, tag, id) are ignored.
 * @returns {DisplayMetrics} Raw, unrounded metrics in canonical units (inches).
 *
 * @example
 * const { ppi, widthIn, aspect } = getDisplayMetrics({
 *   width: 1920, height: 1080, diagonal: 24,
 * })
 * // ppi ≈ 91.79, widthIn ≈ 20.92, aspect.label === '16:9'
 */
export const getDisplayMetrics = (display) => {
  const { width, height, diagonal } = display
  const ppi = getPpi({ width, height, diagonal })
  const widthIn = width / ppi
  const heightIn = height / ppi

  return {
    ppi,
    widthIn,
    heightIn,
    areaIn2: widthIn * heightIn,
    megapixels: (width * height) / 1e6,
    aspect: getAspect({ width, height }),
  }
}

/**
 * Differences and ratios of a display against the active baseline. These drive the
 * "%" and "diff" columns of the sheet, now computed against the familiar set's
 * active baseline (F3).
 *
 * Signs follow the sheet: a positive `relativePixelSize` means the display is
 * coarser than the baseline. Use the format layer to show "same" when a value
 * rounds to 0.
 *
 * @param {object} params
 * @param {DisplayMetrics} params.metrics The display to describe.
 * @param {DisplayMetrics} params.baselineMetrics The active baseline.
 * @returns {RelativeMetrics}
 *
 * @example
 * getRelativeMetrics({ metrics: fhdMetrics, baselineMetrics: fourKMetrics })
 * // { relativePixelSize: 0.14, widthDiffIn: -15.7, … }
 */
export const getRelativeMetrics = ({ metrics, baselineMetrics }) => ({
  relativePixelSize: baselineMetrics.ppi / metrics.ppi - 1,
  widthDiffIn: metrics.widthIn - baselineMetrics.widthIn,
  heightDiffIn: metrics.heightIn - baselineMetrics.heightIn,
  areaRatio: metrics.areaIn2 / baselineMetrics.areaIn2 - 1,
  megapixelRatio: metrics.megapixels / baselineMetrics.megapixels - 1,
})
