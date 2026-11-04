import { locale, t } from '../../../i18n/index.js'
import { Button } from '../../ui/button/button.jsx'
import { Chip } from '../../ui/chip/chip.jsx'
import { NumberField } from '../../ui/number-field/number-field.jsx'
import { clearedFilters, hasActiveFilters, toggleListValue } from '../browse-filters.js'
import './filter-bar.css'

/**
 * Translated name of a display tag. Unknown tags are shown as they are.
 *
 * @param {string} tag `'laptop'`, `'monitor'` or `'ultrawide'`, or any other tag from the data.
 * @returns {string}
 */
const getTagLabel = (tag) => {
  if (tag === 'laptop') return t('browse.tag.laptop')
  if (tag === 'monitor') return t('browse.tag.monitor')
  if (tag === 'ultrawide') return t('browse.tag.ultrawide')
  return tag
}

/**
 * Search, filters and the comfort toggle above the Browse list (F8, F9).
 *
 * The component is controlled. Every change calls `onChange` with a partial
 * filter object holding only the keys that changed, so the parent merges it into
 * its own state. "Clear filters" sends the whole cleared state, and each diagonal
 * bound has its own clear button, because a number field cannot be emptied by
 * typing.
 *
 * Tags and aspects are chip groups (toggle buttons with `aria-pressed`) inside
 * fieldsets with legends. Each group is hidden when there is nothing to choose.
 *
 * @param {object} props
 * @param {import('../browse-filters.js').BrowseFilters} props.filters Current filter state.
 * @param {string[]} [props.availableTags=[]] Tags present in the data, e.g. `['laptop', 'monitor']`.
 * @param {string[]} [props.availableAspects=[]] Aspect labels present in the data, e.g. `['16:9', '21:9']`.
 * @param {(partial: Partial<import('../browse-filters.js').BrowseFilters>) => void} [props.onChange]
 *   Called with the changed keys only, or with the full cleared state for "Clear filters".
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <FilterBar
 *   filters={filters}
 *   availableTags={['laptop', 'monitor', 'ultrawide']}
 *   availableAspects={['16:9', '21:9']}
 *   onChange={(partial) => setFilters(partial)}
 * />
 */
export const FilterBar = ({
  filters,
  availableTags = [],
  availableAspects = [],
  onChange,
}) => {
  const current = filters ?? clearedFilters()
  const lang = locale.value
  const tags = current.tags ?? []
  const aspects = current.aspects ?? []
  const isActive = hasActiveFilters(current)

  /**
   * @param {Partial<import('../browse-filters.js').BrowseFilters>} partial
   */
  const emit = (partial) => onChange?.(partial)

  return (
    <div class="filter-bar" role="search">
      <div class="filter-bar__row">
        <div class="filter-bar__search">
          <label class="visually-hidden" for="browse-filter-search">
            {t('browse.search')}
          </label>
          <input
            id="browse-filter-search"
            class="filter-bar__input"
            type="search"
            value={current.search ?? ''}
            placeholder={t('browse.searchPlaceholder')}
            autocomplete="off"
            onInput={(event) => emit({ search: event.currentTarget.value })}
          />
        </div>
        <label class="filter-bar__toggle">
          <input
            type="checkbox"
            checked={current.onlyComfortable === true}
            onChange={(event) => emit({ onlyComfortable: event.currentTarget.checked })}
          />
          <span>{t('browse.onlyComfortable')}</span>
        </label>
        {isActive && (
          <Button variant="ghost" size="sm" onClick={() => emit(clearedFilters())}>
            {t('browse.clearFilters')}
          </Button>
        )}
      </div>

      {availableTags.length > 0 && (
        <fieldset class="filter-bar__group">
          <legend class="filter-bar__legend">{t('browse.filterType')}</legend>
          <div class="filter-bar__chips">
            {availableTags.map((tag) => (
              <Chip
                key={tag}
                isSelected={tags.includes(tag)}
                onClick={() =>
                  emit({ tags: toggleListValue({ list: tags, value: tag }) })
                }
              >
                {getTagLabel(tag)}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      {availableAspects.length > 0 && (
        <fieldset class="filter-bar__group">
          <legend class="filter-bar__legend">{t('browse.filterAspect')}</legend>
          <div class="filter-bar__chips">
            {availableAspects.map((aspect) => (
              <Chip
                key={aspect}
                isSelected={aspects.includes(aspect)}
                onClick={() =>
                  emit({ aspects: toggleListValue({ list: aspects, value: aspect }) })
                }
              >
                {aspect}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset class="filter-bar__group">
        <legend class="filter-bar__legend">{t('browse.filterDiagonal')}</legend>
        <div class="filter-bar__range">
          <div class="filter-bar__range-field">
            <NumberField
              id="browse-filter-min"
              label={t('browse.diagonalMin')}
              value={current.minDiagonal ?? null}
              unit="in"
              min={0}
              max={200}
              decimals={1}
              locale={lang}
              onChange={(minDiagonal) => emit({ minDiagonal })}
            />
            {current.minDiagonal != null && (
              <Button
                variant="ghost"
                size="sm"
                icon="close"
                aria-label={t('browse.clearMin')}
                onClick={() => emit({ minDiagonal: null })}
              />
            )}
          </div>
          <div class="filter-bar__range-field">
            <NumberField
              id="browse-filter-max"
              label={t('browse.diagonalMax')}
              value={current.maxDiagonal ?? null}
              unit="in"
              min={0}
              max={200}
              decimals={1}
              locale={lang}
              onChange={(maxDiagonal) => emit({ maxDiagonal })}
            />
            {current.maxDiagonal != null && (
              <Button
                variant="ghost"
                size="sm"
                icon="close"
                aria-label={t('browse.clearMax')}
                onClick={() => emit({ maxDiagonal: null })}
              />
            )}
          </div>
        </div>
      </fieldset>
    </div>
  )
}
