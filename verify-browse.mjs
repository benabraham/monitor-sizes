import { chromium } from '@playwright/test'
import { addToCompare, completeOnboarding } from './tests/e2e/helpers.js'
const LAPTOP_A = { name: 'MacBook Air/Pro 13″ (M1, M2)', diagonal: '13.3″', prefix: 'MacBook Air/Pro 13″ (M1, M2), 13.3″' }
const LAPTOP_B = { name: 'Full HD', diagonal: '14″', prefix: 'Full HD, 14″' }
const UHD32 = { name: '4K UHD', diagonal: '32″', prefix: '4K UHD, 32″' }
const browser = await chromium.launch()
const context = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
await completeOnboarding({ page, displays: [LAPTOP_A, LAPTOP_B] })
const state = () => page.evaluate(() => {
  const h = document.querySelector('.app-header')
  const shell = document.querySelector('.app-shell')
  const cs = getComputedStyle(h)
  return { scrollY: window.scrollY, headerTop: h.getBoundingClientRect().top, headerPos: cs.position, shellH: shell.getBoundingClientRect().height, bodyOverflow: getComputedStyle(document.body).overflow, htmlOverflow: getComputedStyle(document.documentElement).overflow }
})
console.log('after onboarding', JSON.stringify(await state()))
await addToCompare(page, UHD32)
console.log('after add', JSON.stringify(await state()))
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(200)
console.log('scrolled to top', JSON.stringify(await state()))
await page.screenshot({ path: '/tmp/claude-0/-home-user-monitor-sizes/054fcff4-780a-5e8a-afb7-6ea8d0df8c64/scratchpad/shots3/browse-top-check.png' })
await browser.close()
