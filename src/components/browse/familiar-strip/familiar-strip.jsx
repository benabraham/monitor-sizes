import { locale, t } from '../../../i18n/index.js'
import { formatResolution } from '../../../lib/format.js'
import { Button } from '../../ui/button/button.jsx'
import { Chip } from '../../ui/chip/chip.jsx'
import { formatDiagonal } from '../browse-format.js'
import './familiar-strip.css'

/**
 * One familiar display as a chip: name, diagonal and resolution. The baseline
 * chip is static, with the accent outline, the selected fill, a check mark and
 * the text marker "Baseline". Any other chip is a button that makes it the
 * baseline (F3).
 *
 * @param {object} props
 * @param {import('../browse-format.js').BrowseRow} props.row Familiar row.
 * @param {string} props.lang UI language, for number formatting.
 * @param {(id: string) => void} [props.onSetBaseline] Called with the display id.
 * @returns {import('preact').JSX.Element}
 */
const FamiliarChip = ({ row, lang, onSetBaseline }) => {
  const { display, isBaseline } = row
  const { id, name, diagonal, width, height } = display
  const detail = `${formatDiagonal({ diagonal, locale: lang })} · ${formatResolution({ width, height })}`

  if (isBaseline) {
    return (
      <Chip isAccent isSelected class="familiar-strip__chip">
        <span class="familiar-strip__marker">{t('browse.baselineMarker')}</span>
        <span class="familiar-strip__name">{name}</span>
        <span class="familiar-strip__detail">{detail}</span>
      </Chip>
    )
  }

  return (
    <Chip
      isDashed
      class="familiar-strip__chip"
      title={t('browse.setBaselineHint', { name })}
      onClick={() => onSetBaseline?.(id)}
    >
      <span class="familiar-strip__name">{name}</span>
      <span class="familiar-strip__detail">{detail}</span>
    </Chip>
  )
}

/**
 * Pinned strip of the familiar displays at the top of Browse (F2, F3, UX
 * "Browse"). Rows arrive in familiar order. The chips wrap on narrow screens.
 * A trailing "Add display" button is always there. With no familiar display, the
 * strip says how to mark one.
 *
 * The baseline is shown by its accent style and its text marker, and tapping any
 * other chip calls `onSetBaseline` with that display's id.
 *
 * @param {object} props
 * @param {import('../browse-format.js').BrowseRow[]} props.rows Familiar rows, in familiar order.
 * @param {'metric'|'imperial'} props.units Unit system (diagonals are inches in both).
 * @param {(id: string) => void} [props.onSetBaseline] Called with the id of the display tapped to become the baseline.
 * @param {() => void} [props.onAdd] Called when "Add display" is pressed.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <FamiliarStrip
 *   rows={familiarRows}
 *   units="metric"
 *   onSetBaseline={(id) => setBaseline(id)}
 *   onAdd={openAddDialog}
 * />
 */
export const FamiliarStrip = ({ rows, units, onSetBaseline, onAdd }) => {
  const lang = locale.value
  const hasRows = Array.isArray(rows) && rows.length > 0
  return (
    <section class="familiar-strip" aria-labelledby="browse-familiar-title">
      <h2 id="browse-familiar-title" class="familiar-strip__title">
        {t('common.familiar')}
      </h2>
      <ul class="familiar-strip__list">
        {hasRows &&
          rows.map((row) => (
            <li key={row.display.id} class="familiar-strip__item">
              <FamiliarChip row={row} lang={lang} onSetBaseline={onSetBaseline} />
            </li>
          ))}
        <li class="familiar-strip__item">
          <Button variant="secondary" size="sm" icon="plus" onClick={() => onAdd?.()}>
            {t('common.addDisplay')}
          </Button>
        </li>
      </ul>
      {!hasRows && <p class="familiar-strip__empty">{t('browse.familiarEmpty')}</p>}
    </section>
  )
}
