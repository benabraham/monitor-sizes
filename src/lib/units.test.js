import { describe, expect, it } from 'vitest'
import {
  CM_PER_INCH,
  DEFAULT_DISTANCE,
  areaUnitLabel,
  cmToIn,
  defaultDistanceFor,
  fromDisplayLength,
  inToCm,
  lengthUnitLabel,
  toDisplayArea,
  toDisplayLength,
} from './units.js'

describe('CM_PER_INCH', () => {
  it('is the exact international inch', () => {
    expect(CM_PER_INCH).toBe(2.54)
  })
})

describe('cmToIn / inToCm', () => {
  it('converts between centimetres and inches', () => {
    expect(cmToIn(2.54)).toBeCloseTo(1, 12)
    expect(inToCm(1)).toBeCloseTo(2.54, 12)
    expect(inToCm(cmToIn(60))).toBeCloseTo(60, 12)
  })
})

describe('toDisplayLength', () => {
  it('returns centimetres for metric', () => {
    expect(toDisplayLength({ inches: 1, units: 'metric' })).toBeCloseTo(2.54, 12)
  })

  it('returns inches unchanged for imperial', () => {
    expect(toDisplayLength({ inches: 23.5, units: 'imperial' })).toBe(23.5)
  })

  it('treats any unknown unit system as metric', () => {
    expect(toDisplayLength({ inches: 1, units: 'bogus' })).toBeCloseTo(2.54, 12)
  })
})

describe('fromDisplayLength', () => {
  it('reads centimetres as canonical inches for metric', () => {
    expect(fromDisplayLength({ value: 2.54, units: 'metric' })).toBeCloseTo(1, 12)
  })

  it('reads inches unchanged for imperial', () => {
    expect(fromDisplayLength({ value: 3, units: 'imperial' })).toBe(3)
  })

  it('is the inverse of toDisplayLength', () => {
    const samples = [0.5, 13.3, 23.622047, 32, 55.5]
    const systems = ['metric', 'imperial']
    samples.forEach((inches) => {
      systems.forEach((units) => {
        const shown = toDisplayLength({ inches, units })
        expect(fromDisplayLength({ value: shown, units })).toBeCloseTo(inches, 12)
      })
    })
  })

  it('never accumulates rounding when switching units back and forth', () => {
    const start = 23.622047244094
    let current = start
    for (let index = 0; index < 1000; index += 1) {
      const shown = toDisplayLength({ inches: current, units: 'metric' })
      current = fromDisplayLength({ value: shown, units: 'metric' })
    }
    expect(current).toBeCloseTo(start, 10)
  })
})

describe('toDisplayArea', () => {
  it('converts square inches to square decimetres for metric', () => {
    // 1 in² = 6.4516 cm² = 0.064516 dm²
    expect(toDisplayArea({ squareInches: 1, units: 'metric' })).toBeCloseTo(0.064516, 12)
    expect(toDisplayArea({ squareInches: 100, units: 'metric' })).toBeCloseTo(6.4516, 10)
  })

  it('returns square inches unchanged for imperial', () => {
    expect(toDisplayArea({ squareInches: 757, units: 'imperial' })).toBe(757)
  })

  it('agrees with the length conversion (area = length²)', () => {
    const squareInches = 16 * 9
    const sideCm = inToCm(Math.sqrt(squareInches))
    expect(toDisplayArea({ squareInches, units: 'metric' })).toBeCloseTo(
      (sideCm * sideCm) / 100,
      10,
    )
  })
})

describe('unit labels', () => {
  it('labels lengths', () => {
    expect(lengthUnitLabel('metric')).toBe('cm')
    expect(lengthUnitLabel('imperial')).toBe('in')
  })

  it('labels areas', () => {
    expect(areaUnitLabel('metric')).toBe('dm²')
    expect(areaUnitLabel('imperial')).toBe('in²')
  })

  it('falls back to metric labels for unknown units', () => {
    expect(lengthUnitLabel('bogus')).toBe('cm')
    expect(areaUnitLabel('bogus')).toBe('dm²')
  })
})

describe('DEFAULT_DISTANCE', () => {
  it('is 60 cm for monitors and 45 cm for laptops, in inches', () => {
    expect(DEFAULT_DISTANCE.monitor).toBeCloseTo(60 / 2.54, 12)
    expect(DEFAULT_DISTANCE.laptop).toBeCloseTo(45 / 2.54, 12)
  })

  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_DISTANCE)).toBe(true)
  })
})

describe('defaultDistanceFor', () => {
  it('uses 45 cm for laptops', () => {
    const inches = defaultDistanceFor({ tag: 'laptop' })
    expect(toDisplayLength({ inches, units: 'metric' })).toBeCloseTo(45, 10)
  })

  it('uses 60 cm for monitors, ultrawides and untagged displays', () => {
    const displays = [{ tag: 'monitor' }, { tag: 'ultrawide' }, {}]
    displays.forEach((display) => {
      const inches = defaultDistanceFor(display)
      expect(toDisplayLength({ inches, units: 'metric' })).toBeCloseTo(60, 10)
    })
  })

  it('returns the matching DEFAULT_DISTANCE value', () => {
    expect(defaultDistanceFor({ tag: 'laptop' })).toBe(DEFAULT_DISTANCE.laptop)
    expect(defaultDistanceFor({ tag: 'monitor' })).toBe(DEFAULT_DISTANCE.monitor)
  })
})
