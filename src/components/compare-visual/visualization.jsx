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

/** Width of the figure from which the wide 16:9 frame is used, as in the CSS. */
const WIDE_FRAME_MIN_WIDTH = 600

/** Drawing width used before the figure is measured (and in tests without layout). */
const FALLBACK_WIDTH = 640

/** Counter for unique ids of the SVG title and description, one per mounted component. */
let visualizationSequence = 0

/**
 * Viewbox aspect ratio for a figure width: 16:9 when wide, 4:3 on phones.
 *
 * @param {number} width Figure width in CSS pixels.
 * @returns {number} Width divided by height.
 *
 * @example
 * aspectRatioFor(800) // 16 / 9
 * aspectRatioFor(360) // 4 / 3
 */
const aspectRatioFor = (width) => (width >= WIDE_FRAME_MIN_WIDTH ? 16 / 9 : 4 / 3)

/**
 * Measure the figure's width, and follow its size with a ResizeObserver. Without
 * layout (jsdom) or before the first measurement, the fallback width is used.
 *
 * @returns {{ ref: { current: HTMLElement | null }, width: number }}
 */
const useFigureWidth = () => {
  const ref = useRef(null)
  const [width, setWidth] = useState(FALLBACK_WIDTH)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const measure = () => {
      const measured = Math.round(element.clientWidth)
      if (measured > 0) setWidth(measured)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
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
 * Label drawn above an outline: the short name, plus a baseline mark.
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
 * text label, and colour is never the only signal. A scale bar (10 cm, 4 in or 10°)
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
  const { ref, width } = useFigureWidth()
  const currentLocale = locale.value
  const isSeen = mode === 'seen'
  const height = Math.round(width / aspectRatioFor(width))
  const layout = getOutlineLayout({
    entries,
    mode: isSeen ? 'seen' : 'physical',
    width,
    height,
    padding: PADDING,
    units,
  })
  const titleId = `${idPrefix}-title`
  const descId = `${idPrefix}-desc`
  const sizesId = `${idPrefix}-sizes`
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

      <figure class="visualization__figure" ref={ref}>
        <svg
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
                text-anchor="middle"
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

      {entries.length === 0 ? (
        <p class="visualization__empty">{t('compareVisual.visualization.empty')}</p>
      ) : (
        <section class="visualization__sizes" aria-labelledby={sizesId}>
          <h3 class="visualization__sizes-heading" id={sizesId}>
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
      )}
    </section>
  )
}
