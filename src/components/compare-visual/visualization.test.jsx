import { render, screen, within } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale } from '../../i18n/index.js'
import { threeDisplayEntries, workedExampleEntries } from './compare-visual.fixtures.js'
import { Visualization, VisualizationSizes } from './visualization.jsx'

/** Replace no-break spaces, so text matches read like ordinary text. */
const clean = (text) => text.replace(/ /g, ' ')

/** Outline rectangles of the drawing, in document order. */
const outlinesOf = (container) => [
  ...container.querySelectorAll('rect.visualization__outline'),
]

/** Label texts of the drawing, in document order. */
const labelsOf = (container) =>
  [...container.querySelectorAll('text.visualization__label')].map((node) =>
    clean(node.textContent),
  )

afterEach(() => {
  locale.value = 'en'
})

describe('Visualization', () => {
  it('is a labelled image, with a title and a description', () => {
    render(
      <Visualization entries={threeDisplayEntries()} mode="physical" units="metric" />,
    )
    expect(
      screen.getByRole('img', { name: /Physical size of the compared displays/ }),
    ).not.toBeNull()
  })

  it('draws one outline per entry, familiar dashed and candidates solid', () => {
    const { container } = render(
      <Visualization entries={threeDisplayEntries()} mode="physical" units="metric" />,
    )
    const rects = outlinesOf(container)
    expect(rects).toHaveLength(3)
    const familiar = rects.find((rect) => rect.getAttribute('stroke-dasharray'))
    const candidates = rects.filter((rect) => !rect.getAttribute('stroke-dasharray'))
    expect(familiar.getAttribute('stroke-dasharray')).toBe('6 4')
    expect(candidates).toHaveLength(2)
  })

  it('draws the baseline thicker and in the accent colour', () => {
    const { container } = render(
      <Visualization entries={threeDisplayEntries()} mode="physical" units="metric" />,
    )
    const baseline = container.querySelector('rect.visualization__outline--baseline')
    expect(baseline.getAttribute('stroke-width')).toBe('3')
    expect(baseline.getAttribute('style')).toContain('var(--visualization-baseline)')
    const candidate = outlinesOf(container).find(
      (rect) => !rect.classList.contains('visualization__outline--baseline'),
    )
    expect(candidate.getAttribute('stroke-width')).toBe('1.5')
  })

  it('labels every outline with its name and diagonal, and marks the baseline', () => {
    const { container } = render(
      <Visualization entries={threeDisplayEntries()} mode="physical" units="metric" />,
    )
    const labels = labelsOf(container)
    expect(labels).toHaveLength(3)
    expect(labels).toContain('24″ FHD · Baseline')
    expect(labels).toContain('32″ 4K UHD')
    expect(labels).toContain('14″ Full HD')
  })

  it('lists each display size as text for everyone, in physical units', () => {
    render(
      <VisualizationSizes
        entries={threeDisplayEntries()}
        mode="physical"
        units="metric"
      />,
    )
    const sizes = screen.getByRole('heading', { name: 'Sizes' }).closest('section')
    const list = within(sizes).getByRole('list')
    const items = within(list)
      .getAllByRole('listitem')
      .map((item) => clean(item.textContent))
    expect(items[0]).toBe('24″ FHD53 cm × 30 cm')
    expect(items[1]).toMatch(/^32″ 4K UHD\d+ cm × \d+ cm$/)
  })

  it('shows the scale bar in centimetres and in inches', () => {
    const { container, rerender } = render(
      <Visualization entries={threeDisplayEntries()} mode="physical" units="metric" />,
    )
    expect(clean(container.querySelector('.visualization__scale text').textContent)).toBe(
      '10 cm',
    )
    rerender(
      <Visualization entries={threeDisplayEntries()} mode="physical" units="imperial" />,
    )
    expect(clean(container.querySelector('.visualization__scale text').textContent)).toBe(
      '4 in',
    )
  })

  it('reports the As seen choice, and draws the scale bar in degrees once seen', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    const { container, rerender } = render(
      <Visualization
        entries={workedExampleEntries()}
        mode="physical"
        units="metric"
        onModeChange={onModeChange}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'As seen' }))
    expect(onModeChange).toHaveBeenCalledWith('seen')
    rerender(
      <Visualization
        entries={workedExampleEntries()}
        mode="seen"
        units="metric"
        onModeChange={onModeChange}
      />,
    )
    expect(container.querySelector('.visualization__scale text').textContent).toBe('10°')
  })

  it('reflects the mode and draws the seen sizes with their distances', () => {
    render(
      <>
        <Visualization entries={workedExampleEntries()} mode="seen" units="metric" />
        <VisualizationSizes entries={workedExampleEntries()} mode="seen" units="metric" />
      </>,
    )
    expect(
      screen.getByRole('img', { name: /Apparent size of the compared displays/ }),
    ).not.toBeNull()
    expect(screen.getByRole('radio', { name: 'As seen' }).checked).toBe(true)
    const baselineText = clean(
      screen.getByText('24″ FHD', { selector: '.visualization__size-name' })
        .nextElementSibling.textContent,
    )
    expect(baselineText).toMatch(/^\d+\.\d° × \d+\.\d°, from 60 cm$/)
  })

  it('leaves the size text out of the drawing, so it can scroll apart from it', () => {
    const { container } = render(
      <Visualization entries={threeDisplayEntries()} mode="physical" units="metric" />,
    )
    expect(container.querySelector('.visualization__sizes')).toBeNull()
  })

  it('renders no size list when there is nothing to list', () => {
    const { container } = render(<VisualizationSizes entries={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('names the size used for same-size distances in the As seen caption', () => {
    const { rerender } = render(
      <Visualization entries={workedExampleEntries()} mode="seen" sizeMatchBy="width" />,
    )
    expect(screen.getByText(/Same-size distances match by width\./)).not.toBeNull()
    rerender(<Visualization entries={workedExampleEntries()} mode="physical" />)
    expect(screen.getByText(/Physical: true relative size/)).not.toBeNull()
  })

  it('stays in the same position in its figure: a viewBox of the fallback size', () => {
    const { container } = render(
      <Visualization entries={threeDisplayEntries()} mode="physical" />,
    )
    expect(container.querySelector('svg').getAttribute('viewBox')).toBe('0 0 640 360')
  })

  it('tells the user to choose a display when there is nothing to draw', () => {
    render(<Visualization entries={[]} mode="physical" />)
    expect(screen.getByText('Choose at least one display to compare.')).not.toBeNull()
  })

  it('translates everything in Czech', () => {
    locale.value = 'cs'
    const { container } = render(
      <Visualization entries={workedExampleEntries()} mode="physical" units="metric" />,
    )
    expect(screen.getByRole('heading', { name: 'Vizualizace' })).not.toBeNull()
    expect(labelsOf(container)).toContain('24″ FHD · Referenční')
    expect(screen.getByRole('radio', { name: 'Jak je vidět' })).not.toBeNull()
    expect(clean(container.querySelector('.visualization__scale text').textContent)).toBe(
      '10 cm',
    )
  })
})

describe('Visualization: labels in the top-left inner corner', () => {
  it('draws each label inside its outline, starting at the left and top insets', () => {
    const { container } = render(
      <Visualization entries={threeDisplayEntries()} mode="physical" units="metric" />,
    )
    const outlines = outlinesOf(container)
    const labels = [...container.querySelectorAll('text.visualization__label')]
    expect(labels).toHaveLength(outlines.length)
    labels.forEach((label, index) => {
      const outline = outlines[index]
      const x = Number(label.getAttribute('x'))
      const y = Number(label.getAttribute('y'))
      const left = Number(outline.getAttribute('x'))
      const top = Number(outline.getAttribute('y'))
      expect(x).toBeGreaterThanOrEqual(left)
      expect(y).toBeGreaterThan(top)
      expect(label.hasAttribute('text-anchor')).toBe(false)
    })
  })

  it('keeps the label text inside the drawing', () => {
    const { container } = render(
      <Visualization entries={workedExampleEntries()} mode="physical" units="metric" />,
    )
    const svg = container.querySelector('svg')
    const [width, height] = svg.getAttribute('viewBox').split(' ').slice(2).map(Number)
    container.querySelectorAll('text.visualization__label').forEach((label) => {
      expect(Number(label.getAttribute('x'))).toBeGreaterThanOrEqual(0)
      expect(Number(label.getAttribute('x'))).toBeLessThan(width)
      expect(Number(label.getAttribute('y'))).toBeLessThanOrEqual(height)
    })
  })
})
