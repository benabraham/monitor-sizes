import { act, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { COPIED_DURATION_MS, CopyLink } from './copy-link.jsx'

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
 * Click and let the clipboard promise settle inside `act`.
 *
 * @param {HTMLElement} element
 */
const clickAndSettle = async (element) => {
  await act(async () => {
    fireEvent.click(element)
  })
}

afterEach(() => {
  locale.value = 'en'
  delete navigator.clipboard
  vi.useRealTimers()
})

describe('CopyLink', () => {
  it('copies the given url and shows "Link copied" with a polite live region', async () => {
    const writeText = mockClipboard()
    render(<CopyLink url="https://example.test/#/s/abc" />)
    await clickAndSettle(screen.getByRole('button', { name: 'Copy link' }))

    expect(writeText).toHaveBeenCalledWith('https://example.test/#/s/abc')
    expect(screen.getByRole('button', { name: 'Link copied' })).not.toBeNull()
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.textContent).toBe('Link copied')
  })

  it('reverts to "Copy link" after two seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mockClipboard()
    render(<CopyLink url="https://example.test/" />)
    await clickAndSettle(screen.getByRole('button', { name: 'Copy link' }))
    expect(screen.getByRole('button', { name: 'Link copied' })).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(COPIED_DURATION_MS - 1)
    })
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('button', { name: 'Copy link' })).not.toBeNull()
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('copies the current page address when no url is given', async () => {
    const writeText = mockClipboard()
    render(<CopyLink />)
    await clickAndSettle(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(window.location.href)
  })

  it('opens a selected read-only field with the link when the clipboard is missing', async () => {
    render(<CopyLink url="https://example.test/#/s/xyz" />)
    await clickAndSettle(screen.getByRole('button', { name: 'Copy link' }))

    const field = screen.getByRole('textbox', { name: 'Link to this comparison' })
    expect(field.hasAttribute('readonly')).toBe(true)
    expect(field.value).toBe('https://example.test/#/s/xyz')
    expect(document.activeElement).toBe(field)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('opens the same fallback when the clipboard refuses the write', async () => {
    mockClipboard(vi.fn(() => Promise.reject(new Error('denied'))))
    render(<CopyLink url="https://example.test/refused" />)
    await clickAndSettle(screen.getByRole('button', { name: 'Copy link' }))
    expect(screen.getByRole('textbox', { name: 'Link to this comparison' }).value).toBe(
      'https://example.test/refused',
    )
  })

  it('closes the fallback field with its close button and with Escape', async () => {
    render(<CopyLink url="https://example.test/" />)
    await clickAndSettle(screen.getByRole('button', { name: 'Copy link' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('textbox')).toBeNull()

    await clickAndSettle(screen.getByRole('button', { name: 'Copy link' }))
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('renders Czech labels when the locale is cs', async () => {
    locale.value = 'cs'
    mockClipboard()
    render(<CopyLink url="https://example.test/" />)
    await clickAndSettle(screen.getByRole('button', { name: 'Kopírovat odkaz' }))
    expect(screen.getByRole('button', { name: 'Odkaz zkopírován' })).not.toBeNull()
  })
})
