import { describe, expect, it } from 'vitest'
import { getAngularMetrics, getDisplayMetrics } from '../../lib/calc/index.js'
import { getOutlineLayout, LABEL_LINE } from './outline-layout.js'

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

  it('fits the largest outline inside the padding, horizontally and vertically', () => {
    layout.outlines.forEach((outline) => {
      expect(outline.x).toBeGreaterThanOrEqual(VIEW.padding - 1e-6)
      expect(outline.x + outline.width).toBeLessThanOrEqual(
        VIEW.width - VIEW.padding + 1e-6,
      )
      expect(outline.labelY).toBeGreaterThanOrEqual(VIEW.padding)
    })
    const widest = Math.max(...layout.outlines.map((outline) => outline.width))
    const topLabel = Math.min(...layout.outlines.map((outline) => outline.labelY))
    const touchesWidth = widest >= VIEW.width - 2 * VIEW.padding - 1e-3
    const touchesHeight = topLabel - 13 <= VIEW.padding + 1e-3
    expect(touchesWidth || touchesHeight).toBe(true)
  })

  it('places each label above its own outline', () => {
    layout.outlines.forEach((outline) => {
      expect(outline.labelY).toBeLessThan(outline.y)
      expect(outline.labelX).toBeCloseTo(VIEW.width / 2, 9)
    })
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

describe('getOutlineLayout: labels', () => {
  it('stacks labels so no two are closer than one label line', () => {
    const entries = [
      entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
      entryFor({ display: UHD_27, distanceCm: 60 }),
      entryFor({ display: UHD_32, distanceCm: 60 }),
      entryFor({ display: { ...FHD_24, id: 'twin' }, distanceCm: 60 }),
    ]
    const layout = getOutlineLayout({ entries, mode: 'physical', ...VIEW })
    const ys = layout.outlines.map((outline) => outline.labelY).sort((a, b) => a - b)
    for (let index = 1; index < ys.length; index += 1) {
      expect(ys[index] - ys[index - 1]).toBeGreaterThanOrEqual(LABEL_LINE - 1e-6)
    }
  })

  it('keeps labels where they do not collide even when outlines have equal tops', () => {
    const entries = [
      entryFor({ display: FHD_24, distanceCm: 60, isBaseline: true }),
      entryFor({ display: { ...FHD_24, id: 'twin' }, distanceCm: 60 }),
    ]
    const layout = getOutlineLayout({ entries, mode: 'physical', ...VIEW })
    const [first, second] = layout.outlines
    expect(first.labelY).not.toBeCloseTo(second.labelY, 3)
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
