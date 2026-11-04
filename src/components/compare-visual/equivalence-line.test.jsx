import { render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { locale } from '../../i18n/index.js'
import { threeDisplayEntries, workedExampleEntries } from './compare-visual.fixtures.js'
import { EquivalenceLine } from './equivalence-line.jsx'

/** Replace no-break spaces, so text matches read like ordinary text. */
const clean = (text) => text.replace(/ /g, ' ')

afterEach(() => {
  locale.value = 'en'
})

describe('EquivalenceLine', () => {
  it('reads the PRD worked example in English', () => {
    const [baseline, candidate] = workedExampleEntries()
    const { container } = render(
      <EquivalenceLine entry={candidate} baseline={baseline} units="metric" />,
    )
    expect(clean(container.textContent)).toBe(
      'Looks like your 24″ FHD at 80 cm · as sharp at 40 cm · same text size at 60 cm (150 %)',
    )
  })

  it('reads the PRD worked example in Czech', () => {
    locale.value = 'cs'
    const [baseline, candidate] = workedExampleEntries()
    const { container } = render(
      <EquivalenceLine entry={candidate} baseline={baseline} units="metric" />,
    )
    expect(clean(container.textContent)).toBe(
      'Vypadá jako váš 24″ FHD na 80 cm · stejně ostrý na 40 cm · stejně velký text na 60 cm (150 %)',
    )
  })

  it('shows the distances in inches with one decimal in imperial units', () => {
    const [baseline, candidate] = workedExampleEntries()
    const { container } = render(
      <EquivalenceLine entry={candidate} baseline={baseline} units="imperial" />,
    )
    expect(clean(container.textContent)).toBe(
      'Looks like your 24″ FHD at 31.5 in · as sharp at 15.7 in · same text size at 23.6 in (150 %)',
    )
  })

  it('is a paragraph with its own class', () => {
    const [baseline, candidate] = workedExampleEntries()
    render(<EquivalenceLine entry={candidate} baseline={baseline} />)
    expect(screen.getByText(/Looks like your/).tagName).toBe('P')
  })

  it('renders nothing for the baseline itself', () => {
    const [baseline] = workedExampleEntries()
    const { container } = render(<EquivalenceLine entry={baseline} baseline={baseline} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when there is no equivalent distance', () => {
    const [baseline, candidate] = workedExampleEntries()
    const { container } = render(
      <EquivalenceLine entry={{ ...candidate, equivalent: null }} baseline={baseline} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing without a baseline', () => {
    const [, candidate] = workedExampleEntries()
    const { container } = render(<EquivalenceLine entry={candidate} baseline={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('names the display of a different baseline', () => {
    const [, candidate, other] = threeDisplayEntries()
    const { container } = render(
      <EquivalenceLine entry={candidate} baseline={{ ...other, isBaseline: true }} />,
    )
    expect(clean(container.textContent)).toMatch(/^Looks like your 14″ Full HD at /)
  })
})
