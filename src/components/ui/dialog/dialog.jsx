import { useEffect, useRef, useState } from 'preact/hooks'
import { Button } from '../button/button.jsx'
import './dialog.css'

/** Counter for unique title ids, one per mounted dialog. */
let dialogSequence = 0

/** Elements that Tab can reach. Disabled and hidden-input elements are filtered out below. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The controls inside a dialog that Tab can reach, in document order. Controls in a
 * `hidden` subtree are left out.
 *
 * @param {HTMLElement} element
 * @returns {HTMLElement[]}
 *
 * @example
 * focusableIn(dialogElement) // [closeButton, input, saveButton]
 */
const focusableIn = (element) =>
  [...element.querySelectorAll(FOCUSABLE)].filter((node) => !node.closest('[hidden]'))

/**
 * Open the dialog modally. Falls back to the `open` attribute where `showModal`
 * is missing (jsdom, very old engines).
 *
 * @param {HTMLDialogElement} element
 * @returns {void}
 */
const openDialog = (element) => {
  if (typeof element.showModal === 'function') {
    element.showModal()
    return
  }
  element.setAttribute('open', '')
}

/**
 * Close the dialog. Falls back to removing the `open` attribute where `close` is
 * missing.
 *
 * @param {HTMLDialogElement} element
 * @returns {void}
 */
const closeDialog = (element) => {
  if (typeof element.close === 'function') {
    element.close()
    return
  }
  element.removeAttribute('open')
}

/**
 * Modal dialog on the native `<dialog>` element, controlled by `isOpen`.
 *
 * - Labelled by its title (`aria-labelledby`).
 * - Esc and the close button call `onClose`; the dialog closes when `isOpen` turns
 *   false, so the parent stays the single source of truth.
 * - A click on the backdrop (outside the panel) also calls `onClose`.
 * - Full-screen sheet below 600 px wide, centred card above.
 * - Focus moves into the dialog on open and returns to the opener on close, as
 *   the browser does for `showModal()`.
 * - Tab and Shift+Tab stay inside the dialog. A modal dialog does not stop focus from
 *   leaving at its last control, so the first and last controls wrap to each other.
 *
 * @param {object} props
 * @param {boolean} props.isOpen Whether the dialog is shown.
 * @param {() => void} [props.onClose] Called on Esc, close button, backdrop click or
 *   a native close request. The parent should set `isOpen` to false.
 * @param {import('preact').ComponentChildren} props.title Heading text. Also the
 *   accessible name of the dialog.
 * @param {import('preact').ComponentChildren} props.children Body content.
 * @param {import('preact').ComponentChildren} [props.footer] Action row, e.g. buttons.
 * @param {string} [props.closeLabel='Close'] Accessible name of the close button.
 *   Pass a translated string; the English default is only a fallback.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <Dialog
 *   isOpen={isAddOpen}
 *   onClose={() => setAddOpen(false)}
 *   title="Add display"
 *   closeLabel={t('common.close')}
 *   footer={<Button variant="primary">Save</Button>}
 * >
 *   <AddDisplayForm />
 * </Dialog>
 */
export const Dialog = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeLabel = 'Close',
}) => {
  const dialogRef = useRef(null)
  const isOpenRef = useRef(isOpen)
  const [titleId] = useState(() => `dialog-title-${++dialogSequence}`)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    const element = dialogRef.current
    if (!element) return
    const isShown = element.hasAttribute('open')
    if (isOpen && !isShown) openDialog(element)
    if (!isOpen && isShown) closeDialog(element)
  }, [isOpen])

  useEffect(() => {
    const element = dialogRef.current
    if (!element) return undefined

    /**
     * Esc: keep the browser from closing the dialog on its own. The parent closes
     * it by setting `isOpen` to false.
     *
     * @param {Event} event
     */
    const handleCancel = (event) => {
      event.preventDefault()
      onClose?.()
    }

    /**
     * The dialog closed without the parent asking (form with `method="dialog"`,
     * for example). Report it once so the parent state matches.
     */
    const handleClose = () => {
      if (isOpenRef.current) onClose?.()
    }

    element.addEventListener('cancel', handleCancel)
    element.addEventListener('close', handleClose)
    return () => {
      element.removeEventListener('cancel', handleCancel)
      element.removeEventListener('close', handleClose)
    }
  }, [onClose])

  /**
   * Tab from the last control moves to the first, and Shift+Tab from the first to the last.
   * Other keys, and controls in between, keep the browser's own focus order.
   *
   * @param {KeyboardEvent} event
   */
  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return
    const controls = focusableIn(dialogRef.current)
    if (controls.length === 0) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    const active = document.activeElement
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  /**
   * A click whose target is the `<dialog>` itself lands on the backdrop, because
   * the panel covers the whole content box.
   *
   * @param {MouseEvent} event
   */
  const handleBackdropClick = (event) => {
    if (event.target !== dialogRef.current) return
    onClose?.()
  }

  return (
    <dialog
      ref={dialogRef}
      class="dialog"
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div class="dialog__panel">
        <header class="dialog__header">
          <h2 id={titleId} class="dialog__title">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            icon="close"
            aria-label={closeLabel}
            onClick={() => onClose?.()}
          />
        </header>
        <div class="dialog__body">{children}</div>
        {footer && <footer class="dialog__footer">{footer}</footer>}
      </div>
    </dialog>
  )
}
