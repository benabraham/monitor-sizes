import { render, screen, within } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { locale } from '../../i18n/index.js'
import { buildComparison, SIXTY_CM } from './compare-data.fixtures.js'
import { CompareData } from './compare-data.jsx'
import * as index from './index.js'

/** 42″ 4K baseline and two candidates, Windows scale steps. */
const entries = () =>
  buildComparison({
    baseline: { id: '42-3840x2160', distance: SIXTY_CM, scale: 1 },
    candidates: [
      { id: '27-3840x2160', distance: SIXTY_CM, scale: 1.5 },
      { id: '24-1920x1200', distance: SIXTY_CM, scale: 1.25 },
    ],
  })

afterEach(() => {
  locale.value = 'en'
})

describe('CompareData', () => {
  it('shows the metrics and the scaling sections under their headings', () => {
    render(<CompareData entries={entries()} units="metric" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Metrics' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Scaling' })).toBeTruthy()
  })

  it('renders the metric grid once and a matrix table per display', () => {
    render(<CompareData entries={entries()} units="metric" />)

    const tables = screen.getAllByRole('table')
    expect(tables).toHaveLength(4)
    const metricTable = tables[0]
    expect(within(metricTable).getAllByRole('columnheader')).toHaveLength(4)
  })

  it('shows the Czech headings with the Czech locale', () => {
    locale.value = 'cs'
    render(<CompareData entries={entries()} units="metric" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Metriky' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Měřítko' })).toBeTruthy()
  })

  it('renders nothing but the headings when there are no entries', () => {
    render(<CompareData entries={[]} units="metric" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Metrics' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('exports the public components from the barrel', () => {
    expect(index.CompareData).toBe(CompareData)
    expect(typeof index.MetricGrid).toBe('function')
    expect(typeof index.ScalingMatrix).toBe('function')
    expect(typeof index.ComfortableScales).toBe('function')
  })
})
