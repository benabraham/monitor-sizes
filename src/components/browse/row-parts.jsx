import { t } from '../../i18n/index.js'
import { Icon } from '../ui/icon/icon.jsx'
import './row-parts.css'

/**
 * Star toggle that marks a display as familiar (F2). Shared by the table and the
 * cards so both expose the same name and state.
 *
 * The accessible name stays fixed ("Mark X as familiar") and the state is in
 * `aria-pressed`, as the toggle-button pattern requires. The star shape also
 * changes, so the state does not depend on colour.
 *
 * @param {object} props
 * @param {string} props.name Display name, used in the accessible name.
 * @param {boolean} props.isFamiliar Current state.
 * @param {() => void} props.onToggle Called without arguments.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <FamiliarToggle name="4K UHD" isFamiliar={false} onToggle={() => toggle(id)} />
 */
export const FamiliarToggle = ({ name, isFamiliar, onToggle }) => (
  <button
    type="button"
    class={`row-parts__star${isFamiliar ? ' row-parts__star--on' : ''}`}
    aria-pressed={isFamiliar ? 'true' : 'false'}
    aria-label={t('browse.markFamiliar', { name })}
    onClick={() => onToggle?.()}
  >
    <Icon name={isFamiliar ? 'star-filled' : 'star'} size={18} />
  </button>
)

/**
 * Checkbox that adds a display to Compare (F10). The accessible name is
 * "Compare X". Callers that want visible text wrap it in a `<label>`.
 *
 * @param {object} props
 * @param {string} props.name Display name, used in the accessible name.
 * @param {boolean} props.isCompared Current state.
 * @param {() => void} props.onToggle Called without arguments.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <CompareCheckbox name="4K UHD" isCompared onToggle={() => toggle(id)} />
 */
export const CompareCheckbox = ({ name, isCompared, onToggle }) => (
  <input
    type="checkbox"
    class="row-parts__check"
    checked={Boolean(isCompared)}
    aria-label={t('browse.compareDisplay', { name })}
    onChange={() => onToggle?.()}
  />
)

/**
 * A comfortable scale as a compact chip, e.g. `125 % → 3070 × 1730`. The best
 * scale also gets a check mark and a spoken "Best", so it is not marked by colour
 * alone.
 *
 * @param {object} props
 * @param {string} props.label Text from `getComfortableScales` or `getBestScaleLabel`.
 * @param {boolean} [props.isBest=false] Highlight as the best scale.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <ScaleChip label="125 % → 3070 × 1730" isBest />
 */
export const ScaleChip = ({ label, isBest = false }) => (
  <span class={`row-parts__scale${isBest ? ' row-parts__scale--best' : ''}`}>
    {isBest && (
      <span class="row-parts__scale-icon">
        <Icon name="check" size={12} />
      </span>
    )}
    <span>{label}</span>
    {isBest && <span class="visually-hidden"> ({t('browse.bestScale')})</span>}
  </span>
)

/**
 * Muted note for a display with no comfortable scale in the window.
 *
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <NoComfortableScale />
 */
export const NoComfortableScale = () => (
  <span class="row-parts__muted">{t('browse.noComfortableScale')}</span>
)
