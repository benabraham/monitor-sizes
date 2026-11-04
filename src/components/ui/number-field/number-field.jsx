import { useEffect, useMemo, useState } from 'preact/hooks'
import { clamp, round } from '../../../lib/math.js'
import './number-field.css'

/** Counter for unique input ids, one per mounted field. */
let fieldSequence = 0

/** Grouped integer with separators, e.g. `1.234.567` or `1,234,567`. */
const GROUPED_INTEGER = /^\d{1,3}([.,]\d{3})+$/

/**
 * Parse a number typed by a person in either decimal convention.
 *
 * Accepts `.` and `,` as the decimal separator, spaces (including no-break spaces)
 * as grouping, and the real minus sign `−` (U+2212). The decimal separator is the
 * last `.` or `,` when both occur, or the only one when it occurs once. A separator
 * that occurs several times, with no other one, is treated as grouping and must
 * group digits in threes.
 *
 * Known ambiguity: a single separator followed by three digits is read as a
 * decimal (`"1,234"` → `1.234`). Locale is not known here; the caller decides how
 * much precision to keep.
 *
 * @param {string} text Raw text from the input.
 * @returns {number | null} The number, or `null` when the text is not a number.
 *
 * @example
 * parseLocaleNumber('24,5') // 24.5
 * parseLocaleNumber('24.5') // 24.5
 * parseLocaleNumber('1.234,5') // 1234.5
 * parseLocaleNumber('3 840') // 3840
 * parseLocaleNumber('−3') // -3
 * parseLocaleNumber('abc') // null
 */
export const parseLocaleNumber = (text) => {
  if (typeof text !== 'string') return null
  const cleaned = text.replace(/[\s   ]/g, '').replace(/−/g, '-')
  const match = /^([+-]?)([\d.,]+)$/.exec(cleaned)
  if (!match) return null

  const [, sign, body] = match
  const lastDot = body.lastIndexOf('.')
  const lastComma = body.lastIndexOf(',')
  let decimalSeparator = null
  if (lastDot !== -1 && lastComma !== -1) {
    decimalSeparator = lastDot > lastComma ? '.' : ','
  } else if (lastDot !== -1 || lastComma !== -1) {
    const only = lastDot !== -1 ? '.' : ','
    if (body.split(only).length === 2) decimalSeparator = only
  }

  let integerPart = body
  let fractionPart = ''
  if (decimalSeparator) {
    const index = body.lastIndexOf(decimalSeparator)
    integerPart = body.slice(0, index)
    fractionPart = body.slice(index + 1)
  }
  if (fractionPart.includes('.') || fractionPart.includes(',')) return null
  if (/[.,]/.test(integerPart) && !GROUPED_INTEGER.test(integerPart)) return null

  const digits = integerPart.replace(/[.,]/g, '')
  if (digits === '' && fractionPart === '') return null

  const value = Number(`${digits || '0'}.${fractionPart || '0'}`)
  if (!Number.isFinite(value)) return null
  if (value === 0) return 0
  return sign === '-' ? -value : value
}

/**
 * Numeric text input with a visible label and a unit suffix.
 *
 * The text is free while typing and is committed on blur or Enter: a valid number
 * is rounded to `decimals`, clamped to `min` and `max`, and sent to `onChange`. An
 * invalid entry is discarded and the last good value is restored. ArrowUp and
 * ArrowDown step the value. An unedited field never calls `onChange`.
 *
 * The unit is linked with `aria-describedby`, so it is announced after the label. Ids
 * passed in `describedBy` (for example an error text) are appended after the unit.
 *
 * @param {object} props
 * @param {import('preact').ComponentChildren} props.label Visible label, also the accessible name.
 * @param {number} props.value Current value.
 * @param {(value: number) => void} [props.onChange] Called with the committed number.
 * @param {import('preact').ComponentChildren} [props.unit] Unit shown after the input, e.g. `'cm'`.
 * @param {number} [props.min] Lowest allowed value; committed values are clamped to it.
 * @param {number} [props.max] Highest allowed value; committed values are clamped to it.
 * @param {number} [props.step=1] Amount added or subtracted by ArrowUp and ArrowDown.
 * @param {number} [props.decimals=0] Decimal places kept on commit and shown in the field.
 * @param {'en'|'cs'} [props.locale='en'] Locale for the displayed decimal separator.
 * @param {string} [props.id] Input id. Generated when omitted.
 * @param {boolean} [props.isInvalid=false] Sets `aria-invalid="true"` on the input.
 * @param {string} [props.describedBy] Space-separated ids that describe the input, such as
 *   an error text. Added to the unit's id.
 * @param {'decimal'|'numeric'|'text'} [props.inputMode='decimal'] Keyboard hint on phones.
 *   Use `'numeric'` for whole numbers.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <NumberField
 *   label="Viewing distance"
 *   unit="cm"
 *   value={distanceCm}
 *   min={20}
 *   max={150}
 *   decimals={0}
 *   locale={locale.value}
 *   onChange={setDistanceCm}
 * />
 */
export const NumberField = ({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  decimals = 0,
  locale = 'en',
  id,
  isInvalid = false,
  describedBy,
  inputMode = 'decimal',
}) => {
  const [generatedId] = useState(() => `number-field-${++fieldSequence}`)
  const inputId = id ?? generatedId
  const unitId = `${inputId}-unit`
  const describedIds = [unit ? unitId : null, describedBy].filter(Boolean).join(' ')

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        useGrouping: false,
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      }),
    [locale, decimals],
  )

  /**
   * Text shown for a number, in the field's locale and precision.
   *
   * @param {number} number
   * @returns {string}
   */
  const formatValue = (number) =>
    Number.isFinite(number) ? formatter.format(number) : ''

  const [text, setText] = useState(() => formatValue(value))

  useEffect(() => {
    setText(formatValue(value))
  }, [value, formatter])

  /**
   * Round to the field's precision and clamp to its range.
   *
   * @param {number} candidate
   * @returns {number}
   */
  const normalise = (candidate) => {
    const rounded = round({ value: candidate, digits: decimals })
    return clamp({ value: rounded, min: min ?? -Infinity, max: max ?? Infinity })
  }

  /**
   * Commit the typed text. Unedited text, or text that is not a number, never
   * changes the value.
   */
  const commit = () => {
    if (text === formatValue(value)) return
    const parsed = parseLocaleNumber(text)
    if (parsed === null) {
      setText(formatValue(value))
      return
    }
    const next = normalise(parsed)
    setText(formatValue(next))
    if (next !== value) onChange?.(next)
  }

  /**
   * Enter commits. ArrowUp and ArrowDown step from the typed value, or from the
   * current value when the text is not a number.
   *
   * @param {KeyboardEvent} event
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
      return
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const direction = event.key === 'ArrowUp' ? 1 : -1
    const base = parseLocaleNumber(text) ?? value
    const next = normalise(base + direction * step)
    setText(formatValue(next))
    if (next !== value) onChange?.(next)
  }

  return (
    <div class="number-field">
      <label class="number-field__label" for={inputId}>
        {label}
      </label>
      <div class="number-field__control">
        <input
          id={inputId}
          class="number-field__input"
          type="text"
          inputmode={inputMode}
          autocomplete="off"
          spellcheck={false}
          value={text}
          aria-invalid={isInvalid ? 'true' : undefined}
          aria-describedby={describedIds || undefined}
          onInput={(event) => setText(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
        {unit && (
          <span id={unitId} class="number-field__unit">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
