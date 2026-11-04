import { describe, expect, it } from 'vitest'
import { clearedFilters, hasActiveFilters, toggleListValue } from './browse-filters.js'

describe('clearedFilters', () => {
  it('returns the empty filter state', () => {
    expect(clearedFilters()).toEqual({
      search: '',
      tags: [],
      aspects: [],
      minDiagonal: null,
      maxDiagonal: null,
      onlyComfortable: false,
    })
  })

  it('returns a new object each time, so callers cannot share arrays', () => {
    const first = clearedFilters()
    first.tags.push('laptop')
    expect(clearedFilters().tags).toEqual([])
  })
})

describe('hasActiveFilters', () => {
  it('is false for the cleared state and for a blank search', () => {
    expect(hasActiveFilters(clearedFilters())).toBe(false)
    expect(hasActiveFilters({ ...clearedFilters(), search: '   ' })).toBe(false)
  })

  it.each([
    ['a search', { search: 'dell' }],
    ['a tag', { tags: ['laptop'] }],
    ['an aspect', { aspects: ['16:9'] }],
    ['a minimum diagonal', { minDiagonal: 24 }],
    ['a maximum diagonal', { maxDiagonal: 32 }],
    ['the comfort toggle', { onlyComfortable: true }],
  ])('is true with %s', (_label, partial) => {
    expect(hasActiveFilters({ ...clearedFilters(), ...partial })).toBe(true)
  })

  it('treats a zero bound as set and a missing filter object as inactive', () => {
    expect(hasActiveFilters({ ...clearedFilters(), minDiagonal: 0 })).toBe(true)
    expect(hasActiveFilters(undefined)).toBe(false)
  })
})

describe('toggleListValue', () => {
  it('adds a missing value at the end', () => {
    expect(toggleListValue({ list: ['laptop'], value: 'monitor' })).toEqual([
      'laptop',
      'monitor',
    ])
  })

  it('removes a present value and keeps the order of the rest', () => {
    expect(
      toggleListValue({ list: ['laptop', 'monitor', 'ultrawide'], value: 'monitor' }),
    ).toEqual(['laptop', 'ultrawide'])
  })

  it('does not mutate the list it is given', () => {
    const list = ['laptop']
    toggleListValue({ list, value: 'laptop' })
    expect(list).toEqual(['laptop'])
  })
})
