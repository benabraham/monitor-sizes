import { fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { AppHeader } from './app-header.jsx'

/**
 * Install a fake async clipboard on the navigator.
 *
 * @param {() => Promise<void>} writeText
 * @returns {import('vitest').Mock}
 */
const mockClipboard = (writeText = vi.fn(() => Promise.resolve())) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  return writeText
}

/**
 * Render the header with sensible defaults; tests override what they check.
 *
 * @param {Partial<import('./app-header.jsx').AppHeader>} overrides
 */
const renderHeader = (overrides = {}) =>
  render(
    <AppHeader
      view="browse"
      compareCount={3}
      onViewChange={vi.fn()}
      onAdd={vi.fn()}
      onOpenSettings={vi.fn()}
      linkUrl="https://example.test/#/share"
      {...overrides}
    />,
  )

afterEach(() => {
  locale.value = 'en'
  delete navigator.clipboard
})

describe('AppHeader', () => {
  it('shows the app name and a labelled navigation landmark', () => {
    renderHeader()
    expect(screen.getByText('Pixely a monitory')).not.toBeNull()
    expect(screen.getByRole('navigation', { name: 'Views' })).not.toBeNull()
  })

  it('marks only the active view with aria-current', () => {
    renderHeader({ view: 'compare' })
    expect(
      screen.getByRole('button', { name: 'Compare (3)' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      screen.getByRole('button', { name: 'Browse' }).hasAttribute('aria-current'),
    ).toBe(false)
  })

  it('moves the aria-current marker when the view changes', () => {
    const { rerender } = renderHeader({ view: 'browse' })
    expect(
      screen.getByRole('button', { name: 'Browse' }).getAttribute('aria-current'),
    ).toBe('page')
    rerender(
      <AppHeader view="compare" compareCount={3} onViewChange={() => {}} linkUrl="x" />,
    )
    expect(
      screen.getByRole('button', { name: 'Browse' }).hasAttribute('aria-current'),
    ).toBe(false)
    expect(
      screen.getByRole('button', { name: 'Compare (3)' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('passes the picked view to onViewChange', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    renderHeader({ view: 'browse', onViewChange })
    await user.click(screen.getByRole('button', { name: 'Compare (3)' }))
    expect(onViewChange).toHaveBeenCalledWith('compare')
    await user.click(screen.getByRole('button', { name: 'Browse' }))
    expect(onViewChange).toHaveBeenLastCalledWith('browse')
  })

  it('shows the number of displays being compared in the Compare label', () => {
    renderHeader({ compareCount: 0 })
    expect(screen.getByRole('button', { name: 'Compare (0)' })).not.toBeNull()
  })

  it('calls onAdd from the always-visible Add display button', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    renderHeader({ view: 'compare', onAdd })
    await user.click(screen.getByRole('button', { name: 'Add display' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenSettings from the settings icon button', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()
    renderHeader({ onOpenSettings })
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('copies linkUrl through its Copy link button', async () => {
    const writeText = mockClipboard()
    renderHeader({ linkUrl: 'https://example.test/#/share' })
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://example.test/#/share'),
    )
  })

  it('renders Czech labels when the locale is cs', () => {
    locale.value = 'cs'
    renderHeader({ compareCount: 2 })
    expect(screen.getByRole('button', { name: 'Porovnat (2)' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Procházet' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Přidat displej' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Nastavení' })).not.toBeNull()
  })
})

describe('AppHeader: scale preset switch', () => {
  it('shows the OS scale preset as a labelled switch, with the current preset checked', () => {
    renderHeader({ presetId: 'macos' })
    const group = screen.getByRole('group', { name: 'Scale preset' })
    expect(within(group).getByRole('radio', { name: 'macOS' }).checked).toBe(true)
    expect(within(group).getByRole('radio', { name: 'Windows' }).checked).toBe(false)
    expect(within(group).getByRole('radio', { name: 'Linux' }).checked).toBe(false)
  })

  it('shows the switch in Compare as well as in Browse', () => {
    renderHeader({ view: 'compare', presetId: 'linux' })
    const group = screen.getByRole('group', { name: 'Scale preset' })
    expect(within(group).getByRole('radio', { name: 'Linux' }).checked).toBe(true)
  })

  it('passes the preset the person picks to onPresetChange', async () => {
    const user = userEvent.setup()
    const onPresetChange = vi.fn()
    renderHeader({ presetId: 'windows', onPresetChange })
    const group = screen.getByRole('group', { name: 'Scale preset' })
    await user.click(within(group).getByRole('radio', { name: 'Linux' }))
    expect(onPresetChange).toHaveBeenCalledWith('linux')
  })

  it('follows the preset when it changes from outside, for example in Settings', () => {
    const { rerender } = renderHeader({ presetId: 'windows' })
    rerender(
      <AppHeader
        view="browse"
        compareCount={3}
        onViewChange={() => {}}
        linkUrl="x"
        presetId="macos"
      />,
    )
    const group = screen.getByRole('group', { name: 'Scale preset' })
    expect(within(group).getByRole('radio', { name: 'macOS' }).checked).toBe(true)
    expect(within(group).getByRole('radio', { name: 'Windows' }).checked).toBe(false)
  })
})
