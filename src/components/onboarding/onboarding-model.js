/**
 * Pure rules for the onboarding steps: grouping the display list by type, search,
 * the diagonal label and the scale choices offered for a row. Kept out of the
 * components so the behaviour is tested without a DOM.
 *
 * @module components/onboarding/onboarding-model
 */

import { formatNumber, formatResolution } from '../../lib/format.js'

/**
 * Display groups, in the order they are listed. A display without a tag is a
 * monitor (ARCHITECTURE: data model).
 *
 * @type {ReadonlyArray<{ key: 'laptops'|'monitors'|'ultrawides', tag: string }>}
 */
export const DISPLAY_GROUPS = Object.freeze([
  { key: 'laptops', tag: 'laptop' },
  { key: 'monitors', tag: 'monitor' },
  { key: 'ultrawides', tag: 'ultrawide' },
])

/**
 * Split displays into the three type groups. Empty groups are kept (as empty
 * arrays) so the caller decides whether to render them. Input order is preserved
 * inside each group.
 *
 * @param {{ tag?: string }[]} displays
 * @returns {{ laptops: any[], monitors: any[], ultrawides: any[] }}
 *
 * @example
 * groupDisplays([{ tag: 'laptop' }, { name: 'untagged' }]).monitors.length // 1
 */
export const groupDisplays = (displays) => {
  const groups = { laptops: [], monitors: [], ultrawides: [] }
  displays.forEach((display) => {
    const group =
      DISPLAY_GROUPS.find(({ tag }) => tag === display.tag) ?? DISPLAY_GROUPS[1]
    groups[group.key].push(display)
  })
  return groups
}

/**
 * Diagonal as shown in lists: whole inches without a decimal, otherwise one
 * decimal, in the active language. The inch mark is added by the caller.
 *
 * @param {object} params
 * @param {number} params.diagonal Inches.
 * @param {'en'|'cs'} params.locale
 * @returns {string} e.g. `'27'`, `'14.2'` or `'14,2'`.
 *
 * @example
 * formatDiagonal({ diagonal: 27, locale: 'en' }) // '27'
 * formatDiagonal({ diagonal: 14.2, locale: 'cs' }) // '14,2'
 */
export const formatDiagonal = ({ diagonal, locale }) =>
  formatNumber({ value: diagonal, locale, digits: Number.isInteger(diagonal) ? 0 : 1 })

/**
 * Whether a display matches a search: case-insensitive, against its name, its
 * diagonal and its resolution. An empty query matches everything.
 *
 * @param {object} params
 * @param {{ name: string, diagonal: number, width: number, height: number }} params.display
 * @param {string} params.query Typed text.
 * @param {'en'|'cs'} params.locale Locale for the diagonal text.
 * @returns {boolean}
 *
 * @example
 * matchesQuery({ display: fourK, query: '3840', locale: 'en' }) // true
 */
export const matchesQuery = ({ display, query, locale }) => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  const haystack = [
    display.name,
    formatDiagonal({ diagonal: display.diagonal, locale }),
    formatResolution({ width: display.width, height: display.height }),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

/**
 * Scale options offered in a row. The row's current scale is always included, even
 * when the list does not offer it (for example a scale typed in an earlier
 * session), so the select can show the value it holds.
 *
 * @param {object} params
 * @param {Array<{ scale: number }>} params.options From `scaleOptionsFor(display)`.
 * @param {number} params.scale The row's scale factor.
 * @returns {Array<{ scale: number }>} Sorted by scale, no duplicates.
 *
 * @example
 * withCurrentScale({ options: [{ scale: 1 }, { scale: 1.5 }], scale: 1.25 })
 * // [{ scale: 1 }, { scale: 1.25 }, { scale: 1.5 }]
 */
export const withCurrentScale = ({ options, scale }) => {
  const unique = options.some((option) => option.scale === scale)
    ? options
    : [...options, { scale }]
  return [...unique].sort((a, b) => a.scale - b.scale)
}
