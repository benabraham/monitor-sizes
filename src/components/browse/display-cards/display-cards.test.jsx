import { fireEvent, render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../../i18n/index.js'
import {
  BASELINE_ID,
  buildBrowseFixture,
  buildBrowseRow,
  findSeedDisplay,
} from '../browse.fixtures.js'
import { DisplayCards } from './display-cards.jsx'

const FOUR_K = '27-3840x2160'
const ULTRAWIDE = '29-2560x1080'
const MINUS = '−'

/** Three cards: baseline (Full HD), 27″ 4K (compared) and 29″ UW (not compared). */
const threeRows = () =>
  buildBrowseFixture({ familiarIds: [BASELINE_ID], comparedIds: [FOUR_K] }).rows

/** The card that contains the given display name. */
const cardFor = (name) => screen.getByRole('heading', { name }).closest('li')

afterEach(() => {
  locale.value = 'en'
})

describe('DisplayCards', () => {
  it('renders one card per row, in the order given', () => {
    render(<DisplayCards rows={threeRows()} units="metric" />)
    const cards = screen.getAllByRole('listitem')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]).getByRole('heading', { name: 'Full HD' })).not.toBeNull()
    expect(within(cards[1]).getByRole('heading', { name: '4K UHD' })).not.toBeNull()
  })

  it('shows diagonal, resolution, PPI and the relative pixel size on the card', () => {
    render(<DisplayCards rows={threeRows()} units="metric" />)
    const card = cardFor('4K UHD')
    expect(within(card).getByText('27″')).not.toBeNull()
    expect(within(card).getByText('3840 × 2160')).not.toBeNull()
    expect(within(card).getByText('163')).not.toBeNull()
    expect(within(card).getByText(`${MINUS}43 %`)).not.toBeNull()
    expect(
      within(card)
        .getByText(`${MINUS}43 %`)
        .classList.contains('display-cards__value--negative'),
    ).toBe(true)
  })

  it('shows the best comfortable scale as a chip, with the spoken "Best"', () => {
    render(<DisplayCards rows={threeRows()} units="metric" />)
    const card = cardFor('Full HD')
    expect(within(card).getByText('100 % → 1920 × 1080')).not.toBeNull()
    expect(within(card).getByText('(Best)')).not.toBeNull()
  })

  it('shows a muted "No comfortable scale" when the card has none', () => {
    const comfort = { mode: 'ppi', minPpi: 300, maxPpi: 400, minWidth: 1024 }
    const rows = [
      buildBrowseRow({
        display: findSeedDisplay(ULTRAWIDE),
        baselineMetrics: null,
        comfort,
      }),
    ]
    render(<DisplayCards rows={rows} units="metric" />)
    const note = screen.getByText('No comfortable scale')
    expect(note.classList.contains('row-parts__muted')).toBe(true)
  })

  it('shows the dash for the relative size when there is no baseline', () => {
    const rows = [
      buildBrowseRow({ display: findSeedDisplay(FOUR_K), baselineMetrics: null }),
    ]
    render(<DisplayCards rows={rows} units="metric" />)
    expect(within(cardFor('4K UHD')).getByText('—')).not.toBeNull()
  })

  it('marks the baseline card with a visible "Baseline" badge', () => {
    const { container } = render(<DisplayCards rows={threeRows()} units="metric" />)
    expect(container.querySelectorAll('.display-cards__card--baseline')).toHaveLength(1)
    expect(within(cardFor('Full HD')).getByText('Baseline')).not.toBeNull()
  })

  it('toggles familiarity from the card star, passing only the id', async () => {
    const user = userEvent.setup()
    const onToggleFamiliar = vi.fn()
    render(
      <DisplayCards
        rows={threeRows()}
        units="metric"
        onToggleFamiliar={onToggleFamiliar}
      />,
    )
    await user.click(
      within(cardFor('4K UHD')).getByRole('button', { name: 'Mark 4K UHD as familiar' }),
    )
    expect(onToggleFamiliar).toHaveBeenCalledWith(FOUR_K)
  })

  it('toggles comparison from the labelled checkbox, passing only the id', async () => {
    const user = userEvent.setup()
    const onToggleCompare = vi.fn()
    render(
      <DisplayCards
        rows={threeRows()}
        units="metric"
        onToggleCompare={onToggleCompare}
      />,
    )
    const checkbox = within(cardFor('4K UHD')).getByRole('checkbox', {
      name: 'Compare 4K UHD',
    })
    expect(checkbox.checked).toBe(true)
    await user.click(checkbox)
    expect(onToggleCompare).toHaveBeenCalledWith(FOUR_K)
    expect(within(cardFor('UW Full HD')).getByText('Compare')).not.toBeNull()
  })

  it('opens a display when its name is pressed, passing the id', async () => {
    const user = userEvent.setup()
    const onOpenDisplay = vi.fn()
    render(
      <DisplayCards rows={threeRows()} units="metric" onOpenDisplay={onOpenDisplay} />,
    )
    await user.click(
      within(cardFor('UW Full HD')).getByRole('button', { name: 'UW Full HD' }),
    )
    expect(onOpenDisplay).toHaveBeenCalledWith(ULTRAWIDE)
  })

  it('shows a Custom badge for custom displays', () => {
    const custom = {
      ...findSeedDisplay(FOUR_K),
      id: 'c-test',
      name: 'Office 4K',
      isCustom: true,
    }
    render(
      <DisplayCards
        rows={[buildBrowseRow({ display: custom, baselineMetrics: null })]}
        units="metric"
      />,
    )
    expect(screen.getByText('Custom')).not.toBeNull()
  })

  it('renders Czech labels, decimal commas and Czech controls', () => {
    locale.value = 'cs'
    render(<DisplayCards rows={threeRows()} units="metric" />)
    const card = cardFor('Full HD')
    expect(within(card).getByText('23,8″')).not.toBeNull()
    expect(within(card).getByText('Referenční')).not.toBeNull()
    expect(within(card).getByText('Nejlepší pohodlné měřítko')).not.toBeNull()
    expect(
      within(card).getByRole('checkbox', { name: 'Porovnat Full HD' }),
    ).not.toBeNull()
    expect(within(card).getByText('Porovnat')).not.toBeNull()
  })

  it('renders an empty list for no rows', () => {
    const { container } = render(<DisplayCards rows={[]} units="metric" />)
    expect(container.querySelectorAll('li')).toHaveLength(0)
  })
})

/** A press on an element with a finger, the way a phone reports it. */
const touchDown = (element) =>
  fireEvent.pointerDown(element, {
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    clientX: 5,
    clientY: 5,
  })

describe('DisplayCards long press', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('toggles comparison after a 500 ms press on the card, and says so', () => {
    const onToggleCompare = vi.fn()
    render(
      <DisplayCards
        rows={threeRows()}
        units="metric"
        onToggleCompare={onToggleCompare}
      />,
    )
    const card = cardFor('UW Full HD')

    touchDown(card)
    vi.advanceTimersByTime(500)
    expect(onToggleCompare).toHaveBeenCalledWith(ULTRAWIDE)

    vi.advanceTimersByTime(100)
    expect(document.getElementById('browse-announcer').textContent).toBe(
      'Added UW Full HD to comparison',
    )
  })

  it('removes a compared display on a long press, and says it was removed', () => {
    const onToggleCompare = vi.fn()
    render(
      <DisplayCards
        rows={threeRows()}
        units="metric"
        onToggleCompare={onToggleCompare}
      />,
    )

    touchDown(cardFor('4K UHD'))
    vi.advanceTimersByTime(500)
    vi.advanceTimersByTime(100)

    expect(onToggleCompare).toHaveBeenCalledWith(FOUR_K)
    expect(document.getElementById('browse-announcer').textContent).toBe(
      'Removed 4K UHD from comparison',
    )
  })

  it('does nothing on a normal tap of the card', () => {
    const onToggleCompare = vi.fn()
    render(
      <DisplayCards
        rows={threeRows()}
        units="metric"
        onToggleCompare={onToggleCompare}
      />,
    )
    const card = cardFor('UW Full HD')

    touchDown(card)
    fireEvent.pointerUp(card, { pointerType: 'touch', isPrimary: true, button: 0 })
    vi.advanceTimersByTime(1000)

    expect(onToggleCompare).not.toHaveBeenCalled()
  })

  it('does not also press the name when a long press ends on it', () => {
    const onToggleCompare = vi.fn()
    const onOpenDisplay = vi.fn()
    render(
      <DisplayCards
        rows={threeRows()}
        units="metric"
        onToggleCompare={onToggleCompare}
        onOpenDisplay={onOpenDisplay}
      />,
    )
    const name = within(cardFor('UW Full HD')).getByRole('button', {
      name: 'UW Full HD',
    })

    touchDown(name)
    vi.advanceTimersByTime(500)
    fireEvent.pointerUp(name, { pointerType: 'touch', isPrimary: true, button: 0 })
    fireEvent.click(name)

    expect(onToggleCompare).toHaveBeenCalledTimes(1)
    expect(onOpenDisplay).not.toHaveBeenCalled()
  })
})
