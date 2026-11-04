import { describe, expect, it } from 'vitest'
import { decodeState, encodeState } from './url-state.js'

/** Full view state with values already at the encoded precision. */
const FULL_STATE = {
  view: 'compare',
  familiar: [
    { id: '27-4k-3840x2160', distance: 23.62, scale: 1.5 },
    { id: 'c-k3j9x2', distance: 17.72, scale: 1.25 },
  ],
  baselineId: '27-4k-3840x2160',
  compareIds: ['32-4k-3840x2160', 'c-k3j9x2', '13-mbp-2560x1600'],
  compareSettings: {
    '32-4k-3840x2160': { distance: 23.62, scale: 1.5 },
    'c-k3j9x2': { scale: 1.25 },
    '13-mbp-2560x1600': { distance: 17.72 },
  },
  hiddenFamiliarIds: ['c-k3j9x2'],
  customDisplays: [
    {
      id: 'c-k3j9x2',
      name: 'Pracovní notebook 14″ – „Česká ř“',
      diagonal: 14,
      width: 1920,
      height: 1200,
      tag: 'laptop',
      isCustom: true,
    },
  ],
  units: 'imperial',
  locale: 'cs',
  presetId: 'linux',
  customScales: [1.33, 3],
  comfort: {
    mode: 'ppd',
    minPpi: 90,
    maxPpi: 105,
    minPpd: 37,
    maxPpd: 43,
    minWidth: 1024,
  },
  filters: {
    search: 'Dell',
    tags: ['monitor'],
    aspects: ['16:9', '21:9'],
    minDiagonal: 24,
    maxDiagonal: 32,
    onlyComfortable: true,
  },
  sort: { key: 'ppi', direction: 'desc' },
  vizMode: 'seen',
  sizeMatchBy: 'diagonal',
}

/** A typical shared comparison: 2 familiar, 3 compared, 1 custom display. */
const TYPICAL_STATE = {
  view: 'compare',
  familiar: [
    { id: '27-4k-3840x2160', distance: 23.62, scale: 1.5 },
    { id: '24-fhd-1920x1080', distance: 23.62, scale: 1 },
  ],
  baselineId: '24-fhd-1920x1080',
  compareIds: ['27-4k-3840x2160', '32-4k-3840x2160', 'c-k3j9x2'],
  compareSettings: {
    '27-4k-3840x2160': { distance: 23.62, scale: 1.5 },
    '32-4k-3840x2160': { distance: 31.5, scale: 1.5 },
    'c-k3j9x2': { distance: 27.56, scale: 1.25 },
  },
  customDisplays: [
    {
      id: 'c-k3j9x2',
      name: 'Pracovní 34″',
      diagonal: 34,
      width: 3440,
      height: 1440,
      isCustom: true,
    },
  ],
  units: 'metric',
  locale: 'cs',
  presetId: 'windows',
}

/** Encode a raw payload object the way a hand-made or tampered link would look. */
const encodeRaw = (payload) =>
  `#s=${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`

/** Read the JSON that a link carries, to check the on-the-wire format. */
const readRaw = (hash) =>
  JSON.parse(Buffer.from(hash.replace(/^#s=/, ''), 'base64url').toString('utf8'))

describe('encodeState', () => {
  it('returns #s= followed by unpadded base64url', () => {
    const hash = encodeState(FULL_STATE)
    expect(hash.startsWith('#s=')).toBe(true)
    expect(hash.slice(3)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('encodes an empty state as just the version', () => {
    expect(encodeState({})).toBe('#s=eyJ2IjoxfQ')
    expect(readRaw(encodeState({}))).toStrictEqual({ v: 1 })
  })

  it('uses the short keys from the URL format table', () => {
    const raw = readRaw(encodeState(FULL_STATE))
    expect(raw).toMatchObject({
      v: 1,
      w: 'compare',
      f: [
        ['27-4k-3840x2160', 23.62, 1.5],
        ['c-k3j9x2', 17.72, 1.25],
      ],
      b: '27-4k-3840x2160',
      c: ['32-4k-3840x2160', 'c-k3j9x2', '13-mbp-2560x1600'],
      cs: {
        '32-4k-3840x2160': [23.62, 1.5],
        'c-k3j9x2': [null, 1.25],
        '13-mbp-2560x1600': [17.72, null],
      },
      h: ['c-k3j9x2'],
      cd: [
        {
          i: 'c-k3j9x2',
          n: 'Pracovní notebook 14″ – „Česká ř“',
          d: 14,
          w: 1920,
          h: 1200,
          t: 'laptop',
        },
      ],
      u: 'i',
      l: 'cs',
      p: 'linux',
      x: [1.33, 3],
      cf: { m: 'ppd', a: 90, b: 105, c: 37, d: 43, mw: 1024 },
      fl: {
        q: 'Dell',
        t: ['monitor'],
        a: ['16:9', '21:9'],
        mn: 24,
        mx: 32,
        oc: true,
      },
      s: ['ppi', 'd'],
      vm: 's',
      sm: 'd',
    })
  })

  it('only includes fields that are present in the input', () => {
    const raw = readRaw(encodeState({ view: 'browse', units: 'imperial' }))
    expect(raw).toStrictEqual({ v: 1, w: 'browse', u: 'i' })
  })

  it('keeps an explicit null baseline', () => {
    const raw = readRaw(encodeState({ baselineId: null }))
    expect(raw).toStrictEqual({ v: 1, b: null })
  })

  it('rounds distances to 2 decimals and scales to 4 decimals', () => {
    const raw = readRaw(
      encodeState({
        familiar: [{ id: 'a', distance: 23.6220472, scale: 1.33333333 }],
        compareSettings: { b: { distance: 17.7165354, scale: 1.25004 } },
        customScales: [2.00004, 1.123456],
      }),
    )
    expect(raw.f).toStrictEqual([['a', 23.62, 1.3333]])
    expect(raw.cs).toStrictEqual({ b: [17.72, 1.25] })
    expect(raw.x).toStrictEqual([2, 1.1235])
  })

  it('does not throw for a missing state', () => {
    expect(readRaw(encodeState(undefined))).toStrictEqual({ v: 1 })
    expect(readRaw(encodeState(null))).toStrictEqual({ v: 1 })
  })

  it('stays ASCII-only and encodes names as UTF-8', () => {
    const hash = encodeState(FULL_STATE)
    expect(hash).toMatch(/^[\x21-\x7e]+$/)
    const bytes = Buffer.from(hash.slice(3), 'base64url')
    expect(bytes.includes(Buffer.from('Pracovní', 'utf8'))).toBe(true)
  })
})

describe('decodeState', () => {
  it('round-trips a full view state', () => {
    expect(decodeState(encodeState(FULL_STATE))).toStrictEqual(FULL_STATE)
  })

  it('round-trips a typical shared comparison', () => {
    expect(decodeState(encodeState(TYPICAL_STATE))).toStrictEqual(TYPICAL_STATE)
  })

  it('round-trips partial states without adding fields', () => {
    const partial = { view: 'compare', units: 'imperial', baselineId: null }
    expect(decodeState(encodeState(partial))).toStrictEqual(partial)
  })

  it('round-trips an empty state', () => {
    expect(decodeState(encodeState({}))).toStrictEqual({})
  })

  it('round-trips compare settings that hold only one of distance or scale', () => {
    const state = {
      compareSettings: {
        'only-scale': { scale: 1.5 },
        'only-distance': { distance: 40 },
        neither: {},
      },
    }
    expect(decodeState(encodeState(state))).toStrictEqual(state)
  })

  it('round-trips Czech names, the inch mark and emoji', () => {
    const state = {
      customDisplays: [
        {
          id: 'c-1',
          name: 'Notebook „Česká ř“ 🖥️ 16″',
          diagonal: 16,
          width: 3072,
          height: 1920,
          isCustom: true,
        },
      ],
    }
    expect(decodeState(encodeState(state))).toStrictEqual(state)
  })

  it('accepts the hash with or without the leading #', () => {
    const hash = encodeState(FULL_STATE)
    expect(decodeState(hash)).toStrictEqual(FULL_STATE)
    expect(decodeState(hash.slice(1))).toStrictEqual(FULL_STATE)
  })

  it('finds the s parameter among other parameters', () => {
    const hash = encodeState(TYPICAL_STATE)
    expect(decodeState(`#foo=1&${hash.slice(1)}`)).toStrictEqual(TYPICAL_STATE)
    expect(decodeState(`?${hash.slice(1)}`)).toStrictEqual(TYPICAL_STATE)
  })

  it('accepts padded base64', () => {
    const padded = `#s=${Buffer.from('{"v":1,"u":"i"}').toString('base64')}`
    expect(decodeState(padded)).toStrictEqual({ units: 'imperial' })
  })

  it.each([
    ['empty string', ''],
    ['bare hash', '#'],
    ['empty s parameter', '#s='],
    ['no s parameter', '#x=eyJ2IjoxfQ'],
    ['invalid base64 characters', '#s=!!!'],
    ['standard base64 characters', '#s=+/+/'],
    ['base64 with an impossible length', '#s=A'],
    [
      'bytes that are not UTF-8',
      `#s=${Buffer.from([0xff, 0xfe, 0xfd]).toString('base64url')}`,
    ],
    ['text that is not JSON', '#s=bm90IGpzb24'],
    ['JSON array', encodeRaw([1, 2])],
    ['JSON null', encodeRaw(null)],
    ['JSON string', encodeRaw('hello')],
    ['JSON number', encodeRaw(42)],
    ['wrong version 2', encodeRaw({ v: 2, u: 'i' })],
    ['missing version', encodeRaw({ u: 'i' })],
    ['string version', encodeRaw({ v: '1', u: 'i' })],
    ['oversized input', `#s=${'A'.repeat(100001)}`],
  ])('returns null for %s', (_, hash) => {
    expect(decodeState(hash)).toBeNull()
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['number', 42],
    ['object', {}],
  ])('returns null for a non-string %s', (_, value) => {
    expect(decodeState(value)).toBeNull()
  })

  it('never throws on random input', () => {
    let seed = 7
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed
    }
    const alphabet = 'ABCxyz0123-_+/=%&?#!~ '
    for (let run = 0; run < 300; run += 1) {
      const length = next() % 80
      const text = Array.from({ length }, () => alphabet[next() % alphabet.length]).join(
        '',
      )
      expect(() => decodeState(`#s=${text}`)).not.toThrow()
      expect(() => decodeState(text)).not.toThrow()
    }
  })

  it('never throws when any single character of a valid link is damaged', () => {
    const hash = encodeState(TYPICAL_STATE)
    for (let index = 3; index < hash.length; index += 1) {
      const replacement = index % 2 === 0 ? '~' : 'A'
      const damaged = `${hash.slice(0, index)}${replacement}${hash.slice(index + 1)}`
      expect(() => decodeState(damaged)).not.toThrow()
      const result = decodeState(damaged)
      expect(result === null || typeof result === 'object').toBe(true)
    }
  })

  it('drops tampered fields independently and keeps the rest', () => {
    const hash = encodeState({ ...TYPICAL_STATE, units: 'metric' })
    const raw = readRaw(hash)
    const tampered = encodeRaw({ ...raw, u: 'furlongs', p: 'android' })
    const result = decodeState(tampered)
    expect(result).not.toHaveProperty('units')
    expect(result).not.toHaveProperty('presetId')
    expect(result.familiar).toStrictEqual(TYPICAL_STATE.familiar)
    expect(result.customDisplays).toStrictEqual(TYPICAL_STATE.customDisplays)
  })

  describe('field validation drops only the bad field or item', () => {
    it.each([
      ['unknown view', { w: 'settings', u: 'i' }, { units: 'imperial' }],
      ['unknown units', { u: 'x' }, {}],
      ['unknown locale', { l: 'de' }, {}],
      ['unknown preset', { p: 'android' }, {}],
      ['unknown view mode', { vm: 'z' }, {}],
      ['unknown size match', { sm: 'x' }, {}],
      ['sort with an unknown direction', { s: ['ppi', 'sideways'] }, {}],
      ['sort that is not a pair', { s: 'ppi' }, {}],
      [
        'sort with a valid direction',
        { s: ['ppi', 'd'] },
        { sort: { key: 'ppi', direction: 'desc' } },
      ],
      [
        'sort with an ascending direction',
        { s: ['name', 'a'] },
        { sort: { key: 'name', direction: 'asc' } },
      ],
      ['baseline that is a number', { b: 5 }, {}],
      ['baseline that is an empty id', { b: '' }, {}],
      ['baseline that is a null', { b: null }, { baselineId: null }],
      ['compare ids that are not an array', { c: 'abc' }, {}],
      [
        'compare ids with bad entries',
        { c: [1, 'ok', 'x'.repeat(101), 'x'.repeat(100), ''] },
        { compareIds: ['ok', 'x'.repeat(100)] },
      ],
      [
        'hidden ids with bad entries',
        { h: ['c-1', 7, null] },
        { hiddenFamiliarIds: ['c-1'] },
      ],
      [
        'custom scales with bad entries',
        { x: [1.33, -2, 'x', 1.33, 0, 3] },
        { customScales: [1.33, 3] },
      ],
      [
        'familiar entries with bad values',
        {
          f: [
            ['a', -1, 1.5],
            ['b', 23.6, 'x'],
            'junk',
            ['short', 20],
            ['', 20, 1],
            ['ok', 20, 1],
            ['ok', 30, 2],
          ],
        },
        { familiar: [{ id: 'ok', distance: 20, scale: 1 }] },
      ],
      ['familiar that is not an array', { f: { id: 'a' } }, {}],
      [
        'compare settings with bad entries',
        {
          cs: {
            a: 'x',
            b: [null, 1.5],
            c: [-1, 2],
            d: [null, null],
            e: [1],
            [`x${'y'.repeat(100)}`]: [1, 1],
          },
        },
        { compareSettings: { b: { scale: 1.5 }, c: { scale: 2 }, d: {} } },
      ],
      [
        'custom displays with bad items',
        {
          cd: [
            { i: 'c-1', n: 'Ok', d: 27, w: 2560, h: 1440 },
            { i: 'c-2', n: '', d: 27, w: 2560, h: 1440 },
            { i: 'c-3', n: 'x'.repeat(121), d: 27, w: 1, h: 1 },
            { i: 'c-4', n: 'Zero', d: 0, w: 1, h: 1 },
            { i: 'c-5', n: 'Neg', d: 27, w: -1, h: 1 },
            { i: 'c-6', n: 'Tablet', d: 10, w: 2000, h: 1500, t: 'tablet' },
            { i: 'c-7', n: 'Lap', d: 14, w: 1920, h: 1080, t: 'laptop' },
            { n: 'no id', d: 27, w: 1, h: 1 },
            null,
            'junk',
          ],
        },
        {
          customDisplays: [
            {
              id: 'c-1',
              name: 'Ok',
              diagonal: 27,
              width: 2560,
              height: 1440,
              isCustom: true,
            },
            {
              id: 'c-6',
              name: 'Tablet',
              diagonal: 10,
              width: 2000,
              height: 1500,
              isCustom: true,
            },
            {
              id: 'c-7',
              name: 'Lap',
              diagonal: 14,
              width: 1920,
              height: 1080,
              tag: 'laptop',
              isCustom: true,
            },
          ],
        },
      ],
      [
        'comfort with bad sub-fields',
        { cf: { m: 'ppx', a: 90, b: -5, c: 37, d: 43, mw: 'wide' } },
        { comfort: { minPpi: 90, minPpd: 37, maxPpd: 43 } },
      ],
      ['comfort that is a string', { cf: 'ppi' }, {}],
      [
        'filters with bad sub-fields',
        {
          fl: {
            q: 5,
            t: ['laptop', 'tablet'],
            a: ['16:9', 3],
            mn: -1,
            mx: null,
            oc: 'yes',
          },
        },
        { filters: { tags: ['laptop'], aspects: ['16:9'], maxDiagonal: null } },
      ],
      [
        'filters with an over-long search',
        { fl: { q: 'x'.repeat(201) } },
        { filters: {} },
      ],
    ])('%s', (_, fragment, expected) => {
      expect(decodeState(encodeRaw({ v: 1, ...fragment }))).toStrictEqual(expected)
    })
  })

  it('caps every array at 200 items and keeps the first ones', () => {
    const ids = Array.from({ length: 300 }, (_, index) => `id-${index}`)
    const familiar = ids.slice(0, 250).map((id) => [id, 20, 1])
    const customDisplays = Array.from({ length: 201 }, (_, index) => ({
      i: `c-${index}`,
      n: `Display ${index}`,
      d: 27,
      w: 2560,
      h: 1440,
    }))
    const customScales = Array.from({ length: 250 }, (_, index) => 1 + index / 1000)
    const compareSettings = Object.fromEntries(
      ids.slice(0, 250).map((id) => [id, [20, 1]]),
    )

    const result = decodeState(
      encodeRaw({
        v: 1,
        f: familiar,
        c: ids,
        cd: customDisplays,
        x: customScales,
        cs: compareSettings,
      }),
    )

    expect(result.familiar).toHaveLength(200)
    expect(result.familiar.at(-1).id).toBe('id-199')
    expect(result.compareIds).toHaveLength(200)
    expect(result.customDisplays).toHaveLength(200)
    expect(result.customScales).toHaveLength(200)
    expect(Object.keys(result.compareSettings)).toHaveLength(200)
  })

  it('removes duplicate ids, keeping the first occurrence', () => {
    const result = decodeState(
      encodeRaw({
        v: 1,
        f: [
          ['a', 20, 1],
          ['a', 30, 2],
        ],
        c: ['x', 'x', 'y'],
      }),
    )
    expect(result).toStrictEqual({
      familiar: [{ id: 'a', distance: 20, scale: 1 }],
      compareIds: ['x', 'y'],
    })
  })

  it('leaves out in-app values that are the wrong shape instead of throwing', () => {
    const hash = encodeState({
      customDisplays: 'x',
      compareSettings: null,
      sort: 'asc',
      familiar: [null, { id: 'a', distance: 20, scale: 1 }],
      filters: ['not', 'an', 'object'],
      comfort: 42,
    })
    expect(readRaw(hash)).toStrictEqual({ v: 1, f: [['a', 20, 1]] })
  })

  it('drops list items and sorts that cannot be encoded', () => {
    const hash = encodeState({
      customDisplays: [null],
      sort: { key: 'ppi', direction: 'sideways' },
    })
    // An all-invalid list encodes as an empty list (no custom displays), not as absent.
    expect(readRaw(hash)).toStrictEqual({ v: 1, cd: [] })
  })

  it('encodes a null compare setting as empty distance and scale', () => {
    expect(readRaw(encodeState({ compareSettings: { a: null } }))).toStrictEqual({
      v: 1,
      cs: { a: [null, null] },
    })
  })

  it('does not let a crafted key pollute object prototypes', () => {
    const result = decodeState(encodeRaw({ v: 1, cs: { __proto__: [null, 1.5] } }))
    expect(Object.getPrototypeOf(result.compareSettings)).toBe(Object.prototype)
    expect({}.scale).toBeUndefined()
    expect(Object.prototype.scale).toBeUndefined()
  })
})

describe('link length', () => {
  it('keeps a typical link under 600 characters', () => {
    expect(encodeState(TYPICAL_STATE).length).toBeLessThan(600)
  })
})

describe('worked example in docs/STATE.md', () => {
  it('encodes the documented typical comparison to the documented link', () => {
    const documentedLink =
      '#s=eyJ2IjoxLCJ3IjoiY29tcGFyZSIsImYiOltbIjI3LTRrLTM4NDB4MjE2MCIsMjMuNjIsMS41XSxbIjI0LWZoZC0xOTIweDEwODAiLDIzLjYyLDFdXSwiYiI6IjI0LWZoZC0xOTIweDEwODAiLCJjIjpbIjI3LTRrLTM4NDB4MjE2MCIsIjMyLTRrLTM4NDB4MjE2MCIsImMtazNqOXgyIl0sImNzIjp7IjI3LTRrLTM4NDB4MjE2MCI6WzIzLjYyLDEuNV0sIjMyLTRrLTM4NDB4MjE2MCI6WzMxLjUsMS41XSwiYy1rM2o5eDIiOlsyNy41NiwxLjI1XX0sImNkIjpbeyJpIjoiYy1rM2o5eDIiLCJuIjoiUHJhY292bsOtIDM04oCzIiwiZCI6MzQsInciOjM0NDAsImgiOjE0NDB9XSwidSI6Im0iLCJsIjoiY3MiLCJwIjoid2luZG93cyJ9'
    expect(encodeState(TYPICAL_STATE)).toBe(documentedLink)
    expect(documentedLink.length).toBe(475)
  })
})
