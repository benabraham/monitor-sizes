import { Icon } from '../icon/icon.jsx'
import './button.css'

/**
 * Whether a child node renders anything visible or readable.
 *
 * @param {import('preact').ComponentChildren} node
 * @returns {boolean}
 */
const hasContent = (node) => {
  if (node === undefined || node === null || node === false || node === '') return false
  if (Array.isArray(node)) return node.some(hasContent)
  return true
}

/**
 * Native button with the app's variants and sizes. Renders `type="button"` unless
 * overridden, so it never submits a surrounding form by accident.
 *
 * Icon-only buttons (no children) must have an accessible name: pass `aria-label`.
 * In development a missing name logs a warning.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant='secondary'] Visual role.
 * @param {'md'|'sm'} [props.size='md'] `sm` is 28 px tall, `md` is 36 px.
 * @param {string|import('preact').ComponentChildren} [props.icon] Icon name from the
 *   icon set (e.g. `'plus'`), or any node to render as the icon. It is decorative.
 * @param {import('preact').ComponentChildren} [props.children] Visible label.
 * @param {string} [props.class] Extra class names, appended to the component's own.
 * @param {import('preact').JSX.HTMLAttributes<HTMLButtonElement>} [props.rest]
 *   Every other prop is passed to the native `<button>`: `onClick`, `disabled`,
 *   `aria-label`, `aria-pressed`, `popovertarget`, `ref`, and so on.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <Button variant="primary" icon="plus">Add display</Button>
 * <Button variant="ghost" size="sm" icon="close" aria-label="Close" />
 */
export const Button = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  class: extraClass,
  ...rest
}) => {
  const isIconOnly = !hasContent(children)
  const hasAccessibleName = Boolean(rest['aria-label'] || rest['aria-labelledby'])
  if (import.meta.env.DEV && isIconOnly && !hasAccessibleName) {
    console.warn('Button: an icon-only button needs an aria-label')
  }

  const iconSize = size === 'sm' ? 14 : 16
  const iconNode = typeof icon === 'string' ? <Icon name={icon} size={iconSize} /> : icon
  const classes = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    isIconOnly && 'button--icon-only',
    extraClass,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" class={classes} {...rest}>
      {hasContent(iconNode) && <span class="button__icon">{iconNode}</span>}
      {hasContent(children) && <span class="button__label">{children}</span>}
    </button>
  )
}
