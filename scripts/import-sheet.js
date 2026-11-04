/**
 * One-off import: converts the frozen sheet snapshot into the built-in display seed.
 *
 * Reads `data/sheet-snapshot/monitory.values.json` (formatted values from the Sheets API)
 * and writes `src/data/seed.json`: inputs only, sorted by PPI descending. Derived metrics
 * are never stored (ARCHITECTURE: Data model, F1).
 *
 * The sheet is retired, so this runs once and is kept for history. New built-in displays
 * are added to the seed by hand (see `docs/CONTRIBUTING.md`). Run it with
 * `pnpm import-sheet`.
 *
 * @module scripts/import-sheet
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * A built-in display as stored in `src/data/seed.json`. Inputs only.
 *
 * @typedef {object} Display
 * @property {string} id        Slug `${diagonal}-${width}x${height}` with '.' replaced by '-',
 *   e.g. `"15-6-3840x2160"`, `"27-3840x2160"`. Unique across the seed.
 * @property {string} name      Canonical name, e.g. `"4K UHD"`, `"MacBook Pro 14″"`.
 * @property {number} diagonal  Inches.
 * @property {number} width     Native pixels.
 * @property {number} height    Native pixels.
 * @property {'laptop'|'monitor'|'ultrawide'} tag
 */

/**
 * One display row read from the snapshot, before naming and tagging.
 *
 * @typedef {object} RawRow
 * @property {number} diagonal  Inches.
 * @property {string} name      Raw sheet name, trimmed.
 * @property {number} width     Native pixels.
 * @property {number} height    Native pixels.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_PATH = join(HERE, '..', 'data', 'sheet-snapshot', 'monitory.values.json')
const SEED_PATH = join(HERE, '..', 'src', 'data', 'seed.json')

/** Rows 0 to 2 of the snapshot are headers (row 1 holds the controls). */
const HEADER_ROW_COUNT = 3
/** Zero-based column indexes of the four inputs (A = 0). */
const COLUMN = { diagonal: 1, name: 4, width: 6, height: 8 }
/** At or below this diagonal a display is tagged as a laptop. */
const LAPTOP_MAX_DIAGONAL = 17.3
/** At or above this width-to-height ratio a non-laptop display is an ultrawide. */
const ULTRAWIDE_MIN_RATIO = 2.2
/** Tolerance when matching a MacBook diagonal such as 16.2 or 13.3. */
const DIAGONAL_TOLERANCE = 0.05

/** Canonical names by resolution, keyed `${width}x${height}`. */
const RESOLUTION_NAMES = new Map([
  ['1920x1080', 'Full HD'],
  ['1920x1200', 'WUXGA'],
  ['2560x1440', 'QHD'],
  ['2560x1600', 'WQXGA'],
  ['2560x1080', 'UW Full HD'],
  ['3440x1440', 'UWQHD'],
  ['3840x1600', 'UW4K'],
  ['3840x2160', '4K UHD'],
  ['2880x1800', '3K'],
  ['5120x1440', 'DQHD'],
  ['5120x2160', '5K2K'],
  ['5120x2880', '5K'],
  ['6016x3384', '6K'],
  ['6144x3456', '6K'],
  ['6144x2560', 'UW6K'],
  ['7680x2160', 'DUHD'],
  ['7680x3240', '8K UW'],
  ['7680x4320', '8K UHD'],
  ['10080x4320', '10K UW'],
])

/**
 * MacBook panels keep their model names. They match on resolution and diagonal, because
 * some MacBook resolutions also appear on monitors (2560 × 1600 at 30″ is WQXGA).
 */
const MACBOOK_NAMES = [
  { width: 3456, height: 2234, diagonal: 16.2, name: 'MacBook Pro 16″' },
  { width: 3024, height: 1964, diagonal: 14.2, name: 'MacBook Pro 14″' },
  { width: 2560, height: 1664, diagonal: 13.6, name: 'MacBook Air 13″' },
  { width: 2880, height: 1864, diagonal: 15.3, name: 'MacBook Air 15″' },
  { width: 2560, height: 1600, diagonal: 13.3, name: 'MacBook Air/Pro 13″ (M1, M2)' },
]

/**
 * Read a snapshot cell as a number. Formatted cells are strings such as `"3840"` or
 * `" 15.6 "`.
 *
 * @param {unknown} value Raw cell value.
 * @returns {number} The number, or `NaN` when the cell is blank or not numeric.
 *
 * @example
 * toNumber(' 15.6 ') // 15.6
 * toNumber('') // NaN
 */
const toNumber = (value) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || value.trim() === '') return NaN
  return Number(value)
}

/**
 * Whether a value is a finite number above zero.
 *
 * @param {number} value
 * @returns {boolean}
 */
const isPositiveNumber = (value) => Number.isFinite(value) && value > 0

/**
 * Turn one snapshot row into a raw display row.
 *
 * @param {unknown} row One row of the `values` array.
 * @returns {RawRow | null} The row, or `null` when it does not describe a display.
 */
const toRawRow = (row) => {
  if (!Array.isArray(row)) return null
  const diagonal = toNumber(row[COLUMN.diagonal])
  const width = toNumber(row[COLUMN.width])
  const height = toNumber(row[COLUMN.height])
  if (![diagonal, width, height].every(isPositiveNumber)) return null
  return { diagonal, name: String(row[COLUMN.name] ?? '').trim(), width, height }
}

/**
 * Read the display rows from a parsed snapshot. Header rows are skipped, and so are rows
 * without a numeric diagonal, width and height (blank spacers and notes).
 *
 * @param {object} json Parsed `monitory.values.json`, with a `values` array of rows.
 * @returns {RawRow[]} Display rows in sheet order.
 * @throws {TypeError} When `json` has no `values` array.
 *
 * @example
 * parseSnapshot({ values: [[], [], [], ['', '15.6', '', '', '4K', '', '3840', '×', '2160']] })
 * // [{ diagonal: 15.6, name: '4K', width: 3840, height: 2160 }]
 */
export const parseSnapshot = (json) => {
  if (!Array.isArray(json?.values)) {
    throw new TypeError('parseSnapshot: expected an object with a "values" array')
  }
  return json.values
    .slice(HEADER_ROW_COUNT)
    .map(toRawRow)
    .filter((row) => row !== null)
}

/**
 * Canonical display name from resolution and diagonal. The raw sheet name is not used:
 * the same resolution always gets the same name (PRD: normalise names), so `3440 × 1440`
 * is `UWQHD` at 34″ and 40″ alike. MacBook panels keep their model name. An unknown
 * resolution falls back to `"W × H"`.
 *
 * @param {object} params
 * @param {string} [params.name] Raw sheet name. Accepted so a raw row can be passed as is,
 *   but not used.
 * @param {number} params.width Native pixels.
 * @param {number} params.height Native pixels.
 * @param {number} params.diagonal Inches; only matters for MacBook models.
 * @returns {string} The canonical name.
 *
 * @example
 * normalizeName({ width: 3840, height: 2160, diagonal: 27 }) // '4K UHD'
 * normalizeName({ width: 3024, height: 1964, diagonal: 14.2 }) // 'MacBook Pro 14″'
 * normalizeName({ width: 1600, height: 900, diagonal: 19 }) // '1600 × 900'
 */
export const normalizeName = ({ width, height, diagonal }) => {
  const macbook = MACBOOK_NAMES.find(
    (model) =>
      model.width === width &&
      model.height === height &&
      Math.abs(model.diagonal - diagonal) < DIAGONAL_TOLERANCE,
  )
  if (macbook) return macbook.name
  return RESOLUTION_NAMES.get(`${width}x${height}`) ?? `${width} × ${height}`
}

/**
 * Display category from size and shape. Laptops are checked first, so a 16:9 panel up to
 * 17.3″ is a laptop, not a monitor.
 *
 * @param {object} params
 * @param {string} [params.name] Raw sheet name. Accepted but not used.
 * @param {number} params.width Native pixels.
 * @param {number} params.height Native pixels.
 * @param {number} params.diagonal Inches.
 * @returns {'laptop'|'monitor'|'ultrawide'}
 *
 * @example
 * getTag({ width: 3840, height: 2160, diagonal: 15.6 }) // 'laptop'
 * getTag({ width: 3440, height: 1440, diagonal: 34 }) // 'ultrawide'
 * getTag({ width: 3840, height: 2160, diagonal: 27 }) // 'monitor'
 */
export const getTag = ({ width, height, diagonal }) => {
  if (diagonal <= LAPTOP_MAX_DIAGONAL) return 'laptop'
  if (width / height >= ULTRAWIDE_MIN_RATIO) return 'ultrawide'
  return 'monitor'
}

/**
 * Stable id slug, `${diagonal}-${width}x${height}`, with the decimal point of the diagonal
 * replaced by a dash, so the id is a plain slug with one separator per part. The name is not
 * part of the id.
 *
 * @param {object} params
 * @param {string} [params.name] Raw sheet name. Accepted but not used.
 * @param {number} params.diagonal Inches.
 * @param {number} params.width Native pixels.
 * @param {number} params.height Native pixels.
 * @returns {string}
 *
 * @example
 * makeId({ diagonal: 15.6, width: 3840, height: 2160 }) // '15-6-3840x2160'
 * makeId({ diagonal: 27, width: 3840, height: 2160 }) // '27-3840x2160'
 */
export const makeId = ({ diagonal, width, height }) =>
  `${String(diagonal).replaceAll('.', '-')}-${width}x${height}`

/**
 * Pixels per inch. Used only to sort the seed; never stored.
 *
 * @param {object} params
 * @param {number} params.width Native pixels.
 * @param {number} params.height Native pixels.
 * @param {number} params.diagonal Inches.
 * @returns {number}
 */
const ppiOf = ({ width, height, diagonal }) => Math.hypot(width, height) / diagonal

/**
 * Turn one raw row into a seed entry.
 *
 * @param {RawRow} row
 * @returns {Display}
 */
const toDisplay = (row) => ({
  id: makeId(row),
  name: normalizeName(row),
  diagonal: row.diagonal,
  width: row.width,
  height: row.height,
  tag: getTag(row),
})

/**
 * Build the built-in display seed from a parsed snapshot: one entry per display row, with
 * canonical names and tags, sorted by PPI descending. Rows with equal PPI keep their sheet
 * order.
 *
 * @param {object} json Parsed `monitory.values.json`.
 * @returns {Display[]} The seed, ready for {@link formatSeedJson}.
 *
 * @example
 * const seed = buildSeed(JSON.parse(text))
 * seed[0].id // '15-6-3840x2160'
 */
export const buildSeed = (json) =>
  parseSnapshot(json)
    .map(toDisplay)
    .sort((a, b) => ppiOf(b) - ppiOf(a))

/**
 * Serialise the seed the way it is committed: 2-space indent and a trailing newline.
 *
 * @param {Display[]} seed
 * @returns {string}
 *
 * @example
 * formatSeedJson([]) // '[]\n'
 */
export const formatSeedJson = (seed) => `${JSON.stringify(seed, null, 2)}\n`

/**
 * Read the snapshot, build the seed and write it to disk. Creates folders as needed and
 * overwrites the target.
 *
 * @param {object} [params]
 * @param {string} [params.snapshotPath] Snapshot to read. Defaults to the frozen sheet.
 * @param {string} [params.seedPath] Seed file to write. Defaults to `src/data/seed.json`.
 * @returns {{ count: number, seedPath: string }} Number of displays written, and the path.
 * @throws {SyntaxError} When the snapshot is not valid JSON.
 * @throws {TypeError} When the snapshot has no `values` array.
 *
 * @example
 * importSheet() // { count: 51, seedPath: '/…/src/data/seed.json' }
 */
export const importSheet = ({
  snapshotPath = SNAPSHOT_PATH,
  seedPath = SEED_PATH,
} = {}) => {
  const seed = buildSeed(JSON.parse(readFileSync(snapshotPath, 'utf8')))
  mkdirSync(dirname(seedPath), { recursive: true })
  writeFileSync(seedPath, formatSeedJson(seed))
  return { count: seed.length, seedPath }
}

const isRunDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isRunDirectly) {
  const { count, seedPath } = importSheet()
  console.log(`Wrote ${count} displays to ${seedPath}`)
}
