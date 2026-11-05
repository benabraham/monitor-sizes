import { chromium } from '@playwright/test'
import { expect } from '@playwright/test'
import { DISPLAYS, addToCompare, completeOnboarding, goToView, openAddDisplay, fillAddDisplay } from './tests/e2e/helpers.js'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const withWatchdog = (label, promise, ms = 8000) =>
  Promise.race([promise.then((v) => ['ok', v]), sleep(ms).then(() => ['HUNG', label])])
const browser = await chromium.launch()
const context = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const page = await context.newPage()
page.setDefaultTimeout(8000)
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)) })
await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27], setup: { [DISPLAYS.uhd27.prefix]: { distance: 70, scale: 1.5 } } })
const dialog = await openAddDisplay(page)
await fillAddDisplay({ dialog, name: 'Studio', diagonal: '27', width: '2560', height: '1440' })
await expect(dialog).toBeHidden()
await addToCompare(page, { name: 'Studio', diagonal: '27″' })
console.log('studio', await withWatchdog('eval0', page.evaluate(() => 0)))
console.log('onboarded', await withWatchdog('eval1', page.evaluate(() => 1)))
await addToCompare(page, DISPLAYS.uhd32)
console.log('added32', await withWatchdog('eval2', page.evaluate(() => 2)))
await goToView(page, 'compare')
const cdp = await context.newCDPSession(page)
const scripts = {}
cdp.on('Debugger.scriptParsed', (e) => { scripts[e.scriptId] = e.url })
cdp.on('Debugger.paused', (event) => {
  console.log('PAUSED frames:')
  event.callFrames.slice(0, 12).forEach((f) => console.log('  ', f.functionName || '(anon)', (scripts[f.location.scriptId] || f.url).split('/').pop(), f.location.lineNumber, f.location.columnNumber))
  cdp.send('Debugger.resume').catch(() => {})
})
await cdp.send('Debugger.enable')
const comp = await withWatchdog('eval3', page.evaluate(() => 3))
console.log('compare', comp)
if (comp[0] === 'HUNG') { await cdp.send('Debugger.pause'); await sleep(2000) }
await sleep(1500)
console.log('after sleep', await withWatchdog('eval4', page.evaluate(() => 4)))
console.log(errors.slice(0, 10).join('\n'))
await browser.close()
process.exit(0)
