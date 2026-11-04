import { describe, expect, it } from 'vitest'
import { clamp, gcd, round } from './math.js'

describe('round', () => {
  it('rounds half away from zero like Google Sheets', () => {
    expect(round({ value: 2.5 })).toBe(3)
    expect(round({ value: -2.5 })).toBe(-3)
    expect(round({ value: 0.5 })).toBe(1)
    expect(round({ value: -0.5 })).toBe(-1)
  })

  it('supports decimal digits', () => {
    expect(round({ value: 8.2944, digits: 1 })).toBe(8.3)
    expect(round({ value: 1.005, digits: 2 })).toBe(1.01)
  })

  it('supports negative digits (round to tens)', () => {
    expect(round({ value: 3072, digits: -1 })).toBe(3070)
    expect(round({ value: 1728, digits: -1 })).toBe(1730)
    expect(round({ value: 3490.9, digits: -1 })).toBe(3490)
  })

  it('never returns -0', () => {
    expect(Object.is(round({ value: -0.0001 }), 0)).toBe(true)
  })

  it('passes non-finite values through', () => {
    expect(round({ value: Infinity })).toBe(Infinity)
    expect(round({ value: NaN })).toBeNaN()
  })
})

describe('gcd', () => {
  it('computes the greatest common divisor', () => {
    expect(gcd(3840, 2160)).toBe(240)
    expect(gcd(3440, 1440)).toBe(80)
    expect(gcd(7, 0)).toBe(7)
  })
})

describe('clamp', () => {
  it('clamps into the range', () => {
    expect(clamp({ value: 5, min: 0, max: 3 })).toBe(3)
    expect(clamp({ value: -1, min: 0, max: 3 })).toBe(0)
    expect(clamp({ value: 2, min: 0, max: 3 })).toBe(2)
  })
})
