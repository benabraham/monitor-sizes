import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  APP_PATH,
  DISPLAYS,
  STEP1_TITLE,
  addToCompare,
  completeOnboarding,
  expectBrowse,
  goToView,
  openAddDisplay,
  openSettings,
  STEP2_TITLE,
} from './helpers.js'

/** WCAG 2.2 AA, as the PRD requires (Non-functional: Accessibility). */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Runs axe on the page as it is now and asserts there are no violations. The failure
 * message lists each violated rule with its first few nodes, so a fix can be targeted.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
const expectNoA11yViolations = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const summary = violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    targets: nodes.slice(0, 3).map(({ target }) => target.join(' ')),
  }))
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([])
}

for (const colorScheme of /** @type {const} */ (['light', 'dark'])) {
  test.describe(`accessibility, ${colorScheme}`, () => {
    test.use({ colorScheme })

    test('onboarding step 1 has no WCAG 2.2 AA violations', async ({ page }) => {
      await page.goto(APP_PATH)
      await expect(
        page.getByRole('heading', { level: 1, name: STEP1_TITLE }),
      ).toBeVisible()
      await expectNoA11yViolations(page)
    })

    test('onboarding step 1 with a pick and the inline add form open', async ({
      page,
    }) => {
      await page.goto(APP_PATH)
      await page.getByRole('checkbox', { name: /^MacBook Pro 14″/ }).check()
      await page.getByRole('button', { name: 'Add your own' }).click()
      await expect(
        page.getByRole('heading', { name: 'Add your own display' }),
      ).toBeVisible()
      await expectNoA11yViolations(page)
    })

    test('onboarding step 2 has no WCAG 2.2 AA violations', async ({ page }) => {
      await page.goto(APP_PATH)
      await page.getByRole('checkbox', { name: /^MacBook Pro 14″/ }).check()
      await page.getByRole('checkbox', { name: /^4K UHD, 27″/ }).check()
      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(
        page.getByRole('heading', { level: 1, name: STEP2_TITLE }),
      ).toBeVisible()
      await expectNoA11yViolations(page)
    })

    test('Browse has no WCAG 2.2 AA violations (table on desktop, cards on phone)', async ({
      page,
    }) => {
      await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
      await expect(page.getByRole('region', { name: 'Browse' })).toBeVisible()
      await expectNoA11yViolations(page)
    })

    test('Compare has no WCAG 2.2 AA violations', async ({ page }) => {
      await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
      await addToCompare(page, DISPLAYS.uhd32)
      await addToCompare(page, DISPLAYS.uwqhd34)
      await goToView(page, 'compare')
      await expect(page.getByRole('img', { name: /^Physical size/ })).toBeVisible()
      await expectNoA11yViolations(page)
    })

    test('the Settings dialog has no WCAG 2.2 AA violations', async ({ page }) => {
      await completeOnboarding({ page })
      await openSettings(page)
      await expectNoA11yViolations(page)
    })

    test('the Add display dialog has no WCAG 2.2 AA violations', async ({ page }) => {
      await completeOnboarding({ page })
      await openAddDisplay(page)
      await expectNoA11yViolations(page)
    })

    test('a help popover is open without violations', async ({ page }) => {
      await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
      await addToCompare(page, DISPLAYS.uhd32)
      await goToView(page, 'compare')
      await page
        .getByRole('table', { name: 'Metrics for each compared display' })
        .getByRole('button', { name: 'Help: Resolution' })
        .click()
      await expect(page.getByRole('dialog', { name: 'Resolution' })).toBeVisible()
      await expectNoA11yViolations(page)
    })
  })
}

test.describe('keyboard', () => {
  test('from the page start, Tab reaches the skip link, then the view switch', async ({
    page,
  }) => {
    await completeOnboarding({ page })
    // A fresh load starts focus at the top of the document. After onboarding, the view
    // heading holds focus, so the Tab order would begin after it.
    await page.reload()
    await expectBrowse(page)

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(
      page
        .getByRole('navigation', { name: 'Views' })
        .getByRole('button', { name: 'Browse' }),
    ).toBeFocused()
  })

  test('the skip link moves focus to the main content', async ({ page }) => {
    await completeOnboarding({ page })
    await page.reload()
    await expectBrowse(page)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    await expect(page.locator('main#main')).toBeFocused()
  })

  test('the Settings dialog traps focus, and Escape closes it and returns focus', async ({
    page,
  }) => {
    await completeOnboarding({ page })
    const opener = page.getByRole('button', { name: 'Settings', exact: true })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await expect(dialog).toBeVisible()

    const focusIsInside = () =>
      page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))
    for (let index = 0; index < 40; index += 1) {
      await page.keyboard.press('Tab')
      expect(await focusIsInside()).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('the Add display dialog traps focus, and Escape closes it and returns focus', async ({
    page,
  }) => {
    await completeOnboarding({ page })
    const opener = page
      .locator('.app-header')
      .getByRole('button', { name: 'Add display' })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Add display' })
    await expect(dialog).toBeVisible()

    const focusIsInside = () =>
      page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))
    for (let index = 0; index < 40; index += 1) {
      await page.keyboard.press('Tab')
      expect(await focusIsInside()).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })
})
