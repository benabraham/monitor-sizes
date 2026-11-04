import { fireEvent, render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../../i18n/index.js'
import {
  BASELINE_ID,
  buildBrowseFixture,
  buildBrowseRow,
  buildManyRows,
  findSeedDisplay,
} from '../browse.fixtures.js'
import { DisplayTable } from './display-table.jsx'

const FOUR_K = '27-3840x2160'
const ULTRAWIDE = '29-2560x1080'
const MINUS = '−'

/** Three rows: baseline (Full HD), 27″ 4K and 29″ UW Full HD, all compared. */
const threeRows = ({ comparedIds = [FOUR_K] } = {}) =>
  buildBrowseFixture({
    familiarIds: [BASELINE_ID],
    comparedIds,
  }).rows

/** Header button for a sort key, found by its label text. */
const sortButton = (label) => screen.getByRole('button', { name: label })

/** The header cell that wraps a sort button. */
const headerCell = (label) => sortButton(label).closest('th')

afterEach(() => {
  locale.value = 'en'
})

describe('DisplayTable', () => {
  it('renders a visually hidden caption inside a .table-wrap scroll container', () => {
    const { container } = render(<DisplayTable rows={threeRows()} units="metric" />)
    expect(
      screen.getByRole('table', { name: 'Displays compared with the baseline' }),
    ).not.toBeNull()
    expect(container.querySelector('.table-wrap table')).not.toBeNull()
    expect(container.querySelector('caption').classList.contains('visually-hidden')).toBe(
      true,
    )
  })

  it('calls onSort with the key only when a sortable header is pressed', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(<DisplayTable rows={threeRows()} units="metric" sort={null} onSort={onSort} />)
    await user.click(sortButton('PPI'))
    expect(onSort).toHaveBeenCalledWith({ key: 'ppi' })
    await user.click(sortButton('Resolution'))
    expect(onSort).toHaveBeenLastCalledWith({ key: 'resolution' })
    await user.click(sortButton('Name'))
    expect(onSort).toHaveBeenLastCalledWith({ key: 'name' })
    expect(onSort).toHaveBeenCalledTimes(3)
  })

  it('reflects the active sort in aria-sort, and leaves other headers at none', () => {
    const { rerender } = render(
      <DisplayTable
        rows={threeRows()}
        units="metric"
        sort={{ key: 'ppi', direction: 'desc' }}
      />,
    )
    expect(headerCell('PPI').getAttribute('aria-sort')).toBe('descending')
    expect(headerCell('Diagonal').getAttribute('aria-sort')).toBe('none')

    rerender(
      <DisplayTable
        rows={threeRows()}
        units="metric"
        sort={{ key: 'ppi', direction: 'asc' }}
      />,
    )
    expect(headerCell('PPI').getAttribute('aria-sort')).toBe('ascending')
  })

  it('maps every sortable key to a header, covering the F4 metrics', () => {
    render(<DisplayTable rows={threeRows()} units="metric" sort={null} />)
    const expectedHeaders = [
      'Name',
      'Diagonal',
      'PPI',
      'Relative pixel size',
      'Aspect ratio',
      'Resolution',
      'Width',
      'Height',
      'Width difference (cm)',
      'Height difference (cm)',
      'Area',
      'Area vs baseline',
      'Megapixels',
      'Megapixels vs baseline',
      'Comfortable scales',
    ]
    expectedHeaders.forEach((label) => {
      expect(headerCell(label).getAttribute('aria-sort')).toBe('none')
    })
  })

  it('gives every metric header a help popover named after the metric', () => {
    render(<DisplayTable rows={threeRows()} units="metric" sort={null} />)
    expect(screen.getByRole('button', { name: 'Help: PPI' })).not.toBeNull()
    expect(
      screen.getByRole('button', { name: 'Help: Relative pixel size' }),
    ).not.toBeNull()
    expect(
      screen.getByRole('button', { name: 'Help: Comfortable scales' }),
    ).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Help: Name' })).toBeNull()
  })

  it('toggles familiarity with the star, passing only the id', async () => {
    const user = userEvent.setup()
    const onToggleFamiliar = vi.fn()
    render(
      <DisplayTable
        rows={threeRows()}
        units="metric"
        onToggleFamiliar={onToggleFamiliar}
      />,
    )
    const star = screen.getByRole('button', { name: 'Mark 4K UHD as familiar' })
    expect(star.getAttribute('aria-pressed')).toBe('false')
    await user.click(star)
    expect(onToggleFamiliar).toHaveBeenCalledTimes(1)
    expect(onToggleFamiliar).toHaveBeenCalledWith(FOUR_K)
  })

  it('shows the star as pressed for a familiar row', () => {
    const rows = buildBrowseFixture({ familiarIds: [BASELINE_ID, FOUR_K] }).rows
    render(<DisplayTable rows={rows} units="metric" />)
    expect(
      screen
        .getByRole('button', { name: 'Mark 4K UHD as familiar' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Mark Full HD as familiar' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Mark UW Full HD as familiar' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('toggles comparison with the checkbox, passing only the id, and reflects the checked state', async () => {
    const user = userEvent.setup()
    const onToggleCompare = vi.fn()
    render(
      <DisplayTable
        rows={threeRows({ comparedIds: [FOUR_K] })}
        units="metric"
        onToggleCompare={onToggleCompare}
      />,
    )
    const checked = screen.getByRole('checkbox', { name: 'Compare 4K UHD' })
    const unchecked = screen.getByRole('checkbox', { name: 'Compare UW Full HD' })
    expect(checked.checked).toBe(true)
    expect(unchecked.checked).toBe(false)
    await user.click(unchecked)
    expect(onToggleCompare).toHaveBeenCalledWith(ULTRAWIDE)
  })

  it('opens a display when its name is pressed, passing the id', async () => {
    const user = userEvent.setup()
    const onOpenDisplay = vi.fn()
    render(
      <DisplayTable rows={threeRows()} units="metric" onOpenDisplay={onOpenDisplay} />,
    )
    await user.click(screen.getByRole('button', { name: '4K UHD' }))
    expect(onOpenDisplay).toHaveBeenCalledWith(FOUR_K)
  })

  it('marks the baseline row with a class and a screen-reader "Baseline" text', () => {
    const { container } = render(<DisplayTable rows={threeRows()} units="metric" />)
    const baselineRow = container.querySelector('.display-table__row--baseline')
    expect(baselineRow).not.toBeNull()
    expect(
      within(baselineRow).getByText('Baseline').classList.contains('visually-hidden'),
    ).toBe(true)
    expect(container.querySelectorAll('.display-table__row--baseline')).toHaveLength(1)
  })

  it('shows the dash for every relative column when there is no baseline', () => {
    const rows = [
      buildBrowseRow({ display: findSeedDisplay(FOUR_K), baselineMetrics: null }),
    ]
    render(<DisplayTable rows={rows} units="metric" />)
    // Relative pixel size, width diff, height diff, area ratio, megapixel ratio.
    expect(screen.getAllByText('—')).toHaveLength(5)
  })

  it('shows signed relative values with the minus sign, the word "same" and a colour class', () => {
    const { container } = render(<DisplayTable rows={threeRows()} units="metric" />)
    // 4K 27″ (163 PPI) against the 23.8″ Full HD baseline (92.6 PPI).
    const relativeCell = screen.getByText(`${MINUS}43 %`)
    expect(relativeCell.classList.contains('display-table__value--negative')).toBe(true)
    expect(screen.getAllByText('same').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('.display-table__value--positive')).not.toBeNull()
  })

  it('makes a positive width difference bold, and leaves a negative one plain', () => {
    const { container } = render(<DisplayTable rows={threeRows()} units="metric" />)
    const strong = container.querySelectorAll('.display-table__value--strong')
    expect(strong.length).toBeGreaterThanOrEqual(1)
    strong.forEach((cell) => expect(cell.textContent.startsWith('+')).toBe(true))
  })

  it('shows every comfortable scale as a chip, flagging the best one', () => {
    const rows = [
      buildBrowseRow({ display: findSeedDisplay(FOUR_K), baselineMetrics: null }),
    ]
    render(<DisplayTable rows={rows} units="metric" />)
    // A 27″ 4K has one comfortable scale in the Windows preset: 175 %.
    const chip = screen.getByText('175 % → 2190 × 1230')
    expect(chip.closest('.row-parts__scale--best')).not.toBeNull()
    expect(screen.getByText('(Best)')).not.toBeNull()
  })

  it('shows "No comfortable scale" when a display has no comfortable row', () => {
    const comfort = { mode: 'ppi', minPpi: 300, maxPpi: 400, minWidth: 1024 }
    const rows = [
      buildBrowseRow({
        display: findSeedDisplay(ULTRAWIDE),
        baselineMetrics: null,
        comfort,
      }),
    ]
    render(<DisplayTable rows={rows} units="metric" />)
    expect(screen.getByText('No comfortable scale')).not.toBeNull()
  })

  it('shows the Custom badge for custom displays', () => {
    const custom = {
      ...findSeedDisplay(FOUR_K),
      id: 'c-test',
      name: 'Office 4K',
      isCustom: true,
    }
    const rows = [buildBrowseRow({ display: custom, baselineMetrics: null })]
    render(<DisplayTable rows={rows} units="metric" />)
    expect(screen.getByText('Custom')).not.toBeNull()
  })

  it('formats imperial units in the headers and the cells', () => {
    render(<DisplayTable rows={threeRows()} units="imperial" />)
    expect(headerCell('Width difference (in)')).not.toBeNull()
    const body = document.querySelector('tbody').textContent
    expect(body).toContain('in')
    expect(body).not.toMatch(/\d cm/)
  })

  it('renders Czech headers, decimal commas and the Czech "same" label', () => {
    locale.value = 'cs'
    render(<DisplayTable rows={threeRows()} units="metric" />)
    expect(
      screen.getByRole('table', { name: 'Displeje porovnané s referenčním displejem' }),
    ).not.toBeNull()
    expect(sortButton('Úhlopříčka')).not.toBeNull()
    expect(sortButton('Relativní velikost pixelu')).not.toBeNull()
    expect(screen.getByText('23,8″')).not.toBeNull()
    expect(screen.getByText(`${MINUS}43 %`)).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Nápověda: PPI' })).not.toBeNull()
  })

  it('renders 200 rows in a single table without building the DOM twice', () => {
    const rows = buildManyRows({ count: 200 })
    const started = performance.now()
    const { container } = render(<DisplayTable rows={rows} units="metric" />)
    const elapsed = performance.now() - started
    expect(container.querySelectorAll('tbody tr')).toHaveLength(200)
    // A generous bound: the point is to catch a quadratic or double render.
    expect(elapsed).toBeLessThan(5000)
  })

  it('renders headers even with no rows', () => {
    const { container } = render(<DisplayTable rows={[]} units="metric" />)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0)
    expect(headerCell('PPI')).not.toBeNull()
  })
})

/** The table row that contains the given display name. */
const rowFor = (name) => screen.getByRole('button', { name }).closest('tr')

/** A press on an element with a finger, the way a phone reports it. */
const touchDown = (element) =>
  fireEvent.pointerDown(element, {
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    clientX: 5,
    clientY: 5,
  })

describe('DisplayTable long press', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('toggles comparison after a 500 ms press on the row, and says so', () => {
    const onToggleCompare = vi.fn()
    render(
      <DisplayTable
        rows={threeRows()}
        units="metric"
        onToggleCompare={onToggleCompare}
      />,
    )

    touchDown(rowFor('UW Full HD'))
    vi.advanceTimersByTime(500)
    vi.advanceTimersByTime(100)

    expect(onToggleCompare).toHaveBeenCalledWith(ULTRAWIDE)
    expect(document.getElementById('browse-announcer').textContent).toBe(
      'Added UW Full HD to comparison',
    )
  })

  it('does nothing on a normal tap of the row', () => {
    const onToggleCompare = vi.fn()
    render(
      <DisplayTable
        rows={threeRows()}
        units="metric"
        onToggleCompare={onToggleCompare}
      />,
    )
    const row = rowFor('UW Full HD')

    touchDown(row)
    fireEvent.pointerUp(row, { pointerType: 'touch', isPrimary: true, button: 0 })
    vi.advanceTimersByTime(1000)

    expect(onToggleCompare).not.toHaveBeenCalled()
  })
})
