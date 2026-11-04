import { locale, t } from '../../../i18n/index.js'
import { formatAspect, formatNumber, formatResolution } from '../../../lib/format.js'
import { announceCompareChange } from '../compare-feedback.js'
import { formatDiagonal, formatRatioCell, getBestScaleLabel } from '../browse-format.js'
import {
  CompareCheckbox,
  FamiliarToggle,
  NoComfortableScale,
  ScaleChip,
} from '../row-parts.jsx'
import { useLongPress } from '../use-long-press.js'
import './display-cards.css'

/**
 * One display as a phone card. It shows the name, diagonal, resolution, PPI and
 * the relative pixel size, plus the best comfortable scale as a chip. The star and
 * the compare checkbox are on the card, with 44 px targets on touch screens.
 *
 * A long press on the card toggles its comparison too, and says so (see
 * `use-long-press.js`). The checkbox stays the way to do it without touch.
 *
 * @param {object} props
 * @param {import('../browse-format.js').BrowseRow} props.row
 * @param {'en'|'cs'} props.lang UI language.
 * @param {string} props.sameLabel Translated "same".
 * @param {(id: string) => void} [props.onToggleFamiliar]
 * @param {(id: string) => void} [props.onToggleCompare]
 * @param {(id: string) => void} [props.onOpenDisplay]
 * @returns {import('preact').JSX.Element}
 */
const DisplayCard = ({
  row,
  lang,
  sameLabel,
  onToggleFamiliar,
  onToggleCompare,
  onOpenDisplay,
}) => {
  const { display, metrics, relative, bestScale, isFamiliar, isBaseline, isCompared } =
    row
  const { id, name, diagonal, width, height, isCustom } = display
  const bestLabel = getBestScaleLabel({ bestScale, locale: lang })
  const relativeSize = formatRatioCell({
    ratio: relative?.relativePixelSize,
    locale: lang,
    sameLabel,
  })
  const isSigned = relativeSize.tone === 'positive' || relativeSize.tone === 'negative'
  const toneClass = isSigned ? `display-cards__value--${relativeSize.tone}` : undefined
  const longPress = useLongPress({
    onLongPress: () => {
      if (!onToggleCompare) return
      onToggleCompare(id)
      announceCompareChange({ name, isNowCompared: !isCompared })
    },
  })

  return (
    <li
      class={`display-cards__card${isBaseline ? ' display-cards__card--baseline' : ''}`}
      {...longPress}
    >
      <div class="display-cards__head">
        <h3 class="display-cards__title">
          <button
            type="button"
            class="display-cards__name"
            onClick={() => onOpenDisplay?.(id)}
          >
            {name}
          </button>
        </h3>
        <FamiliarToggle
          name={name}
          isFamiliar={isFamiliar}
          onToggle={() => onToggleFamiliar?.(id)}
        />
      </div>

      <div class="display-cards__badges">
        {isBaseline && (
          <span class="display-cards__baseline">{t('browse.baselineMarker')}</span>
        )}
        {isCustom && <span class="display-cards__badge">{t('browse.custom')}</span>}
      </div>

      <dl class="display-cards__facts">
        <div>
          <dt>{t('metrics.diagonal.label')}</dt>
          <dd>{formatDiagonal({ diagonal, locale: lang })}</dd>
        </div>
        <div>
          <dt>{t('metrics.resolution.label')}</dt>
          <dd>{formatResolution({ width, height })}</dd>
        </div>
        <div>
          <dt>{t('metrics.ppi.label')}</dt>
          <dd>{formatNumber({ value: metrics.ppi, locale: lang })}</dd>
        </div>
        <div>
          <dt>{t('metrics.aspect.label')}</dt>
          <dd>{formatAspect(metrics.aspect)}</dd>
        </div>
        <div>
          <dt>{t('metrics.relativePixelSize.label')}</dt>
          <dd class={toneClass}>{relativeSize.text}</dd>
        </div>
      </dl>

      <div class="display-cards__scale">
        <span class="display-cards__scale-label">{t('browse.bestScaleHeading')}</span>
        {bestLabel ? <ScaleChip label={bestLabel} isBest /> : <NoComfortableScale />}
      </div>

      <label class="display-cards__compare">
        <CompareCheckbox
          name={name}
          isCompared={isCompared}
          onToggle={() => onToggleCompare?.(id)}
        />
        <span>{t('common.compare')}</span>
      </label>
    </li>
  )
}

/**
 * Phone layout of the Browse list (UX: "On phones it becomes cards"). One card per
 * display, in the order given. Each card holds the best comfortable scale as a
 * chip (for example `125 % → 3070 × 1730`), or a muted "No comfortable scale".
 * A long press on a card toggles its comparison, with a spoken message and a short
 * vibration (PRD: "Long-press or a checkbox adds a display to compare").
 *
 * @param {object} props
 * @param {import('../browse-format.js').BrowseRow[]} props.rows Rows, already filtered and sorted.
 * @param {'metric'|'imperial'} [props.units] Unit system. Accepted for parity with `DisplayTable`. Cards show no lengths, so it is not read.
 * @param {(id: string) => void} [props.onToggleFamiliar] Called with the display id when its star is pressed.
 * @param {(id: string) => void} [props.onToggleCompare] Called with the display id when its checkbox changes.
 * @param {(id: string) => void} [props.onOpenDisplay] Called with the display id when its name is pressed.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <DisplayCards rows={browseRows} units="metric" onToggleFamiliar={toggleFamiliar} />
 */
export const DisplayCards = ({
  rows,
  onToggleFamiliar,
  onToggleCompare,
  onOpenDisplay,
}) => {
  const lang = locale.value
  const sameLabel = t('common.same')
  return (
    <ul class="display-cards">
      {rows.map((row) => (
        <DisplayCard
          key={row.display.id}
          row={row}
          lang={lang}
          sameLabel={sameLabel}
          onToggleFamiliar={onToggleFamiliar}
          onToggleCompare={onToggleCompare}
          onOpenDisplay={onOpenDisplay}
        />
      ))}
    </ul>
  )
}
