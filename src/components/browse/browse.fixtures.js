/**
 * Test fixtures for the Browse components. Displays come from the real seed
 * (`src/data/seed.json`), and every metric comes from the real calc functions,
 * so the tests see the same shapes the store will produce.
 *
 * Not used by the app: the coverage run includes this file because the tests
 * execute it.
 *
 * @module components/browse/browse.fixtures
 */

import seed from '../../data/seed.json'
import {
  getDisplayMetrics,
  getRelativeMetrics,
  getScaleOptions,
  getScalingMatrix,
  getBestScale,
} from '../../lib/calc/index.js'
import { defaultDistanceFor } from '../../lib/units.js'

/** Comfort window of the PRD defaults (PPI mode, 90–105, min width 1024). */
export const COMFORT = Object.freeze({
  mode: 'ppi',
  minPpi: 90,
  maxPpi: 105,
  minPpd: 37,
  maxPpd: 43,
  minWidth: 1024,
})

/** Baseline used by most tests: a 23.8″ Full HD monitor (92 PPI). */
export const BASELINE_ID = '23-8-1920x1080'

/**
 * Find a seed display by id. Throws for an unknown id, so a typo fails loudly.
 *
 * @param {string} id
 * @returns {{ id: string, name: string, diagonal: number, width: number, height: number, tag?: string }}
 */
export const findSeedDisplay = (id) => {
  const display = seed.find((entry) => entry.id === id)
  if (!display) throw new Error(`Unknown seed display: ${id}`)
  return display
}

/**
 * Build one BrowseRow from a display, the real calc functions and a baseline.
 *
 * @param {object} params
 * @param {object} params.display Display record.
 * @param {object|null} [params.baselineMetrics] Metrics of the baseline, or null for no baseline.
 * @param {'windows'|'macos'|'linux'} [params.presetId='windows']
 * @param {object} [params.comfort=COMFORT]
 * @param {boolean} [params.isFamiliar=false]
 * @param {boolean} [params.isBaseline=false]
 * @param {boolean} [params.isCompared=false]
 * @returns {import('./browse-format.js').BrowseRow}
 */
export const buildBrowseRow = ({
  display,
  baselineMetrics = null,
  presetId = 'windows',
  comfort = COMFORT,
  isFamiliar = false,
  isBaseline = false,
  isCompared = false,
}) => {
  const metrics = getDisplayMetrics(display)
  const matrix = getScalingMatrix({
    display,
    metrics,
    scaleOptions: getScaleOptions({ display, presetId }),
    comfort,
    distance: defaultDistanceFor(display),
  })
  return {
    display,
    metrics,
    relative: baselineMetrics ? getRelativeMetrics({ metrics, baselineMetrics }) : null,
    matrix,
    bestScale: getBestScale({ rows: matrix, comfort }),
    isFamiliar,
    isBaseline,
    isCompared,
  }
}

/**
 * Build the rows and the familiar rows for a set of seed displays.
 *
 * `baselineId` is always the reference: its metrics drive the relative values,
 * and it is marked `isBaseline` when it is in `ids`. `familiarIds` defaults to
 * the baseline alone.
 *
 * @param {object} [params]
 * @param {string[]} [params.ids=[BASELINE_ID, '27-3840x2160', '29-2560x1080']] Seed ids to show, in order.
 * @param {string} [params.baselineId=BASELINE_ID]
 * @param {string[]} [params.familiarIds] Familiar ids, in familiar order.
 * @param {string[]} [params.comparedIds=[]]
 * @param {'windows'|'macos'|'linux'} [params.presetId='windows']
 * @returns {{ rows: import('./browse-format.js').BrowseRow[], familiarRows: import('./browse-format.js').BrowseRow[] }}
 *
 * @example
 * const { rows, familiarRows } = buildBrowseFixture({ familiarIds: [BASELINE_ID] })
 */
export const buildBrowseFixture = ({
  ids = [BASELINE_ID, '27-3840x2160', '29-2560x1080'],
  baselineId = BASELINE_ID,
  familiarIds = [baselineId],
  comparedIds = [],
  presetId = 'windows',
} = {}) => {
  const baselineMetrics = getDisplayMetrics(findSeedDisplay(baselineId))
  const rows = ids.map((id) => {
    const display = findSeedDisplay(id)
    return buildBrowseRow({
      display,
      baselineMetrics,
      presetId,
      isFamiliar: familiarIds.includes(id),
      isBaseline: id === baselineId,
      isCompared: comparedIds.includes(id),
    })
  })
  const familiarRows = familiarIds
    .map((id) => rows.find((row) => row.display.id === id))
    .filter(Boolean)
  return { rows, familiarRows }
}

/**
 * Build `count` rows by cycling through the seed, with unique ids and slightly
 * different diagonals. Used for the 200-row performance test.
 *
 * @param {object} [params]
 * @param {number} [params.count=200]
 * @returns {import('./browse-format.js').BrowseRow[]}
 */
export const buildManyRows = ({ count = 200 } = {}) => {
  const baselineMetrics = getDisplayMetrics(findSeedDisplay(BASELINE_ID))
  return Array.from({ length: count }, (_, index) => {
    const base = seed[index % seed.length]
    const display = {
      ...base,
      id: `${base.id}-${index}`,
      diagonal: base.diagonal + (index % 5) / 10,
    }
    return buildBrowseRow({ display, baselineMetrics, isBaseline: false })
  })
}
