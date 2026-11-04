import { fireEvent, render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import {
  cm,
  macosEntries,
  threeDisplayEntries,
  workedExampleEntries,
} from './compare-visual.fixtures.js'
import { DistanceControl } from './distance-control.jsx'

/** Replace no-break spaces, so text matches read like ordinary text. */
const clean = (text) => text.replace(/ /g, ' ')

/** The candidate (32″ 4K at 150 %, 80 cm) of the worked example. */
const candidateOf = () => workedExampleEntries()[1]

afterEach(() => {
  locale.value = 'en'
})

describe('DistanceControl: distance', () => {
  it('shows the distance in centimetres in the slider and the number field', () => {
    render(<DistanceControl entry={candidateOf()} units="metric" />)
    const slider = screen.getByRole('slider', { name: 'Distance' })
    expect(clean(slider.getAttribute('aria-valuetext'))).toBe('80 cm')
    expect(screen.getByRole('textbox', { name: 'Exact distance' }).value).toBe('80')
    expect(screen.getByText('cm')).not.toBeNull()
  })

  it('sends the typed distance to onDistanceChange in inches (metric)', async () => {
    const user = userEvent.setup()
    const onDistanceChange = vi.fn()
    render(
      <DistanceControl
        entry={candidateOf()}
        units="metric"
        onDistanceChange={onDistanceChange}
      />,
    )
    const field = screen.getByRole('textbox', { name: 'Exact distance' })
    await user.clear(field)
    await user.type(field, '70')
    await user.tab()
    expect(onDistanceChange).toHaveBeenCalledTimes(1)
    expect(onDistanceChange).toHaveBeenCalledWith(expect.closeTo(cm(70), 9))
  })

  it('sends the typed distance as inches unchanged in imperial units', async () => {
    const user = userEvent.setup()
    const onDistanceChange = vi.fn()
    render(
      <DistanceControl
        entry={candidateOf()}
        units="imperial"
        onDistanceChange={onDistanceChange}
      />,
    )
    const field = screen.getByRole('textbox', { name: 'Exact distance' })
    expect(field.value).toBe('31.5')
    await user.clear(field)
    await user.type(field, '25')
    await user.tab()
    expect(onDistanceChange).toHaveBeenCalledWith(25)
    expect(screen.getByText('in')).not.toBeNull()
  })

  it('sends slider moves to onDistanceChange in inches (metric and imperial)', () => {
    const onDistanceChange = vi.fn()
    const { unmount } = render(
      <DistanceControl
        entry={candidateOf()}
        units="metric"
        onDistanceChange={onDistanceChange}
      />,
    )
    fireEvent.input(screen.getByRole('slider', { name: 'Distance' }), {
      target: { value: '90' },
    })
    expect(onDistanceChange).toHaveBeenLastCalledWith(expect.closeTo(cm(90), 9))
    unmount()

    render(
      <DistanceControl
        entry={candidateOf()}
        units="imperial"
        onDistanceChange={onDistanceChange}
      />,
    )
    const slider = screen.getByRole('slider', { name: 'Distance' })
    expect(clean(slider.getAttribute('aria-valuetext'))).toBe('31.5 in')
    fireEvent.input(slider, { target: { value: '40' } })
    expect(onDistanceChange).toHaveBeenLastCalledWith(40)
  })

  it('uses the metric slider range of 30 to 250 cm', () => {
    render(<DistanceControl entry={candidateOf()} units="metric" />)
    const slider = screen.getByRole('slider', { name: 'Distance' })
    expect(slider.getAttribute('min')).toBe('30')
    expect(slider.getAttribute('max')).toBe('250')
  })

  it('uses the imperial slider range of 12 to 100 inches', () => {
    render(<DistanceControl entry={candidateOf()} units="imperial" />)
    const slider = screen.getByRole('slider', { name: 'Distance' })
    expect(slider.getAttribute('min')).toBe('12')
    expect(slider.getAttribute('max')).toBe('100')
  })
})

describe('DistanceControl: scale', () => {
  it('lists every scale option, marking the comfortable ones', () => {
    render(<DistanceControl entry={candidateOf()} scaleOptions={candidateOf().matrix} />)
    const select = screen.getByRole('combobox', { name: 'Scale' })
    const labels = [...select.options].map((option) => clean(option.textContent))
    expect(labels).toEqual(['100 %', '125 %', '150 % ✓', '175 %', '200 %'])
    expect(select.value).toBe('1.5')
  })

  it('sends the chosen scale factor to onScaleChange', async () => {
    const user = userEvent.setup()
    const onScaleChange = vi.fn()
    render(
      <DistanceControl
        entry={candidateOf()}
        scaleOptions={candidateOf().matrix}
        onScaleChange={onScaleChange}
      />,
    )
    await user.selectOptions(screen.getByRole('combobox', { name: 'Scale' }), '1.25')
    expect(onScaleChange).toHaveBeenCalledWith(1.25)
  })

  it('shows the current scale even when it is not among the options', () => {
    const entry = { ...candidateOf(), scale: 1.33 }
    render(<DistanceControl entry={entry} scaleOptions={[{ scale: 1 }, { scale: 2 }]} />)
    const select = screen.getByRole('combobox', { name: 'Scale' })
    expect(select.value).toBe('1.33')
    expect(select.options).toHaveLength(3)
  })

  it('shows the macOS looks-like resolution for each option', () => {
    const entry = macosEntries()[0]
    render(<DistanceControl entry={entry} scaleOptions={entry.matrix} />)
    const select = screen.getByRole('combobox', { name: 'Scale' })
    const labels = [...select.options].map((option) => clean(option.textContent))
    expect(labels.some((label) => /looks like 2560 × 1440/.test(label))).toBe(true)
  })

  it('translates the scale label and the comfortable hint in Czech', () => {
    locale.value = 'cs'
    render(<DistanceControl entry={candidateOf()} scaleOptions={candidateOf().matrix} />)
    expect(screen.getByRole('combobox', { name: 'Měřítko' })).not.toBeNull()
    expect(screen.getByText('✓ označuje pohodlná měřítka')).not.toBeNull()
  })
})

describe('DistanceControl: match buttons', () => {
  it('offers the three matches for a candidate, with the target distance', async () => {
    const user = userEvent.setup()
    const onApplyEquivalent = vi.fn()
    const { container } = render(
      <DistanceControl entry={candidateOf()} onApplyEquivalent={onApplyEquivalent} />,
    )
    expect(screen.getByRole('button', { name: 'Match size' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Match sharpness' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Match text size' })).not.toBeNull()

    const describedBy = screen
      .getByRole('button', { name: 'Match size' })
      .getAttribute('aria-describedby')
    expect(clean(container.querySelector(`#${describedBy}`).textContent)).toBe(
      'Sets the viewing distance to 80 cm',
    )

    await user.click(screen.getByRole('button', { name: 'Match sharpness' }))
    expect(onApplyEquivalent).toHaveBeenCalledWith('sameSharpness')
    await user.click(screen.getByRole('button', { name: 'Match text size' }))
    expect(onApplyEquivalent).toHaveBeenLastCalledWith('sameTextSize')
  })

  it('applies the same-size match with its kind', async () => {
    const user = userEvent.setup()
    const onApplyEquivalent = vi.fn()
    render(
      <DistanceControl entry={candidateOf()} onApplyEquivalent={onApplyEquivalent} />,
    )
    await user.click(screen.getByRole('button', { name: 'Match size' }))
    expect(onApplyEquivalent).toHaveBeenCalledWith('sameSize')
  })

  it('states the target distances in the visible hints (sharpness is 40 cm)', () => {
    render(<DistanceControl entry={candidateOf()} />)
    const hints = [...document.querySelectorAll('.distance-control__match-value')].map(
      (node) => clean(node.textContent),
    )
    expect(hints).toEqual(['80 cm', '40 cm', '60 cm'])
  })

  it('shows no match buttons for the baseline', () => {
    render(<DistanceControl entry={workedExampleEntries()[0]} />)
    expect(screen.queryByRole('button', { name: 'Match size' })).toBeNull()
    expect(screen.getByText('Baseline')).not.toBeNull()
  })

  it('shows no match buttons when there is no equivalent distance', () => {
    render(<DistanceControl entry={{ ...candidateOf(), equivalent: null }} />)
    expect(screen.queryByRole('button', { name: 'Match size' })).toBeNull()
  })
})

describe('DistanceControl: identity', () => {
  it('names the display and marks a familiar display', () => {
    render(<DistanceControl entry={threeDisplayEntries()[0]} />)
    expect(screen.getByRole('group', { name: '24″ FHD' })).not.toBeNull()
    expect(screen.getByText('Baseline')).not.toBeNull()
  })

  it('marks a familiar candidate as familiar', () => {
    const entry = { ...candidateOf(), isFamiliar: true }
    render(<DistanceControl entry={entry} />)
    expect(screen.getByText('Familiar')).not.toBeNull()
  })

  it('renders nothing without an entry', () => {
    const { container } = render(<DistanceControl entry={null} />)
    expect(container.innerHTML).toBe('')
  })
})
