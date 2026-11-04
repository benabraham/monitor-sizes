import { locale, t } from '../../i18n/index.js'
import { formatNumber } from '../../lib/format.js'
import { Button } from '../ui/button/button.jsx'
import { clearedFilters, hasActiveFilters } from './browse-filters.js'
import { DisplayCards } from './display-cards/display-cards.jsx'
import { DisplayTable } from './display-table/display-table.jsx'
import { FamiliarStrip } from './familiar-strip/familiar-strip.jsx'
import { FilterBar } from './filter-bar/filter-bar.jsx'
import { useIsWide } from './use-is-wide.js'
import './browse.css'

/**
 * The Browse view (PRD UX "1. Browse"): the familiar strip and filters at the
 * top, then the display list, then a "Compare (n)" bar once something is compared.
 *
 * Layout: `layout` picks the list. `'auto'` (default) shows the table from the
 * `sm` breakpoint (600 px) and the cards below it, using `matchMedia`. Only one
 * list is rendered, so the 200-row case does not build the DOM twice. `'table'`
 * and `'cards'` force a layout (tests, or a host that knows its container).
 *
 * The top block (filters and familiar strip) is sticky on wide screens only, to
 * keep phones from losing the list to a tall header. The count line is a polite
 * live region. The compare bar sticks to the bottom of the view.
 *
 * All state lives in the parent. Every change goes out through a callback.
 *
 * @param {object} props
 * @param {import('./browse-format.js').BrowseRow[]} props.rows Filtered and sorted rows.
 * @param {import('./browse-format.js').BrowseRow[]} props.familiarRows Familiar rows, in familiar order.
 * @param {import('./browse-filters.js').BrowseFilters} props.filters Current filters.
 * @param {{ key: string, direction: 'asc'|'desc' } | null} props.sort Active sort.
 * @param {'metric'|'imperial'} props.units Unit system.
 * @param {string[]} [props.availableTags] Tags present in the data.
 * @param {string[]} [props.availableAspects] Aspect labels present in the data.
 * @param {(partial: Partial<import('./browse-filters.js').BrowseFilters>) => void} [props.onFiltersChange]
 *   Called with the changed filter keys, or with the full cleared state.
 * @param {(sort: { key: string }) => void} [props.onSort] Called when a sortable header is pressed.
 * @param {(id: string) => void} [props.onToggleFamiliar] Star pressed.
 * @param {(id: string) => void} [props.onToggleCompare] Compare checkbox changed.
 * @param {(id: string) => void} [props.onSetBaseline] Familiar chip tapped to become the baseline.
 * @param {() => void} [props.onAdd] "Add display" pressed.
 * @param {(id: string) => void} [props.onOpenDisplay] Display name pressed.
 * @param {number} [props.compareCount=0] Displays in Compare. The bar shows when above zero.
 * @param {() => void} [props.onGoCompare] "Compare (n)" pressed.
 * @param {'auto'|'table'|'cards'} [props.layout='auto'] Which list to render.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <Browse
 *   rows={browseRows}
 *   familiarRows={familiarRows}
 *   filters={filters}
 *   sort={sort}
 *   units={units}
 *   availableTags={['laptop', 'monitor', 'ultrawide']}
 *   availableAspects={['16:9', '21:9']}
 *   onFiltersChange={setFilters}
 *   onSort={({ key }) => setSort(key)}
 *   onToggleFamiliar={toggleFamiliar}
 *   onToggleCompare={toggleCompare}
 *   onSetBaseline={setBaseline}
 *   onAdd={openAddDialog}
 *   onOpenDisplay={openDisplay}
 *   compareCount={compareIds.length}
 *   onGoCompare={goCompare}
 * />
 */
export const Browse = ({
  rows,
  familiarRows,
  filters,
  sort,
  units,
  availableTags,
  availableAspects,
  onFiltersChange,
  onSort,
  onToggleFamiliar,
  onToggleCompare,
  onSetBaseline,
  onAdd,
  onOpenDisplay,
  compareCount = 0,
  onGoCompare,
  layout = 'auto',
}) => {
  const isWide = useIsWide()
  const lang = locale.value
  const list = rows ?? []
  const isTable = layout === 'table' || (layout === 'auto' && isWide)
  const isFiltered = hasActiveFilters(filters)

  const listProps = {
    rows: list,
    units,
    onToggleFamiliar,
    onToggleCompare,
    onOpenDisplay,
  }

  return (
    <section class="browse" aria-label={t('browse.title')}>
      <div class="browse__top">
        <FilterBar
          filters={filters}
          availableTags={availableTags}
          availableAspects={availableAspects}
          onChange={onFiltersChange}
        />
        <FamiliarStrip
          rows={familiarRows}
          units={units}
          onSetBaseline={onSetBaseline}
          onAdd={onAdd}
        />
      </div>

      <p class="browse__count" aria-live="polite">
        {t('browse.count', { count: formatNumber({ value: list.length, locale: lang }) })}
      </p>

      {list.length === 0 ? (
        <div class="browse__empty">
          <p>{isFiltered ? t('browse.emptyFiltered') : t('browse.emptyAll')}</p>
          {isFiltered && (
            <Button
              variant="secondary"
              onClick={() => onFiltersChange?.(clearedFilters())}
            >
              {t('browse.clearFilters')}
            </Button>
          )}
        </div>
      ) : isTable ? (
        <DisplayTable {...listProps} sort={sort} onSort={onSort} />
      ) : (
        <DisplayCards {...listProps} />
      )}

      {compareCount > 0 && (
        <div class="browse__compare-bar">
          <Button variant="primary" icon="compare" onClick={() => onGoCompare?.()}>
            {t('browse.compareButton', {
              count: formatNumber({ value: compareCount, locale: lang }),
            })}
          </Button>
        </div>
      )}
    </section>
  )
}
