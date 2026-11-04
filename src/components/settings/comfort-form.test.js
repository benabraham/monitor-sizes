import { describe, expect, it } from 'vitest'
import {
  COMFORT_LIMITS,
  COMFORT_PAIRS,
  DEFAULT_COMFORT,
  isRangeOrdered,
  pickChangedKeys,
  toComfortDraft,
} from './comfort-form.js'

describe('DEFAULT_COMFORT', () => {
  it('is the PRD default window: PPI 90–105, PPD 37–43, width 1024 px', () => {
    expect(DEFAULT_COMFORT).toEqual({
      mode: 'ppi',
      minPpi: 90,
      maxPpi: 105,
      minPpd: 37,
      maxPpd: 43,
      minWidth: 1024,
    })
  })

  it('is frozen, so callers cannot change the shared defaults', () => {
    expect(Object.isFrozen(DEFAULT_COMFORT)).toBe(true)
  })
})

describe('COMFORT_LIMITS and COMFORT_PAIRS', () => {
  it('keeps every default inside its limits', () => {
    expect(DEFAULT_COMFORT.minPpi).toBeGreaterThanOrEqual(COMFORT_LIMITS.ppi.min)
    expect(DEFAULT_COMFORT.maxPpi).toBeLessThanOrEqual(COMFORT_LIMITS.ppi.max)
    expect(DEFAULT_COMFORT.minPpd).toBeGreaterThanOrEqual(COMFORT_LIMITS.ppd.min)
    expect(DEFAULT_COMFORT.maxPpd).toBeLessThanOrEqual(COMFORT_LIMITS.ppd.max)
    expect(DEFAULT_COMFORT.minWidth).toBeGreaterThanOrEqual(COMFORT_LIMITS.minWidth.min)
  })

  it('pairs the min and max keys of each rule', () => {
    expect(COMFORT_PAIRS.ppi).toEqual(['minPpi', 'maxPpi'])
    expect(COMFORT_PAIRS.ppd).toEqual(['minPpd', 'maxPpd'])
  })
})

describe('isRangeOrdered', () => {
  it.each([
    [90, 105, true],
    [105, 105, true],
    [110, 105, false],
  ])('isRangeOrdered(%i, %i) is %s', (min, max, expected) => {
    expect(isRangeOrdered({ min, max })).toBe(expected)
  })
})

describe('toComfortDraft', () => {
  it('copies the editable fields and drops mode', () => {
    expect(toComfortDraft({ comfort: { ...DEFAULT_COMFORT, mode: 'ppd' } })).toEqual({
      minPpi: 90,
      maxPpi: 105,
      minPpd: 37,
      maxPpd: 43,
      minWidth: 1024,
    })
  })
})

describe('pickChangedKeys', () => {
  const draft = toComfortDraft({ comfort: DEFAULT_COMFORT })

  it('returns only the keys whose draft value differs from the state', () => {
    expect(
      pickChangedKeys({
        draft: { ...draft, maxPpi: 110 },
        comfort: DEFAULT_COMFORT,
        keys: ['minPpi', 'maxPpi'],
      }),
    ).toEqual({ maxPpi: 110 })
  })

  it('returns an empty object when nothing changed', () => {
    expect(
      pickChangedKeys({ draft, comfort: DEFAULT_COMFORT, keys: ['minPpi', 'maxPpi'] }),
    ).toEqual({})
  })
})
