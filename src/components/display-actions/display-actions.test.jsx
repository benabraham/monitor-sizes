import { render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DisplayActions } from './display-actions.jsx'

const FHD = {
  id: '24-fhd-1920x1080',
  name: 'FHD',
  diagonal: 24,
  width: 1920,
  height: 1080,
  tag: 'monitor',
}
const STUDIO = {
  id: 'c-studio1',
  name: 'Studio',
  diagonal: 27,
  width: 2560,
  height: 1440,
  tag: 'monitor',
  isCustom: true,
}

/**
 * Props for the dialog, with spies for every action.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
const dialogProps = (overrides = {}) => ({
  isOpen: true,
  onClose: vi.fn(),
  display: FHD,
  isFamiliar: false,
  isBaseline: false,
  isCompared: false,
  onToggleFamiliar: vi.fn(),
  onSetBaseline: vi.fn(),
  onToggleCompare: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onHide: vi.fn(),
  ...overrides,
})

describe('DisplayActions', () => {
  it('titles the dialog with the name, and shows the diagonal and resolution', () => {
    render(<DisplayActions {...dialogProps()} />)
    const dialog = screen.getByRole('dialog', { name: 'FHD' })
    expect(within(dialog).getByText('24″')).not.toBeNull()
    expect(within(dialog).getByText('1920 × 1080')).not.toBeNull()
  })

  it('offers to hide a built-in display, and no edit or delete', async () => {
    const user = userEvent.setup()
    const props = dialogProps()
    render(<DisplayActions {...props} />)

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Hide from list' }))
    expect(props.onHide).toHaveBeenCalledTimes(1)
  })

  it('edits a custom display, and asks before deleting it', async () => {
    const user = userEvent.setup()
    const props = dialogProps({ display: STUDIO })
    render(<DisplayActions {...props} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(props.onEdit).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Delete “Studio”?')).not.toBeNull()
    expect(document.activeElement.classList.contains('display-actions__confirm')).toBe(
      true,
    )
    expect(props.onDelete).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Delete “Studio”?')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })

  it('stars a display off, and makes a familiar one the baseline', async () => {
    const user = userEvent.setup()
    const props = dialogProps({ isFamiliar: true })
    render(<DisplayActions {...props} />)

    await user.click(
      screen.getByRole('button', { name: 'Remove from familiar displays' }),
    )
    expect(props.onToggleFamiliar).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Make this the baseline' }))
    expect(props.onSetBaseline).toHaveBeenCalledTimes(1)
  })

  it('says that the baseline is always compared, and offers no compare action for it', () => {
    render(
      <DisplayActions
        {...dialogProps({ isFamiliar: true, isBaseline: true, isCompared: true })}
      />,
    )
    expect(screen.getByText('The baseline is always in Compare.')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Make this the baseline' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Compare$/ })).toBeNull()
  })

  it.each([
    [{ isFamiliar: false, isCompared: false }, 'Add to Compare'],
    [{ isFamiliar: false, isCompared: true }, 'Remove from Compare'],
    [{ isFamiliar: true, isCompared: false }, 'Show in Compare'],
    [{ isFamiliar: true, isCompared: true }, 'Hide from Compare'],
  ])('labels the compare action for %j as "%s"', (state, label) => {
    render(<DisplayActions {...dialogProps(state)} />)
    expect(screen.getByRole('button', { name: label })).not.toBeNull()
  })

  it('calls onToggleCompare from the compare action', async () => {
    const user = userEvent.setup()
    const props = dialogProps()
    render(<DisplayActions {...props} />)
    await user.click(screen.getByRole('button', { name: 'Add to Compare' }))
    expect(props.onToggleCompare).toHaveBeenCalledTimes(1)
  })

  it('has no content while closed or without a display', () => {
    render(<DisplayActions {...dialogProps({ isOpen: false, display: null })} />)
    expect(screen.queryByRole('button', { name: 'Hide from list' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add to Compare' })).toBeNull()
  })
})
