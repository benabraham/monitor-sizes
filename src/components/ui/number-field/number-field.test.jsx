import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumberField, parseLocaleNumber } from './number-field.jsx'

describe('parseLocaleNumber', () => {
  it.each([
    ['24,5', 24.5],
    ['24.5', 24.5],
    ['1.234,5', 1234.5],
    ['1,234.5', 1234.5],
    ['1.234.567', 1234567],
    ['3 840', 3840],
    ['3 840', 3840],
    ['3 840', 3840],
    ['−3', -3],
    ['-3,5', -3.5],
    ['+7', 7],
    [' 42 ', 42],
    ['5.', 5],
    ['.5', 0.5],
    ['0', 0],
    ['-0', 0],
  ])('reads %j as %d', (text, expected) => {
    expect(parseLocaleNumber(text)).toBe(expected)
  })

  it('reads a single separator followed by three digits as a decimal', () => {
    expect(parseLocaleNumber('1,234')).toBe(1.234)
  })

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['12abc'],
    ['-'],
    ['.'],
    [','],
    ['1..2'],
    ['1.2.3'],
    ['1,5,000'],
    ['1e3'],
    ['NaN'],
    ['--3'],
    ['1,2.3,4'],
  ])('returns null for %j', (text) => {
    expect(parseLocaleNumber(text)).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(parseLocaleNumber(42)).toBeNull()
    expect(parseLocaleNumber(undefined)).toBeNull()
  })
})

describe('NumberField', () => {
  it('is a text box with a visible label, decimal keyboard and the unit as description', () => {
    render(
      <NumberField label="Viewing distance" value={60} unit="cm" onChange={() => {}} />,
    )
    const input = screen.getByRole('textbox', { name: 'Viewing distance' })
    expect(input.getAttribute('inputmode')).toBe('decimal')
    expect(input.getAttribute('type')).toBe('text')
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByText('cm').id)
  })

  it('shows the value with the requested precision in the English locale', () => {
    render(
      <NumberField label="Distance" value={23.622} decimals={1} onChange={() => {}} />,
    )
    expect(screen.getByRole('textbox', { name: 'Distance' }).value).toBe('23.6')
  })

  it('uses a decimal comma in the Czech locale', () => {
    render(
      <NumberField
        label="Vzdálenost"
        value={23.5}
        decimals={1}
        locale="cs"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'Vzdálenost' }).value).toBe('23,5')
  })

  it('commits a typed number on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberField label="Distance" value={60} onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Distance' })

    await user.clear(input)
    await user.type(input, '75')
    await user.tab()

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(75)
  })

  it('commits on Enter and keeps focus in the field', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberField label="Distance" value={60} onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Distance' })

    await user.clear(input)
    await user.type(input, '45{Enter}')

    expect(onChange).toHaveBeenCalledWith(45)
    expect(document.activeElement).toBe(input)
  })

  it('does not call onChange when the field is blurred unedited', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NumberField label="Distance" value={23.622} decimals={1} onChange={onChange} />,
    )
    const input = screen.getByRole('textbox', { name: 'Distance' })
    await user.click(input)
    await user.tab()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('discards invalid text and restores the last good value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberField label="Distance" value={60} onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Distance' })

    await user.clear(input)
    await user.type(input, 'abc')
    await user.tab()

    expect(onChange).not.toHaveBeenCalled()
    expect(input.value).toBe('60')
  })

  it('clamps committed values to min and max', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NumberField label="Distance" value={60} min={20} max={100} onChange={onChange} />,
    )
    const input = screen.getByRole('textbox', { name: 'Distance' })

    await user.clear(input)
    await user.type(input, '250{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(100)
    expect(input.value).toBe('100')

    await user.clear(input)
    await user.type(input, '3{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(20)
    expect(input.value).toBe('20')
  })

  it('rounds committed values to the requested decimals', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NumberField
        label="Scale"
        value={1}
        decimals={2}
        step={0.05}
        onChange={onChange}
      />,
    )
    const input = screen.getByRole('textbox', { name: 'Scale' })
    await user.clear(input)
    await user.type(input, '1,256{Enter}')
    expect(onChange).toHaveBeenCalledWith(1.26)
  })

  it('reads a comma decimal typed in the Czech locale', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NumberField
        label="Vzdálenost"
        value={60}
        decimals={1}
        locale="cs"
        onChange={onChange}
      />,
    )
    const input = screen.getByRole('textbox', { name: 'Vzdálenost' })
    await user.clear(input)
    await user.type(input, '24,5{Enter}')
    expect(onChange).toHaveBeenCalledWith(24.5)
  })

  it('steps the value with ArrowUp and ArrowDown', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <NumberField label="Distance" value={10} step={5} onChange={onChange} />,
    )
    const input = screen.getByRole('textbox', { name: 'Distance' })
    input.focus()

    await user.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith(15)

    rerender(<NumberField label="Distance" value={15} step={5} onChange={onChange} />)
    await user.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenLastCalledWith(10)
    expect(input.value).toBe('10')
  })

  it('does not step past the limits', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NumberField label="Distance" value={0} min={0} max={10} onChange={onChange} />,
    )
    const input = screen.getByRole('textbox', { name: 'Distance' })
    input.focus()

    await user.keyboard('{ArrowDown}')
    expect(onChange).not.toHaveBeenCalled()
    expect(input.value).toBe('0')
  })

  it('shows a new value passed in by the parent', () => {
    const { rerender } = render(
      <NumberField label="Distance" value={60} onChange={() => {}} />,
    )
    rerender(<NumberField label="Distance" value={75} onChange={() => {}} />)
    expect(screen.getByRole('textbox', { name: 'Distance' }).value).toBe('75')
  })
})
