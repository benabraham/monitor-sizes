import { render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../../i18n/index.js'
import { BASELINE_ID, buildBrowseFixture } from '../browse.fixtures.js'
import { FamiliarStrip } from './familiar-strip.jsx'

const FOUR_K = '27-3840x2160'

/** Familiar rows: the baseline first, then the 27″ 4K. */
const familiarRows = () =>
  buildBrowseFixture({ familiarIds: [BASELINE_ID, FOUR_K] }).familiarRows

afterEach(() => {
  locale.value = 'en'
})

describe('FamiliarStrip', () => {
  it('renders one chip per familiar row with name, diagonal and resolution', () => {
    render(<FamiliarStrip rows={familiarRows()} units="metric" />)
    expect(screen.getByRole('heading', { name: 'Familiar displays' })).not.toBeNull()
    expect(screen.getByText('Full HD')).not.toBeNull()
    expect(screen.getByText('23.8″ · 1920 × 1080')).not.toBeNull()
    expect(screen.getByText('27″ · 3840 × 2160')).not.toBeNull()
  })

  it('marks the baseline with the accent style and the text "Baseline", as a static chip', () => {
    const { container } = render(
      <FamiliarStrip rows={familiarRows()} units="metric" onSetBaseline={() => {}} />,
    )
    const baselineChip = screen.getByText('Baseline').closest('.chip')
    expect(baselineChip.classList.contains('chip--accent')).toBe(true)
    expect(baselineChip.classList.contains('chip--selected')).toBe(true)
    expect(baselineChip.tagName).toBe('SPAN')
    expect(container.querySelectorAll('.chip--accent')).toHaveLength(1)
  })

  it('calls onSetBaseline with the id when a non-baseline chip is tapped', async () => {
    const user = userEvent.setup()
    const onSetBaseline = vi.fn()
    render(
      <FamiliarStrip
        rows={familiarRows()}
        units="metric"
        onSetBaseline={onSetBaseline}
      />,
    )
    await user.click(screen.getByRole('button', { name: /4K UHD/ }))
    expect(onSetBaseline).toHaveBeenCalledTimes(1)
    expect(onSetBaseline).toHaveBeenCalledWith(FOUR_K)
  })

  it('exposes non-baseline chips as toggle buttons with an action hint', () => {
    render(
      <FamiliarStrip rows={familiarRows()} units="metric" onSetBaseline={() => {}} />,
    )
    const chip = screen.getByRole('button', { name: /4K UHD/ })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    expect(chip.getAttribute('title')).toBe('Make 4K UHD the baseline')
  })

  it('calls onAdd when "Add display" is pressed', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<FamiliarStrip rows={familiarRows()} units="metric" onAdd={onAdd} />)
    await user.click(screen.getByRole('button', { name: 'Add display' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('shows how to mark a display, and still offers "Add display", when there are no familiar rows', () => {
    render(<FamiliarStrip rows={[]} units="metric" />)
    expect(
      screen.getByText('Mark a display as familiar to use it as a baseline.'),
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Add display' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /Full HD/ })).toBeNull()
  })

  it('lists the chips in the order given, with the add button last', () => {
    render(
      <FamiliarStrip rows={familiarRows()} units="metric" onSetBaseline={() => {}} />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[2]).getByRole('button', { name: 'Add display' })).not.toBeNull()
  })

  it('renders Czech labels, decimal comma diagonals and the Czech baseline marker', () => {
    locale.value = 'cs'
    render(
      <FamiliarStrip rows={familiarRows()} units="metric" onSetBaseline={() => {}} />,
    )
    expect(screen.getByRole('heading', { name: 'Známé displeje' })).not.toBeNull()
    expect(screen.getByText('Referenční')).not.toBeNull()
    expect(screen.getByText('23,8″ · 1920 × 1080')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Přidat displej' })).not.toBeNull()
  })

  it('tolerates a missing rows prop', () => {
    render(<FamiliarStrip units="metric" />)
    expect(
      screen.getByText('Mark a display as familiar to use it as a baseline.'),
    ).not.toBeNull()
  })
})
