import { createStore, get, set } from 'idb-keyval'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PERSISTED,
  clearPersisted,
  loadPersisted,
  savePersisted,
} from './storage.js'

/** Raw handle on the same IndexedDB database the module writes to. */
const raw = createStore('pixely', 'state')

const CUSTOM = {
  id: 'c-k3j9x2',
  name: 'Pracovní 34″',
  diagonal: 34,
  width: 3440,
  height: 1440,
  tag: 'ultrawide',
  isCustom: true,
}

const FULL = {
  customDisplays: [CUSTOM],
  hiddenBuiltInIds: ['24-fhd-1920x1080'],
  familiar: [{ id: '27-4k-3840x2160', distance: 23.62, scale: 1.5 }],
  baselineId: '27-4k-3840x2160',
  preferences: { units: 'imperial', locale: 'cs', presetId: 'macos' },
  isOnboarded: true,
}

/** A fresh module instance whose IndexedDB access fails in the given way. */
const loadBrokenModule = async (stubIndexedDb) => {
  vi.resetModules()
  vi.stubGlobal('indexedDB', stubIndexedDb)
  return import('./storage.js')
}

const failingAsync = () => {
  const request = { error: new DOMException('Blocked by another tab', 'UnknownError') }
  queueMicrotask(() => request.onerror?.())
  return request
}

const failingSync = () => {
  throw new DOMException('Access is denied for this document', 'SecurityError')
}

beforeEach(async () => {
  await clearPersisted()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DEFAULT_PERSISTED', () => {
  it('holds the documented defaults', () => {
    expect(DEFAULT_PERSISTED).toStrictEqual({
      customDisplays: [],
      hiddenBuiltInIds: [],
      familiar: [],
      baselineId: null,
      preferences: {},
      isOnboarded: false,
    })
  })

  it('is deeply frozen', () => {
    expect(Object.isFrozen(DEFAULT_PERSISTED)).toBe(true)
    expect(Object.isFrozen(DEFAULT_PERSISTED.familiar)).toBe(true)
    expect(Object.isFrozen(DEFAULT_PERSISTED.preferences)).toBe(true)
  })
})

describe('loadPersisted', () => {
  it('returns the defaults when nothing has been saved', async () => {
    expect(await loadPersisted()).toStrictEqual(DEFAULT_PERSISTED)
  })

  it('returns fresh copies, so callers cannot change the defaults', async () => {
    const loaded = await loadPersisted()
    loaded.familiar.push({ id: 'x', distance: 1, scale: 1 })
    loaded.preferences.units = 'imperial'
    expect(DEFAULT_PERSISTED.familiar).toStrictEqual([])
    expect(DEFAULT_PERSISTED.preferences).toStrictEqual({})
    expect(await loadPersisted()).toStrictEqual(DEFAULT_PERSISTED)
  })

  it('returns every saved field, unchanged', async () => {
    await savePersisted(FULL)
    expect(await loadPersisted()).toStrictEqual(FULL)
  })

  it('reads the saved values from the pixely/state store, one key per field', async () => {
    await savePersisted(FULL)
    expect(await get('familiar', raw)).toStrictEqual(FULL.familiar)
    expect(await get('isOnboarded', raw)).toBe(true)
  })
})

describe('savePersisted', () => {
  it('merges partial saves into what is already stored', async () => {
    await savePersisted(FULL)
    await savePersisted({ isOnboarded: false, baselineId: null })
    expect(await loadPersisted()).toStrictEqual({
      ...FULL,
      isOnboarded: false,
      baselineId: null,
    })
  })

  it('writes only the keys it is given', async () => {
    await savePersisted({ isOnboarded: true })
    expect(await get('isOnboarded', raw)).toBe(true)
    expect(await get('familiar', raw)).toBeUndefined()
    expect(await get('customDisplays', raw)).toBeUndefined()
  })

  it('ignores keys that are not persisted fields', async () => {
    await savePersisted({ isOnboarded: true, secret: 'nope' })
    expect(await get('secret', raw)).toBeUndefined()
  })

  it('leaves a field alone when its value is undefined', async () => {
    await savePersisted({ baselineId: '27-4k-3840x2160' })
    await savePersisted({ baselineId: undefined, isOnboarded: true })
    expect(await loadPersisted()).toMatchObject({
      baselineId: '27-4k-3840x2160',
      isOnboarded: true,
    })
  })

  it('skips invalid values rather than storing data that load would reject', async () => {
    await savePersisted({ familiar: 'nope', isOnboarded: true })
    expect(await get('familiar', raw)).toBeUndefined()
    expect(await loadPersisted()).toMatchObject({ familiar: [], isOnboarded: true })
  })

  it('stores custom displays in their canonical shape', async () => {
    await savePersisted({
      customDisplays: [{ ...CUSTOM, tag: 'tablet', extra: 'drop me' }],
    })
    const [stored] = (await loadPersisted()).customDisplays
    expect(stored).toStrictEqual({
      id: 'c-k3j9x2',
      name: 'Pracovní 34″',
      diagonal: 34,
      width: 3440,
      height: 1440,
      isCustom: true,
    })
  })

  it('resolves without writing for an empty or non-object argument', async () => {
    await expect(savePersisted({})).resolves.toBeUndefined()
    await expect(savePersisted(undefined)).resolves.toBeUndefined()
    await expect(savePersisted(null)).resolves.toBeUndefined()
    await expect(savePersisted('isOnboarded')).resolves.toBeUndefined()
    expect(await loadPersisted()).toStrictEqual(DEFAULT_PERSISTED)
  })
})

describe('corrupt stored data falls back to defaults', () => {
  it.each([
    ['customDisplays', 'oops', []],
    ['customDisplays', { id: 'c-1' }, []],
    ['customDisplays', null, []],
    ['hiddenBuiltInIds', {}, []],
    ['familiar', 42, []],
    ['familiar', null, []],
    ['baselineId', 7, null],
    ['baselineId', '', null],
    ['baselineId', ['27-4k-3840x2160'], null],
    ['preferences', [], {}],
    ['preferences', 'units', {}],
    ['preferences', null, {}],
    ['isOnboarded', 'yes', false],
    ['isOnboarded', 1, false],
  ])('%s = %j becomes %j', async (key, value, expected) => {
    await set(key, value, raw)
    expect((await loadPersisted())[key]).toStrictEqual(expected)
  })

  it('drops invalid familiar entries and keeps the valid ones', async () => {
    await set(
      'familiar',
      [
        { id: 'a', distance: 20, scale: 1.5 },
        { id: 5, distance: 20, scale: 1 },
        null,
        { id: 'b', distance: -1, scale: 1 },
        { id: 'c', distance: 20, scale: 'x' },
        { id: 'd', distance: Infinity, scale: 1 },
        { id: 'e', distance: 20, scale: NaN },
        { id: 'a', distance: 30, scale: 2 },
      ],
      raw,
    )
    expect((await loadPersisted()).familiar).toStrictEqual([
      { id: 'a', distance: 20, scale: 1.5 },
    ])
  })

  it('drops invalid custom displays and keeps the valid ones', async () => {
    await set(
      'customDisplays',
      [
        CUSTOM,
        { id: 'c-2', name: '', diagonal: 27, width: 2560, height: 1440 },
        { id: 'c-3', name: 'x'.repeat(121), diagonal: 27, width: 2560, height: 1440 },
        { id: 'c-4', name: 'Zero', diagonal: 0, width: 2560, height: 1440 },
        { name: 'No id', diagonal: 27, width: 2560, height: 1440 },
        'junk',
      ],
      raw,
    )
    expect((await loadPersisted()).customDisplays).toStrictEqual([CUSTOM])
  })

  it('keeps a custom display whose tag is unknown, without the tag', async () => {
    await set(
      'customDisplays',
      [
        {
          id: 'c-2',
          name: 'Tablet',
          diagonal: 10,
          width: 2000,
          height: 1500,
          tag: 'tablet',
        },
      ],
      raw,
    )
    expect((await loadPersisted()).customDisplays).toStrictEqual([
      {
        id: 'c-2',
        name: 'Tablet',
        diagonal: 10,
        width: 2000,
        height: 1500,
        isCustom: true,
      },
    ])
  })

  it('removes duplicate ids from id lists', async () => {
    await set('hiddenBuiltInIds', ['a', 1, '', 'a', 'b'], raw)
    expect((await loadPersisted()).hiddenBuiltInIds).toStrictEqual(['a', 'b'])
  })

  it('keeps any plain object as preferences', async () => {
    await set('preferences', { units: 'metric', custom: { deep: true } }, raw)
    expect((await loadPersisted()).preferences).toStrictEqual({
      units: 'metric',
      custom: { deep: true },
    })
  })
})

describe('clearPersisted', () => {
  it('removes everything that was saved', async () => {
    await savePersisted(FULL)
    await clearPersisted()
    expect(await loadPersisted()).toStrictEqual(DEFAULT_PERSISTED)
    expect(await get('familiar', raw)).toBeUndefined()
  })

  it('resolves when there is nothing to clear', async () => {
    await expect(clearPersisted()).resolves.toBeUndefined()
  })
})

describe('when IndexedDB is unavailable or fails', () => {
  it.each([
    ['indexedDB is not defined', undefined],
    ['open fails asynchronously', { open: failingAsync }],
    ['open throws synchronously', { open: failingSync }],
  ])('loads defaults, never throws, and warns once: %s', async (_, stub) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const storage = await loadBrokenModule(stub)

    expect(await storage.loadPersisted()).toStrictEqual(DEFAULT_PERSISTED)
    await expect(storage.savePersisted(FULL)).resolves.toBeUndefined()
    await expect(storage.clearPersisted()).resolves.toBeUndefined()
    await expect(storage.savePersisted({ isOnboarded: true })).resolves.toBeUndefined()
    expect(await storage.loadPersisted()).toStrictEqual(DEFAULT_PERSISTED)

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('keeps the rest of the app working when the write is refused', async () => {
    const storage = await loadBrokenModule({ open: failingAsync })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await storage.savePersisted({ familiar: FULL.familiar })
    expect(result).toBeUndefined()
    expect(await storage.loadPersisted()).toStrictEqual(DEFAULT_PERSISTED)
  })
})
