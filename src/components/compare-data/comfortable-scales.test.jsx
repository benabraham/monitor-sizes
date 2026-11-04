import { render, screen, within } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { locale } from '../../i18n/index.js'
import { buildComparison, SIXTY_CM } from './compare-data.fixtures.js'
import { ComfortableScales } from './comfortable-scales.jsx'

const NBSP = ' '

/**
 * A 42″ 4K baseline on Linux steps (100 % and 110 % are comfortable, PPI 105 and 95).
 * The recommended scale is 110 %, the one closest to the middle of the window.
 *
 * @returns {object} CompareEntry, which has the `matrix` and `bestScale` of a BrowseRow.
 */
const linuxRow = () =>
  buildComparison({
    baseline: { id: '42-3840x2160', distance: SIXTY_CM, scale: 1 },
    presetId: 'linux',
  })[0]

/**
 * Text of each chip, in the order rendered.
 *
 * @param {HTMLElement} list
 * @returns {string[]}
 */
const chipTexts = (list) =>
  within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent)

afterEach(() => {
  locale.value = 'en'
})

describe('ComfortableScales', () => {
  it('lists the comfortable scales as chips, best first', () => {
    render(<ComfortableScales row={linuxRow()} />)
    const list = screen.getByRole('list', { name: 'Comfortable scales' })

    expect(chipTexts(list)).toEqual([
      `110${NBSP}%` + ' → 3490 × 1960' + 'Recommended',
      `100${NBSP}%` + ' → 3840 × 2160',
    ])
  })

  it('marks the recommended chip with text, not only accent colour', () => {
    render(<ComfortableScales row={linuxRow()} />)
    const list = screen.getByRole('list', { name: 'Comfortable scales' })
    const [best, other] = within(list).getAllByRole('listitem')

    expect(within(best).getByText('Recommended')).toBeTruthy()
    expect(within(other).queryByText('Recommended')).toBeNull()
  })

  it('shows at most max chips and a count of the rest', () => {
    render(<ComfortableScales row={linuxRow()} max={1} />)
    const list = screen.getByRole('list', { name: 'Comfortable scales' })

    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).getByText('+1 more')).toBeTruthy()
    expect(chipTexts(list)[0]).toContain('110')
  })

  it('shows "No comfortable scale" when no scale is inside the window', () => {
    const impossible = {
      mode: 'ppi',
      minPpi: 1,
      maxPpi: 2,
      minPpd: 1,
      maxPpd: 2,
      minWidth: 1,
    }
    const row = buildComparison({
      baseline: { id: '42-3840x2160', distance: SIXTY_CM, scale: 1 },
      comfort: impossible,
    })[0]
    render(<ComfortableScales row={row} />)

    expect(screen.getByText('No comfortable scale')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('shows "No comfortable scale" when there is no row at all', () => {
    render(<ComfortableScales row={null} />)
    expect(screen.getByText('No comfortable scale')).toBeTruthy()
  })

  it('falls back to ascending scale order when no recommended scale is set', () => {
    const row = { ...linuxRow(), bestScale: null }
    render(<ComfortableScales row={row} />)
    const list = screen.getByRole('list', { name: 'Comfortable scales' })

    expect(chipTexts(list)).toEqual([
      `100${NBSP}%` + ' → 3840 × 2160',
      `110${NBSP}%` + ' → 3490 × 1960',
    ])
  })

  it('uses Czech labels and the decimal comma', () => {
    locale.value = 'cs'
    render(<ComfortableScales row={linuxRow()} />)
    const list = screen.getByRole('list', { name: 'Pohodlná měřítka' })

    expect(within(list).getByText('Doporučené')).toBeTruthy()
    expect(list.textContent).toContain(`110${NBSP}%`)
  })
})
