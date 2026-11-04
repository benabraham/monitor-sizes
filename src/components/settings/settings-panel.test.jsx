import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { DEFAULT_COMFORT } from './comfort-form.js'
import { SettingsPanel } from './settings-panel.jsx'

/**
 * Build the panel with stub callbacks; tests override what they check.
 *
 * @param {Partial<import('./settings-panel.jsx').SettingsPanel>} overrides
 */
const renderPanel = (overrides = {}) => {
  const callbacks = {
    onUnitsChange: vi.fn(),
    onLocaleChange: vi.fn(),
    onPresetChange: vi.fn(),
    onAddCustomScale: vi.fn(),
    onRemoveCustomScale: vi.fn(),
    onComfortChange: vi.fn(),
  }
  const props = {
    units: 'metric',
    locale: 'en',
    presetId: 'windows',
    customScales: [],
    comfort: DEFAULT_COMFORT,
    ...callbacks,
    ...overrides,
  }
  render(<SettingsPanel {...props} />)
  return callbacks
}

afterEach(() => {
  locale.value = 'en'
})

describe('SettingsPanel groups', () => {
  it('has five titled groups, each with a help popover', () => {
    renderPanel()
    ;['Units', 'Language', 'Scale preset', 'Custom scales', 'Comfort window'].forEach(
      (title) => {
        expect(screen.getByRole('region', { name: title })).not.toBeNull()
        expect(screen.getByRole('button', { name: `Help: ${title}` })).not.toBeNull()
      },
    )
  })

  it('names the groups in Czech when the locale is cs', () => {
    locale.value = 'cs'
    renderPanel({ locale: 'cs' })
    ;[
      'Jednotky',
      'Jazyk',
      'Předvolba měřítka',
      'Vlastní měřítka',
      'Pohodlné okno',
    ].forEach((title) => {
      expect(screen.getByRole('region', { name: title })).not.toBeNull()
    })
  })
})

describe('SettingsPanel units', () => {
  it('shows the current unit system as checked', () => {
    renderPanel({ units: 'imperial' })
    expect(screen.getByRole('radio', { name: 'Imperial' }).checked).toBe(true)
    expect(screen.getByRole('radio', { name: 'Metric' }).checked).toBe(false)
  })

  it('calls onUnitsChange with the picked system', async () => {
    const user = userEvent.setup()
    const { onUnitsChange } = renderPanel()
    await user.click(screen.getByRole('radio', { name: 'Imperial' }))
    expect(onUnitsChange).toHaveBeenCalledWith('imperial')
  })
})

describe('SettingsPanel language', () => {
  it('names each language in its own language, whatever the UI language', () => {
    renderPanel({ locale: 'cs' })
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeNull()
    expect(screen.getByRole('radio', { name: 'Čeština' })).not.toBeNull()
  })

  it('keeps the language names when the UI is English', () => {
    renderPanel({ locale: 'en' })
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeNull()
    expect(screen.getByRole('radio', { name: 'Čeština' })).not.toBeNull()
  })

  it('calls onLocaleChange with the picked language code', async () => {
    const user = userEvent.setup()
    const { onLocaleChange } = renderPanel()
    await user.click(screen.getByRole('radio', { name: 'Čeština' }))
    expect(onLocaleChange).toHaveBeenCalledWith('cs')
  })
})

describe('SettingsPanel scale presets', () => {
  it('offers Windows, macOS and Linux (Wayland) and reports the pick', async () => {
    const user = userEvent.setup()
    const { onPresetChange } = renderPanel({ presetId: 'windows' })
    expect(screen.getByRole('radio', { name: 'Windows' }).checked).toBe(true)
    await user.click(screen.getByRole('radio', { name: 'macOS' }))
    expect(onPresetChange).toHaveBeenCalledWith('macos')
    await user.click(screen.getByRole('radio', { name: 'Linux (Wayland)' }))
    expect(onPresetChange).toHaveBeenLastCalledWith('linux')
  })

  it('describes the Windows steps', () => {
    renderPanel({ presetId: 'windows' })
    expect(screen.getByText(/^100–200 % in 25 % steps\.$/)).not.toBeNull()
  })

  it('describes the macOS "looks like" widths', () => {
    renderPanel({ presetId: 'macos' })
    expect(screen.getByText(/“Looks like” widths from 1,280 to 3,200 px/)).not.toBeNull()
  })

  it('lists the Linux steps', () => {
    renderPanel({ presetId: 'linux' })
    expect(
      screen.getByText(/^Steps: 100 %, 110 %, 125 %, 150 %, 175 %, 200 %\.$/),
    ).not.toBeNull()
  })

  it('describes the Windows steps in Czech with a decimal-free format', () => {
    locale.value = 'cs'
    renderPanel({ presetId: 'windows', locale: 'cs' })
    expect(screen.getByText(/^100–200 % po 25 %\.$/)).not.toBeNull()
  })
})

describe('SettingsPanel custom scales', () => {
  it('adds a parsed custom scale through onAddCustomScale', async () => {
    const user = userEvent.setup()
    const { onAddCustomScale } = renderPanel()
    await user.type(screen.getByLabelText('Scale to add'), '1,33')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAddCustomScale).toHaveBeenCalledWith(1.33)
  })

  it('removes a custom scale through onRemoveCustomScale', async () => {
    const user = userEvent.setup()
    const { onRemoveCustomScale } = renderPanel({ customScales: [3] })
    await user.click(screen.getByRole('button', { name: /Remove 300/ }))
    expect(onRemoveCustomScale).toHaveBeenCalledWith(3)
  })

  it('shows the invalid-scale error and sends nothing for a bad entry', async () => {
    const user = userEvent.setup()
    const { onAddCustomScale } = renderPanel()
    await user.type(screen.getByLabelText('Scale to add'), '600')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAddCustomScale).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(
      /^Enter a scale from 50\u00a0% to 400\u00a0%/,
    )
  })
})

describe('SettingsPanel comfort window', () => {
  it('switches the rule through onComfortChange', async () => {
    const user = userEvent.setup()
    const { onComfortChange } = renderPanel()
    await user.click(screen.getByRole('radio', { name: 'Pixels per degree' }))
    expect(onComfortChange).toHaveBeenCalledWith({ mode: 'ppd' })
  })

  it('shows the fields of the active rule only', () => {
    renderPanel({ comfort: { ...DEFAULT_COMFORT, mode: 'ppd' } })
    expect(screen.getByLabelText('Minimum px/°')).not.toBeNull()
    expect(screen.queryByLabelText('Minimum PPI')).toBeNull()
    expect(screen.getByLabelText('Minimum logical width')).not.toBeNull()
  })

  it('sends a changed bound and the width through onComfortChange', async () => {
    const user = userEvent.setup()
    const { onComfortChange } = renderPanel()
    const maxField = screen.getByLabelText('Maximum PPI')
    await user.clear(maxField)
    await user.type(maxField, '110{Enter}')
    expect(onComfortChange).toHaveBeenCalledWith({ maxPpi: 110 })

    const widthField = screen.getByLabelText('Minimum logical width')
    await user.clear(widthField)
    await user.type(widthField, '1280{Enter}')
    expect(onComfortChange).toHaveBeenLastCalledWith({ minWidth: 1280 })
  })

  it('restores the default window with "Reset to defaults"', async () => {
    const user = userEvent.setup()
    const { onComfortChange } = renderPanel({
      comfort: { ...DEFAULT_COMFORT, minPpi: 95 },
    })
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(onComfortChange).toHaveBeenCalledWith(DEFAULT_COMFORT)
  })
})
