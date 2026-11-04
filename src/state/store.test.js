import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../i18n/index.js'
import { DEFAULT_DISTANCE } from '../lib/units.js'
import { decodeState, encodeState } from '../lib/url-state.js'
import defaultStore, { createStore, store as singleton } from './store.js'
import { DEFAULT_COMFORT, DEFAULT_FILTERS, DEFAULT_SORT } from './selectors.js'

/** Fixture seed. Expected results are noted where a test depends on them. */
const FHD = {
  id: '24-fhd-1920x1080',
  name: '24″ FHD',
  diagonal: 24,
  width: 1920,
  height: 1080,
  tag: 'monitor',
}
const UHD27 = {
  id: '27-4k-3840x2160',
  name: '4K',
  diagonal: 27,
  width: 3840,
  height: 2160,
  tag: 'monitor',
}
const QHD27 = {
  id: '27-qhd-2560x1440',
  name: 'České QHD',
  diagonal: 27,
  width: 2560,
  height: 1440,
}
const MBP14 = {
  id: '14-2-3024x1964',
  name: 'MacBook Pro 14″',
  diagonal: 14.2,
  width: 3024,
  height: 1964,
  tag: 'laptop',
}
const UW34 = {
  id: '34-uw-3440x1440',
  name: 'UW 34',
  diagonal: 34,
  width: 3440,
  height: 1440,
  tag: 'ultrawide',
}
const SEED = [FHD, UHD27, QHD27, MBP14, UW34]
const SEED_IDS = SEED.map(({ id }) => id)

const EMPTY_STORED = {
  customDisplays: [],
  hiddenBuiltInIds: [],
  familiar: [],
  baselineId: null,
  preferences: {},
  isOnboarded: false,
}

/** Stores made in a test are disposed afterwards, so their effects do not linger. */
const stores = []

afterEach(() => {
  stores.splice(0).forEach((store) => store.dispose())
})

beforeEach(() => {
  locale.value = 'en'
})

/**
 * A store with fake storage, location and history. The fake history writes into the fake
 * location, as the browser does for a hash-only `replaceState`.
 *
 * @param {object} [options]
 * @returns {{ store: ReturnType<typeof createStore>, storage: object, location: { hash: string }, history: object }}
 */
const createEnvironment = ({
  hash = '',
  stored = {},
  seed = SEED,
  detectPreset = () => 'windows',
  detectLang = () => 'en',
} = {}) => {
  const location = { hash }
  const history = {
    replaceState: vi.fn((_state, _title, url) => {
      location.hash = url
    }),
  }
  const storage = {
    loadPersisted: vi.fn(async () => structuredClone({ ...EMPTY_STORED, ...stored })),
    savePersisted: vi.fn(async () => {}),
  }
  const store = createStore({
    seed,
    storage,
    location,
    history,
    detectPreset,
    detectLang,
  })
  stores.push(store)
  return { store, storage, location, history }
}

/** Every partial object that the store has written to storage, in order. */
const savedPartials = (storage) =>
  storage.savePersisted.mock.calls.map(([partial]) => partial)

/** The latest value written for each key. */
const lastSaved = (storage) => Object.assign({}, ...savedPartials(storage))

/** A familiar set must be empty with no baseline, or have one baseline in it. */
const expectBaselineInvariant = (store) => {
  const ids = store.familiar.value.map(({ id }) => id)
  if (ids.length === 0) {
    expect(store.baselineId.value).toBeNull()
  } else {
    expect(ids).toContain(store.baselineId.value)
  }
}

/** A store, hydrated from empty storage and no link. */
const hydratedStore = async (options) => {
  const env = createEnvironment(options)
  await env.store.hydrate()
  return env
}

describe('initial state', () => {
  it('starts empty, with the documented defaults', () => {
    const { store } = createEnvironment()
    expect(store.familiar.value).toEqual([])
    expect(store.baselineId.value).toBeNull()
    expect(store.compareIds.value).toEqual([])
    expect(store.compareSettings.value).toEqual({})
    expect(store.customDisplays.value).toEqual([])
    expect(store.units.value).toBe('metric')
    expect(store.presetId.value).toBe('windows')
    expect(store.comfort.value).toEqual(DEFAULT_COMFORT)
    expect(store.filters.value).toEqual(DEFAULT_FILTERS)
    expect(store.sort.value).toEqual(DEFAULT_SORT)
    expect(store.vizMode.value).toBe('physical')
    expect(store.sizeMatchBy.value).toBe('height')
    expect(store.view.value).toBe('browse')
    expect(store.isOnboarded.value).toBe(false)
    expect(store.isHydrated.value).toBe(false)
    expect(store.isSharedView.value).toBe(false)
  })

  it('uses the shared locale signal, and the seed as built-in displays', () => {
    const { store } = createEnvironment()
    expect(store.locale).toBe(locale)
    expect(store.builtInDisplays.value.map(({ id }) => id)).toEqual(SEED_IDS)
    expect(store.allDisplays.value.map(({ id }) => id)).toEqual(SEED_IDS)
  })

  it('exposes the singleton as both named and default export', () => {
    expect(defaultStore).toBe(singleton)
    expect(typeof singleton.toggleFamiliar).toBe('function')
    expect(singleton.isHydrated.value).toBe(false)
  })
})

describe('invariants: exactly one baseline', () => {
  it('makes the first familiar display the baseline', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    expect(store.baselineId.value).toBe(FHD.id)
    store.toggleFamiliar(UHD27.id)
    expect(store.baselineId.value).toBe(FHD.id)
  })

  it('moves the baseline to the first remaining display when it is removed', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleFamiliar(UHD27.id)
    store.toggleFamiliar(QHD27.id)
    store.toggleFamiliar(FHD.id)
    expect(store.baselineId.value).toBe(UHD27.id)
  })

  it('keeps the baseline when a non-baseline display is removed', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleFamiliar(UHD27.id)
    store.toggleFamiliar(UHD27.id)
    expect(store.baselineId.value).toBe(FHD.id)
  })

  it('has no baseline once the familiar set is empty', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleFamiliar(FHD.id)
    expect(store.familiar.value).toEqual([])
    expect(store.baselineId.value).toBeNull()
  })

  it('holds through a mixed sequence of changes', () => {
    const { store } = createEnvironment()
    const steps = [
      () => store.toggleFamiliar(FHD.id),
      () => store.toggleFamiliar(QHD27.id),
      () => store.setBaseline(QHD27.id),
      () => store.toggleFamiliar(QHD27.id),
      () => store.toggleFamiliar(MBP14.id),
      () => store.toggleFamiliar(FHD.id),
      () => store.deleteCustomDisplay('c-missing'),
      () => store.toggleFamiliar(MBP14.id),
    ]
    steps.forEach((step) => {
      step()
      expectBaselineInvariant(store)
    })
  })
})

describe('toggleFamiliar and familiar settings', () => {
  it('adds a display with its default distance and its best scale', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    expect(store.familiar.value).toEqual([
      { id: FHD.id, distance: DEFAULT_DISTANCE.monitor, scale: 1 },
    ])
    store.toggleFamiliar(UHD27.id)
    expect(store.familiar.value[1]).toEqual({
      id: UHD27.id,
      distance: DEFAULT_DISTANCE.monitor,
      scale: 1.75,
    })
  })

  it('uses 45 cm for a laptop', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(MBP14.id)
    expect(store.familiar.value[0].distance).toBeCloseTo(DEFAULT_DISTANCE.laptop, 9)
  })

  it('returns false for an unknown id', () => {
    const { store } = createEnvironment()
    expect(store.toggleFamiliar('nope')).toBe(false)
    expect(store.familiar.value).toEqual([])
  })

  it('updates distance and scale, keeping the field that is not given', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    expect(store.setFamiliarSettings({ id: FHD.id, distance: 30 })).toBe(true)
    expect(store.familiar.value[0]).toEqual({ id: FHD.id, distance: 30, scale: 1 })
    store.setFamiliarSettings({ id: FHD.id, scale: 1.25 })
    expect(store.familiar.value[0]).toEqual({ id: FHD.id, distance: 30, scale: 1.25 })
  })

  it('rejects invalid settings and settings for a display that is not familiar', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    expect(store.setFamiliarSettings({ id: FHD.id, distance: -4, scale: 0 })).toBe(false)
    expect(store.setFamiliarSettings({ id: UHD27.id, distance: 30 })).toBe(false)
    expect(store.familiar.value[0].distance).toBe(DEFAULT_DISTANCE.monitor)
  })

  it('switches the baseline only to a familiar display', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleFamiliar(UHD27.id)
    expect(store.setBaseline(UHD27.id)).toBe(true)
    expect(store.baselineId.value).toBe(UHD27.id)
    expect(store.setBaseline(QHD27.id)).toBe(false)
    expect(store.baselineId.value).toBe(UHD27.id)
  })

  it('makes the baseline distance the default for candidates', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleCompare(QHD27.id)
    store.setFamiliarSettings({ id: FHD.id, distance: 40 })
    const candidate = store.compareEntries.value.find(
      ({ display }) => display.id === QHD27.id,
    )
    expect(candidate.distance).toBe(40)
  })
})

describe('baseline computed', () => {
  it('is null without a familiar display', () => {
    const { store } = createEnvironment()
    expect(store.baseline.value).toBeNull()
  })

  it('carries the display, its metrics, distance and scale', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    const { baseline } = store
    expect(baseline.value.display.id).toBe(FHD.id)
    expect(baseline.value.metrics.ppi).toBeCloseTo(91.79, 1)
    expect(baseline.value.distance).toBe(DEFAULT_DISTANCE.monitor)
    expect(baseline.value.scale).toBe(1)
  })
})

describe('compare', () => {
  it('adds and removes candidates, and refuses familiar and unknown displays', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    expect(store.toggleCompare(QHD27.id)).toBe(true)
    expect(store.compareIds.value).toEqual([QHD27.id])
    expect(store.toggleCompare(QHD27.id)).toBe(true)
    expect(store.compareIds.value).toEqual([])
    expect(store.toggleCompare(FHD.id)).toBe(false)
    expect(store.toggleCompare('nope')).toBe(false)
  })

  it('lists the baseline first, then the other familiar displays, then candidates', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleFamiliar(UHD27.id)
    store.setBaseline(UHD27.id)
    store.toggleCompare(QHD27.id)
    store.toggleCompare(MBP14.id)
    expect(store.compareEntries.value.map(({ display }) => display.id)).toEqual([
      UHD27.id,
      FHD.id,
      QHD27.id,
      MBP14.id,
    ])
  })

  it('draws a candidate at the baseline distance and its best scale', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleCompare(UHD27.id)
    const entry = store.compareEntries.value.find(
      ({ display }) => display.id === UHD27.id,
    )
    expect(entry.distance).toBe(DEFAULT_DISTANCE.monitor)
    expect(entry.scale).toBe(1.75)
    expect(entry.isFamiliar).toBe(false)
    expect(entry.isBaseline).toBe(false)
    expect(entry.matrix).toHaveLength(5)
    expect(entry.angular.horizontalFov).toBeGreaterThan(0)
  })

  it('uses 45 cm for a laptop candidate when there is no baseline', () => {
    const { store } = createEnvironment()
    store.toggleCompare(MBP14.id)
    const [entry] = store.compareEntries.value
    expect(entry.distance).toBeCloseTo(DEFAULT_DISTANCE.laptop, 9)
    expect(entry.relative).toBeNull()
    expect(entry.equivalent).toBeNull()
  })

  it('sets a candidate distance and scale, and forgets them when it leaves compare', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleCompare(QHD27.id)
    expect(store.setCompareSettings({ id: QHD27.id, distance: 35, scale: 1.25 })).toBe(
      true,
    )
    expect(store.compareSettings.value).toEqual({
      [QHD27.id]: { distance: 35, scale: 1.25 },
    })
    const [, entry] = store.compareEntries.value
    expect(entry.distance).toBe(35)
    expect(entry.scale).toBe(1.25)
    store.toggleCompare(QHD27.id)
    expect(store.compareSettings.value).toEqual({})
  })

  it('refuses candidate settings for a display that is not compared', () => {
    const { store } = createEnvironment()
    expect(store.setCompareSettings({ id: QHD27.id, distance: 35 })).toBe(false)
    expect(store.compareSettings.value).toEqual({})
  })

  it('routes candidate settings for a familiar display to its familiar entry', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    expect(store.setCompareSettings({ id: FHD.id, scale: 1.25 })).toBe(true)
    expect(store.familiar.value[0].scale).toBe(1.25)
    expect(store.compareSettings.value).toEqual({})
  })

  it('hides a familiar display from compare without removing it', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleFamiliar(UHD27.id)
    expect(store.toggleFamiliarHidden(FHD.id)).toBe(true)
    expect(store.compareEntries.value.map(({ display }) => display.id)).toEqual([
      UHD27.id,
    ])
    expect(store.familiar.value.map(({ id }) => id)).toContain(FHD.id)
    expect(store.toggleFamiliarHidden(QHD27.id)).toBe(false)
    expect(store.toggleFamiliarHidden(FHD.id)).toBe(true)
    expect(store.compareEntries.value.map(({ display }) => display.id)).toEqual([
      FHD.id,
      UHD27.id,
    ])
  })

  it('marks a familiar display that is in compare, and the baseline', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    const [entry] = store.compareEntries.value
    expect(entry.isFamiliar).toBe(true)
    expect(entry.isBaseline).toBe(true)
    expect(entry.equivalent).toBeNull()
    expect(entry.relative.relativePixelSize).toBeCloseTo(0, 12)
  })
})

describe('applyEquivalent', () => {
  it('applies the three PRD equivalents to a 32″ 4K against a 24″ FHD at 60 cm', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.setFamiliarSettings({
      id: FHD.id,
      distance: DEFAULT_DISTANCE.monitor,
      scale: 1,
    })
    const id = store.addCustomDisplay({
      name: '32″ 4K',
      diagonal: 32,
      width: 3840,
      height: 2160,
    })
    store.toggleCompare(id)
    const cm = (inches) => inches * 2.54
    const entry = () => store.compareEntries.value.find((e) => e.display.id === id)

    expect(cm(entry().equivalent.sameSize)).toBeCloseTo(80, 0)
    expect(cm(entry().equivalent.sameSharpness)).toBeCloseTo(40, 0)
    expect(cm(entry().equivalent.sameTextSize)).toBeCloseTo(60, 0)

    expect(store.applyEquivalent({ id, kind: 'sameSize' })).toBe(true)
    expect(cm(entry().distance)).toBeCloseTo(80, 0)
    expect(store.applyEquivalent({ id, kind: 'sameSharpness' })).toBe(true)
    expect(cm(entry().distance)).toBeCloseTo(40, 0)
    expect(store.applyEquivalent({ id, kind: 'sameTextSize' })).toBe(true)
    expect(cm(entry().distance)).toBeCloseTo(60, 0)
  })

  it('applies to a familiar candidate by changing its familiar distance', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleFamiliar(UHD27.id)
    store.applyEquivalent({ id: UHD27.id, kind: 'sameSharpness' })
    expect(store.familiar.value[1].distance).toBeCloseTo(
      (DEFAULT_DISTANCE.monitor * 91.79) / 163.18,
      1,
    )
  })

  it('refuses the baseline, an unknown kind and a display that is not compared', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleCompare(QHD27.id)
    expect(store.applyEquivalent({ id: FHD.id, kind: 'sameSize' })).toBe(false)
    expect(store.applyEquivalent({ id: QHD27.id, kind: 'bigger' })).toBe(false)
    expect(store.applyEquivalent({ id: MBP14.id, kind: 'sameSize' })).toBe(false)
  })
})

describe('custom displays', () => {
  it('adds a trimmed display with a prefixed id and isCustom set', () => {
    const { store } = createEnvironment()
    const id = store.addCustomDisplay({
      name: '  Office 27  ',
      diagonal: 27,
      width: 2560,
      height: 1440,
      tag: 'monitor',
    })
    expect(id).toMatch(/^c-[a-z0-9]+$/)
    expect(store.displaysById.value.get(id)).toEqual({
      id,
      name: 'Office 27',
      diagonal: 27,
      width: 2560,
      height: 1440,
      tag: 'monitor',
      isCustom: true,
    })
    expect(store.allDisplays.value.map((display) => display.id)).toContain(id)
    expect(store.metricsById.value.get(id).ppi).toBeCloseTo(108.79, 1)
  })

  it('returns null and changes nothing for invalid input', () => {
    const { store } = createEnvironment()
    const before = store.customDisplays.value
    expect(
      store.addCustomDisplay({ name: '', diagonal: 27, width: 2560, height: 1440 }),
    ).toBeNull()
    expect(
      store.addCustomDisplay({ name: 'X', diagonal: 0, width: 2560, height: 1440 }),
    ).toBeNull()
    expect(
      store.addCustomDisplay({ name: 'X', diagonal: 27, width: -1, height: 1440 }),
    ).toBeNull()
    expect(store.customDisplays.value).toBe(before)
  })

  it('drops an unknown tag and keeps the display', () => {
    const { store } = createEnvironment()
    const id = store.addCustomDisplay({
      name: 'Tablet',
      diagonal: 12,
      width: 2160,
      height: 1620,
      tag: 'tablet',
    })
    expect('tag' in store.displaysById.value.get(id)).toBe(false)
  })

  it('marks a new display as familiar with a default distance and best scale', () => {
    const { store } = createEnvironment()
    const id = store.addCustomDisplay({
      name: 'Office 27',
      diagonal: 27,
      width: 3840,
      height: 2160,
      isFamiliar: true,
    })
    expect(store.familiar.value).toEqual([
      { id, distance: DEFAULT_DISTANCE.monitor, scale: 1.75 },
    ])
    expect(store.baselineId.value).toBe(id)
  })

  it('uses the distance and scale it is given for a familiar display', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    const id = store.addCustomDisplay({
      name: 'Office 27',
      diagonal: 27,
      width: 2560,
      height: 1440,
      isFamiliar: true,
      distance: 30,
      scale: 1.25,
    })
    expect(store.familiar.value[1]).toEqual({ id, distance: 30, scale: 1.25 })
    expect(store.baselineId.value).toBe(FHD.id)
  })

  it('gives every new display a different id', () => {
    const { store } = createEnvironment()
    const ids = Array.from({ length: 20 }, (_, index) =>
      store.addCustomDisplay({
        name: `Display ${index}`,
        diagonal: 24,
        width: 1920,
        height: 1080,
      }),
    )
    expect(new Set(ids).size).toBe(20)
  })

  it('updates the fields that are given and recomputes its metrics', () => {
    const { store } = createEnvironment()
    const id = store.addCustomDisplay({
      name: 'Office',
      diagonal: 27,
      width: 2560,
      height: 1440,
      tag: 'monitor',
    })
    const ppiBefore = store.metricsById.value.get(id).ppi
    expect(store.updateCustomDisplay({ id, diagonal: 32 })).toBe(true)
    expect(store.displaysById.value.get(id)).toMatchObject({
      name: 'Office',
      diagonal: 32,
      tag: 'monitor',
    })
    expect(store.metricsById.value.get(id).ppi).toBeLessThan(ppiBefore)
    expect(store.updateCustomDisplay({ id, tag: undefined })).toBe(true)
    expect('tag' in store.displaysById.value.get(id)).toBe(false)
  })

  it('refuses an invalid update, an unknown id and a built-in id', () => {
    const { store } = createEnvironment()
    const id = store.addCustomDisplay({
      name: 'Office',
      diagonal: 27,
      width: 2560,
      height: 1440,
    })
    expect(store.updateCustomDisplay({ id, width: 0 })).toBe(false)
    expect(store.displaysById.value.get(id).width).toBe(2560)
    expect(store.updateCustomDisplay({ id: 'c-nope', name: 'X' })).toBe(false)
    expect(store.updateCustomDisplay({ id: FHD.id, name: 'X' })).toBe(false)
    expect(store.displaysById.value.get(FHD.id).name).toBe('24″ FHD')
  })

  it('deletes a display and removes it from familiar, baseline and compare', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    const customId = store.addCustomDisplay({
      name: 'Office',
      diagonal: 27,
      width: 2560,
      height: 1440,
      isFamiliar: true,
    })
    store.setBaseline(customId)
    store.toggleCompare(QHD27.id)
    store.setCompareSettings({ id: QHD27.id, distance: 35 })
    store.toggleFamiliarHidden(customId)

    expect(store.deleteCustomDisplay(customId)).toBe(true)

    expect(store.customDisplays.value).toEqual([])
    expect(store.familiar.value.map(({ id }) => id)).toEqual([FHD.id])
    expect(store.baselineId.value).toBe(FHD.id)
    expect(store.hiddenFamiliarIds.value).toEqual([])
    expect(store.displaysById.value.has(customId)).toBe(false)
    expect(store.deleteCustomDisplay(FHD.id)).toBe(false)
  })

  it('removes a deleted candidate from compare and its settings', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    const id = store.addCustomDisplay({
      name: 'Office',
      diagonal: 27,
      width: 2560,
      height: 1440,
    })
    store.toggleCompare(id)
    store.setCompareSettings({ id, scale: 1.5 })
    store.deleteCustomDisplay(id)
    expect(store.compareIds.value).toEqual([])
    expect(store.compareSettings.value).toEqual({})
  })
})

describe('hiding built-in displays', () => {
  it('removes a hidden display from the visible list and from compare', () => {
    const { store } = createEnvironment()
    store.toggleCompare(QHD27.id)
    store.setCompareSettings({ id: QHD27.id, distance: 30 })
    expect(store.hideBuiltIn(QHD27.id)).toBe(true)

    expect(store.allDisplays.value.map(({ id }) => id)).not.toContain(QHD27.id)
    expect(store.browseRows.value.map(({ display }) => display.id)).not.toContain(
      QHD27.id,
    )
    expect(store.compareIds.value).toEqual([])
    expect(store.compareSettings.value).toEqual({})
    expect(store.displaysById.value.has(QHD27.id)).toBe(true)
  })

  it('keeps a hidden familiar display familiar and in compare', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.hideBuiltIn(FHD.id)
    expect(store.familiar.value.map(({ id }) => id)).toEqual([FHD.id])
    expect(store.compareEntries.value.map(({ display }) => display.id)).toEqual([FHD.id])
    expect(store.familiarRows.value.map(({ display }) => display.id)).toEqual([FHD.id])
  })

  it('brings a hidden display back with unhideBuiltIn', () => {
    const { store } = createEnvironment()
    store.hideBuiltIn(QHD27.id)
    expect(store.unhideBuiltIn(QHD27.id)).toBe(true)
    expect(store.allDisplays.value.map(({ id }) => id)).toContain(QHD27.id)
  })

  it('refuses a custom display', () => {
    const { store } = createEnvironment()
    const id = store.addCustomDisplay({
      name: 'X',
      diagonal: 27,
      width: 2560,
      height: 1440,
    })
    expect(store.hideBuiltIn(id)).toBe(false)
    expect(store.hiddenBuiltInIds.value).toEqual([])
  })
})

describe('preferences and controls', () => {
  it('sets units, presets and view only to known values', () => {
    const { store } = createEnvironment()
    expect(store.setUnits('imperial')).toBe(true)
    expect(store.units.value).toBe('imperial')
    expect(store.setUnits('furlongs')).toBe(false)
    expect(store.setPresetId('macos')).toBe(true)
    expect(store.presetId.value).toBe('macos')
    expect(store.setPresetId('amiga')).toBe(false)
    expect(store.setView('compare')).toBe(true)
    expect(store.view.value).toBe('compare')
    expect(store.setView('grid')).toBe(false)
    expect(store.setVizMode('seen')).toBe(true)
    expect(store.vizMode.value).toBe('seen')
    expect(store.setVizMode('3d')).toBe(false)
    expect(store.setSizeMatchBy('diagonal')).toBe(true)
    expect(store.sizeMatchBy.value).toBe('diagonal')
    expect(store.setSizeMatchBy('area')).toBe(false)
  })

  it('sets the locale on the shared signal', () => {
    const { store } = createEnvironment()
    expect(store.setLocale('cs')).toBe(true)
    expect(locale.value).toBe('cs')
    expect(store.setLocale('de')).toBe(false)
    expect(locale.value).toBe('cs')
  })

  it('adds custom scales once, keeps them sorted, and removes them', () => {
    const { store } = createEnvironment()
    expect(store.addCustomScale(1.33)).toBe(true)
    expect(store.addCustomScale(3)).toBe(true)
    expect(store.addCustomScale(1.33)).toBe(true)
    expect(store.customScales.value).toEqual([1.33, 3])
    expect(store.addCustomScale(0.4)).toBe(false)
    expect(store.addCustomScale(5)).toBe(false)
    expect(store.removeCustomScale(1.33)).toBe(true)
    expect(store.removeCustomScale(1.33)).toBe(false)
    expect(store.customScales.value).toEqual([3])
  })

  it('applies a custom scale to every display in the scale list', () => {
    const { store } = createEnvironment()
    store.addCustomScale(1.33)
    expect(store.scaleOptionsFor(UHD27).map(({ scale }) => scale)).toContain(1.33)
  })

  it('merges a partial comfort window and refuses an unordered one', () => {
    const { store } = createEnvironment()
    expect(store.setComfort({ minPpi: 95 })).toBe(true)
    expect(store.comfort.value).toEqual({ ...DEFAULT_COMFORT, minPpi: 95 })
    expect(store.setComfort({ minPpi: 120 })).toBe(false)
    expect(store.comfort.value.minPpi).toBe(95)
  })

  it('merges filters and ignores invalid fields', () => {
    const { store } = createEnvironment()
    store.setFilters({ search: 'qhd' })
    store.setFilters({ tags: ['laptop', 'phone'], onlyComfortable: true })
    expect(store.filters.value).toEqual({
      ...DEFAULT_FILTERS,
      search: 'qhd',
      tags: ['laptop'],
      onlyComfortable: true,
    })
  })

  it('toggles the direction when the same key is chosen again', () => {
    const { store } = createEnvironment()
    store.setSort({ key: 'ppi' })
    expect(store.sort.value).toEqual({ key: 'ppi', direction: 'asc' })
    store.setSort({ key: 'diagonal' })
    expect(store.sort.value).toEqual({ key: 'diagonal', direction: 'desc' })
    expect(store.setSort({ key: 'colour' })).toBe(false)
    expect(store.sort.value).toEqual({ key: 'diagonal', direction: 'desc' })
  })

  it('completes onboarding only with at least one familiar display', () => {
    const { store } = createEnvironment()
    expect(store.completeOnboarding()).toBe(false)
    expect(store.isOnboarded.value).toBe(false)
    store.toggleFamiliar(FHD.id)
    expect(store.completeOnboarding()).toBe(true)
    expect(store.isOnboarded.value).toBe(true)
  })
})

describe('browseRows', () => {
  it('lists every visible display, sorted by PPI descending by default', async () => {
    const { store } = await hydratedStore()
    const ids = store.browseRows.value.map(({ display }) => display.id)
    expect(ids.sort()).toEqual([...SEED_IDS].sort())
    const ppis = store.browseRows.value.map(({ metrics }) => metrics.ppi)
    expect(ppis).toEqual([...ppis].sort((a, b) => b - a))
    expect(store.browseRows.value[0].display.id).toBe(MBP14.id)
  })

  it('finds a Czech name without diacritics', () => {
    const { store } = createEnvironment()
    store.setFilters({ search: 'ceske' })
    expect(store.browseRows.value.map(({ display }) => display.id)).toEqual([QHD27.id])
  })

  it('filters by tag, aspect, diagonal range and comfort', () => {
    const { store } = createEnvironment()
    store.setFilters({ tags: ['monitor'] })
    expect(store.browseRows.value.map(({ display }) => display.id).sort()).toEqual(
      [FHD.id, UHD27.id, QHD27.id].sort(),
    )
    store.setFilters({ tags: [], aspects: ['21:9'] })
    expect(store.browseRows.value.map(({ display }) => display.id)).toEqual([UW34.id])
    store.setFilters({ aspects: [], minDiagonal: 20, maxDiagonal: 28 })
    expect(store.browseRows.value.map(({ display }) => display.id).sort()).toEqual(
      [FHD.id, UHD27.id, QHD27.id].sort(),
    )
    store.setFilters({ minDiagonal: null, maxDiagonal: null, onlyComfortable: true })
    expect(store.browseRows.value.map(({ display }) => display.id).sort()).toEqual(
      [FHD.id, UHD27.id].sort(),
    )
  })

  it('flags the matrix rows by comfort, and keeps the rows outside the window', () => {
    const { store } = createEnvironment()
    const uhd = store.browseRows.value.find(({ display }) => display.id === UHD27.id)
    expect(uhd.matrix).toHaveLength(5)
    expect(
      uhd.matrix.filter(({ isComfortable }) => isComfortable).map(({ scale }) => scale),
    ).toEqual([1.75])
    expect(uhd.bestScale.scale).toBe(1.75)
  })

  it('uses the baseline distance for the PPD rule (F23)', async () => {
    const { store } = await hydratedStore()
    store.toggleFamiliar(FHD.id)
    store.setComfort({ mode: 'ppd' })
    const fhd = store.browseRows.value.find(({ display }) => display.id === FHD.id)
    expect(fhd.matrix[0].logicalPpd).toBeCloseTo(37.84, 1)
    expect(fhd.matrix[0].isComfortable).toBe(true)
  })

  it('shows no comfortable row in PPD mode without a baseline', () => {
    const { store } = createEnvironment()
    store.setComfort({ mode: 'ppd' })
    store.setFilters({ onlyComfortable: true })
    expect(store.browseRows.value).toEqual([])
  })

  it('marks familiar, baseline and compared rows, and gives relative metrics', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleFamiliar(UHD27.id)
    store.toggleCompare(QHD27.id)
    const rowFor = (id) => store.browseRows.value.find(({ display }) => display.id === id)
    expect(rowFor(FHD.id)).toMatchObject({
      isFamiliar: true,
      isBaseline: true,
      isCompared: true,
    })
    expect(rowFor(UHD27.id)).toMatchObject({ isFamiliar: true, isBaseline: false })
    expect(rowFor(QHD27.id)).toMatchObject({ isFamiliar: false, isCompared: true })
    expect(rowFor(MBP14.id)).toMatchObject({ isFamiliar: false, isCompared: false })
    expect(rowFor(FHD.id).relative.relativePixelSize).toBeCloseTo(0, 12)
    expect(rowFor(UHD27.id).relative.relativePixelSize).toBeCloseTo(
      91.788 / 163.18 - 1,
      2,
    )
  })

  it('keeps familiar rows in familiar order, whatever the filters', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(UHD27.id)
    store.toggleFamiliar(FHD.id)
    store.setFilters({ search: 'nothing matches this' })
    expect(store.browseRows.value).toEqual([])
    expect(store.familiarRows.value.map(({ display }) => display.id)).toEqual([
      UHD27.id,
      FHD.id,
    ])
  })

  it('sorts by name with the current locale, and toggles the direction', () => {
    const { store } = createEnvironment()
    const names = () => store.browseRows.value.map(({ display }) => display.name)
    store.setSort({ key: 'name' })
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
    expect(names()).toEqual([...names()].sort(collator.compare))
    store.setSort({ key: 'name' })
    expect(names()).toEqual([...names()].sort(collator.compare).reverse())
  })

  it('sorts by best scale width, widest first when descending', () => {
    const { store } = createEnvironment()
    store.setSort({ key: 'bestScale', direction: 'desc' })
    const widths = store.browseRows.value.map(({ bestScale }) => bestScale.logicalWidth)
    expect(widths).toEqual([...widths].sort((a, b) => b - a))
  })
})

describe('compareEntries and the baseline distance', () => {
  it('has no compare entries when nothing is familiar or compared', () => {
    const { store } = createEnvironment()
    expect(store.compareEntries.value).toEqual([])
  })

  it('updates a candidate when the baseline distance changes', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    store.toggleCompare(UHD27.id)
    store.setFamiliarSettings({ id: FHD.id, distance: 40 })
    const [, entry] = store.compareEntries.value
    expect(entry.distance).toBe(40)
    expect(entry.angular.ppd).toBeCloseTo(163.18 * ((40 * Math.PI) / 180), 0)
  })
})

describe('getViewState', () => {
  it('holds every field of the shared view, with only referenced custom displays', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    const used = store.addCustomDisplay({
      name: 'Used',
      diagonal: 27,
      width: 2560,
      height: 1440,
      isFamiliar: true,
    })
    store.addCustomDisplay({ name: 'Unused', diagonal: 30, width: 2560, height: 1600 })
    const state = store.getViewState()
    expect(Object.keys(state).sort()).toEqual(
      [
        'view',
        'familiar',
        'baselineId',
        'compareIds',
        'compareSettings',
        'hiddenFamiliarIds',
        'customDisplays',
        'units',
        'locale',
        'presetId',
        'customScales',
        'comfort',
        'filters',
        'sort',
        'vizMode',
        'sizeMatchBy',
      ].sort(),
    )
    expect(state.customDisplays.map(({ id }) => id)).toEqual([used])
  })
})

describe('export and import', () => {
  it('exports inputs only, and imports them into an empty store', () => {
    const source = createEnvironment().store
    const customId = source.addCustomDisplay({
      name: 'Office 27',
      diagonal: 27,
      width: 2560,
      height: 1440,
      tag: 'monitor',
      isFamiliar: true,
      distance: 30,
      scale: 1.25,
    })
    source.toggleFamiliar(FHD.id)
    source.setBaseline(customId)

    const text = source.exportJson()
    const parsed = JSON.parse(text)
    expect(parsed).toMatchObject({ app: 'pixely', version: 1, baselineId: customId })
    expect(parsed.customDisplays[0]).not.toHaveProperty('isCustom')

    const target = createEnvironment().store
    expect(target.importJson(text)).toEqual({ isOk: true })
    expect(target.customDisplays.value).toEqual([
      expect.objectContaining({ id: customId, name: 'Office 27', isCustom: true }),
    ])
    expect(target.familiar.value).toEqual(source.familiar.value)
    expect(target.baselineId.value).toBe(customId)
    expect(target.isOnboarded.value).toBe(true)
  })

  it('reports the error code and leaves the state unchanged', () => {
    const { store } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    expect(store.importJson('{nope')).toEqual({ isOk: false, error: 'invalidJson' })
    expect(store.importJson('{"app":"other","version":1}')).toEqual({
      isOk: false,
      error: 'invalidFormat',
    })
    expect(store.familiar.value.map(({ id }) => id)).toEqual([FHD.id])
  })

  it('merges by id: incoming replaces the same id, and the baseline stays valid', () => {
    const { store } = createEnvironment()
    const id = store.addCustomDisplay({
      name: 'Old name',
      diagonal: 27,
      width: 2560,
      height: 1440,
      isFamiliar: true,
    })
    store.toggleFamiliar(FHD.id)
    const incoming = JSON.stringify({
      app: 'pixely',
      version: 1,
      customDisplays: [
        { id, name: 'New name', diagonal: 32, width: 3840, height: 2160 },
        { id: 'c-extra', name: 'Extra', diagonal: 14, width: 1920, height: 1200 },
      ],
      familiar: [
        { id: 'c-extra', distance: 20, scale: 1.5 },
        { id: 'not-a-known-display', distance: 20, scale: 1 },
      ],
      baselineId: 'c-extra',
    })
    expect(store.importJson(incoming)).toEqual({ isOk: true })
    expect(store.displaysById.value.get(id).name).toBe('New name')
    expect(store.displaysById.value.has('c-extra')).toBe(true)
    expect(store.familiar.value.map(({ id: familiarId }) => familiarId)).toEqual([
      id,
      FHD.id,
      'c-extra',
    ])
    expect(store.baselineId.value).toBe('c-extra')
    expectBaselineInvariant(store)
  })

  it('does not import a custom display that reuses a built-in id', () => {
    const { store } = createEnvironment()
    const text = JSON.stringify({
      app: 'pixely',
      version: 1,
      customDisplays: [
        { id: FHD.id, name: 'Clash', diagonal: 24, width: 1920, height: 1080 },
      ],
    })
    expect(store.importJson(text)).toEqual({ isOk: false, error: 'invalidFormat' })
    expect(store.displaysById.value.get(FHD.id).name).toBe('24″ FHD')
  })
})

describe('hydrate: precedence of the stored state, the link and detection', () => {
  it('loads customs, hidden built-ins, familiar, baseline, onboarding and preferences', async () => {
    const custom = {
      id: 'c-saved1',
      name: 'Saved',
      diagonal: 27,
      width: 2560,
      height: 1440,
      isCustom: true,
    }
    const { store } = await hydratedStore({
      stored: {
        customDisplays: [custom],
        hiddenBuiltInIds: [UW34.id],
        familiar: [{ id: custom.id, distance: 25, scale: 1.25 }],
        baselineId: custom.id,
        isOnboarded: true,
        preferences: { units: 'imperial', customScales: [1.33], vizMode: 'seen' },
      },
    })
    expect(store.isHydrated.value).toBe(true)
    expect(store.customDisplays.value).toEqual([custom])
    expect(store.hiddenBuiltInIds.value).toEqual([UW34.id])
    expect(store.familiar.value).toEqual([{ id: custom.id, distance: 25, scale: 1.25 }])
    expect(store.baselineId.value).toBe(custom.id)
    expect(store.isOnboarded.value).toBe(true)
    expect(store.units.value).toBe('imperial')
    expect(store.customScales.value).toEqual([1.33])
    expect(store.vizMode.value).toBe('seen')
    expect(store.isSharedView.value).toBe(false)
  })

  it('reads the stored locale when there is no link', async () => {
    const { store } = await hydratedStore({
      stored: { preferences: { locale: 'cs' } },
      detectLang: () => 'en',
    })
    expect(store.locale.value).toBe('cs')
  })

  it('prefers the locale in the link over the stored one', async () => {
    const { store } = await hydratedStore({
      hash: encodeState({ locale: 'en' }),
      stored: { preferences: { locale: 'cs' } },
      detectLang: () => 'cs',
    })
    expect(store.locale.value).toBe('en')
  })

  it('detects the locale when neither the link nor the storage has one', async () => {
    const detectLang = vi.fn(() => 'cs')
    const { store } = await hydratedStore({ detectLang })
    expect(detectLang).toHaveBeenCalled()
    expect(store.locale.value).toBe('cs')
  })

  it('uses the stored preset, else the detected one, and lets the link override both', async () => {
    const stored = await hydratedStore({
      stored: { preferences: { presetId: 'linux' } },
      detectPreset: () => 'macos',
    })
    expect(stored.store.presetId.value).toBe('linux')

    const detected = await hydratedStore({ detectPreset: () => 'macos' })
    expect(detected.store.presetId.value).toBe('macos')

    const linked = await hydratedStore({
      hash: encodeState({ presetId: 'windows', units: 'imperial' }),
      stored: { preferences: { presetId: 'linux', units: 'metric' } },
      detectPreset: () => 'macos',
    })
    expect(linked.store.presetId.value).toBe('windows')
    expect(linked.store.units.value).toBe('imperial')
  })

  it('applies the view state of a link over the defaults', async () => {
    const { store } = await hydratedStore({
      hash: encodeState({
        view: 'compare',
        comfort: { mode: 'ppd' },
        filters: { search: 'qhd', onlyComfortable: true },
        sort: { key: 'name', direction: 'asc' },
        sizeMatchBy: 'diagonal',
      }),
    })
    expect(store.view.value).toBe('compare')
    expect(store.comfort.value).toEqual({ ...DEFAULT_COMFORT, mode: 'ppd' })
    expect(store.filters.value).toMatchObject({ search: 'qhd', onlyComfortable: true })
    expect(store.sort.value).toEqual({ key: 'name', direction: 'asc' })
    expect(store.sizeMatchBy.value).toBe('diagonal')
  })

  it('ignores invalid stored preferences and falls back to the defaults', async () => {
    const { store } = await hydratedStore({
      stored: { preferences: { units: 'furlongs', comfort: { minPpi: 200, maxPpi: 1 } } },
    })
    expect(store.units.value).toBe('metric')
    expect(store.comfort.value).toEqual(DEFAULT_COMFORT)
  })

  it('loads only once, however often it is called', async () => {
    const env = createEnvironment()
    await Promise.all([env.store.hydrate(), env.store.hydrate()])
    await env.store.hydrate()
    expect(env.storage.loadPersisted).toHaveBeenCalledTimes(1)
  })

  it('repairs stored references to displays that no longer exist', async () => {
    const { store } = await hydratedStore({
      stored: {
        familiar: [
          { id: 'c-gone', distance: 20, scale: 1 },
          { id: FHD.id, distance: 20, scale: 1 },
        ],
        baselineId: 'c-gone',
        hiddenBuiltInIds: ['nope'],
      },
    })
    expect(store.familiar.value.map(({ id }) => id)).toEqual([FHD.id])
    expect(store.baselineId.value).toBe(FHD.id)
    expect(store.hiddenBuiltInIds.value).toEqual([])
  })
})

describe('shared view', () => {
  const STORED_FAMILIAR = { id: QHD27.id, distance: 25, scale: 1.25 }
  const SHARED_HASH = () =>
    encodeState({
      view: 'compare',
      familiar: [{ id: UHD27.id, distance: 23.62, scale: 1.5 }],
      baselineId: UHD27.id,
      compareIds: [FHD.id],
      customDisplays: [
        { id: 'c-shared', name: 'Shared 34', diagonal: 34, width: 3440, height: 1440 },
      ],
    })
  const stored = {
    familiar: [STORED_FAMILIAR],
    baselineId: QHD27.id,
    isOnboarded: true,
  }

  it('applies a different familiar set from a link and marks the view as shared', async () => {
    const { store } = await hydratedStore({ hash: SHARED_HASH(), stored })
    expect(store.isSharedView.value).toBe(true)
    expect(store.familiar.value).toEqual([{ id: UHD27.id, distance: 23.62, scale: 1.5 }])
    expect(store.baselineId.value).toBe(UHD27.id)
    expect(store.isOnboarded.value).toBe(true)
    expect(store.compareIds.value).toEqual([FHD.id])
    expect(store.customDisplays.value.map(({ id }) => id)).toEqual(['c-shared'])
    expect(store.customDisplays.value[0].isCustom).toBe(true)
  })

  it('does not write familiar, baseline or custom displays while shared', async () => {
    const { store, storage } = await hydratedStore({ hash: SHARED_HASH(), stored })
    store.toggleFamiliar(FHD.id)
    store.addCustomDisplay({ name: 'Mine', diagonal: 27, width: 2560, height: 1440 })
    store.setUnits('imperial')
    await store.flush()
    const partials = savedPartials(storage)
    expect(partials.length).toBeGreaterThan(0)
    partials.forEach((partial) => {
      expect(partial).not.toHaveProperty('familiar')
      expect(partial).not.toHaveProperty('baselineId')
      expect(partial).not.toHaveProperty('customDisplays')
      expect(partial).not.toHaveProperty('isOnboarded')
    })
    expect(lastSaved(storage).preferences.units).toBe('imperial')
  })

  it('keeps the link state when the page is reloaded from its own URL', async () => {
    const first = await hydratedStore({ hash: SHARED_HASH(), stored })
    first.store.setUnits('imperial')
    await first.store.flush()
    const reloaded = await hydratedStore({ hash: first.location.hash, stored })
    expect(reloaded.store.isSharedView.value).toBe(true)
    expect(reloaded.store.baselineId.value).toBe(UHD27.id)
  })

  it('writes the link state when kept, so the recipient keeps the shared set', async () => {
    const { store, storage } = await hydratedStore({ hash: SHARED_HASH(), stored })
    expect(store.keepSharedView()).toBe(true)
    expect(store.isSharedView.value).toBe(false)
    await store.flush()
    const saved = lastSaved(storage)
    expect(saved.familiar).toEqual([{ id: UHD27.id, distance: 23.62, scale: 1.5 }])
    expect(saved.baselineId).toBe(UHD27.id)
    expect(saved.isOnboarded).toBe(true)
    expect(saved.customDisplays.map(({ id }) => id)).toEqual(['c-shared'])
  })

  it('reloads the stored state when discarded, and rewrites the link', async () => {
    const { store, location } = await hydratedStore({ hash: SHARED_HASH(), stored })
    store.toggleCompare(MBP14.id)
    expect(await store.discardSharedView()).toBe(true)
    expect(store.isSharedView.value).toBe(false)
    expect(store.familiar.value).toEqual([STORED_FAMILIAR])
    expect(store.baselineId.value).toBe(QHD27.id)
    expect(store.customDisplays.value).toEqual([])
    expect(store.compareIds.value).toEqual([])
    await store.flush()
    expect(decodeState(location.hash).familiar).toEqual([STORED_FAMILIAR])
  })

  it('returns false for keep and discard when nothing is shared', async () => {
    const { store } = await hydratedStore({ stored })
    expect(store.keepSharedView()).toBe(false)
    expect(await store.discardSharedView()).toBe(false)
  })

  it("treats a link with the same familiar set as the user's own, and keeps the stored distance", async () => {
    const { store } = await hydratedStore({
      hash: encodeState({
        familiar: [{ id: QHD27.id, distance: 25, scale: 1.25 }],
        baselineId: QHD27.id,
      }),
      stored: { ...stored, familiar: [{ ...STORED_FAMILIAR, distance: 25.0000001 }] },
    })
    expect(store.isSharedView.value).toBe(false)
    expect(store.familiar.value[0].distance).toBe(25.0000001)
  })

  it('does not let an embedded display replace a built-in one', async () => {
    const hash = encodeState({
      familiar: [{ id: UHD27.id, distance: 23.62, scale: 1.5 }],
      baselineId: UHD27.id,
      customDisplays: [
        { id: FHD.id, name: 'Clash', diagonal: 24, width: 1920, height: 1080 },
      ],
    })
    const { store } = await hydratedStore({ hash, stored })
    expect(store.customDisplays.value).toEqual([])
    expect(store.displaysById.value.get(FHD.id).name).toBe('24″ FHD')
  })
})

describe('persistence', () => {
  it('writes nothing before hydration', async () => {
    const { store, storage } = createEnvironment()
    store.toggleFamiliar(FHD.id)
    await store.flush()
    expect(storage.savePersisted).not.toHaveBeenCalled()
  })

  it('writes the whole persisted state once after hydration', async () => {
    const { storage, store } = await hydratedStore()
    await store.flush()
    expect(lastSaved(storage)).toEqual({
      customDisplays: [],
      hiddenBuiltInIds: [],
      familiar: [],
      baselineId: null,
      isOnboarded: false,
      preferences: {
        units: 'metric',
        locale: 'en',
        presetId: 'windows',
        customScales: [],
        comfort: DEFAULT_COMFORT,
        sizeMatchBy: 'height',
        vizMode: 'physical',
      },
    })
  })

  it('saves familiar, custom and onboarding changes', async () => {
    const { storage, store } = await hydratedStore()
    store.toggleFamiliar(FHD.id)
    const id = store.addCustomDisplay({
      name: 'Mine',
      diagonal: 27,
      width: 2560,
      height: 1440,
    })
    store.completeOnboarding()
    await store.flush()
    const saved = lastSaved(storage)
    expect(saved.familiar).toEqual([
      { id: FHD.id, distance: DEFAULT_DISTANCE.monitor, scale: 1 },
    ])
    expect(saved.customDisplays.map((display) => display.id)).toEqual([id])
    expect(saved.isOnboarded).toBe(true)
  })

  it('saves preferences but not the view, filters or the compare set', async () => {
    const { storage, store } = await hydratedStore()
    store.setUnits('imperial')
    store.setFilters({ search: 'x' })
    store.setView('compare')
    await store.flush()
    expect(lastSaved(storage).preferences.units).toBe('imperial')
    expect(lastSaved(storage)).not.toHaveProperty('filters')
    expect(lastSaved(storage)).not.toHaveProperty('view')
  })

  it('combines changes made within one tick into one write', async () => {
    const { storage, store } = await hydratedStore()
    await store.flush()
    const before = storage.savePersisted.mock.calls.length
    store.setUnits('imperial')
    store.setUnits('metric')
    store.setVizMode('seen')
    await store.flush()
    expect(storage.savePersisted.mock.calls.length).toBe(before + 1)
    expect(lastSaved(storage).preferences).toMatchObject({
      units: 'metric',
      vizMode: 'seen',
    })
  })

  it('stops writing once disposed', async () => {
    const { storage, store } = await hydratedStore()
    await store.flush()
    const before = storage.savePersisted.mock.calls.length
    store.dispose()
    store.toggleFamiliar(FHD.id)
    await store.flush()
    expect(storage.savePersisted.mock.calls.length).toBe(before)
  })
})

describe('URL sync', () => {
  it('writes the view state to the hash, and it decodes back', async () => {
    const { store, location, history } = await hydratedStore()
    store.toggleFamiliar(FHD.id)
    store.toggleCompare(QHD27.id)
    store.setFilters({ search: 'qhd' })
    await store.flush()
    expect(history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      expect.stringMatching(/^#s=/),
    )
    const decoded = decodeState(location.hash)
    expect(decoded.familiar).toEqual([{ id: FHD.id, distance: 23.62, scale: 1 }])
    expect(decoded.baselineId).toBe(FHD.id)
    expect(decoded.compareIds).toEqual([QHD27.id])
    expect(decoded.filters.search).toBe('qhd')
    expect(decoded.locale).toBe('en')
  })

  it('embeds only the custom displays that the state refers to', async () => {
    const { store, location } = await hydratedStore()
    const used = store.addCustomDisplay({
      name: 'Used',
      diagonal: 27,
      width: 2560,
      height: 1440,
      isFamiliar: true,
    })
    store.addCustomDisplay({ name: 'Unused', diagonal: 30, width: 2560, height: 1600 })
    await store.flush()
    expect(decodeState(location.hash).customDisplays.map(({ id }) => id)).toEqual([used])
  })

  it('writes the locale and units that were set', async () => {
    const { store, location } = await hydratedStore()
    store.setLocale('cs')
    store.setUnits('imperial')
    await store.flush()
    expect(decodeState(location.hash)).toMatchObject({ locale: 'cs', units: 'imperial' })
  })

  it('does not replace the hash when it already matches', async () => {
    const { store, history } = await hydratedStore()
    await store.flush()
    const before = history.replaceState.mock.calls.length
    store.setFilters({ search: '' })
    await store.flush()
    expect(history.replaceState.mock.calls.length).toBe(before)
  })
})

describe('flush', () => {
  it('resolves when every pending write has been made', async () => {
    const { storage, store } = await hydratedStore()
    store.setUnits('imperial')
    await store.flush()
    expect(lastSaved(storage).preferences.units).toBe('imperial')
  })
})
