import { gcd } from '../math.js'

/**
 * @typedef {object} Aspect
 * @property {string} label       marketing name (`16:9`, `21:9`) or raw ratio (`1.55:1`)
 * @property {boolean} isApprox   true for near-miss ratios shown quoted in the sheet
 * @property {boolean} isMapped   false when the ratio has no marketing name
 */

/**
 * Marketing names for reduced aspect ratios. Keys are `w:h` after dividing both
 * sides by their GCD. `isApprox` marks ratios that are close to, but not exactly,
 * the named one (rendered as “21:9” in the sheet).
 *
 * @type {Record<string, { label: string, isApprox?: boolean }>}
 */
const ASPECT_NAMES = {
  '16:9': { label: '16:9' },
  '8:5': { label: '16:10' },
  '7:3': { label: '21:9' },
  '64:27': { label: '21:9', isApprox: true },
  '43:18': { label: '21:9', isApprox: true },
  '32:9': { label: '32:9' },
  '12:5': { label: '24:10' },
  '21:10': { label: '21:10' },
  '16:5': { label: '32:10' },
}

/**
 * Describe a pixel resolution's aspect ratio with a marketing name where one
 * exists.
 *
 * The width and height are reduced by their GCD and looked up in a table of
 * known ratios (16:9, 16:10, 21:9, 32:9, 24:10, …). Ratios that are not in the
 * table, such as the MacBook panels near 1.55:1, get the raw ratio as the label
 * and `isMapped: false`. This replaces the sheet's float-equality `IFS` chain,
 * which mislabelled those panels as "16:9" (PRD: Sheet issues to fix).
 *
 * @param {object} params
 * @param {number} params.width Native width in pixels.
 * @param {number} params.height Native height in pixels.
 * @returns {{ label: string, isApprox: boolean, isMapped: boolean }}
 *   `label` is the marketing name or `"<w/h to 2 dp>:1"`. `isApprox` is true
 *   for near-miss ratios such as 64:27 (shown as “21:9”). `isMapped` is false
 *   when the ratio has no marketing name.
 *
 * @example
 * getAspect({ width: 3840, height: 2160 }) // { label: '16:9', isApprox: false, isMapped: true }
 * getAspect({ width: 3440, height: 1440 }) // { label: '21:9', isApprox: true, isMapped: true }
 * getAspect({ width: 3456, height: 2234 }) // { label: '1.55:1', isApprox: false, isMapped: false }
 */
export const getAspect = ({ width, height }) => {
  const divisor = gcd(width, height)
  const key = `${width / divisor}:${height / divisor}`
  const named = ASPECT_NAMES[key]

  if (!named) {
    return {
      label: `${(width / height).toFixed(2)}:1`,
      isApprox: false,
      isMapped: false,
    }
  }

  return {
    label: named.label,
    isApprox: named.isApprox ?? false,
    isMapped: true,
  }
}
