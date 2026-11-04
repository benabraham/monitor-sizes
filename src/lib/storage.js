/**
 * IndexedDB persistence for the state that survives a reload (PRD, Non-functional
 * "Storage"): custom displays, hidden built-in displays, the familiar set, the
 * baseline, preferences and the onboarding flag.
 *
 * Each field is one key in the `pixely` database, `state` store, so a partial save
 * touches only the keys it is given. Every field is validated on load, and a field
 * that is missing or corrupt falls back to its default. Within a list, invalid items
 * are dropped and the valid ones kept.
 *
 * Storage never breaks the app. When IndexedDB is missing, blocked or failing, loads
 * return the defaults, saves and clears do nothing, and the first failure logs one
 * console warning. No function here throws. See docs/STATE.md.
 *
 * @module lib/storage
 */

import { clear, createStore, getMany, setMany } from 'idb-keyval'

/**
 * A familiar display with the distance and OS scale the user sits at (F2).
 *
 * @typedef {object} FamiliarEntry
 * @property {string} id           display id
 * @property {number} distance     viewing distance, inches
 * @property {number} scale        OS scale factor, e.g. 1.5
 */

/**
 * A display record. Holds inputs only (F1). Custom displays carry `isCustom: true`.
 *
 * @typedef {object} Display
 * @property {string} id                       stable slug, or `c-<random>` for custom
 * @property {string} name                     human name, e.g. "4K"
 * @property {number} diagonal                 inches
 * @property {number} width                    native px
 * @property {number} height                   native px
 * @property {'laptop'|'monitor'|'ultrawide'} [tag]
 * @property {boolean} [isCustom]
 */

/**
 * Everything `loadPersisted` returns and `savePersisted` accepts.
 *
 * @typedef {object} PersistedState
 * @property {Display[]} customDisplays
 * @property {string[]} hiddenBuiltInIds
 * @property {FamiliarEntry[]} familiar
 * @property {string|null} baselineId
 * @property {object} preferences  any plain object, owned by the state layer
 * @property {boolean} isOnboarded
 */

const DB_NAME = 'pixely'
const STORE_NAME = 'state'
/** Lists are capped at this many items when loaded or saved. */
const MAX_ITEMS = 1000
const MAX_ID_LENGTH = 100
const MAX_NAME_LENGTH = 120
const TAGS = ['laptop', 'monitor', 'ultrawide']

/**
 * Deep-freeze a value, so the shared defaults cannot be changed by mistake.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
const deepFreeze = (value) => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach((item) => deepFreeze(item))
  return Object.freeze(value)
}

/**
 * Default value of every persisted field, used when nothing valid is stored. Frozen.
 * `loadPersisted` returns fresh copies, never this object.
 *
 * @type {Readonly<PersistedState>}
 *
 * @example
 * DEFAULT_PERSISTED.isOnboarded // false
 * DEFAULT_PERSISTED.familiar // []
 */
export const DEFAULT_PERSISTED = deepFreeze({
  customDisplays: [],
  hiddenBuiltInIds: [],
  familiar: [],
  baselineId: null,
  preferences: {},
  isOnboarded: false,
})

const KEYS = Object.keys(DEFAULT_PERSISTED)

/** One shared connection. IndexedDB opens lazily, so creating it cannot throw. */
const store = createStore(DB_NAME, STORE_NAME)

let hasWarned = false

/**
 * Log that storage is unavailable, once per module instance. Later failures stay quiet
 * so that a broken profile does not flood the console.
 *
 * @param {unknown} error
 * @returns {void}
 */
const warnOnce = (error) => {
  if (hasWarned) return
  hasWarned = true
  console.warn('Pixely: local storage is unavailable. Changes will not persist.', error)
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isPositiveNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const isId = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH

const normalizeId = (value) => (isId(value) ? value : undefined)

/**
 * Keep a valid custom display in its canonical shape. An unknown tag is dropped and the
 * display kept.
 *
 * @param {unknown} item
 * @returns {Display|undefined}
 */
const normalizeDisplay = (item) => {
  if (!isPlainObject(item)) return undefined
  const { id, name, diagonal, width, height, tag } = item
  const isValid =
    isId(id) &&
    typeof name === 'string' &&
    name.trim().length > 0 &&
    name.length <= MAX_NAME_LENGTH &&
    isPositiveNumber(diagonal) &&
    isPositiveNumber(width) &&
    isPositiveNumber(height)
  if (!isValid) return undefined
  return {
    id,
    name,
    diagonal,
    width,
    height,
    ...(TAGS.includes(tag) ? { tag } : {}),
    isCustom: true,
  }
}

/**
 * Keep a valid familiar entry.
 *
 * @param {unknown} item
 * @returns {FamiliarEntry|undefined}
 */
const normalizeFamiliar = (item) => {
  if (!isPlainObject(item)) return undefined
  const { id, distance, scale } = item
  if (!isId(id) || !isPositiveNumber(distance) || !isPositiveNumber(scale))
    return undefined
  return { id, distance, scale }
}

/**
 * Validate an array field. Items that fail `normalizeItem` are dropped, the list is
 * capped at `MAX_ITEMS`, and duplicates keep their first occurrence.
 *
 * @param {object} params
 * @param {unknown} params.value
 * @param {(item: unknown) => unknown} params.normalizeItem
 * @param {(item: any) => unknown} [params.keyOf]
 * @returns {unknown[]|undefined} `undefined` when `value` is not an array.
 *
 * @example
 * normalizeList({ value: ['a', 1, 'a'], normalizeItem: normalizeId }) // ['a']
 */
const normalizeList = ({ value, normalizeItem, keyOf = (item) => item }) => {
  if (!Array.isArray(value)) return undefined
  const items = value
    .slice(0, MAX_ITEMS)
    .map((item) => normalizeItem(item))
    .filter((item) => item !== undefined)
  const seen = new Set()
  return items.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Validator per field. Returns the normalized value, or `undefined` when the value is
 * not usable.
 *
 * @type {{ [K in keyof PersistedState]: (value: unknown) => PersistedState[K] | undefined }}
 */
const NORMALIZERS = {
  customDisplays: (value) =>
    normalizeList({
      value,
      normalizeItem: normalizeDisplay,
      keyOf: (display) => display.id,
    }),
  hiddenBuiltInIds: (value) => normalizeList({ value, normalizeItem: normalizeId }),
  familiar: (value) =>
    normalizeList({
      value,
      normalizeItem: normalizeFamiliar,
      keyOf: (entry) => entry.id,
    }),
  baselineId: (value) => (value === null ? null : normalizeId(value)),
  preferences: (value) => (isPlainObject(value) ? value : undefined),
  isOnboarded: (value) => (typeof value === 'boolean' ? value : undefined),
}

/**
 * Load every persisted field, with defaults for anything missing or invalid.
 *
 * Never rejects. If IndexedDB is unavailable or fails, this resolves with the
 * defaults and warns once.
 *
 * @returns {Promise<PersistedState>} Fresh objects that the caller may mutate.
 *
 * @example
 * const { familiar, baselineId, isOnboarded } = await loadPersisted()
 */
export const loadPersisted = async () => {
  try {
    const values = await getMany(KEYS, store)
    return Object.fromEntries(
      KEYS.map((key, index) => {
        const normalized = NORMALIZERS[key](values[index])
        return [
          key,
          normalized === undefined ? structuredClone(DEFAULT_PERSISTED[key]) : normalized,
        ]
      }),
    )
  } catch (error) {
    warnOnce(error)
    return structuredClone(DEFAULT_PERSISTED)
  }
}

/**
 * Save some persisted fields and leave the others as they are.
 *
 * Only the keys given are written, in one atomic transaction. Unknown keys are ignored.
 * `undefined` leaves a field alone. A value that fails validation is skipped, so the
 * store never holds data that `loadPersisted` would reject. Never rejects. Errors
 * become one warning.
 *
 * @param {Partial<PersistedState>} partial
 * @returns {Promise<void>}
 *
 * @example
 * await savePersisted({ isOnboarded: true })
 * await savePersisted({ familiar: [{ id: '27-4k-3840x2160', distance: 23.62, scale: 1.5 }] })
 */
export const savePersisted = async (partial) => {
  if (!isPlainObject(partial)) return
  const entries = KEYS.filter((key) => partial[key] !== undefined).flatMap((key) => {
    const normalized = NORMALIZERS[key](partial[key])
    return normalized === undefined ? [] : [[key, normalized]]
  })
  if (entries.length === 0) return
  try {
    await setMany(entries, store)
  } catch (error) {
    warnOnce(error)
  }
}

/**
 * Remove everything this module has stored. Used by "reset" and by tests. Never
 * rejects.
 *
 * @returns {Promise<void>}
 *
 * @example
 * await clearPersisted() // the next loadPersisted() returns the defaults
 */
export const clearPersisted = async () => {
  try {
    await clear(store)
  } catch (error) {
    warnOnce(error)
  }
}
