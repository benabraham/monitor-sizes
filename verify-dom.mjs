import { chromium, expect } from '@playwright/test'
import { addToCompare, completeOnboarding, goToView } from './tests/e2e/helpers.js'
const LAPTOP_A = { name: 'MacBook Air/Pro 13″ (M1, M2)', diagonal: '13.3″', prefix: 'MacBook Air/Pro 13″ (M1, M2), 13.3″' }
const LAPTOP_B = { name: 'Full HD', diagonal: '14″', prefix: 'Full HD, 14″' }
const UHD32 = { name: '4K UHD', diagonal: '32″', prefix: '4K UHD, 32″' }
const browser = await chromium.launch()
const context = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: 1920, height: 1080 } })
const page = await context.newPage()
await completeOnboarding({ page, displays: [LAPTOP_A, LAPTOP_B] })
await addToCompare(page, UHD32)
await goToView(page, 'compare')
await page.getByRole('table', { name: /^Scaling options for/ }).first().waitFor({ timeout: 15000 })
const info = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return sel + ' MISSING'
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return { sel, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, gtc: cs.gridTemplateColumns, gridArea: cs.gridArea, position: cs.position }
  }
  const view = document.querySelector('.compare-view')
  return {
    children: [...view.children].map((c) => c.className),
    view: pick('.compare-view'),
    preview: pick('.compare-visual__preview'),
    body: pick('.compare-view__body'),
    controls: pick('.compare-visual__controls'),
    membership: pick('.compare-view__membership'),
    data: pick('.compare-view__data'),
    bodyChildren: [...(document.querySelector('.compare-view__body')?.children ?? [])].map((c) => c.className),
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
