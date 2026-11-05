import { chromium } from '@playwright/test'
import { DISPLAYS, addToCompare, completeOnboarding, goToView } from './tests/e2e/helpers.js'
const browser = await chromium.launch()
const context = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
await addToCompare(page, DISPLAYS.uhd32)
await addToCompare(page, DISPLAYS.uwqhd34)
await goToView(page, 'compare')
await page.getByRole('img', { name: /^Physical size/ }).waitFor()
await page.waitForTimeout(500)
const info = await page.evaluate(() => {
  const svg = document.querySelector('.visualization__svg')
  const sr = svg.getBoundingClientRect()
  const labels = [...document.querySelectorAll('text.visualization__label')].map((n) => {
    const r = n.getBoundingClientRect()
    return { text: n.textContent, x: n.getAttribute('x'), y: n.getAttribute('y'), l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), bbox: (() => { const b = n.getBBox(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] })() }
  })
  const rects = [...document.querySelectorAll('rect.visualization__outline')].map((n) => ({ x: n.getAttribute('x'), y: n.getAttribute('y'), w: n.getAttribute('width'), h: n.getAttribute('height') }))
  return { svg: [Math.round(sr.width), Math.round(sr.height)], viewBox: svg.getAttribute('viewBox'), labels, rects }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
