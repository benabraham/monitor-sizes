import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Segmented } from './segmented.jsx'

const UNIT_OPTIONS = [
  { value: 'metric', label: 'cm' },
  { value: 'imperial', label: 'in' },
]

describe('Segmented', () => {
  it('is a group named by its label, with one radio per option', () => {
    render(
      <Segmented
        name="units"
        label="Units"
        options={UNIT_OPTIONS}
        value="metric"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('group', { name: 'Units' })).not.toBeNull()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios.map((radio) => radio.name)).toEqual(['units', 'units'])
    expect(screen.getByRole('radio', { name: 'cm' }).checked).toBe(true)
    expect(screen.getByRole('radio', { name: 'in' }).checked).toBe(false)
  })

  it('calls onChange with the option value when another option is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Segmented
        name="units"
        label="Units"
        options={UNIT_OPTIONS}
        value="metric"
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'in' }))
    expect(onChange).toHaveBeenCalledWith('imperial')
  })

  it('stays on the value passed in when the parent does not update it (controlled)', async () => {
    const user = userEvent.setup()
    render(
      <Segmented
        name="units"
        label="Units"
        options={UNIT_OPTIONS}
        value="metric"
        onChange={() => {}}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'in' }))
    expect(screen.getByRole('radio', { name: 'cm' }).checked).toBe(true)
  })

  it('moves the selection with the arrow keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Segmented
        name="preset"
        label="Scale preset"
        options={[
          { value: 'windows', label: 'Windows' },
          { value: 'macos', label: 'macOS' },
          { value: 'linux', label: 'Linux' },
        ]}
        value="windows"
        onChange={onChange}
      />,
    )
    screen.getByRole('radio', { name: 'Windows' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('macos')
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'macOS' }))
  })

  it('keeps the legend in the accessibility tree when it is visually hidden', () => {
    const { container } = render(
      <Segmented
        name="units"
        label="Units"
        isLabelHidden
        options={UNIT_OPTIONS}
        value="metric"
        onChange={() => {}}
      />,
    )
    const legend = container.querySelector('legend')
    expect(legend.classList.contains('visually-hidden')).toBe(true)
    expect(screen.getByRole('group', { name: 'Units' })).not.toBeNull()
  })

  it('disables an option that is marked as disabled', () => {
    render(
      <Segmented
        name="units"
        label="Units"
        options={[
          { value: 'metric', label: 'cm' },
          { value: 'imperial', label: 'in', isDisabled: true },
        ]}
        value="metric"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('radio', { name: 'in' }).disabled).toBe(true)
    expect(screen.getByRole('radio', { name: 'cm' }).disabled).toBe(false)
  })
})
