/**
 * Filter model of the Browse view (ARCHITECTURE: `ViewState.filters`, F8, F9).
 *
 * Pure helpers only, so the filter bar, the empty state and the store can share
 * one definition of "cleared" and "active".
 *
 * @module components/browse/browse-filters
 */

/**
 * @typedef {object} BrowseFilters
 * @property {string} search                Text matched against the display name.
 * @property {string[]} tags                Selected tags, e.g. `['laptop']`. Empty means any.
 * @property {string[]} aspects             Selected aspect labels, e.g. `['16:9']`. Empty means any.
 * @property {number|null} minDiagonal      Inches, inclusive. `null` means no lower bound.
 * @property {number|null} maxDiagonal      Inches, inclusive. `null` means no upper bound.
 * @property {boolean} onlyComfortable      Keep only displays with at least one comfortable scale (F8).
 */

/**
 * The filter state with nothing set. A new object on every call, so callers can
 * store or mutate the result without touching a shared constant.
 *
 * @returns {BrowseFilters}
 *
 * @example
 * clearedFilters().tags // []
 */
export const clearedFilters = () => ({
  search: '',
  tags: [],
  aspects: [],
  minDiagonal: null,
  maxDiagonal: null,
  onlyComfortable: false,
})

/**
 * Whether any filter narrows the list. Drives the "Clear filters" button and
 * the choice of empty-state text. A blank search counts as no filter.
 *
 * @param {Partial<BrowseFilters>} filters
 * @returns {boolean}
 *
 * @example
 * hasActiveFilters(clearedFilters()) // false
 * hasActiveFilters({ ...clearedFilters(), tags: ['laptop'] }) // true
 */
export const hasActiveFilters = (filters) => {
  if (!filters) return false
  return (
    (filters.search ?? '').trim() !== '' ||
    (filters.tags ?? []).length > 0 ||
    (filters.aspects ?? []).length > 0 ||
    (filters.minDiagonal ?? null) !== null ||
    (filters.maxDiagonal ?? null) !== null ||
    filters.onlyComfortable === true
  )
}

/**
 * Add a value to a list, or remove it when it is already there. Returns a new
 * list and keeps the order of the others.
 *
 * @param {object} params
 * @param {string[]} params.list Current selection.
 * @param {string} params.value Chip that was toggled.
 * @returns {string[]}
 *
 * @example
 * toggleListValue({ list: ['laptop'], value: 'monitor' }) // ['laptop', 'monitor']
 * toggleListValue({ list: ['laptop', 'monitor'], value: 'laptop' }) // ['monitor']
 */
export const toggleListValue = ({ list, value }) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
