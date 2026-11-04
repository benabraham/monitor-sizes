import { useState } from 'preact/hooks'
import { formatScale } from '../../lib/format.js'
import { parseScaleInput } from '../../lib/scales.js'
import { locale as localeSignal, t } from '../../i18n/index.js'
import { Button, Chip } from '../ui/index.js'
import './custom-scales.css'

/** Smallest and largest custom scale, as factors (PRD F21: 50–400 %). */
export const CUSTOM_SCALE_RANGE = Object.freeze({ min: 0.5, max: 4 })

/**
 * Custom OS scales beyond the preset (F21): a list of removable chips and a field to
 * add one. The field takes `133`, `133 %`, `1.33` or `1,33` (see `parseScaleInput`).
 *
 * - An invalid entry shows an error and is not sent. The error is linked to the field
 *   with `aria-describedby` and announced.
 * - A scale already in the list is refused with its own message.
 * - Each chip has a remove button named "Remove 133 %".
 *
 * @param {object} props
 * @param {number[]} [props.scales=[]] Custom scale factors, e.g. `[1.33]`.
 * @param {(scale: number) => void} [props.onAdd] Called with the parsed factor, e.g. `1.33`.
 * @param {(scale: number) => void} [props.onRemove] Called with the factor to remove.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CustomScales scales={[1.33]} onAdd={addScale} onRemove={removeScale} />
 */
export const CustomScales = ({ scales = [], onAdd, onRemove }) => {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const locale = localeSignal.value
  const sorted = [...scales].sort((first, second) => first - second)

  /**
   * Parse the field and add the scale, or show why it cannot be added.
   *
   * @param {SubmitEvent} event
   */
  const handleSubmit = (event) => {
    event.preventDefault()
    const factor = parseScaleInput(text)
    if (factor === null) {
      setError('invalid')
      return
    }
    if (scales.includes(factor)) {
      setError('duplicate')
      return
    }
    setError(null)
    setText('')
    onAdd?.(factor)
  }

  const errorMessage =
    error === 'invalid'
      ? t('settings.customScales.invalid', {
          min: formatScale({ scale: CUSTOM_SCALE_RANGE.min, locale }),
          max: formatScale({ scale: CUSTOM_SCALE_RANGE.max, locale }),
        })
      : error === 'duplicate'
        ? t('settings.customScales.duplicate')
        : null

  return (
    <div class="custom-scales">
      {sorted.length > 0 ? (
        <ul class="custom-scales__list" aria-label={t('settings.customScales.title')}>
          {sorted.map((factor) => {
            const label = formatScale({ scale: factor, locale })
            return (
              <li class="custom-scales__item" key={factor}>
                <Chip>{label}</Chip>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="close"
                  aria-label={t('settings.customScales.remove', { scale: label })}
                  onClick={() => onRemove?.(factor)}
                />
              </li>
            )
          })}
        </ul>
      ) : (
        <p class="custom-scales__empty">{t('settings.customScales.empty')}</p>
      )}
      <form class="custom-scales__form" onSubmit={handleSubmit} noValidate>
        <div class="custom-scales__field">
          <label class="custom-scales__label" for="custom-scale-input">
            {t('settings.customScales.inputLabel')}
          </label>
          <input
            id="custom-scale-input"
            class="custom-scales__input"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder={t('settings.customScales.placeholder')}
            value={text}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorMessage ? 'custom-scale-error' : undefined}
            onInput={(event) => {
              setText(event.currentTarget.value)
              setError(null)
            }}
          />
        </div>
        <Button type="submit" variant="secondary" size="md" icon="plus">
          {t('common.add')}
        </Button>
      </form>
      {errorMessage && (
        <p class="custom-scales__error" id="custom-scale-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
