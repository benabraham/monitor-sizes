import { describe, expect, it } from 'vitest'
import { getDisplayMetrics } from '../lib/calc/index.js'
import { DEFAULT_DISTANCE, defaultDistanceFor } from '../lib/units.js'
import {
  DEFAULT_COMFORT,
  DEFAULT_FILTERS,
  buildBrowseRow,
  buildCompareEntry,
  buildExportPayload,
  buildMatrix,
  buildRelative,
  createCustomId,
  filterBrowseRows,
  hasComfortableScale,
  isSameFamiliarSet,
  matchesAspects,
  matchesDiagonal,
  matchesSearch,
  matchesTags,
  mergeById,
  nextSort,
  normalizeSearchText,
  parseComfortPatch,
  parseCustomScale,
  parseDisplayInput,
  parseFiltersPatch,
  parseImportText,
  parseSettingsPatch,
  pickBaselineId,
  pickDefaultScale,
  readCustomScales,
  readPreferences,
  reconcileState,
  resolveCompareDistance,
  resolveCompareScale,
  sortBrowseRows,
} from './selectors.js'

/** Fixture displays. Expected PPI: FHD 91.8, 4K27 163.2, QHD27 108.8, MBP14 253.9. */
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
const UHD32 = {
  id: 'c-uhd32',
  name: '32″ 4K',
  diagonal: 32,
  width: 3840,
  height: 2160,
  isCustom: true,
}

const SCALING = { presetId: 'windows', customScales: [], comfort: DEFAULT_COMFORT }

const baselineOf = (
  display,
  { distance = DEFAULT_DISTANCE.monitor, scale = 1 } = {},
) => ({
  display,
  metrics: getDisplayMetrics(display),
  distance,
  scale,
})

const rowOf = (display, { baseline = null, ...flags } = {}) =>
  buildBrowseRow({
    display,
    metrics: getDisplayMetrics(display),
    baseline,
    scaling: SCALING,
    isFamiliar: false,
    isBaseline: false,
    isCompared: false,
    ...flags,
  })

const ALL = [FHD, UHD27, QHD27, MBP14, UW34, UHD32]

describe('normalizeSearchText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeSearchText('České')).toBe('ceske')
    expect(normalizeSearchText('Dům Řeka Ů')).toBe('dum reka u')
  })

  it('drops inch quotes so 27″ and 27 match alike', () => {
    expect(normalizeSearchText('24″ FHD')).toBe('24 fhd')
    expect(normalizeSearchText('27"')).toBe('27')
  })

  it('returns an empty string for non-text input', () => {
    expect(normalizeSearchText(undefined)).toBe('')
    expect(normalizeSearchText(42)).toBe('')
  })
})

describe('parseDisplayInput', () => {
  it('trims the name and keeps valid numbers and tag', () => {
    expect(
      parseDisplayInput({
        name: '  Test  ',
        diagonal: 27,
        width: 2560,
        height: 1440,
        tag: 'monitor',
      }),
    ).toEqual({ name: 'Test', diagonal: 27, width: 2560, height: 1440, tag: 'monitor' })
  })

  it('rejects an empty, blank or overlong name', () => {
    const base = { diagonal: 27, width: 2560, height: 1440 }
    expect(parseDisplayInput({ ...base, name: '' })).toBeNull()
    expect(parseDisplayInput({ ...base, name: '   ' })).toBeNull()
    expect(parseDisplayInput({ ...base, name: 'x'.repeat(121) })).toBeNull()
    expect(parseDisplayInput({ ...base, name: undefined })).toBeNull()
  })

  it('rejects zero, negative, NaN and string sizes', () => {
    const base = { name: 'X', diagonal: 27, width: 2560, height: 1440 }
    expect(parseDisplayInput({ ...base, diagonal: 0 })).toBeNull()
    expect(parseDisplayInput({ ...base, width: -1 })).toBeNull()
    expect(parseDisplayInput({ ...base, height: Number.NaN })).toBeNull()
    expect(parseDisplayInput({ ...base, width: '2560' })).toBeNull()
  })

  it('drops an unknown tag but keeps the display', () => {
    const parsed = parseDisplayInput({
      name: 'X',
      diagonal: 27,
      width: 2560,
      height: 1440,
      tag: 'tablet',
    })
    expect(parsed).not.toBeNull()
    expect('tag' in parsed).toBe(false)
  })
})

describe('parseSettingsPatch and parseCustomScale', () => {
  it('keeps only the valid positive fields of a settings patch', () => {
    expect(parseSettingsPatch({ distance: 30, scale: -1 })).toEqual({ distance: 30 })
    expect(parseSettingsPatch({})).toEqual({})
  })

  it('accepts factors in 0.5 to 4 rounded to 4 decimals, rejects the rest', () => {
    expect(parseCustomScale(1.333333)).toBe(1.3333)
    expect(parseCustomScale(0.5)).toBe(0.5)
    expect(parseCustomScale(4)).toBe(4)
    expect(parseCustomScale(0.4)).toBeNull()
    expect(parseCustomScale(133)).toBeNull()
    expect(parseCustomScale('1.5')).toBeNull()
  })

  it('reads a custom scale list: unique, sorted, valid only', () => {
    expect(readCustomScales([3, 1.33, 1.33, 'x', 9])).toEqual([1.33, 3])
    expect(readCustomScales('nope')).toEqual([])
  })
})

describe('parseComfortPatch', () => {
  it('merges valid fields over the current window', () => {
    expect(
      parseComfortPatch({ current: DEFAULT_COMFORT, patch: { minPpi: 95 } }),
    ).toEqual({
      ...DEFAULT_COMFORT,
      minPpi: 95,
    })
  })

  it('ignores an unknown mode and non-positive numbers', () => {
    const next = parseComfortPatch({
      current: DEFAULT_COMFORT,
      patch: { mode: 'dpi', maxPpi: -5, minWidth: 0 },
    })
    expect(next).toEqual(DEFAULT_COMFORT)
  })

  it('rejects a window whose minimum is above its maximum', () => {
    expect(
      parseComfortPatch({ current: DEFAULT_COMFORT, patch: { minPpi: 120 } }),
    ).toBeNull()
    expect(
      parseComfortPatch({ current: DEFAULT_COMFORT, patch: { minPpd: 50 } }),
    ).toBeNull()
  })

  it('returns null for a patch that is not an object', () => {
    expect(parseComfortPatch({ current: DEFAULT_COMFORT, patch: 'ppi' })).toBeNull()
  })
})

describe('parseFiltersPatch', () => {
  it('merges text, drops invalid tags and keeps unique values', () => {
    const next = parseFiltersPatch({
      current: DEFAULT_FILTERS,
      patch: { search: 'qhd', tags: ['laptop', 'tablet', 'laptop'] },
    })
    expect(next.search).toBe('qhd')
    expect(next.tags).toEqual(['laptop'])
    expect(next.onlyComfortable).toBe(false)
  })

  it('accepts null bounds and keeps the current bound when the value is invalid', () => {
    const current = { ...DEFAULT_FILTERS, minDiagonal: 20 }
    expect(
      parseFiltersPatch({ current, patch: { minDiagonal: null, maxDiagonal: -3 } }),
    ).toMatchObject({ minDiagonal: null, maxDiagonal: null })
    expect(parseFiltersPatch({ current, patch: { minDiagonal: 'x' } }).minDiagonal).toBe(
      20,
    )
  })

  it('caps the search text at 200 characters', () => {
    const next = parseFiltersPatch({
      current: DEFAULT_FILTERS,
      patch: { search: 'a'.repeat(300) },
    })
    expect(next.search).toHaveLength(200)
  })

  it('returns null for a patch that is not an object', () => {
    expect(parseFiltersPatch({ current: DEFAULT_FILTERS, patch: null })).toBeNull()
  })
})

describe('nextSort', () => {
  const current = { key: 'ppi', direction: 'desc' }

  it('toggles the direction when the same key comes without one', () => {
    expect(nextSort({ current, key: 'ppi' })).toEqual({ key: 'ppi', direction: 'asc' })
  })

  it('starts a new key ascending for name and descending for metrics', () => {
    expect(nextSort({ current, key: 'name' })).toEqual({ key: 'name', direction: 'asc' })
    expect(nextSort({ current, key: 'area' })).toEqual({ key: 'area', direction: 'desc' })
  })

  it('takes an explicit direction as given', () => {
    expect(nextSort({ current, key: 'ppi', direction: 'asc' })).toEqual({
      key: 'ppi',
      direction: 'asc',
    })
  })

  it('returns null for an unknown key', () => {
    expect(nextSort({ current, key: 'colour' })).toBeNull()
  })
})

describe('readPreferences', () => {
  it('gives defaults for missing or garbage input', () => {
    expect(readPreferences(undefined)).toEqual({
      units: 'metric',
      locale: undefined,
      presetId: undefined,
      customScales: [],
      comfort: DEFAULT_COMFORT,
      sizeMatchBy: 'height',
      vizMode: 'physical',
    })
  })

  it('keeps valid saved values and drops invalid ones', () => {
    const prefs = readPreferences({
      units: 'imperial',
      locale: 'fr',
      presetId: 'linux',
      sizeMatchBy: 'area',
      vizMode: 'seen',
      comfort: { mode: 'ppd' },
    })
    expect(prefs).toMatchObject({
      units: 'imperial',
      locale: undefined,
      presetId: 'linux',
      sizeMatchBy: 'height',
      vizMode: 'seen',
      comfort: { ...DEFAULT_COMFORT, mode: 'ppd' },
    })
  })
})

describe('matchesSearch', () => {
  it('matches everything for an empty query', () => {
    expect(matchesSearch({ display: FHD, query: '' })).toBe(true)
    expect(matchesSearch({ display: FHD, query: '   ' })).toBe(true)
  })

  it('ignores case and diacritics: "ceske" finds "České"', () => {
    expect(matchesSearch({ display: QHD27, query: 'ceske' })).toBe(true)
    expect(matchesSearch({ display: QHD27, query: 'ČESKÉ' })).toBe(true)
    expect(matchesSearch({ display: FHD, query: 'ceske' })).toBe(false)
  })

  it('matches resolution text in several spellings', () => {
    expect(matchesSearch({ display: UHD27, query: '3840' })).toBe(true)
    expect(matchesSearch({ display: UHD27, query: '3840 × 2160' })).toBe(true)
    expect(matchesSearch({ display: UHD27, query: '3840x2160' })).toBe(true)
    expect(matchesSearch({ display: FHD, query: '3840' })).toBe(false)
  })

  it('matches the diagonal, with or without the inch sign', () => {
    expect(matchesSearch({ display: QHD27, query: '27' })).toBe(true)
    expect(matchesSearch({ display: QHD27, query: '27″' })).toBe(true)
    expect(matchesSearch({ display: FHD, query: '27' })).toBe(false)
  })

  it('requires every word of the query to match', () => {
    expect(matchesSearch({ display: QHD27, query: 'ceske 27' })).toBe(true)
    expect(matchesSearch({ display: QHD27, query: 'ceske 24' })).toBe(false)
  })
})

describe('matchesTags, matchesAspects, matchesDiagonal', () => {
  it('treats an untagged display as a monitor', () => {
    expect(matchesTags({ display: QHD27, tags: ['monitor'] })).toBe(true)
    expect(matchesTags({ display: QHD27, tags: ['laptop'] })).toBe(false)
    expect(matchesTags({ display: MBP14, tags: ['laptop'] })).toBe(true)
    expect(matchesTags({ display: MBP14, tags: [] })).toBe(true)
  })

  it('matches the aspect label, including unmapped ratios', () => {
    expect(matchesAspects({ metrics: getDisplayMetrics(FHD), aspects: ['16:9'] })).toBe(
      true,
    )
    expect(
      matchesAspects({ metrics: getDisplayMetrics(MBP14), aspects: ['1.54:1'] }),
    ).toBe(true)
    expect(matchesAspects({ metrics: getDisplayMetrics(UW34), aspects: ['16:9'] })).toBe(
      false,
    )
    expect(matchesAspects({ metrics: getDisplayMetrics(UW34), aspects: [] })).toBe(true)
  })

  it('applies diagonal bounds inclusively, and null means no bound', () => {
    expect(matchesDiagonal({ display: UHD27, minDiagonal: 27, maxDiagonal: 27 })).toBe(
      true,
    )
    expect(matchesDiagonal({ display: UHD27, minDiagonal: 28, maxDiagonal: null })).toBe(
      false,
    )
    expect(matchesDiagonal({ display: UHD27, minDiagonal: null, maxDiagonal: 26 })).toBe(
      false,
    )
    expect(
      matchesDiagonal({ display: UHD27, minDiagonal: null, maxDiagonal: null }),
    ).toBe(true)
  })
})

describe('filterBrowseRows', () => {
  it('keeps only displays with a comfortable scale when onlyComfortable is set', () => {
    const rows = ALL.map((display) => rowOf(display, { baseline: null }))
    const kept = filterBrowseRows({
      rows,
      filters: { ...DEFAULT_FILTERS, onlyComfortable: true },
    })
    expect(kept.map(({ display }) => display.id).sort()).toEqual(
      [FHD.id, UHD27.id, UHD32.id].sort(),
    )
  })

  it('applies every filter together', () => {
    const rows = ALL.map((display) => rowOf(display))
    const kept = filterBrowseRows({
      rows,
      filters: {
        ...DEFAULT_FILTERS,
        search: 'ceske',
        tags: ['monitor'],
        aspects: ['16:9'],
        minDiagonal: 20,
        maxDiagonal: 30,
      },
    })
    expect(kept.map(({ display }) => display.id)).toEqual([QHD27.id])
  })

  it('reports comfort per scale through hasComfortableScale', () => {
    expect(hasComfortableScale(rowOf(UHD27))).toBe(true)
    expect(hasComfortableScale(rowOf(MBP14))).toBe(false)
  })
})

describe('sortBrowseRows', () => {
  const rows = ALL.map((display) => rowOf(display))
  const idsOf = (sorted) => sorted.map(({ display }) => display.id)

  it('sorts by PPI descending for the sheet default', () => {
    expect(
      idsOf(
        sortBrowseRows({
          rows,
          sort: { key: 'ppi', direction: 'desc' },
          locale: 'en',
        }),
      ),
    ).toEqual([MBP14.id, UHD27.id, UHD32.id, UW34.id, QHD27.id, FHD.id])
  })

  it('reverses for ascending', () => {
    expect(
      idsOf(
        sortBrowseRows({ rows, sort: { key: 'ppi', direction: 'asc' }, locale: 'en' }),
      ),
    ).toEqual([FHD.id, QHD27.id, UW34.id, UHD32.id, UHD27.id, MBP14.id])
  })

  it('uses Czech collation for names when the locale is cs', () => {
    const named = [
      { name: 'Chata', id: 'a' },
      { name: 'Hrad', id: 'b' },
      { name: 'Dům', id: 'c' },
    ].map((fields) => rowOf({ ...FHD, ...fields }))
    expect(
      sortBrowseRows({
        rows: named,
        sort: { key: 'name', direction: 'asc' },
        locale: 'cs',
      }).map(({ display }) => display.name),
    ).toEqual(['Dům', 'Hrad', 'Chata'])
  })

  it('keeps null values last in both directions', () => {
    const withNull = [{ ...rowOf(FHD), bestScale: null }, rowOf(UHD27), rowOf(MBP14)]
    const asc = sortBrowseRows({
      rows: withNull,
      sort: { key: 'bestScale', direction: 'asc' },
      locale: 'en',
    })
    const desc = sortBrowseRows({
      rows: withNull,
      sort: { key: 'bestScale', direction: 'desc' },
      locale: 'en',
    })
    expect(asc.at(-1).display.id).toBe(FHD.id)
    expect(desc.at(-1).display.id).toBe(FHD.id)
  })

  it('sorts best scale by logical width, larger first when descending', () => {
    const sorted = sortBrowseRows({
      rows,
      sort: { key: 'bestScale', direction: 'desc' },
      locale: 'en',
    })
    const widths = sorted.map(({ bestScale }) => bestScale.logicalWidth)
    expect(widths).toEqual([...widths].sort((a, b) => b - a))
  })

  it('breaks ties by name, then by id, in either direction', () => {
    const twins = [
      rowOf({ ...FHD, id: 'b-twin', name: 'Twin' }),
      rowOf({ ...FHD, id: 'a-twin', name: 'Twin' }),
    ]
    const sortedAsc = sortBrowseRows({
      rows: twins,
      sort: { key: 'diagonal', direction: 'asc' },
      locale: 'en',
    })
    const sortedDesc = sortBrowseRows({
      rows: twins,
      sort: { key: 'diagonal', direction: 'desc' },
      locale: 'en',
    })
    expect(idsOf(sortedAsc)).toEqual(['a-twin', 'b-twin'])
    expect(idsOf(sortedDesc)).toEqual(['a-twin', 'b-twin'])
  })

  it('sorts relative pixel size against the baseline', () => {
    const baseline = baselineOf(FHD)
    const withBaseline = ALL.map((display) => rowOf(display, { baseline }))
    const sorted = sortBrowseRows({
      rows: withBaseline,
      sort: { key: 'relativePixelSize', direction: 'asc' },
      locale: 'en',
    })
    expect(sorted[0].display.id).toBe(MBP14.id)
    expect(sorted.at(-1).display.id).toBe(FHD.id)
  })

  it('falls back to name order for a key it does not know', () => {
    const sorted = sortBrowseRows({
      rows: [rowOf(UW34), rowOf(FHD)],
      sort: { key: 'colour', direction: 'asc' },
      locale: 'en',
    })
    expect(sorted.map(({ display }) => display.id)).toEqual([FHD.id, UW34.id])
  })

  it('orders by the value that each key names', () => {
    const rows = ALL.map((display) => rowOf(display, { baseline: baselineOf(FHD) }))
    const valueOfKey = {
      diagonal: (row) => row.display.diagonal,
      aspect: (row) => row.display.width / row.display.height,
      resolution: (row) => row.metrics.megapixels,
      width: (row) => row.metrics.widthIn,
      height: (row) => row.metrics.heightIn,
      widthDiff: (row) => row.relative.widthDiffIn,
      heightDiff: (row) => row.relative.heightDiffIn,
      area: (row) => row.metrics.areaIn2,
      areaRatio: (row) => row.relative.areaRatio,
      megapixels: (row) => row.metrics.megapixels,
      megapixelRatio: (row) => row.relative.megapixelRatio,
      relativePixelSize: (row) => row.relative.relativePixelSize,
    }
    Object.entries(valueOfKey).forEach(([key, valueOf]) => {
      const sorted = sortBrowseRows({
        rows,
        sort: { key, direction: 'asc' },
        locale: 'en',
      })
      const values = sorted.map(valueOf)
      expect(values, key).toEqual([...values].sort((a, b) => a - b))
    })
  })
})

describe('buildRelative and buildMatrix', () => {
  it('gives no relative metrics without a baseline', () => {
    expect(buildRelative({ metrics: getDisplayMetrics(FHD), baseline: null })).toBeNull()
  })

  it('computes relative metrics against the baseline', () => {
    const relative = buildRelative({
      metrics: getDisplayMetrics(UHD27),
      baseline: baselineOf(FHD),
    })
    expect(relative.relativePixelSize).toBeCloseTo(91.788 / 163.18 - 1, 3)
  })

  it('lists one matrix row per windows preset, with a logical PPD only with a distance', () => {
    const metrics = getDisplayMetrics(UHD27)
    const plain = buildMatrix({ display: UHD27, metrics, scaling: SCALING })
    expect(plain).toHaveLength(5)
    expect(plain[0].logicalPpd).toBeUndefined()
    const withDistance = buildMatrix({
      display: UHD27,
      metrics,
      scaling: SCALING,
      distance: DEFAULT_DISTANCE.monitor,
    })
    expect(withDistance[0].logicalPpd).toBeGreaterThan(0)
  })

  it('lists looks-like rows for the macOS preset', () => {
    const rows = buildMatrix({
      display: UHD27,
      metrics: getDisplayMetrics(UHD27),
      scaling: { ...SCALING, presetId: 'macos' },
    })
    expect(rows.every(({ looksLikeWidth }) => looksLikeWidth !== undefined)).toBe(true)
  })

  it('picks the default scale closest to the comfort window', () => {
    const pick = (display) =>
      pickDefaultScale({
        display,
        metrics: getDisplayMetrics(display),
        scaling: SCALING,
        distance: DEFAULT_DISTANCE.monitor,
      })
    expect(pick(UHD27)).toBe(1.75)
    expect(pick(UHD32)).toBe(1.5)
    expect(pick(QHD27)).toBe(1.25)
    expect(pick(MBP14)).toBe(2)
  })
})

describe('buildBrowseRow', () => {
  it('carries the flags, relative metrics and the best scale', () => {
    const row = rowOf(UHD27, {
      baseline: baselineOf(FHD),
      isFamiliar: true,
      isCompared: true,
    })
    expect(row.isFamiliar).toBe(true)
    expect(row.isBaseline).toBe(false)
    expect(row.isCompared).toBe(true)
    expect(row.relative).not.toBeNull()
    expect(row.bestScale.scale).toBe(1.75)
  })

  it('flags each matrix row as comfortable or not, without dropping any', () => {
    const row = rowOf(UHD27)
    expect(row.matrix).toHaveLength(5)
    expect(
      row.matrix.filter(({ isComfortable }) => isComfortable).map(({ scale }) => scale),
    ).toEqual([1.75])
  })
})

describe('resolveCompareDistance and resolveCompareScale', () => {
  it('prefers the familiar entry, then the candidate setting, then the baseline', () => {
    const familiarEntry = { id: UHD27.id, distance: 20, scale: 1.5 }
    expect(
      resolveCompareDistance({
        display: UHD27,
        familiarEntry,
        setting: { distance: 30 },
        baselineDistance: 25,
      }),
    ).toBe(20)
    expect(
      resolveCompareDistance({
        display: UHD27,
        familiarEntry: null,
        setting: { distance: 30 },
        baselineDistance: 25,
      }),
    ).toBe(30)
    expect(
      resolveCompareDistance({
        display: UHD27,
        familiarEntry: null,
        setting: undefined,
        baselineDistance: 25,
      }),
    ).toBe(25)
  })

  it('falls back to the default distance of the display when nothing else is set', () => {
    expect(
      resolveCompareDistance({
        display: MBP14,
        familiarEntry: null,
        setting: undefined,
        baselineDistance: undefined,
      }),
    ).toBe(defaultDistanceFor(MBP14))
    expect(defaultDistanceFor(MBP14)).toBeCloseTo(45 / 2.54, 9)
  })

  it('prefers the familiar scale, then the setting, then the best scale, then 1', () => {
    const bestScale = { scale: 1.75 }
    expect(
      resolveCompareScale({
        familiarEntry: { id: 'x', distance: 1, scale: 1.5 },
        setting: { scale: 1.25 },
        bestScale,
      }),
    ).toBe(1.5)
    expect(
      resolveCompareScale({ familiarEntry: null, setting: { scale: 1.25 }, bestScale }),
    ).toBe(1.25)
    expect(
      resolveCompareScale({ familiarEntry: null, setting: undefined, bestScale }),
    ).toBe(1.75)
    expect(
      resolveCompareScale({ familiarEntry: null, setting: undefined, bestScale: null }),
    ).toBe(1)
  })
})

describe('buildCompareEntry', () => {
  const scaling = SCALING
  const sizeMatchBy = 'height'

  it('describes the baseline with zero differences and no equivalence', () => {
    const entry = buildCompareEntry({
      display: FHD,
      metrics: getDisplayMetrics(FHD),
      baseline: baselineOf(FHD),
      familiarEntry: { id: FHD.id, distance: DEFAULT_DISTANCE.monitor, scale: 1 },
      setting: undefined,
      isBaseline: true,
      scaling,
      sizeMatchBy,
    })
    expect(entry.isBaseline).toBe(true)
    expect(entry.isFamiliar).toBe(true)
    expect(entry.equivalent).toBeNull()
    expect(entry.relative.relativePixelSize).toBeCloseTo(0, 12)
    expect(entry.matrix).toHaveLength(5)
    expect(entry.angular.ppd).toBeGreaterThan(0)
  })

  it('reproduces the PRD worked example: 80 cm, 40 cm and 60 cm', () => {
    const baseline = baselineOf(FHD)
    const entry = buildCompareEntry({
      display: UHD32,
      metrics: getDisplayMetrics(UHD32),
      baseline,
      familiarEntry: null,
      setting: undefined,
      isBaseline: false,
      scaling,
      sizeMatchBy,
    })
    expect(entry.distance).toBe(baseline.distance)
    expect(entry.scale).toBe(1.5)
    const cm = (inches) => inches * 2.54
    expect(cm(entry.equivalent.sameSize)).toBeCloseTo(80, 0)
    expect(cm(entry.equivalent.sameSharpness)).toBeCloseTo(40, 0)
    expect(cm(entry.equivalent.sameTextSize)).toBeCloseTo(60, 0)
  })

  it('uses the candidate setting for distance and scale when present', () => {
    const entry = buildCompareEntry({
      display: UHD32,
      metrics: getDisplayMetrics(UHD32),
      baseline: baselineOf(FHD),
      familiarEntry: null,
      setting: { distance: 30, scale: 1.25 },
      isBaseline: false,
      scaling,
      sizeMatchBy,
    })
    expect(entry.distance).toBe(30)
    expect(entry.scale).toBe(1.25)
    expect(entry.angular.logicalPpd).toBeCloseTo(entry.angular.ppd / 1.25, 9)
  })

  it('has no relative metrics or equivalence without a baseline', () => {
    const entry = buildCompareEntry({
      display: MBP14,
      metrics: getDisplayMetrics(MBP14),
      baseline: null,
      familiarEntry: null,
      setting: undefined,
      isBaseline: false,
      scaling,
      sizeMatchBy,
    })
    expect(entry.relative).toBeNull()
    expect(entry.equivalent).toBeNull()
    expect(entry.distance).toBeCloseTo(defaultDistanceFor(MBP14), 9)
  })
})

describe('pickBaselineId', () => {
  const familiar = [
    { id: 'a', distance: 1, scale: 1 },
    { id: 'b', distance: 1, scale: 1 },
  ]

  it('keeps the baseline when it is still familiar', () => {
    expect(pickBaselineId({ familiar, baselineId: 'b' })).toBe('b')
  })

  it('falls back to the first familiar display, or null when there are none', () => {
    expect(pickBaselineId({ familiar, baselineId: 'zzz' })).toBe('a')
    expect(pickBaselineId({ familiar: [], baselineId: 'a' })).toBeNull()
  })
})

describe('reconcileState', () => {
  const base = {
    familiar: [{ id: 'fam', distance: 2, scale: 1 }],
    baselineId: 'gone',
    compareIds: ['fam', 'cand', 'cand', 'hiddenBuiltIn', 'unknown'],
    compareSettings: {
      cand: { distance: 3 },
      fam: { distance: 9 },
      unknown: { scale: 2 },
    },
    hiddenFamiliarIds: ['fam', 'nope'],
    hiddenBuiltInIds: ['hiddenBuiltIn', 'c-custom', 'hiddenBuiltIn'],
    customDisplays: [{ id: 'c-custom' }],
  }
  const reconciled = reconcileState({
    state: base,
    builtInIds: new Set(['fam', 'cand', 'hiddenBuiltIn']),
    knownIds: new Set(['fam', 'cand', 'hiddenBuiltIn', 'c-custom']),
  })

  it('repairs the baseline to the first familiar display', () => {
    expect(reconciled.baselineId).toBe('fam')
  })

  it('drops unknown and hidden built-in ids from compare, and keeps each id once', () => {
    expect(reconciled.compareIds).toEqual(['fam', 'cand'])
    expect(reconciled.compareSettings).toEqual({ cand: { distance: 3 } })
  })

  it('keeps only familiar ids in hiddenFamiliarIds and built-in ids in hiddenBuiltInIds', () => {
    expect(reconciled.hiddenFamiliarIds).toEqual(['fam'])
    expect(reconciled.hiddenBuiltInIds).toEqual(['hiddenBuiltIn'])
  })

  it('leaves custom displays alone', () => {
    expect(reconciled.customDisplays).toEqual([{ id: 'c-custom' }])
  })

  it('removes duplicate and unknown familiar entries', () => {
    const result = reconcileState({
      state: {
        ...base,
        familiar: [
          { id: 'fam', distance: 2, scale: 1 },
          { id: 'fam', distance: 5, scale: 1 },
          { id: 'ghost', distance: 2, scale: 1 },
        ],
        baselineId: 'fam',
      },
      builtInIds: new Set(['fam']),
      knownIds: new Set(['fam']),
    })
    expect(result.familiar).toEqual([{ id: 'fam', distance: 2, scale: 1 }])
  })
})

describe('isSameFamiliarSet', () => {
  it('ignores differences below the URL precision', () => {
    expect(
      isSameFamiliarSet({
        left: {
          familiar: [{ id: 'a', distance: 23.6220472, scale: 1.5 }],
          baselineId: 'a',
        },
        right: { familiar: [{ id: 'a', distance: 23.62, scale: 1.5 }], baselineId: 'a' },
      }),
    ).toBe(true)
  })

  it('is order-insensitive, and detects a different id, distance or baseline', () => {
    const one = { id: 'a', distance: 1, scale: 1 }
    const two = { id: 'b', distance: 1, scale: 1 }
    expect(
      isSameFamiliarSet({
        left: { familiar: [one, two], baselineId: 'a' },
        right: { familiar: [two, one], baselineId: 'a' },
      }),
    ).toBe(true)
    expect(
      isSameFamiliarSet({
        left: { familiar: [one], baselineId: 'a' },
        right: { familiar: [{ ...one, distance: 2 }], baselineId: 'a' },
      }),
    ).toBe(false)
    expect(
      isSameFamiliarSet({
        left: { familiar: [one, two], baselineId: 'a' },
        right: { familiar: [one, two], baselineId: 'b' },
      }),
    ).toBe(false)
  })
})

describe('createCustomId', () => {
  it('makes an id with the c- prefix and base-36 characters', () => {
    expect(createCustomId({ isTaken: () => false })).toMatch(/^c-[a-z0-9]+$/)
  })

  it('draws again when the id is already taken', () => {
    const draws = [0.5, 0.5, 0.25]
    const seen = []
    const id = createCustomId({
      isTaken: (candidate) => {
        seen.push(candidate)
        return seen.length < 3
      },
      random: () => draws.shift(),
    })
    expect(seen).toHaveLength(3)
    expect(new Set(seen).size).toBe(2)
    expect(id).toBe(seen[2])
  })
})

describe('mergeById', () => {
  it('replaces matching items in place and appends new ones', () => {
    const merged = mergeById({
      existing: [
        { id: 'a', v: 1 },
        { id: 'b', v: 1 },
      ],
      incoming: [
        { id: 'b', v: 2 },
        { id: 'c', v: 2 },
      ],
    })
    expect(merged).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 2 },
    ])
  })
})

describe('parseImportText', () => {
  const builtInIds = new Set([FHD.id])
  const payload = (overrides = {}) =>
    JSON.stringify({
      app: 'pixely',
      version: 1,
      customDisplays: [
        { id: 'c-x1', name: 'Mine', diagonal: 27, width: 2560, height: 1440 },
      ],
      familiar: [{ id: 'c-x1', distance: 23.6, scale: 1.25 }],
      baselineId: 'c-x1',
      ...overrides,
    })

  it('reads a well-formed export', () => {
    const result = parseImportText({ text: payload(), builtInIds })
    expect(result.isOk).toBe(true)
    expect(result.customDisplays).toEqual([
      expect.objectContaining({ id: 'c-x1', name: 'Mine', isCustom: true }),
    ])
    expect(result.familiar).toEqual([{ id: 'c-x1', distance: 23.6, scale: 1.25 }])
    expect(result.baselineId).toBe('c-x1')
  })

  it('reports invalidJson for text that is not JSON', () => {
    expect(parseImportText({ text: '{nope', builtInIds })).toEqual({
      isOk: false,
      error: 'invalidJson',
    })
    expect(parseImportText({ text: 42, builtInIds })).toEqual({
      isOk: false,
      error: 'invalidJson',
    })
  })

  it('reports invalidFormat for a foreign app, a wrong version or a non-object', () => {
    const expected = { isOk: false, error: 'invalidFormat' }
    expect(parseImportText({ text: payload({ app: 'other' }), builtInIds })).toEqual(
      expected,
    )
    expect(parseImportText({ text: payload({ version: 2 }), builtInIds })).toEqual(
      expected,
    )
    expect(parseImportText({ text: '[]', builtInIds })).toEqual(expected)
  })

  it('reports invalidFormat for a bad item, a built-in id clash or a bad baseline', () => {
    const expected = { isOk: false, error: 'invalidFormat' }
    expect(
      parseImportText({
        text: payload({ customDisplays: [{ id: 'c-x1', name: '' }] }),
        builtInIds,
      }),
    ).toEqual(expected)
    expect(
      parseImportText({
        text: payload({
          customDisplays: [
            { id: FHD.id, name: 'Clash', diagonal: 24, width: 1920, height: 1080 },
          ],
        }),
        builtInIds,
      }),
    ).toEqual(expected)
    expect(
      parseImportText({
        text: payload({ familiar: [{ id: 'x', distance: -1, scale: 1 }] }),
        builtInIds,
      }),
    ).toEqual(expected)
    expect(parseImportText({ text: payload({ baselineId: 7 }), builtInIds })).toEqual(
      expected,
    )
  })

  it('treats missing lists as empty and drops an unknown tag', () => {
    const result = parseImportText({
      text: JSON.stringify({ app: 'pixely', version: 1 }),
      builtInIds,
    })
    expect(result).toMatchObject({
      isOk: true,
      customDisplays: [],
      familiar: [],
      baselineId: null,
    })
    const tagged = parseImportText({
      text: payload({
        customDisplays: [
          { id: 'c-t', name: 'T', diagonal: 1, width: 1, height: 1, tag: 'tablet' },
        ],
      }),
      builtInIds,
    })
    expect('tag' in tagged.customDisplays[0]).toBe(false)
  })
})

describe('buildExportPayload', () => {
  it('writes inputs only, without isCustom or an empty tag', () => {
    const payloadObject = buildExportPayload({
      customDisplays: [
        { id: 'c-1', name: 'A', diagonal: 27, width: 2560, height: 1440, isCustom: true },
      ],
      familiar: [{ id: 'c-1', distance: 23.6, scale: 1.25 }],
      baselineId: 'c-1',
    })
    expect(payloadObject).toEqual({
      app: 'pixely',
      version: 1,
      customDisplays: [{ id: 'c-1', name: 'A', diagonal: 27, width: 2560, height: 1440 }],
      familiar: [{ id: 'c-1', distance: 23.6, scale: 1.25 }],
      baselineId: 'c-1',
    })
  })
})
