/**
 * Application state (ARCHITECTURE: `state/store.js`): signals, computed values, actions,
 * hydration, persistence and URL sync. Components import what they need from here.
 *
 * The store is a factory, so tests can build fresh stores with fake storage, location and
 * history. The module exports a singleton, `store`, and each of its members as a named
 * export, so components can write `import { browseRows } from '../state/store.js'`.
 *
 * Design points:
 *
 * - **One baseline (F3).** Once a familiar set exists, exactly one of its displays is the
 *   baseline. Every change to the familiar set, to the custom displays or to the hidden
 *   lists goes through `commit`, which reconciles the cross-references in one batch.
 * - **Pure helpers.** Filtering, sorting, entry building and validation live in
 *   `selectors.js`, so this file only wires them to signals.
 * - **Persistence and URL sync are effects.** Both write through a microtask queue, so a
 *   burst of changes becomes one write. `flush()` writes now and resolves when the writes
 *   have finished. Tests use it instead of timers.
 * - **Shared links (F19).** A link whose familiar set differs from the stored one is a
 *   shared view. While it is shown, the familiar set, baseline and custom displays are not
 *   written to storage, so the recipient's own data survives. `keepSharedView()` adopts the
 *   link, and `discardSharedView()` reloads the stored state.
 *
 * Units are canonical: inches, and factors for scales. Nothing here converts units.
 *
 * @module state/store
 */

import { batch, computed, effect, signal } from '@preact/signals'
import seedJson from '../data/seed.json'
import { detectLocale, locale as sharedLocale } from '../i18n/index.js'
import { getDisplayMetrics, getScaleOptions } from '../lib/calc/index.js'
import { defaultDistanceFor } from '../lib/units.js'
import { detectPresetId } from '../lib/scales.js'
import { decodeState, encodeState } from '../lib/url-state.js'
import { loadPersisted, savePersisted } from '../lib/storage.js'
import {
  DEFAULT_COMFORT,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  EQUIVALENT_KINDS,
  LOCALES,
  PRESET_IDS,
  SIZE_MATCH_BY,
  UNITS,
  VIEWS,
  VIZ_MODES,
  buildBrowseRow,
  buildCompareEntry,
  buildExportPayload,
  createCustomId,
  filterBrowseRows,
  isSameFamiliarSet,
  mergeById,
  nextSort,
  parseComfortPatch,
  parseCustomScale,
  parseDisplayInput,
  parseFiltersPatch,
  parseImportText,
  parsePositive,
  parseSettingsPatch,
  pickDefaultScale,
  readCustomScales,
  readPreferences,
  reconcileState,
  sortBrowseRows,
} from './selectors.js'

/** @typedef {import('./selectors.js').BrowseRow} BrowseRow */
/** @typedef {import('./selectors.js').CompareEntry} CompareEntry */
/** @typedef {import('../lib/storage.js').Display} Display */
/** @typedef {import('../lib/storage.js').FamiliarEntry} FamiliarEntry */
/** @typedef {import('../lib/url-state.js').ViewState} ViewState */
/** @typedef {import('@preact/signals').Signal} Signal */

/**
 * The result of an import (F18).
 *
 * @typedef {{ isOk: true } | { isOk: false, error: 'invalidJson'|'invalidFormat' }} ImportResult
 */

/**
 * Everything the app reads and calls. Signals hold their value in `.value`. Computed
 * values are read-only signals. Actions return a boolean when the change was applied
 * (`false` means the input was refused, and nothing changed), unless their JSDoc says
 * otherwise.
 *
 * @typedef {object} Store
 * @property {Signal<Display[]>} builtInDisplays   seed displays, inputs only
 * @property {Signal<Display[]>} customDisplays    user displays (`isCustom: true`)
 * @property {Signal<string[]>} hiddenBuiltInIds   built-ins the user hid
 * @property {Signal<FamiliarEntry[]>} familiar    the familiar set (F2)
 * @property {Signal<string|null>} baselineId      exactly one familiar id, or null when none (F3)
 * @property {Signal<string[]>} compareIds         candidates to compare, besides familiar ones
 * @property {Signal<Record<string, { distance?: number, scale?: number }>>} compareSettings
 *   settings of candidates; familiar settings live on their entries
 * @property {Signal<string[]>} hiddenFamiliarIds  familiar displays hidden in Compare
 * @property {Signal<'metric'|'imperial'>} units
 * @property {Signal<'en'|'cs'>} locale            the shared i18n signal
 * @property {Signal<'windows'|'macos'|'linux'>} presetId
 * @property {Signal<number[]>} customScales
 * @property {Signal<import('./selectors.js').ComfortWindow>} comfort
 * @property {Signal<import('./selectors.js').BrowseFilters>} filters
 * @property {Signal<{ key: string, direction: 'asc'|'desc' }>} sort
 * @property {Signal<'physical'|'seen'>} vizMode
 * @property {Signal<'height'|'width'|'diagonal'>} sizeMatchBy
 * @property {Signal<'browse'|'compare'>} view
 * @property {Signal<boolean>} isOnboarded
 * @property {Signal<boolean>} isHydrated          true once `hydrate()` has finished
 * @property {Signal<boolean>} isSharedView        true while a shared link is shown (F19)
 * @property {{ value: Display[] }} allDisplays    visible built-ins plus custom displays
 * @property {{ value: Map<string, Display> }} displaysById   every display, hidden ones included
 * @property {{ value: Map<string, import('../lib/calc/index.js').DisplayMetrics> }} metricsById
 * @property {{ value: { display: Display, metrics: object, distance: number, scale: number }|null }} baseline
 * @property {{ value: BrowseRow[] }} browseRows   filtered and sorted; the Browse table or cards
 * @property {{ value: BrowseRow[] }} familiarRows the familiar set, unfiltered, in familiar order
 * @property {{ value: CompareEntry[] }} compareEntries   the Compare columns: baseline first
 * @property {(display: Display) => import('../lib/calc/index.js').ScaleOption[]} scaleOptionsFor
 * @property {() => ViewState} getViewState        what the link carries (F19)
 * @property {(inputs: object) => string|null} addCustomDisplay   returns the new id, or `null`
 * @property {(inputs: object) => boolean} updateCustomDisplay    `{ id, ...fields }`; an
 *   explicit `tag: undefined` removes the tag
 * @property {(id: string) => boolean} deleteCustomDisplay
 * @property {(id: string) => boolean} hideBuiltIn
 * @property {(id: string) => boolean} unhideBuiltIn
 * @property {(id: string) => boolean} toggleFamiliar      adds with defaults, or removes
 * @property {(settings: { id: string, distance?: number, scale?: number }) => boolean} setFamiliarSettings
 * @property {(id: string) => boolean} setBaseline
 * @property {(id: string) => boolean} promoteToBaseline  any compared display; a candidate becomes familiar
 * @property {(id: string) => boolean} toggleCompare      not for familiar displays
 * @property {(settings: { id: string, distance?: number, scale?: number }) => boolean} setCompareSettings
 * @property {(request: { id: string, kind: 'sameSize'|'sameSharpness'|'sameTextSize' }) => boolean} applyEquivalent
 * @property {(id: string) => boolean} toggleFamiliarHidden
 * @property {(units: 'metric'|'imperial') => boolean} setUnits
 * @property {(locale: 'en'|'cs') => boolean} setLocale
 * @property {(presetId: 'windows'|'macos'|'linux') => boolean} setPresetId
 * @property {(scale: number) => boolean} addCustomScale
 * @property {(scale: number) => boolean} removeCustomScale
 * @property {(patch: Partial<import('./selectors.js').ComfortWindow>) => boolean} setComfort
 * @property {(patch: Partial<import('./selectors.js').BrowseFilters>) => boolean} setFilters
 * @property {(sort: { key: string, direction?: 'asc'|'desc' }) => boolean} setSort
 * @property {(mode: 'physical'|'seen') => boolean} setVizMode
 * @property {(by: 'height'|'width'|'diagonal') => boolean} setSizeMatchBy
 * @property {(view: 'browse'|'compare') => boolean} setView
 * @property {() => boolean} completeOnboarding   needs at least one familiar display
 * @property {() => string} exportJson            pretty JSON (F18)
 * @property {(text: string) => ImportResult} importJson
 * @property {() => Promise<void>} hydrate        load storage, then the link; idempotent
 * @property {() => boolean} keepSharedView       adopt the shared link and persist it
 * @property {() => Promise<boolean>} discardSharedView   reload the stored state
 * @property {() => Promise<void>} flush          write pending storage and URL changes now
 * @property {() => void} dispose                 stop the persistence and URL effects
 */

/**
 * Remove keys whose value is `undefined`.
 *
 * @param {Record<string, unknown>} fields
 * @returns {Record<string, unknown>}
 */
const withoutUndefined = (fields) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))

/**
 * Whether a link shows a familiar set other than the stored one (F19). A link without a
 * familiar set never does. A link with the same set as the stored one is the user's own
 * link after a reload, so it is not a shared view.
 *
 * @param {object} params
 * @param {Partial<ViewState>} params.hashState The decoded link, `{}` when there is none.
 * @param {FamiliarEntry[]} params.storedFamiliar
 * @param {string|null} params.storedBaselineId
 * @returns {boolean}
 */
const isSharedLink = ({ hashState, storedFamiliar, storedBaselineId }) => {
  if (!Array.isArray(hashState.familiar) || hashState.familiar.length === 0) return false
  return !isSameFamiliarSet({
    left: { familiar: hashState.familiar, baselineId: hashState.baselineId ?? null },
    right: { familiar: storedFamiliar, baselineId: storedBaselineId },
  })
}

/**
 * Create one store. Every option has a default, so `createStore()` gives the app's store.
 *
 * @param {object} [options]
 * @param {Display[]} [options.seed] Built-in displays. Default: `src/data/seed.json`.
 * @param {{ loadPersisted: () => Promise<object>, savePersisted: (partial: object) => Promise<void> }} [options.storage]
 * @param {{ hash: string }} [options.location] Read for the `#s=` link. Default: `globalThis.location`.
 * @param {{ replaceState: (state: null, title: string, url: string) => void }} [options.history]
 *   Written to keep the link current. Default: `globalThis.history`.
 * @param {() => 'windows'|'macos'|'linux'} [options.detectPreset] Used when nothing is saved.
 * @param {() => 'en'|'cs'} [options.detectLang] Used when neither the link nor storage has a language.
 * @returns {Store}
 *
 * @example
 * const store = createStore({ storage: fakeStorage, location: { hash: '' } })
 * await store.hydrate()
 * store.toggleFamiliar('27-4k-3840x2160')
 */
export const createStore = ({
  seed = seedJson,
  storage = { loadPersisted, savePersisted },
  location = globalThis.location,
  history = globalThis.history,
  detectPreset = detectPresetId,
  detectLang = detectLocale,
} = {}) => {
  // Signals -----------------------------------------------------------------------------

  const builtInDisplays = signal(seed)
  const customDisplays = signal(/** @type {Display[]} */ ([]))
  const hiddenBuiltInIds = signal(/** @type {string[]} */ ([]))
  const familiar = signal(/** @type {FamiliarEntry[]} */ ([]))
  const baselineId = signal(/** @type {string|null} */ (null))
  const compareIds = signal(/** @type {string[]} */ ([]))
  const compareSettings = signal(
    /** @type {Record<string, { distance?: number, scale?: number }>} */ ({}),
  )
  const hiddenFamiliarIds = signal(/** @type {string[]} */ ([]))
  const units = signal(/** @type {'metric'|'imperial'} */ ('metric'))
  const locale = sharedLocale
  const presetId = signal(/** @type {'windows'|'macos'|'linux'} */ ('windows'))
  const customScales = signal(/** @type {number[]} */ ([]))
  const comfort = signal(DEFAULT_COMFORT)
  const filters = signal(DEFAULT_FILTERS)
  const sort = signal(DEFAULT_SORT)
  const vizMode = signal(/** @type {'physical'|'seen'} */ ('physical'))
  const sizeMatchBy = signal(/** @type {'height'|'width'|'diagonal'} */ ('height'))
  const view = signal(/** @type {'browse'|'compare'} */ ('browse'))
  const isOnboarded = signal(false)
  const isHydrated = signal(false)
  const isSharedView = signal(false)

  // Computed ----------------------------------------------------------------------------

  const builtInIds = computed(() => new Set(builtInDisplays.value.map(({ id }) => id)))
  const hiddenBuiltInSet = computed(() => new Set(hiddenBuiltInIds.value))
  const familiarIds = computed(() => new Set(familiar.value.map(({ id }) => id)))
  const hiddenFamiliarSet = computed(() => new Set(hiddenFamiliarIds.value))
  const compareSet = computed(() => new Set(compareIds.value))

  const allDisplays = computed(() => [
    ...builtInDisplays.value.filter(({ id }) => !hiddenBuiltInSet.value.has(id)),
    ...customDisplays.value,
  ])

  const displaysById = computed(
    () =>
      new Map(
        [...builtInDisplays.value, ...customDisplays.value].map((display) => [
          display.id,
          display,
        ]),
      ),
  )

  const metricsById = computed(
    () =>
      new Map(
        [...displaysById.value.values()].map((display) => [
          display.id,
          getDisplayMetrics(display),
        ]),
      ),
  )

  const baseline = computed(() => {
    const entry = familiar.value.find(({ id }) => id === baselineId.value)
    const display = entry ? displaysById.value.get(entry.id) : undefined
    if (!display) return null
    return {
      display,
      metrics: metricsById.value.get(display.id),
      distance: entry.distance,
      scale: entry.scale,
    }
  })

  const scalingSettings = computed(() => ({
    presetId: presetId.value,
    customScales: customScales.value,
    comfort: comfort.value,
  }))

  /**
   * Every visible display as a row, before filters. It depends on the baseline and the
   * scale settings, but not on the filters, so a filter change does not rebuild it.
   */
  const visibleRows = computed(() =>
    allDisplays.value.map((display) =>
      buildBrowseRow({
        display,
        metrics: metricsById.value.get(display.id),
        baseline: baseline.value,
        scaling: scalingSettings.value,
        isFamiliar: familiarIds.value.has(display.id),
        isBaseline: baselineId.value === display.id,
        isCompared:
          compareSet.value.has(display.id) ||
          (familiarIds.value.has(display.id) && !hiddenFamiliarSet.value.has(display.id)),
      }),
    ),
  )

  const browseRows = computed(() =>
    sortBrowseRows({
      rows: filterBrowseRows({ rows: visibleRows.value, filters: filters.value }),
      sort: sort.value,
      locale: locale.value,
    }),
  )

  const familiarRows = computed(() =>
    familiar.value.flatMap(({ id }) => {
      const display = displaysById.value.get(id)
      if (!display) return []
      return [
        buildBrowseRow({
          display,
          metrics: metricsById.value.get(id),
          baseline: baseline.value,
          scaling: scalingSettings.value,
          isFamiliar: true,
          isBaseline: baselineId.value === id,
          isCompared: !hiddenFamiliarSet.value.has(id),
        }),
      ]
    }),
  )

  const compareEntries = computed(() => {
    const baselineFirst = [
      ...familiar.value.filter(({ id }) => id === baselineId.value),
      ...familiar.value.filter(({ id }) => id !== baselineId.value),
    ]
    const familiarPart = baselineFirst
      .filter(({ id }) => !hiddenFamiliarSet.value.has(id))
      .map((entry) => ({ id: entry.id, familiarEntry: entry }))
    const candidatePart = compareIds.value
      .filter((id) => !familiarIds.value.has(id) && !hiddenBuiltInSet.value.has(id))
      .map((id) => ({ id, familiarEntry: undefined }))

    return [...familiarPart, ...candidatePart].flatMap(({ id, familiarEntry }) => {
      const display = displaysById.value.get(id)
      if (!display) return []
      return [
        buildCompareEntry({
          display,
          metrics: metricsById.value.get(id),
          baseline: baseline.value,
          familiarEntry,
          setting: settingOf(id),
          isBaseline: baselineId.value === id,
          scaling: scalingSettings.value,
          sizeMatchBy: sizeMatchBy.value,
        }),
      ]
    })
  })

  /**
   * The candidate setting of a display, or `undefined`.
   *
   * @param {string} id
   * @returns {{ distance?: number, scale?: number }|undefined}
   */
  const settingOf = (id) =>
    Object.hasOwn(compareSettings.value, id) ? compareSettings.value[id] : undefined

  /**
   * @param {Display} display
   * @returns {import('../lib/calc/index.js').ScaleOption[]}
   */
  const scaleOptionsFor = (display) =>
    getScaleOptions({
      display,
      presetId: presetId.value,
      customScales: customScales.value,
    })

  /**
   * The state that a link carries (F19). Custom displays are included only when the state
   * refers to them.
   *
   * @returns {ViewState}
   */
  const getViewState = () => {
    const referenced = new Set([
      ...familiar.value.map(({ id }) => id),
      ...compareIds.value,
    ])
    return {
      view: view.value,
      familiar: familiar.value,
      baselineId: baselineId.value,
      compareIds: compareIds.value,
      compareSettings: compareSettings.value,
      hiddenFamiliarIds: hiddenFamiliarIds.value,
      customDisplays: customDisplays.value.filter(({ id }) => referenced.has(id)),
      units: units.value,
      locale: locale.value,
      presetId: presetId.value,
      customScales: customScales.value,
      comfort: comfort.value,
      filters: filters.value,
      sort: sort.value,
      vizMode: vizMode.value,
      sizeMatchBy: sizeMatchBy.value,
    }
  }

  // Commit ------------------------------------------------------------------------------

  /**
   * Apply changes to the cross-referenced state. The changed fields are merged over the
   * current ones, then reconciled (baseline, compare, hidden lists), then written together
   * in one batch.
   *
   * @param {object} changes Any of the reconciled fields.
   * @returns {void}
   */
  const commit = (changes) => {
    const merged = {
      customDisplays: customDisplays.value,
      familiar: familiar.value,
      baselineId: baselineId.value,
      compareIds: compareIds.value,
      compareSettings: compareSettings.value,
      hiddenFamiliarIds: hiddenFamiliarIds.value,
      hiddenBuiltInIds: hiddenBuiltInIds.value,
      ...changes,
    }
    const knownIds = new Set([
      ...builtInIds.value,
      ...merged.customDisplays.map(({ id }) => id),
    ])
    const next = reconcileState({
      state: merged,
      builtInIds: builtInIds.value,
      knownIds,
    })
    batch(() => {
      customDisplays.value = next.customDisplays
      familiar.value = next.familiar
      baselineId.value = next.baselineId
      compareIds.value = next.compareIds
      compareSettings.value = next.compareSettings
      hiddenFamiliarIds.value = next.hiddenFamiliarIds
      hiddenBuiltInIds.value = next.hiddenBuiltInIds
    })
  }

  // Persistence and URL sync (effects) ---------------------------------------------------

  /** @type {Record<string, unknown>|null} */
  let pendingWrite = null
  let isWriteScheduled = false
  /** @type {string|null} */
  let pendingUrl = null
  let isUrlScheduled = false
  /** @type {Set<Promise<unknown>>} */
  const inFlight = new Set()
  /** @type {(() => void)|null} */
  let stopEffects = null

  /** Send the merged pending write to storage. Storage never rejects, but the result is awaited anyway. */
  const drainWrites = () => {
    isWriteScheduled = false
    if (pendingWrite === null) return
    const partial = pendingWrite
    pendingWrite = null
    const write = Promise.resolve().then(() => storage.savePersisted(partial))
    inFlight.add(write)
    const settle = () => inFlight.delete(write)
    write.then(settle, settle)
  }

  /**
   * Queue a storage write. Writes queued in the same tick are merged, so they go out
   * together.
   *
   * @param {Record<string, unknown>} partial
   */
  const queueWrite = (partial) => {
    pendingWrite = { ...(pendingWrite ?? {}), ...partial }
    if (isWriteScheduled) return
    isWriteScheduled = true
    queueMicrotask(drainWrites)
  }

  /** Replace the hash with the pending link, when it differs. */
  const drainUrl = () => {
    isUrlScheduled = false
    if (pendingUrl === null) return
    const hash = pendingUrl
    pendingUrl = null
    if (!location || !history || location.hash === hash) return
    try {
      history.replaceState(null, '', hash)
    } catch {
      // Sandboxed frames can refuse history updates; the app keeps working without a
      // shareable URL rather than breaking.
    }
  }

  /**
   * Queue a URL update. Updates queued in the same tick are merged.
   *
   * @param {string} hash
   */
  const queueUrl = (hash) => {
    pendingUrl = hash
    if (isUrlScheduled) return
    isUrlScheduled = true
    queueMicrotask(drainUrl)
  }

  /**
   * The preference fields, as stored in `preferences`.
   *
   * @returns {Record<string, unknown>}
   */
  const readPreferencesSnapshot = () => ({
    units: units.value,
    locale: locale.value,
    presetId: presetId.value,
    customScales: customScales.value,
    comfort: comfort.value,
    sizeMatchBy: sizeMatchBy.value,
    vizMode: vizMode.value,
  })

  /** Start the two effects. Called once, after hydration. */
  const startEffects = () => {
    const stops = [
      effect(() => {
        const isShared = isSharedView.value
        const preferences = readPreferencesSnapshot()
        const hiddenBuiltIns = hiddenBuiltInIds.value
        if (isShared) {
          queueWrite({ preferences, hiddenBuiltInIds: hiddenBuiltIns })
          return
        }
        queueWrite({
          preferences,
          hiddenBuiltInIds: hiddenBuiltIns,
          customDisplays: customDisplays.value,
          familiar: familiar.value,
          baselineId: baselineId.value,
          isOnboarded: isOnboarded.value,
        })
      }),
      effect(() => {
        queueUrl(encodeState(getViewState()))
      }),
    ]
    stopEffects = () => stops.forEach((stop) => stop())
  }

  /**
   * Write pending storage and URL changes now, and wait for the storage writes to finish.
   *
   * @returns {Promise<void>}
   */
  const flush = async () => {
    drainWrites()
    drainUrl()
    await Promise.allSettled([...inFlight])
  }

  /** Stop the effects. Changes made afterwards are kept in memory only. */
  const dispose = () => {
    stopEffects?.()
    stopEffects = null
  }

  // Hydration ---------------------------------------------------------------------------

  /**
   * The decoded link, or `{}` when there is none or it is not valid.
   *
   * @returns {Partial<ViewState>}
   */
  const readHashState = () => {
    const hash = location?.hash
    return typeof hash === 'string' ? (decodeState(hash) ?? {}) : {}
  }

  /**
   * Set every stored field. Missing preferences take their defaults, the locale and the
   * scale preset come from detection, and the shared view is ended.
   *
   * @param {object} stored Output of `loadPersisted()`.
   */
  const applyStored = (stored) => {
    const prefs = readPreferences(stored.preferences)
    batch(() => {
      customDisplays.value = stored.customDisplays
      hiddenBuiltInIds.value = stored.hiddenBuiltInIds
      familiar.value = stored.familiar
      baselineId.value = stored.baselineId
      isOnboarded.value = stored.isOnboarded
      isSharedView.value = false
      units.value = prefs.units
      locale.value = prefs.locale ?? detectLang()
      presetId.value = prefs.presetId ?? detectPreset()
      customScales.value = prefs.customScales
      comfort.value = prefs.comfort
      sizeMatchBy.value = prefs.sizeMatchBy
      vizMode.value = prefs.vizMode
    })
  }

  /**
   * Apply the present fields of a link over the stored state. A shared link also replaces
   * the familiar set, adds its custom displays in memory, and marks the view as shared.
   *
   * @param {object} params
   * @param {Partial<ViewState>} params.hashState
   * @param {boolean} params.isShared
   */
  const applyLink = ({ hashState, isShared }) => {
    batch(() => {
      if (isShared) {
        const embedded = (hashState.customDisplays ?? []).filter(
          ({ id }) => !builtInIds.value.has(id),
        )
        const embeddedIds = new Set(embedded.map(({ id }) => id))
        customDisplays.value = [
          ...customDisplays.value.filter(({ id }) => !embeddedIds.has(id)),
          ...embedded,
        ]
        familiar.value = hashState.familiar
        baselineId.value = hashState.baselineId ?? null
        isOnboarded.value = true
        isSharedView.value = true
      }
      if (hashState.view) view.value = hashState.view
      if (hashState.units) units.value = hashState.units
      if (hashState.locale) locale.value = hashState.locale
      if (hashState.presetId) presetId.value = hashState.presetId
      if (Array.isArray(hashState.customScales)) {
        customScales.value = readCustomScales(hashState.customScales)
      }
      const nextComfort = parseComfortPatch({
        current: comfort.value,
        patch: hashState.comfort,
      })
      if (nextComfort) comfort.value = nextComfort
      const nextFilters = parseFiltersPatch({
        current: filters.value,
        patch: hashState.filters,
      })
      if (nextFilters) filters.value = nextFilters
      if (hashState.sort) {
        const nextSortValue = nextSort({
          current: sort.value,
          key: hashState.sort.key,
          direction: hashState.sort.direction,
        })
        if (nextSortValue) sort.value = nextSortValue
      }
      if (hashState.vizMode) vizMode.value = hashState.vizMode
      if (hashState.sizeMatchBy) sizeMatchBy.value = hashState.sizeMatchBy
      if (Array.isArray(hashState.compareIds)) compareIds.value = hashState.compareIds
      if (hashState.compareSettings) compareSettings.value = hashState.compareSettings
      if (Array.isArray(hashState.hiddenFamiliarIds)) {
        hiddenFamiliarIds.value = hashState.hiddenFamiliarIds
      }
    })
  }

  /** @type {Promise<void>|null} */
  let hydration = null

  /**
   * Load the stored state, then apply the link on top, then start persistence and URL
   * sync. Calling it again returns the same promise.
   *
   * @returns {Promise<void>}
   */
  const hydrate = () => {
    hydration ??= (async () => {
      const stored = await storage.loadPersisted()
      const hashState = readHashState()
      const isShared = isSharedLink({
        hashState,
        storedFamiliar: stored.familiar,
        storedBaselineId: stored.baselineId,
      })
      batch(() => {
        applyStored(stored)
        applyLink({ hashState, isShared })
      })
      commit({})
      isHydrated.value = true
      startEffects()
    })()
    return hydration
  }

  /**
   * Adopt the shared link as the user's own. Persistence resumes, and the whole state is
   * written.
   *
   * @returns {boolean} `false` when no link is shown.
   */
  const keepSharedView = () => {
    if (!isSharedView.value) return false
    isSharedView.value = false
    return true
  }

  /**
   * Drop the shared link and reload the stored state. The shared comparison (compare set,
   * compare settings and hidden familiar ids) is cleared with it.
   *
   * @returns {Promise<boolean>} `false` when no link is shown.
   */
  const discardSharedView = async () => {
    if (!isSharedView.value) return false
    const stored = await storage.loadPersisted()
    batch(() => {
      applyStored(stored)
      compareIds.value = []
      compareSettings.value = {}
      hiddenFamiliarIds.value = []
    })
    commit({})
    return true
  }

  // Actions: familiar, baseline and compare ---------------------------------------------

  /** @param {string} id */
  const isFamiliarId = (id) => familiarIds.value.has(id)

  /**
   * Add a display to the familiar set with its default distance and best scale (F2), or
   * remove it. Removing the baseline moves the baseline (F3).
   *
   * @param {string} id
   * @returns {boolean}
   */
  const toggleFamiliar = (id) => {
    if (isFamiliarId(id)) {
      commit({ familiar: familiar.value.filter((entry) => entry.id !== id) })
      return true
    }
    const display = displaysById.value.get(id)
    if (!display) return false
    const distance = defaultDistanceFor(display)
    const scale = pickDefaultScale({
      display,
      metrics: metricsById.value.get(id),
      scaling: scalingSettings.value,
      distance,
    })
    commit({ familiar: [...familiar.value, { id, distance, scale }] })
    return true
  }

  /**
   * Set the distance and/or scale of a familiar display. A field that is missing or invalid
   * is kept.
   *
   * @param {{ id: string, distance?: number, scale?: number }} settings
   * @returns {boolean}
   */
  const setFamiliarSettings = ({ id, distance, scale }) => {
    if (!isFamiliarId(id)) return false
    const patch = parseSettingsPatch({ distance, scale })
    if (Object.keys(patch).length === 0) return false
    familiar.value = familiar.value.map((entry) =>
      entry.id === id ? { ...entry, ...patch } : entry,
    )
    return true
  }

  /**
   * Make a familiar display the baseline (F3). The baseline is always in Compare, so a hidden
   * display is shown again.
   *
   * @param {string} id
   * @returns {boolean} `false` when the display is not familiar.
   */
  const setBaseline = (id) => {
    if (!isFamiliarId(id)) return false
    batch(() => {
      baselineId.value = id
      hiddenFamiliarIds.value = hiddenFamiliarIds.value.filter((item) => item !== id)
    })
    return true
  }

  /**
   * Make any compared display the baseline in one step (Compare's "Set as baseline"). A
   * familiar display becomes the baseline, and is shown if it was hidden. A candidate first
   * becomes a familiar display, keeping the distance and scale it has in Compare, and then
   * the baseline. Exactly one familiar display is the baseline afterwards.
   *
   * @param {string} id
   * @returns {boolean} `false` when the display is neither familiar nor in Compare.
   */
  const promoteToBaseline = (id) => {
    if (isFamiliarId(id)) return setBaseline(id)
    const entry = compareEntries.value.find(({ display }) => display.id === id)
    if (!entry) return false
    commit({
      familiar: [
        ...familiar.value,
        { id, distance: entry.distance, scale: entry.scale },
      ],
      compareIds: compareIds.value.filter((item) => item !== id),
      baselineId: id,
    })
    return true
  }

  /**
   * Add a candidate to Compare, or remove it and forget its settings. Familiar displays
   * are always in Compare (hide them with `toggleFamiliarHidden`), so they are refused here.
   *
   * @param {string} id
   * @returns {boolean}
   */
  const toggleCompare = (id) => {
    if (isFamiliarId(id)) return false
    if (compareIds.value.includes(id)) {
      commit({ compareIds: compareIds.value.filter((item) => item !== id) })
      return true
    }
    if (!displaysById.value.has(id) || hiddenBuiltInSet.value.has(id)) return false
    commit({ compareIds: [...compareIds.value, id] })
    return true
  }

  /**
   * Set the distance and/or scale of a compared display. For a familiar display this changes
   * its familiar entry. For a candidate, it needs the candidate to be in Compare.
   *
   * @param {{ id: string, distance?: number, scale?: number }} settings
   * @returns {boolean}
   */
  const setCompareSettings = ({ id, distance, scale }) => {
    if (isFamiliarId(id)) return setFamiliarSettings({ id, distance, scale })
    if (!compareIds.value.includes(id)) return false
    const patch = parseSettingsPatch({ distance, scale })
    if (Object.keys(patch).length === 0) return false
    compareSettings.value = {
      ...compareSettings.value,
      [id]: { ...(settingOf(id) ?? {}), ...patch },
    }
    return true
  }

  /**
   * Set a display's distance to one of the three equivalents of the baseline (F15).
   *
   * @param {{ id: string, kind: 'sameSize'|'sameSharpness'|'sameTextSize' }} request
   * @returns {boolean} `false` for an unknown kind, a display without an equivalence (the
   *   baseline, or none without a baseline), or a display that is not in Compare.
   */
  const applyEquivalent = ({ id, kind }) => {
    if (!EQUIVALENT_KINDS.includes(kind)) return false
    const entry = compareEntries.value.find(({ display }) => display.id === id)
    if (!entry?.equivalent) return false
    return setCompareSettings({ id, distance: entry.equivalent[kind] })
  }

  /**
   * Hide a familiar display in Compare, or show it again. It stays familiar.
   *
   * @param {string} id
   * @returns {boolean} `false` when the display is not familiar.
   */
  const toggleFamiliarHidden = (id) => {
    if (!isFamiliarId(id)) return false
    hiddenFamiliarIds.value = hiddenFamiliarIds.value.includes(id)
      ? hiddenFamiliarIds.value.filter((item) => item !== id)
      : [...hiddenFamiliarIds.value, id]
    return true
  }

  // Actions: custom displays and built-ins ----------------------------------------------

  /**
   * Add a custom display (F17). Its inputs are validated, and it can be marked familiar in
   * the same step.
   *
   * @param {{ name: string, diagonal: number, width: number, height: number, tag?: string,
   *   isFamiliar?: boolean, distance?: number, scale?: number }} inputs
   *   Sizes are canonical: inches and pixels. A familiar display without a valid distance or
   *   scale gets the defaults (distance for its kind, best scale).
   * @returns {string|null} The new id, or `null` when the inputs are invalid.
   */
  const addCustomDisplay = (inputs = {}) => {
    const parsed = parseDisplayInput(inputs)
    if (!parsed) return null
    const id = createCustomId({
      isTaken: (candidate) => displaysById.value.has(candidate),
    })
    const display = { ...parsed, id, isCustom: true }
    const changes = { customDisplays: [...customDisplays.value, display] }
    if (inputs.isFamiliar) {
      const distance = parsePositive(inputs.distance) ?? defaultDistanceFor(display)
      const scale =
        parsePositive(inputs.scale) ??
        pickDefaultScale({
          display,
          metrics: getDisplayMetrics(display),
          scaling: scalingSettings.value,
          distance,
        })
      changes.familiar = [...familiar.value, { id, distance, scale }]
    }
    commit(changes)
    return id
  }

  /**
   * Change the fields of a custom display. A field that is not given keeps its value. An
   * explicit `tag: undefined` removes the tag. Built-in displays cannot be edited.
   *
   * @param {{ id: string, name?: string, diagonal?: number, width?: number, height?: number,
   *   tag?: string }} request
   * @returns {boolean} `false` for an unknown id, or inputs that are invalid.
   */
  const updateCustomDisplay = ({ id, ...inputs }) => {
    const current = customDisplays.value.find((display) => display.id === id)
    if (!current) return false
    const merged = { ...current, ...withoutUndefined(inputs) }
    if ('tag' in inputs) merged.tag = inputs.tag
    const parsed = parseDisplayInput(merged)
    if (!parsed) return false
    customDisplays.value = customDisplays.value.map((display) =>
      display.id === id ? { ...parsed, id, isCustom: true } : display,
    )
    return true
  }

  /**
   * Delete a custom display. It leaves the familiar set, the baseline, Compare and the
   * hidden lists (F17).
   *
   * @param {string} id
   * @returns {boolean} `false` when there is no such custom display.
   */
  const deleteCustomDisplay = (id) => {
    if (!customDisplays.value.some((display) => display.id === id)) return false
    commit({
      customDisplays: customDisplays.value.filter((display) => display.id !== id),
    })
    return true
  }

  /**
   * Hide a built-in display. It leaves the visible list and Compare, but stays in the
   * familiar set if it is there.
   *
   * @param {string} id
   * @returns {boolean} `false` for a display that is not built in.
   */
  const hideBuiltIn = (id) => {
    if (!builtInIds.value.has(id)) return false
    if (!hiddenBuiltInIds.value.includes(id)) {
      commit({ hiddenBuiltInIds: [...hiddenBuiltInIds.value, id] })
    }
    return true
  }

  /**
   * Show a hidden built-in display again.
   *
   * @param {string} id
   * @returns {boolean} `false` for a display that is not built in.
   */
  const unhideBuiltIn = (id) => {
    if (!builtInIds.value.has(id)) return false
    hiddenBuiltInIds.value = hiddenBuiltInIds.value.filter((item) => item !== id)
    return true
  }

  // Actions: preferences, controls and onboarding ---------------------------------------

  /**
   * Set a signal to a value from a list of allowed values.
   *
   * @param {object} params
   * @param {readonly string[]} params.list
   * @param {{ value: unknown }} params.target
   * @param {unknown} params.value
   * @returns {boolean}
   */
  const setChoice = ({ list, target, value }) => {
    if (!list.includes(value)) return false
    target.value = value
    return true
  }

  /**
   * @param {unknown} value
   * @returns {boolean}
   */
  const addCustomScale = (value) => {
    const scale = parseCustomScale(value)
    if (scale === null) return false
    customScales.value = readCustomScales([...customScales.value, scale])
    return true
  }

  /**
   * @param {unknown} value
   * @returns {boolean} `false` when the scale was not in the list.
   */
  const removeCustomScale = (value) => {
    const scale = parseCustomScale(value)
    if (scale === null || !customScales.value.includes(scale)) return false
    customScales.value = customScales.value.filter((item) => item !== scale)
    return true
  }

  /**
   * Change the comfort window (F7, F23). A partial patch is merged, and a window whose
   * minimum is above its maximum is refused.
   *
   * @param {Partial<import('./selectors.js').ComfortWindow>} patch
   * @returns {boolean}
   */
  const setComfort = (patch) => {
    const next = parseComfortPatch({ current: comfort.value, patch })
    if (next === null) return false
    comfort.value = next
    return true
  }

  /**
   * Change the browse filters (F8, F9). A partial patch is merged, and invalid fields keep
   * their value.
   *
   * @param {Partial<import('./selectors.js').BrowseFilters>} patch
   * @returns {boolean}
   */
  const setFilters = (patch) => {
    const next = parseFiltersPatch({ current: filters.value, patch })
    if (next === null) return false
    filters.value = next
    return true
  }

  /**
   * Change the sort (F5). Without a direction, the same key toggles it.
   *
   * @param {{ key: string, direction?: 'asc'|'desc' }} request
   * @returns {boolean} `false` for an unknown key.
   */
  const setSort = ({ key, direction } = {}) => {
    const next = nextSort({ current: sort.value, key, direction })
    if (next === null) return false
    sort.value = next
    return true
  }

  /**
   * Finish onboarding (F2). It needs at least one familiar display.
   *
   * @returns {boolean} `false` when the familiar set is empty.
   */
  const completeOnboarding = () => {
    if (familiar.value.length === 0) return false
    isOnboarded.value = true
    return true
  }

  // Actions: export and import ----------------------------------------------------------

  /**
   * The custom displays and familiar set as pretty JSON (F18).
   *
   * @returns {string}
   */
  const exportJson = () =>
    JSON.stringify(
      buildExportPayload({
        customDisplays: customDisplays.value,
        familiar: familiar.value,
        baselineId: baselineId.value,
      }),
      null,
      2,
    )

  /**
   * Import an export (F18). Custom displays merge by id, with the incoming one replacing the
   * same id. Familiar entries merge the same way, and entries for unknown displays are
   * dropped. A file with an invalid item is refused as a whole, and the state is untouched.
   *
   * @param {string} text
   * @returns {ImportResult}
   */
  const importJson = (text) => {
    const parsed = parseImportText({ text, builtInIds: builtInIds.value })
    if (!parsed.isOk) return { isOk: false, error: parsed.error }

    const nextCustomDisplays = mergeById({
      existing: customDisplays.value,
      incoming: parsed.customDisplays,
    })
    const knownIds = new Set([
      ...builtInIds.value,
      ...nextCustomDisplays.map(({ id }) => id),
    ])
    const nextFamiliar = mergeById({
      existing: familiar.value,
      incoming: parsed.familiar.filter(({ id }) => knownIds.has(id)),
    })
    const nextBaselineId =
      [parsed.baselineId, baselineId.value].find((id) =>
        nextFamiliar.some((entry) => entry.id === id),
      ) ??
      nextFamiliar[0]?.id ??
      null

    batch(() => {
      if (nextFamiliar.length > 0) isOnboarded.value = true
      commit({
        customDisplays: nextCustomDisplays,
        familiar: nextFamiliar,
        baselineId: nextBaselineId,
      })
    })
    return { isOk: true }
  }

  // Assemble ----------------------------------------------------------------------------

  return {
    builtInDisplays,
    customDisplays,
    hiddenBuiltInIds,
    familiar,
    baselineId,
    compareIds,
    compareSettings,
    hiddenFamiliarIds,
    units,
    locale,
    presetId,
    customScales,
    comfort,
    filters,
    sort,
    vizMode,
    sizeMatchBy,
    view,
    isOnboarded,
    isHydrated,
    isSharedView,
    allDisplays,
    displaysById,
    metricsById,
    baseline,
    browseRows,
    familiarRows,
    compareEntries,
    scaleOptionsFor,
    getViewState,
    addCustomDisplay,
    updateCustomDisplay,
    deleteCustomDisplay,
    hideBuiltIn,
    unhideBuiltIn,
    toggleFamiliar,
    setFamiliarSettings,
    setBaseline,
    promoteToBaseline,
    toggleCompare,
    setCompareSettings,
    applyEquivalent,
    toggleFamiliarHidden,
    setUnits: (value) => setChoice({ list: UNITS, target: units, value }),
    setLocale: (value) => setChoice({ list: LOCALES, target: locale, value }),
    setPresetId: (value) => setChoice({ list: PRESET_IDS, target: presetId, value }),
    addCustomScale,
    removeCustomScale,
    setComfort,
    setFilters,
    setSort,
    setVizMode: (value) => setChoice({ list: VIZ_MODES, target: vizMode, value }),
    setSizeMatchBy: (value) =>
      setChoice({ list: SIZE_MATCH_BY, target: sizeMatchBy, value }),
    setView: (value) => setChoice({ list: VIEWS, target: view, value }),
    completeOnboarding,
    exportJson,
    importJson,
    hydrate,
    keepSharedView,
    discardSharedView,
    flush,
    dispose,
  }
}

/** The app's store. Components use this one. */
export const store = createStore()

export default store

/**
 * Named exports of the singleton's members, so components can import what they need:
 * `import { browseRows, toggleFamiliar } from '../state/store.js'`. The type and the
 * behaviour of each member are described in the {@link Store} typedef above.
 */
export const {
  builtInDisplays,
  customDisplays,
  hiddenBuiltInIds,
  familiar,
  baselineId,
  compareIds,
  compareSettings,
  hiddenFamiliarIds,
  units,
  locale,
  presetId,
  customScales,
  comfort,
  filters,
  sort,
  vizMode,
  sizeMatchBy,
  view,
  isOnboarded,
  isHydrated,
  isSharedView,
  allDisplays,
  displaysById,
  metricsById,
  baseline,
  browseRows,
  familiarRows,
  compareEntries,
  scaleOptionsFor,
  getViewState,
  addCustomDisplay,
  updateCustomDisplay,
  deleteCustomDisplay,
  hideBuiltIn,
  unhideBuiltIn,
  toggleFamiliar,
  setFamiliarSettings,
  setBaseline,
  toggleCompare,
  setCompareSettings,
  applyEquivalent,
  toggleFamiliarHidden,
  setUnits,
  setLocale,
  setPresetId,
  addCustomScale,
  removeCustomScale,
  setComfort,
  setFilters,
  setSort,
  setVizMode,
  setSizeMatchBy,
  setView,
  completeOnboarding,
  exportJson,
  importJson,
  hydrate,
  keepSharedView,
  discardSharedView,
  flush,
  dispose,
} = store
