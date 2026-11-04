/**
 * Label and number helpers shared by the Compare visualization components. They
 * only wrap `lib/format.js`, so every number still goes through the format layer.
 *
 * @module components/compare-visual/format-helpers
 */

import { formatNumber } from '../../lib/format.js'

/**
 * Decimal places for physical lengths: whole centimetres, one decimal in inches.
 *
 * @param {'metric'|'imperial'} units
 * @returns {number}
 *
 * @example
 * lengthDigits('metric') // 0
 * lengthDigits('imperial') // 1
 */
export const lengthDigits = (units) => (units === 'imperial' ? 1 : 0)

/**
 * Diagonal as the sheet and the PRD write it: a number and the inch mark ″ with no
 * space, for example `24″` or `13,3″` in Czech. Whole numbers show no decimal.
 *
 * @param {object} params
 * @param {number} params.inches Diagonal in inches.
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string}
 *
 * @example
 * formatDiagonal({ inches: 24, locale: 'en' }) // '24″'
 * formatDiagonal({ inches: 13.3, locale: 'cs' }) // '13,3″'
 */
export const formatDiagonal = ({ inches, locale }) => {
  const digits = Number.isInteger(inches) ? 0 : 1
  return `${formatNumber({ value: inches, locale, digits })}″`
}

/**
 * Short name of a display for labels and lists: its diagonal and its name, for
 * example `24″ FHD` or `32″ 4K UHD`.
 *
 * @param {object} params
 * @param {{ name?: string, diagonal: number }} params.display
 * @param {'en'|'cs'} params.locale UI language.
 * @returns {string}
 *
 * @example
 * formatDisplayLabel({ display: { name: 'FHD', diagonal: 24 }, locale: 'en' }) // '24″ FHD'
 */
export const formatDisplayLabel = ({ display, locale }) => {
  const diagonal = formatDiagonal({ inches: display.diagonal, locale })
  return display.name ? `${diagonal} ${display.name}` : diagonal
}
