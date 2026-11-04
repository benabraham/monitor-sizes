import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { AddDisplayDialog } from './add-display-dialog.jsx'
import { DISPLAY_4K_27, windowsScaleOptionsFor } from './add-display.fixtures.js'

/**
 * Render the dialog with the common props. Only `isOpen` and `initial` vary.
 *
 * @param {object} props
 * @returns {ReturnType<typeof render> & { onClose: import('vitest').Mock, onSubmit: import('vitest').Mock }}
 */
const renderDialog = (props = {}) => {
  const onClose = vi.fn()
  const onSubmit = vi.fn()
  const result = render(
    <AddDisplayDialog
      isOpen
      units="metric"
      scaleOptionsFor={windowsScaleOptionsFor}
      guess={() => null}
      onClose={onClose}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return Object.assign(result, { onClose, onSubmit })
}

afterEach(() => {
  locale.value = 'en'
})

describe('AddDisplayDialog', () => {
  it('is titled "Add display" and holds the form when open', () => {
    renderDialog()
    expect(screen.getByRole('dialog', { name: 'Add display' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add display' })).toBeTruthy()
  })

  it('is titled "Edit display" and pre-fills the form when editing', () => {
    renderDialog({
      initial: { isEditing: true, ...DISPLAY_4K_27 },
    })
    expect(screen.getByRole('dialog', { name: 'Edit display' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Name' }).value).toBe('4K 27″')
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('renders no form while closed, so a reopening starts fresh', () => {
    const { container, rerender, onClose, onSubmit } = renderDialog({ isOpen: false })
    expect(container.querySelector('form')).toBeNull()

    rerender(
      <AddDisplayDialog
        isOpen
        units="metric"
        scaleOptionsFor={windowsScaleOptionsFor}
        guess={() => null}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    )
    expect(container.querySelector('form')).not.toBeNull()
    expect(screen.getByRole('textbox', { name: 'Name' }).value).toBe('')
  })

  it('calls onClose from Cancel and from the close button', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('passes a valid submit through to onSubmit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderDialog()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Desk')
    await user.type(screen.getByRole('textbox', { name: 'Diagonal' }), '27')
    await user.type(screen.getByRole('textbox', { name: 'Width' }), '2560')
    await user.type(screen.getByRole('textbox', { name: 'Height' }), '1440')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Add display' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Desk',
      diagonal: 27,
      width: 2560,
      height: 1440,
      tag: 'monitor',
    })
  })

  it('is titled in Czech when the language is Czech', () => {
    locale.value = 'cs'
    renderDialog()
    expect(screen.getByRole('dialog', { name: 'Přidat displej' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Zavřít' })).toBeTruthy()
  })
})
