import { render, screen, within } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { locale } from '../../i18n/index.js'
import { buildComparison, SIXTY_CM } from './compare-data.fixtures.js'
import { ScalingMatrix } from './scaling-matrix.jsx'

const NBSP = ' '

/** 42″ 4K baseline at 100 %, 27″ 4K candidate at 150 %, Windows scale steps. */
const windowsEntries = () =>
  buildComparison({
    baseline: { id: '42-3840x2160', distance: SIXTY_CM, scale: 1 },
    candidates: [{ id: '27-3840x2160', distance: SIXTY_CM, scale: 1.5 }],
  })

/**
 * Scale labels of the rows of one table.
 *
 * @param {HTMLElement} table
 * @returns {string[]}
 */
const rowLabels = (table) =>
  within(table)
    .getAllByRole('rowheader')
    .map((header) => header.textContent.trim())

afterEach(() => {
  locale.value = 'en'
})

describe('ScalingMatrix', () => {
  it('renders nothing without entries', () => {
    const { container } = render(<ScalingMatrix entries={[]} />)
    expect(container.querySelector('table')).toBeNull()
  })

  it('renders one labelled section and table per display, baseline first', () => {
    const [baseline, candidate] = windowsEntries()
    render(<ScalingMatrix entries={[candidate, baseline]} />)

    const sections = screen.getAllByRole('region')
    expect(sections).toHaveLength(2)
    expect(sections[0].textContent).toContain('Baseline')
    expect(sections[1].textContent).toContain('Candidate')
    expect(screen.getAllByRole('table')).toHaveLength(2)
  })

  it('lists every scale of the preset, not only the comfortable ones', () => {
    const [baseline] = windowsEntries()
    render(<ScalingMatrix entries={[baseline]} />)

    expect(rowLabels(screen.getByRole('table'))).toEqual([
      `100${NBSP}%`,
      `125${NBSP}%`,
      `150${NBSP}%`,
      `175${NBSP}%`,
      `200${NBSP}%`,
    ])
  })

  it('highlights comfortable rows and marks them with text, not only colour', () => {
    const [, candidate] = windowsEntries()
    render(<ScalingMatrix entries={[candidate]} />)
    const table = screen.getByRole('table')

    // 27″ 4K has one comfortable Windows scale, 175 %, with PPI 93.
    const bodyRows = within(table).getAllByRole('row').slice(1)
    const comfortableRows = bodyRows.filter((row) =>
      row.classList.contains('scaling-matrix__row--comfortable'),
    )
    expect(comfortableRows).toHaveLength(1)
    expect(comfortableRows[0].textContent).toContain('175')
    expect(comfortableRows[0].textContent).toContain('Comfortable')
    expect(bodyRows[0].textContent).not.toContain('Comfortable')
  })

  it('marks the scale in use and the recommended scale with text', () => {
    const [, candidate] = windowsEntries()
    render(<ScalingMatrix entries={[candidate]} />)
    const table = screen.getByRole('table')

    const inUse = within(table).getByText('In use')
    expect(inUse.closest('tr').textContent).toContain('150')
    const recommended = within(table).getByText('Recommended')
    expect(recommended.closest('tr').textContent).toContain('175')
  })

  it('shows the logical resolution, effective PPI and workspace megapixels per scale', () => {
    const [baseline] = windowsEntries()
    render(<ScalingMatrix entries={[baseline]} />)
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    const at100 = rows[0]

    expect(at100.textContent).toContain('3840 × 2160')
    expect(at100.textContent).toContain('105')
    expect(at100.textContent).toContain('8.3')
    const at200 = rows[4]
    expect(at200.textContent).toContain('1920 × 1080')
  })

  it('shows only the comfortable rows when showAll is false', () => {
    const [baseline, candidate] = windowsEntries()
    render(<ScalingMatrix entries={[baseline, candidate]} showAll={false} />)

    const [baselineTable, candidateTable] = screen.getAllByRole('table')
    expect(rowLabels(baselineTable)).toEqual([`100${NBSP}%`])
    expect(rowLabels(candidateTable)).toEqual([`175${NBSP}%`])
  })

  it('replaces the table with a message when no scale is comfortable', () => {
    const impossible = {
      mode: 'ppi',
      minPpi: 1,
      maxPpi: 2,
      minPpd: 1,
      maxPpd: 2,
      minWidth: 1,
    }
    const entries = buildComparison({
      baseline: { id: '42-3840x2160', distance: SIXTY_CM, scale: 1 },
      comfort: impossible,
    })
    render(<ScalingMatrix entries={entries} showAll={false} />)

    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('No comfortable scale')).toBeTruthy()
  })

  it('labels macOS rows with the looks-like width and the logical height', () => {
    const entries = buildComparison({
      baseline: { id: '14-2-3024x1964', distance: SIXTY_CM, scale: 2 },
      presetId: 'macos',
    })
    render(<ScalingMatrix entries={entries} />)
    const table = screen.getByRole('table')

    expect(within(table).getByText('looks like 1512 × 982')).toBeTruthy()
    expect(table.textContent).toContain('looks like 1920 × 1247')
    expect(within(table).getByText('In use').closest('tr').textContent).toContain('200')
    expect(table.textContent).toContain('1510 × 980')
  })

  it('shows no comfortable macOS scale for a 254 PPI laptop and says so', () => {
    const entries = buildComparison({
      baseline: { id: '14-2-3024x1964', distance: SIXTY_CM, scale: 2 },
      presetId: 'macos',
    })
    render(<ScalingMatrix entries={entries} showAll={false} />)
    expect(screen.getByText('No comfortable scale')).toBeTruthy()
  })

  it('uses Czech text and the decimal comma', () => {
    locale.value = 'cs'
    const [, candidate] = windowsEntries()
    render(<ScalingMatrix entries={[candidate]} />)
    const table = screen.getByRole('table')

    expect(
      within(table).getAllByText('Pohodlné', { exact: false }).length,
    ).toBeGreaterThan(0)
    expect(within(table).getByText('Používané')).toBeTruthy()
    expect(within(table).getByText('Doporučené')).toBeTruthy()
    expect(table.textContent).toContain('3,7')
  })

  it('gives each column header a help popover', () => {
    const [baseline] = windowsEntries()
    render(<ScalingMatrix entries={[baseline]} />)

    expect(screen.getByRole('button', { name: 'Help: Effective PPI' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Help: Logical resolution' })).toBeTruthy()
  })
})
