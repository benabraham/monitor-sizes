import { expect, test } from '@playwright/test'
import {
  DISPLAYS,
  addToCompare,
  completeOnboarding,
  goToView,
} from './helpers.js'

/**
 * Asserts that a locator's box lies inside the visible viewport.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} locator
 * @returns {Promise<void>}
 */
const expectInViewport = (page, locator) =>
  expect
    .poll(async () => {
      const box = await locator.boundingBox()
      const viewport = page.viewportSize()
      if (!box || !viewport) return false
      return box.y >= 0 && box.y + box.height <= viewport.height
    })
    .toBe(true)

/**
 * The text of the viewing-distance description of a button, read from its
 * `aria-describedby` target, for example "Sets the viewing distance to 77 cm".
 *
 * @param {import('@playwright/test').Locator} button
 * @returns {Promise<string>}
 */
const describedText = (button) =>
  button.evaluate((element) => {
    const id = element.getAttribute('aria-describedby') ?? ''
    return document.getElementById(id)?.textContent ?? ''
  })

/** The candidate's card in Compare, found by its diagonal and name. */
const candidate = (page, display) =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByRole('group', { name: new RegExp(`^${display.diagonal} ${display.name}`) }) })

test.describe('compare', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
    await addToCompare(page, DISPLAYS.uhd32)
    await addToCompare(page, DISPLAYS.uwqhd34)
    await goToView(page, 'compare')
  })

  test('the visualization is on screen and stays on screen when scrolled', async ({ page }) => {
    const visual = page.getByRole('img', { name: /^Physical size of the compared displays/ })
    await expect(visual).toBeVisible()
    await expectInViewport(page, visual)

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    await expect(visual).toBeVisible()
    await expectInViewport(page, visual)
  })

  test('Physical and As seen switch the drawing and its caption', async ({ page }) => {
    const mode = page.getByRole('group', { name: 'Drawing mode' })
    await expect(mode.getByRole('radio', { name: 'Physical' })).toBeChecked()
    await expect(page.getByRole('img', { name: /^Physical size/ })).toBeVisible()

    // The radio is visually hidden inside its label, so the label is what a person clicks.
    await mode.locator('label', { hasText: 'As seen' }).click()

    await expect(page.getByRole('img', { name: /^Apparent size of the compared displays/ })).toBeVisible()
    await expect(page.getByText(/^As seen: each outline shows its angle/)).toBeVisible()

    await mode.locator('label', { hasText: 'Physical' }).click()
    await expect(page.getByRole('img', { name: /^Physical size/ })).toBeVisible()
  })

  test('changing a candidate scale rewrites the equivalence line', async ({ page }) => {
    // The line says where the candidate matches the baseline. It depends on the baseline
    // distance and on the candidate's scale, not on the candidate's own distance.
    const card = candidate(page, DISPLAYS.uhd32)
    const line = card.getByText(/^Looks like your 14\.2″ MacBook Pro 14″/)
    await expect(line).toContainText(/\(150\s*%\)$/)
    const before = await line.textContent()

    await card.getByRole('combobox', { name: 'Scale' }).selectOption('1.25')

    await expect(line).toContainText(/\(125\s*%\)$/)
    await expect(line).not.toHaveText(before)
  })

  test('Match size sets the candidate distance to the size-equivalent distance', async ({ page }) => {
    const card = candidate(page, DISPLAYS.uhd32)
    const matchSize = card.getByRole('button', { name: 'Match size' })
    const target = await describedText(matchSize)
    const distance = target.match(/(\d+)\s*cm/)?.[1]
    expect(distance, target).toBeTruthy()

    await matchSize.click()

    await expect(card.getByRole('textbox', { name: 'Exact distance' })).toHaveValue(distance)
  })

  test('the metric grid lists the baseline first', async ({ page }) => {
    const grid = page.getByRole('table', { name: 'Metrics for each compared display' })
    const headers = grid.getByRole('columnheader')
    await expect(headers.nth(0)).toHaveText('Metric')
    await expect(headers.nth(1)).toContainText('MacBook Pro 14″')
    await expect(headers.nth(1)).toContainText('Baseline')
    await expect(headers.nth(2)).toContainText('4K UHD')
    await expect(headers.nth(3)).toContainText('4K UHD')
    await expect(headers.nth(3)).toContainText('Candidate')
    await expect(headers.nth(4)).toContainText('UWQHD')
  })

  test('the scaling matrix marks the comfortable scales of a candidate', async ({ page }) => {
    // Two matrices are captioned "4K UHD", in Compare order: the familiar 27″, then the 32″.
    const matrix = page.getByRole('table', { name: /^Scaling options for 4K UHD/ }).nth(1)
    await expect(matrix).toBeVisible()
    // 32″ 4K at 150 % has 92 effective PPI, inside the 90–105 window.
    const row150 = matrix.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '150 %' }) })
    await expect(row150.getByRole('cell', { name: /^Comfortable/ })).toBeVisible()
    await expect(row150).toContainText('92')
    // 100 % has 138 effective PPI, outside the window.
    const row100 = matrix.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '100 %' }) })
    await expect(row100.getByRole('cell', { name: 'Outside the comfort window' })).toBeVisible()
  })
})
