import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { SharedBanner } from './shared-banner.jsx'

afterEach(() => {
  locale.value = 'en'
})

describe('SharedBanner', () => {
  it('is a labelled region that says the own displays are untouched', () => {
    render(<SharedBanner onKeep={() => {}} onDiscard={() => {}} />)
    const region = screen.getByRole('region', { name: 'Shared comparison' })
    expect(region.textContent).toContain(
      "You're viewing a shared comparison. Your own displays are untouched.",
    )
  })

  it('calls onKeep from "Keep it" and onDiscard from "Back to mine"', async () => {
    const user = userEvent.setup()
    const onKeep = vi.fn()
    const onDiscard = vi.fn()
    render(<SharedBanner onKeep={onKeep} onDiscard={onDiscard} />)

    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(onKeep).toHaveBeenCalledTimes(1)
    expect(onDiscard).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Back to mine' }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
    expect(onKeep).toHaveBeenCalledTimes(1)
  })

  it('offers only the two actions, with no close control', () => {
    render(<SharedBanner onKeep={() => {}} onDiscard={() => {}} />)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Keep it',
      'Back to mine',
    ])
  })

  it('renders Czech text when the locale is cs', () => {
    locale.value = 'cs'
    render(<SharedBanner onKeep={() => {}} onDiscard={() => {}} />)
    expect(screen.getByRole('region', { name: 'Sdílené porovnání' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Ponechat' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Zpět na moje' })).not.toBeNull()
  })
})
