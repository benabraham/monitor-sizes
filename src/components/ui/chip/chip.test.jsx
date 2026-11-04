import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Chip } from './chip.jsx'

describe('Chip', () => {
  it('renders a static chip as text, not as a button', () => {
    render(<Chip>Full HD</Chip>)
    expect(screen.getByText('Full HD')).not.toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders a toggle chip as a button with aria-pressed false by default', () => {
    render(<Chip onClick={() => {}}>24″ FHD</Chip>)
    const chip = screen.getByRole('button', { name: '24″ FHD' })
    expect(chip.getAttribute('type')).toBe('button')
    expect(chip.getAttribute('aria-pressed')).toBe('false')
  })

  it('reflects the selected state in aria-pressed and shows a check mark', () => {
    const { container } = render(
      <Chip isSelected onClick={() => {}}>
        27″ 4K
      </Chip>,
    )
    const chip = screen.getByRole('button', { name: '27″ 4K' })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(chip.classList.contains('chip--selected')).toBe(true)
    expect(container.querySelector('.chip__icon svg')).not.toBeNull()
  })

  it('does not show a check mark on an unselected toggle chip', () => {
    const { container } = render(<Chip onClick={() => {}}>Unselected</Chip>)
    expect(container.querySelector('.chip__icon')).toBeNull()
  })

  it('calls onClick with the keyboard (Enter and Space) and with a mouse click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>Toggle me</Chip>)
    const chip = screen.getByRole('button', { name: 'Toggle me' })

    await user.tab()
    expect(document.activeElement).toBe(chip)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)

    await user.click(chip)
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('marks the baseline and familiar roles with classes that do not rely on colour alone', () => {
    const { rerender } = render(<Chip isAccent>Baseline</Chip>)
    const baseline = screen.getByText('Baseline').closest('.chip')
    expect(baseline.classList.contains('chip--accent')).toBe(true)
    expect(baseline.classList.contains('chip--dashed')).toBe(false)

    rerender(<Chip isDashed>Familiar</Chip>)
    const familiar = screen.getByText('Familiar').closest('.chip')
    expect(familiar.classList.contains('chip--dashed')).toBe(true)
  })

  it('passes extra attributes and class names to the root element', () => {
    render(
      <Chip class="filter-chip" data-testid="chip-root" title="Filter">
        Tagged
      </Chip>,
    )
    const root = screen.getByTestId('chip-root')
    expect(root.classList.contains('filter-chip')).toBe(true)
    expect(root.getAttribute('title')).toBe('Filter')
  })
})
