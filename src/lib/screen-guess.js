/**
 * "Like my screen" helper (PRD F22). Browsers expose the logical screen size and
 * the device pixel ratio, not the physical diagonal. From those two values the
 * app can pre-fill the native pixel resolution and the OS scale; the person still
 * types the diagonal.
 *
 * Pure: the screen and the ratio are passed in (both default to the browser's
 * globals), so tests need no stubbing of the real window.
 *
 * @module lib/screen-guess
 */

import { round } from './math.js'

/**
 * @typedef {object} ScreenGuess
 * @property {number} logicalWidth   Larger logical screen side, CSS px (landscape).
 * @property {number} logicalHeight  Smaller logical screen side, CSS px.
 * @property {number} scale          Device pixel ratio, rounded to 4 decimals, e.g. 1.25.
 * @property {number} width          Native pixels along the long side: round(logicalWidth × scale).
 * @property {number} height         Native pixels along the short side: round(logicalHeight × scale).
 */

/**
 * Whether a value is a finite number greater than zero.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isPositiveNumber = (value) => Number.isFinite(value) && value > 0

/**
 * Guess the screen's logical size, scale and native pixel resolution.
 *
 * The longer side is always reported as `width` (and `logicalWidth`), so a
 * portrait screen reads the same as a landscape one. Returns `null` when the
 * browser gives no usable screen size or ratio, for example in jsdom, workers
 * or when `screen` is missing. Callers hide the helper in that case.
 *
 * @param {object} [params]
 * @param {{ width: number, height: number }} [params.screen=globalThis.screen]
 *   Logical screen size in CSS px.
 * @param {number} [params.devicePixelRatio=globalThis.devicePixelRatio]
 *   Device pixel ratio, the OS scale in the browser.
 * @returns {ScreenGuess | null} `null` when unavailable.
 *
 * @example
 * guessScreen({ screen: { width: 1920, height: 1080 }, devicePixelRatio: 1.5 })
 * // { logicalWidth: 1920, logicalHeight: 1080, scale: 1.5, width: 2880, height: 1620 }
 *
 * guessScreen({ screen: { width: 1080, height: 1920 }, devicePixelRatio: 1 })
 * // { logicalWidth: 1920, logicalHeight: 1080, scale: 1, width: 1920, height: 1080 }
 *
 * guessScreen({ screen: { width: 0, height: 0 }, devicePixelRatio: 1 }) // null
 */
export const guessScreen = ({
  screen = globalThis.screen,
  devicePixelRatio = globalThis.devicePixelRatio,
} = {}) => {
  if (!screen || !isPositiveNumber(screen.width) || !isPositiveNumber(screen.height)) {
    return null
  }
  if (!isPositiveNumber(devicePixelRatio)) return null

  const logicalWidth = Math.max(screen.width, screen.height)
  const logicalHeight = Math.min(screen.width, screen.height)
  const scale = round({ value: devicePixelRatio, digits: 4 })

  return {
    logicalWidth,
    logicalHeight,
    scale,
    width: round({ value: logicalWidth * devicePixelRatio }),
    height: round({ value: logicalHeight * devicePixelRatio }),
  }
}
