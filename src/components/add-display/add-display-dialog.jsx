import { t } from '../../i18n/index.js'
import { Dialog } from '../ui/dialog/dialog.jsx'
import { AddDisplayForm } from './add-display-form.jsx'

/**
 * "Add display" dialog: the form in a modal `<dialog>`, titled "Add display", or
 * "Edit display" when `initial.isEditing` is set.
 *
 * The form mounts only while the dialog is open, so every opening starts from the
 * values passed in (no stale draft from an earlier edit). Cancel and Esc call
 * `onClose`. A successful submit calls `onSubmit`; the parent then closes the dialog
 * by setting `isOpen` to false.
 *
 * @param {object} props
 * @param {boolean} props.isOpen Whether the dialog is shown.
 * @param {() => void} props.onClose Called on Esc, close button, backdrop click or Cancel.
 * @param {object} [props.initial] Starting values, as for {@link AddDisplayForm}.
 * @param {'metric'|'imperial'} props.units Unit system for the distance field.
 * @param {(display: object) => Array<{ scale: number }>} props.scaleOptionsFor
 *   Scale options for a display.
 * @param {(payload: object) => void} props.onSubmit Called with the valid payload.
 * @param {string} [props.submitLabel] Submit button text.
 * @param {boolean} [props.canMarkFamiliar=true] Offer the "I know this one" option.
 * @param {() => ({ width: number, height: number, scale: number } | null)} [props.guess]
 *   Screen reader for "Like my screen". Injected for tests.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <AddDisplayDialog
 *   isOpen={isAddOpen}
 *   onClose={() => setAddOpen(false)}
 *   units={units}
 *   scaleOptionsFor={scaleOptionsFor}
 *   onSubmit={(payload) => {
 *     addCustomDisplay(payload)
 *     setAddOpen(false)
 *   }}
 * />
 */
export const AddDisplayDialog = ({ isOpen, onClose, initial, ...formProps }) => {
  const isEditing = initial?.isEditing === true
  const title = t(isEditing ? 'addDisplay.editTitle' : 'addDisplay.title')

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      closeLabel={t('common.close')}
    >
      {isOpen && <AddDisplayForm {...formProps} initial={initial} onCancel={onClose} />}
    </Dialog>
  )
}
