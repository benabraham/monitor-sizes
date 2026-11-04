import { fireEvent, render, screen } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { Slider } from './slider.jsx'

describe('Slider', () => {
  it('is a range input named by its label, with the value as aria-valuetext', () => {
    render(
      <Slider
        label="Distance"
        value={60}
        min={20}
        max={150}
        valueText="60 cm"
        onInput={() => {}}
      />,
    )
    const slider = screen.getByRole('slider', { name: 'Distance' })
    expect(slider.getAttribute('type')).toBe('range')
    expect(slider.getAttribute('min')).toBe('20')
    expect(slider.getAttribute('max')).toBe('150')
    expect(slider.getAttribute('aria-valuetext')).toBe('60 cm')
    expect(slider.value).toBe('60')
  })

  it('shows the human-readable value next to the label, hidden from assistive tech', () => {
    const { container } = render(
      <Slider label="Distance" value={60} valueText="60 cm" onInput={() => {}} />,
    )
    const output = container.querySelector('output')
    expect(output.textContent).toBe('60 cm')
    expect(output.getAttribute('aria-hidden')).toBe('true')
  })

  it('falls back to the number when no valueText is given', () => {
    render(<Slider label="Opacity" value={40} onInput={() => {}} />)
    const slider = screen.getByRole('slider', { name: 'Opacity' })
    expect(slider.getAttribute('aria-valuetext')).toBe('40')
    expect(slider.value).toBe('40')
  })

  it('calls onInput with a number while the value changes', () => {
    const onInput = vi.fn()
    render(<Slider label="Distance" value={60} min={20} max={150} onInput={onInput} />)
    const slider = screen.getByRole('slider', { name: 'Distance' })

    fireEvent.input(slider, { target: { value: '80' } })
    expect(onInput).toHaveBeenCalledWith(80)
  })

  it('sets the fill progress from the value and the range', () => {
    const { rerender } = render(
      <Slider label="Distance" value={20} min={20} max={120} onInput={() => {}} />,
    )
    const slider = screen.getByRole('slider', { name: 'Distance' })
    expect(slider.style.getPropertyValue('--slider-progress')).toBe('0%')

    rerender(<Slider label="Distance" value={70} min={20} max={120} onInput={() => {}} />)
    expect(slider.style.getPropertyValue('--slider-progress')).toBe('50%')
  })
})
