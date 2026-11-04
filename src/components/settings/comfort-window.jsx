import { useEffect, useState } from 'preact/hooks'
import { locale as localeSignal, t } from '../../i18n/index.js'
import { Button, NumberField, Segmented } from '../ui/index.js'
import {
  COMFORT_LIMITS,
  COMFORT_PAIRS,
  DEFAULT_COMFORT,
  isRangeOrdered,
  pickChangedKeys,
  toComfortDraft,
} from './comfort-form.js'
import './comfort-window.css'

/**
 * Comfort window editor (F7, F23): the rule toggle (PPI or pixels per degree), the
 * min and max of the active rule, the minimum logical width, and "Reset to defaults".
 *
 * Min and max are edited as a pair. A pair whose minimum is above its maximum is not
 * sent: the panel shows an error and keeps the pending values, and sends the pair as
 * soon as it is ordered again. Only changed fields are sent, so the callback payload
 * is partial, for example `{ maxPpi: 110 }`.
 *
 * @param {object} props
 * @param {{ mode: 'ppi'|'ppd', minPpi: number, maxPpi: number, minPpd: number, maxPpd: number, minWidth: number }} props.comfort
 *   Comfort window from the state.
 * @param {(partial: object) => void} [props.onComfortChange] Called with the changed fields.
 *   Mode change: `{ mode }`. Range: `{ minPpi?, maxPpi? }` or `{ minPpd?, maxPpd? }`.
 *   Width: `{ minWidth }`. Reset: the full default window.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <ComfortWindow comfort={comfort} onComfortChange={setComfort} />
 */
export const ComfortWindow = ({ comfort, onComfortChange }) => {
  const mode = comfort.mode === 'ppd' ? 'ppd' : 'ppi'
  const locale = localeSignal.value
  const [minKey, maxKey] = COMFORT_PAIRS[mode]
  const [draft, setDraft] = useState(() => toComfortDraft({ comfort }))

  useEffect(() => {
    setDraft(toComfortDraft({ comfort }))
  }, [comfort.minPpi, comfort.maxPpi, comfort.minPpd, comfort.maxPpd, comfort.minWidth])

  const isPairOrdered = isRangeOrdered({ min: draft[minKey], max: draft[maxKey] })
  const limits = mode === 'ppi' ? COMFORT_LIMITS.ppi : COMFORT_LIMITS.ppd

  /**
   * Store an edited value of the active pair, and send the pair when it is ordered.
   *
   * @param {{ key: 'minPpi'|'maxPpi'|'minPpd'|'maxPpd', value: number }} params
   */
  const commitPair = ({ key, value }) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    if (!isRangeOrdered({ min: next[minKey], max: next[maxKey] })) return
    const changes = pickChangedKeys({ draft: next, comfort, keys: [minKey, maxKey] })
    if (Object.keys(changes).length > 0) onComfortChange?.(changes)
  }

  /**
   * Store and send the minimum logical width when it changed.
   *
   * @param {number} value
   */
  const commitWidth = (value) => {
    setDraft({ ...draft, minWidth: value })
    if (value !== comfort.minWidth) onComfortChange?.({ minWidth: value })
  }

  /**
   * Restore the default window in the fields and in the state.
   */
  const handleReset = () => {
    setDraft(toComfortDraft({ comfort: DEFAULT_COMFORT }))
    onComfortChange?.({ ...DEFAULT_COMFORT })
  }

  return (
    <div class="comfort-window">
      <Segmented
        name="comfort-rule"
        label={t('settings.comfort.rule')}
        options={[
          { value: 'ppi', label: t('settings.comfort.mode.ppi') },
          { value: 'ppd', label: t('settings.comfort.mode.ppd') },
        ]}
        value={mode}
        onChange={(value) => onComfortChange?.({ mode: value })}
      />
      <div class="comfort-window__fields">
        <NumberField
          label={
            mode === 'ppi' ? t('settings.comfort.minPpi') : t('settings.comfort.minPpd')
          }
          value={draft[minKey]}
          min={limits.min}
          max={limits.max}
          step={limits.step}
          locale={locale}
          onChange={(value) => commitPair({ key: minKey, value })}
        />
        <NumberField
          label={
            mode === 'ppi' ? t('settings.comfort.maxPpi') : t('settings.comfort.maxPpd')
          }
          value={draft[maxKey]}
          min={limits.min}
          max={limits.max}
          step={limits.step}
          locale={locale}
          onChange={(value) => commitPair({ key: maxKey, value })}
        />
        <NumberField
          label={t('settings.comfort.minWidth')}
          unit="px"
          value={draft.minWidth}
          min={COMFORT_LIMITS.minWidth.min}
          max={COMFORT_LIMITS.minWidth.max}
          step={COMFORT_LIMITS.minWidth.step}
          locale={locale}
          onChange={commitWidth}
        />
      </div>
      {mode === 'ppd' && (
        <p class="comfort-window__hint">{t('settings.comfort.ppdHint')}</p>
      )}
      {!isPairOrdered && (
        <p class="comfort-window__error" role="alert">
          {t('settings.comfort.rangeError')}
        </p>
      )}
      <div>
        <Button variant="secondary" size="sm" onClick={handleReset}>
          {t('common.reset')}
        </Button>
      </div>
    </div>
  )
}
