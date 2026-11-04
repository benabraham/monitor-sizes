import { useId, useState } from 'preact/hooks'
import { locale, t } from '../../i18n/index.js'
import { formatResolution } from '../../lib/format.js'
import { formatDisplayLabel } from '../compare-visual/format-helpers.js'
import { Button } from '../ui/button/button.jsx'

/**
 * The text that identifies a display in the add field: its short name, then its
 * resolution, so two displays with the same name stay apart.
 *
 * @param {object} params
 * @param {import('../../lib/storage.js').Display} params.display
 * @param {'en'|'cs'} params.lang UI language.
 * @returns {string}
 *
 * @example
 * addLabelOf({ display: { name: 'FHD', diagonal: 24, width: 1920, height: 1080 }, lang: 'en' })
 * // '24″ FHD · 1920 × 1080'
 */
export const addLabelOf = ({ display, lang }) =>
  `${formatDisplayLabel({ display, locale: lang })} · ${formatResolution({
    width: display.width,
    height: display.height,
  })}`

/**
 * Badge text for a compared entry: baseline, familiar or candidate.
 *
 * @param {{ isBaseline: boolean, isFamiliar: boolean }} entry
 * @returns {{ kind: 'baseline'|'familiar'|'candidate', text: string }}
 */
const badgeOf = ({ isBaseline, isFamiliar }) => {
  if (isBaseline) return { kind: 'baseline', text: t('compareVisual.badge.baseline') }
  if (isFamiliar) return { kind: 'familiar', text: t('compareVisual.badge.familiar') }
  return { kind: 'candidate', text: t('compareVisual.badge.candidate') }
}

/**
 * Who is in the comparison, and how to change it (PRD F13, F14). It holds the add field,
 * a list of the compared displays with their badge, and the hidden familiar displays.
 *
 * - Add: a text box with a suggestion list of the displays that are not compared yet.
 *   Submitting a label from the list adds that display. Anything else is refused with a
 *   message.
 * - Familiar displays can be hidden from Compare and shown again. The baseline stays.
 * - Candidates can be removed from Compare.
 *
 * The distances and scales are edited in the visualization, not here. Every change
 * goes out through a callback.
 *
 * @param {object} props
 * @param {object[]} [props.entries=[]] CompareEntry objects, baseline first.
 * @param {import('../../lib/storage.js').Display[]} [props.hiddenFamiliar=[]] Familiar
 *   displays hidden in Compare.
 * @param {import('../../lib/storage.js').Display[]} [props.addable=[]] Displays that can
 *   be added to Compare.
 * @param {(id: string) => void} [props.onToggleCompare] Adds or removes a candidate.
 * @param {(id: string) => void} [props.onToggleFamiliarHidden] Hides or shows a familiar display.
 * @param {() => void} [props.onGoBrowse] Shown with the empty hint, to return to Browse.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CompareManager
 *   entries={compareEntries}
 *   addable={addable}
 *   onToggleCompare={(id) => toggleCompare(id)}
 *   onToggleFamiliarHidden={(id) => toggleFamiliarHidden(id)}
 * />
 */
export const CompareManager = ({
  entries = [],
  hiddenFamiliar = [],
  addable = [],
  onToggleCompare,
  onToggleFamiliarHidden,
  onGoBrowse,
}) => {
  const idBase = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const lang = locale.value

  const inputId = `${idBase}-add`
  const listId = `${idBase}-options`
  const hintId = `${idBase}-add-hint`
  const errorId = `${idBase}-add-error`
  const headingId = `${idBase}-heading`
  const hasError = error !== ''
  const addDescribedBy = [hintId, hasError ? errorId : null].filter(Boolean).join(' ')

  /**
   * Add the display whose label was typed or picked. A label that matches nothing is
   * refused, and the text stays so it can be fixed.
   *
   * @param {Event} event
   */
  const handleSubmit = (event) => {
    event.preventDefault()
    const typed = text.trim()
    const match = addable.find((display) => addLabelOf({ display, lang }) === typed)
    if (!match) {
      setError(t('app.compare.addNotFound'))
      return
    }
    onToggleCompare?.(match.id)
    setText('')
    setError('')
  }

  const isShortList = entries.length < 2

  return (
    <section class="compare-manager" aria-labelledby={headingId}>
      <h2 id={headingId} class="compare-manager__heading">
        {t('app.compare.manageHeading')}
      </h2>

      {isShortList && (
        <div class="compare-manager__empty">
          <p class="compare-manager__hint">{t('app.compare.empty')}</p>
          {onGoBrowse && (
            <Button
              variant="secondary"
              size="sm"
              icon="compare"
              onClick={() => onGoBrowse()}
            >
              {t('app.compare.goBrowse')}
            </Button>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <ul class="compare-manager__list">
          {entries.map((entry) => {
            const { display } = entry
            const badge = badgeOf(entry)
            const label = formatDisplayLabel({ display, locale: lang })
            return (
              <li class="compare-manager__item" key={display.id}>
                <span class="compare-manager__name">{label}</span>
                <span
                  class={`compare-manager__badge compare-manager__badge--${badge.kind}`}
                >
                  {badge.text}
                </span>
                {!entry.isBaseline && entry.isFamiliar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('app.compare.hideName', { name: label })}
                    onClick={() => onToggleFamiliarHidden?.(display.id)}
                  >
                    {t('app.compare.hide')}
                  </Button>
                )}
                {!entry.isFamiliar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('app.compare.removeName', { name: label })}
                    onClick={() => onToggleCompare?.(display.id)}
                  >
                    {t('app.compare.remove')}
                  </Button>
                )}
              </li>
            )
          })}
          {hiddenFamiliar.map((display) => {
            const label = formatDisplayLabel({ display, locale: lang })
            return (
              <li
                class="compare-manager__item compare-manager__item--hidden"
                key={display.id}
              >
                <span class="compare-manager__name">{label}</span>
                <span class="compare-manager__badge compare-manager__badge--familiar">
                  {t('compareVisual.badge.familiar')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('app.compare.showName', { name: label })}
                  onClick={() => onToggleFamiliarHidden?.(display.id)}
                >
                  {t('app.compare.show')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <form class="compare-manager__add" noValidate onSubmit={handleSubmit}>
        <label class="compare-manager__label" for={inputId}>
          {t('app.compare.addLabel')}
        </label>
        <div class="compare-manager__row">
          <input
            id={inputId}
            class="compare-manager__input"
            type="text"
            list={listId}
            autoComplete="off"
            spellcheck={false}
            value={text}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={addDescribedBy}
            onInput={(event) => {
              setText(event.currentTarget.value)
              setError('')
            }}
          />
          <datalist id={listId}>
            {addable.map((display) => (
              <option key={display.id} value={addLabelOf({ display, lang })} />
            ))}
          </datalist>
          <Button type="submit" variant="secondary" icon="plus">
            {t('app.compare.addSubmit')}
          </Button>
        </div>
        <p id={hintId} class="compare-manager__hint">
          {t('app.compare.addHint')}
        </p>
        {hasError && (
          <p id={errorId} class="compare-manager__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
