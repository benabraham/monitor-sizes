import { chromium, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { addToCompare, completeOnboarding, goToView } from './tests/e2e/helpers.js'

const OUT = '/tmp/claude-0/-home-user-monitor-sizes/054fcff4-780a-5e8a-afb7-6ea8d0df8c64/scratchpad/shots3'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:4173/monitor-sizes/'

const LAPTOP_A = { name: 'MacBook Air/Pro 13″ (M1, M2)', diagonal: '13.3″', prefix: 'MacBook Air/Pro 13″ (M1, M2), 13.3″' }
const LAPTOP_B = { name: 'Full HD', diagonal: '14″', prefix: 'Full HD, 14″' }
const UHD32 = { name: '4K UHD', diagonal: '32″', prefix: '4K UHD, 32″' }
const UWQHD34 = { name: 'UWQHD', diagonal: '34″', prefix: 'UWQHD, 34″' }

const VIEWPORTS = [
  { tag: '1920', width: 1920, height: 1080 },
  { tag: '1280', width: 1280, height: 800 },
  { tag: '390', width: 390, height: 844 },
]

/** Layout facts measured in the page. */
const measure = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom }
    }
    const labels = [...document.querySelectorAll('text.visualization__label')].map((n) => {
      const r = n.getBoundingClientRect()
      return { text: n.textContent, l: r.left, r: r.right, t: r.top, b: r.bottom }
    })
    const svg = document.querySelector('.visualization__svg')
    const svgBox = svg?.getBoundingClientRect()
    const overlaps = []
    labels.forEach((a, i) =>
      labels.slice(i + 1).forEach((b) => {
        if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) overlaps.push([a.text, b.text])
      }),
    )
    const outside = labels.filter(
      (l) => svgBox && (l.l < svgBox.left || l.r > svgBox.right || l.t < svgBox.top || l.b > svgBox.bottom),
    ).map((l) => l.text)
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollY: window.scrollY,
      header: box(document.querySelector('.app-header')),
      preview: box(document.querySelector('.compare-visual__preview')),
      svg: box(svg),
      view: box(document.querySelector('.compare-view')),
      labels: labels.map((l) => l.text),
      overlaps,
      outside,
    }
  })

const report = (name, m) => {
  const preview = m.preview
  console.log(
    name,
    JSON.stringify({
      scrollWidth: m.scrollWidth,
      innerWidth: m.innerWidth,
      hScroll: m.scrollWidth > m.innerWidth,
      previewH: preview && Math.round(preview.h),
      cap60dvh: Math.round(m.innerHeight * 0.6),
      previewW: preview && Math.round(preview.w),
      viewW: m.view && Math.round(m.view.w),
      svg: m.svg && [Math.round(m.svg.w), Math.round(m.svg.h)],
      previewTop: preview && Math.round(preview.top),
      headerH: m.header && Math.round(m.header.h),
      labels: m.labels,
      overlaps: m.overlaps,
      outside: m.outside,
    }),
  )
}

const browser = await chromium.launch()
try {
  for (const vp of VIEWPORTS) {
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({
        baseURL: 'http://localhost:4173',
        viewport: { width: vp.width, height: vp.height },
        colorScheme: scheme,
        deviceScaleFactor: 1,
        isMobile: vp.width < 600,
        hasTouch: vp.width < 600,
      })
      const page = await context.newPage()
      await completeOnboarding({ page, displays: [LAPTOP_A, LAPTOP_B] })
      await addToCompare(page, UHD32)
      await addToCompare(page, UWQHD34)
      await page.waitForTimeout(300)
      const bs = `${OUT}/browse-${vp.tag}-${scheme}.png`
      await page.screenshot({ path: bs })
      await goToView(page, 'compare')
      await expect(page.getByRole('img', { name: /^Physical size/ })).toBeVisible()
      await page.getByRole('region', { name: 'Displays in this comparison' }).waitFor()
      await page.getByRole('table', { name: /^Scaling options for/ }).first().waitFor({ timeout: 15000 })
      await page.waitForTimeout(400)

      const top = await measure(page)
      report(`${vp.tag}-${scheme}-top`, top)
      await page.screenshot({ path: `${OUT}/compare-${vp.tag}-${scheme}-top.png` })

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(400)
      const scrolled = await measure(page)
      report(`${vp.tag}-${scheme}-scrolled`, scrolled)
      await page.screenshot({ path: `${OUT}/compare-${vp.tag}-${scheme}-scrolled.png` })

      if (scheme === 'light' && vp.tag === '1280') {
        // Set as baseline on the 32″ candidate: it becomes Baseline, and the numbers follow.
        await page.evaluate(() => window.scrollTo(0, 0))
        const rowBefore = page.getByRole('region', { name: 'Displays in this comparison' })
        const btn = rowBefore.getByRole('button', { name: 'Set 32″ 4K UHD as baseline' })
        await btn.click()
        await expect(rowBefore.getByRole('button', { name: 'Set 32″ 4K UHD as baseline' })).toHaveCount(0)
        await expect(rowBefore.getByText('Baseline', { exact: true })).toHaveCount(1)
        const afterBase = await measure(page)
        report('1280-light-after-set-baseline', afterBase)
        console.log('baseline row text:', await page.locator('.compare-manager__item').filter({ hasText: 'Baseline' }).first().innerText())
        await page.screenshot({ path: `${OUT}/compare-1280-light-after-baseline.png` })
        // Switch the OS preset to macOS from the header, and check the matrix shows "looks like".
        await page.locator('.app-header label', { hasText: 'macOS' }).click()
        await page.waitForTimeout(400)
        const looks = await page.getByText(/looks like/).count()
        console.log('macOS looks-like count:', looks)
        await page.screenshot({ path: `${OUT}/compare-1280-light-macos.png` })
        await page.locator('.app-header label', { hasText: 'Windows' }).click()
        await expect(page.locator('.app-header').getByRole('radio', { name: 'Windows' })).toBeChecked()
      }

      if (scheme === 'light' && vp.tag === '390') {
        const hdr = await measure(page)
        console.log('390 header h', Math.round(hdr.header.h))
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
}
