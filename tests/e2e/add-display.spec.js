import { expect, test } from '@playwright/test'
import {
  DISPLAYS,
  completeOnboarding,
  displayItem,
  fillAddDisplay,
  openAddDisplay,
  openDisplayActions,
} from './helpers.js'

/** PRD success metric: adding a new display from a spec sheet takes under 30 s. */
const ADD_BUDGET_MS = 30000

test.describe('add a custom display (PRD F4, F5)', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding({ page })
  })

  test('the form previews PPI and aspect while typing, and needs every required field', async ({
    page,
  }) => {
    const dialog = await openAddDisplay(page)
    const submit = dialog.getByRole('button', { name: 'Add display' })
    await expect(submit).toBeDisabled()

    await fillAddDisplay({
      dialog,
      name: 'Studio 27',
      diagonal: '27',
      width: '3840',
      submit: false,
    })
    await expect(submit).toBeDisabled()

    await fillAddDisplay({ dialog, height: '2160', submit: false })
    const preview = dialog.getByRole('region', { name: 'Preview' })
    await expect(preview).toContainText('163')
    await expect(preview).toContainText('16:9')
    await expect(submit).toBeEnabled()
  })

  test('adds a display that you know, which then shows in the familiar strip and Browse', async ({
    page,
  }) => {
    const started = Date.now()
    const dialog = await openAddDisplay(page)
    await fillAddDisplay({
      dialog,
      name: 'Studio 27',
      diagonal: '27',
      width: '3840',
      height: '2160',
      isFamiliar: true,
    })
    await expect(dialog).toBeHidden()
    const elapsed = Date.now() - started
    test.info().annotations.push({ type: 'add-display-ms', description: String(elapsed) })
    expect(elapsed).toBeLessThan(ADD_BUDGET_MS)

    const strip = page.getByRole('region', { name: 'Familiar displays' })
    await expect(strip.getByRole('button', { name: /^Studio 27 27″/ })).toBeVisible()
    const row = displayItem(page, { name: 'Studio 27', diagonal: '27″' })
    await expect(row).toBeVisible()
    await expect(row.getByText('Custom')).toBeVisible()
  })

  test('a display added without "I know this one" is listed in Browse only', async ({ page }) => {
    const dialog = await openAddDisplay(page)
    await fillAddDisplay({ dialog, name: 'Office 24', diagonal: '24', width: '1920', height: '1080' })
    await expect(dialog).toBeHidden()

    const strip = page.getByRole('region', { name: 'Familiar displays' })
    await expect(strip.getByRole('button', { name: /^Office 24 24″/ })).toHaveCount(0)
    await expect(displayItem(page, { name: 'Office 24', diagonal: '24″' })).toBeVisible()
  })

  test('edit a custom display from its actions dialog', async ({ page }) => {
    const dialog = await openAddDisplay(page)
    await fillAddDisplay({
      dialog,
      name: 'Studio 27',
      diagonal: '27',
      width: '3840',
      height: '2160',
      isFamiliar: true,
    })
    await expect(dialog).toBeHidden()

    const actions = await openDisplayActions(page, { name: 'Studio 27', diagonal: '27″' })
    await actions.getByRole('button', { name: 'Edit', exact: true }).click()
    const editDialog = page.getByRole('dialog', { name: 'Edit display' })
    await expect(editDialog).toBeVisible()
    await expect(editDialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Studio 27')
    await fillAddDisplay({ dialog: editDialog, name: 'Studio 27 Pro', submit: false })
    await editDialog.getByRole('button', { name: 'Save' }).click()
    await expect(editDialog).toBeHidden()

    await expect(displayItem(page, { name: 'Studio 27 Pro', diagonal: '27″' })).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Familiar displays' }).getByRole('button', {
        name: /^Studio 27 Pro 27″/,
      }),
    ).toBeVisible()
  })

  test('delete a custom display from its actions dialog, after confirming', async ({ page }) => {
    const dialog = await openAddDisplay(page)
    await fillAddDisplay({
      dialog,
      name: 'Studio 27',
      diagonal: '27',
      width: '3840',
      height: '2160',
      isFamiliar: true,
    })
    await expect(dialog).toBeHidden()

    const actions = await openDisplayActions(page, { name: 'Studio 27', diagonal: '27″' })
    await actions.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(actions.getByText('Delete “Studio 27”?')).toBeVisible()
    await actions.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByRole('dialog', { name: 'Studio 27', exact: true })).toHaveCount(0)
    await expect(displayItem(page, { name: 'Studio 27', diagonal: '27″' })).toHaveCount(0)
    await expect(
      page.getByRole('region', { name: 'Familiar displays' }).getByRole('button', {
        name: /^Studio 27 27″/,
      }),
    ).toHaveCount(0)
  })

  test('a built-in display is not deletable, only hideable', async ({ page }) => {
    const actions = await openDisplayActions(page, DISPLAYS.uhd32)
    await expect(actions.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0)
    await expect(actions.getByRole('button', { name: 'Hide from list' })).toBeVisible()
  })
})
