import { formatNumber, formatScale } from '../../lib/format.js'
import { SCALE_PRESETS } from '../../lib/scales.js'
import { locale as localeSignal, t } from '../../i18n/index.js'
import { Segmented } from '../ui/index.js'
import { ComfortWindow } from './comfort-window.jsx'
import { CustomScales } from './custom-scales.jsx'
import { SettingsGroup } from './settings-group.jsx'
import './settings-panel.css'

/**
 * Text under the preset switch: the steps the chosen preset offers.
 *
 * @param {object} params
 * @param {'windows'|'macos'|'linux'} params.presetId
 * @param {'en'|'cs'} params.locale Formatting locale.
 * @returns {string}
 */
const describePreset = ({ presetId, locale }) => {
  if (presetId === 'macos') {
    const { values } = SCALE_PRESETS.macos
    return t('settings.presets.macosHint', {
      min: formatNumber({ value: values[0], locale }),
      max: formatNumber({ value: values[values.length - 1], locale }),
    })
  }
  if (presetId === 'linux') {
    const scales = SCALE_PRESETS.linux.values.map((scale) =>
      formatScale({ scale, locale }),
    )
    return t('settings.presets.linuxHint', { scales: scales.join(', ') })
  }
  const { values } = SCALE_PRESETS.windows
  return t('settings.presets.windowsHint', {
    min: formatNumber({ value: values[0] * 100, locale }),
    max: formatScale({ scale: values[values.length - 1], locale }),
    step: formatScale({ scale: values[1] - values[0], locale }),
  })
}

/**
 * The settings panel (UX: Units, Language, Scale preset, Custom scales, Comfort window).
 * Every control is driven by props, and each change goes out through one callback, so
 * the parent owns the state. Each group has a help popover.
 *
 * Groups, top to bottom:
 * - Units: metric or imperial (`onUnitsChange`).
 * - Language: English or Čeština, each named in its own language (`onLocaleChange`).
 * - Scale preset: Windows, macOS ("looks like" widths) or Linux (Wayland), with the
 *   steps of the chosen preset described below (`onPresetChange`).
 * - Custom scales: add a factor such as 133 % or remove one (`onAddCustomScale`,
 *   `onRemoveCustomScale`).
 * - Comfort window: rule, min and max, minimum logical width, reset (`onComfortChange`).
 *
 * @param {object} props
 * @param {'metric'|'imperial'} props.units Unit system.
 * @param {'en'|'cs'} props.locale Selected language. Also the formatting locale of the
 *   panel's numbers, which are read from the active locale signal.
 * @param {'windows'|'macos'|'linux'} props.presetId Selected scale preset.
 * @param {number[]} [props.customScales=[]] Custom scale factors.
 * @param {object} props.comfort Comfort window from the state (see `ComfortWindow`).
 * @param {(units: 'metric'|'imperial') => void} [props.onUnitsChange]
 * @param {(locale: 'en'|'cs') => void} [props.onLocaleChange]
 * @param {(presetId: 'windows'|'macos'|'linux') => void} [props.onPresetChange]
 * @param {(scale: number) => void} [props.onAddCustomScale] Called with a factor, e.g. `1.33`.
 * @param {(scale: number) => void} [props.onRemoveCustomScale] Called with the factor to remove.
 * @param {(partial: object) => void} [props.onComfortChange] Called with the changed comfort fields.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <SettingsPanel
 *   units={units}
 *   locale={locale.value}
 *   presetId={presetId}
 *   customScales={customScales}
 *   comfort={comfort}
 *   onUnitsChange={setUnits}
 *   onLocaleChange={setLocale}
 *   onPresetChange={setPreset}
 *   onAddCustomScale={addScale}
 *   onRemoveCustomScale={removeScale}
 *   onComfortChange={setComfort}
 * />
 */
export const SettingsPanel = ({
  units,
  locale: language,
  presetId,
  customScales = [],
  comfort,
  onUnitsChange,
  onLocaleChange,
  onPresetChange,
  onAddCustomScale,
  onRemoveCustomScale,
  onComfortChange,
}) => {
  const formatLocale = localeSignal.value

  return (
    <div class="settings-panel">
      <SettingsGroup
        id="units"
        title={t('settings.units.title')}
        help={t('settings.units.help')}
      >
        <Segmented
          name="units"
          label={t('settings.units.title')}
          isLabelHidden
          options={[
            { value: 'metric', label: t('common.units.metric') },
            { value: 'imperial', label: t('common.units.imperial') },
          ]}
          value={units}
          onChange={(value) => onUnitsChange?.(value)}
        />
      </SettingsGroup>

      <SettingsGroup
        id="language"
        title={t('settings.language.title')}
        help={t('settings.language.help')}
      >
        <Segmented
          name="language"
          label={t('settings.language.title')}
          isLabelHidden
          options={[
            { value: 'en', label: t('common.language.en') },
            { value: 'cs', label: t('common.language.cs') },
          ]}
          value={language}
          onChange={(value) => onLocaleChange?.(value)}
        />
      </SettingsGroup>

      <SettingsGroup
        id="presets"
        title={t('settings.presets.title')}
        help={t('settings.presets.help')}
      >
        <Segmented
          name="preset"
          label={t('settings.presets.title')}
          isLabelHidden
          options={[
            { value: 'windows', label: t('settings.presets.windows') },
            { value: 'macos', label: t('settings.presets.macos') },
            { value: 'linux', label: t('settings.presets.linux') },
          ]}
          value={presetId}
          onChange={(value) => onPresetChange?.(value)}
        />
        <p class="settings-panel__hint">
          {describePreset({ presetId, locale: formatLocale })}
        </p>
      </SettingsGroup>

      <SettingsGroup
        id="custom-scales"
        title={t('settings.customScales.title')}
        help={t('settings.customScales.help')}
      >
        <CustomScales
          scales={customScales}
          onAdd={(scale) => onAddCustomScale?.(scale)}
          onRemove={(scale) => onRemoveCustomScale?.(scale)}
        />
      </SettingsGroup>

      <SettingsGroup
        id="comfort"
        title={t('settings.comfort.title')}
        help={t('settings.comfort.help')}
      >
        <ComfortWindow
          comfort={comfort}
          onComfortChange={(partial) => onComfortChange?.(partial)}
        />
      </SettingsGroup>
    </div>
  )
}
