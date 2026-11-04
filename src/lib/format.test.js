import { describe, expect, it } from 'vitest'
import {
  formatArea,
  formatAspect,
  formatDegrees,
  formatLength,
  formatNumber,
  formatResolution,
  formatScale,
  formatSignedNumber,
  formatSignedPercent,
} from './format.js'

const NBSP = ' '
const MINUS = '−'
const TIMES = '×'

/**
 * Reference output straight from Intl, so tests do not hardcode the locale's
 * group separator (a space-like character that differs between ICU versions).
 */
const intl = ({ locale, digits = 0, value }) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)

describe('formatNumber', () => {
  it('formats English with a point decimal and comma grouping', () => {
    expect(formatNumber({ value: 1234.5, locale: 'en', digits: 1 })).toBe('1,234.5')
  })

  it('formats Czech with a decimal comma and the locale group separator', () => {
    expect(formatNumber({ value: 1234.5, locale: 'cs', digits: 1 })).toBe(
      intl({ locale: 'cs', digits: 1, value: 1234.5 }),
    )
    expect(formatNumber({ value: 1234.5, locale: 'cs', digits: 1 })).toContain(',')
  })

  it('rounds half away from zero before formatting', () => {
    expect(formatNumber({ value: 2.5, locale: 'en' })).toBe('3')
    expect(formatNumber({ value: 1.005, locale: 'en', digits: 2 })).toBe('1.01')
  })

  it('uses the real minus sign U+2212 for negatives', () => {
    const text = formatNumber({ value: -58, locale: 'en' })
    expect(text).toBe(`${MINUS}58`)
    expect(text).not.toContain('-')
    expect(formatNumber({ value: -1234.5, locale: 'cs', digits: 1 })).toContain(MINUS)
  })

  it('never prints a negative zero', () => {
    expect(formatNumber({ value: -0.4, locale: 'en' })).toBe('0')
    expect(formatNumber({ value: -0, locale: 'en' })).toBe('0')
  })

  it('pads to the requested number of decimals', () => {
    expect(formatNumber({ value: 3, locale: 'en', digits: 2 })).toBe('3.00')
  })

  it('shows an em dash for values that are not finite numbers', () => {
    expect(formatNumber({ value: NaN, locale: 'en' })).toBe('—')
    expect(formatNumber({ value: Infinity, locale: 'cs' })).toBe('—')
  })
})

describe('formatSignedPercent', () => {
  it('prefixes positive values with + and separates the % with NBSP', () => {
    expect(formatSignedPercent({ ratio: 0.02, locale: 'en', sameLabel: 'same' })).toBe(
      `+2${NBSP}%`,
    )
  })

  it('uses the minus sign and NBSP for negative values', () => {
    expect(formatSignedPercent({ ratio: -0.58, locale: 'en', sameLabel: 'same' })).toBe(
      `${MINUS}58${NBSP}%`,
    )
  })

  it('uses the Czech decimal and label conventions', () => {
    expect(formatSignedPercent({ ratio: -0.58, locale: 'cs', sameLabel: 'stejné' })).toBe(
      `${MINUS}58${NBSP}%`,
    )
    expect(formatSignedPercent({ ratio: 0, locale: 'cs', sameLabel: 'stejné' })).toBe(
      'stejné',
    )
  })

  it('returns the same label when the value rounds to 0 percent', () => {
    expect(formatSignedPercent({ ratio: 0, locale: 'en', sameLabel: 'same' })).toBe(
      'same',
    )
    expect(formatSignedPercent({ ratio: 0.004, locale: 'en', sameLabel: 'same' })).toBe(
      'same',
    )
    expect(formatSignedPercent({ ratio: -0.0049, locale: 'en', sameLabel: 'same' })).toBe(
      'same',
    )
  })

  it('never prints +0 % or a minus zero', () => {
    const text = formatSignedPercent({ ratio: -0.001, locale: 'en', sameLabel: 'same' })
    expect(text).not.toMatch(/[+−]0/)
  })

  it('rounds a half percent away from zero', () => {
    expect(formatSignedPercent({ ratio: 0.005, locale: 'en', sameLabel: 'same' })).toBe(
      `+1${NBSP}%`,
    )
  })

  it('falls back to a plain zero when no same label is given', () => {
    expect(formatSignedPercent({ ratio: 0, locale: 'en' })).toBe(`0${NBSP}%`)
  })

  it('shows an em dash for values that are not finite numbers', () => {
    expect(formatSignedPercent({ ratio: NaN, locale: 'en', sameLabel: 'same' })).toBe('—')
  })
})

describe('formatSignedNumber', () => {
  it('prefixes positive values with + and negatives with the real minus', () => {
    expect(formatSignedNumber({ value: 2, locale: 'en', sameLabel: 'same' })).toBe('+2')
    expect(formatSignedNumber({ value: -58, locale: 'en', sameLabel: 'same' })).toBe(
      `${MINUS}58`,
    )
  })

  it('has no space after the sign', () => {
    expect(formatSignedNumber({ value: 2, locale: 'en', sameLabel: 'same' })).not.toMatch(
      /\s/,
    )
  })

  it('returns the same label for values that round to zero', () => {
    expect(formatSignedNumber({ value: 0, locale: 'en', sameLabel: 'same' })).toBe('same')
    expect(formatSignedNumber({ value: 0.4, locale: 'en', sameLabel: 'same' })).toBe(
      'same',
    )
    expect(formatSignedNumber({ value: -0.4, locale: 'en', sameLabel: 'same' })).toBe(
      'same',
    )
  })

  it('rounds to the requested digits before deciding on zero', () => {
    expect(
      formatSignedNumber({ value: 0.04, locale: 'en', sameLabel: 'same', digits: 1 }),
    ).toBe('same')
    expect(
      formatSignedNumber({ value: 0.06, locale: 'en', sameLabel: 'same', digits: 1 }),
    ).toBe('+0.1')
  })

  it('formats Czech decimals with a comma', () => {
    expect(
      formatSignedNumber({ value: -0.6, locale: 'cs', sameLabel: 'stejné', digits: 1 }),
    ).toBe(`${MINUS}0,6`)
  })

  it('uses the locale grouping for large values', () => {
    expect(formatSignedNumber({ value: 1234, locale: 'cs', sameLabel: 'x' })).toBe(
      `+${intl({ locale: 'cs', value: 1234 })}`,
    )
  })

  it('falls back to a plain zero when no same label is given', () => {
    expect(formatSignedNumber({ value: 0, locale: 'en' })).toBe('0')
  })

  it('shows an em dash for values that are not finite numbers', () => {
    expect(formatSignedNumber({ value: NaN, locale: 'en', sameLabel: 'same' })).toBe('—')
  })
})

describe('formatResolution', () => {
  it('joins width and height with a spaced times sign U+00D7', () => {
    expect(formatResolution({ width: 3840, height: 2160 })).toBe(`3840 ${TIMES} 2160`)
  })

  it('rounds both sides to tens when roundTo is 10', () => {
    expect(formatResolution({ width: 3072, height: 1728, roundTo: 10 })).toBe(
      `3070 ${TIMES} 1730`,
    )
  })

  it('keeps exact values when roundTo is 1', () => {
    expect(formatResolution({ width: 3072, height: 1728, roundTo: 1 })).toBe(
      `3072 ${TIMES} 1728`,
    )
  })

  it('does not use grouping (the same in every locale)', () => {
    expect(formatResolution({ width: 5120, height: 1440 })).toBe(`5120 ${TIMES} 1440`)
  })

  it('shows an em dash when a side is not a finite number', () => {
    expect(formatResolution({ width: NaN, height: 1080 })).toBe('—')
  })
})

describe('formatScale', () => {
  it('shows the scale factor as a percentage with NBSP before %', () => {
    expect(formatScale({ scale: 1.25, locale: 'en' })).toBe(`125${NBSP}%`)
    expect(formatScale({ scale: 1, locale: 'en' })).toBe(`100${NBSP}%`)
    expect(formatScale({ scale: 2, locale: 'en' })).toBe(`200${NBSP}%`)
  })

  it('rounds to an integer percent, so 1.1 reads as 110 %', () => {
    expect(formatScale({ scale: 1.1, locale: 'en' })).toBe(`110${NBSP}%`)
    expect(formatScale({ scale: 1.333, locale: 'en' })).toBe(`133${NBSP}%`)
  })

  it('works the same in Czech', () => {
    expect(formatScale({ scale: 1.25, locale: 'cs' })).toBe(`125${NBSP}%`)
  })

  it('shows an em dash for values that are not finite numbers', () => {
    expect(formatScale({ scale: NaN, locale: 'en' })).toBe('—')
  })
})

describe('formatLength', () => {
  it('shows centimetres with NBSP before the unit', () => {
    expect(formatLength({ inches: 60 / 2.54, units: 'metric', locale: 'en' })).toBe(
      `60${NBSP}cm`,
    )
  })

  it('shows inches with one decimal when asked', () => {
    expect(
      formatLength({ inches: 60 / 2.54, units: 'imperial', locale: 'en', digits: 1 }),
    ).toBe(`23.6${NBSP}in`)
  })

  it('uses a decimal comma in Czech', () => {
    expect(
      formatLength({ inches: 60 / 2.54, units: 'imperial', locale: 'cs', digits: 1 }),
    ).toBe(`23,6${NBSP}in`)
  })

  it('rounds to whole units by default', () => {
    expect(formatLength({ inches: 27, units: 'imperial', locale: 'en' })).toBe(
      `27${NBSP}in`,
    )
    expect(formatLength({ inches: 27.4, units: 'metric', locale: 'en' })).toBe(
      `70${NBSP}cm`,
    )
  })

  it('shows an em dash for values that are not finite numbers', () => {
    expect(formatLength({ inches: NaN, units: 'metric', locale: 'en' })).toBe('—')
  })
})

describe('formatArea', () => {
  it('shows square decimetres for metric', () => {
    expect(
      formatArea({ squareInches: 49 / 0.064516, units: 'metric', locale: 'en' }),
    ).toBe(`49${NBSP}dm²`)
  })

  it('shows square inches for imperial', () => {
    expect(formatArea({ squareInches: 757, units: 'imperial', locale: 'en' })).toBe(
      `757${NBSP}in²`,
    )
  })

  it('uses the locale grouping for large values', () => {
    expect(formatArea({ squareInches: 2000, units: 'imperial', locale: 'cs' })).toBe(
      `${intl({ locale: 'cs', value: 2000 })}${NBSP}in²`,
    )
  })

  it('shows an em dash for values that are not finite numbers', () => {
    expect(formatArea({ squareInches: NaN, units: 'metric', locale: 'en' })).toBe('—')
  })
})

describe('formatDegrees', () => {
  it('shows one decimal and the degree sign without a space', () => {
    expect(formatDegrees({ value: 45.2, locale: 'en' })).toBe('45.2°')
  })

  it('uses a decimal comma in Czech', () => {
    expect(formatDegrees({ value: 45.2, locale: 'cs' })).toBe('45,2°')
  })

  it('keeps the trailing zero and the minus sign', () => {
    expect(formatDegrees({ value: 0, locale: 'en' })).toBe('0.0°')
    expect(formatDegrees({ value: -3.46, locale: 'en' })).toBe(`${MINUS}3.5°`)
  })

  it('shows an em dash for values that are not finite numbers', () => {
    expect(formatDegrees({ value: NaN, locale: 'en' })).toBe('—')
  })
})

describe('formatAspect', () => {
  it('returns a plain label for exact aspects', () => {
    expect(formatAspect({ label: '16:9', isApprox: false, isMapped: true })).toBe('16:9')
  })

  it('wraps approximate labels in typographic double quotes', () => {
    expect(formatAspect({ label: '21:9', isApprox: true, isMapped: true })).toBe('“21:9”')
  })

  it('returns unmapped ratios unchanged', () => {
    expect(formatAspect({ label: '1.55:1', isApprox: false, isMapped: false })).toBe(
      '1.55:1',
    )
  })

  it('returns an empty string when there is no aspect', () => {
    expect(formatAspect(undefined)).toBe('')
  })
})
