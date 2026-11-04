import { t } from '../../i18n/index.js'
import { Dialog } from '../ui/index.js'
import { SettingsPanel } from './settings-panel.jsx'

/**
 * The settings panel in a modal dialog titled "Settings". Opened from the app header
 * and the Browse toolbar's comfort summary. Every prop other than `isOpen` and
 * `onClose` is passed to `SettingsPanel` unchanged.
 *
 * @param {object} props
 * @param {boolean} props.isOpen Whether the dialog is shown.
 * @param {() => void} [props.onClose] Called on Esc, close button or backdrop click.
 * @param {'metric'|'imperial'} props.units `SettingsPanel` props, passed through:
 *   units, locale, presetId, customScales, comfort and the change callbacks
 *   (onUnitsChange, onLocaleChange, onPresetChange, onAddCustomScale,
 *   onRemoveCustomScale, onComfortChange).
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <SettingsDialog
 *   isOpen={isSettingsOpen}
 *   onClose={closeSettings}
 *   units={units}
 *   locale={locale.value}
 *   presetId={presetId}
 *   comfort={comfort}
 *   onUnitsChange={setUnits}
 *   onLocaleChange={setLocale}
 *   onPresetChange={setPreset}
 *   onComfortChange={setComfort}
 * />
 */
export const SettingsDialog = ({ isOpen, onClose, ...panelProps }) => (
  <Dialog
    isOpen={isOpen}
    onClose={onClose}
    title={t('common.settings')}
    closeLabel={t('common.close')}
  >
    <SettingsPanel {...panelProps} />
  </Dialog>
)
