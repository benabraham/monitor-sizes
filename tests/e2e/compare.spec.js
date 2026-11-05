import { expect, test } from '@playwright/test'
import { DISPLAYS, addToCompare, completeOnboarding, goToView } from './helpers.js'

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
  page.getByRole('listitem').filter({
    has: page.getByRole('group', {
      name: new RegExp(`^${display.diagonal} ${display.name}`),
    }),
  })

test.describe('compare', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
    await addToCompare(page, DISPLAYS.uhd32)
    await addToCompare(page, DISPLAYS.uwqhd34)
    await goToView(page, 'compare')
  })

  test('the visualization is on screen and stays on screen when scrolled', async ({
    page,
  }) => {
    const visual = page.getByRole('img', {
      name: /^Physical size of the compared displays/,
    })
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

    await expect(
      page.getByRole('img', { name: /^Apparent size of the compared displays/ }),
    ).toBeVisible()
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

  test('Match size sets the candidate distance to the size-equivalent distance', async ({
    page,
  }) => {
    const card = candidate(page, DISPLAYS.uhd32)
    const matchSize = card.getByRole('button', { name: 'Match size' })
    const target = await describedText(matchSize)
    const distance = target.match(/(\d+)\s*cm/)?.[1]
    expect(distance, target).toBeTruthy()

    await matchSize.click()

    await expect(card.getByRole('textbox', { name: 'Exact distance' })).toHaveValue(
      distance,
    )
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

  test('the scaling matrix marks the comfortable scales of a candidate', async ({
    page,
  }) => {
    // Two matrices are captioned "4K UHD", in Compare order: the familiar 27″, then the 32″.
    const matrix = page.getByRole('table', { name: /^Scaling options for 4K UHD/ }).nth(1)
    await expect(matrix).toBeVisible()
    // 32″ 4K at 150 % has 92 effective PPI, inside the 90–105 window.
    const row150 = matrix
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: '150 %' }) })
    await expect(row150.getByRole('cell', { name: /^Comfortable/ })).toBeVisible()
    await expect(row150).toContainText('92')
    // 100 % has 138 effective PPI, outside the window.
    const row100 = matrix
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: '100 %' }) })
    await expect(
      row100.getByRole('cell', { name: 'Outside the comfort window' }),
    ).toBeVisible()
  })

  test('the preview spans the full width and takes at most 60 % of the viewport height', async ({
    page,
  }) => {
    const preview = await page.locator('.compare-visual__preview').boundingBox()
    const main = await page.locator('.app-main').boundingBox()
    const viewport = page.viewportSize()
    expect(preview).not.toBeNull()
    expect(preview.height).toBeLessThanOrEqual(viewport.height * 0.6 + 1)
    expect(preview.width).toBeGreaterThanOrEqual(main.width - 1)
  })

  test('the drawing labels sit inside their outlines and never overlap', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const svg = document.querySelector('.visualization__svg').getBoundingClientRect()
      const boxes = [...document.querySelectorAll('text.visualization__label')].map(
        (node) => ({ text: node.textContent, box: node.getBoundingClientRect() }),
      )
      const clashes = []
      boxes.forEach((a, index) =>
        boxes.slice(index + 1).forEach((b) => {
          const overlap =
            a.box.left < b.box.right &&
            b.box.left < a.box.right &&
            a.box.top < b.box.bottom &&
            b.box.top < a.box.bottom
          if (overlap) clashes.push([a.text, b.text])
        }),
      )
      const outside = boxes
        .filter(
          ({ box }) =>
            box.left < svg.left || box.right > svg.right || box.top < svg.top || box.bottom > svg.bottom,
        )
        .map(({ text }) => text)
      return { count: boxes.length, clashes, outside }
    })
    expect(result.count).toBe(4)
    expect(result.clashes).toEqual([])
    expect(result.outside).toEqual([])
  })

  test('the page does not scroll sideways', async ({ page }) => {
    const widths = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.innerWidth)
  })

  test('Set as baseline makes a candidate the baseline, and the numbers follow', async ({
    page,
  }) => {
    const manager = page.getByRole('region', { name: 'Displays in this comparison' })
    const row = manager.getByRole('listitem').filter({ hasText: '34″ UWQHD' })
    await row.getByRole('button', { name: 'Set 34″ UWQHD as baseline' }).click()

    await expect(row).toContainText('Baseline')
    await expect(manager.getByRole('button', { name: 'Set 34″ UWQHD as baseline' })).toHaveCount(0)
    await expect(
      page.locator('text.visualization__label', { hasText: '34″ UWQHD · Baseline' }),
    ).toHaveCount(1)
    // The former baseline is still familiar, so it keeps its Hide button.
    await expect(
      manager.getByRole('button', { name: 'Hide 14.2″ MacBook Pro 14″ from Compare' }),
    ).toBeVisible()
  })

  test('switching the scale preset in the header to macOS shows the looks-like sizes', async ({
    page,
  }) => {
    const header = page.locator('.app-header')
    await header.locator('label', { hasText: 'macOS' }).click()
    await expect(header.getByRole('radio', { name: 'macOS' })).toBeChecked()

    const matrix = page.getByRole('table', { name: /^Scaling options for 4K UHD/ }).nth(1)
    await expect(matrix.getByText(/looks like/).first()).toBeVisible()
  })
})
