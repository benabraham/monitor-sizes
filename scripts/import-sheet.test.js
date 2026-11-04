import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildSeed,
  formatSeedJson,
  getTag,
  importSheet,
  makeId,
  normalizeName,
  parseSnapshot,
} from './import-sheet.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_PATH = join(HERE, '..', 'data', 'sheet-snapshot', 'monitory.values.json')

/** @returns {object} The frozen sheet snapshot, parsed. */
const readSnapshot = () => JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))

/** Identity of a display's inputs, used to compare rows with seed entries. */
const inputKeyOf = ({ diagonal, width, height }) => `${diagonal}|${width}|${height}`

/** Pixels per inch, the sort key for the seed (not stored in it). */
const ppiOf = ({ width, height, diagonal }) => Math.hypot(width, height) / diagonal

describe('parseSnapshot', () => {
  const headerRow = [
    'compare',
    'screen size',
    'PPI',
    'rel',
    'name',
    'aspect',
    'w',
    '',
    'h',
  ]
  const blankRow = ['', '', '', '', '', '', '', '', '']

  it('throws a TypeError when the snapshot has no values array', () => {
    expect(() => parseSnapshot({ range: 'monitory!A1:AK54' })).toThrow(TypeError)
    expect(() => parseSnapshot(null)).toThrow(TypeError)
  })

  it('skips header rows 0 to 2 even when they hold a valid-looking display', () => {
    const lookalike = ['FALSE', '24', '', '', 'Header', '', '1920', '×', '1080']
    const json = { values: [headerRow, lookalike, lookalike, lookalike] }
    expect(parseSnapshot(json)).toEqual([
      { diagonal: 24, name: 'Header', width: 1920, height: 1080 },
    ])
  })

  it('reads diagonal, name, width and height from columns B, E, G and I', () => {
    const json = {
      values: [
        headerRow,
        blankRow,
        blankRow,
        ['FALSE', '15.6', '282', '−63 %', '4K', ' 16:9 ', '3840', '×', '2160', '35'],
      ],
    }
    expect(parseSnapshot(json)).toEqual([
      { diagonal: 15.6, name: '4K', width: 3840, height: 2160 },
    ])
  })

  it('coerces formatted strings to numbers and trims the name and the numbers', () => {
    const json = {
      values: [
        headerRow,
        blankRow,
        blankRow,
        ['FALSE', ' 27 ', '', '', '  Spaced  ', '', ' 2560 ', '×', '1440'],
      ],
    }
    expect(parseSnapshot(json)).toEqual([
      { diagonal: 27, name: 'Spaced', width: 2560, height: 1440 },
    ])
  })

  it('skips rows without a numeric width or height', () => {
    const json = {
      values: [
        headerRow,
        blankRow,
        blankRow,
        ['FALSE', '24', '', '', 'Broken width', '', 'n/a', '×', '1080'],
        ['FALSE', '24', '', '', 'Empty height', '', '1920', '×', ''],
        ['FALSE', '24', '', '', 'Blank width', '', '', '×', '1080'],
        ['FALSE', '24', '', '', 'Good', '', '1920', '×', '1080'],
      ],
    }
    expect(parseSnapshot(json)).toEqual([
      { diagonal: 24, name: 'Good', width: 1920, height: 1080 },
    ])
  })

  it('skips rows without a numeric diagonal, non-array rows and zero sizes', () => {
    const json = {
      values: [
        headerRow,
        blankRow,
        blankRow,
        ['FALSE', '', '', '', 'No diagonal', '', '1920', '×', '1080'],
        null,
        ['FALSE', '24', '', '', 'Zero', '', '0', '×', '1080'],
        ['FALSE', '24', '', '', 'Kept', '', '1920', '×', '1080'],
      ],
    }
    expect(parseSnapshot(json)).toEqual([
      { diagonal: 24, name: 'Kept', width: 1920, height: 1080 },
    ])
  })

  it('reads the real snapshot as 51 displays, first and last rows included', () => {
    const rows = parseSnapshot(readSnapshot())
    expect(rows).toHaveLength(51)
    expect(rows[0]).toEqual({ diagonal: 15.6, name: '4K', width: 3840, height: 2160 })
    expect(rows[50]).toEqual({ diagonal: 45, name: '2K UW', width: 3440, height: 1440 })
  })
})

describe('normalizeName', () => {
  it.each([
    [1920, 1080, 'Full HD'],
    [1920, 1200, 'WUXGA'],
    [2560, 1440, 'QHD'],
    [2560, 1600, 'WQXGA'],
    [2560, 1080, 'UW Full HD'],
    [3440, 1440, 'UWQHD'],
    [3840, 1600, 'UW4K'],
    [3840, 2160, '4K UHD'],
    [2880, 1800, '3K'],
    [5120, 1440, 'DQHD'],
    [5120, 2160, '5K2K'],
    [5120, 2880, '5K'],
    [6016, 3384, '6K'],
    [6144, 3456, '6K'],
    [6144, 2560, 'UW6K'],
    [7680, 2160, 'DUHD'],
    [7680, 3240, '8K UW'],
    [7680, 4320, '8K UHD'],
    [10080, 4320, '10K UW'],
  ])('names %i × %i as %s', (width, height, expected) => {
    expect(normalizeName({ name: 'raw', width, height, diagonal: 27 })).toBe(expected)
  })

  it.each([
    [3456, 2234, 16.2, 'MacBook Pro 16″'],
    [3024, 1964, 14.2, 'MacBook Pro 14″'],
    [2560, 1664, 13.6, 'MacBook Air 13″'],
    [2880, 1864, 15.3, 'MacBook Air 15″'],
    [2560, 1600, 13.3, 'MacBook Air/Pro 13″ (M1, M2)'],
  ])(
    'keeps the MacBook model name for %i × %i at %s″',
    (width, height, diagonal, name) => {
      expect(normalizeName({ name: 'MB raw', width, height, diagonal })).toBe(name)
    },
  )

  it('tells MacBook panels from same-resolution monitors by diagonal', () => {
    expect(normalizeName({ name: '', width: 2560, height: 1600, diagonal: 30 })).toBe(
      'WQXGA',
    )
    expect(normalizeName({ name: '', width: 3456, height: 2234, diagonal: 27 })).toBe(
      '3456 × 2234',
    )
  })

  it('falls back to the resolution for unknown panels', () => {
    expect(
      normalizeName({ name: 'Mystery', width: 1600, height: 900, diagonal: 19 }),
    ).toBe('1600 × 900')
  })

  it('ignores the raw sheet name, so 3440 × 1440 is UWQHD at every size', () => {
    expect(
      normalizeName({ name: '2K UW', width: 3440, height: 1440, diagonal: 34 }),
    ).toBe('UWQHD')
    expect(
      normalizeName({ name: '4K UW', width: 3440, height: 1440, diagonal: 40 }),
    ).toBe('UWQHD')
  })
})

describe('getTag', () => {
  it('tags displays up to 17.3″ as laptops, including the boundary', () => {
    expect(getTag({ name: '', width: 3840, height: 2160, diagonal: 15.6 })).toBe('laptop')
    expect(getTag({ name: '', width: 1920, height: 1080, diagonal: 17.3 })).toBe('laptop')
  })

  it('tags anything above 17.3″ at 16:9 as a monitor', () => {
    expect(getTag({ name: '', width: 1920, height: 1080, diagonal: 17.4 })).toBe(
      'monitor',
    )
  })

  it('tags a 27″ 4K panel as a monitor', () => {
    expect(getTag({ name: '', width: 3840, height: 2160, diagonal: 27 })).toBe('monitor')
  })

  it('tags a 34″ 3440 × 1440 panel as an ultrawide', () => {
    expect(getTag({ name: '', width: 3440, height: 1440, diagonal: 34 })).toBe(
      'ultrawide',
    )
  })

  it('tags a 57″ 7680 × 2160 panel as an ultrawide', () => {
    expect(getTag({ name: '', width: 7680, height: 2160, diagonal: 57 })).toBe(
      'ultrawide',
    )
  })

  it('uses 2.2 : 1 as the ultrawide threshold, and keeps 21:10 a monitor', () => {
    expect(getTag({ name: '', width: 2200, height: 1000, diagonal: 30 })).toBe(
      'ultrawide',
    )
    expect(getTag({ name: '', width: 2100, height: 1000, diagonal: 30 })).toBe('monitor')
  })
})

describe('makeId', () => {
  it('builds diagonal-width×height and replaces the decimal point with a dash', () => {
    expect(makeId({ diagonal: 15.6, name: '4K', width: 3840, height: 2160 })).toBe(
      '15-6-3840x2160',
    )
  })

  it('omits the dash for whole-inch diagonals', () => {
    expect(makeId({ diagonal: 27, name: '4K', width: 3840, height: 2160 })).toBe(
      '27-3840x2160',
    )
  })

  it('handles two-digit decimals', () => {
    expect(makeId({ diagonal: 55.5, name: '', width: 10080, height: 4320 })).toBe(
      '55-5-10080x4320',
    )
  })
})

describe('buildSeed', () => {
  const snapshot = readSnapshot()
  const seed = buildSeed(snapshot)
  const byId = (id) => seed.find((display) => display.id === id)

  it('maps every snapshot row to exactly one seed entry with identical inputs', () => {
    expect(seed).toHaveLength(51)
    const rowKeys = parseSnapshot(snapshot).map(inputKeyOf).sort()
    const seedKeys = seed.map(inputKeyOf).sort()
    expect(seedKeys).toEqual(rowKeys)
  })

  it('gives every entry a unique id', () => {
    const ids = seed.map((display) => display.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('stores exactly the input fields, in the documented order, and nothing derived', () => {
    seed.forEach((display) => {
      expect(Object.keys(display)).toEqual([
        'id',
        'name',
        'diagonal',
        'width',
        'height',
        'tag',
      ])
    })
  })

  it('no longer has the "2K UW" / "4K UW" inconsistency', () => {
    const uwqhd = seed.filter(
      (display) => display.width === 3440 && display.height === 1440,
    )
    expect(uwqhd).toHaveLength(3)
    uwqhd.forEach((display) => expect(display.name).toBe('UWQHD'))
    const names = seed.map((display) => display.name)
    expect(names.some((name) => /^(2K|4K) UW$/.test(name))).toBe(false)
  })

  it('normalises the sheet names, including the ENDGAME, 6K-, 4K- and MacBook cases', () => {
    expect(byId('55-5-10080x4320').name).toBe('10K UW')
    expect(byId('55-5-7680x3240').name).toBe('8K UW')
    expect(byId('52-6144x2560').name).toBe('UW6K')
    expect(byId('37-5-3840x1600').name).toBe('UW4K')
    expect(byId('16-2-3456x2234').name).toBe('MacBook Pro 16″')
    expect(byId('13-3-2560x1600').name).toBe('MacBook Air/Pro 13″ (M1, M2)')
    const names = seed.map((display) => display.name)
    expect(names.some((name) => /ENDGAME|FullHD|MB |K-$|\+/.test(name))).toBe(false)
  })

  it('tags a 15.6″ display as a laptop, a 34″ 3440 × 1440 as an ultrawide', () => {
    expect(byId('15-6-3840x2160').tag).toBe('laptop')
    expect(byId('34-3440x1440').tag).toBe('ultrawide')
  })

  it('tags a 57″ 7680 × 2160 as an ultrawide and a 27″ 4K as a monitor', () => {
    expect(byId('57-7680x2160').tag).toBe('ultrawide')
    expect(byId('27-3840x2160').tag).toBe('monitor')
  })

  it('sorts the seed by PPI, highest first', () => {
    const ppis = seed.map(ppiOf)
    expect(ppis).toEqual([...ppis].sort((a, b) => b - a))
    expect(seed[0].id).toBe('15-6-3840x2160')
    expect(seed[seed.length - 1].id).toBe('45-3440x1440')
  })
})

describe('formatSeedJson', () => {
  it('pretty-prints with 2-space indent and a trailing newline', () => {
    expect(formatSeedJson([{ a: 1 }])).toBe('[\n  {\n    "a": 1\n  }\n]\n')
  })
})

describe('importSheet', () => {
  let dir

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'import-sheet-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('writes the generated seed to the given path, creating folders as needed', () => {
    const seedPath = join(dir, 'nested', 'seed.json')
    const result = importSheet({ snapshotPath: SNAPSHOT_PATH, seedPath })
    const text = readFileSync(seedPath, 'utf8')
    expect(result).toEqual({ count: 51, seedPath })
    expect(text).toBe(formatSeedJson(buildSeed(readSnapshot())))
  })
})
