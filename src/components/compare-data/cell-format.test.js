import { describe, expect, it } from 'vitest'
import {
  NO_VALUE,
  formatDiagonal,
  formatSignedLength,
  lengthDigits,
} from './cell-format.js'

const NBSP = ' '

describe('lengthDigits', () => {
  it('uses whole centimetres and one decimal for inches', () => {
    expect(lengthDigits('metric')).toBe(0)
    expect(lengthDigits('imperial')).toBe(1)
  })
})

describe('formatDiagonal', () => {
  it('drops the decimal for whole inches and keeps it otherwise', () => {
    expect(formatDiagonal({ diagonal: 27, locale: 'en' })).toBe('27″')
    expect(formatDiagonal({ diagonal: 15.6, locale: 'en' })).toBe('15.6″')
    expect(formatDiagonal({ diagonal: 15.6, locale: 'cs' })).toBe('15,6″')
  })

  it('shows a dash for a missing diagonal', () => {
    expect(formatDiagonal({ diagonal: Number.NaN, locale: 'en' })).toBe(NO_VALUE)
  })
})

describe('formatSignedLength', () => {
  it('shows the sign with the unit, using the real minus sign', () => {
    expect(
      formatSignedLength({
        inches: -6.3,
        units: 'metric',
        locale: 'en',
        sameLabel: 'same',
      }),
    ).toBe(`−16${NBSP}cm`)
    expect(
      formatSignedLength({ inches: 1, units: 'metric', locale: 'en', sameLabel: 'same' }),
    ).toBe(`+3${NBSP}cm`)
  })

  it('reads a difference that rounds to zero as the same label, without a unit', () => {
    expect(
      formatSignedLength({
        inches: 0.1,
        units: 'metric',
        locale: 'en',
        sameLabel: 'same',
      }),
    ).toBe('same')
  })

  it('uses one decimal and the Czech comma in imperial units', () => {
    expect(
      formatSignedLength({
        inches: -1.25,
        units: 'imperial',
        locale: 'cs',
        sameLabel: 'stejné',
      }),
    ).toBe(`−1,3${NBSP}in`)
  })

  it('shows a dash for a missing value', () => {
    expect(
      formatSignedLength({
        inches: undefined,
        units: 'metric',
        locale: 'en',
        sameLabel: 'same',
      }),
    ).toBe(NO_VALUE)
  })
})
