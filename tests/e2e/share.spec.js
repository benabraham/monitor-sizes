import { expect, test } from '@playwright/test'
import {
  DISPLAYS,
  STEP1_TITLE,
  addToCompare,
  completeOnboarding,
  displayItem,
  fillAddDisplay,
  fillNumber,
  goToView,
  openAddDisplay,
  readShareLink,
} from './helpers.js'

/** The custom display carried by the link, with its diagonal as Browse shows it. */
const STUDIO = { name: 'Studio 27', diagonal: '27″' }

/**
 * Builds a comparison that uses every part of a link: two familiar displays (the baseline
 * and a 27″ 4K at 70 cm and 150 %), a custom display, and a 32″ candidate at 80 cm.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} The share link of the comparison.
 */
const buildComparison = async (page) => {
  await completeOnboarding({
    page,
    displays: [DISPLAYS.mbp14, DISPLAYS.uhd27],
    setup: { [DISPLAYS.uhd27.prefix]: { distance: 70, scale: 1.5 } },
  })
  const dialog = await openAddDisplay(page)
  await fillAddDisplay({
    dialog,
    name: STUDIO.name,
    diagonal: '27',
    width: '2560',
    height: '1440',
  })
  await expect(dialog).toBeHidden()
  await addToCompare(page, STUDIO)
  await addToCompare(page, DISPLAYS.uhd32)
  await goToView(page, 'compare')

  const candidate = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('group', { name: /^32″ 4K UHD/ }) })
  await fillNumber(candidate.getByRole('textbox', { name: 'Exact distance' }), '80')
  await expect(candidate.getByRole('slider', { name: 'Distance' })).toHaveValue('80')
  return readShareLink(page)
}

test.describe('share a comparison by link (PRD F19)', () => {
  test('the link opens the same comparison for a visitor with no data of their own', async ({
    page,
    browser,
  }) => {
    const link = await buildComparison(page)

    const visitorContext = await browser.newContext({ viewport: page.viewportSize() })
    const visitor = await visitorContext.newPage()
    await visitor.goto(link)

    const banner = visitor.getByRole('region', { name: 'Shared comparison' })
    await expect(banner).toBeVisible()
    await expect(banner).toContainText("You're viewing a shared comparison.")
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('Compare')
    await expect(
      visitor.getByRole('heading', { level: 1, name: STEP1_TITLE }),
    ).toHaveCount(0)

    const compared = visitor.getByRole('list', { name: 'Compared displays' })
    await expect(compared).toContainText('MacBook Pro 14″')
    await expect(compared).toContainText('Studio 27')
    await expect(compared).toContainText('32″ 4K UHD')

    const candidate = visitor
      .getByRole('listitem')
      .filter({ has: visitor.getByRole('group', { name: /^32″ 4K UHD/ }) })
    await expect(candidate.getByRole('textbox', { name: 'Exact distance' })).toHaveValue(
      '80',
    )
    await expect(
      visitor
        .getByRole('listitem')
        .filter({ has: visitor.getByRole('group', { name: /^27″ 4K UHD/ }) })
        .getByRole('textbox', { name: 'Exact distance' }),
    ).toHaveValue('70')

    await visitorContext.close()
  })

  test('"Back to mine" discards the link and shows onboarding for the visitor', async ({
    page,
    browser,
  }) => {
    const link = await buildComparison(page)

    const visitorContext = await browser.newContext({ viewport: page.viewportSize() })
    const visitor = await visitorContext.newPage()
    await visitor.goto(link)
    await expect(visitor.getByRole('region', { name: 'Shared comparison' })).toBeVisible()

    await visitor.getByRole('button', { name: 'Back to mine' }).click()

    await expect(visitor.getByRole('region', { name: 'Shared comparison' })).toHaveCount(
      0,
    )
    await expect(
      visitor.getByRole('heading', { level: 1, name: STEP1_TITLE }),
    ).toBeVisible()
    // Nothing of the sender's comparison is in the visitor's own storage.
    await expect(visitor.getByRole('checkbox', { name: /^Studio 27/ })).toHaveCount(0)
    await expect(
      visitor.getByRole('checkbox', { name: /^4K UHD, 32″/ }),
    ).not.toBeChecked()

    await visitorContext.close()
  })

  test('"Keep it" saves the shared comparison, and it survives a reload', async ({
    page,
    browser,
  }) => {
    const link = await buildComparison(page)

    const visitorContext = await browser.newContext({ viewport: page.viewportSize() })
    const visitor = await visitorContext.newPage()
    await visitor.goto(link)
    await expect(visitor.getByRole('region', { name: 'Shared comparison' })).toBeVisible()

    await visitor.getByRole('button', { name: 'Keep it' }).click()
    await expect(visitor.getByRole('region', { name: 'Shared comparison' })).toHaveCount(
      0,
    )

    await visitor.reload()

    await expect(visitor.getByRole('region', { name: 'Shared comparison' })).toHaveCount(
      0,
    )
    await expect(
      visitor.getByRole('heading', { level: 1, name: STEP1_TITLE }),
    ).toHaveCount(0)
    await goToView(visitor, 'browse')
    const strip = visitor.getByRole('region', { name: 'Familiar displays' })
    await expect(
      strip.getByRole('listitem').filter({ hasText: 'MacBook Pro 14″' }),
    ).toContainText('Baseline')
    await expect(strip.getByRole('button', { name: /^4K UHD 27″/ })).toBeVisible()
    await expect(displayItem(visitor, STUDIO)).toBeVisible()

    await visitorContext.close()
  })

  test('Copy link puts the address of the comparison on the clipboard', async ({
    page,
    context,
  }) => {
    await buildComparison(page)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(page.url()).origin,
    })

    await page.getByRole('button', { name: 'Copy link' }).click()

    await expect(
      page.locator('.app-header').getByRole('status').filter({ hasText: 'Link copied' }),
    ).toBeAttached()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(page.url())
  })
})
