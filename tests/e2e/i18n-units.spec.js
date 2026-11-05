import { expect, test } from '@playwright/test'
import {
  DISPLAYS,
  STEP1_TITLE,
  completeOnboarding,
  ensureServiceWorkerController,
  goToView,
} from './helpers.js'

/**
 * Opens Settings from the header. The button and the dialog are named in the current
 * language, so the name is passed in: "Settings" or "Nastavení".
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} buttonName Accessible name of the header button.
 * @returns {Promise<import('@playwright/test').Locator>} The open dialog.
 */
const openSettingsIn = async (page, buttonName) => {
  await page.getByRole('button', { name: buttonName, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

/**
 * Switches the interface language from Settings, then closes the dialog. The dialog is
 * found by role, because its name changes with the language.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'English'|'Čeština'} language The label of the language radio.
 * @param {string} [buttonName='Settings'] The header button's name in the current language.
 * @returns {Promise<void>}
 */
const chooseLanguage = async (page, language, buttonName = 'Settings') => {
  const dialog = await openSettingsIn(page, buttonName)
  await dialog.locator('label', { hasText: language }).click()
  await expect(dialog.getByRole('radio', { name: language })).toBeChecked()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
}

test.describe('language and units (PRD F16, F17)', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
  })

  test('Čeština changes the texts, uses a decimal comma and sets the page language', async ({
    page,
  }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(
      page
        .getByRole('navigation', { name: 'Views' })
        .getByRole('button', { name: 'Browse' }),
    ).toBeVisible()
    await expect(page.getByText('14.2″', { exact: true }).first()).toBeVisible()

    await chooseLanguage(page, 'Čeština')

    await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
    const views = page.getByRole('navigation', { name: 'Zobrazení' })
    await expect(views.getByRole('button', { name: 'Procházet' })).toBeVisible()
    await expect(
      views.getByRole('button', { name: /^Porovnat \(0\)|^Porovnat$|^Porovnat \(/ }),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: 'Známé displeje' })).toBeVisible()
    await expect(page.getByText('14,2″', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('14.2″', { exact: true })).toHaveCount(0)
  })

  test('imperial units show inches in Compare', async ({ page }) => {
    const dialog = await openSettingsIn(page, 'Settings')
    await dialog.locator('label', { hasText: 'Imperial' }).click()
    await expect(dialog.getByRole('radio', { name: 'Imperial' })).toBeChecked()
    await page.keyboard.press('Escape')

    await goToView(page, 'compare')
    const baseline = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('group', { name: /^14\.2″ MacBook Pro 14″/ }) })
    // The baseline is 45 cm away, which is 17.7 in.
    await expect(baseline.getByRole('textbox', { name: 'Exact distance' })).toHaveValue(
      '17.7',
    )
    await expect(baseline.getByText('in', { exact: true }).first()).toBeVisible()
  })

  test('the language and units survive a reload', async ({ page }) => {
    // Units first: after the switch to Czech the labels are in Czech too.
    const dialog = await openSettingsIn(page, 'Settings')
    await dialog.locator('label', { hasText: 'Imperial' }).click()
    await dialog.locator('label', { hasText: 'Čeština' }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs')

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
    await expect(page.getByRole('navigation', { name: 'Zobrazení' })).toBeVisible()
    const reopened = await openSettingsIn(page, 'Nastavení')
    await expect(reopened.getByRole('radio', { name: 'Čeština' })).toBeChecked()
    await expect(reopened.getByRole('radio', { name: 'Imperiální' })).toBeChecked()
    await expect(reopened.getByRole('radio', { name: 'Metrické' })).not.toBeChecked()
  })
})

test.describe('offline language switch (PRD F16, Offline)', () => {
  test('after the service worker controls the page, reload and language switch work offline', async ({
    page,
    context,
  }) => {
    await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
    await ensureServiceWorkerController(page)

    await context.setOffline(true)
    await page.reload()

    await expect(page.getByRole('navigation', { name: 'Views' })).toBeVisible()
    await expect(page.locator('#app')).not.toBeEmpty()

    await chooseLanguage(page, 'Čeština')
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
    await expect(page.getByRole('navigation', { name: 'Zobrazení' })).toBeVisible()

    await context.setOffline(false)
  })

  test('a first visit that is then reloaded offline still shows onboarding', async ({
    page,
    context,
  }) => {
    await page.goto('/monitor-sizes/')
    await expect(page.getByRole('heading', { level: 1, name: STEP1_TITLE })).toBeVisible()
    await ensureServiceWorkerController(page)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: STEP1_TITLE })).toBeVisible()
    await context.setOffline(false)
  })
})
