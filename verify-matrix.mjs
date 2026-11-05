import { chromium } from '@playwright/test'
import { addToCompare, completeOnboarding, goToView } from './tests/e2e/helpers.js'
const LAPTOP_A = { name: 'MacBook Air/Pro 13″ (M1, M2)', diagonal: '13.3″', prefix: 'MacBook Air/Pro 13″ (M1, M2), 13.3″' }
const LAPTOP_B = { name: 'Full HD', diagonal: '14″', prefix: 'Full HD, 14″' }
const UHD32 = { name: '4K UHD', diagonal: '32″', prefix: '4K UHD, 32″' }
const UWQHD34 = { name: 'UWQHD', diagonal: '34″', prefix: 'UWQHD, 34″' }
const browser = await chromium.launch()
const context = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
await completeOnboarding({ page, displays: [LAPTOP_A, LAPTOP_B] })
await addToCompare(page, UHD32)
await addToCompare(page, UWQHD34)
await goToView(page, 'compare')
await page.getByRole('table', { name: /^Scaling options for/ }).first().waitFor({ timeout: 15000 })
const info = await page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] }
  const out = {}
  const grid = document.querySelector('.scaling-matrix__grid')
  const cs = getComputedStyle(grid)
  out.grid = { box: r(grid), gtc: cs.gridTemplateColumns, display: cs.display }
  out.matrix = { box: r(document.querySelector('.scaling-matrix')), display: getComputedStyle(document.querySelector('.scaling-matrix')).display }
  out.entries = [...document.querySelectorAll('.scaling-matrix__entry')].map((el) => ({ box: r(el), table: r(el.querySelector('table')), title: el.querySelector('.scaling-matrix__title')?.textContent }))
  out.dataSection = r(document.querySelector('.compare-data'))
  out.sectionScaling = r(document.querySelector('.compare-data__section:nth-child(2)') ?? document.querySelector('.compare-data'))
  out.viewData = r(document.querySelector('.compare-view__data'))
  out.wraps = [...document.querySelectorAll('.table-wrap')].map((el) => r(el))
  return out
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
