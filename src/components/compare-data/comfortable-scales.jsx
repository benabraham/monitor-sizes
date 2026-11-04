import { Chip } from '../ui/chip/chip.jsx'
import { locale, t } from '../../i18n/index.js'
import { formatResolution, formatScale } from '../../lib/format.js'
import { isSameScale } from './entries.js'
import './comfortable-scales.css'

/** Separator between the scale and the logical resolution in a chip. */
const ARROW = ' → '

/**
 * Order comfortable rows best first. The recommended row leads. The others follow
 * by how close their effective PPI is to the recommended one (then the larger
 * logical width), so the next-best scales come next.
 *
 * @param {object} params
 * @param {Array<object>} params.rows Comfortable MatrixRows.
 * @param {object | null} params.best The recommended row, or null.
 * @returns {Array<object>} A new array.
 */
const orderBestFirst = ({ rows, best }) => {
  if (!best) return [...rows].sort((a, b) => a.scale - b.scale)
  const others = rows
    .filter((row) => row !== best)
    .sort(
      (a, b) =>
        Math.abs(a.effectivePpi - best.effectivePpi) -
          Math.abs(b.effectivePpi - best.effectivePpi) || b.logicalWidth - a.logicalWidth,
    )
  return [best, ...others]
}

/**
 * Compact list of the comfortable scales of one display: a chip per scale, such as
 * `125 % → 3070 × 1730`, best first. Browse uses it in the phone cards and the table.
 *
 * With no comfortable scale the component shows "No comfortable scale" instead.
 *
 * @param {object} props
 * @param {{ matrix: Array<object>, bestScale?: object | null } | null | undefined} props.row
 *   A BrowseRow or CompareEntry: its scaling matrix and recommended scale.
 * @param {number} [props.max=3] Chips to show. More become a "+N more" note.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <ComfortableScales row={browseRow} max={2} />
 */
export const ComfortableScales = ({ row, max = 3 }) => {
  const currentLocale = locale.value
  const comfortable = (row?.matrix ?? []).filter(({ isComfortable }) => isComfortable)
  if (comfortable.length === 0) {
    return <p class="comfortable-scales__empty">{t('compareData.noComfortable')}</p>
  }

  const best =
    comfortable.find(({ scale }) => isSameScale(scale, row.bestScale?.scale)) ?? null
  const ordered = orderBestFirst({ rows: comfortable, best })
  const shown = ordered.slice(0, Math.max(0, max))
  const hiddenCount = ordered.length - shown.length

  return (
    <ul class="comfortable-scales" aria-label={t('compareData.comfortable.label')}>
      {shown.map((item) => {
        const isBest = item === best
        const chipText = [
          formatScale({ scale: item.scale, locale: currentLocale }),
          formatResolution({
            width: item.logicalWidth,
            height: item.logicalHeight,
            roundTo: 10,
          }),
        ].join(ARROW)
        return (
          <li key={item.scale} class="comfortable-scales__item">
            <Chip isAccent={isBest} class="comfortable-scales__chip">
              {chipText}
              {isBest ? (
                <span class="comfortable-scales__best">
                  {t('compareData.matrix.recommended')}
                </span>
              ) : null}
            </Chip>
          </li>
        )
      })}
      {hiddenCount > 0 ? (
        <li class="comfortable-scales__more">
          {t('compareData.comfortable.more', { count: hiddenCount })}
        </li>
      ) : null}
    </ul>
  )
}
