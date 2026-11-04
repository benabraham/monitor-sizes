import { randomBytes } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkBudget, getGzipSizes, runBundleCheck } from './check-bundle-size.js'

/** @type {string} */
let dir

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bundle-size-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('getGzipSizes', () => {
  it('gzips each top-level .js file and reports its compressed size', async () => {
    const content = 'export const answer = 42\n'.repeat(200)
    await writeFile(join(dir, 'index-abc.js'), content)

    const sizes = await getGzipSizes({ dir })

    expect(sizes).toEqual([
      { file: 'index-abc.js', bytes: gzipSync(Buffer.from(content)).length },
    ])
  })

  it('returns files sorted by name', async () => {
    await writeFile(join(dir, 'b.js'), 'b')
    await writeFile(join(dir, 'a.js'), 'a')

    const sizes = await getGzipSizes({ dir })

    expect(sizes.map(({ file }) => file)).toEqual(['a.js', 'b.js'])
  })

  it('ignores non-JavaScript files and sub-directories', async () => {
    await writeFile(join(dir, 'index.css'), 'body{}')
    await writeFile(join(dir, 'logo.svg'), '<svg/>')
    await mkdir(join(dir, 'nested'))
    await writeFile(join(dir, 'nested', 'deep.js'), 'deep')
    await writeFile(join(dir, 'index.js'), 'app')

    const sizes = await getGzipSizes({ dir })

    expect(sizes.map(({ file }) => file)).toEqual(['index.js'])
  })

  it('excludes the service worker and Workbox runtime', async () => {
    await writeFile(join(dir, 'sw.js'), 'self.addEventListener')
    await writeFile(join(dir, 'workbox-2fbc6a65.js'), 'workbox')
    await writeFile(join(dir, 'index.js'), 'app')

    const sizes = await getGzipSizes({ dir })

    expect(sizes.map(({ file }) => file)).toEqual(['index.js'])
  })

  it('returns an empty list for a directory with no JavaScript', async () => {
    await writeFile(join(dir, 'index.css'), 'body{}')

    await expect(getGzipSizes({ dir })).resolves.toEqual([])
  })

  it('rejects when the directory does not exist', async () => {
    await expect(getGzipSizes({ dir: join(dir, 'missing') })).rejects.toThrow()
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
  it('exits 0 and prints the table when within budget', async () => {
    await writeFile(join(dir, 'index-abc.js'), 'export const app = 1')

    const { exitCode, output } = await runBundleCheck({ dir, budgetBytes: 51200 })

    expect(exitCode).toBe(0)
    expect(output).toContain('index-abc.js')
    expect(output).toContain('OK:')
  })

  it('exits 1 and explains the overage when over budget', async () => {
    // Random bytes do not compress, so the gzip size is close to the raw size.
    await writeFile(join(dir, 'big.js'), randomBytes(20000).toString('base64'))

    const { exitCode, output } = await runBundleCheck({ dir, budgetBytes: 1024 })

    expect(exitCode).toBe(1)
    expect(output).toContain('FAIL:')
    expect(output).toContain('exceeds the')
  })

  it('exits 1 when the directory has no JavaScript', async () => {
    await writeFile(join(dir, 'sw.js'), 'worker')

    const { exitCode, output } = await runBundleCheck({ dir, budgetBytes: 51200 })

    expect(exitCode).toBe(1)
    expect(output).toContain('No JavaScript found')
  })

  it('exits 1 when the directory does not exist', async () => {
    const { exitCode, output } = await runBundleCheck({
      dir: join(dir, 'missing'),
      budgetBytes: 51200,
    })

    expect(exitCode).toBe(1)
    expect(output).toContain('Run "pnpm build" first')
  })
})
