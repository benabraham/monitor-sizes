import { expect, test } from '@playwright/test'
import { APP_PATH, DISPLAYS, STEP1_TITLE, completeOnboarding } from './helpers.js'

/** PRD Non-functional: interactive in under 1 s (desktop, cache disabled). */
const FIRST_LOAD_BUDGET_MS = 1000
/** PRD Non-functional: an input updates within a frame, so under 50 ms here. */
const SEARCH_BUDGET_MS = 50
/** Loads measured for the first-load figure. The median is reported. */
const LOAD_RUNS = 3

/**
 * The median of a list of numbers.
 *
 * @param {number[]} values
 * @returns {number}
 *
 * @example
 * median([3, 1, 2]) // 2
 */
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

test.describe('performance (PRD Non-functional: Performance)', () => {
  test('@desktop first load shows onboarding in under 1 s with the cache disabled', async ({
    browser,
  }) => {
    const interactive = []
    const details = []

    for (let run = 0; run < LOAD_RUNS; run += 1) {
      // A fresh context per run, so no service worker, HTTP cache or stored state is used.
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
      const page = await context.newPage()
      const session = await context.newCDPSession(page)
      await session.send('Network.setCacheDisabled', { cacheDisabled: true })

      // Records when the onboarding title first appears in the DOM. That is when the
      // person can act: the stored state has loaded and the first screen is drawn.
      await page.addInitScript(() => {
        const observer = new MutationObserver(() => {
          if (window.__interactiveAt !== undefined) return
          if (document.querySelector('.onboarding__title')) {
            window.__interactiveAt = performance.now()
            observer.disconnect()
          }
        })
        observer.observe(document, { childList: true, subtree: true })
      })

      await page.goto(APP_PATH)
      await expect(page.getByRole('heading', { level: 1, name: STEP1_TITLE })).toBeVisible()
      const timing = await page.evaluate(() => {
        const [navigation] = performance.getEntriesByType('navigation')
        return {
          interactiveAt: window.__interactiveAt,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          load: navigation.loadEventEnd,
        }
      })
      interactive.push(timing.interactiveAt)
      details.push(timing)
      await context.close()
    }

    const worst = Math.max(...interactive)
    const summary = {
      runs: interactive.map((value) => Math.round(value)),
      medianMs: Math.round(median(interactive)),
      worstMs: Math.round(worst),
      domContentLoadedMs: Math.round(median(details.map(({ domContentLoaded }) => domContentLoaded))),
      loadMs: Math.round(median(details.map(({ load }) => load))),
    }
    test.info().annotations.push({ type: 'first-load', description: JSON.stringify(summary) })
    expect(worst, JSON.stringify(summary)).toBeLessThan(FIRST_LOAD_BUDGET_MS)
  })

  test('@desktop typing in search updates the list within 50 ms', async ({ page }) => {
    await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })

    // Times each input, inside the page, from the input event to the DOM update that shows
    // the new count. The next painted frame is timed too, for information: painting is
    // software rendering in a headless browser, so it is not what the budget measures.
    const samples = await page.evaluate(async (queries) => {
      const input = document.querySelector('.filter-bar input[type="search"]')
      const count = document.querySelector('.browse__count')
      /**
       * Dispatches one input and resolves once the count has changed.
       *
       * @param {string} value
       * @returns {Promise<{ value: string, ms: number, frameMs: number, text: string }>}
       */
      const timeInput = (value) =>
        new Promise((resolve, reject) => {
          const start = performance.now()
          const timer = setTimeout(() => {
            observer.disconnect()
            reject(new Error(`no update for "${value}"`))
          }, 2000)
          const observer = new MutationObserver(() => {
            observer.disconnect()
            clearTimeout(timer)
            const ms = performance.now() - start
            requestAnimationFrame(() =>
              resolve({
                value,
                ms,
                frameMs: performance.now() - start,
                text: count.textContent,
              }),
            )
          })
          observer.observe(count, { childList: true, characterData: true, subtree: true })
          input.value = value
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })

      const results = []
      for (const query of queries) {
        results.push(await timeInput(query))
      }
      return results
    }, ['MacBook', '', 'QHD', '', '4K UHD', ''])

    const times = samples.map(({ ms }) => ms)
    const round = (value) => Math.round(value * 10) / 10
    const summary = {
      medianMs: round(median(times)),
      worstMs: round(Math.max(...times)),
      worstWithFrameMs: round(Math.max(...samples.map(({ frameMs }) => frameMs))),
      samples: samples.map(({ value, ms }) => ({ value, ms: round(ms) })),
    }
    test.info().annotations.push({ type: 'search-input', description: JSON.stringify(summary) })

    expect(samples[0].text).toBe('Displays shown: 5')
    expect(Math.max(...times), JSON.stringify(summary)).toBeLessThan(SEARCH_BUDGET_MS)
  })
})
