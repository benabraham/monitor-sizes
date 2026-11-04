import { HelpPopover } from '../help-popover/help-popover.jsx'
import { locale, t } from '../../i18n/index.js'
import { EntryBadge } from './entry-badge.jsx'
import { formatDiagonal } from './cell-format.js'
import { entryKind, sortBaselineFirst } from './entries.js'
import { METRIC_ROWS } from './metric-rows.js'
import './metric-grid.css'

/**
 * Comparison table of the Compare view (PRD: F4, F14, F15, UX "A metric grid with
 * the baseline column first"). One column per compared display, one row per metric.
 *
 * - Columns: the baseline first (guaranteed, even if the entries arrive in another
 *   order). Each header has the name, the diagonal in inches and a text badge.
 *   Familiar columns have a dashed top rule, candidates a solid one.
 * - Rows: a row header with the metric label (and unit, in the active system) and
 *   a help popover (F20). Relative values show "same" at zero and `—` when there
 *   is no baseline. Baseline equivalent distances show `—`.
 * - The table scrolls horizontally inside `.table-wrap`. The row headers stick to
 *   the left edge on narrow screens.
 *
 * @param {object} props
 * @param {Array<object>} props.entries CompareEntry objects (see `docs/ARCHITECTURE.md`).
 * @param {'metric'|'imperial'} props.units Unit system for lengths and areas.
 * @param {string} [props.idPrefix='cd-metric'] Prefix of the help popover ids. Change it
 *   when more than one grid is on the same page.
 * @returns {import('preact').JSX.Element | null} Null when there are no entries.
 *
 * @example
 * <MetricGrid entries={compareEntries.value} units={units.value} />
 */
export const MetricGrid = ({ entries, units, idPrefix = 'cd-metric' }) => {
  const currentLocale = locale.value
  const ordered = sortBaselineFirst(entries)
  if (ordered.length === 0) return null

  const ctx = { units, locale: currentLocale, sameLabel: t('common.same') }

  return (
    <div class="table-wrap">
      <table class="metric-grid">
        <caption class="visually-hidden">{t('compareData.caption.metrics')}</caption>
        <thead>
          <tr>
            <th scope="col" class="metric-grid__corner">
              {t('compareData.metricColumn')}
            </th>
            {ordered.map((entry) => (
              <th
                key={entry.display.id}
                scope="col"
                class={`metric-grid__head metric-grid__head--${entryKind(entry)}`}
              >
                <span class="metric-grid__name">{entry.display.name}</span>
                <span class="metric-grid__diagonal">
                  {formatDiagonal({
                    diagonal: entry.display.diagonal,
                    locale: currentLocale,
                  })}
                </span>
                <EntryBadge entry={entry} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRIC_ROWS.map((row, index) => {
            const unit = row.unit(ctx)
            const baseLabel = t(row.labelKey)
            const label = unit ? `${baseLabel} (${unit})` : baseLabel
            const isGroupStart = index === 0 || METRIC_ROWS[index - 1].group !== row.group
            return (
              <tr
                key={row.id}
                class={
                  isGroupStart
                    ? 'metric-grid__row metric-grid__row--group-start'
                    : 'metric-grid__row'
                }
              >
                <th scope="row" class="metric-grid__row-head" aria-label={label}>
                  <span class="metric-grid__row-label">{label}</span>
                  <HelpPopover
                    id={`${idPrefix}-help-${row.id}`}
                    label={t('compareData.help', { name: baseLabel })}
                    title={label}
                  >
                    <p>{t(row.helpKey)}</p>
                  </HelpPopover>
                </th>
                {ordered.map((entry) => (
                  <td key={entry.display.id} class="table-numeric">
                    {row.value({ entry, ctx })}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
