import { formatNumber } from '../../lib/format.js'
import { locale as localeSignal, t } from '../../i18n/index.js'
import { Button } from '../ui/index.js'
import './comfort-summary.css'

/**
 * One-line summary of the comfort window for the Browse toolbar (F7, F23). It is a
 * button that opens the settings panel.
 *
 * PPI mode reads "Comfortable: 90–105 PPI · ≥ 1024 px"; pixels-per-degree mode reads
 * "37–43 px/° · ≥ 1024 px". Numbers follow the UI language (Czech uses a space as the
 * thousands separator, so 1024 reads "1 024").
 *
 * @param {object} props
 * @param {{ mode: 'ppi'|'ppd', minPpi: number, maxPpi: number, minPpd: number, maxPpd: number, minWidth: number }} props.comfort
 *   Comfort window from the state.
 * @param {() => void} [props.onEdit] Opens the settings panel.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <ComfortSummary comfort={comfort} onEdit={openSettings} />
 */
export const ComfortSummary = ({ comfort, onEdit }) => {
  const locale = localeSignal.value
  const numbers = {
    min: formatNumber({
      value: comfort.mode === 'ppd' ? comfort.minPpd : comfort.minPpi,
      locale,
    }),
    max: formatNumber({
      value: comfort.mode === 'ppd' ? comfort.maxPpd : comfort.maxPpi,
      locale,
    }),
    width: formatNumber({ value: comfort.minWidth, locale }),
  }
  const summary =
    comfort.mode === 'ppd'
      ? t('header.comfort.ppd', numbers)
      : t('header.comfort.ppi', numbers)

  return (
    <Button
      class="comfort-summary"
      variant="ghost"
      size="sm"
      aria-haspopup="dialog"
      onClick={() => onEdit?.()}
    >
      {summary}
    </Button>
  )
}
