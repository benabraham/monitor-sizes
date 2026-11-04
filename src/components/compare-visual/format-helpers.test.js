import { describe, expect, it } from 'vitest'
import { formatDiagonal, formatDisplayLabel, lengthDigits } from './format-helpers.js'

describe('lengthDigits', () => {
  it.each([
    ['metric', 0],
    ['imperial', 1],
  ])('%s uses %i decimals', (units, expected) => {
    expect(lengthDigits(units)).toBe(expected)
  })
})

describe('formatDiagonal', () => {
  it('shows whole diagonals without a decimal', () => {
    expect(formatDiagonal({ inches: 24, locale: 'en' })).toBe('24″')
  })

  it('shows fractional diagonals with one decimal, using a comma in Czech', () => {
    expect(formatDiagonal({ inches: 13.3, locale: 'en' })).toBe('13.3″')
    expect(formatDiagonal({ inches: 13.3, locale: 'cs' })).toBe('13,3″')
  })
})

describe('formatDisplayLabel', () => {
  it('joins the diagonal and the name', () => {
    expect(
      formatDisplayLabel({ display: { name: '4K UHD', diagonal: 32 }, locale: 'en' }),
    ).toBe('32″ 4K UHD')
  })

  it('falls back to the diagonal alone when there is no name', () => {
    expect(formatDisplayLabel({ display: { diagonal: 27 }, locale: 'en' })).toBe('27″')
  })
})
