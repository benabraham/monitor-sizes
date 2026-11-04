import { render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { locale } from '../../i18n/index.js'
import { buildComparison, SIXTY_CM } from './compare-data.fixtures.js'
import { MetricGrid } from './metric-grid.jsx'
import { METRIC_ROWS } from './metric-rows.js'

const NBSP = ' '

/** 42″ 4K baseline at 60 cm and 100 %, 27″ 4K candidate at 60 cm and 150 %. */
const baselineSpec = { id: '42-3840x2160', distance: SIXTY_CM, scale: 1 }
const candidateSpec = { id: '27-3840x2160', distance: SIXTY_CM, scale: 1.5 }

/**
 * @returns {object[]} The two entries, baseline first.
 */
const comparison = () =>
  buildComparison({ baseline: baselineSpec, candidates: [candidateSpec] })

/**
 * Read the grid as a map from row label to the cell texts, skipping the header row.
 *
 * @param {HTMLElement} table
 * @returns {Record<string, string[]>}
 */
const readRows = (table) =>
  Object.fromEntries(
    within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => [
        within(row).getByRole('rowheader').getAttribute('aria-label'),
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ]),
  )

afterEach(() => {
  locale.value = 'en'
})

describe('MetricGrid', () => {
  it('renders nothing without entries', () => {
    const { container } = render(<MetricGrid entries={[]} units="metric" />)
    expect(container.querySelector('table')).toBeNull()
  })

  it('puts the baseline column first even when the entries arrive out of order', () => {
    const [baseline, candidate] = comparison()
    render(<MetricGrid entries={[candidate, baseline]} units="metric" />)

    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(3)
    expect(headers[1].textContent).toContain('42″')
    expect(headers[1].textContent).toContain('Baseline')
    expect(headers[2].textContent).toContain('27″')
    expect(headers[2].textContent).toContain('Candidate')
  })

  it('marks familiar columns with a familiar badge and a dashed rule, candidates solid', () => {
    const [baseline, candidate] = buildComparison({
      baseline: baselineSpec,
      candidates: [{ ...candidateSpec, isFamiliar: true }],
    })
    render(<MetricGrid entries={[baseline, candidate]} units="metric" />)

    const familiarHead = screen.getByRole('columnheader', { name: /Familiar/ })
    expect(familiarHead.classList.contains('metric-grid__head--familiar')).toBe(true)
    const baselineHead = screen.getByRole('columnheader', { name: /Baseline/ })
    expect(baselineHead.classList.contains('metric-grid__head--baseline')).toBe(true)
  })

  it('shows a candidate badge on non-familiar columns', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const candidateHead = screen.getByRole('columnheader', { name: /Candidate/ })
    expect(candidateHead.classList.contains('metric-grid__head--candidate')).toBe(true)
  })

  it('has a row for every metric, each with a row header', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('rowheader')).toHaveLength(METRIC_ROWS.length)
  })

  it('formats the PPI and the signed relative pixel size against the baseline', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const rows = readRows(screen.getByRole('table'))

    expect(rows.PPI).toEqual(['105', '163'])
    expect(rows['Relative pixel size']).toEqual(['same', `−36${NBSP}%`])
  })

  it('formats the physical size, size differences and area for each column', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const rows = readRows(screen.getByRole('table'))

    expect(rows['Width (cm)']).toEqual([`93${NBSP}cm`, `60${NBSP}cm`])
    expect(rows['Height (cm)']).toEqual([`52${NBSP}cm`, `34${NBSP}cm`])
    expect(rows['Width difference (cm)']).toEqual(['same', `−33${NBSP}cm`])
    expect(rows['Height difference (cm)']).toEqual(['same', `−19${NBSP}cm`])
    expect(rows['Area (dm²)'][0]).toMatch(/^\d+ dm²$/)
    expect(rows['Area vs baseline']).toEqual(['same', `−59${NBSP}%`])
  })

  it('formats resolution, aspect, megapixels and their ratio', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const rows = readRows(screen.getByRole('table'))

    expect(rows.Resolution).toEqual(['3840 × 2160', '3840 × 2160'])
    expect(rows['Aspect ratio']).toEqual(['16:9', '16:9'])
    expect(rows.Megapixels).toEqual(['8.3', '8.3'])
    expect(rows['Megapixels vs baseline']).toEqual(['same', 'same'])
  })

  it('shows the viewing distance, the scale and the logical values at that scale', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const rows = readRows(screen.getByRole('table'))

    expect(rows['Viewing distance (cm)']).toEqual([`60${NBSP}cm`, `60${NBSP}cm`])
    expect(rows.Scale).toEqual([`100${NBSP}%`, `150${NBSP}%`])
    expect(rows['Logical resolution']).toEqual(['3840 × 2160', '2560 × 1440'])
    expect(rows['Effective PPI']).toEqual(['105', '109'])
    expect(rows['Workspace (Mpix)']).toEqual(['8.3', '3.7'])
  })

  it('formats the field of view, PPD and logical PPD', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const rows = readRows(screen.getByRole('table'))

    expect(rows['Horizontal FOV']).toEqual(['75.5°', '53.0°'])
    expect(rows['Vertical FOV']).toEqual(['47.1°', '31.3°'])
    expect(rows.PPD).toEqual(['43', '67'])
    expect(rows['Logical PPD']).toEqual(['43', '45'])
  })

  it('shows the equivalent distances for candidates and a dash for the baseline', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const rows = readRows(screen.getByRole('table'))

    expect(rows['Same size at (cm)']).toEqual(['—', `39${NBSP}cm`])
    expect(rows['Same sharpness at (cm)']).toEqual(['—', `39${NBSP}cm`])
    expect(rows['Same text size at (cm)']).toEqual(['—', `58${NBSP}cm`])
  })

  it('shows a dash for relative values when the entry has no baseline', () => {
    const [baseline, candidate] = comparison()
    render(
      <MetricGrid
        entries={[baseline, { ...candidate, relative: null, equivalent: null }]}
        units="metric"
      />,
    )
    const rows = readRows(screen.getByRole('table'))

    expect(rows['Relative pixel size']).toEqual(['same', '—'])
    expect(rows['Width difference (cm)']).toEqual(['same', '—'])
    expect(rows['Area vs baseline']).toEqual(['same', '—'])
    expect(rows['Same size at (cm)']).toEqual(['—', '—'])
  })

  it('uses imperial units and the Czech decimal comma', () => {
    locale.value = 'cs'
    render(<MetricGrid entries={comparison()} units="imperial" />)
    expect(screen.getByRole('table').textContent).toContain(`36,6${NBSP}in`)
    expect(screen.getByRole('table').textContent).toContain(`23,6${NBSP}in`)
  })

  it('gives every metric row a help popover that opens its text', async () => {
    const user = userEvent.setup()
    render(<MetricGrid entries={comparison()} units="metric" />)

    expect(screen.getAllByRole('button', { name: /^Help: / })).toHaveLength(
      METRIC_ROWS.length,
    )

    const trigger = screen.getByRole('button', { name: 'Help: PPI' })
    await user.click(trigger)

    // jsdom has no Popover API, so the fallback shows the panel by removing `hidden`.
    const panel = document.getElementById(trigger.getAttribute('aria-controls'))
    expect(panel.hasAttribute('hidden')).toBe(false)
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.textContent).toContain('Pixels per inch')
  })

  it('keeps the row headers sticky inside a scrolling wrapper', () => {
    render(<MetricGrid entries={comparison()} units="metric" />)
    const table = screen.getByRole('table')
    expect(table.parentElement.classList.contains('table-wrap')).toBe(true)
    const firstHeader = within(table).getAllByRole('rowheader')[0]
    expect(firstHeader.classList.contains('metric-grid__row-head')).toBe(true)
  })
})
