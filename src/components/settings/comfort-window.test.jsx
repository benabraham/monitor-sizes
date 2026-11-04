import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { ComfortWindow } from './comfort-window.jsx'
import { DEFAULT_COMFORT } from './comfort-form.js'

afterEach(() => {
  locale.value = 'en'
})

/**
 * Replace the value of a labelled number field and commit it with Tab.
 *
 * @param {import('@testing-library/user-event').UserEvent} user
 * @param {string} label
 * @param {string} text
 */
const typeInto = async (user, label, text) => {
  const field = screen.getByLabelText(label)
  await user.clear(field)
  await user.type(field, text)
  await user.tab()
}

describe('ComfortWindow', () => {
  it('shows the PPI fields and the rule toggle in PPI mode', () => {
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'PPI' }).checked).toBe(true)
    expect(screen.getByLabelText('Minimum PPI').value).toBe('90')
    expect(screen.getByLabelText('Maximum PPI').value).toBe('105')
    expect(screen.queryByLabelText('Minimum px/°')).toBeNull()
    expect(
      screen.queryByText(
        'Browse uses the baseline display’s viewing distance; Compare uses each display’s own distance.',
      ),
    ).toBeNull()
  })

  it('shows the pixels-per-degree fields and the baseline distance hint in PPD mode', () => {
    render(
      <ComfortWindow
        comfort={{ ...DEFAULT_COMFORT, mode: 'ppd' }}
        onComfortChange={() => {}}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Pixels per degree' }).checked).toBe(true)
    expect(screen.getByLabelText('Minimum px/°').value).toBe('37')
    expect(screen.getByLabelText('Maximum px/°').value).toBe('43')
    expect(screen.queryByLabelText('Minimum PPI')).toBeNull()
    expect(
      screen.getByText(
        'Browse uses the baseline display’s viewing distance; Compare uses each display’s own distance.',
      ),
    ).not.toBeNull()
  })

  it('always shows the minimum logical width in px', () => {
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={() => {}} />)
    expect(screen.getByLabelText('Minimum logical width').value).toBe('1024')
    expect(screen.getByText('px')).not.toBeNull()
  })

  it('switches the rule through onComfortChange({ mode })', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={onComfortChange} />)
    await user.click(screen.getByRole('radio', { name: 'Pixels per degree' }))
    expect(onComfortChange).toHaveBeenCalledWith({ mode: 'ppd' })
  })

  it('sends only the changed PPI bound', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={onComfortChange} />)
    await typeInto(user, 'Minimum PPI', '95')
    expect(onComfortChange).toHaveBeenCalledWith({ minPpi: 95 })
  })

  it('sends the PPD bounds in PPD mode', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(
      <ComfortWindow
        comfort={{ ...DEFAULT_COMFORT, mode: 'ppd' }}
        onComfortChange={onComfortChange}
      />,
    )
    await typeInto(user, 'Maximum px/°', '41')
    expect(onComfortChange).toHaveBeenCalledWith({ maxPpd: 41 })
  })

  it('sends the minimum width', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={onComfortChange} />)
    await typeInto(user, 'Minimum logical width', '1280')
    expect(onComfortChange).toHaveBeenCalledWith({ minWidth: 1280 })
  })

  it('does not send a change for an unedited field', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={onComfortChange} />)
    await user.click(screen.getByLabelText('Minimum PPI'))
    await user.tab()
    expect(onComfortChange).not.toHaveBeenCalled()
  })

  it('refuses a minimum above the maximum: shows an alert and sends nothing', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={onComfortChange} />)
    await typeInto(user, 'Minimum PPI', '110')

    expect(onComfortChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(
      'The minimum must not be higher than the maximum.',
    )
    expect(screen.getByLabelText('Minimum PPI').value).toBe('110')
  })

  it('sends the pending minimum together with a valid maximum, so the fields agree', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={onComfortChange} />)
    await typeInto(user, 'Minimum PPI', '110')
    await typeInto(user, 'Maximum PPI', '120')

    expect(onComfortChange).toHaveBeenCalledTimes(1)
    expect(onComfortChange).toHaveBeenCalledWith({ minPpi: 110, maxPpi: 120 })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('refuses a maximum below the minimum too', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={onComfortChange} />)
    await typeInto(user, 'Maximum PPI', '80')
    expect(onComfortChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).not.toBeNull()
  })

  it('restores the defaults with "Reset to defaults"', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(
      <ComfortWindow
        comfort={{ ...DEFAULT_COMFORT, mode: 'ppd', minWidth: 1600 }}
        onComfortChange={onComfortChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(onComfortChange).toHaveBeenCalledWith({
      mode: 'ppi',
      minPpi: 90,
      maxPpi: 105,
      minPpd: 37,
      maxPpd: 43,
      minWidth: 1024,
    })
  })

  it('clears a pending invalid pair when reset is pressed', async () => {
    const user = userEvent.setup()
    const onComfortChange = vi.fn()
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={onComfortChange} />)
    await typeInto(user, 'Minimum PPI', '110')
    expect(screen.getByRole('alert')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('Minimum PPI').value).toBe('90')
  })

  it('shows the state values again when they change from outside', () => {
    const { rerender } = render(
      <ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={() => {}} />,
    )
    rerender(
      <ComfortWindow
        comfort={{ ...DEFAULT_COMFORT, maxPpi: 120 }}
        onComfortChange={() => {}}
      />,
    )
    expect(screen.getByLabelText('Maximum PPI').value).toBe('120')
  })

  it('uses the Czech decimal and grouping formats in cs', () => {
    locale.value = 'cs'
    render(<ComfortWindow comfort={DEFAULT_COMFORT} onComfortChange={() => {}} />)
    expect(screen.getByLabelText('Minimální PPI').value).toBe('90')
    expect(screen.getByRole('radio', { name: 'Pixelů na stupeň' })).not.toBeNull()
  })
})
