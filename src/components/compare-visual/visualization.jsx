import { useEffect, useRef, useState } from 'preact/hooks'
import { locale, t } from '../../i18n/index.js'
import { formatDegrees, formatLength, formatNumber } from '../../lib/format.js'
import { Segmented } from '../ui/index.js'
import { formatDisplayLabel, lengthDigits } from './format-helpers.js'
import { getOutlineLayout } from './outline-layout.js'
import './visualization.css'

/** Number of colours in the outline palette (`--visualization-palette-N`). */
const PALETTE_SIZE = 4

/** Outline padding inside the drawing, in CSS pixels (1 viewBox unit = 1 px). */
const PADDING = 16

/** Drawing size used before the drawing is measured (and in tests without layout). */
const FALLBACK_SIZE = { width: 640, height: 360 }

/** Border of the drawing, in CSS pixels (see visualization.css). It is outside the viewBox. */
const DRAWING_BORDER = 1

/** Counter for unique ids of the SVG title and description, one per mounted component. */
let visualizationSequence = 0

/**
 * Measure the drawing's rendered size, and follow it with a ResizeObserver. The drawing is
 * laid out at its own size, so one viewBox unit is one CSS pixel and the labels keep their
 * font size, even when the drawing is capped in height (see compare-visual.css). Without
 * layout (jsdom) or before the first measurement, the fallback size is used.
 *
 * @returns {{ ref: { current: SVGSVGElement | null }, width: number, height: number }}
 */
const useDrawingSize = () => {
  const ref = useRef(null)
  const [size, setSize] = useState(FALLBACK_SIZE)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const measure = () => {
      const box = element.getBoundingClientRect()
      const width = Math.round(box.width - 2 * DRAWING_BORDER)
      const height = Math.round(box.height - 2 * DRAWING_BORDER)
      if (width <= 0 || height <= 0) return
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      )
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, ...size }
}

/**
 * Text for the "same size" caption: which size the distances match by.
 *
 * @param {'height'|'width'|'diagonal'} sizeBy
 * @returns {string}
 */
const sizeByGenitive = (sizeBy) => {
  if (sizeBy === 'width') return t('compareVisual.sizeBy.of.width')
  if (sizeBy === 'diagonal') return t('compareVisual.sizeBy.of.diagonal')
  return t('compareVisual.sizeBy.of.height')
}

/**
 * Human-readable size of one entry, for the text equivalent list.
 *
 * @param {object} params
 * @param {object} params.entry CompareEntry.
 * @param {'metric'|'imperial'} params.units
 * @param {'en'|'cs'} params.currentLocale
 * @param {boolean} params.isSeen Whether As seen mode is active.
 * @returns {string}
 */
const sizeTextOf = ({ entry, units, currentLocale, isSeen }) => {
  const digits = lengthDigits(units)
  if (isSeen) {
    return t('compareVisual.visualization.sizeSeen', {
      horizontal: formatDegrees({
        value: entry.angular.horizontalFov,
        locale: currentLocale,
      }),
      vertical: formatDegrees({
        value: entry.angular.verticalFov,
        locale: currentLocale,
      }),
      distance: formatLength({
        inches: entry.distance,
        units,
        locale: currentLocale,
        digits,
      }),
    })
  }
  return t('compareVisual.visualization.sizePhysical', {
    width: formatLength({
      inches: entry.metrics.widthIn,
      units,
      locale: currentLocale,
      digits,
    }),
    height: formatLength({
      inches: entry.metrics.heightIn,
      units,
      locale: currentLocale,
      digits,
    }),
  })
}

/**
 * Label drawn inside an outline: the short name, plus a baseline mark.
 *
 * @param {object} params
 * @param {object} params.entry CompareEntry.
 * @param {'en'|'cs'} params.currentLocale
 * @returns {string}
 */
const outlineLabelOf = ({ entry, currentLocale }) => {
  const name = formatDisplayLabel({ display: entry.display, locale: currentLocale })
  if (!entry.isBaseline) return name
  return `${name} · ${t('compareVisual.badge.baseline')}`
}

/**
 * The always-visible drawing of the compared displays (PRD F11, F12).
 *
 * Outlines are drawn in an SVG, one `rect` per entry, on the layout from
 * {@link getOutlineLayout}. Familiar displays have dashed outlines, candidates solid
 * ones, and the baseline is thicker and in the accent colour. Every outline has a
 * text label in its top-left inner corner, and colour is never the only signal. A scale bar (10 cm, 4 in or 10°)
 * gives the size reference.
 *
 * The SVG is named by its title and description. The sizes are also listed as text
 * below the drawing, so the text equivalent is there for everyone.
 *
 * Physical mode draws true size on one length scale. As seen mode draws each
 * display at its angular size from its viewing distance. The mode switch is a
 * Segmented control above the drawing.
 *
 * @param {object} props
 * @param {object[]} props.entries CompareEntry objects, in the order to draw them.
 * @param {'physical'|'seen'} props.mode Drawing mode.
 * @param {'metric'|'imperial'} props.units Unit system for lengths and the scale bar.
 * @param {'height'|'width'|'diagonal'} props.sizeMatchBy Size used for same-size
 *   distances, named in the As seen caption.
 * @param {(mode: 'physical'|'seen') => void} [props.onModeChange] Called with the chosen mode.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <Visualization
 *   entries={compareEntries}
 *   mode={vizMode}
 *   units={units}
 *   sizeMatchBy={sizeMatchBy}
 *   onModeChange={setVizMode}
 * />
 */
export const Visualization = ({
  entries = [],
  mode = 'physical',
  units = 'metric',
  sizeMatchBy = 'height',
  onModeChange,
}) => {
  const [idPrefix] = useState(() => `visualization-${++visualizationSequence}`)
  const { ref, width, height } = useDrawingSize()
  const currentLocale = locale.value
  const isSeen = mode === 'seen'
  const labelled = entries.map((entry) => ({
    ...entry,
    label: outlineLabelOf({ entry, currentLocale }),
  }))
  const layout = getOutlineLayout({
    entries: labelled,
    mode: isSeen ? 'seen' : 'physical',
    width,
    height,
    padding: PADDING,
    units,
  })
  const titleId = `${idPrefix}-title`
  const descId = `${idPrefix}-desc`
  const headingId = `${idPrefix}-heading`
  const bar = layout.scaleBar
  const barText =
    bar?.kind === 'angle'
      ? `${formatNumber({ value: bar.degrees, locale: currentLocale })}°`
      : formatLength({ inches: bar?.inches ?? 0, units, locale: currentLocale })

  return (
    <section class="visualization" aria-labelledby={headingId}>
      <div class="visualization__header">
        <h2 class="visualization__title" id={headingId}>
          {t('compareVisual.visualization.title')}
        </h2>
        <Segmented
          name={`${idPrefix}-mode`}
          label={t('compareVisual.visualization.modeLabel')}
          options={[
            { value: 'physical', label: t('compareVisual.visualization.modePhysical') },
            { value: 'seen', label: t('compareVisual.visualization.modeSeen') },
          ]}
          value={isSeen ? 'seen' : 'physical'}
          onChange={onModeChange}
        />
      </div>

      <figure class="visualization__figure">
        <svg
          ref={ref}
          class="visualization__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
        >
          <title id={titleId}>
            {isSeen
              ? t('compareVisual.visualization.svgTitleSeen')
              : t('compareVisual.visualization.svgTitlePhysical')}
          </title>
          <desc id={descId}>
            {isSeen
              ? t('compareVisual.visualization.svgDescSeen', { count: entries.length })
              : t('compareVisual.visualization.svgDescPhysical', {
                  count: entries.length,
                })}
          </desc>

          <line
            class="visualization__desk"
            x1={layout.desk.x1}
            x2={layout.desk.x2}
            y1={layout.desk.y}
            y2={layout.desk.y}
          />

          {layout.outlines.map((outline) => {
            const colour = outline.isBaseline
              ? 'var(--visualization-baseline)'
              : `var(--visualization-palette-${outline.index % PALETTE_SIZE})`
            return (
              <rect
                key={outline.id}
                class={
                  outline.isBaseline
                    ? 'visualization__outline visualization__outline--baseline'
                    : 'visualization__outline'
                }
                x={outline.x}
                y={outline.y}
                width={outline.width}
                height={outline.height}
                stroke-width={outline.isBaseline ? 3 : 1.5}
                stroke-dasharray={outline.isFamiliar ? '6 4' : undefined}
                style={{ stroke: colour, fill: colour }}
              />
            )
          })}

          {layout.outlines.map((outline) => {
            const entry = entries[outline.index]
            return (
              <text
                key={`${outline.id}-label`}
                class="visualization__label"
                x={outline.labelX}
                y={outline.labelY}
                paint-order="stroke"
                stroke-width={4}
                stroke-linejoin="round"
              >
                {outlineLabelOf({ entry, currentLocale })}
              </text>
            )
          })}

          {bar && (
            <g class="visualization__scale" aria-hidden="true">
              <line x1={bar.x} x2={bar.x + bar.length} y1={bar.y} y2={bar.y} />
              <line x1={bar.x} x2={bar.x} y1={bar.y - 4} y2={bar.y + 4} />
              <line
                x1={bar.x + bar.length}
                x2={bar.x + bar.length}
                y1={bar.y - 4}
                y2={bar.y + 4}
              />
              <text x={bar.x + bar.length + 6} y={bar.y + 4}>
                {barText}
              </text>
            </g>
          )}
        </svg>
        <figcaption class="visualization__caption">
          {isSeen
            ? t('compareVisual.visualization.captionSeen', {
                sizeBy: sizeByGenitive(sizeMatchBy),
              })
            : t('compareVisual.visualization.captionPhysical')}
        </figcaption>
      </figure>

      {entries.length === 0 && (
        <p class="visualization__empty">{t('compareVisual.visualization.empty')}</p>
      )}
    </section>
  )
}

/**
 * The text equivalent of {@link Visualization}: each display with its size in the active
 * mode and unit system. It is a separate block, so the Compare view keeps it out of the
 * pinned drawing and lets it scroll with the controls (see `CompareVisual`).
 *
 * @param {object} props
 * @param {object[]} [props.entries=[]] CompareEntry objects, in drawing order.
 * @param {'physical'|'seen'} [props.mode='physical'] Mode, which picks the size text.
 * @param {'metric'|'imperial'} [props.units='metric'] Unit system.
 * @returns {import('preact').JSX.Element|null} null when there is nothing to list.
 *
 * @example
 * <VisualizationSizes entries={compareEntries} mode={vizMode} units={units} />
 */
export const VisualizationSizes = ({
  entries = [],
  mode = 'physical',
  units = 'metric',
}) => {
  const [idPrefix] = useState(() => `visualization-sizes-${++visualizationSequence}`)
  if (entries.length === 0) return null
  const headingId = `${idPrefix}-heading`
  const currentLocale = locale.value
  const isSeen = mode === 'seen'

  return (
    <section class="visualization__sizes" aria-labelledby={headingId}>
      <h3 class="visualization__sizes-heading" id={headingId}>
        {t('compareVisual.visualization.sizesHeading')}
      </h3>
      <ul class="visualization__sizes-list">
        {entries.map((entry) => (
          <li class="visualization__size" key={entry.display.id}>
            <span class="visualization__size-name">
              {formatDisplayLabel({ display: entry.display, locale: currentLocale })}
            </span>
            <span class="visualization__size-value">
              {sizeTextOf({ entry, units, currentLocale, isSeen })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
