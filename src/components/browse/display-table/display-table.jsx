import { locale, t } from '../../../i18n/index.js'
import {
  formatAspect,
  formatArea,
  formatLength,
  formatNumber,
  formatResolution,
} from '../../../lib/format.js'
import { lengthUnitLabel } from '../../../lib/units.js'
import { HelpPopover } from '../../help-popover/help-popover.jsx'
import { Icon } from '../../ui/icon/icon.jsx'
import { announceCompareChange } from '../compare-feedback.js'
import {
  formatDiagonal,
  formatLengthDiffCell,
  formatRatioCell,
  getComfortableScales,
} from '../browse-format.js'
import {
  CompareCheckbox,
  FamiliarToggle,
  NoComfortableScale,
  ScaleChip,
} from '../row-parts.jsx'
import { useLongPress } from '../use-long-press.js'
import './display-table.css'

/**
 * Class list for a numeric cell. Positive and negative values get a colour and
 * keep their sign in the text. A positive size difference is also bold (PRD: the
 * width and height diffs).
 *
 * @param {object} params
 * @param {import('../browse-format.js').CellValue} params.cell
 * @param {boolean} [params.isStrongWhenPositive=false]
 * @returns {string}
 */
const getValueClass = ({ cell, isStrongWhenPositive = false }) =>
  [
    'table-numeric',
    cell.tone === 'positive' && 'display-table__value--positive',
    cell.tone === 'negative' && 'display-table__value--negative',
    isStrongWhenPositive && cell.tone === 'positive' && 'display-table__value--strong',
  ]
    .filter(Boolean)
    .join(' ')

/**
 * Sortable column header with its help popover (F4, F5, F20). The button reports
 * the key only; the parent decides the direction. `aria-sort` reflects the active
 * sort, and the arrow icon is decorative.
 *
 * @param {object} props
 * @param {string} props.sortKey Sort key, e.g. `'ppi'`.
 * @param {string} props.label Column header text (no unit when the cells carry one).
 * @param {string} [props.help] Help text for the popover. Omit for columns without a metric.
 * @param {string} [props.helpId] Unique id of the help panel.
 * @param {{ key: string, direction: 'asc'|'desc' } | null} props.sort Active sort.
 * @param {(sort: { key: string }) => void} [props.onSort] Called with `{ key }` when pressed.
 * @returns {import('preact').JSX.Element}
 */
const SortableHeader = ({ sortKey, label, help, helpId, sort, onSort }) => {
  const isActive = sort?.key === sortKey
  const direction = isActive ? sort.direction : null
  let ariaSort = 'none'
  if (direction === 'asc') ariaSort = 'ascending'
  if (direction === 'desc') ariaSort = 'descending'

  return (
    <th scope="col" class="display-table__head-cell" aria-sort={ariaSort}>
      <div class="display-table__head">
        <button
          type="button"
          class="display-table__sort"
          onClick={() => onSort?.({ key: sortKey })}
        >
          <span>{label}</span>
          {isActive && (
            <Icon name={direction === 'asc' ? 'sort-asc' : 'sort-desc'} size={12} />
          )}
        </button>
        {help && (
          <HelpPopover
            id={helpId}
            label={t('browse.helpLabel', { metric: label })}
            title={label}
          >
            <p>{help}</p>
          </HelpPopover>
        )}
      </div>
    </th>
  )
}

/**
 * One display as a table row. Cells use the shared formatters. A missing baseline
 * gives the dash in every relative column. A long press on the row toggles its
 * comparison, as on a card.
 *
 * @param {object} props
 * @param {import('../browse-format.js').BrowseRow} props.row
 * @param {'metric'|'imperial'} props.units
 * @param {'en'|'cs'} props.lang UI language.
 * @param {string} props.sameLabel Translated "same".
 * @param {(id: string) => void} [props.onToggleFamiliar]
 * @param {(id: string) => void} [props.onToggleCompare]
 * @param {(id: string) => void} [props.onOpenDisplay]
 * @returns {import('preact').JSX.Element}
 */
const DisplayTableRow = ({
  row,
  units,
  lang,
  sameLabel,
  onToggleFamiliar,
  onToggleCompare,
  onOpenDisplay,
}) => {
  const {
    display,
    metrics,
    relative,
    matrix,
    bestScale,
    isFamiliar,
    isBaseline,
    isCompared,
  } = row
  const { id, name, diagonal, width, height, isCustom } = display
  const relativeSize = formatRatioCell({
    ratio: relative?.relativePixelSize,
    locale: lang,
    sameLabel,
  })
  const widthDiff = formatLengthDiffCell({
    inches: relative?.widthDiffIn,
    units,
    locale: lang,
    sameLabel,
  })
  const heightDiff = formatLengthDiffCell({
    inches: relative?.heightDiffIn,
    units,
    locale: lang,
    sameLabel,
  })
  const areaRatio = formatRatioCell({
    ratio: relative?.areaRatio,
    locale: lang,
    sameLabel,
  })
  const megapixelRatio = formatRatioCell({
    ratio: relative?.megapixelRatio,
    locale: lang,
    sameLabel,
  })
  const scales = getComfortableScales({ matrix, bestScale, locale: lang })
  const longPress = useLongPress({
    onLongPress: () => {
      if (!onToggleCompare) return
      onToggleCompare(id)
      announceCompareChange({ name, isNowCompared: !isCompared })
    },
  })

  return (
    <tr
      class={`display-table__row${isBaseline ? ' display-table__row--baseline' : ''}`}
      {...longPress}
    >
      <td class="display-table__control">
        <FamiliarToggle
          name={name}
          isFamiliar={isFamiliar}
          onToggle={() => onToggleFamiliar?.(id)}
        />
      </td>
      <td class="display-table__control">
        <CompareCheckbox
          name={name}
          isCompared={isCompared}
          onToggle={() => onToggleCompare?.(id)}
        />
      </td>
      <th scope="row" class="display-table__name">
        {isBaseline && <span class="visually-hidden">{t('common.baseline')}</span>}
        <button
          type="button"
          class="display-table__name-button"
          onClick={() => onOpenDisplay?.(id)}
        >
          {name}
        </button>
        {isCustom && <span class="display-table__badge">{t('browse.custom')}</span>}
      </th>
      <td class="table-numeric">{formatDiagonal({ diagonal, locale: lang })}</td>
      <td class="table-numeric">{formatNumber({ value: metrics.ppi, locale: lang })}</td>
      <td class={getValueClass({ cell: relativeSize })}>{relativeSize.text}</td>
      <td>{formatAspect(metrics.aspect)}</td>
      <td class="table-numeric">{formatResolution({ width, height })}</td>
      <td class="table-numeric">
        {formatLength({ inches: metrics.widthIn, units, locale: lang })}
      </td>
      <td class="table-numeric">
        {formatLength({ inches: metrics.heightIn, units, locale: lang })}
      </td>
      <td class={getValueClass({ cell: widthDiff, isStrongWhenPositive: true })}>
        {widthDiff.text}
      </td>
      <td class={getValueClass({ cell: heightDiff, isStrongWhenPositive: true })}>
        {heightDiff.text}
      </td>
      <td class="table-numeric">
        {formatArea({ squareInches: metrics.areaIn2, units, locale: lang })}
      </td>
      <td class={getValueClass({ cell: areaRatio })}>{areaRatio.text}</td>
      <td class="table-numeric">
        {formatNumber({ value: metrics.megapixels, locale: lang, digits: 1 })}
      </td>
      <td class={getValueClass({ cell: megapixelRatio })}>{megapixelRatio.text}</td>
      <td class="display-table__scales">
        {scales.length === 0 && <NoComfortableScale />}
        {scales.map((scale) => (
          <ScaleChip key={scale.scale} label={scale.label} isBest={scale.isBest} />
        ))}
      </td>
    </tr>
  )
}

/**
 * Dense, sortable table of displays for wide screens (F4, F5, UX "Browse").
 *
 * The rows are shown in the order given: the store sorts them, and this component
 * only reports the sort the user asks for. Each sortable header calls `onSort`
 * with `{ key }`, and `aria-sort` on the header shows the active sort. Every metric
 * header has a help popover. The table is inside `.table-wrap`, so it scrolls
 * sideways on phones instead of pushing the page wider.
 *
 * The baseline row has an accent left border and a "Baseline" text for screen
 * readers. Relative values are signed with the sheet's convention (`+2 %`, `−58`,
 * `same`), so colour is never the only signal.
 *
 * @param {object} props
 * @param {import('../browse-format.js').BrowseRow[]} props.rows Rows, already filtered and sorted.
 * @param {{ key: string, direction: 'asc'|'desc' } | null} props.sort Active sort, for `aria-sort`.
 * @param {'metric'|'imperial'} props.units Unit system for lengths and areas.
 * @param {(sort: { key: string }) => void} [props.onSort] Called with `{ key }` when a header is pressed.
 * @param {(id: string) => void} [props.onToggleFamiliar] Called with the display id when its star is pressed.
 * @param {(id: string) => void} [props.onToggleCompare] Called with the display id when its checkbox changes.
 * @param {(id: string) => void} [props.onOpenDisplay] Called with the display id when its name is pressed.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <DisplayTable
 *   rows={browseRows}
 *   sort={{ key: 'ppi', direction: 'desc' }}
 *   units="metric"
 *   onSort={({ key }) => setSort(key)}
 *   onToggleFamiliar={toggleFamiliar}
 *   onToggleCompare={toggleCompare}
 *   onOpenDisplay={openDisplay}
 * />
 */
export const DisplayTable = ({
  rows,
  sort,
  units,
  onSort,
  onToggleFamiliar,
  onToggleCompare,
  onOpenDisplay,
}) => {
  const lang = locale.value
  const sameLabel = t('common.same')
  const unitLabel = lengthUnitLabel(units)
  const header = (props) => <SortableHeader sort={sort} onSort={onSort} {...props} />

  return (
    <div class="table-wrap display-table-wrap">
      <table class="display-table">
        <caption class="visually-hidden">{t('browse.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span class="visually-hidden">{t('browse.col.familiar')}</span>
            </th>
            <th scope="col">
              <span class="visually-hidden">{t('browse.col.compare')}</span>
            </th>
            {header({ sortKey: 'name', label: t('browse.col.name') })}
            {header({
              sortKey: 'diagonal',
              label: t('metrics.diagonal.label'),
              help: t('metrics.diagonal.help'),
              helpId: 'browse-help-diagonal',
            })}
            {header({
              sortKey: 'ppi',
              label: t('metrics.ppi.label'),
              help: t('metrics.ppi.help'),
              helpId: 'browse-help-ppi',
            })}
            {header({
              sortKey: 'relativePixelSize',
              label: t('metrics.relativePixelSize.label'),
              help: t('metrics.relativePixelSize.help'),
              helpId: 'browse-help-relative-pixel-size',
            })}
            {header({
              sortKey: 'aspect',
              label: t('metrics.aspect.label'),
              help: t('metrics.aspect.help'),
              helpId: 'browse-help-aspect',
            })}
            {header({
              sortKey: 'resolution',
              label: t('metrics.resolution.label'),
              help: t('metrics.resolution.help'),
              helpId: 'browse-help-resolution',
            })}
            {header({
              sortKey: 'width',
              label: t('metrics.width.label'),
              help: t('metrics.width.help'),
              helpId: 'browse-help-width',
            })}
            {header({
              sortKey: 'height',
              label: t('metrics.height.label'),
              help: t('metrics.height.help'),
              helpId: 'browse-help-height',
            })}
            {header({
              sortKey: 'widthDiff',
              label: `${t('metrics.widthDiff.label')} (${unitLabel})`,
              help: t('metrics.widthDiff.help'),
              helpId: 'browse-help-width-diff',
            })}
            {header({
              sortKey: 'heightDiff',
              label: `${t('metrics.heightDiff.label')} (${unitLabel})`,
              help: t('metrics.heightDiff.help'),
              helpId: 'browse-help-height-diff',
            })}
            {header({
              sortKey: 'area',
              label: t('metrics.area.label'),
              help: t('metrics.area.help'),
              helpId: 'browse-help-area',
            })}
            {header({
              sortKey: 'areaRatio',
              label: t('metrics.areaRatio.label'),
              help: t('metrics.areaRatio.help'),
              helpId: 'browse-help-area-ratio',
            })}
            {header({
              sortKey: 'megapixels',
              label: t('metrics.megapixels.label'),
              help: t('metrics.megapixels.help'),
              helpId: 'browse-help-megapixels',
            })}
            {header({
              sortKey: 'megapixelRatio',
              label: t('metrics.megapixelRatio.label'),
              help: t('metrics.megapixelRatio.help'),
              helpId: 'browse-help-megapixel-ratio',
            })}
            {header({
              sortKey: 'bestScale',
              label: t('browse.comfortableScales'),
              help: t('metrics.comfortable.help'),
              helpId: 'browse-help-comfortable',
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <DisplayTableRow
              key={row.display.id}
              row={row}
              units={units}
              lang={lang}
              sameLabel={sameLabel}
              onToggleFamiliar={onToggleFamiliar}
              onToggleCompare={onToggleCompare}
              onOpenDisplay={onOpenDisplay}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
