/**
 * Rasterizes public/favicon.svg into the PWA icon set using the Chromium that
 * Playwright already ships, so no image library is needed.
 *
 * Outputs (all in public/):
 *   pwa-192x192.png        "any" purpose, transparent outside the rounded square
 *   pwa-512x512.png        "any" purpose, transparent outside the rounded square
 *   apple-touch-icon.png   180 × 180, opaque (iOS masks it and shows black otherwise)
 *   maskable-512x512.png   opaque full-bleed, artwork inside the central 80 % safe zone
 *
 * Run with `node scripts/generate-icons.js` after changing the SVG.
 */
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = join(ROOT_DIR, 'public')
const SOURCE_FILE = 'favicon.svg'
const BACKGROUND = '#0f172a'

/**
 * @typedef {object} IconSpec
 * @property {string} file            output file name, relative to public/
 * @property {number} size            width and height in px
 * @property {number} artworkRatio    share of the square the artwork fills, 0–1
 * @property {boolean} isOpaque       true paints the background colour behind the artwork
 */

/** @type {IconSpec[]} */
const ICON_SPECS = [
  { file: 'pwa-192x192.png', size: 192, artworkRatio: 1, isOpaque: false },
  { file: 'pwa-512x512.png', size: 512, artworkRatio: 1, isOpaque: false },
  { file: 'apple-touch-icon.png', size: 180, artworkRatio: 1, isOpaque: true },
  { file: 'maskable-512x512.png', size: 512, artworkRatio: 0.8, isOpaque: true },
]

/**
 * Builds the HTML page that draws the SVG centred at the requested size. The SVG is
 * inlined as a data URL, so the page needs no network access.
 * @param {{ svg: string, size: number, artworkRatio: number, isOpaque: boolean }} options
 * @returns {string} an HTML document
 * @example
 * buildIconHtml({ svg, size: 512, artworkRatio: 0.8, isOpaque: true })
 */
export const buildIconHtml = ({ svg, size, artworkRatio, isOpaque }) => {
  const artSize = Math.round(size * artworkRatio)
  const offset = Math.round((size - artSize) / 2)
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  const background = isOpaque ? BACKGROUND : 'transparent'

  return `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: ${background}; }
      img { position: absolute; left: ${offset}px; top: ${offset}px; width: ${artSize}px; height: ${artSize}px; }
    </style>
  </head>
  <body><img src="${dataUrl}" alt=""></body>
</html>`
}

/**
 * Renders one icon with the given page and writes it to public/.
 * @param {{ page: import('@playwright/test').Page, spec: IconSpec, svg: string }} options
 * @returns {Promise<string>} the written file path
 */
const renderIcon = async ({ page, spec, svg }) => {
  const { file, size, artworkRatio, isOpaque } = spec
  const outputPath = join(PUBLIC_DIR, file)

  await page.setViewportSize({ width: size, height: size })
  await page.setContent(buildIconHtml({ svg, size, artworkRatio, isOpaque }), {
    waitUntil: 'load',
  })
  const isImageLoaded = await page.evaluate(
    () => document.images[0]?.complete && document.images[0].naturalWidth > 0,
  )
  if (!isImageLoaded) {
    throw new Error(`Could not rasterize ${SOURCE_FILE} for ${file}`)
  }

  await page.screenshot({
    path: outputPath,
    type: 'png',
    omitBackground: !isOpaque,
    clip: { x: 0, y: 0, width: size, height: size },
  })
  return outputPath
}

/**
 * Generates every icon in ICON_SPECS. Launches Chromium once and closes it even if a
 * render fails.
 * @returns {Promise<string[]>} the written file paths
 */
const generateIcons = async () => {
  const svg = await readFile(join(PUBLIC_DIR, SOURCE_FILE), 'utf8')
  if (!svg.includes('<svg')) {
    throw new Error(`${SOURCE_FILE} does not contain an <svg> element`)
  }

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 })
    const written = []
    for (const spec of ICON_SPECS) {
      written.push(await renderIcon({ page, spec, svg }))
    }
    return written
  } finally {
    await browser.close()
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const written = await generateIcons()
  for (const filePath of written) {
    console.log(`wrote ${filePath}`)
  }
}
