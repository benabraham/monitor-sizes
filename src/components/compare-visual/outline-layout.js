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
 * Labels sit inside each outline, in its top-left inner corner: `LABEL_INSET` from the
 * left edge and from the top edge. Outlines share their bottom centre, so the nested
 * ones have distinct top-left corners. Where two labels would overlap (outlines of
 * nearly the same size, for example 13.3″, 14″ and 15.6″ laptops), the later label is
 * moved down by one line, so labels never overlap. Labels stay inside the viewBox.
 * The drawing is scaled to the largest size for which everything fits.
 *
 * All coordinates are in viewBox units. The caller passes the viewBox size, so with
 * 1 unit = 1 CSS pixel the labels keep their font size.
 *
 * @module components/compare-visual/outline-layout
 */

import { CM_PER_INCH } from '../../lib/units.js'

/** Gap between an outline's left or top edge and its label text. */
export const LABEL_INSET = 6

/** Height of one label line. A label that would clash is moved down by this much. */
export const LABEL_LINE = 18

/** Estimated advance of one label character, used to size a label for collision checks. */
export const LABEL_CHAR_WIDTH = 7.5

/** Distance from a label's baseline to the top of its capitals. */
const LABEL_ASCENT = 13

/** Distance from a label's baseline to the bottom of its descenders. */
const LABEL_DESCENT = 4

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
 * @property {number} labelX    Left edge of the label text, inside the top-left corner.
 * @property {number} labelY    Baseline of the label text.
 * @property {number} labelWidth Estimated width of the label text.
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
 * The text drawn in an outline's label. An entry may carry its own `label`; otherwise the
 * display name is used.
 *
 * @param {{ label?: unknown, display: { id: string, name?: string } }} entry
 * @returns {string}
 */
const labelTextOf = (entry) =>
  typeof entry.label === 'string'
    ? entry.label
    : String(entry.display.name ?? entry.display.id)

/**
 * Whether two label boxes would overlap: their horizontal extents meet, and their
 * baselines are closer than one label line.
 *
 * @param {{ left: number, right: number, baseline: number }} first
 * @param {{ left: number, right: number, baseline: number }} second
 * @returns {boolean}
 */
const isClashing = (first, second) =>
  first.left < second.right &&
  second.left < first.right &&
  Math.abs(first.baseline - second.baseline) < LABEL_LINE

/**
 * Place the labels in the top-left inner corner of their outlines, so that no two of
 * them overlap. Labels are placed from the highest outline top downwards. A label that
 * would clash with one already placed moves down to one line below it, and this repeats
 * until the label is clear. A label never leaves the horizontal range `minX`…`maxX`.
 *
 * @param {object} params
 * @param {Array<{ index: number, x: number, y: number, labelWidth: number }>} params.outlines
 *   Outline boxes: `x` and `y` are the top-left corner, `index` the input order.
 * @param {number} params.minX Smallest left edge a label may take (the padding).
 * @param {number} params.maxX Largest right edge a label may reach (viewBox width minus padding).
 * @returns {Map<number, { labelX: number, labelY: number }>} Label position by outline
 *   index. `labelY` is the baseline.
 *
 * @example
 * placeLabels({
 *   outlines: [{ index: 0, x: 100, y: 50, labelWidth: 60 }],
 *   minX: 16,
 *   maxX: 624,
 * }).get(0) // { labelX: 106, labelY: 69 }
 */
export const placeLabels = ({ outlines, minX, maxX }) => {
  const highestFirst = [...outlines].sort((a, b) => a.y - b.y || a.index - b.index)
  const placed = []
  const positions = new Map()
  highestFirst.forEach(({ index, x, y, labelWidth }) => {
    const latestLeft = Math.max(minX, maxX - labelWidth)
    const left = Math.min(Math.max(x + LABEL_INSET, minX), latestLeft)
    let box = {
      index,
      left,
      right: left + labelWidth,
      baseline: y + LABEL_INSET + LABEL_ASCENT,
    }
    let clash = placed.find((other) => isClashing(other, box))
    while (clash) {
      box = { ...box, baseline: clash.baseline + LABEL_LINE }
      clash = placed.find((other) => isClashing(other, box))
    }
    placed.push(box)
    positions.set(index, { labelX: left, labelY: box.baseline })
  })
  return positions
}

/**
 * Place every outline at one scale factor, with its label.
 *
 * @param {object} params
 * @param {Array<{ index: number, id: string, isBaseline: boolean, isFamiliar: boolean,
 *   width: number, height: number, labelWidth: number }>} params.items Drawable items.
 * @param {number} params.scale Viewbox units per unit of size.
 * @param {number} params.centreX Horizontal centre of the viewBox.
 * @param {number} params.deskY Desk line, the bottom edge of every outline.
 * @param {number} params.viewWidth ViewBox width.
 * @param {number} params.padding
 * @returns {OutlineLayoutItem[]}
 */
const placeAtScale = ({ items, scale, centreX, deskY, viewWidth, padding }) => {
  const boxes = items.map((item) => {
    const width = item.width * scale
    const height = item.height * scale
    return { ...item, x: centreX - width / 2, y: deskY - height, width, height }
  })
  const labels = placeLabels({
    outlines: boxes,
    minX: padding,
    maxX: viewWidth - padding,
  })
  return boxes.map((box) => ({ ...box, ...labels.get(box.index) }))
}

/**
 * Whether a placement stays inside the viewBox: every outline within the side padding,
 * and every label's text between the top and the bottom padding.
 *
 * @param {object} params
 * @param {OutlineLayoutItem[]} params.outlines
 * @param {number} params.viewWidth ViewBox width.
 * @param {number} params.viewHeight ViewBox height.
 * @param {number} params.padding
 * @returns {boolean}
 */
const isInside = ({ outlines, viewWidth, viewHeight, padding }) => {
  const sidesFit = outlines.every(
    (outline) =>
      outline.x >= padding - EPSILON &&
      outline.x + outline.width <= viewWidth - padding + EPSILON,
  )
  const labelsFit = outlines.every(
    (outline) =>
      outline.labelY - LABEL_ASCENT >= padding - EPSILON &&
      outline.labelY + LABEL_DESCENT <= viewHeight - padding + EPSILON,
  )
  return sidesFit && labelsFit
}

/**
 * Lay out the outlines of the compared displays in a viewBox.
 *
 * The largest scale that fits is found by bisection, because the label placement makes
 * the fit depend on the scale in a piecewise way. Every outline is centred horizontally
 * and its bottom edge sits on the desk line. Entries without usable numbers are left
 * out. An unknown `mode` draws physical outlines.
 *
 * @param {object} params
 * @param {Array<{ display: { id: string, name?: string }, metrics?: object, angular?: object,
 *   isBaseline?: boolean, isFamiliar?: boolean, label?: string }>} params.entries
 *   CompareEntry-like objects. Physical mode reads `metrics.widthIn/heightIn`, seen mode
 *   reads `angular.horizontalFov/verticalFov`. `label` is the text drawn in the outline;
 *   without it the display name is used, and it sets the label's width.
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
        labelWidth: labelTextOf(entry).length * LABEL_CHAR_WIDTH,
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

  const place = (scale) =>
    placeAtScale({ items, scale, centreX, deskY, viewWidth: width, padding })
  let low = 0
  let high = Math.max(0, upper)
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2
    const isFitting = isInside({
      outlines: place(middle),
      viewWidth: width,
      viewHeight: height,
      padding,
    })
    if (isFitting) low = middle
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
