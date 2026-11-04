import { Icon } from '../icon/icon.jsx'
import './chip.css'

/**
 * Small pill for a value or a toggle: a familiar display, the baseline, a filter.
 *
 * Without `onClick` the chip is static (a `span`). With `onClick` it is a toggle
 * button that exposes `aria-pressed`, so screen readers announce its state.
 *
 * Colour is never the only signal: a selected chip also shows a check mark, a
 * familiar chip has a dashed outline, and the baseline (`isAccent`) has a solid
 * accent outline.
 *
 * @param {object} props
 * @param {boolean} [props.isSelected=false] Selected or pressed state.
 * @param {boolean} [props.isAccent=false] Marks the baseline: accent colour and outline.
 * @param {boolean} [props.isDashed=false] Dashed outline, the colour role for familiar displays.
 * @param {(event: MouseEvent) => void} [props.onClick] Makes the chip a toggle button.
 * @param {import('preact').ComponentChildren} props.children Visible text.
 * @param {string} [props.class] Extra class names.
 * @param {import('preact').JSX.HTMLAttributes<HTMLElement>} [props.rest] Passed to the root element.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <Chip isDashed isSelected onClick={toggleFamiliar}>24″ FHD</Chip>
 * <Chip isAccent>Baseline: 24″ FHD</Chip>
 */
export const Chip = ({
  isSelected = false,
  isAccent = false,
  isDashed = false,
  onClick,
  children,
  class: extraClass,
  ...rest
}) => {
  const isToggle = typeof onClick === 'function'
  const classes = [
    'chip',
    isToggle && 'chip--toggle',
    isSelected && 'chip--selected',
    isAccent && 'chip--accent',
    isDashed && 'chip--dashed',
    extraClass,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {isSelected && (
        <span class="chip__icon">
          <Icon name="check" size={12} />
        </span>
      )}
      <span class="chip__label">{children}</span>
    </>
  )

  if (isToggle) {
    return (
      <button
        type="button"
        class={classes}
        aria-pressed={isSelected ? 'true' : 'false'}
        onClick={onClick}
        {...rest}
      >
        {content}
      </button>
    )
  }

  return (
    <span class={classes} {...rest}>
      {content}
    </span>
  )
}
