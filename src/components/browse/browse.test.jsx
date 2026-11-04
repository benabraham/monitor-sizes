import { render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { render as preactRender } from 'preact'
import { act } from 'preact/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { Browse } from './browse.jsx'
import { clearedFilters } from './browse-filters.js'
import { BASELINE_ID, buildBrowseFixture, buildManyRows } from './browse.fixtures.js'
import { WIDE_QUERY } from './use-is-wide.js'

const FOUR_K = '27-3840x2160'

/** Default fixture: baseline Full HD (familiar) plus 27″ 4K and UW Full HD. */
const fixture = (overrides = {}) =>
  buildBrowseFixture({
    familiarIds: [BASELINE_ID, FOUR_K],
    comparedIds: [FOUR_K],
    ...overrides,
  })

/** Props every Browse test needs, with callbacks as spies. */
const baseProps = (overrides = {}) => {
  const { rows, familiarRows } = fixture()
  return {
    rows,
    familiarRows,
    filters: clearedFilters(),
    sort: { key: 'ppi', direction: 'desc' },
    units: 'metric',
    availableTags: ['monitor', 'laptop'],
    availableAspects: ['16:9', '21:9'],
    onFiltersChange: vi.fn(),
    onSort: vi.fn(),
    onToggleFamiliar: vi.fn(),
    onToggleCompare: vi.fn(),
    onSetBaseline: vi.fn(),
    onAdd: vi.fn(),
    onOpenDisplay: vi.fn(),
    compareCount: 0,
    onGoCompare: vi.fn(),
    layout: 'table',
    ...overrides,
  }
}

/**
 * Stub `window.matchMedia` for the `sm` breakpoint query.
 *
 * @param {boolean} matches Initial match result.
 * @returns {{ setMatches: (next: boolean) => void }} Fires `change` listeners on demand.
 */
const stubMatchMedia = (matches) => {
  const listeners = new Set()
  const state = { matches }
  window.matchMedia = vi.fn((query) => ({
    get matches() {
      return state.matches
    },
    media: query,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  }))
  return {
    setMatches: (next) => {
      state.matches = next
      listeners.forEach((listener) => listener({ matches: next }))
    },
  }
}

afterEach(() => {
  locale.value = 'en'
  delete window.matchMedia
})

describe('Browse', () => {
  it('renders the filters, the familiar strip, the count and the table in a labelled region', () => {
    render(<Browse {...baseProps()} />)
    expect(screen.getByRole('region', { name: 'Browse' })).not.toBeNull()
    expect(screen.getByRole('search')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Familiar displays' })).not.toBeNull()
    expect(screen.getByRole('table')).not.toBeNull()
    expect(screen.getByText('Displays shown: 3')).not.toBeNull()
  })

  it('announces the result count politely', () => {
    render(<Browse {...baseProps()} />)
    expect(screen.getByText('Displays shown: 3').getAttribute('aria-live')).toBe('polite')
  })

  it('passes the table callbacks through to the rows', async () => {
    const user = userEvent.setup()
    const props = baseProps()
    render(<Browse {...props} />)
    await user.click(screen.getByRole('button', { name: 'PPI' }))
    expect(props.onSort).toHaveBeenCalledWith({ key: 'ppi' })
    await user.click(screen.getByRole('checkbox', { name: 'Compare UW Full HD' }))
    expect(props.onToggleCompare).toHaveBeenCalledWith('29-2560x1080')
    await user.click(screen.getByRole('button', { name: 'Mark UW Full HD as familiar' }))
    expect(props.onToggleFamiliar).toHaveBeenCalledWith('29-2560x1080')
    await user.click(screen.getByRole('button', { name: 'UW Full HD' }))
    expect(props.onOpenDisplay).toHaveBeenCalledWith('29-2560x1080')
  })

  it('passes the strip and filter callbacks through', async () => {
    const user = userEvent.setup()
    const props = baseProps()
    render(<Browse {...props} />)
    const strip = screen
      .getByRole('heading', { name: 'Familiar displays' })
      .closest('section')
    await user.click(within(strip).getByRole('button', { name: /4K UHD/ }))
    expect(props.onSetBaseline).toHaveBeenCalledWith(FOUR_K)
    await user.click(screen.getByRole('button', { name: 'Add display' }))
    expect(props.onAdd).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Monitor' }))
    expect(props.onFiltersChange).toHaveBeenCalledWith({ tags: ['monitor'] })
  })

  it('shows the Compare button with the count, and sends the user to Compare', async () => {
    const user = userEvent.setup()
    const props = baseProps({ compareCount: 2 })
    render(<Browse {...props} />)
    await user.click(screen.getByRole('button', { name: 'Compare (2)' }))
    expect(props.onGoCompare).toHaveBeenCalledTimes(1)
  })

  it('hides the Compare bar when nothing is compared', () => {
    render(<Browse {...baseProps({ compareCount: 0 })} />)
    expect(screen.queryByRole('button', { name: /^Compare \(/ })).toBeNull()
  })

  it('shows the empty state with a clear action when filters match nothing', async () => {
    const user = userEvent.setup()
    const props = baseProps({
      rows: [],
      filters: { ...clearedFilters(), search: 'nothing-like-this' },
    })
    render(<Browse {...props} />)
    expect(screen.getByText('No displays match these filters.')).not.toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    const empty = document.querySelector('.browse__empty')
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }))
    expect(props.onFiltersChange).toHaveBeenLastCalledWith(clearedFilters())
  })

  it('shows the plain empty state, with no clear action, when there are no displays at all', () => {
    render(<Browse {...baseProps({ rows: [] })} />)
    expect(screen.getByText('No displays to show yet.')).not.toBeNull()
    const empty = document.querySelector('.browse__empty')
    expect(within(empty).queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  it('renders the cards layout when layout is "cards"', () => {
    const { container } = render(<Browse {...baseProps({ layout: 'cards' })} />)
    expect(screen.queryByRole('table')).toBeNull()
    expect(container.querySelectorAll('.display-cards__card')).toHaveLength(3)
  })

  it('renders the table layout when layout is "table"', () => {
    const { container } = render(<Browse {...baseProps({ layout: 'table' })} />)
    expect(container.querySelectorAll('.display-cards__card')).toHaveLength(0)
    expect(screen.getByRole('table')).not.toBeNull()
  })

  it('defaults to the table without matchMedia (desktop layout)', () => {
    const { layout: _ignored, ...props } = baseProps()
    render(<Browse {...props} />)
    expect(screen.getByRole('table')).not.toBeNull()
  })

  it('chooses cards on a narrow viewport and the table on a wide one, and follows changes', () => {
    const media = stubMatchMedia(false)
    const { layout: _ignored, ...props } = baseProps()
    render(<Browse {...props} />)
    expect(window.matchMedia).toHaveBeenCalledWith(WIDE_QUERY)
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3)

    act(() => media.setMatches(true))
    expect(screen.getByRole('table')).not.toBeNull()
  })

  it('stops listening to the viewport when unmounted', () => {
    const removeEventListener = vi.fn()
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener,
    }))
    const { layout: _ignored, ...props } = baseProps()
    const { container } = render(<Browse {...props} />)
    act(() => {})
    act(() => preactRender(null, container))
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('renders 200 displays with a single list and no layout duplication', () => {
    const rows = buildManyRows({ count: 200 })
    const started = performance.now()
    const { container } = render(
      <Browse {...baseProps({ rows, familiarRows: [], layout: 'table' })} />,
    )
    const elapsed = performance.now() - started
    expect(container.querySelectorAll('tbody tr')).toHaveLength(200)
    expect(container.querySelectorAll('.display-cards__card')).toHaveLength(0)
    expect(screen.getByText('Displays shown: 200')).not.toBeNull()
    expect(elapsed).toBeLessThan(5000)
  })

  it('renders Czech labels and the Czech count', () => {
    locale.value = 'cs'
    render(<Browse {...baseProps({ compareCount: 1 })} />)
    expect(screen.getByRole('region', { name: 'Procházet' })).not.toBeNull()
    expect(screen.getByText('Zobrazené displeje: 3')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Porovnat (1)' })).not.toBeNull()
  })

  it('tolerates a missing rows list', () => {
    render(<Browse {...baseProps({ rows: undefined })} />)
    expect(screen.getByText('No displays to show yet.')).not.toBeNull()
  })
})
