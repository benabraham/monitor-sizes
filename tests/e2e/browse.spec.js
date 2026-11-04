import { expect, test } from '@playwright/test'
import {
  DISPLAYS,
  completeOnboarding,
  displayItem,
  goToView,
  isNarrow,
} from './helpers.js'

/**
 * The count line under the filters, "Displays shown: N" (`browse.count`).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
const shownCount = async (page) => {
  const text = await page.getByText(/^Displays shown: /).textContent()
  return Number(text.replace(/\D/g, ''))
}

test.describe('browse', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
  })

  test('@desktop sorting by PPI toggles aria-sort and orders the rows', async ({ page }) => {
    const header = page.getByRole('columnheader', { name: /^PPI/ })
    const sortButton = header.getByRole('button', { name: 'PPI', exact: true })
    /** PPI values down the table, in row order. */
    const ppis = () =>
      page.locator('tbody tr').evaluateAll((rows) =>
        rows.map((row) => Number(row.children[4]?.textContent.replace(/\s/g, ''))),
      )
    const isSortedBy = (values, direction) =>
      values.every((value, index) =>
        index === 0 || (direction === 'ascending' ? values[index - 1] <= value : values[index - 1] >= value),
      )

    // The table starts sorted by PPI, highest first.
    await expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(isSortedBy(await ppis(), 'descending')).toBe(true)

    await sortButton.click()
    await expect(header).toHaveAttribute('aria-sort', 'ascending')
    await expect.poll(async () => isSortedBy(await ppis(), 'ascending')).toBe(true)

    await sortButton.click()
    await expect(header).toHaveAttribute('aria-sort', 'descending')
    await expect.poll(async () => isSortedBy(await ppis(), 'descending')).toBe(true)
  })

  test('search narrows the displays by name', async ({ page }) => {
    const before = await shownCount(page)

    await page.getByRole('searchbox', { name: 'Search displays' }).fill('MacBook')

    await expect.poll(() => shownCount(page)).toBeLessThan(before)
    await expect(page.getByText('Displays shown: 5')).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search displays' }).fill('')
    await expect.poll(() => shownCount(page)).toBe(before)
  })

  test('the comfortable-only filter reduces the list', async ({ page }) => {
    const before = await shownCount(page)

    await page.getByRole('checkbox', { name: 'Only displays with a comfortable scale' }).check()

    await expect.poll(() => shownCount(page)).toBeLessThan(before)
    await expect(page.getByRole('checkbox', { name: 'Only displays with a comfortable scale' })).toBeChecked()
  })

  test('starring a display adds it to the familiar strip', async ({ page }) => {
    const qhd = displayItem(page, DISPLAYS.qhd27)
    const star = qhd.getByRole('button', { name: 'Mark QHD as familiar' })
    await expect(star).toHaveAttribute('aria-pressed', 'false')

    await star.click()

    await expect(star).toHaveAttribute('aria-pressed', 'true')
    const strip = page.getByRole('region', { name: 'Familiar displays' })
    await expect(strip.getByRole('button', { name: /^QHD 27″/ })).toBeVisible()
  })

  test('tapping a familiar chip makes it the baseline', async ({ page }) => {
    const strip = page.getByRole('region', { name: 'Familiar displays' })
    const mbp = strip.getByRole('listitem').filter({ hasText: 'MacBook Pro 14″' })
    const uhd = strip.getByRole('listitem').filter({ hasText: /4K UHD/ })
    await expect(mbp).toContainText('Baseline')
    await expect(uhd).not.toContainText('Baseline')

    await uhd.getByRole('button', { name: /^4K UHD 27″/ }).click()

    await expect(uhd).toContainText('Baseline')
    await expect(mbp).not.toContainText('Baseline')
    // The new baseline is compared with itself, so its relative size reads "same".
    await expect(displayItem(page, DISPLAYS.uhd27).getByText('same', { exact: true }).first()).toBeVisible()
  })

  test('@desktop shows the sortable table', async ({ page }) => {
    expect(isNarrow(page)).toBe(false)
    await expect(page.getByRole('table', { name: 'Displays compared with the baseline' })).toBeVisible()
    await expect(
      page
        .getByRole('row')
        .filter({ has: page.getByRole('checkbox', { name: 'Compare 4K UHD' }) })
        .first(),
    ).toBeVisible()
  })

  test('@phone shows the displays as cards, not a table', async ({ page }) => {
    expect(isNarrow(page)).toBe(true)
    await expect(page.getByRole('table', { name: 'Displays compared with the baseline' })).toBeHidden()

    const card = displayItem(page, DISPLAYS.uhd27)
    await expect(card).toBeVisible()
    await expect(card.getByText('Best comfortable scale')).toBeVisible()
    await expect(card.getByRole('checkbox', { name: 'Compare 4K UHD' })).toBeVisible()
  })

  test('the Compare button in Browse opens the comparison', async ({ page }) => {
    await goToView(page, 'compare')
    await expect(page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Compare (2)' })).toBeVisible()
  })
})
