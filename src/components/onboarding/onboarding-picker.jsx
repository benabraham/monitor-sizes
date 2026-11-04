import { useState } from 'preact/hooks'
import { locale, t } from '../../i18n/index.js'
import { formatResolution } from '../../lib/format.js'
import { Button } from '../ui/button/button.jsx'
import { Segmented } from '../ui/segmented/segmented.jsx'
import { AddDisplayForm } from '../add-display/add-display-form.jsx'
import { formatDiagonal, groupDisplays, matchesQuery } from './onboarding-model.js'
import './onboarding-picker.css'

/** Counter for unique ids, one per mounted picker. */
let pickerSequence = 0

/**
 * Label of one checkbox: name, diagonal and resolution, for example
 * "MacBook Pro 14″, 14.2″, 3024 × 1964". Built with a message, so the order
 * follows each language.
 *
 * @param {{ name: string, diagonal: number, width: number, height: number }} display
 * @param {'en'|'cs'} lang
 * @returns {string}
 */
const displayLabel = (display, lang) =>
  t('onboarding.displayLabel', {
    name: display.name,
    diagonal: `${formatDiagonal({ diagonal: display.diagonal, locale: lang })}″`,
    resolution: formatResolution({ width: display.width, height: display.height }),
  })

/**
 * Step 1 of onboarding: choose the familiar displays. Shows a unit switch, a search
 * box, the display list grouped by type as checkboxes, and an inline form to add a
 * display that is missing. Nothing is selected at the start.
 *
 * Selection is a set of ids held by the parent, so the pick order (which decides the
 * baseline) stays in one place.
 *
 * @param {object} props
 * @param {Array<{ id: string, name: string, diagonal: number, width: number, height: number, tag?: string }>} props.displays
 *   All displays to list, built-in and custom.
 * @param {'metric'|'imperial'} props.units Active unit system.
 * @param {(units: 'metric'|'imperial') => void} props.onUnitsChange
 * @param {string} props.query Search text.
 * @param {(query: string) => void} props.onQueryChange
 * @param {string[]} props.selectedIds Picked display ids.
 * @param {(display: object) => void} props.onTogglePick Called when a checkbox changes.
 * @param {boolean} props.isAddingOwn Whether the inline add form is open.
 * @param {() => void} props.onOpenAddOwn
 * @param {() => void} props.onCloseAddOwn
 * @param {(payload: object) => void} props.onAddOwnSubmit Called with the form payload.
 * @param {(display: object) => Array<{ scale: number }>} props.scaleOptionsFor
 * @param {() => ({ width: number, height: number, scale: number } | null)} [props.guess]
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <OnboardingPicker
 *   displays={displays}
 *   units={units}
 *   onUnitsChange={setUnits}
 *   query={query}
 *   onQueryChange={setQuery}
 *   selectedIds={selectedIds}
 *   onTogglePick={togglePick}
 *   isAddingOwn={isAddingOwn}
 *   onOpenAddOwn={() => setAddingOwn(true)}
 *   onCloseAddOwn={() => setAddingOwn(false)}
 *   onAddOwnSubmit={handleAddOwn}
 *   scaleOptionsFor={scaleOptionsFor}
 * />
 */
export const OnboardingPicker = ({
  displays,
  units,
  onUnitsChange,
  query,
  onQueryChange,
  selectedIds,
  onTogglePick,
  isAddingOwn,
  onOpenAddOwn,
  onCloseAddOwn,
  onAddOwnSubmit,
  scaleOptionsFor,
  guess,
}) => {
  const lang = locale.value
  const [sequence] = useState(() => ++pickerSequence)
  const searchId = `onboarding-search-${sequence}`
  const addOwnHeadingId = `onboarding-add-own-${sequence}`

  const matching = displays.filter((display) =>
    matchesQuery({ display, query, locale: lang }),
  )
  const groups = groupDisplays(matching)
  const groupLabels = [
    { key: 'laptops', label: t('onboarding.groups.laptops') },
    { key: 'monitors', label: t('onboarding.groups.monitors') },
    { key: 'ultrawides', label: t('onboarding.groups.ultrawides') },
  ]
  const isSelected = (id) => selectedIds.includes(id)

  return (
    <section class="onboarding-picker">
      <p class="onboarding-picker__intro">{t('onboarding.intro')}</p>

      <div class="onboarding-picker__toolbar">
        <Segmented
          name={`onboarding-units-${sequence}`}
          label={t('onboarding.units')}
          options={[
            { value: 'metric', label: t('common.units.metric') },
            { value: 'imperial', label: t('common.units.imperial') },
          ]}
          value={units}
          onChange={onUnitsChange}
        />
        <div class="onboarding-picker__search">
          <label class="onboarding-picker__label" for={searchId}>
            {t('onboarding.search')}
          </label>
          <input
            id={searchId}
            class="onboarding-picker__input"
            type="search"
            autoComplete="off"
            value={query}
            onInput={(event) => onQueryChange(event.currentTarget.value)}
          />
        </div>
      </div>

      <p class="onboarding-picker__count" aria-live="polite">
        {t('onboarding.selectedCount', { count: selectedIds.length })}
      </p>

      {displays.length === 0 && (
        <p class="onboarding-picker__empty">{t('onboarding.noDisplays')}</p>
      )}
      {displays.length > 0 && matching.length === 0 && (
        <p class="onboarding-picker__empty">{t('onboarding.searchEmpty', { query })}</p>
      )}

      <div class="onboarding-picker__groups">
        {groupLabels
          .filter(({ key }) => groups[key].length > 0)
          .map(({ key, label }) => (
            <fieldset class="onboarding-picker__group" key={key}>
              <legend class="onboarding-picker__legend">{label}</legend>
              <div class="onboarding-picker__options">
                {groups[key].map((display) => (
                  <label class="onboarding-picker__option" key={display.id}>
                    <input
                      type="checkbox"
                      checked={isSelected(display.id)}
                      onChange={() => onTogglePick(display)}
                    />
                    <span>{displayLabel(display, lang)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
      </div>

      <div class="onboarding-picker__add-own">
        {isAddingOwn ? (
          <section
            class="onboarding-picker__add-own-panel"
            aria-labelledby={addOwnHeadingId}
          >
            <h2 id={addOwnHeadingId} class="onboarding-picker__subtitle">
              {t('onboarding.addOwnTitle')}
            </h2>
            <AddDisplayForm
              units={units}
              scaleOptionsFor={scaleOptionsFor}
              guess={guess}
              canMarkFamiliar={false}
              submitLabel={t('onboarding.addOwnSubmit')}
              onSubmit={onAddOwnSubmit}
              onCancel={onCloseAddOwn}
            />
          </section>
        ) : (
          <Button variant="secondary" icon="plus" onClick={onOpenAddOwn}>
            {t('onboarding.addOwn')}
          </Button>
        )}
      </div>
    </section>
  )
}
