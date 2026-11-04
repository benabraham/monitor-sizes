import { Icon } from '../ui/icon/icon.jsx'
import { HelpPopover } from '../help-popover/help-popover.jsx'
import { locale, t } from '../../i18n/index.js'
import { formatNumber, formatResolution, formatScale } from '../../lib/format.js'
import { EntryBadge } from './entry-badge.jsx'
import { entryKind, isSameScale, sortBaselineFirst } from './entries.js'
import './scaling-matrix.css'

/**
 * Full scaling matrix of the Compare view (PRD: F6, UX "The full scaling matrix with
 * comfortable cells highlighted"). One table per compared display, one row per scale
 * option in its preset.
 *
 * Columns: scale, logical resolution (to tens), effective PPI, workspace megapixels,
 * logical PPD when a distance is known, and the status flags.
 *
 * Markers are text, never colour alone:
 * - a comfortable row is highlighted and carries a check mark with "Comfortable";
 * - the scale the display is set to carries "In use";
 * - the best comfortable scale carries "Recommended".
 * - macOS rows also show the "looks like" width and the logical height.
 *
 * With `showAll={false}` only comfortable rows are rendered, as Browse does, and a
 * "No comfortable scale" message replaces the table when there is none.
 *
 * Entries sit side by side in a grid on wide containers and stack on phones.
 *
 * @param {object} props
 * @param {Array<object>} props.entries CompareEntry objects, each with a `matrix`.
 * @param {'metric'|'imperial'} [props.units] Accepted for the same prop set as
 *   `MetricGrid`. The matrix shows no lengths.
 * @param {boolean} [props.showAll=true] Render every scale option, or only the
 *   comfortable ones.
 * @param {string} [props.idPrefix='cd-matrix'] Prefix of the help popover ids.
 * @returns {import('preact').JSX.Element | null} Null when there are no entries.
 *
 * @example
 * <ScalingMatrix entries={compareEntries.value} units={units.value} />
 * <ScalingMatrix entries={rows} showAll={false} />
 */
export const ScalingMatrix = ({ entries, showAll = true, idPrefix = 'cd-matrix' }) => {
  const currentLocale = locale.value
  const ordered = sortBaselineFirst(entries)
  if (ordered.length === 0) return null

  return (
    <div class="scaling-matrix">
      <div class="scaling-matrix__grid">
        {ordered.map((entry) => (
          <ScalingEntry
            key={entry.display.id}
            entry={entry}
            showAll={showAll}
            idPrefix={idPrefix}
            currentLocale={currentLocale}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * One compared display's section: its heading and its matrix table.
 *
 * @param {object} props
 * @param {object} props.entry CompareEntry.
 * @param {boolean} props.showAll Every option, or comfortable only.
 * @param {string} props.idPrefix Help popover id prefix.
 * @param {'en'|'cs'} props.currentLocale
 * @returns {import('preact').JSX.Element}
 */
const ScalingEntry = ({ entry, showAll, idPrefix, currentLocale }) => {
  const name = entry.display.name
  const headingId = `${idPrefix}-${entry.display.id}-title`
  const rows = showAll
    ? entry.matrix
    : entry.matrix.filter(({ isComfortable }) => isComfortable)
  const hasLogicalPpd = entry.matrix.some(({ logicalPpd }) => Number.isFinite(logicalPpd))
  const helpPrefix = `${idPrefix}-${entry.display.id}`

  return (
    <section
      class={`scaling-matrix__entry scaling-matrix__entry--${entryKind(entry)}`}
      aria-labelledby={headingId}
    >
      <h3 id={headingId} class="scaling-matrix__title">
        <span class="scaling-matrix__name">{name}</span>
        <EntryBadge entry={entry} />
      </h3>
      {rows.length === 0 ? (
        <p class="scaling-matrix__empty">{t('compareData.noComfortable')}</p>
      ) : (
        <div class="table-wrap">
          <table class="scaling-matrix__table">
            <caption class="visually-hidden">
              {t('compareData.caption.matrix', { name })}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t('common.scale')}</th>
                <th scope="col">
                  <HeadingWithHelp
                    id={`${helpPrefix}-help-logicalResolution`}
                    label={t('metrics.logicalResolution.label')}
                    helpText={t('metrics.logicalResolution.help')}
                  />
                </th>
                <th scope="col">
                  <HeadingWithHelp
                    id={`${helpPrefix}-help-effectivePpi`}
                    label={t('metrics.effectivePpi.label')}
                    helpText={t('metrics.effectivePpi.help')}
                  />
                </th>
                <th scope="col">
                  <HeadingWithHelp
                    id={`${helpPrefix}-help-workspace`}
                    label={`${t('metrics.workspace.label')} (Mpix)`}
                    helpText={t('metrics.workspace.help')}
                  />
                </th>
                {hasLogicalPpd && (
                  <th scope="col">
                    <HeadingWithHelp
                      id={`${helpPrefix}-help-logicalPpd`}
                      label={t('metrics.logicalPpd.label')}
                      helpText={t('metrics.logicalPpd.help')}
                    />
                  </th>
                )}
                <th scope="col">
                  <HeadingWithHelp
                    id={`${helpPrefix}-help-comfortable`}
                    label={t('metrics.comfortable.label')}
                    helpText={t('metrics.comfortable.help')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <MatrixRow
                  key={row.scale}
                  row={row}
                  entry={entry}
                  hasLogicalPpd={hasLogicalPpd}
                  currentLocale={currentLocale}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/**
 * Column header text with its help popover (F20). The caller translates the label
 * and the help text with literal keys, and passes a unique popover id.
 *
 * @param {object} props
 * @param {string} props.id Help popover id.
 * @param {string} props.label Column header text, unit included.
 * @param {string} props.helpText Help popover text.
 * @returns {import('preact').JSX.Element}
 */
const HeadingWithHelp = ({ id, label, helpText }) => (
  <>
    <span>{label}</span>
    <HelpPopover id={id} label={t('compareData.help', { name: label })} title={label}>
      <p>{helpText}</p>
    </HelpPopover>
  </>
)

/**
 * One scale option. Comfortable rows are highlighted and labelled; the flags for
 * the current and the recommended scale are text too.
 *
 * @param {object} props
 * @param {object} props.row MatrixRow.
 * @param {object} props.entry CompareEntry (for the current and best scale).
 * @param {boolean} props.hasLogicalPpd Whether the table has a logical PPD column.
 * @param {'en'|'cs'} props.currentLocale
 * @returns {import('preact').JSX.Element}
 */
const MatrixRow = ({ row, entry, hasLogicalPpd, currentLocale }) => {
  const isInUse = isSameScale(row.scale, entry.scale)
  const isRecommended = isSameScale(row.scale, entry.bestScale?.scale)
  const classes = row.isComfortable
    ? 'scaling-matrix__row scaling-matrix__row--comfortable'
    : 'scaling-matrix__row'

  return (
    <tr class={classes}>
      <th scope="row" class="scaling-matrix__scale">
        <span>{formatScale({ scale: row.scale, locale: currentLocale })}</span>
        {row.looksLikeWidth ? (
          <span class="scaling-matrix__looks-like">
            {t('compareData.matrix.looksLike', {
              size: formatResolution({
                width: row.looksLikeWidth,
                height: row.logicalHeight,
              }),
            })}
          </span>
        ) : null}
      </th>
      <td class="table-numeric">
        {formatResolution({
          width: row.logicalWidth,
          height: row.logicalHeight,
          roundTo: 10,
        })}
      </td>
      <td class="table-numeric">
        {formatNumber({ value: row.effectivePpi, locale: currentLocale })}
      </td>
      <td class="table-numeric">
        {formatNumber({
          value: row.workspaceMegapixels,
          locale: currentLocale,
          digits: 1,
        })}
      </td>
      {hasLogicalPpd && (
        <td class="table-numeric">
          {formatNumber({ value: row.logicalPpd, locale: currentLocale })}
        </td>
      )}
      <td class="scaling-matrix__flags">
        {row.isComfortable ? (
          <span class="scaling-matrix__flag scaling-matrix__flag--comfortable">
            <Icon name="check" size={12} />
            <span>{t('compareData.matrix.comfortable')}</span>
          </span>
        ) : (
          <span class="visually-hidden">{t('compareData.matrix.notComfortable')}</span>
        )}
        {isInUse && (
          <span class="scaling-matrix__flag scaling-matrix__flag--in-use">
            {t('compareData.matrix.inUse')}
          </span>
        )}
        {isRecommended && (
          <span class="scaling-matrix__flag scaling-matrix__flag--recommended">
            {t('compareData.matrix.recommended')}
          </span>
        )}
      </td>
    </tr>
  )
}
