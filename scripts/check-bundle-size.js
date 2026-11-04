/**
 * Fails the build when the gzipped JavaScript in dist/assets exceeds the budget
 * (PRD: Non-functional, "JS bundle under 50 kB gzipped").
 *
 * Usage: `pnpm build && pnpm size`. Sizes use gzip at zlib's default level, and
 * 1 kB here is 1024 bytes, so the budget is 51200 bytes.
 */
import { readdir, readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = join(ROOT_DIR, 'dist', 'assets')
/** Gzipped JavaScript budget: 50 kB = 51200 bytes. */
export const BUDGET_BYTES = 51200

/**
 * Tells whether a file is a service-worker or Workbox script. Workbox writes these
 * outside dist/assets, and they are excluded so they never count against the budget.
 * @param {string} fileName
 * @returns {boolean} true when the file is a service-worker or Workbox script
 */
const isServiceWorkerFile = (fileName) =>
  fileName === 'sw.js' || fileName.startsWith('workbox-')

/**
 * Gzips every top-level .js file in a directory, skipping service-worker files.
 * @param {{ dir: string }} options
 * @returns {Promise<{ file: string, bytes: number }[]>} one entry per file, sorted by name
 * @example
 * const sizes = await getGzipSizes({ dir: 'dist/assets' })
 */
export const getGzipSizes = async ({ dir }) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const jsFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.js') && !isServiceWorkerFile(name))
    .sort()

  return Promise.all(
    jsFiles.map(async (file) => {
      const content = await readFile(join(dir, file))
      return { file, bytes: gzipSync(content).length }
    }),
  )
}

/**
 * Compares the summed gzip size against the budget. Equal to the budget passes.
 * @param {{ sizes: { file: string, bytes: number }[], budgetBytes: number }} options
 * @returns {{ isOk: boolean, totalBytes: number, budgetBytes: number, overBytes: number }}
 *   overBytes is how far over the budget the total is, 0 when within it
 * @example
 * checkBudget({ sizes: [{ file: 'index.js', bytes: 1000 }], budgetBytes: 51200 })
 * // → { isOk: true, totalBytes: 1000, budgetBytes: 51200, overBytes: 0 }
 */
export const checkBudget = ({ sizes, budgetBytes }) => {
  const totalBytes = sizes.reduce((sum, { bytes }) => sum + bytes, 0)
  const overBytes = Math.max(0, totalBytes - budgetBytes)
  return { isOk: overBytes === 0, totalBytes, budgetBytes, overBytes }
}

/**
 * Formats a byte count as kB with two decimals (1 kB = 1024 bytes).
 * @param {number} bytes
 * @returns {string} e.g. "49.10 kB"
 */
const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`

/**
 * Builds the table printed to the console.
 * @param {{ sizes: { file: string, bytes: number }[], result: ReturnType<typeof checkBudget> }} options
 * @returns {string} multi-line report
 */
const formatReport = ({ sizes, result }) => {
  const nameWidth = Math.max('File'.length, ...sizes.map(({ file }) => file.length))
  const header = `${'File'.padEnd(nameWidth)}  ${'Gzip'.padStart(12)}`
  const rows = sizes.map(
    ({ file, bytes }) => `${file.padEnd(nameWidth)}  ${formatKb(bytes).padStart(12)}`,
  )
  const status = result.isOk
    ? `OK: ${formatKb(result.totalBytes)} of ${formatKb(result.budgetBytes)} budget`
    : `FAIL: ${formatKb(result.totalBytes)} exceeds the ${formatKb(result.budgetBytes)} budget by ${formatKb(result.overBytes)}`

  return [
    header,
    '-'.repeat(header.length),
    ...rows,
    '-'.repeat(header.length),
    `${'Total'.padEnd(nameWidth)}  ${formatKb(result.totalBytes).padStart(12)}`,
    '',
    status,
  ].join('\n')
}

/**
 * Returns the gzip sizes, or null when the directory cannot be read.
 * @param {{ dir: string }} options
 * @returns {Promise<{ file: string, bytes: number }[] | null>}
 */
const readSizesOrNull = async ({ dir }) => {
  try {
    return await getGzipSizes({ dir })
  } catch {
    return null
  }
}

/**
 * Measures a directory of JavaScript against a gzip budget and builds the report.
 * Fails (exitCode 1) when over budget, and also when there is no JavaScript to
 * measure, so a missing build cannot pass silently.
 * @param {{ dir: string, budgetBytes: number }} options
 * @returns {Promise<{ exitCode: 0 | 1, output: string }>} exitCode for the process and
 *   the text to print (the table on success, the reason on failure)
 * @example
 * const { exitCode, output } = await runBundleCheck({ dir, budgetBytes: 51200 })
 */
export const runBundleCheck = async ({ dir, budgetBytes }) => {
  const sizes = await readSizesOrNull({ dir })
  if (sizes === null) {
    return { exitCode: 1, output: `Cannot read ${dir}. Run "pnpm build" first.` }
  }
  if (sizes.length === 0) {
    return {
      exitCode: 1,
      output: `No JavaScript found in ${dir}. Run "pnpm build" first.`,
    }
  }

  const result = checkBudget({ sizes, budgetBytes })
  return {
    exitCode: result.isOk ? 0 : 1,
    output: formatReport({ sizes, result }),
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const { exitCode, output } = await runBundleCheck({
    dir: ASSETS_DIR,
    budgetBytes: BUDGET_BYTES,
  })
  if (exitCode === 0) {
    console.log(output)
  } else {
    console.error(output)
  }
  process.exitCode = exitCode
}
