import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { ComfortSummary } from './comfort-summary.jsx'
import { DEFAULT_COMFORT } from './comfort-form.js'

/** No-break space, as used between a number and its unit. */
const NBSP = ' '

afterEach(() => {
  locale.value = 'en'
})

describe('ComfortSummary', () => {
  it('reads the PPI window in English', () => {
    render(<ComfortSummary comfort={DEFAULT_COMFORT} onEdit={() => {}} />)
    expect(
      screen.getByRole('button', { name: `Comfortable: 90–105 PPI · ≥ 1,024${NBSP}px` }),
    ).not.toBeNull()
  })

  it('reads the pixels-per-degree window without a prefix', () => {
    render(
      <ComfortSummary comfort={{ ...DEFAULT_COMFORT, mode: 'ppd' }} onEdit={() => {}} />,
    )
    expect(
      screen.getByRole('button', { name: `37–43${NBSP}px/° · ≥ 1,024${NBSP}px` }),
    ).not.toBeNull()
  })

  it('formats the numbers for Czech, with a no-break space as the thousands separator', () => {
    locale.value = 'cs'
    render(<ComfortSummary comfort={DEFAULT_COMFORT} onEdit={() => {}} />)
    expect(
      screen.getByRole('button', {
        name: `Pohodlné: 90–105 PPI · ≥ 1${NBSP}024${NBSP}px`,
      }),
    ).not.toBeNull()
  })

  it('formats the pixels-per-degree text in Czech', () => {
    locale.value = 'cs'
    render(
      <ComfortSummary comfort={{ ...DEFAULT_COMFORT, mode: 'ppd' }} onEdit={() => {}} />,
    )
    expect(
      screen.getByRole('button', { name: `37–43${NBSP}px/° · ≥ 1${NBSP}024${NBSP}px` }),
    ).not.toBeNull()
  })

  it('shows the current values after a change', () => {
    const { rerender } = render(
      <ComfortSummary comfort={DEFAULT_COMFORT} onEdit={() => {}} />,
    )
    rerender(
      <ComfortSummary comfort={{ ...DEFAULT_COMFORT, minPpi: 100 }} onEdit={() => {}} />,
    )
    expect(screen.getByRole('button', { name: /100–105 PPI/ })).not.toBeNull()
  })

  it('opens the settings through onEdit', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<ComfortSummary comfort={DEFAULT_COMFORT} onEdit={onEdit} />)
    await user.click(screen.getByRole('button', { name: /Comfortable/ }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
