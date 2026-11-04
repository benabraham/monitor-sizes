import { useState } from 'preact/hooks'
import './slider.css'

/** Counter for unique input ids, one per mounted slider. */
let sliderSequence = 0

/**
 * Range slider on a native `<input type="range">`, with a visible label and value.
 *
 * `valueText` becomes the input's `aria-valuetext`, so a screen reader says
 * "60 cm" instead of "60". It is also shown next to the label. The fill up to the
 * thumb is drawn from the value, so the track carries the same information as the
 * thumb position.
 *
 * @param {object} props
 * @param {import('preact').ComponentChildren} props.label Visible label, also the accessible name.
 * @param {number} props.value Current value.
 * @param {(value: number) => void} [props.onInput] Called with the new number while
 *   the thumb moves.
 * @param {number} [props.min=0] Lowest value.
 * @param {number} [props.max=100] Highest value.
 * @param {number} [props.step=1] Step between values.
 * @param {string} [props.valueText] Human-readable value, e.g. `'80 cm · 150 %'`.
 *   Defaults to the number itself.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <Slider
 *   label="Distance"
 *   value={distance}
 *   min={20}
 *   max={150}
 *   valueText={formatLength({ inches: distance, units, locale })}
 *   onInput={setDistance}
 * />
 */
export const Slider = ({
  label,
  value,
  onInput,
  min = 0,
  max = 100,
  step = 1,
  valueText,
}) => {
  const [generatedId] = useState(() => `slider-${++sliderSequence}`)
  const text = valueText ?? String(value)
  const span = max - min
  const progress = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0

  return (
    <div class="slider">
      <div class="slider__header">
        <label class="slider__label" for={generatedId}>
          {label}
        </label>
        <output class="slider__value" for={generatedId} aria-hidden="true">
          {text}
        </output>
      </div>
      <input
        id={generatedId}
        class="slider__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={text}
        style={{ '--slider-progress': `${progress}%` }}
        onInput={(event) => onInput?.(Number(event.currentTarget.value))}
      />
    </div>
  )
}
