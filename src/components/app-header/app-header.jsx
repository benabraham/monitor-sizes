import { formatNumber } from '../../lib/format.js'
import { locale as localeSignal, t } from '../../i18n/index.js'
import { Button, Segmented } from '../ui/index.js'
import { CopyLink } from '../copy-link/copy-link.jsx'
import './app-header.css'

/**
 * The two top-level views, in display order. `id` is what `onViewChange` receives.
 *
 * @typedef {'browse' | 'compare'} ViewId
 */

/**
 * Sticky app header: name, Browse / Compare switch, "Add display", copy link and
 * settings (PRD UX: sticky toolbar; "An Add display button is always one tap away in
 * Browse and Compare").
 *
 * - The view switch is two buttons inside a labelled `nav`. The active view carries
 *   `aria-current="page"` and a border, so the state is not colour alone.
 * - Compare shows the number of displays being compared, for example "Compare (3)".
 * - The OS scale preset (Windows, macOS, Linux) is a segmented switch, always visible, so
 *   the scaling matrix can be switched from Browse or Compare. It is the same setting as the
 *   one in Settings. The Linux segment is named "Linux" here; Settings gives the full name.
 * - Phones (below 600 px): the short name is shown, the nav and the preset switch each take
 *   a full-width row, and the action buttons keep their labels for assistive technology
 *   only. Nothing scrolls horizontally at 360 px.
 *
 * @param {object} props
 * @param {ViewId} props.view The active view.
 * @param {number} [props.compareCount=0] Displays in the comparison, shown in the Compare label.
 * @param {(view: ViewId) => void} [props.onViewChange] Called with the view the person picked.
 * @param {() => void} [props.onAdd] Opens the Add display dialog.
 * @param {() => void} [props.onOpenSettings] Opens the settings panel.
 * @param {string} [props.linkUrl] Link that "Copy link" copies. Defaults to the page address.
 * @param {'windows'|'macos'|'linux'} [props.presetId='windows'] The OS scale preset shown.
 * @param {(presetId: 'windows'|'macos'|'linux') => void} [props.onPresetChange] Called with
 *   the preset the person picked.
 * @returns {import('preact').JSX.Element}
 *
 * @example
 * <AppHeader
 *   view={view.value}
 *   compareCount={compareIds.length}
 *   onViewChange={setView}
 *   onAdd={openAddDisplay}
 *   onOpenSettings={openSettings}
 *   linkUrl={shareUrl}
 *   presetId={presetId.value}
 *   onPresetChange={setPresetId}
 * />
 */
export const AppHeader = ({
  view,
  compareCount = 0,
  onViewChange,
  onAdd,
  onOpenSettings,
  linkUrl,
  presetId = 'windows',
  onPresetChange,
}) => {
  const locale = localeSignal.value
  /** @type {{ id: ViewId, label: string }[]} */
  const views = [
    { id: 'browse', label: t('common.browse') },
    {
      id: 'compare',
      label: t('header.nav.compareCount', {
        count: formatNumber({ value: compareCount, locale }),
      }),
    },
  ]

  return (
    <header class="app-header">
      <div class="app-header__bar">
        <p class="app-header__brand">
          <span class="app-header__name">{t('common.appName')}</span>
          <span class="app-header__name-short" aria-hidden="true">
            {t('header.shortName')}
          </span>
        </p>
        <nav class="app-header__nav" aria-label={t('header.nav.label')}>
          {views.map((item) => (
            <Button
              key={item.id}
              class="app-header__nav-item"
              variant="ghost"
              size="sm"
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => onViewChange?.(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>
        <div class="app-header__preset">
          <Segmented
            name="app-header-preset"
            label={t('header.preset.label')}
            isLabelHidden
            options={[
              { value: 'windows', label: t('header.preset.windows') },
              { value: 'macos', label: t('header.preset.macos') },
              { value: 'linux', label: t('header.preset.linux') },
            ]}
            value={presetId}
            onChange={(value) => onPresetChange?.(value)}
          />
        </div>
        <div class="app-header__actions">
          <CopyLink url={linkUrl} />
          <Button
            class="app-header__add"
            variant="primary"
            size="md"
            icon="plus"
            onClick={() => onAdd?.()}
          >
            <span class="app-header__label">{t('common.addDisplay')}</span>
          </Button>
          <Button
            class="app-header__settings"
            variant="ghost"
            size="md"
            icon="settings"
            aria-label={t('common.settings')}
            onClick={() => onOpenSettings?.()}
          />
        </div>
      </div>
    </header>
  )
}
