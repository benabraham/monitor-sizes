import { describe, expect, it } from 'vitest'
import {
  DISPLAY_GROUPS,
  formatDiagonal,
  groupDisplays,
  matchesQuery,
  withCurrentScale,
} from './onboarding-model.js'

const FOUR_K = {
  id: 'a',
  name: '4K 27″',
  diagonal: 27,
  width: 3840,
  height: 2160,
  tag: 'monitor',
}
const MBP = {
  id: 'b',
  name: 'MacBook Pro 14″',
  diagonal: 14.2,
  width: 3024,
  height: 1964,
  tag: 'laptop',
}
const UW = {
  id: 'c',
  name: 'UW 34″',
  diagonal: 34,
  width: 3440,
  height: 1440,
  tag: 'ultrawide',
}
const UNTAGGED = { id: 'd', name: 'Old panel', diagonal: 24, width: 1920, height: 1080 }

describe('DISPLAY_GROUPS', () => {
  it('lists laptops, monitors and ultrawides in that order', () => {
    expect(DISPLAY_GROUPS.map(({ key }) => key)).toEqual([
      'laptops',
      'monitors',
      'ultrawides',
    ])
  })
})

describe('groupDisplays', () => {
  it('sorts displays by tag and puts untagged displays among the monitors', () => {
    const groups = groupDisplays([FOUR_K, MBP, UW, UNTAGGED])
    expect(groups.laptops).toEqual([MBP])
    expect(groups.monitors).toEqual([FOUR_K, UNTAGGED])
    expect(groups.ultrawides).toEqual([UW])
  })

  it('keeps empty groups as empty arrays', () => {
    expect(groupDisplays([FOUR_K])).toEqual({
      laptops: [],
      monitors: [FOUR_K],
      ultrawides: [],
    })
    expect(groupDisplays([])).toEqual({ laptops: [], monitors: [], ultrawides: [] })
  })
})

describe('formatDiagonal', () => {
  it.each([
    [27, 'en', '27'],
    [14.2, 'en', '14.2'],
    [14.2, 'cs', '14,2'],
  ])('formats %d in %s as %s', (diagonal, locale, expected) => {
    expect(formatDiagonal({ diagonal, locale })).toBe(expected)
  })
})

describe('matchesQuery', () => {
  it('matches everything for an empty or blank query', () => {
    expect(matchesQuery({ display: FOUR_K, query: '  ', locale: 'en' })).toBe(true)
  })

  it('matches the name, ignoring case', () => {
    expect(matchesQuery({ display: MBP, query: 'macbook', locale: 'en' })).toBe(true)
    expect(matchesQuery({ display: MBP, query: 'dell', locale: 'en' })).toBe(false)
  })

  it('matches the diagonal and the resolution', () => {
    expect(matchesQuery({ display: FOUR_K, query: '27', locale: 'en' })).toBe(true)
    expect(matchesQuery({ display: FOUR_K, query: '3840 × 2160', locale: 'en' })).toBe(
      true,
    )
    expect(matchesQuery({ display: MBP, query: '14,2', locale: 'cs' })).toBe(true)
    expect(matchesQuery({ display: MBP, query: '14,2', locale: 'en' })).toBe(false)
  })
})

describe('withCurrentScale', () => {
  it('returns the options unchanged when they include the scale', () => {
    const options = [{ scale: 1 }, { scale: 1.5 }]
    expect(withCurrentScale({ options, scale: 1.5 })).toEqual(options)
  })

  it('adds a missing scale in sorted position', () => {
    expect(
      withCurrentScale({ options: [{ scale: 1 }, { scale: 1.5 }], scale: 1.25 }),
    ).toEqual([{ scale: 1 }, { scale: 1.25 }, { scale: 1.5 }])
  })

  it('handles an empty option list', () => {
    expect(withCurrentScale({ options: [], scale: 1 })).toEqual([{ scale: 1 }])
  })
})
