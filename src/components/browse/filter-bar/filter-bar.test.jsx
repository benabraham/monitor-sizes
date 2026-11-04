import { render, screen } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../../i18n/index.js'
import { clearedFilters } from '../browse-filters.js'
import { FilterBar } from './filter-bar.jsx'

const TAGS = ['laptop', 'monitor', 'ultrawide']
const ASPECTS = ['16:9', '21:9']

/**
 * @param {Partial<import('../browse-filters.js').BrowseFilters>} [overrides]
 * @returns {import('../browse-filters.js').BrowseFilters}
 */
const filtersWith = (overrides = {}) => ({ ...clearedFilters(), ...overrides })

afterEach(() => {
  locale.value = 'en'
})

describe('FilterBar', () => {
  it('labels the search field and reports each typed change as a search payload', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterBar filters={clearedFilters()} onChange={onChange} />)
    const search = screen.getByRole('searchbox', { name: 'Search displays' })
    expect(search.getAttribute('type')).toBe('search')
    await user.type(search, 'dell')
    expect(onChange).toHaveBeenCalledWith({ search: 'd' })
    expect(onChange).toHaveBeenLastCalledWith({ search: 'dell' })
  })

  it('shows the search value it is given', () => {
    render(<FilterBar filters={filtersWith({ search: 'mac' })} onChange={() => {}} />)
    expect(screen.getByRole('searchbox', { name: 'Search displays' }).value).toBe('mac')
  })

  it('toggles a tag chip on and off through onChange with the full tag list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <FilterBar filters={clearedFilters()} availableTags={TAGS} onChange={onChange} />,
    )
    const monitor = screen.getByRole('button', { name: 'Monitor' })
    expect(monitor.getAttribute('aria-pressed')).toBe('false')
    await user.click(monitor)
    expect(onChange).toHaveBeenLastCalledWith({ tags: ['monitor'] })

    rerender(
      <FilterBar
        filters={filtersWith({ tags: ['monitor', 'laptop'] })}
        availableTags={TAGS}
        onChange={onChange}
      />,
    )
    const pressed = screen.getByRole('button', { name: 'Monitor' })
    expect(pressed.getAttribute('aria-pressed')).toBe('true')
    await user.click(pressed)
    expect(onChange).toHaveBeenLastCalledWith({ tags: ['laptop'] })
  })

  it('shows translated tag names and hides the type group when there are no tags', () => {
    const { rerender } = render(
      <FilterBar filters={clearedFilters()} onChange={() => {}} />,
    )
    expect(screen.queryByRole('group', { name: 'Type' })).toBeNull()
    rerender(
      <FilterBar filters={clearedFilters()} availableTags={TAGS} onChange={() => {}} />,
    )
    expect(screen.getByRole('group', { name: 'Type' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Laptop' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Ultrawide' })).not.toBeNull()
  })

  it('toggles aspect chips with the label from the data', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <FilterBar
        filters={filtersWith({ aspects: ['16:9'] })}
        availableAspects={ASPECTS}
        onChange={onChange}
      />,
    )
    expect(
      screen.getByRole('button', { name: '16:9' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(screen.getByRole('button', { name: '21:9' }))
    expect(onChange).toHaveBeenLastCalledWith({ aspects: ['16:9', '21:9'] })
  })

  it('reports the comfort toggle as a checkbox with the PRD label', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterBar filters={clearedFilters()} onChange={onChange} />)
    const toggle = screen.getByRole('checkbox', {
      name: 'Only displays with a comfortable scale',
    })
    expect(toggle.checked).toBe(false)
    await user.click(toggle)
    expect(onChange).toHaveBeenCalledWith({ onlyComfortable: true })
  })

  it('commits a typed minimum diagonal on blur, and reports it as a number', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterBar filters={clearedFilters()} onChange={onChange} />)
    const minimum = screen.getByRole('textbox', { name: 'Minimum' })
    await user.type(minimum, '24')
    await user.tab()
    expect(onChange).toHaveBeenCalledWith({ minDiagonal: 24 })
  })

  it('reports a typed maximum diagonal in the Czech decimal form', async () => {
    locale.value = 'cs'
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterBar filters={clearedFilters()} onChange={onChange} />)
    const maximum = screen.getByRole('textbox', { name: 'Největší' })
    await user.type(maximum, '32,5')
    await user.tab()
    expect(onChange).toHaveBeenCalledWith({ maxDiagonal: 32.5 })
  })

  it('clears one diagonal bound with its own button, leaving the other bound', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <FilterBar
        filters={filtersWith({ minDiagonal: 24, maxDiagonal: 32 })}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Clear minimum diagonal' }))
    expect(onChange).toHaveBeenLastCalledWith({ minDiagonal: null })
    await user.click(screen.getByRole('button', { name: 'Clear maximum diagonal' }))
    expect(onChange).toHaveBeenLastCalledWith({ maxDiagonal: null })
  })

  it('hides the clear buttons for unset bounds', () => {
    render(<FilterBar filters={clearedFilters()} onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Clear minimum diagonal' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear maximum diagonal' })).toBeNull()
  })

  it('shows "Clear filters" only when a filter is active, and it sends the cleared state', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <FilterBar filters={clearedFilters()} onChange={onChange} />,
    )
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()

    rerender(
      <FilterBar
        filters={filtersWith({ tags: ['laptop'], onlyComfortable: true })}
        availableTags={TAGS}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onChange).toHaveBeenCalledWith(clearedFilters())
  })

  it('tolerates missing filters and missing callbacks', async () => {
    const user = userEvent.setup()
    render(<FilterBar availableTags={TAGS} />)
    await user.click(screen.getByRole('button', { name: 'Monitor' }))
    expect(screen.getByRole('searchbox', { name: 'Search displays' }).value).toBe('')
  })

  it('renders Czech labels', () => {
    locale.value = 'cs'
    render(
      <FilterBar
        filters={filtersWith({ onlyComfortable: true })}
        availableTags={TAGS}
        availableAspects={ASPECTS}
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('searchbox', { name: 'Hledat displeje' })).not.toBeNull()
    expect(screen.getByRole('group', { name: 'Typ' })).not.toBeNull()
    expect(screen.getByRole('group', { name: 'Poměr stran' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Notebook' })).not.toBeNull()
    expect(
      screen.getByRole('checkbox', { name: 'Jen displeje s pohodlným měřítkem' }).checked,
    ).toBe(true)
    expect(screen.getByRole('button', { name: 'Zrušit filtry' })).not.toBeNull()
  })
})
