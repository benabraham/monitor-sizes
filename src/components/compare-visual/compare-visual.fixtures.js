/**
 * Test fixtures for the Compare visualization. Builds CompareEntry objects with
 * the real calc functions, from displays of `src/data/seed.json` and one custom
 * display (the PRD's 24″ FHD worked example). Used by tests only.
 *
 * @module components/compare-visual/compare-visual.fixtures
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

/** Comfort window defaults (PRD F7): 90–105 PPI, logical width at least 1024 px. */
export const DEFAULT_COMFORT = Object.freeze({
  mode: 'ppi',
  minPpi: 90,
  maxPpi: 105,
  minPpd: 30,
  maxPpd: 60,
  minWidth: 1024,
})

/** Centimetres to inches. */
export const cm = (value) => value / 2.54

/**
 * A built-in display from the seed, by id.
 *
 * @param {string} id
 * @returns {{ id: string, name: string, diagonal: number, width: number, height: number, tag?: string }}
 * @throws {Error} When the id is not in the seed.
 */
export const findSeedDisplay = (id) => {
  const display = seed.find((candidate) => candidate.id === id)
  if (!display) throw new Error(`Unknown seed display: ${id}`)
  return display
}

/** The PRD worked example baseline: 24″ FHD, 92 PPI. Custom, so the seed stays as it is. */
export const FHD_24 = Object.freeze({
  id: 'fixture-24-fhd',
  name: 'FHD',
  diagonal: 24,
  width: 1920,
  height: 1080,
  tag: 'monitor',
})

/**
 * Build CompareEntry objects with the real calc functions.
 *
 * @param {object} params
 * @param {Array<{ display: object, distance: number, scale: number,
 *   isBaseline?: boolean, isFamiliar?: boolean }>} params.items Distance in inches.
 * @param {'windows'|'macos'|'linux'} [params.presetId='windows']
 * @param {'height'|'width'|'diagonal'} [params.sizeMatchBy='height']
 * @returns {object[]} CompareEntry objects in input order.
 *
 * @example
 * buildCompareEntries({
 *   items: [{ display: FHD_24, distance: cm(60), scale: 1, isBaseline: true }],
 * })
 */
export const buildCompareEntries = ({
  items,
  presetId = 'windows',
  sizeMatchBy = 'height',
}) => {
  const baselineItem = items.find((item) => item.isBaseline) ?? null
  const baselineMetrics = baselineItem ? getDisplayMetrics(baselineItem.display) : null
  return items.map((item) => {
    const metrics = getDisplayMetrics(item.display)
    const isBaseline = item === baselineItem
    const matrix = getScalingMatrix({
      display: item.display,
      metrics,
      scaleOptions: getScaleOptions({ display: item.display, presetId }),
      comfort: DEFAULT_COMFORT,
      distance: item.distance,
    })
    return {
      display: item.display,
      metrics,
      relative: baselineMetrics ? getRelativeMetrics({ metrics, baselineMetrics }) : null,
      distance: item.distance,
      scale: item.scale,
      angular: getAngularMetrics({ metrics, distance: item.distance, scale: item.scale }),
      equivalent:
        baselineItem && !isBaseline
          ? getEquivalentDistances({
              baseline: {
                metrics: baselineMetrics,
                distance: baselineItem.distance,
                scale: baselineItem.scale,
              },
              candidate: { metrics, scale: item.scale },
              sizeMatchBy,
            })
          : null,
      matrix,
      bestScale: getBestScale({ rows: matrix, comfort: DEFAULT_COMFORT }),
      isFamiliar: item.isFamiliar === true,
      isBaseline,
    }
  })
}

/**
 * The PRD worked example: 24″ FHD at 60 cm and 100 % (baseline) against 32″ 4K at
 * 150 %. Equivalent distances are 80 cm (same size), 40 cm (same sharpness) and
 * 60 cm (same text size).
 *
 * @param {object} [params]
 * @param {number} [params.candidateDistance=cm(80)] Distance of the candidate, inches.
 * @returns {object[]} Two CompareEntry objects, baseline first.
 */
export const workedExampleEntries = ({ candidateDistance = cm(80) } = {}) =>
  buildCompareEntries({
    items: [
      { display: FHD_24, distance: cm(60), scale: 1, isBaseline: true, isFamiliar: true },
      {
        display: findSeedDisplay('32-3840x2160'),
        distance: candidateDistance,
        scale: 1.5,
      },
    ],
  })

/**
 * A three-display comparison from the seed (plus the baseline), for rendering tests.
 *
 * @returns {object[]} CompareEntry objects, baseline first.
 */
export const threeDisplayEntries = () =>
  buildCompareEntries({
    items: [
      { display: FHD_24, distance: cm(60), scale: 1, isBaseline: true, isFamiliar: true },
      { display: findSeedDisplay('32-3840x2160'), distance: cm(80), scale: 1.5 },
      { display: findSeedDisplay('14-1920x1080'), distance: cm(45), scale: 1.25 },
    ],
  })

/**
 * A macOS comparison, so the scale options carry "looks like" widths.
 *
 * @returns {object[]} CompareEntry objects, baseline first.
 */
export const macosEntries = () =>
  buildCompareEntries({
    presetId: 'macos',
    items: [
      {
        display: findSeedDisplay('27-5120x2880'),
        distance: cm(60),
        scale: 1.25,
        isBaseline: true,
        isFamiliar: true,
      },
    ],
  })
