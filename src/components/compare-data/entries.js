/**
 * Pure helpers shared by the Compare data components: entry order, the entry's
 * kind for badges and styling, and scale comparisons (PRD: F10, F13, F21).
 *
 * @module components/compare-data/entries
 */

/** Two scale factors closer than this are the same scale (float noise). */
const SCALE_EPSILON = 1e-6

/**
 * @typedef {'baseline'|'familiar'|'candidate'} EntryKind
 */

/**
 * Put the baseline first, keeping the order of everything else (a stable sort).
 * Entries arrive baseline-first from the store, but the components guarantee it.
 *
 * @param {Array<{ isBaseline?: boolean }>} entries CompareEntry-like objects.
 * @returns {Array<object>} A new array. Empty when `entries` is not an array.
 *
 * @example
 * sortBaselineFirst([{ isBaseline: false }, { isBaseline: true }]) // baseline first
 */
export const sortBaselineFirst = (entries) => {
  if (!Array.isArray(entries)) return []
  return [...entries].sort(
    (a, b) => Number(Boolean(b.isBaseline)) - Number(Boolean(a.isBaseline)),
  )
}

/**
 * The role of a compared display. The baseline wins over familiar, and familiar
 * over candidate.
 *
 * @param {{ isBaseline?: boolean, isFamiliar?: boolean }} entry
 * @returns {EntryKind}
 *
 * @example
 * entryKind({ isBaseline: true, isFamiliar: true }) // 'baseline'
 * entryKind({ isFamiliar: true }) // 'familiar'
 */
export const entryKind = (entry) => {
  if (entry.isBaseline) return 'baseline'
  if (entry.isFamiliar) return 'familiar'
  return 'candidate'
}

/**
 * Whether two OS scale factors are the same scale.
 *
 * @param {number | undefined} a Factor, e.g. 1.25.
 * @param {number | undefined} b Factor, e.g. 1.25.
 * @returns {boolean} False when either is missing.
 *
 * @example
 * isSameScale(1.25, 1.25000001) // true
 */
export const isSameScale = (a, b) =>
  Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < SCALE_EPSILON

/**
 * Workspace megapixels of a display at the entry's own scale. Uses the matching
 * scaling-matrix row when there is one, and computes `(w/s)(h/s)/10⁶` otherwise.
 *
 * @param {{ display: { width: number, height: number }, scale: number, matrix?: Array<{ scale: number, workspaceMegapixels: number }> }} entry
 * @returns {number} Megapixels, unrounded.
 *
 * @example
 * workspaceAtScale({ display: { width: 3840, height: 2160 }, scale: 1.5, matrix: [] })
 * // ≈ 3.69
 */
export const workspaceAtScale = (entry) => {
  const row = (entry.matrix ?? []).find(({ scale }) => isSameScale(scale, entry.scale))
  if (row) return row.workspaceMegapixels
  const { width, height } = entry.display
  return ((width / entry.scale) * (height / entry.scale)) / 1e6
}
