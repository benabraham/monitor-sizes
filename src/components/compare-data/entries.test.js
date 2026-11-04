import { describe, expect, it } from 'vitest'
import { entryKind, isSameScale, sortBaselineFirst, workspaceAtScale } from './entries.js'

describe('sortBaselineFirst', () => {
  it('moves the baseline to the front and keeps the order of the rest', () => {
    const a = { id: 'a' }
    const b = { id: 'b', isBaseline: true }
    const c = { id: 'c', isFamiliar: true }
    const d = { id: 'd' }
    expect(sortBaselineFirst([a, c, b, d]).map(({ id }) => id)).toEqual([
      'b',
      'a',
      'c',
      'd',
    ])
  })

  it('returns an empty list for a missing input and a new array otherwise', () => {
    expect(sortBaselineFirst(undefined)).toEqual([])
    const input = [{ id: 'a' }]
    expect(sortBaselineFirst(input)).not.toBe(input)
  })
})

describe('entryKind', () => {
  it('prefers baseline over familiar, and familiar over candidate', () => {
    expect(entryKind({ isBaseline: true, isFamiliar: true })).toBe('baseline')
    expect(entryKind({ isFamiliar: true })).toBe('familiar')
    expect(entryKind({})).toBe('candidate')
  })
})

describe('isSameScale', () => {
  it('compares factors with float tolerance and rejects missing values', () => {
    expect(isSameScale(1.25, 1.25 + 1e-9)).toBe(true)
    expect(isSameScale(1.25, 1.5)).toBe(false)
    expect(isSameScale(undefined, 1)).toBe(false)
    expect(isSameScale(1, null)).toBe(false)
  })
})

describe('workspaceAtScale', () => {
  const display = { width: 3840, height: 2160 }

  it('uses the matching matrix row when there is one', () => {
    const entry = {
      display,
      scale: 1.5,
      matrix: [{ scale: 1.5, workspaceMegapixels: 3.7 }],
    }
    expect(workspaceAtScale(entry)).toBe(3.7)
  })

  it('computes the logical area when no matrix row matches', () => {
    const entry = { display, scale: 1.5, matrix: [] }
    expect(workspaceAtScale(entry)).toBeCloseTo((2560 * 1440) / 1e6, 10)
  })
})
