import { expect } from '@playwright/test'

/**
 * Shared steps for the e2e specs. Every helper works from accessible roles and names, so
 * the specs also check that the controls are labelled. Viewport-dependent helpers read the
 * page's viewport: below 600 px (PRD: phones) Browse shows cards, not the table.
 */

/** App path under the GitHub Pages base (docs/DEPLOYMENT.md). */
export const APP_PATH = '/monitor-sizes/'

/** Title of onboarding step 1 (`onboarding.step1Title`). */
export const STEP1_TITLE = 'Which displays do you know?'

/** Title of onboarding step 2 (`onboarding.step2Title`). */
export const STEP2_TITLE = 'How do you use them?'

/**
 * Built-in displays used by the specs. `prefix` is the start of the checkbox label in
 * onboarding ("name, diagonal, resolution"). `name` and `diagonal` are how Browse shows
 * the display in its row or card.
 */
export const DISPLAYS = Object.freeze({
  mbp14: { name: 'MacBook Pro 14″', diagonal: '14.2″', prefix: 'MacBook Pro 14″, 14.2″' },
  uhd27: { name: '4K UHD', diagonal: '27″', prefix: '4K UHD, 27″' },
  uhd32: { name: '4K UHD', diagonal: '32″', prefix: '4K UHD, 32″' },
  uwqhd34: { name: 'UWQHD', diagonal: '34″', prefix: 'UWQHD, 34″' },
  fhd22: { name: 'Full HD', diagonal: '22″', prefix: 'Full HD, 22″' },
  qhd27: { name: 'QHD', diagonal: '27″', prefix: 'QHD, 27″' },
  mbp16: { name: 'MacBook Pro 16″', diagonal: '16.2″', prefix: 'MacBook Pro 16″, 16.2″' },
})

/**
 * Escapes text for use inside a RegExp.
 *
 * @param {string} text
 * @returns {string}
 *
 * @example
 * escapeRegExp('4K (UHD)') // '4K \\(UHD\\)'
 */
export const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Matches an accessible name that starts with the given text.
 *
 * @param {string} text
 * @returns {RegExp}
 *
 * @example
 * startsWith('QHD, 27″') // matches 'QHD, 27″, 2560 × 1440'
 */
export const startsWith = (text) => new RegExp(`^${escapeRegExp(text)}`)

/**
 * Whether the page is laid out for a phone (Browse shows cards below 600 px).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {boolean}
 */
export const isNarrow = (page) => (page.viewportSize()?.width ?? 1280) < 600

/**
 * Reads the link of the current comparison from the address bar. The store keeps the
 * address in step with the state, so the URL is the share link (PRD F19).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} The full URL with the `#s=…` hash.
 */
export const readShareLink = async (page) => {
  await expect.poll(() => page.url()).toContain('#s=')
  return page.url()
}

/**
 * Opens the app and completes first-run onboarding (PRD F2, F3). The first display in
 * `displays` becomes the baseline. Each row can be changed in step 2 through `setup`.
 *
 * @param {object} params
 * @param {import('@playwright/test').Page} params.page
 * @param {Array<typeof DISPLAYS[keyof typeof DISPLAYS]>} [params.displays] Displays to pick, in pick order.
 * @param {Record<string, { distance?: number, scale?: number }>} [params.setup]
 *   Per display `prefix`: `distance` in cm (metric, the default unit), `scale` as a factor
 *   such as `1.5`.
 * @returns {Promise<void>} Resolves when the Browse view is shown.
 *
 * @example
 * await completeOnboarding({ page, displays: [DISPLAYS.mbp14, DISPLAYS.uhd27] })
 */
export const completeOnboarding = async ({
  page,
  displays = [DISPLAYS.mbp14, DISPLAYS.uhd27],
  setup = {},
}) => {
  await page.goto(APP_PATH)
  await expect(page.getByRole('heading', { level: 1, name: STEP1_TITLE })).toBeVisible()
  for (const display of displays) {
    await page.getByRole('checkbox', { name: startsWith(display.prefix) }).check()
  }
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { level: 1, name: STEP2_TITLE })).toBeVisible()

  for (const display of displays) {
    const values = setup[display.prefix]
    if (!values) continue
    const row = page.getByRole('group', { name: startsWith(display.name) })
    if (values.distance !== undefined) {
      await fillNumber(
        row.getByRole('textbox', { name: 'Distance' }),
        String(values.distance),
      )
    }
    if (values.scale !== undefined) {
      await row
        .getByRole('combobox', { name: 'Scale' })
        .selectOption(String(values.scale))
    }
  }

  await page.getByRole('button', { name: 'Finish' }).click()
  await expectBrowse(page)
}

/**
 * Asserts the app shell (header with the view switch) is shown.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export const expectBrowse = (page) =>
  expect(page.getByRole('navigation', { name: 'Views' })).toBeVisible()

/**
 * Switches between the two top-level views from the header.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'browse'|'compare'} view
 * @returns {Promise<void>}
 */
export const goToView = async (page, view) => {
  const nav = page.getByRole('navigation', { name: 'Views' })
  await nav
    .getByRole('button', { name: view === 'compare' ? /^Compare/ : 'Browse' })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    view === 'compare' ? 'Compare' : 'Browse',
  )
}

/**
 * Opens the Settings dialog from the header.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>} The dialog.
 */
export const openSettings = async (page) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()
  return dialog
}

/**
 * Opens the Add display dialog from the header.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>} The dialog.
 */
export const openAddDisplay = async (page) => {
  await page.locator('.app-header').getByRole('button', { name: 'Add display' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add display' })
  await expect(dialog).toBeVisible()
  return dialog
}

/**
 * The Browse row (desktop table) or card (phone) of one display. Matching uses the name
 * and the diagonal, because several displays share a name.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string, diagonal: string }} display
 * @returns {import('@playwright/test').Locator}
 *
 * @example
 * await displayItem(page, DISPLAYS.uhd27).getByRole('checkbox').check()
 */
export const displayItem = (page, { name, diagonal }) => {
  const nameMatch = new RegExp(`^(Baseline )?${escapeRegExp(name)}( Custom)?$`)
  if (isNarrow(page)) {
    return page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { level: 3, name: nameMatch }) })
      .filter({ has: page.getByText(diagonal, { exact: true }) })
  }
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: nameMatch }) })
    .filter({ has: page.getByRole('cell', { name: diagonal, exact: true }) })
}

/**
 * Adds a built-in or custom display to the comparison from Browse (the Compare checkbox).
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string, diagonal: string }} display
 * @returns {Promise<void>}
 */
export const addToCompare = async (page, display) => {
  await displayItem(page, display)
    .getByRole('checkbox', { name: `Compare ${display.name}` })
    .check()
}

/**
 * Opens the actions dialog of a display by pressing its name in Browse.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string, diagonal: string }} display
 * @returns {Promise<import('@playwright/test').Locator>} The dialog.
 */
export const openDisplayActions = async (page, display) => {
  await displayItem(page, display)
    .getByRole('button', { name: display.name, exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: display.name, exact: true })
  await expect(dialog).toBeVisible()
  return dialog
}

/**
 * Types a number into a number field and leaves the field. The field commits its value on
 * blur (see number-field.jsx), so the blur is part of typing a value.
 *
 * @param {import('@playwright/test').Locator} field
 * @param {string} value
 * @returns {Promise<void>}
 */
export const fillNumber = async (field, value) => {
  await field.fill(value)
  await field.blur()
}

/**
 * Fills the Add display form and submits it. Only the fields given are changed, so a
 * dialog can be filled in steps.
 *
 * @param {object} params
 * @param {import('@playwright/test').Locator} params.dialog The Add display dialog.
 * @param {string} [params.name]
 * @param {string} [params.diagonal] Inches, as typed.
 * @param {string} [params.width] Pixels.
 * @param {string} [params.height] Pixels.
 * @param {boolean} [params.isFamiliar] Ticks "I know this one".
 * @param {boolean} [params.submit=true] Press "Add display" at the end.
 * @returns {Promise<void>}
 */
export const fillAddDisplay = async ({
  dialog,
  name,
  diagonal,
  width,
  height,
  isFamiliar,
  submit = true,
}) => {
  if (name !== undefined) await dialog.getByRole('textbox', { name: 'Name' }).fill(name)
  if (diagonal !== undefined) {
    await fillNumber(dialog.getByRole('textbox', { name: 'Diagonal' }), diagonal)
  }
  if (width !== undefined)
    await fillNumber(dialog.getByRole('textbox', { name: 'Width' }), width)
  if (height !== undefined) {
    await fillNumber(dialog.getByRole('textbox', { name: 'Height' }), height)
  }
  if (isFamiliar !== undefined) {
    const box = dialog.getByRole('checkbox', { name: 'I know this one' })
    if (isFamiliar) await box.check()
    else await box.uncheck()
  }
  if (submit) await dialog.getByRole('button', { name: 'Add display' }).click()
}

/**
 * Makes sure the service worker controls the page. A first visit installs the worker
 * without claiming the open page, so one reload hands control over (same approach as
 * pwa.spec.js).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export const ensureServiceWorkerController = async (page) => {
  const hasController = () =>
    page.evaluate(async () => {
      await navigator.serviceWorker.ready
      return navigator.serviceWorker.controller !== null
    })
  if (await hasController()) return
  await page.reload()
  await expect.poll(hasController).toBe(true)
}
