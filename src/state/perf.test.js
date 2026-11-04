import { describe, expect, it } from 'vitest'
import { locale } from '../i18n/index.js'
import { createStore } from './store.js'

/**
 * Performance budget (PRD, Non-functional): recalculating 200 displays after any input
 * takes under 16 ms. The median of 20 runs is compared with the budget, after a warm-up.
 */
const BUDGET_MS = 16
const RUNS = 20

const WIDTHS = [1280, 1366, 1600, 1920, 2560, 3440, 3840, 5120, 6016, 7680]
const HEIGHTS = [720, 768, 900, 1080, 1440, 1600, 2160, 2880, 3384, 4320]

/** 200 generated displays with varied sizes, tags and names. */
const GENERATED = Array.from({ length: 200 }, (_, index) => ({
  id: `gen-${index}`,
  name: `Display ${index} ${index % 3 === 0 ? 'česká řada' : 'panel'}`,
  diagonal: 13 + (index % 60) * 0.7,
  width: WIDTHS[index % WIDTHS.length],
  height: HEIGHTS[index % HEIGHTS.length],
  ...(index % 4 === 0 ? { tag: 'laptop' } : {}),
}))

/**
 * @param {number[]} values
 * @returns {number}
 */
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

/**
 * A hydrated store over the generated seed, with a baseline and eight candidates
 * (the practical Compare limit, F10).
 *
 * @returns {Promise<ReturnType<typeof createStore>>}
 */
const createLoadedStore = async () => {
  locale.value = 'en'
  const store = createStore({
    seed: GENERATED,
    storage: {
      loadPersisted: async () => ({
        customDisplays: [],
        hiddenBuiltInIds: [],
        familiar: [],
        baselineId: null,
        preferences: {},
        isOnboarded: false,
      }),
      savePersisted: async () => {},
    },
    location: { hash: '' },
    history: { replaceState: () => {} },
    detectPreset: () => 'windows',
    detectLang: () => 'en',
  })
  await store.hydrate()
  store.toggleFamiliar('gen-0')
  store.toggleFamiliar('gen-1')
  for (let index = 2; index < 10; index += 1) store.toggleCompare(`gen-${index}`)
  store.browseRows.value
  store.compareEntries.value
  return store
}

/**
 * Time one change and the read that follows it.
 *
 * @param {() => void} change
 * @param {() => unknown} read
 * @returns {number} Milliseconds.
 */
const timeChange = ({ change, read }) => {
  const start = performance.now()
  change()
  read()
  return performance.now() - start
}

describe('performance: recalculating 200 displays', () => {
  it('stays under 16 ms after a filter change (median of 20)', async () => {
    const store = await createLoadedStore()
    const samples = Array.from({ length: RUNS }, (_, index) =>
      timeChange({
        change: () => store.setFilters({ search: index % 2 === 0 ? 'panel' : 'česká' }),
        read: () => store.browseRows.value.length,
      }),
    )
    store.dispose()
    expect(median(samples)).toBeLessThan(BUDGET_MS)
  })

  it('stays under 16 ms after a baseline distance change (median of 20)', async () => {
    const store = await createLoadedStore()
    const samples = Array.from({ length: RUNS }, (_, index) =>
      timeChange({
        change: () =>
          store.setFamiliarSettings({ id: 'gen-0', distance: 20 + (index % 5) }),
        read: () => {
          store.browseRows.value.length
          store.compareEntries.value.length
        },
      }),
    )
    store.dispose()
    expect(median(samples)).toBeLessThan(BUDGET_MS)
  })
})
