/**
 * Comfort window form rules (PRD F7, F23): defaults, input limits, the min ≤ max
 * check and the change set the settings panel sends. Pure functions, no rendering.
 *
 * @module components/settings/comfort-form
 */

/**
 * @typedef {object} ComfortDraft
 * @property {number} minPpi
 * @property {number} maxPpi
 * @property {number} minPpd
 * @property {number} maxPpd
 * @property {number} minWidth
 */

/**
 * Default comfort window (PRD F7, F23). "Reset to defaults" restores exactly this.
 *
 * @type {Readonly<{ mode: 'ppi', minPpi: number, maxPpi: number, minPpd: number, maxPpd: number, minWidth: number }>}
 *
 * @example
 * DEFAULT_COMFORT.minPpi // 90
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
 * Accepted ranges for the number fields. Values outside them are clamped by the field.
 *
 * @type {Readonly<Record<'ppi' | 'ppd' | 'minWidth', Readonly<{ min: number, max: number, step: number }>>>}
 */
export const COMFORT_LIMITS = Object.freeze({
  ppi: Object.freeze({ min: 20, max: 400, step: 1 }),
  ppd: Object.freeze({ min: 10, max: 120, step: 1 }),
  minWidth: Object.freeze({ min: 200, max: 10000, step: 8 }),
})

/**
 * The `[minKey, maxKey]` pair that each rule edits. Only the active rule's pair is
 * validated and sent.
 *
 * @type {Readonly<Record<'ppi' | 'ppd', readonly [keyof ComfortDraft, keyof ComfortDraft]>>}
 */
export const COMFORT_PAIRS = Object.freeze({
  ppi: Object.freeze(['minPpi', 'maxPpi']),
  ppd: Object.freeze(['minPpd', 'maxPpd']),
})

/**
 * Whether a range is ordered, so its minimum is not above its maximum.
 *
 * @param {object} params
 * @param {number} params.min Lower bound.
 * @param {number} params.max Upper bound.
 * @returns {boolean}
 *
 * @example
 * isRangeOrdered({ min: 90, max: 105 }) // true
 * isRangeOrdered({ min: 110, max: 105 }) // false
 */
export const isRangeOrdered = ({ min, max }) => min <= max

/**
 * Copy the comfort fields the panel edits into a draft, so pending input survives
 * until it is valid.
 *
 * @param {object} params
 * @param {Partial<ComfortDraft>} params.comfort Comfort window from the state.
 * @returns {ComfortDraft}
 *
 * @example
 * toComfortDraft({ comfort: DEFAULT_COMFORT }).maxPpi // 105
 */
export const toComfortDraft = ({ comfort }) => ({
  minPpi: comfort.minPpi,
  maxPpi: comfort.maxPpi,
  minPpd: comfort.minPpd,
  maxPpd: comfort.maxPpd,
  minWidth: comfort.minWidth,
})

/**
 * Keys of `keys` whose draft value differs from the state, with their draft values.
 * This is what gets sent, so an unchanged field is never emitted.
 *
 * @param {object} params
 * @param {ComfortDraft} params.draft Values the panel shows.
 * @param {Partial<ComfortDraft>} params.comfort Values in the state.
 * @param {readonly (keyof ComfortDraft)[]} params.keys Keys to compare.
 * @returns {Partial<ComfortDraft>} Empty when nothing changed.
 *
 * @example
 * pickChangedKeys({
 *   draft: { ...toComfortDraft({ comfort: DEFAULT_COMFORT }), minPpi: 95 },
 *   comfort: DEFAULT_COMFORT,
 *   keys: ['minPpi', 'maxPpi'],
 * }) // { minPpi: 95 }
 */
export const pickChangedKeys = ({ draft, comfort, keys }) =>
  keys.reduce((changes, key) => {
    if (draft[key] === comfort[key]) return changes
    return { ...changes, [key]: draft[key] }
  }, {})
