/**
 * OS scale presets (F21), OS detection to pick a default preset, and parsing of
 * user-typed custom scales.
 *
 * Windows and Linux/Wayland offer fixed scale factors. macOS offers "looks like"
 * widths instead: a display's scale is its native width divided by the width it
 * looks like, which `getScaleOptions` (calc/scaling.js) derives per display.
 *
 * @module lib/scales
 */

import { round } from './math.js'

/**
 * @typedef {'windows'|'macos'|'linux'} PresetId
 */

/**
 * Preset scale lists. `factor` values are scale factors (1.25 = 125 %); `looksLike`
 * values are logical widths in px (macOS). Frozen all the way down, because the
 * lists are shared constants.
 *
 * @type {Readonly<Record<PresetId, { kind: 'factor'|'looksLike', values: readonly number[] }>>}
 *
 * @example
 * SCALE_PRESETS.windows.values // [1, 1.25, 1.5, 1.75, 2]
 * SCALE_PRESETS.macos.kind // 'looksLike'
 */
export const SCALE_PRESETS = Object.freeze({
  windows: Object.freeze({
    kind: 'factor',
    values: Object.freeze([1, 1.25, 1.5, 1.75, 2]),
  }),
  macos: Object.freeze({
    kind: 'looksLike',
    values: Object.freeze([
      1280, 1440, 1512, 1680, 1728, 1920, 2048, 2304, 2560, 3008, 3200,
    ]),
  }),
  linux: Object.freeze({
    kind: 'factor',
    values: Object.freeze([1, 1.1, 1.25, 1.5, 1.75, 2]),
  }),
})

const APPLE_PATTERN = /\b(?:Mac|iPhone|iPad|iPod)|\biOS\b/i
const ANDROID_PATTERN = /\bAndroid\b/i
const LINUX_PATTERN = /\b(?:Linux|X11|CrOS)\b/i

/**
 * Read the user agent, or `''` when there is no navigator (tests, workers).
 *
 * @returns {string}
 */
const readUserAgent = () =>
  typeof navigator === 'undefined' ? '' : (navigator.userAgent ?? '')

/**
 * Read the platform, preferring the Chromium `userAgentData` value, or `''`.
 *
 * @returns {string}
 */
const readPlatform = () => {
  if (typeof navigator === 'undefined') return ''
  return navigator.userAgentData?.platform ?? navigator.platform ?? ''
}

/**
 * Pick the OS scale preset that matches the device.
 *
 * Mac, iPhone, iPad and iOS give `'macos'`. Android is checked before Linux, because
 * Android reports "Linux" in both its user agent and its platform, and it gives
 * `'windows'`. Other Linux, X11 and ChromeOS systems give `'linux'`. Anything else
 * (Windows or unknown) gives `'windows'`, the most common preset.
 *
 * Both arguments default to the browser's `navigator`, so a call with no arguments
 * detects the current device.
 *
 * @param {object} [params]
 * @param {string} [params.userAgent=navigator.userAgent]
 * @param {string} [params.platform=navigator.userAgentData?.platform ?? navigator.platform]
 * @returns {PresetId}
 *
 * @example
 * detectPresetId({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)', platform: 'MacIntel' })
 * // 'macos'
 * detectPresetId({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64' })
 * // 'linux'
 * detectPresetId({ userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv8l' })
 * // 'windows'
 */
export const detectPresetId = ({
  userAgent = readUserAgent(),
  platform = readPlatform(),
} = {}) => {
  const haystack = `${userAgent} ${platform}`
  if (APPLE_PATTERN.test(haystack)) return 'macos'
  if (ANDROID_PATTERN.test(haystack)) return 'windows'
  if (LINUX_PATTERN.test(haystack)) return 'linux'
  return 'windows'
}

/** Accepts `133`, `133 %`, `1.33`, `1,33`, `2×`, `2x` (and the spaces around them). */
const SCALE_INPUT_PATTERN = /^(\d+(?:[.,]\d+)?|[.,]\d+)\s*(%|×|x)?$/i
const MIN_SCALE = 0.5
const MAX_SCALE = 4
/** Bare numbers from this value up are percents: `133` means 1.33, `1.33` stays a factor. */
const PERCENT_THRESHOLD = 10

/**
 * Turn the number and suffix from the input into a factor, before rounding.
 *
 * @param {object} params
 * @param {number} params.value The number the user typed.
 * @param {string|undefined} params.suffix `%`, `×` or `x`, when given.
 * @returns {number}
 */
const toFactor = ({ value, suffix }) => {
  if (suffix === '%') return value / 100
  if (suffix) return value
  return value >= PERCENT_THRESHOLD ? value / 100 : value
}

/**
 * Parse a scale the user typed into a factor, for custom scales (F21).
 *
 * Accepts a percent (`133`, `133 %`, `133%`, a number of 10 or more), or a factor
 * (`1.33`, `1,33`, `2×`, `2x`). A bare number below 10 is a factor, and a bare
 * number of 10 or more is a percent, so `2` is 200 % and `150` is 150 %. The result
 * is rounded to 4 decimals and must be between 0.5 and 4 inclusive. Anything else
 * returns `null`.
 *
 * @param {string} text
 * @returns {number|null} The scale factor, or `null` if the input is invalid.
 *
 * @example
 * parseScaleInput('133') // 1.33
 * parseScaleInput('1,33') // 1.33
 * parseScaleInput('2×') // 2
 * parseScaleInput('49') // null (below 0.5)
 * parseScaleInput('abc') // null
 */
export const parseScaleInput = (text) => {
  if (typeof text !== 'string') return null
  const match = SCALE_INPUT_PATTERN.exec(text.trim())
  if (!match) return null
  const [, digits, suffix] = match
  const value = Number(digits.replace(',', '.'))
  const factor = round({ value: toFactor({ value, suffix }), digits: 4 })
  return factor >= MIN_SCALE && factor <= MAX_SCALE ? factor : null
}
