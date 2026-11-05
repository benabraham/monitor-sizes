#!/usr/bin/env node
/**
 * Writes the README screenshots from a production build (docs/TESTING.md, "Screenshots").
 *
 * It builds the app, serves `dist/` with `pnpm preview` on a port of its own, opens each
 * scene in Chromium with a realistic familiar set and comparison, and saves a viewport
 * shot (never a full page). A PNG over 600 kB is taken again at 1.5× device scale.
 *
 * Usage: `node scripts/take-screenshots.js`. Output: `docs/screenshots/*.png`.
 *
 * @module scripts/take-screenshots
 */

import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'docs', 'screenshots')
/** A port of its own, so a preview or e2e run on 4173 or 4174 is not disturbed. */
const PORT = 4175
const BASE = `http://localhost:${PORT}/monitor-sizes/`
/** Largest PNG kept at full device scale (kB). Above it the shot is taken at 1.5×. */
const MAX_KB = 600

/** Build of the familiar set and the comparison every scene starts from. */
const FAMILIAR = [
  {
    prefix: 'MacBook Pro 14″, 14.2″',
    name: 'MacBook Pro 14″',
    distance: 45,
    scale: 2,
  },
  { prefix: '4K UHD, 27″', name: '4K UHD', distance: 60, scale: 1.5 },
]
const CANDIDATES = [
  { name: '4K UHD', diagonal: '32″' },
  { name: 'UWQHD', diagonal: '34″' },
]

/**
 * Waits until the preview server answers, so the first scene does not race the server.
 *
 * @param {string} url
 * @param {number} [timeoutMs=30000]
 * @returns {Promise<void>}
 * @throws {Error} When the server does not answer in time.
 */
const waitForServer = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`The preview server did not answer at ${url}`)
}

/**
 * Completes onboarding with the familiar set, in pick order, so the first pick is the
 * baseline.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
const completeOnboarding = async (page) => {
  await page.goto(BASE)
  await page.getByRole('heading', { name: 'Which displays do you know?' }).waitFor()
  for (const { prefix } of FAMILIAR) {
    await page.getByRole('checkbox', { name: new RegExp(`^${prefix}`) }).check()
  }
  await page.getByRole('button', { name: 'Continue' }).click()
  for (const { name, distance, scale } of FAMILIAR) {
    const row = page.getByRole('group', { name: new RegExp(`^${name}`) })
    const field = row.getByRole('textbox', { name: 'Distance' })
    await field.fill(String(distance))
    await field.blur()
    await row.getByRole('combobox', { name: 'Scale' }).selectOption(String(scale))
  }
  await page.getByRole('button', { name: 'Finish' }).click()
  await page.getByRole('navigation', { name: 'Views' }).waitFor()
}

/**
 * Adds the two candidates to the comparison from Browse, then opens Compare and draws the
 * outlines "As seen", the mode that shows the viewing-distance idea.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
const openCompareWithCandidates = async (page) => {
  for (const { name, diagonal } of CANDIDATES) {
    const row = page
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: new RegExp(`^${name}$`) }) })
      .filter({ has: page.getByRole('cell', { name: diagonal, exact: true }) })
    await row.getByRole('checkbox', { name: `Compare ${name}` }).check()
  }
  await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: /^Compare/ }).click()
  await page.getByRole('heading', { level: 1, name: 'Compare' }).waitFor()
  await page.locator('label', { hasText: 'As seen' }).click()
  await page.getByRole('img', { name: /^Apparent size/ }).waitFor()
}

/**
 * Takes one viewport shot. If the PNG is over the size limit, it is taken again at 1.5×.
 *
 * @param {object} params
 * @param {import('@playwright/test').Browser} params.browser
 * @param {string} params.file File name in docs/screenshots.
 * @param {object} params.device Viewport, device scale, mobile flags and colour scheme.
 * @param {(page: import('@playwright/test').Page) => Promise<void>} params.scene Sets up the view.
 * @returns {Promise<{ file: string, width: number, height: number, deviceScaleFactor: number, bytes: number }>}
 */
const shoot = async ({ browser, file, device, scene }) => {
  for (const deviceScaleFactor of [device.deviceScaleFactor, 1.5]) {
    const context = await browser.newContext({ ...device, deviceScaleFactor })
    const page = await context.newPage()
    try {
      await scene(page)
      const path = join(OUT_DIR, file)
      await page.screenshot({ path, animations: 'disabled', caret: 'hide' })
      const bytes = statSync(path).size
      if (bytes / 1024 <= MAX_KB || deviceScaleFactor === 1.5) {
        return { file, ...device, deviceScaleFactor, bytes }
      }
      console.log(`${file}: ${Math.round(bytes / 1024)} kB at ${deviceScaleFactor}×, retrying at 1.5×`)
    } finally {
      await context.close()
    }
  }
  throw new Error(`Could not take ${file}`)
}

const main = async () => {
  console.log('Building dist/')
  execFileSync('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit' })
  mkdirSync(OUT_DIR, { recursive: true })

  const server = spawn('pnpm', ['preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  })
  const stopServer = () => server.kill()
  process.on('exit', stopServer)

  const browser = await chromium.launch()
  try {
    await waitForServer(BASE)
    const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }
    const phone = { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }

    const shots = []
    shots.push(
      await shoot({
        browser,
        file: 'browse-desktop.png',
        device: { ...desktop, colorScheme: 'light' },
        scene: completeOnboarding,
      }),
    )
    shots.push(
      await shoot({
        browser,
        file: 'compare-desktop.png',
        device: { ...desktop, colorScheme: 'light' },
        scene: async (page) => {
          await completeOnboarding(page)
          await openCompareWithCandidates(page)
        },
      }),
    )
    shots.push(
      await shoot({
        browser,
        file: 'compare-desktop-dark.png',
        device: { ...desktop, colorScheme: 'dark' },
        scene: async (page) => {
          await completeOnboarding(page)
          await openCompareWithCandidates(page)
        },
      }),
    )
    shots.push(
      await shoot({
        browser,
        file: 'compare-phone.png',
        device: { ...phone, colorScheme: 'light' },
        scene: async (page) => {
          await completeOnboarding(page)
          await openCompareWithCandidates(page)
        },
      }),
    )
    shots.push(
      await shoot({
        browser,
        file: 'browse-phone.png',
        device: { ...phone, colorScheme: 'light' },
        scene: completeOnboarding,
      }),
    )

    for (const { file, viewport, deviceScaleFactor, bytes } of shots) {
      console.log(
        `${file}: ${viewport.width}×${viewport.height} @${deviceScaleFactor}×, ${Math.round(bytes / 1024)} kB`,
      )
    }
  } finally {
    await browser.close()
    stopServer()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
