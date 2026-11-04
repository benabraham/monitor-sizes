import { t } from '../../i18n/index.js'
import { Button } from '../ui/index.js'
import './shared-banner.css'

/**
 * Banner shown when the app is opened from a shared comparison link (F19). It says
 * the person's own displays are untouched, and offers the two ways out.
 *
 * It has no close button and no Esc handling: it stays until one of its two actions
 * is chosen. "Keep it" adopts the shared comparison; "Back to mine" returns to the
 * person's own set.
 *
 * @param {object} props
 * @param {() => void} [props.onKeep] Adopts the shared comparison ("Keep it").
 * @param {() => void} [props.onDiscard] Returns to the person's own set ("Back to mine").
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <SharedBanner onKeep={keepShared} onDiscard={backToMine} />
 */
export const SharedBanner = ({ onKeep, onDiscard }) => (
  <section class="shared-banner" role="region" aria-label={t('header.shared.label')}>
    <p class="shared-banner__text">{t('header.shared.message')}</p>
    <div class="shared-banner__actions">
      <Button variant="primary" size="sm" onClick={() => onKeep?.()}>
        {t('header.shared.keep')}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onDiscard?.()}>
        {t('header.shared.discard')}
      </Button>
    </div>
  </section>
)
