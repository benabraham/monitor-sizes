import { useState } from 'preact/hooks'
import { locale, t } from '../../i18n/index.js'
import { formatLength, formatResolution, formatScale } from '../../lib/format.js'
import { fromDisplayLength, lengthUnitLabel, toDisplayLength } from '../../lib/units.js'
import { Button, Icon, NumberField, Slider } from '../ui/index.js'
import { formatDisplayLabel, lengthDigits } from './format-helpers.js'
import './distance-control.css'

/**
 * Slider and number-field range for the viewing distance, in the display unit
 * (PRD: 30–250 cm, or 12–100 in).
 */
const DISTANCE_RANGE = Object.freeze({
  metric: { min: 30, max: 250, step: 1 },
  imperial: { min: 12, max: 100, step: 0.5 },
})

/** Counter for unique ids, one per mounted control. */
let distanceSequence = 0

/**
 * Text of one scale option: the percentage, the macOS "looks like" resolution when
 * there is one, and a check mark for comfortable scales.
 *
 * @param {object} params
 * @param {object} params.option A scale row (`scale`, optional `looksLikeWidth`, `isComfortable`).
 * @param {{ width: number, height: number }} params.display Native pixels, for the logical height.
 * @param {'en'|'cs'} params.currentLocale
 * @returns {string}
 *
 * @example
 * scaleOptionLabel({ option: { scale: 1.25, isComfortable: true }, display, currentLocale: 'en' })
 * // '125 % ✓'
 */
const scaleOptionLabel = ({ option, display, currentLocale }) => {
  const percent = formatScale({ scale: option.scale, locale: currentLocale })
  const looksLike = option.looksLikeWidth
    ? ` · ${t('compareVisual.scale.looksLike', {
        resolution: formatResolution({
          width: option.looksLikeWidth,
          height: (option.looksLikeWidth * display.height) / display.width,
        }),
      })}`
    : ''
  const mark = option.isComfortable ? ' ✓' : ''
  return `${percent}${looksLike}${mark}`
}

/**
 * Scale options to offer: the given rows, plus the entry's own scale when it is
 * missing from them (so the select always shows the current value). Sorted by scale.
 *
 * @param {object[]} scaleOptions
 * @param {number} scale The entry's current scale.
 * @returns {object[]}
 */
const withCurrentScale = (scaleOptions, scale) => {
  const hasCurrent = scaleOptions.some((option) => option.scale === scale)
  const options = hasCurrent ? [...scaleOptions] : [...scaleOptions, { scale }]
  return options.sort((a, b) => a.scale - b.scale)
}

/**
 * Badge text and style for an entry: baseline, familiar or compared.
 *
 * @param {object} entry CompareEntry.
 * @returns {{ variant: 'baseline'|'familiar'|'candidate', text: string }}
 */
const badgeOf = (entry) => {
  if (entry.isBaseline) {
    return { variant: 'baseline', text: t('compareVisual.badge.baseline') }
  }
  if (entry.isFamiliar) {
    return { variant: 'familiar', text: t('compareVisual.badge.familiar') }
  }
  return { variant: 'candidate', text: t('compareVisual.badge.candidate') }
}

/**
 * One compared display's controls: name and badge, the viewing distance (slider and
 * exact number), the OS scale and, for candidates, the three match buttons (PRD F13,
 * F15).
 *
 * Callbacks receive canonical values. `onDistanceChange` gets inches whatever the
 * unit system, `onScaleChange` gets the scale factor (1.25), and
 * `onApplyEquivalent` gets the match kind: `'sameSize'`, `'sameSharpness'` or
 * `'sameTextSize'`. The match buttons appear only for candidates with an equivalent
 * distance, that is, when a baseline exists.
 *
 * @param {object} props
 * @param {object} props.entry CompareEntry of this display.
 * @param {'metric'|'imperial'} [props.units='metric'] Unit system for the distance controls.
 * @param {(distance: number) => void} [props.onDistanceChange] Called with the distance in inches.
 * @param {(scale: number) => void} [props.onScaleChange] Called with the scale factor.
 * @param {(kind: 'sameSize'|'sameSharpness'|'sameTextSize') => void} [props.onApplyEquivalent]
 * @param {object[]} [props.scaleOptions=[]] Scale rows (MatrixRow-like, with
 *   `isComfortable` and optional `looksLikeWidth`), listed in the Scale select.
 * @returns {import('preact').JSX.Element | null} `null` when there is no entry.
 *
 * @example
 * <DistanceControl
 *   entry={entry}
 *   units="metric"
 *   scaleOptions={entry.matrix}
 *   onDistanceChange={(distance) => setDistance(entry.display.id, distance)}
 *   onScaleChange={(scale) => setScale(entry.display.id, scale)}
 *   onApplyEquivalent={(kind) => applyEquivalent(entry.display.id, kind)}
 * />
 */
export const DistanceControl = ({
  entry,
  units = 'metric',
  onDistanceChange,
  onScaleChange,
  onApplyEquivalent,
  scaleOptions = [],
}) => {
  const [idPrefix] = useState(() => `distance-control-${++distanceSequence}`)
  if (!entry) return null

  const currentLocale = locale.value
  const { display, distance, scale, equivalent, isBaseline } = entry
  const range = units === 'imperial' ? DISTANCE_RANGE.imperial : DISTANCE_RANGE.metric
  const digits = lengthDigits(units)
  const displayValue = toDisplayLength({ inches: distance, units })
  const distanceText = formatLength({
    inches: distance,
    units,
    locale: currentLocale,
    digits,
  })
  const badge = badgeOf(entry)
  const nameId = `${idPrefix}-name`
  const selectId = `${idPrefix}-scale`
  const hintId = `${idPrefix}-scale-hint`
  const options = withCurrentScale(scaleOptions, scale)

  /**
   * Convert a value typed or slid in the display unit back to inches.
   *
   * @param {number} value
   */
  const emitDistance = (value) => onDistanceChange?.(fromDisplayLength({ value, units }))

  const matches = equivalent
    ? [
        {
          kind: 'sameSize',
          label: t('compareVisual.match.sameSize'),
          inches: equivalent.sameSize,
        },
        {
          kind: 'sameSharpness',
          label: t('compareVisual.match.sameSharpness'),
          inches: equivalent.sameSharpness,
        },
        {
          kind: 'sameTextSize',
          label: t('compareVisual.match.sameTextSize'),
          inches: equivalent.sameTextSize,
        },
      ]
    : []

  return (
    <div class="distance-control" role="group" aria-labelledby={nameId}>
      <div class="distance-control__header">
        <p class="distance-control__name" id={nameId}>
          {formatDisplayLabel({ display, locale: currentLocale })}
        </p>
        <span class={`distance-control__badge distance-control__badge--${badge.variant}`}>
          {badge.variant === 'familiar' && <Icon name="star-filled" size={12} />}
          {badge.text}
        </span>
      </div>

      <div class="distance-control__distance">
        <div class="distance-control__slider">
          <Slider
            label={t('compareVisual.distance.label')}
            value={displayValue}
            min={range.min}
            max={range.max}
            step={range.step}
            valueText={distanceText}
            onInput={emitDistance}
          />
        </div>
        <div class="distance-control__number">
          <NumberField
            label={t('compareVisual.distance.exact')}
            value={displayValue}
            min={range.min}
            max={range.max}
            step={range.step}
            decimals={digits}
            unit={lengthUnitLabel(units)}
            locale={currentLocale}
            onChange={emitDistance}
          />
        </div>
      </div>

      <div class="distance-control__scale">
        <label class="distance-control__label" for={selectId}>
          {t('common.scale')}
        </label>
        <select
          id={selectId}
          class="distance-control__select"
          aria-describedby={hintId}
          onChange={(event) => onScaleChange?.(Number(event.currentTarget.value))}
        >
          {options.map((option) => (
            <option
              key={String(option.scale)}
              value={String(option.scale)}
              selected={option.scale === scale}
            >
              {scaleOptionLabel({ option, display, currentLocale })}
            </option>
          ))}
        </select>
        <p class="distance-control__hint" id={hintId}>
          {t('compareVisual.scale.hint')}
        </p>
      </div>

      {matches.length > 0 && !isBaseline && (
        <div
          class="distance-control__matches"
          role="group"
          aria-labelledby={`${idPrefix}-match`}
        >
          <p class="distance-control__matches-heading" id={`${idPrefix}-match`}>
            {t('compareVisual.match.heading')}
          </p>
          <ul class="distance-control__match-list">
            {matches.map((match) => {
              const targetText = formatLength({
                inches: match.inches,
                units,
                locale: currentLocale,
                digits,
              })
              const descriptionId = `${idPrefix}-${match.kind}-description`
              return (
                <li class="distance-control__match" key={match.kind}>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-describedby={descriptionId}
                    onClick={() => onApplyEquivalent?.(match.kind)}
                  >
                    {match.label}
                  </Button>
                  <span class="distance-control__match-value" aria-hidden="true">
                    {targetText}
                  </span>
                  <span class="visually-hidden" id={descriptionId}>
                    {t('compareVisual.match.description', { distance: targetText })}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
