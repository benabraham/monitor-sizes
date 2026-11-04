import { describe, expect, it } from 'vitest'
import { getAspect } from './aspect.js'

describe('getAspect', () => {
  it('maps 16:9 exactly', () => {
    expect(getAspect({ width: 3840, height: 2160 })).toEqual({
      label: '16:9',
      isApprox: false,
      isMapped: true,
    })
  })

  it('maps 8:5 to 16:10', () => {
    expect(getAspect({ width: 2880, height: 1800 })).toEqual({
      label: '16:10',
      isApprox: false,
      isMapped: true,
    })
    expect(getAspect({ width: 2560, height: 1600 }).label).toBe('16:10')
    expect(getAspect({ width: 1920, height: 1200 }).label).toBe('16:10')
  })

  it('maps 7:3 to 21:9 exactly', () => {
    expect(getAspect({ width: 10080, height: 4320 })).toEqual({
      label: '21:9',
      isApprox: false,
      isMapped: true,
    })
  })

  it('maps 64:27 to an approximate 21:9', () => {
    expect(getAspect({ width: 2560, height: 1080 })).toEqual({
      label: '21:9',
      isApprox: true,
      isMapped: true,
    })
    expect(getAspect({ width: 5120, height: 2160 })).toEqual({
      label: '21:9',
      isApprox: true,
      isMapped: true,
    })
    expect(getAspect({ width: 7680, height: 3240 })).toEqual({
      label: '21:9',
      isApprox: true,
      isMapped: true,
    })
  })

  it('maps 43:18 to an approximate 21:9', () => {
    expect(getAspect({ width: 3440, height: 1440 })).toEqual({
      label: '21:9',
      isApprox: true,
      isMapped: true,
    })
  })

  it('maps 12:5 to 24:10', () => {
    expect(getAspect({ width: 3840, height: 1600 }).label).toBe('24:10')
    expect(getAspect({ width: 6144, height: 2560 }).label).toBe('24:10')
  })

  it('maps 32:9', () => {
    expect(getAspect({ width: 5120, height: 1440 }).label).toBe('32:9')
    expect(getAspect({ width: 7680, height: 2160 }).label).toBe('32:9')
  })

  it('maps 21:10 and 16:5 (no sheet row uses them)', () => {
    expect(getAspect({ width: 2100, height: 1000 })).toEqual({
      label: '21:10',
      isApprox: false,
      isMapped: true,
    })
    expect(getAspect({ width: 3200, height: 1000 })).toEqual({
      label: '32:10',
      isApprox: false,
      isMapped: true,
    })
  })

  it('labels unmapped MacBook ratios as a raw ratio, not mapped', () => {
    expect(getAspect({ width: 3456, height: 2234 })).toEqual({
      label: '1.55:1',
      isApprox: false,
      isMapped: false,
    })
    expect(getAspect({ width: 3024, height: 1964 }).label).toBe('1.54:1')
    expect(getAspect({ width: 2560, height: 1664 }).label).toBe('1.54:1')
    expect(getAspect({ width: 2880, height: 1864 }).label).toBe('1.55:1')
  })

  it('never reports an unmapped ratio as 16:9', () => {
    const aspect = getAspect({ width: 3456, height: 2234 })
    expect(aspect.label).not.toBe('16:9')
    expect(aspect.isMapped).toBe(false)
  })
})
