import { fireEvent, render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from './dialog.jsx'

/**
 * Find the native dialog element rendered by the component.
 *
 * @param {HTMLElement} container
 * @returns {HTMLDialogElement}
 */
const getDialogElement = (container) => container.querySelector('dialog')

describe('Dialog', () => {
  it('is shown and labelled by its title when isOpen is true', () => {
    const { container } = render(
      <Dialog isOpen title="Add display" onClose={() => {}}>
        <p>Form goes here</p>
      </Dialog>,
    )
    expect(getDialogElement(container).hasAttribute('open')).toBe(true)
    expect(screen.getByRole('dialog', { name: 'Add display' })).not.toBeNull()
    expect(screen.getByText('Form goes here')).not.toBeNull()
  })

  it('stays closed when isOpen is false', () => {
    const { container } = render(
      <Dialog isOpen={false} title="Hidden" onClose={() => {}}>
        <p>Body</p>
      </Dialog>,
    )
    expect(getDialogElement(container).hasAttribute('open')).toBe(false)
  })

  it('opens and closes when isOpen changes', () => {
    const { container, rerender } = render(
      <Dialog isOpen={false} title="Toggle" onClose={() => {}}>
        <p>Body</p>
      </Dialog>,
    )
    const dialog = getDialogElement(container)
    expect(dialog.hasAttribute('open')).toBe(false)

    rerender(
      <Dialog isOpen title="Toggle" onClose={() => {}}>
        <p>Body</p>
      </Dialog>,
    )
    expect(dialog.hasAttribute('open')).toBe(true)

    rerender(
      <Dialog isOpen={false} title="Toggle" onClose={() => {}}>
        <p>Body</p>
      </Dialog>,
    )
    expect(dialog.hasAttribute('open')).toBe(false)
  })

  it('calls onClose from the close button, with a translatable label', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog isOpen title="Settings" onClose={onClose} closeLabel="Zavřít">
        <p>Body</p>
      </Dialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Zavřít' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses "Close" as the default close button name', () => {
    render(
      <Dialog isOpen title="Settings" onClose={() => {}}>
        <p>Body</p>
      </Dialog>,
    )
    expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull()
  })

  it('handles Esc (native cancel) by calling onClose and preventing the native close', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Dialog isOpen title="Esc" onClose={onClose}>
        <p>Body</p>
      </Dialog>,
    )
    const cancelEvent = new Event('cancel', { cancelable: true })
    const notPrevented = fireEvent(getDialogElement(container), cancelEvent)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(notPrevented).toBe(false)
  })

  it('calls onClose when the dialog closes natively while it is open', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Dialog isOpen title="Form" onClose={onClose}>
        <p>Body</p>
      </Dialog>,
    )
    getDialogElement(container).dispatchEvent(new Event('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose for a native close the parent already requested', () => {
    const onClose = vi.fn()
    const { container, rerender } = render(
      <Dialog isOpen title="Form" onClose={onClose}>
        <p>Body</p>
      </Dialog>,
    )
    rerender(
      <Dialog isOpen={false} title="Form" onClose={onClose}>
        <p>Body</p>
      </Dialog>,
    )
    getDialogElement(container).dispatchEvent(new Event('close'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose on a backdrop click but not on a click inside the panel', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Dialog isOpen title="Backdrop" onClose={onClose}>
        <p>Inner text</p>
      </Dialog>,
    )
    fireEvent.click(screen.getByText('Inner text'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(getDialogElement(container))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the footer only when one is given', () => {
    const { container, rerender } = render(
      <Dialog isOpen title="Footer" onClose={() => {}}>
        <p>Body</p>
      </Dialog>,
    )
    expect(container.querySelector('.dialog__footer')).toBeNull()

    rerender(
      <Dialog isOpen title="Footer" onClose={() => {}} footer={<button>Save</button>}>
        <p>Body</p>
      </Dialog>,
    )
    expect(container.querySelector('.dialog__footer')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeNull()
  })
  it('wraps Tab from the last control to the first, and Shift+Tab back', () => {
    render(
      <Dialog isOpen title="Trap" onClose={() => {}} footer={<button>Save</button>}>
        <button>Middle</button>
      </Dialog>,
    )
    const close = screen.getByRole('button', { name: 'Close' })
    const save = screen.getByRole('button', { name: 'Save' })

    save.focus()
    fireEvent.keyDown(save, { key: 'Tab' })
    expect(document.activeElement).toBe(close)

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(save)
  })

  it('leaves Tab between controls in the middle of the dialog to the browser', () => {
    render(
      <Dialog isOpen title="Middle" onClose={() => {}} footer={<button>Save</button>}>
        <button>Middle</button>
      </Dialog>,
    )
    const middle = screen.getByRole('button', { name: 'Middle' })

    middle.focus()
    const notPrevented = fireEvent.keyDown(middle, { key: 'Tab' })
    expect(notPrevented).toBe(true)
    expect(document.activeElement).toBe(middle)
  })
})
