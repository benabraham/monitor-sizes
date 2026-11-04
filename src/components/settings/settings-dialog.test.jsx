import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_COMFORT } from './comfort-form.js'
import { SettingsDialog } from './settings-dialog.jsx'

/**
 * Props every dialog test needs for the panel inside it.
 *
 * @param {object} [overrides]
 */
const panelProps = (overrides = {}) => ({
  units: 'metric',
  locale: 'en',
  presetId: 'windows',
  customScales: [],
  comfort: DEFAULT_COMFORT,
  onUnitsChange: vi.fn(),
  onLocaleChange: vi.fn(),
  onPresetChange: vi.fn(),
  onAddCustomScale: vi.fn(),
  onRemoveCustomScale: vi.fn(),
  onComfortChange: vi.fn(),
  ...overrides,
})

describe('SettingsDialog', () => {
  it('is titled "Settings" and shows the panel when open', () => {
    const { container } = render(
      <SettingsDialog isOpen onClose={() => {}} {...panelProps()} />,
    )
    expect(container.querySelector('dialog').hasAttribute('open')).toBe(true)
    expect(screen.getByRole('dialog', { name: 'Settings' })).not.toBeNull()
    expect(screen.getByRole('radio', { name: 'Metric' }).checked).toBe(true)
  })

  it('stays closed when isOpen is false', () => {
    const { container } = render(
      <SettingsDialog isOpen={false} onClose={() => {}} {...panelProps()} />,
    )
    expect(container.querySelector('dialog').hasAttribute('open')).toBe(false)
  })

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<SettingsDialog isOpen onClose={onClose} {...panelProps()} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('passes the panel callbacks through unchanged', async () => {
    const user = userEvent.setup()
    const props = panelProps()
    render(<SettingsDialog isOpen onClose={() => {}} {...props} />)
    await user.click(screen.getByRole('radio', { name: 'Imperial' }))
    expect(props.onUnitsChange).toHaveBeenCalledWith('imperial')
  })
})
