import { render, screen, waitFor, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { defaultDistanceFor } from '../../lib/units.js'
import { getDefaultScale } from '../add-display/add-display-model.js'
import {
  DISPLAY_4K_27,
  DISPLAY_FHD_24,
  DISPLAY_MBP_14,
  DISPLAY_UW_34,
  windowsScaleOptionsFor,
} from '../add-display/add-display.fixtures.js'
import { Onboarding } from './onboarding.jsx'

const DISPLAYS = [DISPLAY_4K_27, DISPLAY_FHD_24, DISPLAY_MBP_14, DISPLAY_UW_34]

/**
 * Prefill as the store would supply it: default distance for the type and the
 * best comfortable scale.
 *
 * @param {object} display
 * @returns {{ distance: number, scale: number }}
 */
const getDefaults = (display) => ({
  distance: defaultDistanceFor(display),
  scale: getDefaultScale({ display, scaleOptions: windowsScaleOptionsFor(display) }),
})

/**
 * Render onboarding with spies for every callback.
 *
 * @param {object} [props]
 * @returns {{ onComplete: import('vitest').Mock, onUnitsChange: import('vitest').Mock,
 *   onAddCustom: import('vitest').Mock }}
 */
const renderOnboarding = (props = {}) => {
  const onComplete = vi.fn()
  const onUnitsChange = vi.fn()
  const onAddCustom = props.onAddCustom ?? vi.fn()
  render(
    <Onboarding
      displays={DISPLAYS}
      units="metric"
      onUnitsChange={onUnitsChange}
      scaleOptionsFor={windowsScaleOptionsFor}
      getDefaults={getDefaults}
      guess={() => null}
      {...props}
      onAddCustom={onAddCustom}
      onComplete={onComplete}
    />,
  )
  return { onComplete, onUnitsChange, onAddCustom }
}

/**
 * Checkbox for a display in step 1, found by the start of its name.
 *
 * @param {string} name
 * @returns {HTMLInputElement}
 */
const checkboxFor = (name) =>
  screen.getByRole('checkbox', { name: new RegExp(`^${name}`) })

/** Pick displays by name, in the order given. */
const pick = async (user, names) => {
  for (const name of names) {
    await user.click(checkboxFor(name))
  }
}

afterEach(() => {
  locale.value = 'en'
})

describe('Onboarding step 1: which displays do you know', () => {
  it('opens on step 1 with the question, intro and progress', () => {
    renderOnboarding()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Which displays do you know?' }),
    ).toBeTruthy()
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    expect(screen.getByText(/Pick the displays you have seen or own/)).toBeTruthy()
  })

  it('preselects nothing and disables Continue with a visible reason', () => {
    renderOnboarding()
    screen
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox.checked).toBe(false))
    expect(screen.getByRole('button', { name: 'Continue' }).disabled).toBe(true)
    expect(screen.getByText('Pick at least one display')).toBeTruthy()
    expect(screen.getByText('Selected: 0')).toBeTruthy()
  })

  it('cannot be skipped: there is no close, skip or dismiss control', () => {
    renderOnboarding()
    expect(screen.queryByRole('button', { name: /skip|close|dismiss|later/i })).toBeNull()
  })

  it('groups displays by type with a checkbox for each, showing name, diagonal and resolution', () => {
    renderOnboarding()
    const laptops = screen.getByRole('group', { name: 'Laptops' })
    expect(
      within(laptops).getByRole('checkbox', {
        name: 'MacBook Pro 14″, 14.2″, 3024 × 1964',
      }),
    ).toBeTruthy()
    const monitors = screen.getByRole('group', { name: 'Monitors' })
    expect(
      within(monitors).getByRole('checkbox', { name: '4K 27″, 27″, 3840 × 2160' }),
    ).toBeTruthy()
    expect(
      within(monitors).getByRole('checkbox', { name: 'FHD 24″, 24″, 1920 × 1080' }),
    ).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Ultrawides' })).toBeTruthy()
  })

  it('filters the list with the search box, by name, diagonal or resolution', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    const search = screen.getByRole('searchbox', { name: 'Search displays' })

    await user.type(search, 'macbook')
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)

    await user.clear(search)
    await user.type(search, '1920')
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    expect(checkboxFor('FHD 24″')).toBeTruthy()

    await user.clear(search)
    await user.type(search, 'nothing like this')
    expect(screen.getByText('No displays match “nothing like this”.')).toBeTruthy()
  })

  it('enables Continue once a display is picked, and reports the count', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await pick(user, ['4K 27″'])
    expect(screen.getByRole('button', { name: 'Continue' }).disabled).toBe(false)
    expect(screen.queryByText('Pick at least one display')).toBeNull()
    expect(screen.getByText('Selected: 1')).toBeTruthy()
  })

  it('offers the unit switch and reports the change', async () => {
    const user = userEvent.setup()
    const { onUnitsChange } = renderOnboarding()
    expect(screen.getByRole('radio', { name: 'Metric' }).checked).toBe(true)
    await user.click(screen.getByRole('radio', { name: 'Imperial' }))
    expect(onUnitsChange).toHaveBeenCalledWith('imperial')
  })

  it('adds a display that is missing, selects it at once and closes the form', async () => {
    const user = userEvent.setup()
    const added = {
      id: 'c-1',
      name: 'Office 32',
      diagonal: 32,
      width: 2560,
      height: 1440,
      tag: 'monitor',
      isCustom: true,
    }
    const { onAddCustom } = renderOnboarding({ onAddCustom: vi.fn(() => added) })

    await user.click(screen.getByRole('button', { name: 'Add your own' }))
    expect(screen.getByRole('heading', { name: 'Add your own display' })).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'I know this one' })).toBeNull()
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }))
    })

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Office 32')
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '32')
    await user.type(screen.getByRole('textbox', { name: 'Width' }), '2560')
    await user.type(screen.getByRole('textbox', { name: 'Height' }), '1440')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Add and select' }))

    expect(onAddCustom).toHaveBeenCalledTimes(1)
    expect(onAddCustom.mock.calls[0][0]).toMatchObject({
      name: 'Office 32',
      diagonal: 32,
      width: 2560,
      height: 1440,
    })
    expect(screen.getByText('Selected: 1')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Add your own display' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: /^Office 32/ }).checked).toBe(true)
  })

  it('keeps the inline form open and selects nothing when the display is not added', async () => {
    const user = userEvent.setup()
    renderOnboarding({ onAddCustom: vi.fn(() => null) })
    await user.click(screen.getByRole('button', { name: 'Add your own' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ghost')
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '27')
    await user.type(screen.getByRole('textbox', { name: 'Width' }), '2560')
    await user.type(screen.getByRole('textbox', { name: 'Height' }), '1440')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Add and select' }))

    expect(screen.getByRole('heading', { name: 'Add your own display' })).toBeTruthy()
    expect(screen.getByText('Selected: 0')).toBeTruthy()
  })

  it('closes the inline form on Cancel without adding anything', async () => {
    const user = userEvent.setup()
    const { onAddCustom } = renderOnboarding()
    await user.click(screen.getByRole('button', { name: 'Add your own' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onAddCustom).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Add your own' })).toBeTruthy()
  })
})

describe('Onboarding step 2: how do you use them', () => {
  it('moves to step 2 with the picked displays and says which one is the baseline', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await pick(user, ['4K 27″', 'FHD 24″'])
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'How do you use them?' }),
    ).toBeTruthy()
    expect(screen.getByText('Step 2 of 2')).toBeTruthy()
    const rows = screen.getAllByRole('group')
    expect(
      rows.map((row) => within(row).getByText(/4K 27″|FHD 24″/).textContent),
    ).toEqual(['4K 27″', 'FHD 24″'])
    expect(screen.getAllByText('Baseline')).toHaveLength(1)
    expect(
      screen.getByText(
        'The first display you pick is the baseline. You can change it later.',
      ),
    ).toBeTruthy()
  })

  it('makes the first picked display the baseline, even if the list order differs', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await pick(user, ['FHD 24″', '4K 27″'])
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    const first = screen.getAllByRole('group')[0]
    expect(within(first).getByText('Baseline')).toBeTruthy()
    expect(first.querySelector('legend').textContent).toContain('FHD 24″')
  })

  it('moves the baseline to the next display when the first is unpicked', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await pick(user, ['FHD 24″', '4K 27″'])
    await pick(user, ['FHD 24″'])
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    const rows = screen.getAllByRole('group')
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByText('Baseline')).toBeTruthy()
    expect(rows[0].querySelector('legend').textContent).toContain('4K 27″')
  })

  it('prefills distance (45 cm for a laptop, 60 cm otherwise) and the scale from getDefaults', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await pick(user, ['4K 27″', 'MacBook Pro 14″'])
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    const distances = screen.getAllByRole('textbox', { name: 'Distance' })
    expect(distances.map((field) => field.value)).toEqual(['60', '45'])
    const scales = screen.getAllByRole('combobox', { name: 'Scale' })
    expect(scales.map((select) => select.value)).toEqual(['1.75', '2'])
  })

  it('shows distances in inches with imperial units and submits them in inches', async () => {
    const user = userEvent.setup()
    const { onComplete } = renderOnboarding({ units: 'imperial' })
    await pick(user, ['FHD 24″'])
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    const distance = screen.getByRole('textbox', { name: 'Distance' })
    expect(distance.value).toBe('23.6')
    await user.clear(distance)
    await user.type(distance, '28')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(onComplete.mock.calls[0][0].familiar[0].distance).toBeCloseTo(28, 6)
  })

  it('lets the person change the scale of a row', async () => {
    const user = userEvent.setup()
    const { onComplete } = renderOnboarding()
    await pick(user, ['FHD 24″'])
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Scale' }), '1.25')
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(onComplete.mock.calls[0][0].familiar[0].scale).toBe(1.25)
  })

  it('goes back to step 1 keeping the selection, and forward again', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await pick(user, ['4K 27″'])
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Which displays do you know?' }),
    ).toBeTruthy()
    expect(checkboxFor('4K 27″').checked).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getAllByRole('group')).toHaveLength(1)
  })

  it('completes with the familiar set in pick order, each with distance and scale', async () => {
    const user = userEvent.setup()
    const { onComplete } = renderOnboarding()
    await pick(user, ['MacBook Pro 14″', '4K 27″'])
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const { familiar } = onComplete.mock.calls[0][0]
    expect(familiar.map(({ id }) => id)).toEqual([DISPLAY_MBP_14.id, DISPLAY_4K_27.id])
    expect(familiar[0].distance).toBeCloseTo(45 / 2.54, 6)
    expect(familiar[0].scale).toBe(2)
    expect(familiar[1].distance).toBeCloseTo(60 / 2.54, 6)
    expect(familiar[1].scale).toBe(1.75)
  })

  it('selects a display added from the inline form, with its defaults, as the next row', async () => {
    const user = userEvent.setup()
    const added = {
      id: 'c-2',
      name: 'Desk 27',
      diagonal: 27,
      width: 2560,
      height: 1440,
      tag: 'monitor',
    }
    const { onComplete } = renderOnboarding({ onAddCustom: vi.fn(() => added) })
    await pick(user, ['FHD 24″'])
    await user.click(screen.getByRole('button', { name: 'Add your own' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Desk 27')
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '27')
    await user.type(screen.getByRole('textbox', { name: 'Width' }), '2560')
    await user.type(screen.getByRole('textbox', { name: 'Height' }), '1440')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Add and select' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    const rows = screen.getAllByRole('group')
    expect(rows.map((row) => row.querySelector('legend').textContent)).toEqual([
      'FHD 24″Baseline',
      'Desk 27',
    ])
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(onComplete.mock.calls[0][0].familiar.map(({ id }) => id)).toEqual([
      DISPLAY_FHD_24.id,
      'c-2',
    ])
  })
})

describe('Onboarding in Czech', () => {
  it('translates the steps, the hint and the progress line', async () => {
    locale.value = 'cs'
    const user = userEvent.setup()
    renderOnboarding()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Které displeje znáte?' }),
    ).toBeTruthy()
    expect(screen.getByText('Krok 1 z 2')).toBeTruthy()
    expect(screen.getByText('Vyberte alespoň jeden displej')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Notebooky' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /^MacBook Pro 14″, 14,2″/ })).toBeTruthy()

    await pick(user, ['4K 27″'])
    await user.click(screen.getByRole('button', { name: 'Pokračovat' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Jak je používáte?' }),
    ).toBeTruthy()
    expect(screen.getByText('Krok 2 z 2')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Měřítko' })).toBeTruthy()
  })
})
