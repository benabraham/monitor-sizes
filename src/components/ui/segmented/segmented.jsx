import './segmented.css'

/**
 * Make every radio in the group match `value`. A controlled radio whose `checked`
 * prop did not change keeps the state the browser gave it on click, so the group
 * is re-synced after every change.
 *
 * @param {object} params
 * @param {HTMLElement | null} params.group The `fieldset` holding the radios.
 * @param {string|number} params.value The value the component currently shows.
 * @returns {void}
 */
const syncCheckedState = ({ group, value }) => {
  if (!group) return
  group.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.checked = radio.value === String(value)
  })
}

/**
 * Segmented control: one choice from a few short options (units, language, preset).
 *
 * Built as a `fieldset` with a `legend` and real radio inputs, so screen readers
 * announce "group, radio button, n of m", and arrow keys move the selection natively.
 * The radios are visually hidden; the segments are styled labels.
 *
 * @param {object} props
 * @param {string} props.name Radio group name. Must be unique on the page.
 * @param {import('preact').ComponentChildren} props.label Group label, the legend.
 * @param {boolean} [props.isLabelHidden=false] Keep the legend for assistive
 *   technology only, e.g. when a visible heading already names the control.
 * @param {Array<{ value: string|number, label: import('preact').ComponentChildren,
 *   isDisabled?: boolean }>} props.options Choices, in display order.
 * @param {string|number} props.value Value of the selected option.
 * @param {(value: string|number) => void} [props.onChange] Called with the chosen
 *   option's `value` when the selection changes.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <Segmented
 *   name="units"
 *   label="Units"
 *   options={[
 *     { value: 'metric', label: 'cm' },
 *     { value: 'imperial', label: 'in' },
 *   ]}
 *   value={units}
 *   onChange={setUnits}
 * />
 */
export const Segmented = ({
  name,
  label,
  isLabelHidden = false,
  options,
  value,
  onChange,
}) => (
  <fieldset class="segmented">
    <legend
      class={isLabelHidden ? 'segmented__legend visually-hidden' : 'segmented__legend'}
    >
      {label}
    </legend>
    <div class="segmented__options">
      {options.map((option) => (
        <label class="segmented__option" key={String(option.value)}>
          <input
            class="segmented__input"
            type="radio"
            name={name}
            value={String(option.value)}
            checked={option.value === value}
            disabled={option.isDisabled}
            onChange={(event) => {
              onChange?.(option.value)
              syncCheckedState({
                group: event.currentTarget.closest('fieldset'),
                value,
              })
            }}
          />
          <span class="segmented__text">{option.label}</span>
        </label>
      ))}
    </div>
  </fieldset>
)
