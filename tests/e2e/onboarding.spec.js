import { expect, test } from '@playwright/test'
import {
  APP_PATH,
  DISPLAYS,
  STEP1_TITLE,
  STEP2_TITLE,
  completeOnboarding,
  expectBrowse,
  startsWith,
} from './helpers.js'

test.describe('first run onboarding (PRD F2, F3)', () => {
  test('blocks Continue until one display is picked', async ({ page }) => {
    await page.goto(APP_PATH)

    await expect(page.getByRole('heading', { level: 1, name: STEP1_TITLE })).toBeVisible()
    await expect(page.getByText('Step 1 of 2')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await expect(
      page.getByRole('status').filter({ hasText: 'Pick at least one display' }),
    ).toBeVisible()
    await expect(page.getByText('Selected: 0')).toBeVisible()

    await page.getByRole('checkbox', { name: startsWith(DISPLAYS.mbp14.prefix) }).check()

    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()
    await expect(page.getByText('Selected: 1')).toBeVisible()
  })

  test('search narrows the list and two picks are selected', async ({ page }) => {
    await page.goto(APP_PATH)
    const search = page.getByRole('searchbox', { name: 'Search displays' })
    const allCheckboxes = page.getByRole('checkbox')
    const total = await allCheckboxes.count()

    await search.fill('MacBook')

    await expect(page.getByRole('checkbox', { name: /^MacBook/ }).first()).toBeVisible()
    await expect.poll(() => allCheckboxes.count()).toBeLessThan(total)
    await expect(page.getByRole('checkbox', { name: /^4K UHD/ })).toHaveCount(0)

    await page.getByRole('checkbox', { name: startsWith(DISPLAYS.mbp14.prefix) }).check()
    await page.getByRole('checkbox', { name: /^MacBook Pro 16″/ }).check()
    await expect(page.getByText('Selected: 2')).toBeVisible()

    await search.fill('')
    await expect(page.getByRole('checkbox', { name: /^4K UHD/ }).first()).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /^MacBook Pro 14″/ })).toBeChecked()
  })

  test('step 2 prefills distance and scale, and the first pick is the baseline', async ({
    page,
  }) => {
    await page.goto(APP_PATH)
    await page.getByRole('checkbox', { name: startsWith(DISPLAYS.mbp14.prefix) }).check()
    await page.getByRole('checkbox', { name: startsWith(DISPLAYS.uhd27.prefix) }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1, name: STEP2_TITLE })).toBeVisible()
    await expect(page.getByText('Step 2 of 2')).toBeVisible()

    const laptop = page.getByRole('group', { name: /^MacBook Pro 14″/ })
    await expect(laptop.getByText('Baseline', { exact: true })).toBeVisible()
    await expect(laptop.getByRole('textbox', { name: 'Distance' })).toHaveValue('45')
    await expect(laptop.getByRole('combobox', { name: 'Scale' })).toHaveValue('2')

    const monitor = page.getByRole('group', { name: /^4K UHD/ })
    await expect(monitor.getByText('Baseline', { exact: true })).toHaveCount(0)
    await expect(monitor.getByRole('textbox', { name: 'Distance' })).toHaveValue('60')
    await expect(monitor.getByRole('combobox', { name: 'Scale' })).not.toHaveValue('')
  })

  test('finishing shows Browse with the familiar strip, and the state survives a reload', async ({
    page,
  }) => {
    await completeOnboarding({
      page,
      displays: [DISPLAYS.mbp14, DISPLAYS.uhd27],
      setup: { [DISPLAYS.uhd27.prefix]: { distance: 70, scale: 1.5 } },
    })

    const strip = page.getByRole('region', { name: 'Familiar displays' })
    await expect(
      strip.getByRole('listitem').filter({ hasText: 'MacBook Pro 14″' }),
    ).toContainText('Baseline')
    await expect(strip.getByRole('button', { name: /^4K UHD 27″/ })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Browse')

    await page.reload()

    await expectBrowse(page)
    await expect(page.getByRole('heading', { level: 1, name: STEP1_TITLE })).toHaveCount(
      0,
    )
    await expect(
      page.getByRole('region', { name: 'Familiar displays' }).getByRole('button', {
        name: /^4K UHD 27″/,
      }),
    ).toBeVisible()
  })

  test('the familiar displays keep the distance and scale chosen in step 2', async ({
    page,
  }) => {
    await completeOnboarding({
      page,
      displays: [DISPLAYS.mbp14, DISPLAYS.uhd27],
      setup: { [DISPLAYS.uhd27.prefix]: { distance: 70, scale: 1.5 } },
    })
    await page
      .getByRole('navigation', { name: 'Views' })
      .getByRole('button', { name: /^Compare/ })
      .click()

    const monitor = page.getByRole('group', { name: /^27″ 4K UHD/ })
    await expect(monitor.getByRole('textbox', { name: 'Exact distance' })).toHaveValue(
      '70',
    )
    await expect(monitor.getByRole('combobox', { name: 'Scale' })).toHaveValue('1.5')
  })

  test('the first display picked becomes the baseline, whatever the list order', async ({
    page,
  }) => {
    await completeOnboarding({ page, displays: [DISPLAYS.uhd27, DISPLAYS.mbp14] })

    const strip = page.getByRole('region', { name: 'Familiar displays' })
    const first = strip.getByRole('listitem').first()
    await expect(first).toContainText('Baseline')
    await expect(first).toContainText('4K UHD')
    await expect(strip.getByRole('listitem').filter({ hasText: 'Baseline' })).toHaveCount(
      1,
    )
  })
})
