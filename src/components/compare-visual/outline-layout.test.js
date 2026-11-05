import { describe, expect, it } from 'vitest'
import { getAngularMetrics, getDisplayMetrics } from '../../lib/calc/index.js'
import {
  getOutlineLayout,
  LABEL_CHAR_WIDTH,
  LABEL_INSET,
  LABEL_LINE,
  placeLabels,
} from './outline-layout.js'

const FHD_24 = { id: '24-fhd', name: 'FHD', diagonal: 24, width: 1920, height: 1080 }
const UHD_32 = { id: '32-4k', name: '4K UHD', diagonal: 32, width: 3840, height: 2160 }
const UHD_27 = { id: '27-4k', name: '4K UHD', diagonal: 27, width: 3840, height: 2160 }

const cm = (value) => value / 2.54

/**
 * CompareEntry-like object with the real calc results, for the layout tests.
 *
 * @param {object} params
 * @param {{ id: string, name: string, diagonal: number, width: number, height: number }} params.display
 * @param {number} params.distanceCm Viewing distance in centimetres.
 * @param {number} [params.scale=1]
 * @param {boolean} [params.isBaseline=false]
 * @param {boolean} [params.isFamiliar=false]
 */
const entryFor = ({
  display,
  distanceCm,
  scale = 1,
  isBaseline = false,
  isFamiliar = false,
}) => {
  const metrics = getDisplayMetrics(display)
  return {
    display,
    metrics,
    angular: getAngularMetrics({ metrics, distance: cm(distanceCm), scale }),
    isBaseline,
    isFamiliar,
  }
}

const byId = (layout, id) => layout.outlines.find((outline) => outline.id === id)

const VIEW = { width: 640, height: 360, padding: 16 }

describe('getOutlineLayout: physical mode', () => {
  const entries = [
    entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true, isFamiliar: true }),
    entryFor({ display: UHD_32, distanceCm: 80 }),
  ]
  const layout = getOutlineLayout({ entries, mode: 'physical', ...VIEW })

  it('sizes a 32″ 16:9 outline 32/24 times the 24″ one, in both directions', () => {
    const small = byId(layout, '24-fhd')
    const big = byId(layout, '32-4k')
    expect(big.width / small.width).toBeCloseTo(32 / 24, 9)
    expect(big.height / small.height).toBeCloseTo(32 / 24, 9)
  })

  it('draws every outline on one common length scale', () => {
    entries.forEach((entry, index) => {
      const outline = layout.outlines[index]
      expect(outline.width / entry.metrics.widthIn).toBeCloseTo(layout.scale, 9)
      expect(outline.height / entry.metrics.heightIn).toBeCloseTo(layout.scale, 9)
    })
  })

  it('aligns every outline bottom-centre on the desk line', () => {
    layout.outlines.forEach((outline) => {
      expect(outline.y + outline.height).toBeCloseTo(layout.desk.y, 9)
      expect(outline.x + outline.width / 2).toBeCloseTo(VIEW.width / 2, 9)
    })
  })

  it('keeps the input order and carries the baseline and familiar flags', () => {
    expect(layout.outlines.map((outline) => outline.id)).toEqual(['24-fhd', '32-4k'])
    expect(byId(layout, '24-fhd')).toMatchObject({ isBaseline: true, isFamiliar: true })
    expect(byId(layout, '32-4k')).toMatchObject({ isBaseline: false, isFamiliar: false })
  })

  it('fits the largest outline inside the padding, horizontally or vertically', () => {
    layout.outlines.forEach((outline) => {
      expect(outline.x).toBeGreaterThanOrEqual(VIEW.padding - 1e-6)
      expect(outline.x + outline.width).toBeLessThanOrEqual(
        VIEW.width - VIEW.padding + 1e-6,
      )
      expect(outline.y).toBeGreaterThanOrEqual(VIEW.padding - 1e-6)
    })
    const widest = Math.max(...layout.outlines.map((outline) => outline.width))
    const highest = Math.min(...layout.outlines.map((outline) => outline.y))
    const touchesWidth = widest >= VIEW.width - 2 * VIEW.padding - 1e-3
    const touchesHeight = highest <= VIEW.padding + 1e-3
    expect(touchesWidth || touchesHeight).toBe(true)
  })

  it('places each label inside its own outline, in the top-left corner', () => {
    layout.outlines.forEach((outline) => {
      expect(outline.labelX).toBeGreaterThanOrEqual(outline.x)
      expect(outline.labelX).toBeLessThan(outline.x + outline.width)
      expect(outline.labelY).toBeGreaterThan(outline.y)
    })
  })

  it('puts a lone label LABEL_INSET from the left and top edges of its outline', () => {
    const [only] = getOutlineLayout({
      entries: [entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true })],
      mode: 'physical',
      ...VIEW,
    }).outlines
    expect(only.labelX).toBeCloseTo(only.x + LABEL_INSET, 9)
    expect(only.labelY).toBeCloseTo(only.y + LABEL_INSET + 13, 9)
  })

  it('draws a desk line from padding to padding on the right', () => {
    expect(layout.desk.x1).toBe(VIEW.padding)
    expect(layout.desk.x2).toBe(VIEW.width - VIEW.padding)
  })

  it('draws a 10 cm scale bar in metric units, at the scale of the outlines', () => {
    expect(layout.scaleBar).toMatchObject({ kind: 'length', inches: 10 / 2.54 })
    expect(layout.scaleBar.length).toBeCloseTo((10 / 2.54) * layout.scale, 9)
    expect(layout.scaleBar.y).toBeGreaterThan(layout.desk.y)
  })

  it('draws a 4 in scale bar in imperial units', () => {
    const imperial = getOutlineLayout({
      entries,
      mode: 'physical',
      units: 'imperial',
      ...VIEW,
    })
    expect(imperial.scaleBar).toMatchObject({ kind: 'length', inches: 4 })
    expect(imperial.scaleBar.length).toBeCloseTo(4 * imperial.scale, 9)
  })

  it('is the same drawing when the viewBox is the same size', () => {
    const again = getOutlineLayout({ entries, mode: 'physical', ...VIEW })
    expect(again).toEqual(layout)
  })
})

describe('getOutlineLayout: As seen mode', () => {
  it('draws 32″ at 80 cm with the same height as 24″ at 60 cm', () => {
    const layout = getOutlineLayout({
      entries: [
        entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
        entryFor({ display: UHD_32, distanceCm: 80 }),
      ],
      mode: 'seen',
      ...VIEW,
    })
    const reference = byId(layout, '24-fhd')
    const candidate = byId(layout, '32-4k')
    expect(candidate.height).toBeCloseTo(reference.height, 6)
    expect(candidate.width).toBeCloseTo(reference.width, 6)
  })

  it('sizes outlines by their angular field of view on one degree scale', () => {
    const entries = [
      entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
      entryFor({ display: UHD_27, distanceCm: 40 }),
    ]
    const layout = getOutlineLayout({ entries, mode: 'seen', ...VIEW })
    entries.forEach((entry, index) => {
      const outline = layout.outlines[index]
      expect(outline.width / entry.angular.horizontalFov).toBeCloseTo(layout.scale, 9)
      expect(outline.height / entry.angular.verticalFov).toBeCloseTo(layout.scale, 9)
    })
  })

  it('draws a bigger angle as a bigger outline', () => {
    const layout = getOutlineLayout({
      entries: [
        entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
        entryFor({ display: UHD_32, distanceCm: 40 }),
      ],
      mode: 'seen',
      ...VIEW,
    })
    expect(byId(layout, '32-4k').width).toBeGreaterThan(byId(layout, '24-fhd').width)
  })

  it('keeps the bottom-centre alignment and the fit', () => {
    const layout = getOutlineLayout({
      entries: [
        entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
        entryFor({ display: UHD_32, distanceCm: 80 }),
        entryFor({ display: UHD_27, distanceCm: 70 }),
      ],
      mode: 'seen',
      ...VIEW,
    })
    layout.outlines.forEach((outline) => {
      expect(outline.y + outline.height).toBeCloseTo(layout.desk.y, 9)
      expect(outline.x + outline.width / 2).toBeCloseTo(VIEW.width / 2, 9)
      expect(outline.x).toBeGreaterThanOrEqual(VIEW.padding - 1e-6)
    })
  })

  it('draws a 10° scale bar', () => {
    const layout = getOutlineLayout({
      entries: [entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true })],
      mode: 'seen',
      ...VIEW,
    })
    expect(layout.scaleBar).toMatchObject({ kind: 'angle', degrees: 10 })
    expect(layout.scaleBar.length).toBeCloseTo(10 * layout.scale, 9)
  })
})

/** Laptops of nearly the same size: their top-left corners are close together. */
const LAPTOP_133 = { id: 'laptop-13', name: '13.3″', diagonal: 13.3, width: 2560, height: 1600 }
const LAPTOP_14 = { id: 'laptop-14', name: '14″', diagonal: 14, width: 1920, height: 1080 }
const LAPTOP_156 = { id: 'laptop-156', name: '15.6″', diagonal: 15.6, width: 1920, height: 1080 }

/**
 * Whether two labels overlap: their horizontal extents meet and their baselines are closer
 * than one label line.
 *
 * @param {object} first Outline from the layout.
 * @param {object} second Outline from the layout.
 * @returns {boolean}
 */
const labelsOverlap = (first, second) =>
  first.labelX < second.labelX + second.labelWidth &&
  second.labelX < first.labelX + first.labelWidth &&
  Math.abs(first.labelY - second.labelY) < LABEL_LINE - 1e-6

/**
 * Every pair of labels in a layout must be clear of each other.
 *
 * @param {object} layout
 * @returns {void}
 */
const expectNoLabelOverlap = (layout) => {
  layout.outlines.forEach((outline, index) => {
    layout.outlines.slice(index + 1).forEach((other) => {
      expect(labelsOverlap(outline, other), `${outline.id} and ${other.id}`).toBe(false)
    })
  })
}

describe('getOutlineLayout: labels', () => {
  it('never lets two labels overlap, even for the nearly same size laptops', () => {
    const entries = [
      entryFor({ display: LAPTOP_133, distanceCm: 60, isBaseline: true }),
      entryFor({ display: LAPTOP_14, distanceCm: 60 }),
      entryFor({ display: LAPTOP_156, distanceCm: 60 }),
    ]
    expectNoLabelOverlap(getOutlineLayout({ entries, mode: 'physical', ...VIEW }))
  })

  it('moves the later of two labels with the same corner down by exactly one line', () => {
    const entries = [
      entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
      entryFor({ display: { ...FHD_24, id: 'twin' }, distanceCm: 60 }),
    ]
    const [first, second] = getOutlineLayout({ entries, mode: 'physical', ...VIEW })
      .outlines
    expect(first.labelX).toBeCloseTo(second.labelX, 9)
    expect(second.labelY - first.labelY).toBeCloseTo(LABEL_LINE, 9)
  })

  it('stacks three labels with a shared corner one line apart each', () => {
    const entries = [
      entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
      entryFor({ display: { ...FHD_24, id: 'twin-a' }, distanceCm: 60 }),
      entryFor({ display: { ...FHD_24, id: 'twin-b' }, distanceCm: 60 }),
    ]
    const ys = getOutlineLayout({ entries, mode: 'physical', ...VIEW }).outlines.map(
      (outline) => outline.labelY,
    )
    expect(ys[1] - ys[0]).toBeCloseTo(LABEL_LINE, 9)
    expect(ys[2] - ys[1]).toBeCloseTo(LABEL_LINE, 9)
  })

  it('does not move a label that does not clash with another', () => {
    const entries = [
      entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
      entryFor({ display: UHD_32, distanceCm: 80 }),
    ]
    const layout = getOutlineLayout({ entries, mode: 'physical', ...VIEW })
    layout.outlines.forEach((outline) => {
      expect(outline.labelY).toBeCloseTo(outline.y + LABEL_INSET + 13, 9)
    })
  })

  it('keeps every label inside the viewBox', () => {
    const entries = [
      entryFor({ display: LAPTOP_133, distanceCm: 60, isBaseline: true }),
      entryFor({ display: LAPTOP_14, distanceCm: 60 }),
      entryFor({ display: LAPTOP_156, distanceCm: 60 }),
      entryFor({ display: UHD_32, distanceCm: 80 }),
    ]
    const layout = getOutlineLayout({ entries, mode: 'physical', ...VIEW })
    layout.outlines.forEach((outline) => {
      expect(outline.labelX).toBeGreaterThanOrEqual(VIEW.padding - 1e-6)
      expect(outline.labelX + outline.labelWidth).toBeLessThanOrEqual(
        VIEW.width - VIEW.padding + 1e-6,
      )
      expect(outline.labelY - 13).toBeGreaterThanOrEqual(VIEW.padding - 1e-6)
      expect(outline.labelY + 4).toBeLessThanOrEqual(VIEW.height - VIEW.padding + 1e-6)
    })
  })

  it('still draws and keeps the labels apart with six outlines of one size', () => {
    const entries = Array.from({ length: 6 }, (_, index) =>
      entryFor({
        display: { ...UHD_27, id: `same-${index}` },
        distanceCm: 60,
        isBaseline: index === 0,
      }),
    )
    const layout = getOutlineLayout({ entries, mode: 'physical', ...VIEW })
    expect(layout.scale).toBeGreaterThan(0)
    expectNoLabelOverlap(layout)
    layout.outlines.forEach((outline) => {
      expect(outline.labelY + 4).toBeLessThanOrEqual(VIEW.height - VIEW.padding + 1e-6)
    })
  })

  it('sizes a label from the entry label text when one is given', () => {
    const entries = [
      { ...entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }), label: 'ab' },
    ]
    const [only] = getOutlineLayout({ entries, mode: 'physical', ...VIEW }).outlines
    expect(only.labelWidth).toBeCloseTo(2 * LABEL_CHAR_WIDTH, 9)
  })
})

describe('placeLabels', () => {
  it('moves a label that clashes with a higher one down by one line', () => {
    const positions = placeLabels({
      outlines: [
        { index: 0, x: 100, y: 50, labelWidth: 80 },
        { index: 1, x: 110, y: 52, labelWidth: 80 },
      ],
      minX: 16,
      maxX: 624,
    })
    expect(positions.get(0)).toEqual({ labelX: 106, labelY: 50 + LABEL_INSET + 13 })
    expect(positions.get(1).labelY).toBeCloseTo(
      50 + LABEL_INSET + 13 + LABEL_LINE,
      9,
    )
  })

  it('ends, and keeps the labels apart, when the arithmetic leaves a line apart by a hair', () => {
    // Baselines 22.8 and 40.8: their difference is 17.999999999999996, a hair under one line.
    const positions = placeLabels({
      outlines: [
        { index: 0, x: 100, y: 3.8000000000000003, labelWidth: 60 },
        { index: 1, x: 100, y: 3.8000000000000003, labelWidth: 60 },
      ],
      minX: 0,
      maxX: 640,
    })
    const first = positions.get(0).labelY
    const second = positions.get(1).labelY
    expect(second - first).toBeCloseTo(LABEL_LINE, 9)
  })

  it('keeps a label where it is when the labels are side by side', () => {
    const positions = placeLabels({
      outlines: [
        { index: 0, x: 0, y: 50, labelWidth: 100 },
        { index: 1, x: 300, y: 50, labelWidth: 100 },
      ],
      minX: 0,
      maxX: 640,
    })
    expect(positions.get(0).labelY).toBe(positions.get(1).labelY)
  })

  it('moves a label that is too far right back inside the right edge', () => {
    const positions = placeLabels({
      outlines: [{ index: 0, x: 600, y: 50, labelWidth: 100 }],
      minX: 16,
      maxX: 624,
    })
    expect(positions.get(0).labelX).toBe(524)
  })

  it('reports each label under its outline index', () => {
    const positions = placeLabels({
      outlines: [
        { index: 4, x: 200, y: 90, labelWidth: 10 },
        { index: 2, x: 10, y: 20, labelWidth: 10 },
      ],
      minX: 0,
      maxX: 640,
    })
    expect([...positions.keys()]).toEqual([2, 4])
  })
})

describe('getOutlineLayout: scale and fitting', () => {
  const entries = [
    entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
    entryFor({ display: UHD_32, distanceCm: 80 }),
  ]

  it('grows the drawing with a larger viewBox', () => {
    const small = getOutlineLayout({ entries, mode: 'physical', width: 320, height: 240 })
    const large = getOutlineLayout({ entries, mode: 'physical', width: 800, height: 450 })
    expect(large.scale).toBeGreaterThan(small.scale)
  })

  it('uses the default padding of 16 units', () => {
    const layout = getOutlineLayout({
      entries,
      mode: 'physical',
      width: 640,
      height: 360,
    })
    expect(layout.desk.x1).toBe(16)
    expect(layout.desk.x2).toBe(624)
  })

  it('treats an unknown mode as physical', () => {
    const unknown = getOutlineLayout({ entries, mode: 'sideways', ...VIEW })
    const physical = getOutlineLayout({ entries, mode: 'physical', ...VIEW })
    expect(unknown).toEqual(physical)
  })

  it('leaves out entries without usable numbers and keeps the input index', () => {
    const broken = [
      { display: { id: 'no-metrics' }, isBaseline: false },
      { display: { id: 'zero' }, metrics: { widthIn: 0, heightIn: 5 } },
      { display: { id: 'nan' }, metrics: { widthIn: Number.NaN, heightIn: 5 } },
      { metrics: { widthIn: 10, heightIn: 5 } },
      entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
    ]
    const layout = getOutlineLayout({ entries: broken, mode: 'physical', ...VIEW })
    expect(layout.outlines.map((outline) => outline.id)).toEqual(['24-fhd'])
    expect(layout.outlines[0].index).toBe(4)
  })

  it('draws nothing for an empty list', () => {
    const layout = getOutlineLayout({ entries: [], mode: 'physical', ...VIEW })
    expect(layout).toMatchObject({ scale: 0, outlines: [], scaleBar: null })
    expect(layout.desk.y).toBeLessThan(VIEW.height)
  })

  it('draws nothing when the viewBox has no usable size', () => {
    const layout = getOutlineLayout({ entries, mode: 'physical', width: 0, height: 360 })
    expect(layout).toMatchObject({ scale: 0, outlines: [], scaleBar: null })
  })

  it('defaults to no entries', () => {
    expect(getOutlineLayout({ width: 300, height: 200 }).outlines).toEqual([])
  })
})
