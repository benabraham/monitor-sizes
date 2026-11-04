/**
 * Shared test fixtures for the display forms: sample displays and a `scaleOptionsFor`
 * built on the real scale calculation (Windows preset), so tests run the same
 * numbers the app shows. Not imported by the app.
 *
 * @module components/add-display/add-display.fixtures
 */

import { getScaleOptions } from '../../lib/calc/index.js'

/**
 * Scale options for a display with the Windows preset and no custom scales.
 *
 * @param {{ width: number, height: number, diagonal: number }} display
 * @returns {Array<{ scale: number }>}
 *
 * @example
 * windowsScaleOptionsFor({ width: 3840, height: 2160 }).map((o) => o.scale)
 * // [1, 1.25, 1.5, 1.75, 2]
 */
export const windowsScaleOptionsFor = (display) =>
  getScaleOptions({ display, presetId: 'windows', customScales: [] })

/** 27″ 4K monitor. PPI 163; best comfortable scale 175 %. */
export const DISPLAY_4K_27 = Object.freeze({
  id: '27-4k-3840x2160',
  name: '4K 27″',
  diagonal: 27,
  width: 3840,
  height: 2160,
  tag: 'monitor',
})

/** 24″ Full HD monitor. PPI 92; best comfortable scale 100 %. */
export const DISPLAY_FHD_24 = Object.freeze({
  id: '24-1920x1080',
  name: 'FHD 24″',
  diagonal: 24,
  width: 1920,
  height: 1080,
  tag: 'monitor',
})

/** 14.2″ laptop. PPI 254; no Windows scale fits, so the closest (200 %) applies. */
export const DISPLAY_MBP_14 = Object.freeze({
  id: '14-2-3024x1964',
  name: 'MacBook Pro 14″',
  diagonal: 14.2,
  width: 3024,
  height: 1964,
  tag: 'laptop',
})

/** 34″ ultrawide. */
export const DISPLAY_UW_34 = Object.freeze({
  id: '34-3440x1440',
  name: 'UW 34″',
  diagonal: 34,
  width: 3440,
  height: 1440,
  tag: 'ultrawide',
})
