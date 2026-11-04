/**
 * Fails the build when the first load exceeds the gzipped JavaScript budget (PRD:
 * Non-functional, "JS bundle under 50 kB gzipped").
 *
 * The first load is what the browser fetches before first paint, and it has two parts:
 *
 * 1. the scripts that `dist/index.html` references (`<script src>` and
 *    `<link rel="modulepreload">`), plus whatever they import statically;
 * 2. the largest locale catalogue, plus whatever it imports statically. The app loads
 *    exactly one language at start, so only one is counted. Vite names a chunk after its
 *    directory, so a language chunk is `<locale>-<hash>.js` for each folder in
 *    `src/i18n/locales/`.
 *
 * Other lazy chunks (for example the Compare data) load on demand. They are listed, but
 * not counted.
 *
 * Usage: `pnpm build && pnpm size`. Sizes use gzip at zlib's default level, and 1 kB here
 * is 1024 bytes, so the budget is 51200 bytes.
 */
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { dirname, join, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST_DIR = join(ROOT_DIR, 'dist')
const LOCALES_DIR = join(ROOT_DIR, 'src', 'i18n', 'locales')
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
 * Reads one HTML attribute from a tag, or `undefined` when it is absent.
 * @param {string} tag A whole start tag, for example `<script src="a.js">`.
 * @param {string} name Attribute name.
 * @returns {string|undefined}
 */
const attributeOf = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]

/**
 * Lists the script URLs that an HTML page loads before first paint: every
 * `<script src>` and every `<link rel="modulepreload">`, in document order.
 * @param {string} html Contents of `index.html`.
 * @returns {string[]} URLs in document order, duplicates removed
 * @example
 * parseInitialUrls('<script type="module" src="/a/index.js"></script>')
 * // → ['/a/index.js']
 */
export const parseInitialUrls = (html) => {
  const urls = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)].map(([tag]) =>
    tag.startsWith('<script')
      ? attributeOf(tag, 'src')
      : attributeOf(tag, 'rel') === 'modulepreload'
        ? attributeOf(tag, 'href')
        : undefined,
  )
  return [...new Set(urls.filter(Boolean))]
}

/**
 * Maps a URL from the page to a file in the build output. The URL carries the Vite base
 * (`/monitor-sizes/assets/x.js`), which is not known here, so the path is matched from its
 * first segment onwards until a file exists.
 * @param {{ url: string, distDir: string }} options
 * @returns {string|null} the file path relative to `distDir`, or null when none exists
 * @example
 * urlToFile({ url: '/monitor-sizes/assets/x.js', distDir: 'dist' }) // 'assets/x.js'
 */
export const urlToFile = ({ url, distDir }) => {
  const segments = new URL(url, 'http://localhost/').pathname.split('/').filter(Boolean)
  for (let start = 0; start < segments.length; start += 1) {
    const candidate = segments.slice(start).join('/')
    const path = join(distDir, candidate)
    if (existsSync(path)) return candidate
  }
  return null
}

/**
 * Lists the relative imports of an ES module. Only static `import`/`export ... from`
 * forms count. `import()` loads on demand, so it is not part of the first load.
 * @param {string} source JavaScript text.
 * @returns {string[]} specifiers such as `./rolldown-runtime-abc.js`
 * @example
 * parseStaticImports('import{t}from"./runtime.js";import(`./en.js`)') // ['./runtime.js']
 */
export const parseStaticImports = (source) =>
  [...source.matchAll(/\b(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g)].map(
    ([, specifier]) => specifier,
  )

/**
 * Collects the files a set of roots loads: each root and everything it imports statically,
 * transitively. The roots are paths relative to `distDir`.
 * @param {{ distDir: string, roots: string[] }} options
 * @returns {Promise<string[]>} paths relative to `distDir`, in discovery order, unique
 */
const collectStaticClosure = async ({ distDir, roots }) => {
  const queue = [...roots]
  const seen = new Set()
  while (queue.length > 0) {
    const file = queue.shift()
    if (!seen.has(file)) {
      seen.add(file)
      const source = await readFile(join(distDir, file), 'utf8')
      parseStaticImports(source).forEach((specifier) => {
        queue.push(posix.normalize(posix.join(posix.dirname(file), specifier)))
      })
    }
  }
  return [...seen]
}

/**
 * Formats a byte count as kB with two decimals (1 kB = 1024 bytes).
 * @param {number} bytes
 * @returns {string} e.g. "49.10 kB"
 */
const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`

/**
 * Builds the table printed to the console. The counted rows are the ones in the budget,
 * with the largest locale last. The lazy rows are listed after them, with a note that
 * they are not counted.
 * @param {{
 *   counted: { label: string, bytes: number }[],
 *   lazy: { label: string, bytes: number }[],
 *   result: ReturnType<typeof checkBudget>,
 * }} options
 * @returns {string} multi-line report
 */
const formatReport = ({ counted, lazy, result }) => {
  const labelWidth = Math.max(
    'File'.length,
    ...[...counted, ...lazy].map(({ label }) => label.length),
  )
  const row = ({ label, bytes }) =>
    `${label.padEnd(labelWidth)}  ${formatKb(bytes).padStart(12)}`
  const header = `${'File'.padEnd(labelWidth)}  ${'Gzip'.padStart(12)}`
  const rule = '-'.repeat(header.length)
  const status = result.isOk
    ? `OK: ${formatKb(result.totalBytes)} of ${formatKb(result.budgetBytes)} budget`
    : `FAIL: ${formatKb(result.totalBytes)} exceeds the ${formatKb(result.budgetBytes)} budget by ${formatKb(result.overBytes)}`

  return [
    'First load (counted)',
    header,
    rule,
    ...counted.map(row),
    rule,
    `${'Total'.padEnd(labelWidth)}  ${formatKb(result.totalBytes).padStart(12)}`,
    '',
    'Lazy, loaded on demand (not counted)',
    rule,
    ...lazy.map(row),
    '',
    status,
  ].join('\n')
}

/**
 * Measures the first load of a built app and builds the report. Fails (exitCode 1) when
 * over budget, and also when the build is missing or has no locale chunk, so a broken
 * build cannot pass silently.
 *
 * @param {{ distDir: string, localeNames: string[], budgetBytes: number }} options
 *   `localeNames` are the language codes, one chunk prefix each (for example `['cs', 'en']`).
 * @returns {Promise<{ exitCode: 0 | 1, output: string }>} exitCode for the process and
 *   the text to print (the table on success, the reason on failure)
 * @example
 * const { exitCode, output } = await runBundleCheck({
 *   distDir: 'dist',
 *   localeNames: ['cs', 'en'],
 *   budgetBytes: 51200,
 * })
 */
export const runBundleCheck = async ({ distDir, localeNames, budgetBytes }) => {
  const indexPath = join(distDir, 'index.html')
  if (!existsSync(indexPath)) {
    return { exitCode: 1, output: `Cannot read ${indexPath}. Run "pnpm build" first.` }
  }

  const html = await readFile(indexPath, 'utf8')
  const roots = parseInitialUrls(html).map((url) => urlToFile({ url, distDir }))
  if (roots.length === 0 || roots.includes(null)) {
    return {
      exitCode: 1,
      output: `index.html references no script that exists in ${distDir}. Run "pnpm build" first.`,
    }
  }

  const assetsDir = join(distDir, 'assets')
  const assetSizes = await getGzipSizes({ dir: assetsDir }).catch(() => null)
  if (assetSizes === null || assetSizes.length === 0) {
    return {
      exitCode: 1,
      output: `No JavaScript found in ${assetsDir}. Run "pnpm build" first.`,
    }
  }

  const localePattern = new RegExp(`^(${localeNames.join('|')})-.+\\.js$`)
  const localeChunks = assetSizes.filter(({ file }) => localePattern.test(file))
  if (localeChunks.length === 0) {
    return {
      exitCode: 1,
      output: `No locale catalogue found in ${assetsDir} (expected ${localeNames.map((name) => `${name}-*.js`).join(' or ')}). Check src/i18n/locales.`,
    }
  }

  const largest = [...localeChunks].sort((a, b) => b.bytes - a.bytes)[0]
  let initialFiles
  let localeFiles
  try {
    initialFiles = await collectStaticClosure({ distDir, roots })
    localeFiles = (
      await collectStaticClosure({ distDir, roots: [`assets/${largest.file}`] })
    ).filter((file) => !initialFiles.includes(file))
  } catch (error) {
    return { exitCode: 1, output: `${error.message}. Run "pnpm build" first.` }
  }

  const sizeOf = async (relative) => {
    const content = await readFile(join(distDir, relative))
    return { label: relative.split('/').pop(), bytes: gzipSync(content).length }
  }
  const initial = await Promise.all(initialFiles.map(sizeOf))
  const localeRows = await Promise.all(
    localeFiles.map(async (relative) => {
      const size = await sizeOf(relative)
      return size.label === largest.file
        ? { ...size, label: `${size.label}  (largest locale)` }
        : size
    }),
  )
  const counted = [...initial, ...localeRows]
  const countedNames = new Set(
    [...initialFiles, ...localeFiles].map((file) => file.split('/').pop()),
  )
  const lazy = assetSizes
    .filter(({ file }) => !countedNames.has(file))
    .map(({ file, bytes }) => ({ label: file, bytes }))

  const result = checkBudget({ sizes: counted, budgetBytes })
  return {
    exitCode: result.isOk ? 0 : 1,
    output: formatReport({ counted, lazy, result }),
  }
}

/**
 * Lists the language codes, from the folder names in `src/i18n/locales`.
 * @param {{ dir: string }} options
 * @returns {Promise<string[]>} sorted codes, for example `['cs', 'en']`
 */
export const readLocaleNames = async ({ dir }) => {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const { exitCode, output } = await runBundleCheck({
    distDir: DIST_DIR,
    localeNames: await readLocaleNames({ dir: LOCALES_DIR }),
    budgetBytes: BUDGET_BYTES,
  })
  if (exitCode === 0) {
    console.log(output)
  } else {
    console.error(output)
  }
  process.exitCode = exitCode
}
