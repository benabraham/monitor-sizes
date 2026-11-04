/**
 * Pure geometry for the Compare visualization (PRD: F11, F12; UX "Compare";
 * Calculation spec "Angular metrics").
 *
 * Two drawing modes share one layout rule: every outline is sized on ONE common
 * scale and all outlines stand on the same desk line, centred horizontally.
 *
 * - `physical`: an outline is `widthIn × heightIn` inches, scaled by one factor.
 * - `seen`: an outline is its angular size, `horizontalFov × verticalFov` degrees,
 *   measured from its own viewing distance. Equal angles draw equal outlines, so a
 *   bigger screen further back can look identical (PRD).
 *
 * Labels sit just above each outline's top edge. When two labels would overlap
 * (outlines that share the bottom centre tend to have close tops), they are stacked
 * upwards, one label line apart. The drawing is scaled to the largest size that
 * still fits the viewBox with its labels.
 *
 * All coordinates are in viewBox units. The caller passes the viewBox size, so with
 * 1 unit = 1 CSS pixel the labels keep a readable font size.
 *
 * @module components/compare-visual/outline-layout
 */

import { CM_PER_INCH } from '../../lib/units.js'

/** Vertical gap between an outline's top edge and its label's baseline. */
export const LABEL_GAP = 6

/** Height of one stacked label line. */
export const LABEL_LINE = 16

/** Approximate cap height of label text, used to keep the top label inside the viewBox. */
const LABEL_ASCENT = 13

/** Space reserved under the desk line for the scale bar and its label. */
const SCALE_BAND = 30

/** Gap between the desk line and the scale bar. */
const SCALE_BAR_GAP = 14

/** Scale bar length in physical mode: 10 cm (metric) or 4 in (imperial). */
const SCALE_BAR_INCHES = { metric: 10 / CM_PER_INCH, imperial: 4 }

/** Scale bar length in As seen mode, in degrees. */
const SCALE_BAR_DEGREES = 10

/** Enough halvings for the bisection to reach sub-pixel precision. */
const BISECTION_STEPS = 60

/** Tolerance for comparing floating point edges against the viewBox. */
const EPSILON = 1e-6

/**
 * @typedef {object} OutlineLayoutItem
 * @property {string} id        Display id.
 * @property {number} index     Position of the entry in the input list. Drives the colour.
 * @property {boolean} isBaseline
 * @property {boolean} isFamiliar
 * @property {number} x         Left edge of the outline.
 * @property {number} y         Top edge of the outline.
 * @property {number} width     Outline width in viewBox units.
 * @property {number} height    Outline height in viewBox units.
 * @property {number} labelX    Centre of the label (the outline's centre).
 * @property {number} labelY    Baseline of the label text.
 */

/**
 * @typedef {object} OutlineLayout
 * @property {number} scale                 Viewbox units per inch (physical) or per degree (seen).
 * @property {{ x1: number, x2: number, y: number }} desk   The desk line all outlines stand on.
 * @property {OutlineLayoutItem[]} outlines In input order.
 * @property {{ x: number, y: number, length: number, kind: 'length', inches: number }
 *   | { x: number, y: number, length: number, kind: 'angle', degrees: number } | null} scaleBar
 *   Reference bar under the desk line, `null` when nothing is drawn.
 */

/**
 * Empty layout, returned when there is nothing to draw.
 *
 * @param {object} params
 * @param {number} params.width
 * @param {number} params.height
 * @param {number} params.padding
 * @returns {OutlineLayout}
 */
const emptyLayout = ({ width, height, padding }) => ({
  scale: 0,
  desk: {
    x1: padding,
    x2: Math.max(padding, width - padding),
    y: height - padding - SCALE_BAND,
  },
  outlines: [],
  scaleBar: null,
})

/**
 * A size is drawable when it is a finite, positive number.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isDrawable = (value) => Number.isFinite(value) && value > 0

/**
 * Width and height of an entry in the mode's own unit: inches for physical,
 * degrees for seen. Entries without the needed numbers come back unusable.
 *
 * @param {object} params
 * @param {object} params.entry A CompareEntry (`metrics`, `angular`).
 * @param {'physical'|'seen'} params.mode
 * @returns {{ width: number|undefined, height: number|undefined }}
 */
const sizeOf = ({ entry, mode }) => {
  if (mode === 'seen') {
    return { width: entry.angular?.horizontalFov, height: entry.angular?.verticalFov }
  }
  return { width: entry.metrics?.widthIn, height: entry.metrics?.heightIn }
}

/**
 * Stack the labels of the outlines so none overlaps another. Labels are placed as
 * close above their outline as possible. Working from the lowest label upwards,
 * each label is moved up until it is one line above the label below it.
 *
 * @param {Array<{ index: number, y: number }>} outlines Outlines with their top edge `y`.
 * @returns {Map<number, number>} Label baseline by outline index.
 */
const stackLabels = (outlines) => {
  const lowestFirst = [...outlines].sort((a, b) => b.y - a.y || a.index - b.index)
  const labelYByIndex = new Map()
  let previous = Infinity
  lowestFirst.forEach((outline) => {
    const y = Math.min(outline.y - LABEL_GAP, previous - LABEL_LINE)
    labelYByIndex.set(outline.index, y)
    previous = y
  })
  return labelYByIndex
}

/**
 * Lay out every outline at one scale factor, with labels.
 *
 * @param {object} params
 * @param {Array<{ index: number, id: string, isBaseline: boolean, isFamiliar: boolean,
 *   width: number, height: number }>} params.items Drawable items.
 * @param {number} params.scale Viewbox units per unit of size.
 * @param {number} params.centreX Horizontal centre of the viewBox.
 * @param {number} params.deskY Desk line, the bottom edge of every outline.
 * @returns {OutlineLayoutItem[]}
 */
const placeAtScale = ({ items, scale, centreX, deskY }) => {
  const boxes = items.map((item) => {
    const width = item.width * scale
    const height = item.height * scale
    return { ...item, x: centreX - width / 2, y: deskY - height, width, height }
  })
  const labelYByIndex = stackLabels(boxes)
  return boxes.map((box) => ({
    ...box,
    labelX: centreX,
    labelY: labelYByIndex.get(box.index),
  }))
}

/**
 * Whether a placement stays inside the viewBox: every outline within the side
 * padding, and the top label's text below the top padding.
 *
 * @param {object} params
 * @param {OutlineLayoutItem[]} params.outlines
 * @param {number} params.width ViewBox width.
 * @param {number} params.padding
 * @returns {boolean}
 */
const isInside = ({ outlines, width, padding }) => {
  const sidesFit = outlines.every(
    (outline) =>
      outline.x >= padding - EPSILON &&
      outline.x + outline.width <= width - padding + EPSILON,
  )
  const topLabel = Math.min(...outlines.map((outline) => outline.labelY))
  return sidesFit && topLabel - LABEL_ASCENT >= padding - EPSILON
}

/**
 * Lay out the outlines of the compared displays in a viewBox.
 *
 * The largest scale that fits is found by bisection, because the label stacking
 * makes the fit depend on the scale in a piecewise way. Every outline is centred
 * horizontally and its bottom edge sits on the desk line. Entries without usable
 * numbers are left out. An unknown `mode` draws physical outlines.
 *
 * @param {object} params
 * @param {Array<{ display: { id: string }, metrics?: object, angular?: object,
 *   isBaseline?: boolean, isFamiliar?: boolean }>} params.entries CompareEntry-like
 *   objects. Physical mode reads `metrics.widthIn/heightIn`, seen mode reads
 *   `angular.horizontalFov/verticalFov`.
 * @param {'physical'|'seen'} [params.mode='physical']
 * @param {number} params.width ViewBox width in units (CSS pixels when 1:1).
 * @param {number} params.height ViewBox height in units.
 * @param {number} [params.padding=16] Padding on every side, in units.
 * @param {'metric'|'imperial'} [params.units='metric'] Sets the physical scale bar
 *   length: 10 cm or 4 in.
 * @returns {OutlineLayout}
 *
 * @example
 * const { outlines, scale, desk } = getOutlineLayout({
 *   entries, mode: 'physical', width: 640, height: 360,
 * })
 * // outlines[0].width / outlines[1].width === 32 / 24 for 32″ and 24″ 16:9 panels
 */
export const getOutlineLayout = ({
  entries = [],
  mode = 'physical',
  width,
  height,
  padding = 16,
  units = 'metric',
}) => {
  const isSeen = mode === 'seen'
  const isViewBoxUsable = isDrawable(width) && isDrawable(height)
  if (!isViewBoxUsable) return emptyLayout({ width: 0, height: 0, padding })

  const items = entries.flatMap((entry, index) => {
    if (!entry?.display?.id) return []
    const size = sizeOf({ entry, mode: isSeen ? 'seen' : 'physical' })
    if (!isDrawable(size.width) || !isDrawable(size.height)) return []
    return [
      {
        index,
        id: entry.display.id,
        isBaseline: entry.isBaseline === true,
        isFamiliar: entry.isFamiliar === true,
        width: size.width,
        height: size.height,
      },
    ]
  })
  if (items.length === 0) return emptyLayout({ width, height, padding })

  const centreX = width / 2
  const deskY = height - padding - SCALE_BAND
  const largestWidth = Math.max(...items.map((item) => item.width))
  const largestHeight = Math.max(...items.map((item) => item.height))
  const upper = Math.min(
    (width - 2 * padding) / largestWidth,
    (deskY - padding) / largestHeight,
  )

  const place = (scale) => placeAtScale({ items, scale, centreX, deskY })
  let low = 0
  let high = Math.max(0, upper)
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2
    if (isInside({ outlines: place(middle), width, padding })) low = middle
    else high = middle
  }
  const scale = low
  const outlines = place(scale).sort((a, b) => a.index - b.index)

  const scaleBarX = padding
  const scaleBarY = deskY + SCALE_BAR_GAP
  if (isSeen) {
    return {
      scale,
      desk: { x1: padding, x2: width - padding, y: deskY },
      outlines,
      scaleBar: {
        x: scaleBarX,
        y: scaleBarY,
        length: SCALE_BAR_DEGREES * scale,
        kind: 'angle',
        degrees: SCALE_BAR_DEGREES,
      },
    }
  }
  const inches =
    units === 'imperial' ? SCALE_BAR_INCHES.imperial : SCALE_BAR_INCHES.metric
  return {
    scale,
    desk: { x1: padding, x2: width - padding, y: deskY },
    outlines,
    scaleBar: {
      x: scaleBarX,
      y: scaleBarY,
      length: inches * scale,
      kind: 'length',
      inches,
    },
  }
}
