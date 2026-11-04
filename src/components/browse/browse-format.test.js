import { describe, expect, it } from 'vitest'
import {
  NO_VALUE,
  formatDiagonal,
  formatLengthDiffCell,
  formatRatioCell,
  formatScaleLabel,
  getBestScaleLabel,
  getComfortableScales,
  getSignTone,
} from './browse-format.js'

const NBSP = ' '
const MINUS = '−'

describe('getSignTone', () => {
  it.each([
    [2, 'positive'],
    [-58, 'negative'],
    [0, 'same'],
    [Number.NaN, 'none'],
    [undefined, 'none'],
  ])('getSignTone(%s) is %s', (value, expected) => {
    expect(getSignTone(value)).toBe(expected)
  })
})

describe('formatDiagonal', () => {
  it('shows whole inches without decimals and fractions with one decimal', () => {
    expect(formatDiagonal({ diagonal: 27, locale: 'en' })).toBe('27″')
    expect(formatDiagonal({ diagonal: 13.3, locale: 'en' })).toBe('13.3″')
  })

  it('uses a decimal comma in Czech', () => {
    expect(formatDiagonal({ diagonal: 13.3, locale: 'cs' })).toBe('13,3″')
    expect(formatDiagonal({ diagonal: 27, locale: 'cs' })).toBe('27″')
  })

  it('rounds to one decimal before deciding whether to show it', () => {
    expect(formatDiagonal({ diagonal: 27.04, locale: 'en' })).toBe('27″')
  })
})

describe('formatRatioCell', () => {
  it('signs a positive ratio with NBSP before the percent sign and a positive tone', () => {
    expect(formatRatioCell({ ratio: 0.02, locale: 'en', sameLabel: 'same' })).toEqual({
      text: `+2${NBSP}%`,
      tone: 'positive',
    })
  })

  it('uses the real minus sign for a negative ratio', () => {
    expect(formatRatioCell({ ratio: -0.58, locale: 'en', sameLabel: 'same' })).toEqual({
      text: `${MINUS}58${NBSP}%`,
      tone: 'negative',
    })
  })

  it('shows the same label, with no tone, when the ratio rounds to zero', () => {
    expect(formatRatioCell({ ratio: 0.001, locale: 'en', sameLabel: 'same' })).toEqual({
      text: 'same',
      tone: 'same',
    })
  })

  it('shows the dash without a baseline', () => {
    expect(
      formatRatioCell({ ratio: undefined, locale: 'en', sameLabel: 'same' }),
    ).toEqual({
      text: NO_VALUE,
      tone: 'none',
    })
    expect(formatRatioCell({ ratio: null, locale: 'en', sameLabel: 'same' }).text).toBe(
      NO_VALUE,
    )
  })

  it('uses the Czech "same" label and decimal rules through the locale', () => {
    expect(
      formatRatioCell({ ratio: 0.001, locale: 'cs', sameLabel: 'stejné' }).text,
    ).toBe('stejné')
  })
})

describe('formatLengthDiffCell', () => {
  it('signs a positive difference in the active unit system', () => {
    expect(
      formatLengthDiffCell({
        inches: 1,
        units: 'metric',
        locale: 'en',
        sameLabel: 'same',
      }),
    ).toEqual({ text: '+3', tone: 'positive' })
    expect(
      formatLengthDiffCell({
        inches: 1,
        units: 'imperial',
        locale: 'en',
        sameLabel: 'same',
      }),
    ).toEqual({ text: '+1', tone: 'positive' })
  })

  it('shows a negative difference with the real minus sign', () => {
    expect(
      formatLengthDiffCell({
        inches: -2,
        units: 'metric',
        locale: 'en',
        sameLabel: 'same',
      }).text,
    ).toBe(`${MINUS}5`)
  })

  it('shows the same label when the difference rounds to zero', () => {
    expect(
      formatLengthDiffCell({
        inches: 0.1,
        units: 'metric',
        locale: 'en',
        sameLabel: 'same',
      }),
    ).toEqual({ text: 'same', tone: 'same' })
  })

  it('shows the dash for a missing value', () => {
    expect(
      formatLengthDiffCell({
        inches: undefined,
        units: 'metric',
        locale: 'en',
        sameLabel: 'same',
      }),
    ).toEqual({ text: NO_VALUE, tone: 'none' })
  })
})

describe('formatScaleLabel', () => {
  it('joins the scale and the logical resolution rounded to tens', () => {
    const row = { scale: 1.25, logicalWidth: 3072, logicalHeight: 1728 }
    expect(formatScaleLabel({ row, locale: 'en' })).toBe(`125${NBSP}% → 3070 × 1730`)
  })

  it('keeps the Czech percent spacing and no digit grouping in resolutions', () => {
    const row = { scale: 1.5, logicalWidth: 5120, logicalHeight: 2880 }
    expect(formatScaleLabel({ row, locale: 'cs' })).toBe(`150${NBSP}% → 5120 × 2880`)
  })
})

describe('getComfortableScales', () => {
  const matrix = [
    { scale: 1, logicalWidth: 3840, logicalHeight: 2160, isComfortable: false },
    { scale: 1.25, logicalWidth: 3072, logicalHeight: 1728, isComfortable: true },
    { scale: 1.5, logicalWidth: 2560, logicalHeight: 1440, isComfortable: true },
    { scale: 2, logicalWidth: 1920, logicalHeight: 1080, isComfortable: false },
  ]

  it('lists only comfortable rows, in matrix order, and flags the best one', () => {
    const bestScale = matrix[1]
    expect(getComfortableScales({ matrix, bestScale, locale: 'en' })).toEqual([
      { scale: 1.25, label: `125${NBSP}% → 3070 × 1730`, isBest: true },
      { scale: 1.5, label: `150${NBSP}% → 2560 × 1440`, isBest: false },
    ])
  })

  it('flags nothing when the best row is not comfortable', () => {
    const bestScale = { ...matrix[0], isComfortable: false }
    const result = getComfortableScales({ matrix, bestScale, locale: 'en' })
    expect(result.every((entry) => entry.isBest === false)).toBe(true)
  })

  it('matches the best row by scale value, not by object identity', () => {
    const bestScale = { ...matrix[2] }
    const result = getComfortableScales({ matrix, bestScale, locale: 'en' })
    expect(result.find((entry) => entry.isBest).scale).toBe(1.5)
  })

  it('returns an empty list for no matrix or no comfortable row', () => {
    expect(
      getComfortableScales({ matrix: undefined, bestScale: null, locale: 'en' }),
    ).toEqual([])
    expect(
      getComfortableScales({
        matrix: [matrix[0], matrix[3]],
        bestScale: null,
        locale: 'en',
      }),
    ).toEqual([])
  })
})

describe('getBestScaleLabel', () => {
  it('returns the label of a comfortable best scale', () => {
    const bestScale = {
      scale: 1.25,
      logicalWidth: 3072,
      logicalHeight: 1728,
      isComfortable: true,
    }
    expect(getBestScaleLabel({ bestScale, locale: 'en' })).toBe(
      `125${NBSP}% → 3070 × 1730`,
    )
  })

  it('returns null without a best scale or when the best scale is not comfortable', () => {
    expect(getBestScaleLabel({ bestScale: null, locale: 'en' })).toBeNull()
    expect(
      getBestScaleLabel({
        bestScale: {
          scale: 2,
          logicalWidth: 1920,
          logicalHeight: 1080,
          isComfortable: false,
        },
        locale: 'en',
      }),
    ).toBeNull()
  })
})
