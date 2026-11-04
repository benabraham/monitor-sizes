import { render, screen, waitFor } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { AddDisplayForm } from './add-display-form.jsx'
import { DISPLAY_4K_27, windowsScaleOptionsFor } from './add-display.fixtures.js'

const SCREEN_GUESS = {
  logicalWidth: 1920,
  logicalHeight: 1080,
  scale: 1.5,
  width: 2880,
  height: 1620,
}

/**
 * Render the form with the Windows scale options and a spy for submit.
 *
 * @param {object} [props] Extra props, merged over the defaults.
 * @returns {{ onSubmit: import('vitest').Mock, onCancel: import('vitest').Mock }}
 */
const renderForm = (props = {}) => {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  render(
    <AddDisplayForm
      units="metric"
      scaleOptionsFor={windowsScaleOptionsFor}
      guess={() => null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onSubmit, onCancel }
}

/**
 * Type a complete 27″ 4K display into the form, then leave the last field so
 * NumberField commits it (it commits on blur or Enter).
 *
 * @param {import('@testing-library/user-event').UserEvent} user
 * @param {{ name: string, diagonal: string, width: string, height: string }} [labels]
 *   Field labels in the active language.
 */
const fillFourK = async (
  user,
  labels = { name: 'Name', diagonal: 'Diagonal', width: 'Width', height: 'Height' },
) => {
  await user.type(screen.getByRole('textbox', { name: labels.name }), 'Office')
  await user.type(screen.getByRole('textbox', { name: labels.diagonal }), '27')
  await user.type(screen.getByRole('textbox', { name: labels.width }), '3840')
  await user.type(screen.getByRole('textbox', { name: labels.height }), '2160')
  await user.tab()
}

afterEach(() => {
  locale.value = 'en'
})

describe('AddDisplayForm fields', () => {
  it('shows name, diagonal, width and height as labelled fields, with the name focused', async () => {
    renderForm()
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy()
    expect(
      screen.getByRole('textbox', { name: 'Diagonal' }).getAttribute('inputmode'),
    ).toBe('decimal')
    expect(screen.getByRole('textbox', { name: 'Width' }).getAttribute('inputmode')).toBe(
      'numeric',
    )
    expect(
      screen.getByRole('textbox', { name: 'Height' }).getAttribute('inputmode'),
    ).toBe('numeric')
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }))
    })
  })

  it('keeps the submit button disabled and explains why until the form is valid', async () => {
    const user = userEvent.setup()
    renderForm()
    const submit = screen.getByRole('button', { name: 'Add display' })
    expect(submit.disabled).toBe(true)
    expect(screen.getByText('Fill in the required fields to continue.')).toBeTruthy()

    await fillFourK(user)
    expect(submit.disabled).toBe(false)
    expect(screen.queryByText('Fill in the required fields to continue.')).toBeNull()
  })

  it('shows the error for a diagonal out of range once the field is left, with aria wiring', async () => {
    const user = userEvent.setup()
    renderForm()
    const diagonal = screen.getByRole('textbox', { name: 'Diagonal' })
    await user.type(diagonal, '2')
    await user.tab()

    const message = await screen.findByText('Enter a diagonal from 5″ to 120″.')
    expect(diagonal.getAttribute('aria-invalid')).toBe('true')
    expect(diagonal.getAttribute('aria-describedby')).toContain(message.id)
  })

  it('does not complain about a field the person has not touched yet', () => {
    renderForm()
    expect(screen.queryByText('Enter the diagonal.')).toBeNull()
    expect(
      screen.getByRole('textbox', { name: 'Diagonal' }).getAttribute('aria-invalid'),
    ).toBeNull()
  })

  it('shows every error when Enter is pressed on an incomplete form', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '{Enter}')

    expect(await screen.findByText('Enter the diagonal.')).toBeTruthy()
    expect(screen.getAllByText('Enter the number of pixels.')).toHaveLength(2)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onCancel from the Cancel button', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('AddDisplayForm submit', () => {
  it('submits a 27″ 4K monitor with the suggested tag, default distance and best scale', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()
    await fillFourK(user)
    await user.click(screen.getByRole('button', { name: 'Add display' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload).toMatchObject({
      name: 'Office',
      diagonal: 27,
      width: 3840,
      height: 2160,
      tag: 'monitor',
      isFamiliar: false,
      scale: 1.75,
    })
    expect(payload.distance).toBeCloseTo(60 / 2.54, 6)
  })

  it('submits on Enter from the last field', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Office')
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '27')
    await user.type(screen.getByRole('textbox', { name: 'Width' }), '3840')
    await user.type(screen.getByRole('textbox', { name: 'Height' }), '2160{Enter}')

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ width: 3840, height: 2160 })
  })

  it('trims the name in the payload', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()
    await fillFourK(user)
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '  Desk  ')
    await user.click(screen.getByRole('button', { name: 'Add display' }))
    expect(onSubmit.mock.calls[0][0].name).toBe('Desk')
  })

  it('uses the submit label and the chosen tag when given', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm({ submitLabel: 'Add and select' })
    await fillFourK(user)
    await user.click(screen.getByRole('radio', { name: 'Ultrawide' }))
    await user.click(screen.getByRole('button', { name: 'Add and select' }))
    expect(onSubmit.mock.calls[0][0].tag).toBe('ultrawide')
  })
})

describe('AddDisplayForm live preview', () => {
  it('shows PPI 163, 16:9, 60 × 34 cm and a 69 cm diagonal for a 27″ 4K display', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillFourK(user)
    const preview = screen.getByRole('region', { name: 'Preview' })
    expect(preview.getAttribute('aria-live')).toBeNull()
    const live = preview.querySelector('[aria-live="polite"]')
    expect(live.textContent).toContain('163')
    expect(live.textContent).toContain('16:9')
    expect(live.textContent).toMatch(/60\s?cm\s×\s34\s?cm/)
    expect(live.textContent).toMatch(/69\s?cm/)
  })

  it('says what to enter while the display cannot be measured yet', () => {
    renderForm()
    expect(
      screen.getByText('Enter the diagonal and the resolution to see the preview.'),
    ).toBeTruthy()
  })

  it('shows the preview in inches with imperial units', async () => {
    const user = userEvent.setup()
    renderForm({ units: 'imperial' })
    await fillFourK(user)
    const live = screen
      .getByRole('region', { name: 'Preview' })
      .querySelector('[aria-live]')
    expect(live.textContent).toMatch(/23\.5\s?in/)
    expect(live.textContent).toMatch(/13\.2\s?in/)
  })
})

describe('AddDisplayForm presets and tags', () => {
  it('fills width and height from a resolution chip and marks it pressed', async () => {
    const user = userEvent.setup()
    renderForm()
    const group = screen.getByRole('group', { name: 'Common resolutions' })
    expect(group.querySelectorAll('button')).toHaveLength(13)

    const fourK = screen.getByRole('button', { name: '3840 × 2160' })
    expect(fourK.getAttribute('aria-pressed')).toBe('false')
    await user.click(fourK)

    expect(screen.getByRole('textbox', { name: 'Width' }).value).toBe('3840')
    expect(screen.getByRole('textbox', { name: 'Height' }).value).toBe('2160')
    expect(fourK.getAttribute('aria-pressed')).toBe('true')
  })

  it('suggests a laptop for a small diagonal and says so until a type is picked', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '14.2')
    await user.type(screen.getByRole('textbox', { name: 'Width' }), '3024')
    await user.type(screen.getByRole('textbox', { name: 'Height' }), '1964')
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Laptop' }).checked).toBe(true)
    expect(screen.getByText(/Suggested from the size and shape/)).toBeTruthy()

    await user.click(screen.getByRole('radio', { name: 'Monitor' }))
    expect(screen.getByRole('radio', { name: 'Monitor' }).checked).toBe(true)
    expect(screen.queryByText(/Suggested from the size and shape/)).toBeNull()
  })

  it('suggests an ultrawide for a width to height ratio of 2.2 or more', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '34')
    await user.type(screen.getByRole('textbox', { name: 'Width' }), '3440')
    await user.type(screen.getByRole('textbox', { name: 'Height' }), '1440')
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Ultrawide' }).checked).toBe(true)
  })
})

describe('AddDisplayForm "I know this one"', () => {
  it('is hidden in edit mode, and hidden when familiar displays are not offered', () => {
    const { unmount } = render(
      <AddDisplayForm
        initial={{
          isEditing: true,
          name: 'Office',
          diagonal: 27,
          width: 3840,
          height: 2160,
        }}
        units="metric"
        scaleOptionsFor={windowsScaleOptionsFor}
        onSubmit={() => {}}
        guess={() => null}
      />,
    )
    expect(screen.queryByRole('checkbox', { name: 'I know this one' })).toBeNull()
    unmount()

    render(
      <AddDisplayForm
        units="metric"
        canMarkFamiliar={false}
        scaleOptionsFor={windowsScaleOptionsFor}
        onSubmit={() => {}}
        guess={() => null}
      />,
    )
    expect(screen.queryByRole('checkbox', { name: 'I know this one' })).toBeNull()
  })

  it('reveals distance and scale when checked, with 60 cm and the best scale as defaults', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillFourK(user)
    expect(screen.queryByRole('combobox', { name: 'Scale' })).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'I know this one' }))
    expect(screen.getByRole('textbox', { name: 'Distance' }).value).toBe('60')
    expect(
      screen.getByRole('textbox', { name: 'Distance' }).closest('.number-field')
        .textContent,
    ).toContain('cm')
    expect(screen.getByRole('combobox', { name: 'Scale' }).value).toBe('1.75')
  })

  it('uses 45 cm as the default distance for a laptop', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '14.2')
    await user.type(screen.getByRole('textbox', { name: 'Width' }), '3024')
    await user.type(screen.getByRole('textbox', { name: 'Height' }), '1964')
    await user.click(screen.getByRole('checkbox', { name: 'I know this one' }))
    expect(screen.getByRole('textbox', { name: 'Distance' }).value).toBe('45')
  })

  it('submits the distance in inches when the metric value is typed in cm', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()
    await fillFourK(user)
    await user.click(screen.getByRole('checkbox', { name: 'I know this one' }))
    const distance = screen.getByRole('textbox', { name: 'Distance' })
    await user.clear(distance)
    await user.type(distance, '50')
    await user.click(screen.getByRole('button', { name: 'Add display' }))

    const payload = onSubmit.mock.calls[0][0]
    expect(payload.isFamiliar).toBe(true)
    expect(payload.distance).toBeCloseTo(50 / 2.54, 6)
  })

  it('submits the distance in inches when the imperial value is typed in inches', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm({ units: 'imperial' })
    await fillFourK(user)
    await user.click(screen.getByRole('checkbox', { name: 'I know this one' }))
    const distance = screen.getByRole('textbox', { name: 'Distance' })
    expect(distance.value).toBe('23.6')
    await user.clear(distance)
    await user.type(distance, '20')
    await user.click(screen.getByRole('button', { name: 'Add display' }))

    expect(onSubmit.mock.calls[0][0].distance).toBeCloseTo(20, 6)
  })

  it('submits the scale the person picks', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()
    await fillFourK(user)
    await user.click(screen.getByRole('checkbox', { name: 'I know this one' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Scale' }), '1.5')
    await user.click(screen.getByRole('button', { name: 'Add display' }))
    expect(onSubmit.mock.calls[0][0].scale).toBe(1.5)
  })

  it('requires a distance within 10 to 300 cm once the display is familiar', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillFourK(user)
    await user.click(screen.getByRole('checkbox', { name: 'I know this one' }))
    const distance = screen.getByRole('textbox', { name: 'Distance' })
    await user.clear(distance)
    await user.type(distance, '5')
    await user.tab()

    expect(await screen.findByText('Enter a distance from 10 cm to 300 cm.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add display' }).disabled).toBe(true)
  })
})

describe('AddDisplayForm "Like my screen"', () => {
  it('is not offered when the browser reports no screen size', () => {
    renderForm({ guess: () => null })
    expect(screen.queryByRole('button', { name: 'Like my screen' })).toBeNull()
  })

  it('fills the native size and scale, then asks for the diagonal and focuses it', async () => {
    const user = userEvent.setup()
    renderForm({ guess: () => SCREEN_GUESS })
    await user.click(screen.getByRole('button', { name: 'Like my screen' }))

    expect(screen.getByRole('textbox', { name: 'Width' }).value).toBe('2880')
    expect(screen.getByRole('textbox', { name: 'Height' }).value).toBe('1620')
    expect(screen.getByText('Now enter the diagonal.').getAttribute('role')).toBe(
      'status',
    )
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Diagonal' }))
  })

  it('keeps the browser scale for a familiar display and hides the note once the diagonal is entered', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm({ guess: () => SCREEN_GUESS })
    await user.click(screen.getByRole('button', { name: 'Like my screen' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Laptop')
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '14')
    await user.tab()
    expect(screen.queryByText('Now enter the diagonal.')).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'I know this one' }))
    expect(screen.getByRole('combobox', { name: 'Scale' }).value).toBe('1.5')
    await user.click(screen.getByRole('button', { name: 'Add display' }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      width: 2880,
      height: 1620,
      scale: 1.5,
    })
  })

  it('is not offered when editing a display', () => {
    renderForm({
      guess: () => SCREEN_GUESS,
      initial: {
        isEditing: true,
        name: 'Office',
        diagonal: 27,
        width: 3840,
        height: 2160,
      },
    })
    expect(screen.queryByRole('button', { name: 'Like my screen' })).toBeNull()
  })
})

describe('AddDisplayForm editing', () => {
  it('starts from the given display and keeps its tag and distance', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm({
      submitLabel: 'Save',
      initial: {
        isEditing: true,
        ...DISPLAY_4K_27,
        isFamiliar: true,
        distance: 30 / 2.54,
        scale: 1.25,
      },
    })
    expect(screen.getByRole('textbox', { name: 'Name' }).value).toBe('4K 27″')
    expect(screen.getByRole('textbox', { name: 'Diagonal' }).value).toBe('27')
    expect(screen.getByRole('radio', { name: 'Monitor' }).checked).toBe(true)
    expect(screen.queryByRole('checkbox', { name: 'I know this one' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: '4K 27″',
      tag: 'monitor',
      isFamiliar: true,
      scale: 1.25,
    })
    expect(onSubmit.mock.calls[0][0].distance).toBeCloseTo(30 / 2.54, 6)
  })

  it('uses the default submit label "Save" when editing', () => {
    renderForm({ initial: { isEditing: true, ...DISPLAY_4K_27 } })
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  })
})

describe('AddDisplayForm in Czech', () => {
  it('translates labels, messages and the submit button, and uses a decimal comma', async () => {
    locale.value = 'cs'
    const user = userEvent.setup()
    renderForm({ units: 'imperial' })
    expect(screen.getByRole('textbox', { name: 'Název' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Úhlopříčka' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Šířka' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Přidat displej' })).toBeTruthy()

    await fillFourK(user, {
      name: 'Název',
      diagonal: 'Úhlopříčka',
      width: 'Šířka',
      height: 'Výška',
    })
    const live = screen
      .getByRole('region', { name: 'Náhled' })
      .querySelector('[aria-live]')
    expect(live.textContent).toMatch(/23,5\s?in/)

    await user.click(screen.getByRole('checkbox', { name: 'Tento displej znám' }))
    expect(screen.getByRole('textbox', { name: 'Vzdálenost' }).value).toBe('23,6')
    expect(screen.getByRole('combobox', { name: 'Měřítko' }).value).toBe('1.75')
  })

  it('shows Czech error text', async () => {
    locale.value = 'cs'
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByRole('textbox', { name: 'Úhlopříčka' }), '200')
    await user.tab()
    expect(await screen.findByText('Zadejte úhlopříčku od 5″ do 120″.')).toBeTruthy()
  })
})
