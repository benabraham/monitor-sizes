import { fireEvent, render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { cm, workedExampleEntries } from './compare-visual.fixtures.js'
import { CompareVisual } from './compare-visual.jsx'

const CANDIDATE_ID = '32-3840x2160'

afterEach(() => {
  locale.value = 'en'
})

/** The list of per-display controls, found by its accessible name. */
const controlsList = () => screen.getByRole('list', { name: 'Compared displays' })

/** The controls of one display: its group, found by the display name. */
const controlsOf = (name) => within(controlsList()).getByRole('group', { name })

describe('CompareVisual: composition', () => {
  it('draws the visualization and one control group per entry', () => {
    render(<CompareVisual entries={workedExampleEntries()} />)
    expect(screen.getByRole('img', { name: /Physical size/ })).not.toBeNull()
    expect(controlsList().children).toHaveLength(2)
    expect(controlsOf('24″ FHD')).not.toBeNull()
    expect(controlsOf('32″ 4K UHD')).not.toBeNull()
  })

  it('shows the equivalence line under the candidate only', () => {
    const { container } = render(<CompareVisual entries={workedExampleEntries()} />)
    const lines = container.querySelectorAll('.equivalence-line')
    expect(lines).toHaveLength(1)
    expect(lines[0].textContent.replace(/\u00a0/g, ' ')).toContain(
      'Looks like your 24″ FHD at 80 cm',
    )
  })

  it('passes the unit system to the controls and the equivalence line', () => {
    const { container } = render(
      <CompareVisual entries={workedExampleEntries()} units="imperial" />,
    )
    expect(
      container.querySelector('.equivalence-line').textContent.replace(/\u00a0/g, ' '),
    ).toContain('31.5 in')
    const candidate = within(controlsOf('32″ 4K UHD'))
    expect(candidate.getByRole('textbox', { name: 'Exact distance' }).value).toBe('31.5')
  })

  it('shows the empty message when nothing is compared', () => {
    render(<CompareVisual entries={[]} />)
    expect(screen.getByText('Choose at least one display to compare.')).not.toBeNull()
  })
})

describe('CompareVisual: callbacks carry the display id', () => {
  it('sends a distance change in inches with the id', () => {
    const onDistanceChange = vi.fn()
    render(
      <CompareVisual
        entries={workedExampleEntries()}
        onDistanceChange={onDistanceChange}
      />,
    )
    const slider = within(controlsOf('32″ 4K UHD')).getByRole('slider', {
      name: 'Distance',
    })
    fireEvent.input(slider, { target: { value: '90' } })
    expect(onDistanceChange).toHaveBeenCalledWith({
      id: CANDIDATE_ID,
      distance: expect.closeTo(cm(90), 9),
    })
  })

  it('sends a scale change with the id', async () => {
    const user = userEvent.setup()
    const onScaleChange = vi.fn()
    render(
      <CompareVisual entries={workedExampleEntries()} onScaleChange={onScaleChange} />,
    )
    await user.selectOptions(
      within(controlsOf('32″ 4K UHD')).getByRole('combobox', { name: 'Scale' }),
      '1.25',
    )
    expect(onScaleChange).toHaveBeenCalledWith({ id: CANDIDATE_ID, scale: 1.25 })
  })

  it('sends a match with its kind and the id', async () => {
    const user = userEvent.setup()
    const onApplyEquivalent = vi.fn()
    render(
      <CompareVisual
        entries={workedExampleEntries()}
        onApplyEquivalent={onApplyEquivalent}
      />,
    )
    await user.click(
      within(controlsOf('32″ 4K UHD')).getByRole('button', { name: 'Match sharpness' }),
    )
    expect(onApplyEquivalent).toHaveBeenCalledWith({
      id: CANDIDATE_ID,
      kind: 'sameSharpness',
    })
  })

  it('sends the size-match choice as a plain value', async () => {
    const user = userEvent.setup()
    const onSizeMatchByChange = vi.fn()
    render(
      <CompareVisual
        entries={workedExampleEntries()}
        onSizeMatchByChange={onSizeMatchByChange}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'Width' }))
    expect(onSizeMatchByChange).toHaveBeenCalledWith('width')
  })

  it('sends the mode choice from the visualization', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    render(<CompareVisual entries={workedExampleEntries()} onModeChange={onModeChange} />)
    await user.click(screen.getByRole('radio', { name: 'As seen' }))
    expect(onModeChange).toHaveBeenCalledWith('seen')
  })
})

describe('CompareVisual: scale options', () => {
  it('uses scaleOptionsById for a display when it is given', () => {
    render(
      <CompareVisual
        entries={workedExampleEntries()}
        scaleOptionsById={{ [CANDIDATE_ID]: [{ scale: 1 }, { scale: 3 }] }}
      />,
    )
    const select = within(controlsOf('32″ 4K UHD')).getByRole('combobox', {
      name: 'Scale',
    })
    expect([...select.options].map((option) => option.value)).toEqual(['1', '1.5', '3'])
  })

  it('falls back to each entry matrix when no list is given for the display', () => {
    render(<CompareVisual entries={workedExampleEntries()} scaleOptionsById={{}} />)
    const select = within(controlsOf('24″ FHD')).getByRole('combobox', { name: 'Scale' })
    expect(select.options.length).toBeGreaterThanOrEqual(5)
  })
})

describe('CompareVisual: baseline', () => {
  it('shows no match buttons for the baseline', () => {
    render(<CompareVisual entries={workedExampleEntries()} />)
    const baseline = controlsOf('24″ FHD')
    expect(within(baseline).queryByRole('button', { name: 'Match size' })).toBeNull()
    expect(baseline.textContent).toContain('Baseline')
  })
})
