/**
 * Pure helpers behind the state store (ARCHITECTURE: `state/store.js`).
 *
 * Everything here takes plain values and returns plain values, so it is unit tested
 * without signals or storage. The store wires these helpers to its signals:
 *
 * - **Parsing**: validate user input and stored or linked values (`parse*`, `read*`).
 * - **Filtering and sorting** of browse rows (`filterBrowseRows`, `sortBrowseRows`).
 * - **Entry building**: browse rows and compare entries from a display and its settings
 *   (`buildBrowseRow`, `buildCompareEntry`).
 * - **Reconciliation**: keeping the cross-references between the familiar set, the
 *   baseline, compare and the hidden lists consistent (`reconcileState`).
 * - **Import and export** payloads (`parseImportText`, `buildExportPayload`).
 *
 * Multi-argument functions take one object (RORO), and read every field by name.
 *
 * @module state/selectors
 */

import {
  getAngularMetrics,
  getBestScale,
  getEquivalentDistances,
  getRelativeMetrics,
  getScaleOptions,
  getScalingMatrix,
} from '../lib/calc/index.js'
import { round } from '../lib/math.js'
import { defaultDistanceFor } from '../lib/units.js'

/** @typedef {import('../lib/calc/index.js').DisplayMetrics} DisplayMetrics */
/** @typedef {import('../lib/calc/index.js').RelativeMetrics} RelativeMetrics */
/** @typedef {import('../lib/calc/index.js').MatrixRow} MatrixRow */
/** @typedef {import('../lib/calc/index.js').EquivalentDistances} EquivalentDistances */
/** @typedef {import('../lib/storage.js').Display} Display */
/** @typedef {import('../lib/storage.js').FamiliarEntry} FamiliarEntry */

/**
 * The comfort window (F7, F23). Same shape as `Comfort` in `lib/url-state.js`.
 *
 * @typedef {object} ComfortWindow
 * @property {'ppi'|'ppd'} mode
 * @property {number} minPpi
 * @property {number} maxPpi
 * @property {number} minPpd
 * @property {number} maxPpd
 * @property {number} minWidth
 */

/**
 * Browse filters (F8, F9). Same shape as the `filters` field of `ViewState`.
 *
 * @typedef {object} BrowseFilters
 * @property {string} search
 * @property {string[]} tags
 * @property {string[]} aspects
 * @property {number|null} minDiagonal
 * @property {number|null} maxDiagonal
 * @property {boolean} onlyComfortable
 */

/**
 * The settings that decide the scale options and the comfort rule of a display.
 *
 * @typedef {object} ScalingSettings
 * @property {'windows'|'macos'|'linux'} presetId
 * @property {number[]} customScales
 * @property {ComfortWindow} comfort
 */

/**
 * One row of the Browse table or cards. Browse shows only the comfortable rows of
 * `matrix`. The other rows are kept and flagged, so a caller can still read them.
 *
 * @typedef {object} BrowseRow
 * @property {Display} display
 * @property {DisplayMetrics} metrics
 * @property {RelativeMetrics|null} relative  against the active baseline, null without one
 * @property {MatrixRow[]} matrix             every scale option, flagged by `isComfortable`
 * @property {MatrixRow|null} bestScale       the recommended scale, null when none is measurable
 * @property {boolean} isFamiliar
 * @property {boolean} isBaseline
 * @property {boolean} isCompared             shown in Compare (a candidate, or a familiar one not hidden)
 */

/**
 * One column of the Compare view: a familiar or a candidate display, with the
 * distance and scale it is drawn at.
 *
 * @typedef {object} CompareEntry
 * @property {Display} display
 * @property {DisplayMetrics} metrics
 * @property {RelativeMetrics|null} relative
 * @property {number} distance                 viewing distance, inches
 * @property {number} scale                    OS scale factor
 * @property {import('../lib/calc/index.js').AngularMetrics} angular
 * @property {EquivalentDistances|null} equivalent  null for the baseline, or without one
 * @property {MatrixRow[]} matrix              every scale option at this distance
 * @property {MatrixRow|null} bestScale
 * @property {boolean} isFamiliar
 * @property {boolean} isBaseline
 */

/** Sort keys accepted by `setSort` (F4, F5). */
export const SORT_KEYS = Object.freeze([
  'name',
  'diagonal',
  'ppi',
  'relativePixelSize',
  'aspect',
  'resolution',
  'width',
  'height',
  'widthDiff',
  'heightDiff',
  'area',
  'areaRatio',
  'megapixels',
  'megapixelRatio',
  'bestScale',
])

/** Tags a display may carry (F1). */
export const TAGS = Object.freeze(['laptop', 'monitor', 'ultrawide'])

/** A display without a tag counts as a monitor (ARCHITECTURE, data model). */
export const DEFAULT_TAG = 'monitor'

/** Unit systems (F16). */
export const UNITS = Object.freeze(['metric', 'imperial'])

/** UI languages (F16). */
export const LOCALES = Object.freeze(['en', 'cs'])

/** OS scale presets (F21). */
export const PRESET_IDS = Object.freeze(['windows', 'macos', 'linux'])

/** Dimensions that the match buttons can equate (F15). */
export const SIZE_MATCH_BY = Object.freeze(['height', 'width', 'diagonal'])

/** Visualization modes (F12): true physical size, or as seen from the viewing distance. */
export const VIZ_MODES = Object.freeze(['physical', 'seen'])

/** The two app views (UX). */
export const VIEWS = Object.freeze(['browse', 'compare'])

/** Comfort rules (F7, F23): effective PPI, or logical pixels per degree. */
export const COMFORT_MODES = Object.freeze(['ppi', 'ppd'])

/** Kinds accepted by `applyEquivalent` (F15). Each is also a key of `EquivalentDistances`. */
export const EQUIVALENT_KINDS = Object.freeze([
  'sameSize',
  'sameSharpness',
  'sameTextSize',
])

/** Valid range for a custom OS scale factor (F21). */
export const CUSTOM_SCALE_RANGE = Object.freeze({ min: 0.5, max: 4 })

/** The default comfort window (F7, F23). Frozen, because it is shared configuration. */
export const DEFAULT_COMFORT = Object.freeze({
  mode: 'ppi',
  minPpi: 90,
  maxPpi: 105,
  minPpd: 37,
  maxPpd: 43,
  minWidth: 1024,
})

/** The default browse filters: nothing filtered out. */
export const DEFAULT_FILTERS = Object.freeze({
  search: '',
  tags: Object.freeze([]),
  aspects: Object.freeze([]),
  minDiagonal: null,
  maxDiagonal: null,
  onlyComfortable: false,
})

/** The sheet's default order: PPI, highest first (F5). */
export const DEFAULT_SORT = Object.freeze({ key: 'ppi', direction: 'desc' })

/** Identifies the export format (F18). Written in every export, checked on import. */
export const EXPORT_APP = 'pixely'

/** Version of the export format. Bump it for a change in meaning (see STATE.md). */
export const EXPORT_VERSION = 1

const MAX_ID_LENGTH = 100
const MAX_NAME_LENGTH = 120
const MAX_SEARCH_LENGTH = 200
const MAX_ASPECT_LENGTH = 20
const CUSTOM_ID_LENGTH = 8
const NUMERIC_COMFORT_KEYS = ['minPpi', 'maxPpi', 'minPpd', 'maxPpd', 'minWidth']
const DIRECTIONS = Object.freeze(['asc', 'desc'])

/**
 * Whether a value is a finite number above zero.
 *
 * @param {unknown} value
 * @returns {boolean}
 *
 * @example
 * isPositiveNumber(23.6) // true
 * isPositiveNumber('23.6') // false
 */
export const isPositiveNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

/**
 * Whether a value is a usable display, customisation or familiar id: a non-empty string
 * of at most 100 characters.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export const isId = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH

/**
 * Return the value when it is a positive number, otherwise `undefined`.
 *
 * @param {unknown} value
 * @returns {number|undefined}
 *
 * @example
 * parsePositive(30) // 30
 * parsePositive(0) // undefined
 */
export const parsePositive = (value) => (isPositiveNumber(value) ? value : undefined)

/**
 * True for plain objects, not arrays or null.
 *
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isTag = (value) => TAGS.includes(value)

/**
 * Return `value` when it is one of `list`, otherwise `fallback`.
 *
 * @param {object} params
 * @param {readonly unknown[]} params.list
 * @param {unknown} params.value
 * @param {unknown} [params.fallback]
 * @returns {unknown}
 *
 * @example
 * pickOneOf({ list: ['a', 'b'], value: 'c', fallback: 'a' }) // 'a'
 */
const pickOneOf = ({ list, value, fallback }) => (list.includes(value) ? value : fallback)

/**
 * Keep the first occurrence of each key.
 *
 * @template T
 * @param {object} params
 * @param {T[]} params.items
 * @param {(item: T) => unknown} params.keyOf
 * @returns {T[]}
 */
const uniqueBy = ({ items, keyOf }) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Drop repeated primitive values, keeping the first.
 *
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
const uniqueList = (items) => [...new Set(items)]

/**
 * Validate and normalise a display typed in the add or edit form (F17). Returns the
 * inputs only (F1), with a trimmed name. An unknown tag is dropped and the display kept.
 * Sizes are canonical units: diagonal and sizes in inches, width and height in pixels.
 *
 * @param {object} params
 * @param {unknown} params.name 1 to 120 characters after trimming.
 * @param {unknown} params.diagonal Positive, inches.
 * @param {unknown} params.width Positive, native pixels.
 * @param {unknown} params.height Positive, native pixels.
 * @param {unknown} [params.tag] One of `laptop`, `monitor`, `ultrawide`.
 * @returns {{ name: string, diagonal: number, width: number, height: number, tag?: string }|null}
 *   `null` when any field is invalid.
 *
 * @example
 * parseDisplayInput({ name: ' 4K ', diagonal: 27, width: 3840, height: 2160 })
 * // { name: '4K', diagonal: 27, width: 3840, height: 2160 }
 */
export const parseDisplayInput = ({ name, diagonal, width, height, tag }) => {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  const isValid =
    trimmedName.length > 0 &&
    trimmedName.length <= MAX_NAME_LENGTH &&
    [diagonal, width, height].every(isPositiveNumber)
  if (!isValid) return null
  return {
    name: trimmedName,
    diagonal,
    width,
    height,
    ...(isTag(tag) ? { tag } : {}),
  }
}

/**
 * Keep the valid positive fields of a settings patch (`distance`, `scale`). A field that
 * is missing or invalid is left out.
 *
 * @param {object} params
 * @param {unknown} [params.distance] Inches.
 * @param {unknown} [params.scale] OS scale factor.
 * @returns {{ distance?: number, scale?: number }}
 *
 * @example
 * parseSettingsPatch({ distance: 30, scale: -1 }) // { distance: 30 }
 */
export const parseSettingsPatch = ({ distance, scale }) =>
  Object.fromEntries(
    Object.entries({
      distance: parsePositive(distance),
      scale: parsePositive(scale),
    }).filter(([, value]) => value !== undefined),
  )

/**
 * Validate one custom OS scale factor (F21). It is rounded to 4 decimals and must be
 * between 0.5 and 4 inclusive. Percent input is parsed by `parseScaleInput` before it
 * gets here.
 *
 * @param {unknown} value
 * @returns {number|null} The factor, or `null` when it is invalid.
 *
 * @example
 * parseCustomScale(1.333333) // 1.3333
 * parseCustomScale(133) // null (a percent, not a factor)
 */
export const parseCustomScale = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const scale = round({ value, digits: 4 })
  return scale >= CUSTOM_SCALE_RANGE.min && scale <= CUSTOM_SCALE_RANGE.max ? scale : null
}

/**
 * Read a list of custom scales from storage or a link: valid values only, unique,
 * sorted ascending.
 *
 * @param {unknown} list
 * @returns {number[]}
 *
 * @example
 * readCustomScales([3, 1.33, 1.33, 'x', 9]) // [1.33, 3]
 */
export const readCustomScales = (list) => {
  if (!Array.isArray(list)) return []
  const scales = list.map((value) => parseCustomScale(value)).filter((s) => s !== null)
  return uniqueList(scales).sort((a, b) => a - b)
}

/**
 * Merge a partial comfort window over the current one (F7, F23). Invalid fields are
 * ignored. The merged window is rejected when a minimum is above its maximum.
 *
 * @param {object} params
 * @param {ComfortWindow} params.current
 * @param {unknown} params.patch
 * @returns {ComfortWindow|null} The merged window, or `null` when the patch is not an
 *   object or the result is not ordered.
 *
 * @example
 * parseComfortPatch({ current: DEFAULT_COMFORT, patch: { minPpi: 95 } }).minPpi // 95
 */
export const parseComfortPatch = ({ current, patch }) => {
  if (!isPlainObject(patch)) return null
  const mode = COMFORT_MODES.includes(patch.mode) ? { mode: patch.mode } : {}
  const numbers = Object.fromEntries(
    NUMERIC_COMFORT_KEYS.map((key) => [key, parsePositive(patch[key]) ?? current[key]]),
  )
  const merged = { ...current, ...mode, ...numbers }
  const isOrdered = merged.minPpi <= merged.maxPpi && merged.minPpd <= merged.maxPpd
  return isOrdered ? merged : null
}

/**
 * Read a diagonal bound: `null` clears it, a positive number sets it, anything else keeps
 * the current bound.
 *
 * @param {object} params
 * @param {unknown} params.value
 * @param {number|null} params.fallback
 * @returns {number|null}
 */
const readBound = ({ value, fallback }) => {
  if (value === null) return null
  return parsePositive(value) ?? fallback
}

/**
 * Merge a partial filter object over the current filters (F8, F9). Each field is checked
 * on its own, and an invalid one keeps its current value.
 *
 * @param {object} params
 * @param {BrowseFilters} params.current
 * @param {unknown} params.patch
 * @returns {BrowseFilters|null} `null` when the patch is not an object.
 *
 * @example
 * parseFiltersPatch({ current: DEFAULT_FILTERS, patch: { tags: ['laptop', 'x'] } }).tags
 * // ['laptop']
 */
export const parseFiltersPatch = ({ current, patch }) => {
  if (!isPlainObject(patch)) return null
  return {
    search:
      typeof patch.search === 'string'
        ? patch.search.slice(0, MAX_SEARCH_LENGTH)
        : current.search,
    tags: Array.isArray(patch.tags) ? uniqueList(patch.tags.filter(isTag)) : current.tags,
    aspects: Array.isArray(patch.aspects)
      ? uniqueList(
          patch.aspects.filter(
            (label) =>
              typeof label === 'string' &&
              label.length > 0 &&
              label.length <= MAX_ASPECT_LENGTH,
          ),
        )
      : current.aspects,
    minDiagonal: readBound({ value: patch.minDiagonal, fallback: current.minDiagonal }),
    maxDiagonal: readBound({ value: patch.maxDiagonal, fallback: current.maxDiagonal }),
    onlyComfortable:
      typeof patch.onlyComfortable === 'boolean'
        ? patch.onlyComfortable
        : current.onlyComfortable,
  }
}

/**
 * The next sort setting. A direction given explicitly is used as it is. Without one, the
 * same key toggles the direction, and a new key starts ascending for `name` and
 * descending for every metric.
 *
 * @param {object} params
 * @param {{ key: string, direction: 'asc'|'desc' }} params.current
 * @param {unknown} params.key One of {@link SORT_KEYS}.
 * @param {unknown} [params.direction]
 * @returns {{ key: string, direction: 'asc'|'desc' }|null} `null` for an unknown key.
 *
 * @example
 * nextSort({ current: { key: 'ppi', direction: 'desc' }, key: 'ppi' })
 * // { key: 'ppi', direction: 'asc' }
 */
export const nextSort = ({ current, key, direction }) => {
  if (!SORT_KEYS.includes(key)) return null
  if (DIRECTIONS.includes(direction)) return { key, direction }
  if (key !== current.key) {
    return { key, direction: key === 'name' ? 'asc' : 'desc' }
  }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}

/**
 * Read stored preferences, with defaults for anything missing or invalid. The locale and
 * the scale preset have no fixed default: they come back `undefined`, and the store fills
 * them from browser detection.
 *
 * @param {unknown} raw The `preferences` object from storage.
 * @returns {{
 *   units: 'metric'|'imperial',
 *   locale: 'en'|'cs'|undefined,
 *   presetId: 'windows'|'macos'|'linux'|undefined,
 *   customScales: number[],
 *   comfort: ComfortWindow,
 *   sizeMatchBy: 'height'|'width'|'diagonal',
 *   vizMode: 'physical'|'seen',
 * }}
 */
export const readPreferences = (raw) => {
  const source = isPlainObject(raw) ? raw : {}
  return {
    units: pickOneOf({ list: UNITS, value: source.units, fallback: 'metric' }),
    locale: pickOneOf({ list: LOCALES, value: source.locale }),
    presetId: pickOneOf({ list: PRESET_IDS, value: source.presetId }),
    customScales: readCustomScales(source.customScales),
    comfort:
      parseComfortPatch({ current: DEFAULT_COMFORT, patch: source.comfort }) ??
      DEFAULT_COMFORT,
    sizeMatchBy: pickOneOf({
      list: SIZE_MATCH_BY,
      value: source.sizeMatchBy,
      fallback: 'height',
    }),
    vizMode: pickOneOf({ list: VIZ_MODES, value: source.vizMode, fallback: 'physical' }),
  }
}

/**
 * Lower-case text with diacritics and inch marks removed, so `ceske` finds `České` and
 * `27"` finds `27`. Used for both the query and the searched text.
 *
 * @param {unknown} text
 * @returns {string} The normalised text, or `''` for non-text input.
 *
 * @example
 * normalizeSearchText('České 24″') // 'ceske 24'
 */
export const normalizeSearchText = (text) => {
  if (typeof text !== 'string') return ''
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[″"“”]/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * The text a search is matched against: the name, the resolution in both spellings
 * and the diagonal.
 *
 * @param {Display} display
 * @returns {string}
 */
const searchableText = (display) =>
  [
    display.name,
    `${display.width}×${display.height}`,
    `${display.width}x${display.height}`,
    `${display.diagonal}`,
  ].join(' ')

/**
 * Whether a display matches a search query (F9). Every word of the query must appear in
 * the searched text, ignoring case and diacritics. An empty query matches everything.
 *
 * @param {object} params
 * @param {Display} params.display
 * @param {string} params.query
 * @returns {boolean}
 *
 * @example
 * matchesSearch({ display: qhd27, query: 'ceske 27' }) // true
 */
export const matchesSearch = ({ display, query }) => {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const haystack = normalizeSearchText(searchableText(display))
  return tokens.every((token) => haystack.includes(token))
}

/**
 * Whether a display has one of the tags (F9). An empty list matches everything, and a
 * display without a tag counts as a monitor.
 *
 * @param {object} params
 * @param {Display} params.display
 * @param {string[]} params.tags
 * @returns {boolean}
 */
export const matchesTags = ({ display, tags }) => {
  if (tags.length === 0) return true
  return tags.includes(display.tag ?? DEFAULT_TAG)
}

/**
 * Whether a display's aspect label is one of the chosen labels (F9). An empty list
 * matches everything.
 *
 * @param {object} params
 * @param {DisplayMetrics} params.metrics
 * @param {string[]} params.aspects
 * @returns {boolean}
 */
export const matchesAspects = ({ metrics, aspects }) => {
  if (aspects.length === 0) return true
  return aspects.includes(metrics.aspect.label)
}

/**
 * Whether a display's diagonal lies in the range (F9). Both bounds are inclusive, and a
 * bound that is not a number means no bound.
 *
 * @param {object} params
 * @param {Display} params.display
 * @param {number|null} params.minDiagonal
 * @param {number|null} params.maxDiagonal
 * @returns {boolean}
 */
export const matchesDiagonal = ({ display, minDiagonal, maxDiagonal }) => {
  if (typeof minDiagonal === 'number' && display.diagonal < minDiagonal) return false
  if (typeof maxDiagonal === 'number' && display.diagonal > maxDiagonal) return false
  return true
}

/**
 * Whether any scale of a row is inside the comfort window (F8).
 *
 * @param {BrowseRow} row
 * @returns {boolean}
 */
export const hasComfortableScale = (row) =>
  row.matrix.some(({ isComfortable }) => isComfortable)

/**
 * Apply every browse filter (F8, F9) to the rows. Filters combine with AND.
 *
 * @param {object} params
 * @param {BrowseRow[]} params.rows
 * @param {BrowseFilters} params.filters
 * @returns {BrowseRow[]} A new array, in the same order.
 */
export const filterBrowseRows = ({ rows, filters }) =>
  rows.filter(
    (row) =>
      matchesSearch({ display: row.display, query: filters.search }) &&
      matchesTags({ display: row.display, tags: filters.tags }) &&
      matchesAspects({ metrics: row.metrics, aspects: filters.aspects }) &&
      matchesDiagonal({
        display: row.display,
        minDiagonal: filters.minDiagonal,
        maxDiagonal: filters.maxDiagonal,
      }) &&
      (!filters.onlyComfortable || hasComfortableScale(row)),
  )

/**
 * The value each sort key orders by. `null` means "no value", and such rows always sort
 * last. The relative keys need a baseline, and `bestScale` needs a measurable scale.
 *
 * @type {Record<string, (row: BrowseRow) => string|number|null>}
 */
const SORT_VALUE = {
  name: ({ display }) => display.name,
  diagonal: ({ display }) => display.diagonal,
  ppi: ({ metrics }) => metrics.ppi,
  relativePixelSize: ({ relative }) => relative?.relativePixelSize ?? null,
  aspect: ({ display }) => display.width / display.height,
  resolution: ({ metrics }) => metrics.megapixels,
  width: ({ metrics }) => metrics.widthIn,
  height: ({ metrics }) => metrics.heightIn,
  widthDiff: ({ relative }) => relative?.widthDiffIn ?? null,
  heightDiff: ({ relative }) => relative?.heightDiffIn ?? null,
  area: ({ metrics }) => metrics.areaIn2,
  areaRatio: ({ relative }) => relative?.areaRatio ?? null,
  megapixels: ({ metrics }) => metrics.megapixels,
  megapixelRatio: ({ relative }) => relative?.megapixelRatio ?? null,
  bestScale: ({ bestScale }) => bestScale?.logicalWidth ?? null,
}

/**
 * Compare two non-null values, text by collation and numbers by size.
 *
 * @param {object} params
 * @param {string|number} params.valueA
 * @param {string|number} params.valueB
 * @param {Intl.Collator} params.collator
 * @returns {number}
 */
const compareValues = ({ valueA, valueB, collator }) => {
  if (typeof valueA === 'string') return collator.compare(valueA, String(valueB))
  return valueA - valueB
}

/**
 * Tie-break: name by collation, then id. Always ascending, in either direction.
 *
 * @param {object} params
 * @param {BrowseRow} params.a
 * @param {BrowseRow} params.b
 * @param {Intl.Collator} params.collator
 * @returns {number}
 */
const compareTies = ({ a, b, collator }) => {
  const byName = collator.compare(a.display.name, b.display.name)
  if (byName !== 0) return byName
  if (a.display.id < b.display.id) return -1
  return a.display.id > b.display.id ? 1 : 0
}

/**
 * Sort rows by a key and direction (F5). Rows with no value for the key go last in both
 * directions. Equal values are ordered by name, then by id, so the order is stable and
 * deterministic. Names use the collation of `locale`, so Czech letters such as `ch` sort
 * correctly.
 *
 * An unknown key falls back to name order.
 *
 * @param {object} params
 * @param {BrowseRow[]} params.rows
 * @param {{ key: string, direction: 'asc'|'desc' }} params.sort
 * @param {string} [params.locale] `'en'` or `'cs'`.
 * @returns {BrowseRow[]} A new, sorted array.
 *
 * @example
 * sortBrowseRows({ rows, sort: { key: 'ppi', direction: 'desc' }, locale: 'en' })
 */
export const sortBrowseRows = ({ rows, sort, locale }) => {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
  const valueOf = Object.hasOwn(SORT_VALUE, sort.key)
    ? SORT_VALUE[sort.key]
    : SORT_VALUE.name
  const sign = sort.direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    const valueA = valueOf(a)
    const valueB = valueOf(b)
    const primary =
      valueA === null || valueB === null
        ? Number(valueA === null) - Number(valueB === null)
        : sign * compareValues({ valueA, valueB, collator })
    return primary !== 0 ? primary : compareTies({ a, b, collator })
  })
}

/**
 * Relative metrics of a display against the baseline (F3, F4).
 *
 * @param {object} params
 * @param {DisplayMetrics} params.metrics
 * @param {{ metrics: DisplayMetrics }|null} params.baseline
 * @returns {RelativeMetrics|null} `null` without a baseline.
 */
export const buildRelative = ({ metrics, baseline }) =>
  baseline ? getRelativeMetrics({ metrics, baselineMetrics: baseline.metrics }) : null

/**
 * Every scale option of a display, with its scaled metrics and comfort flag (F6).
 *
 * @param {object} params
 * @param {Display} params.display
 * @param {DisplayMetrics} params.metrics
 * @param {ScalingSettings} params.scaling
 * @param {number} [params.distance] Viewing distance, inches. Needed for the PPD rule.
 * @returns {MatrixRow[]}
 */
export const buildMatrix = ({ display, metrics, scaling, distance }) =>
  getScalingMatrix({
    display,
    metrics,
    scaleOptions: getScaleOptions({
      display,
      presetId: scaling.presetId,
      customScales: scaling.customScales,
    }),
    comfort: scaling.comfort,
    distance,
  })

/**
 * The recommended scale of a display, or 1 when no scale can be measured (F13).
 *
 * @param {object} params
 * @param {Display} params.display
 * @param {DisplayMetrics} params.metrics
 * @param {ScalingSettings} params.scaling
 * @param {number} [params.distance]
 * @returns {number}
 */
export const pickDefaultScale = ({ display, metrics, scaling, distance }) => {
  const best = getBestScale({
    rows: buildMatrix({ display, metrics, scaling, distance }),
    comfort: scaling.comfort,
  })
  return best?.scale ?? 1
}

/**
 * One Browse row. Its matrix uses the baseline's distance, so the PPD rule follows the
 * active baseline (F23). Rows outside the comfort window are kept and flagged.
 *
 * @param {object} params
 * @param {Display} params.display
 * @param {DisplayMetrics} params.metrics
 * @param {{ metrics: DisplayMetrics, distance: number }|null} params.baseline
 * @param {ScalingSettings} params.scaling
 * @param {boolean} [params.isFamiliar=false]
 * @param {boolean} [params.isBaseline=false]
 * @param {boolean} [params.isCompared=false]
 * @returns {BrowseRow}
 *
 * @example
 * buildBrowseRow({ display, metrics, baseline: null, scaling, isFamiliar: false })
 */
export const buildBrowseRow = ({
  display,
  metrics,
  baseline,
  scaling,
  isFamiliar = false,
  isBaseline = false,
  isCompared = false,
}) => {
  const matrix = buildMatrix({ display, metrics, scaling, distance: baseline?.distance })
  return {
    display,
    metrics,
    relative: buildRelative({ metrics, baseline }),
    matrix,
    bestScale: getBestScale({ rows: matrix, comfort: scaling.comfort }),
    isFamiliar,
    isBaseline,
    isCompared,
  }
}

/**
 * The viewing distance of a compared display (F13). A familiar display uses its saved
 * distance. A candidate uses its own setting, then the baseline's distance, then the
 * default for its kind.
 *
 * @param {object} params
 * @param {Display} params.display
 * @param {FamiliarEntry|null|undefined} params.familiarEntry
 * @param {{ distance?: number }|undefined} params.setting
 * @param {number|undefined} params.baselineDistance Inches.
 * @returns {number} Inches.
 */
export const resolveCompareDistance = ({
  display,
  familiarEntry,
  setting,
  baselineDistance,
}) =>
  familiarEntry?.distance ??
  setting?.distance ??
  baselineDistance ??
  defaultDistanceFor(display)

/**
 * The OS scale of a compared display (F13). A familiar display uses its saved scale. A
 * candidate uses its own setting, then its best comfortable scale, then 1.
 *
 * @param {object} params
 * @param {FamiliarEntry|null|undefined} params.familiarEntry
 * @param {{ scale?: number }|undefined} params.setting
 * @param {MatrixRow|null} params.bestScale
 * @returns {number}
 */
export const resolveCompareScale = ({ familiarEntry, setting, bestScale }) =>
  familiarEntry?.scale ?? setting?.scale ?? bestScale?.scale ?? 1

/**
 * One Compare entry, with its distance, scale, angular metrics and equivalence against the
 * baseline (F13, F14, F15). The scale matrix uses the entry's own distance, so the PPD
 * rule applies at the seat it is drawn for. The baseline has no equivalence of its own.
 *
 * @param {object} params
 * @param {Display} params.display
 * @param {DisplayMetrics} params.metrics
 * @param {{ display: Display, metrics: DisplayMetrics, distance: number, scale: number }|null} params.baseline
 * @param {FamiliarEntry|null|undefined} params.familiarEntry Set for familiar displays.
 * @param {{ distance?: number, scale?: number }|undefined} params.setting Candidate settings.
 * @param {boolean} [params.isBaseline=false]
 * @param {ScalingSettings} params.scaling
 * @param {'height'|'width'|'diagonal'} params.sizeMatchBy
 * @returns {CompareEntry}
 */
export const buildCompareEntry = ({
  display,
  metrics,
  baseline,
  familiarEntry,
  setting,
  isBaseline = false,
  scaling,
  sizeMatchBy,
}) => {
  const distance = resolveCompareDistance({
    display,
    familiarEntry,
    setting,
    baselineDistance: baseline?.distance,
  })
  const matrix = buildMatrix({ display, metrics, scaling, distance })
  const bestScale = getBestScale({ rows: matrix, comfort: scaling.comfort })
  const scale = resolveCompareScale({ familiarEntry, setting, bestScale })
  const hasEquivalence = Boolean(baseline) && !isBaseline

  return {
    display,
    metrics,
    relative: buildRelative({ metrics, baseline }),
    distance,
    scale,
    angular: getAngularMetrics({ metrics, distance, scale }),
    equivalent: hasEquivalence
      ? getEquivalentDistances({
          baseline: {
            metrics: baseline.metrics,
            distance: baseline.distance,
            scale: baseline.scale,
          },
          candidate: { metrics, scale },
          sizeMatchBy,
        })
      : null,
    matrix,
    bestScale,
    isFamiliar: Boolean(familiarEntry),
    isBaseline,
  }
}

/**
 * The baseline id that a familiar set should have. The current one is kept while it is
 * still familiar, otherwise the first familiar display takes over (F3). An empty set has
 * no baseline.
 *
 * @param {object} params
 * @param {FamiliarEntry[]} params.familiar
 * @param {string|null} params.baselineId
 * @returns {string|null}
 *
 * @example
 * pickBaselineId({ familiar: [{ id: 'a' }, { id: 'b' }], baselineId: 'gone' }) // 'a'
 */
export const pickBaselineId = ({ familiar, baselineId }) => {
  if (familiar.some((entry) => entry.id === baselineId)) return baselineId
  return familiar[0]?.id ?? null
}

/**
 * Bring the cross-references of the state back into line (F3, F17). It removes unknown
 * displays, hidden built-ins from compare, settings of displays that are not compared, and
 * hidden familiar ids that are no longer familiar. It also repairs the baseline and drops
 * duplicates. Familiar displays may stay in `compareIds`, because Compare de-duplicates
 * them.
 *
 * @param {object} params
 * @param {{
 *   familiar: FamiliarEntry[],
 *   baselineId: string|null,
 *   compareIds: string[],
 *   compareSettings: Record<string, { distance?: number, scale?: number }>,
 *   hiddenFamiliarIds: string[],
 *   hiddenBuiltInIds: string[],
 * }} params.state Any extra fields (for example `customDisplays`) are passed through.
 * @param {Set<string>} params.builtInIds Ids of the seed displays.
 * @param {Set<string>} params.knownIds Ids of every display, built-in and custom.
 * @returns {typeof params.state} The reconciled state.
 */
export const reconcileState = ({ state, builtInIds, knownIds }) => {
  const familiar = uniqueBy({
    items: state.familiar.filter((entry) => knownIds.has(entry.id)),
    keyOf: (entry) => entry.id,
  })
  const familiarIds = new Set(familiar.map(({ id }) => id))
  const hiddenBuiltInIds = uniqueList(
    state.hiddenBuiltInIds.filter((id) => builtInIds.has(id)),
  )
  const hiddenBuiltInSet = new Set(hiddenBuiltInIds)
  const compareIds = uniqueList(
    state.compareIds.filter((id) => knownIds.has(id) && !hiddenBuiltInSet.has(id)),
  )
  const compareSet = new Set(compareIds)
  const compareSettings = Object.fromEntries(
    Object.entries(state.compareSettings).filter(
      ([id]) => compareSet.has(id) && !familiarIds.has(id),
    ),
  )
  const hiddenFamiliarIds = uniqueList(
    state.hiddenFamiliarIds.filter((id) => familiarIds.has(id)),
  )
  const baselineId = pickBaselineId({ familiar, baselineId: state.baselineId })

  return {
    ...state,
    familiar,
    baselineId,
    compareIds,
    compareSettings,
    hiddenFamiliarIds,
    hiddenBuiltInIds,
  }
}

/**
 * Familiar entries as comparable strings, with distances and scales rounded the way a
 * link rounds them (2 and 4 decimals). Sorted, so the order does not matter.
 *
 * @param {{ familiar: FamiliarEntry[] }} params
 * @returns {string[]}
 */
const familiarKeys = ({ familiar }) =>
  familiar
    .map(
      ({ id, distance, scale }) =>
        `${id}|${round({ value: distance, digits: 2 })}|${round({ value: scale, digits: 4 })}`,
    )
    .sort()

/**
 * Whether two familiar sets are the same, after the rounding that a shared link applies.
 * Used to tell a shared link from the user's own link: an own link has the same set, and
 * must not replace the stored values with their rounded copies.
 *
 * @param {object} params
 * @param {{ familiar: FamiliarEntry[], baselineId?: string|null }} params.left
 * @param {{ familiar: FamiliarEntry[], baselineId?: string|null }} params.right
 * @returns {boolean}
 *
 * @example
 * isSameFamiliarSet({
 *   left: { familiar: [{ id: 'a', distance: 23.6220472, scale: 1.5 }], baselineId: 'a' },
 *   right: { familiar: [{ id: 'a', distance: 23.62, scale: 1.5 }], baselineId: 'a' },
 * }) // true
 */
export const isSameFamiliarSet = ({ left, right }) =>
  (left.baselineId ?? null) === (right.baselineId ?? null) &&
  JSON.stringify(familiarKeys(left)) === JSON.stringify(familiarKeys(right))

/**
 * A new id for a custom display: `c-` and eight base-36 characters (ARCHITECTURE, data
 * model). Draws again while the id is taken.
 *
 * @param {object} params
 * @param {(id: string) => boolean} params.isTaken
 * @param {() => number} [params.random=Math.random] A source of numbers in [0, 1).
 * @returns {string}
 *
 * @example
 * createCustomId({ isTaken: () => false }) // 'c-k3j9x2a1'
 */
export const createCustomId = ({ isTaken, random = Math.random }) => {
  const digits = random()
    .toString(36)
    .slice(2)
    .padEnd(CUSTOM_ID_LENGTH, '0')
    .slice(0, CUSTOM_ID_LENGTH)
  const candidate = `c-${digits}`
  return isTaken(candidate) ? createCustomId({ isTaken, random }) : candidate
}

/**
 * Merge two lists of items with an `id`. An incoming item replaces the one with the same
 * id, in the same position. New items go at the end.
 *
 * @template {{ id: string }} T
 * @param {object} params
 * @param {T[]} params.existing
 * @param {T[]} params.incoming
 * @returns {T[]}
 */
export const mergeById = ({ existing, incoming }) => {
  const incomingById = new Map(incoming.map((item) => [item.id, item]))
  const existingIds = new Set(existing.map(({ id }) => id))
  return [
    ...existing.map((item) => incomingById.get(item.id) ?? item),
    ...incoming.filter((item) => !existingIds.has(item.id)),
  ]
}

/**
 * The JSON that `exportJson` writes (F18). Inputs only: no derived metrics and no
 * `isCustom` flag. An empty tag is left out.
 *
 * @param {object} params
 * @param {Display[]} params.customDisplays
 * @param {FamiliarEntry[]} params.familiar
 * @param {string|null} params.baselineId
 * @returns {object}
 */
export const buildExportPayload = ({ customDisplays, familiar, baselineId }) => ({
  app: EXPORT_APP,
  version: EXPORT_VERSION,
  customDisplays: customDisplays.map(({ id, name, diagonal, width, height, tag }) => ({
    id,
    name,
    diagonal,
    width,
    height,
    ...(tag ? { tag } : {}),
  })),
  familiar: familiar.map(({ id, distance, scale }) => ({ id, distance, scale })),
  baselineId,
})

/**
 * Parse the JSON text of an import.
 *
 * @param {unknown} text
 * @returns {{ isOk: true, value: unknown } | { isOk: false }}
 */
const parseJsonText = (text) => {
  if (typeof text !== 'string') return { isOk: false }
  try {
    return { isOk: true, value: JSON.parse(text) }
  } catch {
    return { isOk: false }
  }
}

/**
 * One custom display from an import, or `null` when it is invalid.
 *
 * @param {unknown} item
 * @returns {Display|null}
 */
const readImportedDisplay = (item) => {
  if (!isPlainObject(item) || !isId(item.id)) return null
  const display = parseDisplayInput(item)
  return display === null ? null : { ...display, id: item.id, isCustom: true }
}

/**
 * One familiar entry from an import, or `null` when it is invalid.
 *
 * @param {unknown} item
 * @returns {FamiliarEntry|null}
 */
const readImportedFamiliar = (item) => {
  if (!isPlainObject(item) || !isId(item.id)) return null
  const distance = parsePositive(item.distance)
  const scale = parsePositive(item.scale)
  if (distance === undefined || scale === undefined) return null
  return { id: item.id, distance, scale }
}

/**
 * Check an import payload. Any invalid item rejects the whole file, so an import never
 * half-applies. A custom display may not reuse a built-in id.
 *
 * @param {object} params
 * @param {unknown} params.payload
 * @param {Set<string>} params.builtInIds
 * @returns {{ isOk: true, customDisplays: Display[], familiar: FamiliarEntry[], baselineId: string|null } | null}
 */
const readImportPayload = ({ payload, builtInIds }) => {
  if (
    !isPlainObject(payload) ||
    payload.app !== EXPORT_APP ||
    payload.version !== EXPORT_VERSION
  ) {
    return null
  }
  const customItems = payload.customDisplays ?? []
  const familiarItems = payload.familiar ?? []
  if (!Array.isArray(customItems) || !Array.isArray(familiarItems)) return null

  const customDisplays = customItems.map((item) => readImportedDisplay(item))
  const familiar = familiarItems.map((item) => readImportedFamiliar(item))
  const baselineId = payload.baselineId ?? null
  const isValid =
    customDisplays.every((display) => display !== null && !builtInIds.has(display.id)) &&
    familiar.every((entry) => entry !== null) &&
    (baselineId === null || isId(baselineId))
  if (!isValid) return null

  return {
    isOk: true,
    customDisplays: uniqueBy({ items: customDisplays, keyOf: ({ id }) => id }),
    familiar: uniqueBy({ items: familiar, keyOf: ({ id }) => id }),
    baselineId,
  }
}

/**
 * Parse and check an import file (F18). Errors are codes, so the caller can show the
 * right message.
 *
 * - `invalidJson`: the text is not JSON.
 * - `invalidFormat`: the JSON is not a pixely export of version 1, or an item is invalid.
 *
 * @param {object} params
 * @param {unknown} params.text
 * @param {Set<string>} params.builtInIds
 * @returns {{ isOk: true, customDisplays: Display[], familiar: FamiliarEntry[], baselineId: string|null }
 *   | { isOk: false, error: 'invalidJson'|'invalidFormat' }}
 *
 * @example
 * parseImportText({ text: '{', builtInIds: new Set() }) // { isOk: false, error: 'invalidJson' }
 */
export const parseImportText = ({ text, builtInIds }) => {
  const parsed = parseJsonText(text)
  if (!parsed.isOk) return { isOk: false, error: 'invalidJson' }
  const result = readImportPayload({ payload: parsed.value, builtInIds })
  return result ?? { isOk: false, error: 'invalidFormat' }
}
