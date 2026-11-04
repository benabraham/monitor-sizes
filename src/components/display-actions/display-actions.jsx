import { useEffect, useRef, useState } from 'preact/hooks'
import { locale, t } from '../../i18n/index.js'
import { formatResolution } from '../../lib/format.js'
import { formatDiagonal } from '../browse/browse-format.js'
import { Button } from '../ui/button/button.jsx'
import { Dialog } from '../ui/dialog/dialog.jsx'
import './display-actions.css'

/**
 * Label of the Compare action. A familiar display is hidden or shown in Compare, and a
 * candidate is added or removed.
 *
 * @param {object} params
 * @param {boolean} params.isFamiliar
 * @param {boolean} params.isCompared
 * @returns {string}
 */
const compareActionLabel = ({ isFamiliar, isCompared }) => {
  if (isFamiliar) {
    return isCompared ? t('app.actions.hideFromCompare') : t('app.actions.showInCompare')
  }
  return isCompared ? t('app.actions.removeFromCompare') : t('app.actions.addToCompare')
}

/**
 * Actions for one display, in a dialog. Opened by pressing the display's name in
 * Browse. It shows the name as the title, the diagonal and resolution, and the actions
 * that apply to the display:
 *
 * - Familiar: mark or unmark (star). A familiar display can be made the baseline.
 * - Compare: add or remove a candidate; for a familiar display, hide it in Compare or show
 *   it again. The baseline is always compared.
 * - Custom displays: Edit (the parent opens the form) and Delete. Delete asks for
 *   confirmation first, and the confirmation names the display.
 * - Built-in displays: hide from the list. Settings shows them again.
 *
 * Every action calls a callback, so the parent owns the state. Delete waits for a second
 * press, and that press moves focus to the confirmation, with Cancel as the default.
 *
 * @param {object} props
 * @param {boolean} props.isOpen Whether the dialog is shown.
 * @param {() => void} [props.onClose] Called on Esc, close button or backdrop click.
 * @param {import('../../lib/storage.js').Display|null} [props.display=null] The display, or
 *   `null` while the dialog is closed.
 * @param {boolean} [props.isFamiliar=false] The display is in the familiar set.
 * @param {boolean} [props.isBaseline=false] The display is the baseline.
 * @param {boolean} [props.isCompared=false] The display is shown in Compare.
 * @param {() => void} [props.onToggleFamiliar] Star pressed.
 * @param {() => void} [props.onSetBaseline] "Make this the baseline" pressed.
 * @param {() => void} [props.onToggleCompare] Compare action pressed.
 * @param {() => void} [props.onEdit] Edit pressed (custom displays).
 * @param {() => void} [props.onDelete] Delete confirmed (custom displays).
 * @param {() => void} [props.onHide] "Hide from list" pressed (built-in displays).
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <DisplayActions
 *   isOpen={actionsId !== null}
 *   display={actionsDisplay}
 *   isFamiliar={isFamiliar}
 *   isBaseline={isBaseline}
 *   isCompared={isCompared}
 *   onClose={closeActions}
 *   onToggleFamiliar={() => toggleFamiliar(actionsId)}
 *   onDelete={() => deleteCustomDisplay(actionsId)}
 * />
 */
export const DisplayActions = ({
  isOpen,
  onClose,
  display = null,
  isFamiliar = false,
  isBaseline = false,
  isCompared = false,
  onToggleFamiliar,
  onSetBaseline,
  onToggleCompare,
  onEdit,
  onDelete,
  onHide,
}) => {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false)
  const confirmRef = useRef(null)
  const lang = locale.value
  const name = display?.name ?? ''
  const isCustom = display?.isCustom === true

  useEffect(() => {
    if (!isOpen) setConfirmingDelete(false)
  }, [isOpen])

  useEffect(() => {
    if (isConfirmingDelete) confirmRef.current?.focus()
  }, [isConfirmingDelete])

  const compareLabel = compareActionLabel({ isFamiliar, isCompared })

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={name} closeLabel={t('common.close')}>
      {display && (
        <div class="display-actions">
          <dl class="display-actions__facts">
            <div>
              <dt>{t('metrics.diagonal.label')}</dt>
              <dd class="numeric">
                {formatDiagonal({ diagonal: display.diagonal, locale: lang })}
              </dd>
            </div>
            <div>
              <dt>{t('metrics.resolution.label')}</dt>
              <dd class="numeric">
                {formatResolution({ width: display.width, height: display.height })}
              </dd>
            </div>
          </dl>

          <section class="display-actions__group" aria-label={t('common.familiar')}>
            <Button
              variant={isFamiliar ? 'secondary' : 'primary'}
              icon={isFamiliar ? 'star-filled' : 'star'}
              onClick={() => onToggleFamiliar?.()}
            >
              {isFamiliar
                ? t('app.actions.unmarkFamiliar')
                : t('app.actions.markFamiliar')}
            </Button>
            {isFamiliar && isBaseline && (
              <p class="display-actions__note">{t('app.actions.isBaseline')}</p>
            )}
            {isFamiliar && !isBaseline && (
              <Button variant="secondary" onClick={() => onSetBaseline?.()}>
                {t('app.actions.setBaseline')}
              </Button>
            )}
          </section>

          <section class="display-actions__group" aria-label={t('common.compare')}>
            {isBaseline ? (
              <p class="display-actions__note">{t('app.actions.alwaysCompared')}</p>
            ) : (
              <Button
                variant="secondary"
                icon="compare"
                onClick={() => onToggleCompare?.()}
              >
                {compareLabel}
              </Button>
            )}
          </section>

          {isCustom && (
            <section class="display-actions__group" aria-label={t('common.edit')}>
              <p class="display-actions__note">{t('app.actions.customHint')}</p>
              <Button variant="secondary" icon="edit" onClick={() => onEdit?.()}>
                {t('common.edit')}
              </Button>
              {isConfirmingDelete ? (
                <div
                  class="display-actions__confirm"
                  role="group"
                  ref={confirmRef}
                  tabIndex={-1}
                >
                  <p>{t('common.deleteConfirm', { name })}</p>
                  <p class="display-actions__note">{t('app.actions.deleteHint')}</p>
                  <div class="display-actions__confirm-actions">
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button variant="danger" icon="trash" onClick={() => onDelete?.()}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={() => setConfirmingDelete(true)}
                >
                  {t('common.delete')}
                </Button>
              )}
            </section>
          )}

          {!isCustom && (
            <section class="display-actions__group" aria-label={t('app.hidden.title')}>
              <p class="display-actions__note">{t('app.actions.hideFromListHint')}</p>
              <Button variant="secondary" icon="eye-off" onClick={() => onHide?.()}>
                {t('app.actions.hideFromList')}
              </Button>
            </section>
          )}
        </div>
      )}
    </Dialog>
  )
}
