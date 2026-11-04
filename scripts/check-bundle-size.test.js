import { randomBytes } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  checkBudget,
  getGzipSizes,
  parseDistDir,
  parseInitialUrls,
  parseStaticImports,
  runBundleCheck,
  urlToFile,
} from './check-bundle-size.js'

const LOCALES = ['cs', 'en']

/** @type {string} The fake dist directory for one test. */
let distDir

/** Page of a built app: entry, its preloaded dependency, and the service-worker script. */
const indexHtml = ({ entry, preload = [], classic = [] }) =>
  [
    '<!doctype html>',
    '<html><head>',
    `<script type="module" crossorigin src="/monitor-sizes/assets/${entry}"></script>`,
    ...preload.map(
      (file) =>
        `<link rel="modulepreload" crossorigin href="/monitor-sizes/assets/${file}">`,
    ),
    '<link rel="stylesheet" crossorigin href="/monitor-sizes/assets/index.css">',
    ...classic.map(
      (file) =>
        `<script id="vite-plugin-pwa:register-sw" src="/monitor-sizes/${file}"></script>`,
    ),
    '</head><body><div id="app"></div></body></html>',
  ].join('\n')

/** Writes a file under dist, creating folders as needed. */
const writeDist = async (relative, content) => {
  const path = join(distDir, relative)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, content)
}

/** A text that compresses to a predictable, non-trivial size. */
const sample = (label, repeat = 200) => `export const ${label} = 'x'\n`.repeat(repeat)

beforeEach(async () => {
  distDir = await mkdtemp(join(tmpdir(), 'bundle-size-'))
})

afterEach(async () => {
  await rm(distDir, { recursive: true, force: true })
})

describe('getGzipSizes', () => {
  it('gzips each top-level .js file and reports its compressed size', async () => {
    const content = 'export const answer = 42\n'.repeat(200)
    await writeDist('assets/index-abc.js', content)

    const sizes = await getGzipSizes({ dir: join(distDir, 'assets') })

    expect(sizes).toEqual([
      { file: 'index-abc.js', bytes: gzipSync(Buffer.from(content)).length },
    ])
  })

  it('returns files sorted by name', async () => {
    await writeDist('assets/b.js', 'b')
    await writeDist('assets/a.js', 'a')

    const sizes = await getGzipSizes({ dir: join(distDir, 'assets') })

    expect(sizes.map(({ file }) => file)).toEqual(['a.js', 'b.js'])
  })

  it('ignores non-JavaScript files and sub-directories', async () => {
    await writeDist('assets/index.css', 'body{}')
    await writeDist('assets/logo.svg', '<svg/>')
    await writeDist('assets/nested/deep.js', 'deep')
    await writeDist('assets/index.js', 'app')

    const sizes = await getGzipSizes({ dir: join(distDir, 'assets') })

    expect(sizes.map(({ file }) => file)).toEqual(['index.js'])
  })

  it('excludes the service worker and Workbox runtime', async () => {
    await writeDist('assets/sw.js', 'self.addEventListener')
    await writeDist('assets/workbox-2fbc6a65.js', 'workbox')
    await writeDist('assets/index.js', 'app')

    const sizes = await getGzipSizes({ dir: join(distDir, 'assets') })

    expect(sizes.map(({ file }) => file)).toEqual(['index.js'])
  })

  it('returns an empty list for a directory with no JavaScript', async () => {
    await writeDist('assets/index.css', 'body{}')

    await expect(getGzipSizes({ dir: join(distDir, 'assets') })).resolves.toEqual([])
  })

  it('rejects when the directory does not exist', async () => {
    await expect(getGzipSizes({ dir: join(distDir, 'missing') })).rejects.toThrow()
  })
})

describe('parseInitialUrls', () => {
  it('lists module scripts, classic scripts and modulepreload links, once each', () => {
    const html = [
      '<script type="module" crossorigin src="/m/assets/index.js"></script>',
      '<link rel="modulepreload" crossorigin href="/m/assets/runtime.js">',
      '<link rel="modulepreload" href="/m/assets/runtime.js">',
      '<link rel="stylesheet" href="/m/assets/index.css">',
      '<link rel="icon" href="/m/favicon.svg">',
      '<script id="register" src="/m/registerSW.js"></script>',
    ].join('\n')

    expect(parseInitialUrls(html)).toEqual([
      '/m/assets/index.js',
      '/m/assets/runtime.js',
      '/m/registerSW.js',
    ])
  })

  it('ignores inline scripts and tags without a src or href', () => {
    const html = '<script>window.x = 1</script><link rel="modulepreload">'

    expect(parseInitialUrls(html)).toEqual([])
  })
})

describe('parseStaticImports', () => {
  it('finds static imports and re-exports, but not dynamic import()', () => {
    const source =
      'import{t as e}from"./runtime.js";export{x}from"./other.js";' +
      'import"./side.js";const lazy=()=>import(`./en-abc.js`)'

    expect(parseStaticImports(source)).toEqual([
      './runtime.js',
      './other.js',
      './side.js',
    ])
  })
})

describe('urlToFile', () => {
  it('strips the base path until it finds the file under dist', async () => {
    await writeDist('assets/index.js', 'app')

    expect(urlToFile({ url: '/monitor-sizes/assets/index.js', distDir })).toBe(
      'assets/index.js',
    )
  })

  it('returns null when the file is missing', () => {
    expect(urlToFile({ url: '/monitor-sizes/assets/gone.js', distDir })).toBeNull()
  })
})

describe('checkBudget', () => {
  it('passes when the summed gzip size is under the budget', () => {
    const result = checkBudget({
      sizes: [
        { file: 'a.js', bytes: 1000 },
        { file: 'b.js', bytes: 2000 },
      ],
      budgetBytes: 51200,
    })

    expect(result).toEqual({
      isOk: true,
      totalBytes: 3000,
      budgetBytes: 51200,
      overBytes: 0,
    })
  })

  it('passes when the total is exactly the budget', () => {
    const result = checkBudget({
      sizes: [{ file: 'a.js', bytes: 51200 }],
      budgetBytes: 51200,
    })

    expect(result.isOk).toBe(true)
    expect(result.overBytes).toBe(0)
  })

  it('fails and reports how far over the budget the total is', () => {
    const result = checkBudget({
      sizes: [
        { file: 'a.js', bytes: 30000 },
        { file: 'b.js', bytes: 25000 },
      ],
      budgetBytes: 51200,
    })

    expect(result.isOk).toBe(false)
    expect(result.totalBytes).toBe(55000)
    expect(result.overBytes).toBe(3800)
  })

  it('passes with no files at all', () => {
    expect(checkBudget({ sizes: [], budgetBytes: 51200 })).toEqual({
      isOk: true,
      totalBytes: 0,
      budgetBytes: 51200,
      overBytes: 0,
    })
  })
})

describe('runBundleCheck', () => {
  it('counts the entry, its preload and the largest locale, and lists lazy chunks apart', async () => {
    await writeDist(
      'index.html',
      indexHtml({ entry: 'index.js', preload: ['vendor.js'] }),
    )
    await writeDist('assets/index.js', sample('app'))
    await writeDist('assets/vendor.js', sample('vendor'))
    await writeDist('assets/cs-abc.js', sample('cs', 300))
    await writeDist('assets/en-def.js', sample('en', 100))
    await writeDist('assets/compare-data-ghi.js', sample('compare', 100))

    const { exitCode, output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 51200,
    })

    expect(exitCode).toBe(0)
    expect(output).toContain('index.js')
    expect(output).toContain('vendor.js')
    expect(output).toContain('cs-abc.js  (largest locale)')
    expect(output).toContain('Lazy, loaded on demand (not counted)')
    expect(output).toContain('en-def.js')
    expect(output).toContain('compare-data-ghi.js')
    expect(output).toContain('OK:')
  })

  it('counts only the largest locale, not all of them', async () => {
    const csText = randomBytes(3000).toString('base64')
    await writeDist('index.html', indexHtml({ entry: 'index.js' }))
    await writeDist('assets/index.js', 'app')
    await writeDist('assets/cs-abc.js', csText)
    await writeDist('assets/en-def.js', 'x')

    const { output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 51200,
    })

    const expectedKb = (
      (gzipSync(Buffer.from('app')).length + gzipSync(Buffer.from(csText)).length) /
      1024
    ).toFixed(2)
    const totalLine = output.split('\n').find((line) => line.startsWith('Total'))
    expect(totalLine).toContain(`${expectedKb} kB`)
  })

  it('exits 1 and explains the overage when over budget', async () => {
    // Random bytes do not compress, so the gzip size is close to the raw size.
    await writeDist('index.html', indexHtml({ entry: 'index.js' }))
    await writeDist('assets/index.js', randomBytes(20000).toString('base64'))
    await writeDist('assets/cs-abc.js', 'stejné')

    const { exitCode, output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 1024,
    })

    expect(exitCode).toBe(1)
    expect(output).toContain('FAIL:')
    expect(output).toContain('exceeds the')
  })

  it('does not count a lazy chunk, however large, against the budget', async () => {
    await writeDist('index.html', indexHtml({ entry: 'index.js' }))
    await writeDist('assets/index.js', 'app')
    await writeDist('assets/cs-abc.js', 'stejné')
    await writeDist('assets/big-lazy.js', randomBytes(20000).toString('base64'))

    const { exitCode, output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 51200,
    })

    expect(exitCode).toBe(0)
    expect(output).toContain('big-lazy.js')
  })

  it('counts a static import of the entry, although index.html does not list it', async () => {
    await writeDist('index.html', indexHtml({ entry: 'index.js' }))
    await writeDist('assets/index.js', 'import{t}from"./runtime.js";app(t)')
    await writeDist('assets/runtime.js', randomBytes(20000).toString('base64'))
    await writeDist('assets/cs-abc.js', 'stejné')

    const { exitCode, output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 1024,
    })

    expect(exitCode).toBe(1)
    expect(output).toContain('First load (counted)')
    expect(output.split('Lazy, loaded')[0]).toContain('runtime.js')
  })

  it('counts the static imports of the largest locale, shared with the page or not', async () => {
    await writeDist('index.html', indexHtml({ entry: 'index.js' }))
    await writeDist('assets/index.js', 'app')
    await writeDist('assets/cs-abc.js', 'import"./shared-locale.js";stejné')
    await writeDist('assets/shared-locale.js', randomBytes(20000).toString('base64'))

    const { exitCode, output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 1024,
    })

    expect(exitCode).toBe(1)
    expect(output.split('Lazy, loaded')[0]).toContain('shared-locale.js')
  })

  it('counts a classic script the page references, such as the service-worker register', async () => {
    await writeDist(
      'index.html',
      indexHtml({ entry: 'index.js', classic: ['registerSW.js'] }),
    )
    await writeDist('assets/index.js', 'app')
    await writeDist('assets/cs-abc.js', 'stejné')
    await writeDist('registerSW.js', randomBytes(20000).toString('base64'))

    const { exitCode, output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 1024,
    })

    expect(exitCode).toBe(1)
    expect(output).toContain('registerSW.js')
  })

  it('exits 1 when there is no locale chunk, so a missing catalogue cannot pass', async () => {
    await writeDist('index.html', indexHtml({ entry: 'index.js' }))
    await writeDist('assets/index.js', 'app')

    const { exitCode, output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 51200,
    })

    expect(exitCode).toBe(1)
    expect(output).toContain('No locale catalogue found')
  })

  it('exits 1 when index.html references a file that is missing', async () => {
    await writeDist('index.html', indexHtml({ entry: 'gone.js' }))
    await writeDist('assets/cs-abc.js', 'stejné')

    const { exitCode, output } = await runBundleCheck({
      distDir,
      localeNames: LOCALES,
      budgetBytes: 51200,
    })

    expect(exitCode).toBe(1)
    expect(output).toContain('Run "pnpm build" first')
  })

  it('exits 1 when the build directory does not exist', async () => {
    const { exitCode, output } = await runBundleCheck({
      distDir: join(distDir, 'missing'),
      localeNames: LOCALES,
      budgetBytes: 51200,
    })

    expect(exitCode).toBe(1)
    expect(output).toContain('Run "pnpm build" first')
  })
})

describe('parseDistDir', () => {
  it('measures the default folder when no --dir is given', () => {
    expect(parseDistDir({ argv: [], defaultDir: '/app/dist' })).toBe('/app/dist')
  })

  it('measures the folder given after --dir, as an absolute path', () => {
    const dir = parseDistDir({ argv: ['--dir', 'scratch/dist-b'], defaultDir: '/app/dist' })

    expect(dir).toBe(join(process.cwd(), 'scratch/dist-b'))
  })

  it('accepts --dir=<folder>', () => {
    const dir = parseDistDir({ argv: ['--dir=/tmp/out'], defaultDir: '/app/dist' })

    expect(dir).toBe('/tmp/out')
  })

  it('throws when --dir has no folder after it', () => {
    expect(() => parseDistDir({ argv: ['--dir'], defaultDir: '/app/dist' })).toThrow(
      '--dir needs a folder',
    )
  })

  it('throws when --dir is followed by another flag', () => {
    expect(() =>
      parseDistDir({ argv: ['--dir', '--verbose'], defaultDir: '/app/dist' }),
    ).toThrow('--dir needs a folder')
  })
})
