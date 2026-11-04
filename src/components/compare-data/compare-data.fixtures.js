/**
 * Test fixtures for the Compare data components. Built with the real calc
 * functions on displays from `src/data/seed.json`, so the tests see the same shape
 * the store produces (CompareEntry, see docs/ARCHITECTURE.md).
 *
 * Test-only: imported by `*.test.jsx` files, never by the app.
 *
 * @module components/compare-data/compare-data.fixtures
 */

import seed from '../../data/seed.json'
import {
  getAngularMetrics,
  getBestScale,
  getDisplayMetrics,
  getEquivalentDistances,
  getRelativeMetrics,
  getScaleOptions,
  getScalingMatrix,
} from '../../lib/calc/index.js'

/** Comfort window of the sheet: 90 to 105 PPI, logical width at least 1024 px. */
export const COMFORT = Object.freeze({
  mode: 'ppi',
  minPpi: 90,
  maxPpi: 105,
  minPpd: 37,
  maxPpd: 43,
  minWidth: 1024,
})

/** 60 cm in inches, the monitor default. */
export const SIXTY_CM = 60 / 2.54

/**
 * Find a built-in display by id.
 *
 * @param {string} id Seed id, e.g. `'42-3840x2160'`.
 * @returns {{ id: string, name: string, diagonal: number, width: number, height: number }}
 * @throws {Error} When the id is not in the seed (a broken fixture).
 */
export const findDisplay = (id) => {
  const display = seed.find((item) => item.id === id)
  if (!display) throw new Error(`Fixture display not in seed: ${id}`)
  return display
}

/**
 * Build one CompareEntry from a display and its settings.
 *
 * @param {object} params
 * @param {object} params.spec `{ id, distance, scale, isFamiliar? }`, distance in inches.
 * @param {object | null} params.baseline The active baseline's CompareEntry, or null
 *   when there is none. For the baseline itself the relative values are zero and the
 *   equivalents null, as in the store.
 * @param {boolean} params.isBaseline
 * @param {string} params.presetId
 * @param {object} params.comfort
 * @returns {object} CompareEntry.
 */
const buildEntry = ({ spec, baseline, isBaseline, presetId, comfort }) => {
  const display = findDisplay(spec.id)
  const metrics = getDisplayMetrics(display)
  const scaleOptions = getScaleOptions({ display, presetId })
  const matrix = getScalingMatrix({
    display,
    metrics,
    scaleOptions,
    comfort,
    distance: spec.distance,
  })
  const referenceMetrics = isBaseline ? metrics : baseline?.metrics
  const relative = referenceMetrics
    ? getRelativeMetrics({ metrics, baselineMetrics: referenceMetrics })
    : null
  const equivalent =
    baseline && !isBaseline
      ? getEquivalentDistances({
          baseline: {
            metrics: baseline.metrics,
            distance: baseline.distance,
            scale: baseline.scale,
          },
          candidate: { metrics, scale: spec.scale },
        })
      : null

  return {
    display,
    metrics,
    relative,
    distance: spec.distance,
    scale: spec.scale,
    angular: getAngularMetrics({ metrics, distance: spec.distance, scale: spec.scale }),
    equivalent,
    matrix,
    bestScale: getBestScale({ rows: matrix, comfort }),
    isFamiliar: Boolean(spec.isFamiliar),
    isBaseline,
  }
}

/**
 * Build the entries of a comparison, baseline first.
 *
 * @param {object} params
 * @param {object} params.baseline `{ id, distance, scale, isFamiliar? }`.
 * @param {object[]} [params.candidates=[]] Same shape as `baseline`.
 * @param {string} [params.presetId='windows']
 * @param {object} [params.comfort=COMFORT]
 * @returns {object[]} CompareEntry objects, the baseline first.
 *
 * @example
 * const entries = buildComparison({
 *   baseline: { id: '42-3840x2160', distance: SIXTY_CM, scale: 1, isFamiliar: true },
 *   candidates: [{ id: '27-3840x2160', distance: SIXTY_CM, scale: 1.5 }],
 * })
 */
export const buildComparison = ({
  baseline,
  candidates = [],
  presetId = 'windows',
  comfort = COMFORT,
}) => {
  const baselineSpec = { ...baseline, isFamiliar: baseline.isFamiliar ?? true }
  const baselineEntry = buildEntry({
    spec: baselineSpec,
    baseline: null,
    isBaseline: true,
    presetId,
    comfort,
  })
  const candidateEntries = candidates.map((spec) =>
    buildEntry({ spec, baseline: baselineEntry, isBaseline: false, presetId, comfort }),
  )
  return [baselineEntry, ...candidateEntries]
}
